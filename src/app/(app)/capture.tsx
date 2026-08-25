import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { radii, spacing, typography } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { CaptureValidationError, pickDocumentFile, pickDocumentPhoto, takeDocumentPhoto, validatePastedText } from '@/features/capture/captureService';
import { DuplicateDocumentError, ingestDocument, IngestionCancelledError, type IngestionStage } from '@/features/capture/ingestionService';
import { LocalProcessingUnavailableError } from '@/services/ai/localDocumentProcessor';
import { useCaptureStore } from '@/store/captureStore';
import { trackAnalyticsEvent } from '@/services/analytics/analyticsService';

const stageLabel: Record<IngestionStage, string> = { preparing: 'Preparing document', checking_duplicate: 'Checking your vault', uploading: 'Uploading securely', queueing: 'Preparing local analysis', reading_locally: 'Reading on this device', analyzing_locally: 'Analyzing on this device', saving_results: 'Saving your results', waiting_connection: 'Saving for later' };
const options = [
  { key: 'camera', title: 'Camera', detail: 'Photograph a notice or letter', icon: 'camera-outline' },
  { key: 'photo', title: 'Photo', detail: 'Choose a screenshot or image', icon: 'image-outline' },
  { key: 'file', title: 'PDF / File', detail: 'Choose a PDF, image, or text file', icon: 'document-attach-outline' },
  { key: 'text', title: 'Paste Text', detail: 'Paste an email, message, or notice', icon: 'text-outline' },
] as const;

export default function CaptureScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const { source, setSource, textMode, setTextMode, pastedText, setPastedText, clear } = useCaptureStore();
  const [stage, setStage] = useState<IngestionStage>();
  const [uploadFraction, setUploadFraction] = useState(0);
  const [error, setError] = useState<string>();
  const [duplicateId, setDuplicateId] = useState<string>();
  const [waitingForConnection, setWaitingForConnection] = useState(false);
  const abortController = useRef<AbortController | undefined>(undefined);
  const busy = Boolean(stage);

  const choose = async (key: typeof options[number]['key']) => {
    setError(undefined); setDuplicateId(undefined); setWaitingForConnection(false);
    try {
      if (key === 'text') { setTextMode(true); setSource(undefined); return; }
      const selected = key === 'camera' ? await takeDocumentPhoto() : key === 'photo' ? await pickDocumentPhoto() : await pickDocumentFile();
      if (selected) { setSource(selected); setTextMode(false); }
    } catch (reason) { setError(reason instanceof CaptureValidationError ? reason.message : 'ActionLens could not open that source. Try another option.'); }
  };

  const analyze = async () => {
    if (!session) return;
    setError(undefined); setDuplicateId(undefined);
    try {
      const input = textMode ? { kind: 'text' as const, text: validatePastedText(pastedText) } : source ? { kind: 'file' as const, source } : null;
      if (!input) { setError('Choose a document or paste text first.'); return; }
      void trackAnalyticsEvent(session.user.id, 'document_import_started', { sourceKind: input.kind === 'text' ? 'text' : input.source.origin });
      abortController.current = new AbortController();
      setUploadFraction(0);
      const result = await ingestDocument({ userId: session.user.id, input, signal: abortController.current.signal, onStage: setStage, onUploadProgress: setUploadFraction });
      setStage(undefined);
      if (result.status === 'waiting_connection') {
        clear();
        void trackAnalyticsEvent(session.user.id, 'document_import_completed', { outcome: 'waiting_connection' });
        setWaitingForConnection(true);
        return;
      }
      clear();
      void trackAnalyticsEvent(session.user.id, 'document_import_completed', { outcome: 'processing' });
      router.replace({ pathname: '/(app)/document/[id]', params: { id: result.documentId } });
    } catch (reason) {
      setStage(undefined);
      if (reason instanceof DuplicateDocumentError) { setDuplicateId(reason.documentId); setError(reason.message); void trackAnalyticsEvent(session.user.id, 'document_import_failed', { reason: 'duplicate' }); }
      else if (reason instanceof IngestionCancelledError) { setError('Import cancelled. Nothing was saved.'); void trackAnalyticsEvent(session.user.id, 'document_import_failed', { reason: 'cancelled' }); }
      else if (reason instanceof LocalProcessingUnavailableError) { setError(reason.message); void trackAnalyticsEvent(session.user.id, 'document_import_failed', { reason: 'local_format' }); }
      else if (reason instanceof CaptureValidationError) { setError(reason.message); void trackAnalyticsEvent(session.user.id, 'document_import_failed', { reason: 'validation' }); }
      else { setError('The import did not finish. Your source was not silently processed—check your connection and try again.'); void trackAnalyticsEvent(session.user.id, 'document_import_failed', { reason: 'network_or_server' }); }
    }
  };

  return (
    <Screen keyboard>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></Pressable><View style={styles.headerCopy}><AppText variant="heading">Add to ActionLens</AppText><AppText variant="caption" color={colors.textMuted}>Choose one source</AppText></View></View>
      {busy && stage ? <View style={styles.processing}><ActivityIndicator size="large" color={colors.accent} /><AppText variant="heading">{stageLabel[stage]}{stage === 'uploading' && uploadFraction > 0 ? ` ${Math.round(uploadFraction * 100)}%` : ''}</AppText><AppText color={colors.textMuted} align="center">OCR and analysis run inside this browser. No paid AI API or external model receives the document.</AppText><Button label="Cancel import" variant="secondary" onPress={() => abortController.current?.abort()} /></View> : <View style={styles.body}><View style={styles.options}>{options.map((option) => <Pressable key={option.key} accessibilityRole="button" onPress={() => { void choose(option.key); }}>{({ pressed }) => <Card style={[styles.option, { opacity: pressed ? 0.76 : 1 }]}><View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={option.icon} size={24} color={colors.accent} /></View><View style={styles.optionCopy}><AppText variant="bodyStrong">{option.title}</AppText><AppText variant="caption" color={colors.textMuted}>{option.detail}</AppText></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></Card>}</Pressable>)}</View>
      {source ? <Card style={styles.selected}><Ionicons name="checkmark-circle" size={24} color={colors.success} /><View style={styles.optionCopy}><AppText variant="bodyStrong" numberOfLines={2}>{source.name}</AppText><AppText variant="caption" color={colors.textMuted}>{(source.size / 1024 / 1024).toFixed(1)} MB · {source.mimeType}</AppText></View></Card> : null}
      {textMode ? <View style={styles.textArea}><AppText variant="caption">Source text</AppText><TextInput multiline value={pastedText} onChangeText={setPastedText} placeholder="Paste the original notice, email, or message here…" placeholderTextColor={colors.textMuted} selectionColor={colors.accent} style={[styles.textInput, typography.body, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View> : null}
      {error ? <Card style={[styles.error, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}><AppText variant="caption" color={colors.danger}>{error}</AppText>{duplicateId ? <Button label="Open existing document" variant="secondary" onPress={() => router.replace({ pathname: '/(app)/document/[id]', params: { id: duplicateId } })} /> : null}</Card> : null}
      {waitingForConnection ? <Card style={[styles.error, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><AppText variant="bodyStrong">Waiting for connection</AppText><AppText variant="caption" color={colors.textMuted}>Your source is saved on this device. ActionLens will upload and process it once you’re online.</AppText><Button label="Done" variant="secondary" onPress={() => router.back()} /></Card> : null}
      <Button label="Import & analyze" disabled={!source && !textMode} onPress={() => { void analyze(); }} /></View>}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg }, close: { width: 44, height: 44, justifyContent: 'center' }, headerCopy: { gap: 1 }, body: { gap: spacing.md }, options: { gap: spacing.sm }, option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, optionIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' }, optionCopy: { flex: 1, gap: 2 }, selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, textArea: { gap: spacing.xs }, textInput: { minHeight: 170, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, textAlignVertical: 'top' }, error: { gap: spacing.sm }, processing: { flex: 1, minHeight: 400, alignItems: 'center', justifyContent: 'center', gap: spacing.md } });
