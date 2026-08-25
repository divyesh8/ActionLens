import * as Linking from 'expo-linking';

import { requireSupabaseClient } from '@/services/supabase/client';

export async function signInWithPassword(email: string, password: string) {
  const { error } = await requireSupabaseClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}

export async function signUpWithPassword(displayName: string, email: string, password: string) {
  const { data, error } = await requireSupabaseClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { display_name: displayName.trim() }, emailRedirectTo: Linking.createURL('/') },
  });
  if (error) throw error;
  return { email: data.user?.email ?? email, needsVerification: !data.session };
}

export async function requestPasswordReset(email: string) {
  const { error } = await requireSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: Linking.createURL('/reset-password') });
  if (error) throw error;
}

export async function resendVerification(email: string) {
  const { error } = await requireSupabaseClient().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: Linking.createURL('/') },
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await requireSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw error;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('invalid login')) return 'That email or password is not correct.';
    if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
    if (message.includes('network') || message.includes('fetch')) return 'ActionLens could not reach the server. Check your connection and try again.';
    if (message.includes('rate') || message.includes('too many')) return 'Too many attempts. Wait a moment and try again.';
  }
  return 'Something went wrong. Please try again.';
}
