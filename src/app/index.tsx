import { Redirect } from 'expo-router';

import { FullScreenLoading, StateView } from '@/design-system/StateView';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/auth/profileService';

export default function IndexRoute() {
  const { configured, loading, session } = useAuth();
  const profile = useProfile(session?.user.id);
  if (!configured) return <Redirect href="/setup-required" />;
  if (loading) return <FullScreenLoading />;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (profile.isPending) return <FullScreenLoading label="Preparing your account" />;
  if (profile.isError) return <StateView kind="error" title="We couldn't open your account" message="Check that the database migration is applied, then try again." actionLabel="Try again" onAction={() => { void profile.refetch(); }} />;
  if (!profile.data.onboarding_completed) return <Redirect href="/(app)/onboarding" />;
  return <Redirect href="/(app)/(tabs)" />;
}
