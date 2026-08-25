import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { StateView } from '@/design-system/StateView';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { DocumentCard } from '@/features/documents/DocumentCard';
import { useDocuments } from '@/features/documents/documentQueries';

export default function VaultScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const documents = useDocuments(session?.user.id ?? '');
  const [category, setCategory] = useState('all');
  const categories = useMemo(() => ['all', ...new Set((documents.data ?? []).map((document) => document.category))], [documents.data]);
  const visibleDocuments = category === 'all' ? documents.data ?? [] : (documents.data ?? []).filter((document) => document.category === category);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={visibleDocuments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DocumentCard document={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<View style={styles.header}><View style={styles.copy}><AppText variant="title">Document vault</AppText><AppText color={colors.textMuted}>Your originals, verified details, and action plans.</AppText></View><View style={styles.actions}><Button label="Search vault" variant="secondary" onPress={() => router.push('/(app)/search')} /><Button label="Add document" variant="secondary" onPress={() => router.push('/(app)/capture')} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{categories.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === category }} onPress={() => setCategory(item)} style={[styles.filter, { backgroundColor: item === category ? colors.accent : colors.surface, borderColor: item === category ? colors.accent : colors.border }]}><AppText variant="caption" color={item === category ? '#FFFFFF' : colors.text}>{item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}</AppText></Pressable>)}</ScrollView></View>}
        ListEmptyComponent={documents.isPending ? <StateView title="Opening your vault" message="Loading your private documents…" /> : documents.isError ? <StateView kind="error" title="We couldn't open your vault" message="Check your connection and try again." actionLabel="Try again" onAction={() => { void documents.refetch(); }} /> : category !== 'all' ? <StateView title="Nothing in this category" message="Choose another category or add a document." /> : <StateView title="Nothing here yet" message="Scan a university notice, screenshot, or PDF and ActionLens will turn it into an action plan." actionLabel="Scan something" onAction={() => router.push('/(app)/capture')} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, list: { flexGrow: 1, padding: spacing.lg }, header: { gap: spacing.md, paddingBottom: spacing.lg }, copy: { gap: spacing.xs }, actions: { gap: spacing.xs }, filters: { gap: spacing.xs }, filter: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md }, separator: { height: spacing.sm } });
