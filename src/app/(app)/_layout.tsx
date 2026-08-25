import { Redirect, Stack } from 'expo-router';

import { FullScreenLoading } from '@/design-system/StateView';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AppLayout() {
  const { configured, loading, session } = useAuth();
  if (!configured) return <Redirect href="/setup-required" />;
  if (loading) return <FullScreenLoading />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="onboarding" options={{ gestureEnabled: false }} /><Stack.Screen name="capture" options={{ presentation: 'modal' }} /><Stack.Screen name="search" /><Stack.Screen name="document/[id]" /><Stack.Screen name="manage/[id]" options={{ presentation: 'modal' }} /><Stack.Screen name="verification/[id]" /><Stack.Screen name="delete-account" /></Stack>;
}
