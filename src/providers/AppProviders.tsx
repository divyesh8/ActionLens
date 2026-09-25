import { useEffect, useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ActionLensThemeProvider } from '@/design-system/theme';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { OfflineSyncCoordinator } from '@/features/capture/OfflineSyncCoordinator';
import { initializeNotifications } from '@/services/notifications/notificationService';
import { hasActiveNetworkConnection } from '@/services/network/connectionState';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2, refetchOnReconnect: true, networkMode: 'offlineFirst' },
      mutations: { retry: 0 },
    },
  }));
  useEffect(() => { void initializeNotifications(); }, []);
  useEffect(() => {
    void Network.getNetworkStateAsync().then((state) => onlineManager.setOnline(hasActiveNetworkConnection(state)));
    const subscription = Network.addNetworkStateListener((state) => onlineManager.setOnline(hasActiveNetworkConnection(state)));
    return () => subscription.remove();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ActionLensThemeProvider>
          <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider><OfflineSyncCoordinator />{children}</AuthProvider>
            </QueryClientProvider>
          </AppErrorBoundary>
        </ActionLensThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
