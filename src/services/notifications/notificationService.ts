import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { requireSupabaseClient } from '@/services/supabase/client';
import { chooseDeadlineReminderDate } from './reminderLogic';

let initialized = false;

export async function initializeNotifications() {
  if (initialized || Platform.OS === 'web') return;
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deadlines', { name: 'Deadlines', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 150, 200], lightColor: '#6956E8' });
  }
}

export async function scheduleDeadlineReminder(options: { userId: string; documentId: string; obligationId: string; dueAt: string; title: string; timezone: string }): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  await initializeNotifications();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notification permission was not granted.');
  const { data: preference, error: preferenceError } = await requireSupabaseClient().from('user_preferences').select('default_reminder_offsets').eq('user_id', options.userId).maybeSingle();
  if (preferenceError) throw preferenceError;
  const storedOffset = Array.isArray(preference?.default_reminder_offsets) ? preference.default_reminder_offsets[0] : null;
  const offsetMinutes = typeof storedOffset === 'number' ? storedOffset : 3 * 24 * 60;
  const scheduledFor = chooseDeadlineReminderDate(options.dueAt, new Date(), offsetMinutes);
  if (!scheduledFor) return null;
  const body = `${options.title} is due soon. Open ActionLens to check what is still missing.`;
  const scheduleId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Deadline approaching', body, data: { documentId: options.documentId } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduledFor, channelId: 'deadlines' },
  });
  const { error } = await requireSupabaseClient().from('reminders').insert({ user_id: options.userId, document_id: options.documentId, obligation_id: options.obligationId, scheduled_for: scheduledFor.toISOString(), timezone: options.timezone, title: 'Deadline approaching', body, platform_schedule_id: scheduleId, enabled: true });
  if (error) {
    await Notifications.cancelScheduledNotificationAsync(scheduleId);
    throw error;
  }
  return scheduleId;
}

export async function cancelDocumentReminders(userId: string, documentId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from('reminders').select('id, platform_schedule_id').eq('user_id', userId).eq('document_id', documentId).eq('enabled', true);
  if (error) throw error;
  if (Platform.OS !== 'web') await Promise.all((data ?? []).map(async (reminder) => { if (typeof reminder.platform_schedule_id === 'string') await Notifications.cancelScheduledNotificationAsync(reminder.platform_schedule_id); }));
  const { error: updateError } = await supabase.from('reminders').update({ enabled: false, cancelled_at: new Date().toISOString() }).eq('user_id', userId).eq('document_id', documentId);
  if (updateError) throw updateError;
}

export async function cancelAllReminders(userId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from('reminders').select('platform_schedule_id').eq('user_id', userId).eq('enabled', true);
  if (error) throw error;
  if (Platform.OS !== 'web') await Promise.all((data ?? []).map(async (reminder) => { if (typeof reminder.platform_schedule_id === 'string') await Notifications.cancelScheduledNotificationAsync(reminder.platform_schedule_id); }));
}
