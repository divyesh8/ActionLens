import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { DocumentCard } from '@/features/documents/DocumentCard';
import { Screen } from '@/design-system/Screen';
import { StateView } from '@/design-system/StateView';
import { radii, spacing, typography } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDocumentSearch } from '@/features/search/searchService';

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const results = useDocumentSearch(session?.user.id ?? '', query);
  const submit = () => setQuery(value.trim());
  return (
    <Screen>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={20} color={colors.textMuted} /><TextInput autoFocus accessibilityLabel="Search documents" value={value} onChangeText={setValue} onSubmitEditing={submit} returnKeyType="search" placeholder="Search scholarship, marksheet, September…" placeholderTextColor={colors.textMuted} style={[styles.input, typography.body, { color: colors.text }]} /></View></View>
      {!query ? <StateView title="Search everything important" message="Search document titles, organizations, extracted text, requirements, deadlines, actions, and tags." /> : results.isPending ? <StateView title="Searching your vault" message="Checking your documents and verified action plans…" /> : results.isError ? <StateView kind="error" title="Search didn't finish" message="Check your connection and try again." actionLabel="Try again" onAction={() => { void results.refetch(); }} /> : results.data.length === 0 ? <StateView title="No matching documents" message="Try a different word from the original document or action plan." /> : <View style={styles.results}><AppText variant="caption" color={colors.textMuted}>{results.data.length} result{results.data.length === 1 ? '' : 's'}</AppText>{results.data.map((document) => <DocumentCard key={document.id} document={document} />)}</View>}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.lg }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, search: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, input: { flex: 1, minHeight: 50 }, results: { gap: spacing.sm } });
