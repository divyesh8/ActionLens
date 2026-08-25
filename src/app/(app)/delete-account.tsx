import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { TextField } from '@/design-system/TextField';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { permanentlyDeleteAccount } from '@/features/settings/accountDeletionService';

export default function DeleteAccountScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const remove = async () => {
    if (!session || confirmation !== 'DELETE') return;
    setBusy(true); setError(undefined);
    try { await permanentlyDeleteAccount(session.user.id); router.replace('/(auth)/welcome'); }
    catch { setError('Your account was not deleted. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Screen keyboard>
      <View style={styles.header}><AppText variant="title" color={colors.danger}>Delete account</AppText><AppText color={colors.textMuted}>This is permanent and cannot be undone.</AppText></View>
      <Card style={[styles.card, { borderColor: colors.danger }]}><AppText variant="bodyStrong">What will be removed</AppText><AppText color={colors.textMuted}>Your private source files, OCR text, analyses, verified obligations, action plans, reminders, tags, activity history, preferences, and sign-in account.</AppText><AppText color={colors.textMuted}>Type DELETE to confirm.</AppText><TextField label="Confirmation" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} /></Card>
      {error ? <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}><AppText variant="caption" color={colors.danger}>{error}</AppText></Card> : null}
      <Button label="Permanently delete my account" variant="danger" disabled={confirmation !== 'DELETE'} loading={busy} onPress={() => { void remove(); }} />
      <Button label="Cancel" variant="ghost" disabled={busy} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.xs, paddingBottom: spacing.xl }, card: { gap: spacing.md, marginBottom: spacing.lg } });
