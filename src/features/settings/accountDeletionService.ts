import { cancelAllReminders } from '@/services/notifications/notificationService';
import { requireSupabaseClient } from '@/services/supabase/client';
import { clearUserCache } from '@/services/storage/offlineCache';

export async function permanentlyDeleteAccount(userId: string) {
  await cancelAllReminders(userId);
  const supabase = requireSupabaseClient();
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await clearUserCache(userId);
  await supabase.auth.signOut({ scope: 'local' });
}
