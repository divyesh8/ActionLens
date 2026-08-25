import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { TextField } from '@/design-system/TextField';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { AuthNotice } from '@/features/auth/AuthNotice';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { getAuthErrorMessage, signUpWithPassword } from '@/features/auth/authService';
import { signUpSchema } from '@/features/auth/authSchemas';

type Values = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const { colors } = useAppTheme();
  const [submitError, setSubmitError] = useState<string>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(signUpSchema), defaultValues: { displayName: '', email: '', password: '' } });
  const submit = handleSubmit(async (values) => {
    setSubmitError(undefined);
    try {
      const result = await signUpWithPassword(values.displayName, values.email, values.password);
      if (result.needsVerification) router.replace({ pathname: '/(auth)/verify-email', params: { email: result.email } });
      else router.replace('/');
    } catch (error) { setSubmitError(getAuthErrorMessage(error)); }
  });
  return (
    <AuthScreen title="Create your account" subtitle="Your private documents stay isolated to your account." footer={<View style={styles.footer}><AppText color={colors.textMuted}>Already have an account? </AppText><Pressable onPress={() => router.replace('/(auth)/sign-in')} accessibilityRole="link"><AppText color={colors.accent} variant="bodyStrong">Sign in</AppText></Pressable></View>}>
      {submitError ? <AuthNotice message={submitError} /> : null}
      <Controller control={control} name="displayName" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.displayName?.message} autoCapitalize="words" textContentType="name" />} />
      <Controller control={control} name="email" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />} />
      <Controller control={control} name="password" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureTextEntry textContentType="newPassword" onSubmitEditing={() => { void submit(); }} />} />
      <AppText variant="caption" color={colors.textMuted}>Use at least 8 characters. You will verify important findings before ActionLens saves them as obligations.</AppText>
      <Button label="Create account" loading={isSubmitting} onPress={() => { void submit(); }} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({ footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.xxs } });
