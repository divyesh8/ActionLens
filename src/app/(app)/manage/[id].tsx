import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { FullScreenLoading, StateView } from '@/design-system/StateView';
import { TextField } from '@/design-system/TextField';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDocumentDetail } from '@/features/documents/documentDetailService';
import { archiveDocument, permanentlyDeleteDocument, renameDocument, useAddDocumentTag, useDocumentTags, useRemoveDocumentTag } from '@/features/documents/documentManagementService';

function ManageEditor({ userId, documentId, initialTitle }: { userId: string; documentId: string; initialTitle: string }) {
  const { colors } = useAppTheme();
  const [title, setTitle] = useState(initialTitle);
  const [tagName, setTagName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const tags = useDocumentTags(userId, documentId);
  const addTag = useAddDocumentTag(userId, documentId);
  const removeTag = useRemoveDocumentTag(userId, documentId);
  const tagBusy = addTag.isPending || removeTag.isPending;
  const run = async (operation: () => Promise<void>, after: () => void) => {
    setBusy(true); setError(undefined);
    try { await operation(); after(); } catch { setError('That change could not be saved. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const confirmDelete = () => Alert.alert('Permanently delete document?', 'The original file, analysis, action plan, reminders, and history will be removed. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete permanently', style: 'destructive', onPress: () => { void run(() => permanentlyDeleteDocument(userId, documentId), () => router.replace('/(app)/(tabs)/vault')); } }]);
  return (
    <Screen keyboard>
      <View style={styles.header}><AppText variant="title">Manage document</AppText><AppText color={colors.textMuted}>Rename, archive, or permanently remove this document.</AppText></View>
      <Card style={styles.card}><TextField label="Document title" value={title} onChangeText={setTitle} maxLength={240} /><Button label="Save title" loading={busy} onPress={() => { void run(() => renameDocument(userId, documentId, title), () => router.back()); }} /></Card>
      <Card style={styles.card}><AppText variant="bodyStrong">Tags</AppText><AppText color={colors.textMuted}>Tags make personal categories searchable and can grow with your vault.</AppText>{tags.data?.map((tag) => <Button key={tag.id} label={`Remove #${tag.name}`} variant="ghost" disabled={tagBusy} onPress={() => removeTag.mutate(tag.id)} />)}<TextField label="New tag" value={tagName} onChangeText={setTagName} placeholder="Scholarship" maxLength={40} /><Button label="Add tag" variant="secondary" disabled={tagBusy || !tagName.trim()} onPress={() => { void addTag.mutateAsync(tagName).then(() => setTagName('')).catch(() => setError('That tag could not be saved. Check your connection and try again.')); }} /></Card>
      <Card style={styles.card}><AppText variant="bodyStrong">Archive</AppText><AppText color={colors.textMuted}>Hide this document from your home, vault, and reminders without deleting the original.</AppText><Button label="Archive document" variant="secondary" disabled={busy} onPress={() => { void run(() => archiveDocument(userId, documentId), () => router.replace('/(app)/(tabs)/vault')); }} /></Card>
      <Card style={[styles.card, { borderColor: colors.danger }]}><AppText variant="bodyStrong" color={colors.danger}>Danger zone</AppText><AppText color={colors.textMuted}>Permanent deletion removes the private file and every associated record.</AppText><Button label="Delete permanently" variant="danger" disabled={busy} onPress={confirmDelete} /></Card>
      {error ? <AppText variant="caption" color={colors.danger}>{error}</AppText> : null}
      <Button label="Cancel" variant="ghost" disabled={busy} onPress={() => router.back()} />
    </Screen>
  );
}

export default function ManageDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const detail = useDocumentDetail(session?.user.id ?? '', id);
  if (detail.isPending) return <FullScreenLoading label="Opening document settings" />;
  if (detail.isError) return <StateView kind="error" title="Document unavailable" message="Go back and try again." actionLabel="Go back" onAction={() => router.back()} />;
  return <ManageEditor userId={session?.user.id ?? ''} documentId={id} initialTitle={detail.data.document.title} />;
}

const styles = StyleSheet.create({ header: { gap: spacing.xs, paddingBottom: spacing.lg }, card: { gap: spacing.md, marginBottom: spacing.md } });
