import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { BrandMark } from '@/design-system/BrandMark';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';

export default function SetupRequiredScreen() {
  const { colors } = useAppTheme();
  const { configurationMessage } = useAuth();
  return (
    <Screen>
      <View style={styles.content}>
        <BrandMark />
        <View style={styles.copy}><AppText variant="title">Connect the secure backend</AppText><AppText color={colors.textMuted}>{configurationMessage}</AppText></View>
        <Card style={styles.card}><AppText variant="bodyStrong">Required values</AppText><AppText color={colors.textMuted}>EXPO_PUBLIC_SUPABASE_URL</AppText><AppText color={colors.textMuted}>EXPO_PUBLIC_SUPABASE_ANON_KEY</AppText><AppText variant="caption" color={colors.textMuted}>Copy .env.example to .env.local, add the project values, apply the migration, and restart Expo.</AppText></Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center', gap: spacing.xl }, copy: { gap: spacing.sm }, card: { gap: spacing.sm } });
