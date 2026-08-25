import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Card } from '@/design-system/Card';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import type { DocumentSummary } from './documentSchemas';

const statusLabel: Record<DocumentSummary['status'], string> = {
  draft: 'Draft', uploading: 'Uploading', uploaded: 'Uploaded', queued: 'Waiting', ocr_processing: 'Reading', ocr_complete: 'Read', ai_processing: 'Understanding', awaiting_verification: 'Review', verified: 'Ready', failed: 'Needs retry', archived: 'Archived',
};

export function DocumentCard({ document }: { document: DocumentSummary }) {
  const { colors } = useAppTheme();
  const needsReview = document.status === 'awaiting_verification';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${document.title}`} onPress={() => router.push({ pathname: '/(app)/document/[id]', params: { id: document.id } })}>
      {({ pressed }) => <Card style={[styles.card, { opacity: pressed ? 0.78 : 1 }]}><View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><Ionicons name={document.mime_type === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={21} color={colors.accent} /></View><View style={styles.copy}><AppText variant="bodyStrong" numberOfLines={2}>{document.title}</AppText><AppText variant="caption" color={colors.textMuted} numberOfLines={1}>{document.organization ?? 'Added to ActionLens'}</AppText></View><View style={[styles.status, { backgroundColor: needsReview ? colors.warningSoft : colors.accentSoft }]}><AppText variant="metadata" color={needsReview ? colors.warning : colors.accent}>{statusLabel[document.status]}</AppText></View></Card>}
    </Pressable>
  );
}

const styles = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, icon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 2 }, status: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radii.pill } });
