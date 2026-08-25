import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { BrandMark } from '@/design-system/BrandMark';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { StateView } from '@/design-system/StateView';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { AttentionCard } from '@/features/actions/AttentionCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { DocumentCard } from '@/features/documents/DocumentCard';
import { useDashboard } from '@/features/documents/documentQueries';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const dashboard = useDashboard(session?.user.id ?? '');
  return (
    <Screen>
      <View style={styles.header}><BrandMark compact /><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Search documents" onPress={() => router.push('/(app)/search')} style={[styles.avatar, { backgroundColor: colors.surface }]}><Ionicons name="search" size={20} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/(app)/(tabs)/settings')} style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><Ionicons name="person-outline" size={20} color={colors.accent} /></Pressable></View></View>
      <View style={styles.hero}><View style={styles.heroCopy}><AppText variant="title">What needs your attention?</AppText><AppText color={colors.textMuted}>Add something confusing. We’ll turn it into clear, source-backed next steps.</AppText></View><Button label="Scan something" accessibilityHint="Opens camera and import options" icon={<Ionicons name="scan" size={20} color={colors.accentText} />} onPress={() => router.push('/(app)/capture')} /><View style={styles.imports}>{['Camera', 'Photo', 'PDF', 'Text'].map((label) => <View key={label} style={styles.importItem}><Ionicons name={label === 'Camera' ? 'camera-outline' : label === 'Photo' ? 'image-outline' : label === 'PDF' ? 'document-text-outline' : 'text-outline'} size={18} color={colors.textMuted} /><AppText variant="metadata" color={colors.textMuted}>{label}</AppText></View>)}</View></View>
      {dashboard.isPending ? <View style={styles.sections}><Card style={styles.skeleton}><AppText color={colors.textMuted}>Opening your attention list…</AppText></Card></View> : dashboard.isError ? <StateView kind="error" title="We couldn't load your plans" message="Check your connection and try again." actionLabel="Try again" onAction={() => { void dashboard.refetch(); }} /> : <View style={styles.sections}>{dashboard.data.attention.length > 0 ? <View style={styles.section}><AppText variant="heading">Needs attention</AppText>{dashboard.data.attention.slice(0, 3).map((item) => <AttentionCard key={item.id} item={item} />)}</View> : null}<View style={styles.section}><AppText variant="heading">Recent</AppText>{dashboard.data.documents.length === 0 ? <Card style={styles.emptyCard}><Ionicons name="document-text-outline" size={28} color={colors.accent} /><View style={styles.emptyCopy}><AppText variant="bodyStrong">Nothing here yet</AppText><AppText color={colors.textMuted}>Scan a notice, screenshot, or PDF and ActionLens will turn it into an action plan.</AppText><Button label="Try a fictional example" variant="ghost" onPress={() => router.push('/(app)/sample')} /></View></Card> : dashboard.data.documents.map((document) => <DocumentCard key={document.id} document={document} />)}</View></View>}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, headerActions: { flexDirection: 'row', gap: spacing.xs }, avatar: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' }, hero: { gap: spacing.md, paddingTop: spacing.xl }, heroCopy: { gap: spacing.xs }, imports: { flexDirection: 'row', justifyContent: 'space-around' }, importItem: { alignItems: 'center', gap: spacing.xxs }, sections: { gap: spacing.xl, paddingTop: spacing.xl }, section: { gap: spacing.sm }, skeleton: { minHeight: 92, justifyContent: 'center' }, emptyCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, emptyCopy: { flex: 1, gap: spacing.xxs } });
