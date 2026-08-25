import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { requireSupabaseClient } from '@/services/supabase/client';
import { getCached, putCached } from '@/services/storage/offlineCache';
import { documentAnalysisSchema } from '@/services/ai/analysisSchema';
import { processAndPersistLocally } from '@/services/ai/localProcessingService';
import { cancelDocumentReminders } from '@/services/notifications/notificationService';
import { logger } from '@/services/logging/logger';
import { normalizeVerifiedDate } from '@/utils/dateNormalization';
import { trackAnalyticsEvent } from '@/services/analytics/analyticsService';
import { documentStatusSchema, itemStatusSchema } from './documentSchemas';

const documentSchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), title: z.string(), document_type: z.string().nullable(), organization: z.string().nullable(), summary: z.string().nullable(), language: z.string().nullable(), storage_path: z.string().nullable(), original_filename: z.string().nullable(), mime_type: z.string(), status: documentStatusSchema, status_message: z.string().nullable(), page_count: z.number().nullable(), created_at: z.string(), processed_at: z.string().nullable() });
const obligationSchema = z.object({ id: z.string().uuid(), title: z.string(), description: z.string().nullable(), status: itemStatusSchema, priority: z.enum(['low', 'normal', 'high', 'urgent']), due_at: z.string().nullable(), due_date_is_uncertain: z.boolean(), completed_at: z.string().nullable() });
const requirementSchema = z.object({ id: z.string().uuid(), title: z.string(), description: z.string().nullable(), is_required: z.boolean(), status: itemStatusSchema, confidence: z.enum(['high', 'review_recommended', 'uncertain']), sort_order: z.number(), completed_at: z.string().nullable() });
const actionSchema = z.object({ id: z.string().uuid(), title: z.string(), description: z.string().nullable(), status: itemStatusSchema, priority: z.enum(['low', 'normal', 'high', 'urgent']), due_at: z.string().nullable(), estimated_minutes: z.number().nullable(), confidence: z.enum(['high', 'review_recommended', 'uncertain']), waiting_on: z.string().nullable(), follow_up_at: z.string().nullable(), sort_order: z.number(), completed_at: z.string().nullable(), depends_on_ids: z.array(z.string().uuid()) });
const actionDependencySchema = z.array(z.object({ action_id: z.string().uuid(), depends_on_action_id: z.string().uuid() }));
const historySchema = z.object({ id: z.number(), event_type: z.string(), display_message: z.string(), occurred_at: z.string() });
const extractionSchema = z.object({ id: z.string().uuid(), analysis: documentAnalysisSchema, confidence: z.enum(['high', 'review_recommended', 'uncertain']), created_at: z.string() });
const detailSchema = z.object({ document: documentSchema, extraction: extractionSchema.nullable(), obligation: obligationSchema.nullable(), requirements: z.array(requirementSchema), actions: z.array(actionSchema), history: z.array(historySchema) });
const completionResultSchema = z.object({ documentCompleted: z.boolean(), deadlineCompletedOnTime: z.boolean() });

export type DocumentDetail = z.infer<typeof detailSchema>;

async function cancelCompletedDocumentReminders(userId: string, documentId: string) {
  try { await cancelDocumentReminders(userId, documentId); }
  catch (error) { logger.warn('Completed document reminder cancellation failed', { errorName: error instanceof Error ? error.name : 'unknown' }); }
}

async function fetchDetail(userId: string, documentId: string): Promise<DocumentDetail> {
  const cacheKey = `${userId}:document:${documentId}`;
  try {
    const supabase = requireSupabaseClient();
    const [documentResult, extractionResult, obligationResult, requirementsResult, actionsResult, historyResult] = await Promise.all([
    supabase.from('documents').select('id, user_id, title, document_type, organization, summary, language, storage_path, original_filename, mime_type, status, status_message, page_count, created_at, processed_at').eq('id', documentId).eq('user_id', userId).single(),
    supabase.from('document_extractions').select('id, analysis, confidence, created_at').eq('document_id', documentId).eq('user_id', userId).eq('is_current', true).maybeSingle(),
    supabase.from('obligations').select('id, title, description, status, priority, due_at, due_date_is_uncertain, completed_at').eq('document_id', documentId).eq('user_id', userId).order('created_at').limit(1).maybeSingle(),
    supabase.from('requirements').select('id, title, description, is_required, status, confidence, sort_order, completed_at').eq('document_id', documentId).eq('user_id', userId).order('sort_order'),
    supabase.from('actions').select('id, title, description, status, priority, due_at, estimated_minutes, confidence, waiting_on, follow_up_at, sort_order, completed_at').eq('document_id', documentId).eq('user_id', userId).order('sort_order'),
    supabase.from('activity_history').select('id, event_type, display_message, occurred_at').eq('document_id', documentId).eq('user_id', userId).order('occurred_at', { ascending: false }).limit(30),
    ]);
    if (documentResult.error) throw documentResult.error;
    if (extractionResult.error) throw extractionResult.error;
    if (obligationResult.error) throw obligationResult.error;
    if (requirementsResult.error) throw requirementsResult.error;
    if (actionsResult.error) throw actionsResult.error;
    if (historyResult.error) throw historyResult.error;
    const actionRows = z.array(actionSchema.omit({ depends_on_ids: true })).parse(actionsResult.data);
    const actionIds = actionRows.map(({ id }) => id);
    const dependencyResult = actionIds.length > 0
      ? await supabase.from('action_dependencies').select('action_id, depends_on_action_id').in('action_id', actionIds)
      : { data: [], error: null };
    if (dependencyResult.error) throw dependencyResult.error;
    const dependencyRows = actionDependencySchema.parse(dependencyResult.data);
    const dependenciesByAction = new Map<string, string[]>();
    for (const dependency of dependencyRows) {
      const dependencies = dependenciesByAction.get(dependency.action_id) ?? [];
      dependencies.push(dependency.depends_on_action_id);
      dependenciesByAction.set(dependency.action_id, dependencies);
    }
    const detail = detailSchema.parse({
      document: documentResult.data,
      extraction: extractionResult.data,
      obligation: obligationResult.data,
      requirements: requirementsResult.data,
      actions: actionRows.map((action) => ({ ...action, depends_on_ids: dependenciesByAction.get(action.id) ?? [] })),
      history: historyResult.data,
    });
    await putCached(cacheKey, detail);
    return detail;
  } catch (error) {
    const cached = await getCached(cacheKey, detailSchema);
    if (cached) return cached;
    throw error;
  }
}

const processingStatuses = new Set(['uploading', 'uploaded', 'queued', 'ocr_processing', 'ocr_complete', 'ai_processing']);

export function useDocumentDetail(userId: string, documentId: string) {
  return useQuery({ queryKey: ['document', userId, documentId], queryFn: () => fetchDetail(userId, documentId), refetchInterval: (query) => processingStatuses.has(query.state.data?.document.status ?? '') ? 3000 : false });
}

export function useSetRequirementStatus(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => { const { data, error } = await requireSupabaseClient().rpc('set_requirement_status', { p_requirement_id: id, p_status: completed ? 'completed' : 'not_started' }); if (error) throw error; const result = completionResultSchema.parse(data); if (result.deadlineCompletedOnTime) void trackAnalyticsEvent(userId, 'deadline_completed_on_time', {}); if (result.documentCompleted) await cancelCompletedDocumentReminders(userId, documentId); }, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['document', userId, documentId] }), queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }), queryClient.invalidateQueries({ queryKey: ['timeline', userId] })]); } });
}

export function useSetActionStatus(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => { const { data, error } = await requireSupabaseClient().rpc('set_action_status', { p_action_id: id, p_status: completed ? 'completed' : 'not_started' }); if (error) throw error; const result = completionResultSchema.parse(data); if (completed) void trackAnalyticsEvent(userId, 'action_completed', { kind: 'action' }); if (result.deadlineCompletedOnTime) void trackAnalyticsEvent(userId, 'deadline_completed_on_time', {}); if (result.documentCompleted) await cancelCompletedDocumentReminders(userId, documentId); }, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['document', userId, documentId] }), queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }), queryClient.invalidateQueries({ queryKey: ['timeline', userId] })]); } });
}

export function useSetActionWaiting(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, waitingOn, followUpDate }: { id: string; waitingOn: string | null; followUpDate: string | null }) => {
      const normalizedWaitingOn = waitingOn?.trim() || null;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const followUpAt = followUpDate ? normalizeVerifiedDate(followUpDate, timezone) : null;
      const { error } = await requireSupabaseClient().rpc('set_action_waiting', { p_action_id: id, p_waiting_on: normalizedWaitingOn, p_follow_up_at: followUpAt });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['document', userId, documentId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
      ]);
    },
  });
}

export async function retryDocumentProcessing(userId: string, documentId: string) {
  const supabase = requireSupabaseClient();
  const [documentResult, jobResult] = await Promise.all([
    supabase.from('documents').select('storage_path, original_filename, mime_type').eq('id', documentId).eq('user_id', userId).single(),
    supabase.from('processing_jobs').select('id, attempt_count').eq('document_id', documentId).eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
  ]);
  if (documentResult.error) throw documentResult.error;
  if (jobResult.error) throw jobResult.error;
  if (!documentResult.data.storage_path) throw new Error('The original file is unavailable.');
  const { data: source, error: downloadError } = await supabase.storage.from('documents').download(documentResult.data.storage_path);
  if (downloadError || !source) throw downloadError ?? new Error('The original file could not be downloaded.');
  await processAndPersistLocally({
    userId,
    documentId,
    jobId: jobResult.data.id,
    bytes: await source.arrayBuffer(),
    fileName: documentResult.data.original_filename ?? 'document',
    mimeType: documentResult.data.mime_type,
    attemptCount: jobResult.data.attempt_count,
  });
}

export async function getOriginalSignedUrl(userId: string, documentId: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data: document, error } = await supabase.from('documents').select('storage_path').eq('id', documentId).eq('user_id', userId).single();
  if (error || !document.storage_path) throw error ?? new Error('Original file is unavailable.');
  const { data, error: signedError } = await supabase.storage.from('documents').createSignedUrl(document.storage_path, 60);
  if (signedError) throw signedError;
  return data.signedUrl;
}
