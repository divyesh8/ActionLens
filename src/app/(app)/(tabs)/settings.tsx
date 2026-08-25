import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { getAuthErrorMessage, signOut } from '@/features/auth/authService';
import { usePreferences, useUpdateAiConsent, useUpdateReminderOffset } from '@/features/settings/preferencesService';

const reminderOptions = [{ label: '7 days before', value: 10080 }, { label: '3 days before', value: 4320 }, { label: '1 day before', value: 1440 }, { label: 'Same day', value: 0 }] as const;

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const [error, setError] = useState<string>();
  const preferences = usePreferences(session?.user.id ?? '');
  const consent = useUpdateAiConsent(session?.user.id ?? '');
  const reminderOffset = useUpdateReminderOffset(session?.user.id ?? '');
  const logout = async () => {
    setError(undefined);
    try { await signOut(); router.replace('/(auth)/welcome'); } catch (reason) { setError(getAuthErrorMessage(reason)); }
  };
  return (
    <Screen>
      <View style={styles.header}><AppText variant="title">Settings</AppText><AppText color={colors.textMuted}>{session?.user.email}</AppText></View>
      <View style={styles.sections}>
        <View style={styles.section}><AppText variant="heading">Privacy</AppText><Card style={styles.card}><View style={styles.settingCopy}><AppText variant="bodyStrong">Improve AI using my content</AppText><AppText variant="caption" color={colors.textMuted}>Off by default. Enabling this records your consent; content is used only if a supported improvement program is configured.</AppText></View><Switch accessibilityLabel="Improve AI using my content" value={preferences.data?.improve_ai_with_content ?? false} disabled={preferences.isPending || consent.isPending} trackColor={{ false: colors.border, true: colors.accentSoft }} thumbColor={(preferences.data?.improve_ai_with_content ?? false) ? colors.accent : colors.textMuted} onValueChange={(value) => consent.mutate(value)} /></Card><Card style={styles.copyCard}><AppText variant="bodyStrong">What ActionLens stores</AppText><AppText color={colors.textMuted}>Private source files, OCR text, your verified action plans, reminders, and activity history. AI processing is used to understand documents; extracted details are drafts until you confirm them.</AppText></Card></View>
        <View style={styles.section}><AppText variant="heading">Reminders</AppText><Card style={styles.copyCard}><AppText variant="bodyStrong">Default deadline reminder</AppText><AppText variant="caption" color={colors.textMuted}>Choose one useful notification time. Near-term deadlines fall back to the deadline itself.</AppText>{reminderOptions.map((option) => <Button key={option.value} label={option.label} variant={preferences.data?.default_reminder_offsets[0] === option.value ? 'primary' : 'ghost'} disabled={preferences.isPending || reminderOffset.isPending} onPress={() => reminderOffset.mutate(option.value)} />)}</Card></View>
        <View style={styles.section}><AppText variant="heading">Account</AppText>{error ? <AppText color={colors.danger} variant="caption">{error}</AppText> : null}<Button label="Sign out" variant="secondary" onPress={() => { void logout(); }} /><Button label="Delete account" variant="danger" onPress={() => router.push('/(app)/delete-account')} /></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.xs, paddingBottom: spacing.xl }, sections: { gap: spacing.xl }, section: { gap: spacing.sm }, card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, settingCopy: { flex: 1, gap: spacing.xxs }, copyCard: { gap: spacing.xs } });
