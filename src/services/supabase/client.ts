import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

import { getEnvironment } from '@/config/env';
import { secureAuthStorage } from '@/services/storage/secureAuthStorage';

let client: SupabaseClient | null | undefined;
let appStateSubscribed = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const environment = getEnvironment();
  if (!environment.configured) {
    client = null;
    return client;
  }

  client = createClient(environment.value.supabaseUrl, environment.value.supabaseAnonKey, {
    auth: {
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: Platform.OS !== 'web',
      detectSessionInUrl: false,
      lock: processLock,
    },
  });

  if (Platform.OS !== 'web' && !appStateSubscribed) {
    appStateSubscribed = true;
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }

  return client;
}

export function requireSupabaseClient(): SupabaseClient {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured. See SETUP.md.');
  return supabase;
}
