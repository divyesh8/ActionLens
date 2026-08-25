import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { BrandMark } from '@/design-system/BrandMark';
import { Button } from '@/design-system/Button';
import { Screen } from '@/design-system/Screen';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCompleteOnboarding } from '@/features/auth/profileService';

const pages = [
  { icon: 'scan-outline', title: 'Turn anything important into action.', body: 'ActionLens helps you understand what a document wants from you.' },
  { icon: 'cloud-upload-outline', title: 'Import in seconds.', body: 'Add a screenshot, PDF, photo, notice, or plain text.' },
  { icon: 'checkmark-done-outline', title: 'You stay in control.', body: 'We find dates and requirements. You inspect the source and verify before anything is saved.' },
] as const;

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const [page, setPage] = useState(0);
  const mutation = useCompleteOnboarding(session?.user.id ?? '');
  const item = pages[page] ?? pages[0];
  const continueFlow = async () => {
    if (page < pages.length - 1) { setPage((value) => value + 1); return; }
    try { await mutation.mutateAsync(); router.replace('/(app)/(tabs)'); } catch { return; }
  };
  return (
    <Screen scroll={false}>
      <View style={styles.top}><BrandMark compact /><AppText variant="metadata" color={colors.textMuted}>{page + 1} / {pages.length}</AppText></View>
      <View style={styles.hero}><View style={[styles.illustration, { backgroundColor: colors.accentSoft }]}><Ionicons name={item.icon} size={58} color={colors.accent} /></View><View style={styles.copy}><AppText variant="title" align="center">{item.title}</AppText><AppText color={colors.textMuted} align="center">{item.body}</AppText></View></View>
      <View style={styles.bottom}><View style={styles.dots}>{pages.map((entry, index) => <View key={entry.title} style={[styles.dot, { backgroundColor: index === page ? colors.accent : colors.border, width: index === page ? 24 : 8 }]} />)}</View>{mutation.isError ? <AppText variant="caption" color={colors.danger} align="center">We couldn’t save your progress. Check your connection and try again.</AppText> : null}<Button label={page === pages.length - 1 ? 'Get started' : 'Continue'} loading={mutation.isPending} onPress={() => { void continueFlow(); }} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({ top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }, illustration: { width: 140, height: 140, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' }, copy: { gap: spacing.sm, maxWidth: 460 }, bottom: { gap: spacing.md }, dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs }, dot: { height: 8, borderRadius: radii.pill } });
