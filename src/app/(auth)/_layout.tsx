import { Redirect, Stack, usePathname } from 'expo-router';

import { FullScreenLoading } from '@/design-system/StateView';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AuthLayout() {
  const { configured, loading, session } = useAuth();
  const pathname = usePathname();
  if (!configured) return <Redirect href="/setup-required" />;
  if (loading) return <FullScreenLoading />;
  if (session && pathname !== '/reset-password') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
