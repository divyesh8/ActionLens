import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { BrandMark } from '@/design-system/BrandMark';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { t } from '@/i18n/copy';

const benefits = [
  ['document-text-outline', t('welcomeImport')],
  ['sparkles-outline', t('welcomeUnderstand')],
  ['checkmark-circle-outline', t('welcomeVerify')],
] as const;

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <View style={styles.content}>
        <BrandMark />
        <View style={styles.hero}><AppText variant="display">{t('welcomeTagline')}</AppText><AppText color={colors.textMuted}>{t('welcomeSummary')}</AppText></View>
        <Card style={styles.benefits}>{benefits.map(([icon, label]) => <View key={label} style={styles.benefit}><Ionicons name={icon} size={22} color={colors.accent} /><AppText style={styles.benefitText}>{label}</AppText></View>)}</Card>
        <View style={styles.actions}><Button label={t('createAccount')} onPress={() => router.push('/(auth)/sign-up')} /><Button label={t('existingAccount')} variant="secondary" onPress={() => router.push('/(auth)/sign-in')} /></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'space-between', gap: spacing.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }, hero: { gap: spacing.md }, benefits: { gap: spacing.md }, benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, benefitText: { flex: 1 }, actions: { gap: spacing.sm } });
