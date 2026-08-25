import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { requireSupabaseClient } from '@/services/supabase/client';

const profileSchema = z.object({ id: z.string().uuid(), display_name: z.string().nullable(), onboarding_completed: z.boolean() });
export type Profile = z.infer<typeof profileSchema>;

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error('A signed-in user is required.');
      const { data, error } = await requireSupabaseClient().from('profiles').select('id, display_name, onboarding_completed').eq('id', userId).single();
      if (error) throw error;
      return profileSchema.parse(data);
    },
  });
}

export function useCompleteOnboarding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = requireSupabaseClient();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const [profileResult, preferencesResult] = await Promise.all([
        supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId),
        supabase.from('user_preferences').update({ timezone }).eq('user_id', userId),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (preferencesResult.error) throw preferencesResult.error;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profile', userId] }); },
  });
}
