import { z } from 'zod';

import { logger } from '@/services/logging/logger';
import { requireSupabaseClient } from '@/services/supabase/client';

const eventSchemas = {
  document_import_started: z.object({ sourceKind: z.enum(['camera', 'photo', 'file', 'text']) }),
  document_import_completed: z.object({ outcome: z.enum(['processing', 'waiting_connection']) }),
  document_import_failed: z.object({ reason: z.enum(['cancelled', 'duplicate', 'validation', 'network_or_server']) }),
  verification_completed: z.object({ reminderRequested: z.boolean() }),
  action_completed: z.object({ kind: z.literal('action') }),
  deadline_completed_on_time: z.object({}),
  search_used: z.object({ resultCount: z.number().int().nonnegative().max(100) }),
  reminder_created: z.object({ channel: z.literal('local') }),
} as const;

export type AnalyticsEventName = keyof typeof eventSchemas;

export async function trackAnalyticsEvent<T extends AnalyticsEventName>(userId: string, name: T, metadata: z.input<(typeof eventSchemas)[T]>): Promise<void> {
  try {
    const safeMetadata = eventSchemas[name].parse(metadata);
    const { error } = await requireSupabaseClient().from('product_events').insert({ user_id: userId, event_name: name, metadata: safeMetadata });
    if (error) throw error;
  } catch (error) {
    logger.warn('Privacy-safe analytics event was not recorded', { eventName: name, errorName: error instanceof Error ? error.name : 'unknown' });
  }
}
