import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing } from './tokens';
import { useAppTheme } from './theme';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md } });
