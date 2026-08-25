import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { requireSupabaseClient } from '@/services/supabase/client';
import { getCached, putCached } from '@/services/storage/offlineCache';
import { documentSummarySchema, obligationSummarySchema, requirementProgressSchema, type DocumentSummary, type ObligationSummary } from './documentSchemas';

const documentListSchema = z.array(documentSummarySchema);
const obligationListSchema = z.array(obligationSummarySchema);
const requirementListSchema = z.array(requirementProgressSchema);

export type AttentionItem = ObligationSummary & { documentTitle: string; completedRequirements: number; totalRequirements: number };
const attentionListSchema = z.array(obligationSummarySchema.extend({ documentTitle: z.string(), completedRequirements: z.number().int().nonnegative(), totalRequirements: z.number().int().nonnegative() }));

async function fetchDocuments(userId: string, limit = 100): Promise<DocumentSummary[]> {
  const cacheKey = `${userId}:documents:${limit}`;
  try {
    const { data, error } = await requireSupabaseClient()
      .from('documents')
      .select('id, title, document_type, category, organization, summary, mime_type, status, created_at, processed_at, archived_at')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const documents = documentListSchema.parse(data);
    await putCached(cacheKey, documents);
    return documents;
  } catch (error) {
    const cached = await getCached(cacheKey, documentListSchema);
    if (cached) return cached;
    throw error;
  }
}

async function fetchAttention(userId: string): Promise<AttentionItem[]> {
  const cacheKey = `${userId}:attention`;
  try {
    const supabase = requireSupabaseClient();
    const [{ data: obligationsData, error: obligationsError }, { data: documentsData, error: documentsError }, { data: requirementsData, error: requirementsError }] = await Promise.all([
      supabase.from('obligations').select('id, document_id, title, status, priority, due_at, due_date_is_uncertain').eq('user_id', userId).neq('status', 'completed').order('due_at', { ascending: true, nullsFirst: false }).limit(30),
      supabase.from('documents').select('id, title, document_type, category, organization, summary, mime_type, status, created_at, processed_at, archived_at').eq('user_id', userId).is('archived_at', null),
      supabase.from('requirements').select('document_id, status').eq('user_id', userId),
    ]);
    if (obligationsError) throw obligationsError;
    if (documentsError) throw documentsError;
    if (requirementsError) throw requirementsError;
    const obligations = obligationListSchema.parse(obligationsData);
    const documents = documentListSchema.parse(documentsData);
    const requirements = requirementListSchema.parse(requirementsData);
    const titles = new Map(documents.map((document) => [document.id, document.title]));
    const attention = obligations.map((obligation) => {
      const related = requirements.filter((requirement) => requirement.document_id === obligation.document_id);
      return { ...obligation, documentTitle: titles.get(obligation.document_id) ?? obligation.title, completedRequirements: related.filter((requirement) => requirement.status === 'completed').length, totalRequirements: related.length };
    });
    await putCached(cacheKey, attention);
    return attention;
  } catch (error) {
    const cached = await getCached(cacheKey, attentionListSchema);
    if (cached) return cached;
    throw error;
  }
}

export function useDocuments(userId: string) {
  return useQuery({ queryKey: ['documents', userId], queryFn: () => fetchDocuments(userId) });
}

export function useDashboard(userId: string) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      const [documents, attention] = await Promise.all([fetchDocuments(userId, 6), fetchAttention(userId)]);
      return { documents, attention };
    },
  });
}

export function useTimeline(userId: string) {
  return useQuery({ queryKey: ['timeline', userId], queryFn: () => fetchAttention(userId) });
}
