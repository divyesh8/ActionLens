import { type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { radii, spacing } from './tokens';
import { useAppTheme } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  icon?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint, icon }: Props) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const backgroundColor = variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surface : 'transparent';
  const textColor = variant === 'primary' ? colors.accentText : variant === 'danger' ? '#FFFFFF' : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.base, { backgroundColor, borderColor: variant === 'secondary' ? colors.border : backgroundColor, opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1 }]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <View style={styles.content}>{icon}<AppText variant="bodyStrong" color={textColor}>{label}</AppText></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
