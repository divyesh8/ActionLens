import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { documentSummarySchema } from '@/features/documents/documentSchemas';
import { requireSupabaseClient } from '@/services/supabase/client';
import { trackAnalyticsEvent } from '@/services/analytics/analyticsService';

export function useDocumentSearch(userId: string, query: string) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ['search', userId, normalized],
    enabled: normalized.length >= 2,
    queryFn: async () => {
      const { data, error } = await requireSupabaseClient().rpc('search_documents', { p_query: normalized });
      if (error) throw error;
      const results = z.array(documentSummarySchema).parse(data);
      void trackAnalyticsEvent(userId, 'search_used', { resultCount: results.length });
      return results;
    },
  });
}
