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
import { useAuth } from '@/features/auth/AuthProvider';
import { getAuthErrorMessage, signInWithPassword } from '@/features/auth/authService';
import { signInSchema } from '@/features/auth/authSchemas';

type Values = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const { sessionError, clearSessionError } = useAuth();
  const [submitError, setSubmitError] = useState<string>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });
  const submit = handleSubmit(async (values) => {
    setSubmitError(undefined);
    clearSessionError();
    try { await signInWithPassword(values.email, values.password); router.replace('/'); }
    catch (error) { setSubmitError(getAuthErrorMessage(error)); }
  });
  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to open your documents and action plans." footer={<View style={styles.footer}><AppText color={colors.textMuted}>New to ActionLens? </AppText><Pressable onPress={() => router.replace('/(auth)/sign-up')} accessibilityRole="link"><AppText color={colors.accent} variant="bodyStrong">Create account</AppText></Pressable></View>}>
      {submitError || sessionError ? <AuthNotice message={submitError ?? sessionError ?? ''} /> : null}
      <Controller control={control} name="email" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" />} />
      <Controller control={control} name="password" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureTextEntry textContentType="password" returnKeyType="done" onSubmitEditing={() => { void submit(); }} />} />
      <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}><AppText color={colors.accent} variant="caption">Forgot password?</AppText></Pressable>
      <Button label="Sign in" loading={isSubmitting} onPress={() => { void submit(); }} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({ forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' }, footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.xxs } });
