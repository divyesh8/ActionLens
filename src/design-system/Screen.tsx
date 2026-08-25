import { type PropsWithChildren, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from './tokens';
import { useAppTheme } from './theme';

type Props = PropsWithChildren<{ scroll?: boolean; keyboard?: boolean; footer?: ReactNode; padded?: boolean }>;

export function Screen({ children, scroll = true, keyboard = false, footer, padded = true }: Props) {
  const { colors } = useAppTheme();
  const content = scroll ? (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scrollContent, padded && styles.padded]}>{children}</ScrollView>
  ) : (
    <View style={[styles.viewContent, padded && styles.padded]}>{children}</View>
  );
  const body = <>{content}{footer}</>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {keyboard ? <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView> : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, scrollContent: { flexGrow: 1 }, viewContent: { flex: 1 }, padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg } });
