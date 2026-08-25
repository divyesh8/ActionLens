import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

export function AuthNotice({ message, kind = 'error' }: { message: string; kind?: 'error' | 'success' }) {
  const { colors } = useAppTheme();
  const color = kind === 'error' ? colors.danger : colors.success;
  const backgroundColor = kind === 'error' ? colors.dangerSoft : colors.successSoft;
  return <View accessibilityRole="alert" style={[styles.notice, { backgroundColor }]}><AppText variant="caption" color={color}>{message}</AppText></View>;
}

const styles = StyleSheet.create({ notice: { borderRadius: radii.sm, padding: spacing.sm } });
