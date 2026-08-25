import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { radii, spacing } from './tokens';
import { useAppTheme } from './theme';

export type SourceSelection = { sourceText: string; pageNumber: number | null; label: string };

export function SourceButton({ source, onPress }: { source: SourceSelection; onPress: (source: SourceSelection) => void }) {
  const { colors } = useAppTheme();
  if (!source.sourceText) return null;
  return <Pressable accessibilityRole="button" onPress={() => onPress(source)} style={styles.sourceButton}><Ionicons name="locate-outline" size={16} color={colors.accent} /><AppText variant="caption" color={colors.accent}>View source{source.pageNumber ? ` · page ${source.pageNumber}` : ''}</AppText></Pressable>;
}

export function SourceModal({ source, onClose, onOpenOriginal }: { source: SourceSelection | null; onClose: () => void; onOpenOriginal?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={Boolean(source)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><Card style={styles.modal}><View style={styles.modalHeader}><View style={styles.modalCopy}><AppText variant="heading">Supporting source</AppText><AppText variant="caption" color={colors.textMuted}>{source?.pageNumber ? `Page ${source.pageNumber}` : 'Pasted source'}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Close source" onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View><View style={[styles.quote, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}><AppText>“{source?.sourceText}”</AppText></View><AppText variant="caption" color={colors.textMuted}>This quotation is the evidence behind the finding. The original file remains authoritative.</AppText>{onOpenOriginal ? <Button label="Open original document" variant="secondary" onPress={onOpenOriginal} /> : null}</Card></View>
    </Modal>
  );
}

const styles = StyleSheet.create({ sourceButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, alignSelf: 'flex-start' }, overlay: { flex: 1, justifyContent: 'center', padding: spacing.lg }, modal: { gap: spacing.md, maxWidth: 600, width: '100%', alignSelf: 'center' }, modalHeader: { flexDirection: 'row', alignItems: 'center' }, modalCopy: { flex: 1 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, quote: { borderLeftWidth: 3, borderRadius: radii.sm, padding: spacing.md } });
