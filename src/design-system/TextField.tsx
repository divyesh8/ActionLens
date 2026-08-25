import { forwardRef, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './AppText';
import { radii, spacing, typography } from './tokens';
import { useAppTheme } from './theme';

type Props = ComponentProps<typeof TextInput> & { label: string; error?: string | undefined };

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, secureTextEntry, style, onFocus, onBlur, ...props }, ref) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption">{label}</AppText>
      <View style={[styles.inputFrame, { backgroundColor: colors.surface, borderColor: error ? colors.danger : focused ? colors.accent : colors.border }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          secureTextEntry={secureTextEntry ? hidden : false}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          style={[styles.input, typography.body, { color: colors.text }, style]}
          {...props}
        />
        {secureTextEntry ? <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={8} onPress={() => setHidden((value) => !value)} style={styles.eye}><Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={colors.textMuted} /></Pressable> : null}
      </View>
      {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  inputFrame: { minHeight: 52, borderWidth: 1, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  eye: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
