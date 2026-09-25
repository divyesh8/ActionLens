import { z } from 'zod';

import { requireSupabaseClient } from '@/services/supabase/client';

const responseSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(['awaiting_verification', 'completed', 'ocr_processing', 'ai_processing', 'already_processing']),
});

const activeDocumentStatuses = new Set(['ocr_processing', 'ai_processing', 'awaiting_verification', 'verified']);
const activeJobStages = new Set(['ocr_processing', 'ai_processing', 'awaiting_verification', 'completed']);
const fallbackMessage = 'ActionLens could not reach the document service. Check your connection and try again.';

export class RemoteProcessingError extends Error {}

function safeServerMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  return message.length > 0 && message.length <= 500 ? message : null;
}

export async function processDocumentRemotely(input: { userId: string; documentId: string; jobId: string }): Promise<void> {
  const supabase = requireSupabaseClient();
  const invocation = await supabase.functions.invoke('process-document', {
    body: { documentId: input.documentId, jobId: input.jobId },
  });

  if (!invocation.error && responseSchema.safeParse(invocation.data).success) return;

  const [documentState, jobState] = await Promise.all([
    supabase.from('documents').select('status, status_message').eq('id', input.documentId).eq('user_id', input.userId).maybeSingle(),
    supabase.from('processing_jobs').select('stage, safe_error_message').eq('id', input.jobId).eq('document_id', input.documentId).eq('user_id', input.userId).maybeSingle(),
  ]);

  if (documentState.data && activeDocumentStatuses.has(documentState.data.status)) return;
  if (jobState.data && activeJobStages.has(jobState.data.stage)) return;

  const message = safeServerMessage(documentState.data?.status_message)
    ?? safeServerMessage(jobState.data?.safe_error_message)
    ?? fallbackMessage;

  if (documentState.data?.status !== 'failed' && jobState.data?.stage !== 'failed') {
    const finishedAt = new Date().toISOString();
    await Promise.all([
      supabase.from('documents').update({ status: 'failed', status_message: message }).eq('id', input.documentId).eq('user_id', input.userId),
      supabase.from('processing_jobs').update({ stage: 'failed', safe_error_message: message, error_code: 'processing_unreachable', finished_at: finishedAt }).eq('id', input.jobId).eq('document_id', input.documentId).eq('user_id', input.userId),
    ]);
  }

  throw new RemoteProcessingError(message);
}
