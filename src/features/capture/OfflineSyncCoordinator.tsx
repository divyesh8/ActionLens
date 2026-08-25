import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';

import { useAuth } from '@/features/auth/AuthProvider';
import { flushPendingIngestions } from '@/features/capture/ingestionService';
import { logger } from '@/services/logging/logger';

export function OfflineSyncCoordinator() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const synchronize = async () => {
      try {
        const completed = await flushPendingIngestions(userId);
        if (completed > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['documents', userId] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
          ]);
        }
      } catch (error) {
        logger.warn('Pending import synchronization paused', { errorName: error instanceof Error ? error.name : 'unknown' });
      }
    };
    void synchronize();
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected !== false && state.isInternetReachable !== false) void synchronize();
    });
    return () => subscription.remove();
  }, [queryClient, session?.user.id]);

  return null;
}
