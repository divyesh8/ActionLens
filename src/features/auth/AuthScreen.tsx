import { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { BrandMark } from '@/design-system/BrandMark';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type Props = PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>;

export function AuthScreen({ title, subtitle, children, footer }: Props) {
  const { colors } = useAppTheme();
  return (
    <Screen keyboard>
      <View style={styles.content}>
        <BrandMark compact />
        <View style={styles.heading}><AppText variant="title">{title}</AppText><AppText color={colors.textMuted}>{subtitle}</AppText></View>
        <Card style={styles.card}>{children}</Card>
        {footer}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center', gap: spacing.lg, width: '100%', maxWidth: 520, alignSelf: 'center' }, heading: { gap: spacing.xs }, card: { gap: spacing.md } });
