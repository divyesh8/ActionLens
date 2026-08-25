import { Pressable, StyleSheet } from 'react-native';

import type { Confidence } from '@/services/ai/analysisSchema';
import { AppText } from './AppText';
import { radii, spacing } from './tokens';
import { useAppTheme } from './theme';

const labels: Record<Confidence, string> = { high: 'High confidence', review_recommended: 'Review recommended', uncertain: 'Uncertain' };

export function ConfidenceBadge({ value, onPress }: { value: Confidence; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const color = value === 'high' ? colors.success : value === 'uncertain' ? colors.warning : colors.accent;
  const backgroundColor = value === 'high' ? colors.successSoft : value === 'uncertain' ? colors.warningSoft : colors.accentSoft;
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${labels[value]}${onPress ? ', change confidence' : ''}`} disabled={!onPress} onPress={onPress} style={[styles.badge, { backgroundColor }]}><AppText variant="metadata" color={color}>{labels[value]}</AppText></Pressable>;
}

const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radii.pill } });
