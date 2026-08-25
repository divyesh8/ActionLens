import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { requireSupabaseClient } from '@/services/supabase/client';

const preferencesSchema = z.object({
  user_id: z.string().uuid(),
  timezone: z.string(),
  locale: z.string(),
  theme: z.enum(['system', 'light', 'dark']),
  default_reminder_offsets: z.array(z.number().int().nonnegative()).min(1).max(1),
  improve_ai_with_content: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export function usePreferences(userId: string) {
  return useQuery({
    queryKey: ['preferences', userId],
    queryFn: async () => {
      const { data, error } = await requireSupabaseClient().from('user_preferences').select('user_id, timezone, locale, theme, default_reminder_offsets, improve_ai_with_content').eq('user_id', userId).single();
      if (error) throw error;
      return preferencesSchema.parse(data);
    },
  });
}

export function useUpdateReminderOffset(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offsetMinutes: number) => {
      if (![10080, 4320, 1440, 0].includes(offsetMinutes)) throw new Error('Choose a supported reminder time.');
      const { error } = await requireSupabaseClient().from('user_preferences').update({ default_reminder_offsets: [offsetMinutes] }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['preferences', userId] }); },
  });
}

export function useUpdateAiConsent(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await requireSupabaseClient().from('user_preferences').update({ improve_ai_with_content: enabled }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['preferences', userId] }); },
  });
}
