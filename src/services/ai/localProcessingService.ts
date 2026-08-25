import { requireSupabaseClient } from '@/services/supabase/client';
import { LocalProcessingUnavailableError, processDocumentLocally } from './localDocumentProcessor';
import type { LocalProcessingStage } from './localDocumentProcessor.types';

type LocalPersistenceInput = {
  userId: string;
  documentId: string;
  jobId: string;
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
  attemptCount?: number;
  signal?: AbortSignal;
  onProgress?: (stage: LocalProcessingStage, fraction: number) => void;
};

function categoryFromDocumentType(documentType: string | null): string {
  const value = documentType?.toLowerCase() ?? '';
  if (/scholarship|grant|financial aid/.test(value)) return 'scholarship';
  if (/academic|exam|assignment|course|university|college|certificate/.test(value)) return 'academic';
  if (/invoice|fee|bank|finance|payment/.test(value)) return 'finance';
  if (/lease|hostel|housing|rent/.test(value)) return 'housing';
  if (/bill|utility|subscription/.test(value)) return 'bills';
  if (/application|registration|form/.test(value)) return 'applications';
  return 'other';
}

export function safeLocalProcessingMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return 'Local processing was cancelled.';
  if (error instanceof LocalProcessingUnavailableError) return error.message;
  return 'Local OCR could not read this source. Try a clearer JPG, PNG, text file, or a smaller PDF.';
}

export async function processAndPersistLocally(input: LocalPersistenceInput): Promise<void> {
  const supabase = requireSupabaseClient();
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  const [documentState, jobState] = await Promise.all([
    supabase.from('documents').update({ status: 'ocr_processing', status_message: null }).eq('id', input.documentId).eq('user_id', input.userId),
    supabase.from('processing_jobs').update({
      stage: 'ocr_processing',
      attempt_count: (input.attemptCount ?? 0) + 1,
      started_at: startedAtIso,
      finished_at: null,
      error_code: null,
      safe_error_message: null,
      provider_request_id: null,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_micros: 0,
    }).eq('id', input.jobId).eq('document_id', input.documentId).eq('user_id', input.userId),
  ]);
  if (documentState.error) throw documentState.error;
  if (jobState.error) throw jobState.error;

  try {
    const result = await processDocumentLocally({
      bytes: input.bytes,
      fileName: input.fileName,
      mimeType: input.mimeType,
      ...(input.signal ? { signal: input.signal } : {}),
      ...(input.onProgress ? { onProgress: input.onProgress } : {}),
    });

    const pagesDeleted = await supabase.from('document_pages').delete().eq('document_id', input.documentId).eq('user_id', input.userId);
    if (pagesDeleted.error) throw pagesDeleted.error;
    const pagesInserted = await supabase.from('document_pages').insert(result.pages.map((page) => ({
      document_id: input.documentId,
      user_id: input.userId,
      page_number: page.pageNumber,
      normalized_text: page.text,
      width: page.width ?? null,
      height: page.height ?? null,
      blocks: page.text ? [{ text: page.text, boundingData: null }] : [],
    })));
    if (pagesInserted.error) throw pagesInserted.error;

    const previousExtractions = await supabase.from('document_extractions').update({ is_current: false }).eq('document_id', input.documentId).eq('user_id', input.userId).eq('is_current', true);
    if (previousExtractions.error) throw previousExtractions.error;
    const extraction = await supabase.from('document_extractions').insert({
      document_id: input.documentId,
      user_id: input.userId,
      provider: 'browser-local',
      model: 'tesseract-7+rules-v1',
      analysis: result.analysis,
      confidence: result.analysis.confidence,
      is_current: true,
    });
    if (extraction.error) throw extraction.error;

    const finishedAt = new Date().toISOString();
    const [documentResult, jobResult] = await Promise.all([
      supabase.from('documents').update({
        title: result.analysis.documentTitle,
        document_type: result.analysis.documentType,
        category: categoryFromDocumentType(result.analysis.documentType),
        organization: result.analysis.organization,
        summary: result.analysis.summary,
        language: result.analysis.language,
        page_count: result.pages.length,
        status: 'awaiting_verification',
        status_message: null,
        processed_at: finishedAt,
      }).eq('id', input.documentId).eq('user_id', input.userId),
      supabase.from('processing_jobs').update({
        stage: 'awaiting_verification',
        finished_at: finishedAt,
        processing_ms: Date.now() - startedAt,
        provider_request_id: null,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_micros: 0,
      }).eq('id', input.jobId).eq('document_id', input.documentId).eq('user_id', input.userId),
    ]);
    if (documentResult.error) throw documentResult.error;
    if (jobResult.error) throw jobResult.error;

    await Promise.all([
      supabase.from('activity_history').insert({ user_id: input.userId, document_id: input.documentId, event_type: 'analysis_completed', display_message: 'Document analyzed locally and ready for review.' }),
      supabase.from('product_events').insert({ user_id: input.userId, event_name: 'analysis_completed', metadata: {} }),
    ]);
  } catch (error) {
    const message = safeLocalProcessingMessage(error);
    const finishedAt = new Date().toISOString();
    await Promise.all([
      supabase.from('documents').update({ status: 'failed', status_message: message }).eq('id', input.documentId).eq('user_id', input.userId),
      supabase.from('processing_jobs').update({ stage: 'failed', safe_error_message: message, error_code: 'local_processing_failed', finished_at: finishedAt, processing_ms: Date.now() - startedAt }).eq('id', input.jobId).eq('user_id', input.userId),
      supabase.from('product_events').insert({ user_id: input.userId, event_name: 'analysis_failed', metadata: { reason: 'processing_failed' } }),
    ]);
    throw error;
  }
}
