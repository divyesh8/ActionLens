import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/design-system/Button';
import { AuthNotice } from '@/features/auth/AuthNotice';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { getAuthErrorMessage, resendVerification } from '@/features/auth/authService';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const safeEmail = typeof email === 'string' ? email : '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean }>();
  const resend = async () => {
    if (!safeEmail) return;
    setBusy(true);
    try { await resendVerification(safeEmail); setMessage({ text: 'A new verification email is on its way.', success: true }); }
    catch (error) { setMessage({ text: getAuthErrorMessage(error), success: false }); }
    finally { setBusy(false); }
  };
  return (
    <AuthScreen title="Check your email" subtitle={`We sent a verification link${safeEmail ? ` to ${safeEmail}` : ''}. Open it on this device to continue.`}>
      {message ? <AuthNotice message={message.text} kind={message.success ? 'success' : 'error'} /> : null}
      <Button label="Resend verification email" variant="secondary" disabled={!safeEmail} loading={busy} onPress={() => { void resend(); }} />
      <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/(auth)/sign-in')} />
    </AuthScreen>
  );
}
