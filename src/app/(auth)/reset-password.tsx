import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/design-system/Button';
import { TextField } from '@/design-system/TextField';
import { AuthNotice } from '@/features/auth/AuthNotice';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { getAuthErrorMessage, updatePassword } from '@/features/auth/authService';
import { resetPasswordSchema } from '@/features/auth/authSchemas';

type Values = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const [submitError, setSubmitError] = useState<string>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const submit = handleSubmit(async ({ password }) => {
    setSubmitError(undefined);
    try { await updatePassword(password); router.replace('/'); }
    catch (error) { setSubmitError(getAuthErrorMessage(error)); }
  });
  return (
    <AuthScreen title="Choose a new password" subtitle="Use a password you do not reuse elsewhere.">
      {submitError ? <AuthNotice message={submitError} /> : null}
      <Controller control={control} name="password" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="New password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureTextEntry textContentType="newPassword" />} />
      <Controller control={control} name="confirmPassword" render={({ field: { value, onChange, onBlur, ref } }) => <TextField ref={ref} label="Confirm password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.confirmPassword?.message} secureTextEntry textContentType="newPassword" onSubmitEditing={() => { void submit(); }} />} />
      <Button label="Save new password" loading={isSubmitting} onPress={() => { void submit(); }} />
    </AuthScreen>
  );
}
