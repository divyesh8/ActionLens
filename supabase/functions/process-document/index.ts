import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { z } from 'npm:zod@4.4.3';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createOpenAIProviders } from '../_shared/providers.ts';

const requestSchema = z.object({ documentId: z.string().uuid(), jobId: z.string().uuid() });
const MAX_SOURCE_BYTES = 6 * 1024 * 1024;

function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let index = 0; index < bytes.length; index += 0x8000) parts.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  return btoa(parts.join(''));
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return 'The analysis format was invalid. Try processing the document again.';
  if (error instanceof Error && error.message.includes('AI provider')) return 'The document service is temporarily unavailable. Try again.';
  return 'ActionLens could not finish processing this document. Try again.';
}

function categoryFromDocumentType(documentType: string): string {
  const value = documentType.toLowerCase();
  if (/scholarship|grant|financial aid/.test(value)) return 'scholarship';
  if (/academic|exam|assignment|course|university|college|certificate/.test(value)) return 'academic';
  if (/invoice|fee|bank|finance|payment/.test(value)) return 'finance';
  if (/lease|hostel|housing|rent/.test(value)) return 'housing';
  if (/bill|utility|subscription/.test(value)) return 'bills';
  if (/application|registration|form/.test(value)) return 'applications';
  return 'other';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const startedAt = Date.now();
  let admin: ReturnType<typeof createClient> | null = null;
  let documentId: string | null = null;
  let jobId: string | null = null;
  let userId: string | null = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const analysisModel = Deno.env.get('OPENAI_MODEL');
    const ocrModel = Deno.env.get('OPENAI_OCR_MODEL') ?? analysisModel;
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAIKey || !analysisModel || !ocrModel) return jsonResponse({ error: 'Document processing is not configured.' }, 503);
    const authorization = request.headers.get('Authorization');
    if (!authorization) return jsonResponse({ error: 'Authentication required.' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Invalid session.' }, 401);
    userId = authData.user.id;
    const parsed = requestSchema.parse(await request.json());
    documentId = parsed.documentId;
    jobId = parsed.jobId;
    const providers = createOpenAIProviders({ apiKey: openAIKey, analysisModel, ocrModel });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from('processing_jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', oneHourAgo);
    if ((count ?? 0) > 20) return jsonResponse({ error: 'Processing limit reached. Try again later.' }, 429);

    const [{ data: document, error: documentError }, { data: job, error: jobError }, { data: preferences }] = await Promise.all([
      admin.from('documents').select('id, user_id, title, storage_path, original_filename, mime_type, byte_size, status').eq('id', documentId).eq('user_id', userId).single(),
      admin.from('processing_jobs').select('id, user_id, document_id, stage, attempt_count').eq('id', jobId).eq('document_id', documentId).eq('user_id', userId).single(),
      admin.from('user_preferences').select('timezone').eq('user_id', userId).maybeSingle(),
    ]);
    if (documentError || !document) return jsonResponse({ error: 'Document not found.' }, 404);
    if (jobError || !job) return jsonResponse({ error: 'Processing job not found.' }, 404);
    if (job.stage === 'completed' || job.stage === 'awaiting_verification') return jsonResponse({ documentId, status: job.stage });
    if (job.stage === 'ocr_processing' || job.stage === 'ai_processing') return jsonResponse({ documentId, status: job.stage }, 202);
    if (job.stage === 'cancelled') return jsonResponse({ error: 'This processing job was cancelled.' }, 409);
    if (job.attempt_count >= 5) return jsonResponse({ error: 'This document reached its retry limit. Import a clean copy or contact support.' }, 429);
    if (!document.storage_path || !document.storage_path.startsWith(`${userId}/`)) return jsonResponse({ error: 'Invalid storage path.' }, 403);
    if (typeof document.byte_size === 'number' && document.byte_size > MAX_SOURCE_BYTES) return jsonResponse({ error: 'Document is too large.' }, 413);

    const { data: claimedJob, error: claimError } = await admin.from('processing_jobs')
      .update({ stage: 'ocr_processing', attempt_count: job.attempt_count + 1, started_at: new Date().toISOString(), error_code: null, safe_error_message: null })
      .eq('id', jobId)
      .eq('user_id', userId)
      .in('stage', ['queued', 'failed'])
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimedJob) return jsonResponse({ documentId, status: 'already_processing' }, 202);
    const { error: statusError } = await admin.from('documents').update({ status: 'ocr_processing', status_message: null }).eq('id', documentId).eq('user_id', userId);
    if (statusError) throw statusError;
    const { data: blob, error: downloadError } = await admin.storage.from('documents').download(document.storage_path);
    if (downloadError || !blob) throw new Error('Source download failed.');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Source exceeds processing limit.');

    let pages: { pageNumber: number; text: string; blocks: { text: string; boundingData: Record<string, number> | null }[] }[];
    let language = 'und';
    let providerRequestId: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    if (document.mime_type === 'text/plain') {
      const text = new TextDecoder().decode(bytes).slice(0, 100_000);
      pages = [{ pageNumber: 1, text, blocks: [{ text, boundingData: null }] }];
    } else {
      const dataUrl = `data:${document.mime_type};base64,${toBase64(bytes)}`;
      const ocr = await providers.ocr.extract({ filename: document.original_filename ?? 'document', mimeType: document.mime_type, dataUrl });
      pages = ocr.result.pages;
      language = ocr.result.language;
      providerRequestId = ocr.requestId;
      inputTokens += ocr.usage.input ?? 0;
      outputTokens += ocr.usage.output ?? 0;
    }

    await admin.from('document_pages').delete().eq('document_id', documentId);
    const { error: pagesError } = await admin.from('document_pages').insert(pages.map((page) => ({ document_id: documentId, user_id: userId, page_number: page.pageNumber, normalized_text: page.text, blocks: page.blocks })));
    if (pagesError) throw pagesError;
    await Promise.all([
      admin.from('documents').update({ status: 'ai_processing', page_count: pages.length, language }).eq('id', documentId),
      admin.from('processing_jobs').update({ stage: 'ai_processing', provider_request_id: providerRequestId, input_tokens: inputTokens, output_tokens: outputTokens }).eq('id', jobId),
    ]);

    const analysis = await providers.analysis.analyze({ pages, timezone: preferences?.timezone ?? 'UTC' });
    inputTokens += analysis.usage.input ?? 0;
    outputTokens += analysis.usage.output ?? 0;
    await admin.from('document_extractions').update({ is_current: false }).eq('document_id', documentId).eq('is_current', true);
    const { error: extractionError } = await admin.from('document_extractions').insert({ document_id: documentId, user_id: userId, provider: 'openai', model: analysisModel, analysis: analysis.result, confidence: analysis.result.confidence, is_current: true });
    if (extractionError) throw extractionError;
    const finishedAt = new Date().toISOString();
    await Promise.all([
      admin.from('documents').update({ title: analysis.result.documentTitle, document_type: analysis.result.documentType, category: categoryFromDocumentType(analysis.result.documentType), organization: analysis.result.organization, summary: analysis.result.summary, language: analysis.result.language, status: 'awaiting_verification', processed_at: finishedAt }).eq('id', documentId),
      admin.from('processing_jobs').update({ stage: 'awaiting_verification', finished_at: finishedAt, processing_ms: Date.now() - startedAt, provider_request_id: analysis.requestId ?? providerRequestId, input_tokens: inputTokens, output_tokens: outputTokens }).eq('id', jobId),
      admin.from('activity_history').insert({ user_id: userId, document_id: documentId, event_type: 'analysis_completed', display_message: 'Document analyzed and ready for review.' }),
      admin.from('product_events').insert({ user_id: userId, event_name: 'analysis_completed', metadata: {} }),
    ]);
    return jsonResponse({ documentId, status: 'awaiting_verification' });
  } catch (error) {
    const message = safeErrorMessage(error);
    console.error('process-document failed', { requestId: request.headers.get('x-request-id'), errorName: error instanceof Error ? error.name : 'unknown', documentId, jobId });
    if (admin && documentId && jobId && userId) {
      await Promise.all([
        admin.from('documents').update({ status: 'failed', status_message: message }).eq('id', documentId).eq('user_id', userId),
        admin.from('processing_jobs').update({ stage: 'failed', safe_error_message: message, error_code: error instanceof z.ZodError ? 'invalid_provider_output' : 'processing_failed', finished_at: new Date().toISOString(), processing_ms: Date.now() - startedAt }).eq('id', jobId).eq('user_id', userId),
        admin.from('product_events').insert({ user_id: userId, event_name: 'analysis_failed', metadata: { reason: error instanceof z.ZodError ? 'invalid_provider_output' : 'processing_failed' } }),
      ]);
    }
    return jsonResponse({ error: message }, error instanceof z.ZodError ? 422 : 500);
  }
});
