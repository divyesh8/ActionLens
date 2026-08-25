import { z } from 'zod';

export const documentStatusSchema = z.enum(['draft', 'uploading', 'uploaded', 'queued', 'ocr_processing', 'ocr_complete', 'ai_processing', 'awaiting_verification', 'verified', 'failed', 'archived']);
export const itemStatusSchema = z.enum(['not_started', 'in_progress', 'waiting', 'ready', 'completed', 'blocked']);

export const documentSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  document_type: z.string().nullable(),
  category: z.string(),
  organization: z.string().nullable(),
  summary: z.string().nullable(),
  mime_type: z.string(),
  status: documentStatusSchema,
  created_at: z.string(),
  processed_at: z.string().nullable(),
  archived_at: z.string().nullable(),
});

export const obligationSummarySchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  title: z.string(),
  status: itemStatusSchema,
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  due_at: z.string().nullable(),
  due_date_is_uncertain: z.boolean(),
});

export const requirementProgressSchema = z.object({ document_id: z.string().uuid(), status: itemStatusSchema });

export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export type ObligationSummary = z.infer<typeof obligationSummarySchema>;
