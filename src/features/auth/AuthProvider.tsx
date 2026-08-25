import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';

import { getEnvironment } from '@/config/env';
import { logger } from '@/services/logging/logger';
import { getSupabaseClient } from '@/services/supabase/client';

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  configurationMessage?: string | undefined;
  sessionError?: string | undefined;
  clearSessionError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function extractCallbackParams(url: string): URLSearchParams {
  const normalized = url.includes('#') ? url.replace('#', url.includes('?') ? '&' : '?') : url;
  return new URL(normalized).searchParams;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const environment = getEnvironment();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(environment.configured);
  const [sessionError, setSessionError] = useState<string>();

  const handleCallback = useCallback(async (url: string | null) => {
    if (!url) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const params = extractCallbackParams(url);
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const providerError = params.get('error_description');
      if (providerError) throw new Error(providerError);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
      }
    } catch (error) {
      logger.warn('Authentication callback failed', { errorName: error instanceof Error ? error.name : 'unknown' });
      setSessionError('This sign-in link is invalid or expired. Request a new one and try again.');
    }
  }, []);

  useEffect(() => {
    if (!environment.configured) {
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setSessionError('Your saved session could not be opened. Sign in again.');
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    void Linking.getInitialURL().then(handleCallback);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => { void handleCallback(url); });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [environment.configured, handleCallback]);

  const value = useMemo<AuthState>(() => ({
    session,
    loading,
    configured: environment.configured,
    configurationMessage: environment.configured ? undefined : environment.message,
    sessionError,
    clearSessionError: () => setSessionError(undefined),
  }), [environment, loading, session, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
