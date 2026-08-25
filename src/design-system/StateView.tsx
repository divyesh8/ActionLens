import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { spacing } from './tokens';
import { useAppTheme } from './theme';

export function FullScreenLoading({ label = 'Opening ActionLens' }: { label?: string }) {
  const { colors } = useAppTheme();
  return <View style={[styles.state, { backgroundColor: colors.background }]} accessibilityLiveRegion="polite"><ActivityIndicator size="large" color={colors.accent} /><AppText variant="bodyStrong">{label}</AppText></View>;
}

type StateProps = { title: string; message: string; actionLabel?: string; onAction?: () => void; kind?: 'empty' | 'error' };

export function StateView({ title, message, actionLabel, onAction, kind = 'empty' }: StateProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.state}>
      <Ionicons name={kind === 'error' ? 'alert-circle-outline' : 'document-text-outline'} size={36} color={kind === 'error' ? colors.danger : colors.accent} />
      <AppText variant="heading" align="center">{title}</AppText>
      <AppText color={colors.textMuted} align="center" style={styles.message}>{message}</AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ state: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg }, message: { maxWidth: 420, marginBottom: spacing.sm } });
