import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAppTheme } from '@/design-system/theme';
import { AppProviders } from '@/providers/AppProviders';

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="setup-required" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <AppProviders><RootNavigator /></AppProviders>;
}
