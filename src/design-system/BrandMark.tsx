import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { radii, spacing } from './tokens';
import { useAppTheme } from './theme';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useAppTheme();
  return <View style={styles.row}><View style={[styles.icon, { backgroundColor: colors.accent }]}><Ionicons name="scan" size={compact ? 18 : 23} color={colors.accentText} /></View><AppText variant={compact ? 'heading' : 'title'}>ActionLens</AppText></View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, icon: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' } });
