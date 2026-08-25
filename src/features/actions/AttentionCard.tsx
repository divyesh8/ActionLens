import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';

import { AppText } from '@/design-system/AppText';
import { Card } from '@/design-system/Card';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import type { AttentionItem } from '@/features/documents/documentQueries';

export function AttentionCard({ item }: { item: AttentionItem }) {
  const { colors } = useAppTheme();
  const dueLabel = item.due_at ? `Due ${formatDistanceToNowStrict(new Date(item.due_at), { addSuffix: true })}` : 'Date needs review';
  const urgent = item.priority === 'urgent';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/document/[id]', params: { id: item.document_id } })}>
      {({ pressed }) => <Card style={[styles.card, { opacity: pressed ? 0.8 : 1 }]}><View style={styles.top}><AppText variant="metadata" color={colors.textMuted}>{item.documentTitle.toUpperCase()}</AppText><View style={[styles.badge, { backgroundColor: urgent ? colors.dangerSoft : colors.warningSoft }]}><AppText variant="metadata" color={urgent ? colors.danger : colors.warning}>{dueLabel}</AppText></View></View><AppText variant="heading">{item.title}</AppText><AppText color={colors.textMuted}>{item.totalRequirements > 0 ? `${item.completedRequirements} of ${item.totalRequirements} requirements ready` : item.status === 'waiting' ? 'Waiting on someone else' : 'Open to see the next action'}</AppText></Card>}
    </Pressable>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.sm }, top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center' }, badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radii.pill } });
