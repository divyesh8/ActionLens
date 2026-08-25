import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useAppTheme } from '@/design-system/theme';
import { t } from '@/i18n/copy';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
function icon(active: IconName, inactive: IconName) {
  return function TabBarIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" options={{ title: t('navHome'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="vault" options={{ title: t('navVault'), tabBarIcon: icon('folder', 'folder-outline') }} />
      <Tabs.Screen name="timeline" options={{ title: t('navTimeline'), tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('navSettings'), tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
