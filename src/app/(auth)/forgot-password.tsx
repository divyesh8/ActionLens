import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/design-system/Button';
import { TextField } from '@/design-system/TextField';
import { AuthNotice } from '@/features/auth/AuthNotice';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { getAuthErrorMessage, requestPasswordReset } from '@/features/auth/authService';
import { forgotPasswordSchema } from '@/features/auth/authSchemas';

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const [message, setMessage] = useState<{ text: string; success: boolean }>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const submit = handleSubmit(async ({ email }) => {
    setMessage(undefined);
    try { await requestPasswordReset(email); setMessage({ text: 'If an account exists for that email, a reset link is on its way.', success: true }); }
    catch (error) { setMessage({ text: getAuthErrorMessage(error), success: false }); }
  });
  return (
    <AuthScreen title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      {message ? <AuthNotice message={message.text} kind={message.success ? 'success' : 'error'} /> : null}
      <Controller control={control} name="email" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} autoCapitalize="none" keyboardType="email-address" onSubmitEditing={() => { void submit(); }} />} />
      <Button label="Send reset link" loading={isSubmitting} onPress={() => { void submit(); }} />
      <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
    </AuthScreen>
  );
}
