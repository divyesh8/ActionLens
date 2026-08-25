import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { SourceButton, SourceModal, type SourceSelection } from '@/design-system/SourceReference';
import { FullScreenLoading, StateView } from '@/design-system/StateView';
import { TextField } from '@/design-system/TextField';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { selectNextAction } from '@/features/actions/nextAction';
import { useAuth } from '@/features/auth/AuthProvider';
import { getOriginalSignedUrl, retryDocumentProcessing, useDocumentDetail, useSetActionStatus, useSetActionWaiting, useSetRequirementStatus } from '@/features/documents/documentDetailService';
import type { DocumentAnalysis } from '@/services/ai/analysisSchema';

const processingStages = [
  { states: ['uploading', 'uploaded', 'queued'], label: 'Upload saved' },
  { states: ['ocr_processing', 'ocr_complete'], label: 'Reading document' },
  { states: ['ai_processing'], label: 'Understanding requirements' },
  { states: ['awaiting_verification', 'verified'], label: 'Ready for your review' },
];

export default function DocumentDetailScreen() {
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const detail = useDocumentDetail(userId, id);
  const [operationError, setOperationError] = useState<string>();
  const [retrying, setRetrying] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  const requirementMutation = useSetRequirementStatus(userId, id);
  const actionMutation = useSetActionStatus(userId, id);
  const waitingMutation = useSetActionWaiting(userId, id);
  if (detail.isPending) return <FullScreenLoading label="Opening document" />;
  if (detail.isError) return <StateView kind="error" title="We couldn't open this document" message="It may have been deleted or your connection may be offline." actionLabel="Try again" onAction={() => { void detail.refetch(); }} />;
  const { document, extraction, obligation, requirements, actions, history } = detail.data;
  const processing = ['uploading', 'uploaded', 'queued', 'ocr_processing', 'ocr_complete', 'ai_processing'].includes(document.status);
  const openOriginal = async () => {
    setOperationError(undefined);
    try { await Linking.openURL(await getOriginalSignedUrl(userId, id)); } catch { setOperationError('The original file could not be opened. Check your connection and try again.'); }
  };
  const retry = async () => {
    setOperationError(undefined); setRetrying(true);
    try { await retryDocumentProcessing(userId, id); await detail.refetch(); } catch { setOperationError('Processing could not restart. Check your connection and try again.'); }
    finally { setRetrying(false); }
  };
  return (
    <Screen>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><View style={styles.headerCopy}><AppText variant="metadata" color={colors.textMuted}>{document.document_type?.toUpperCase() ?? 'DOCUMENT'}</AppText><AppText variant="heading" numberOfLines={2}>{document.title}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Manage document" onPress={() => router.push({ pathname: '/(app)/manage/[id]', params: { id } })} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={24} color={colors.text} /></Pressable></View>
      {notice ? <Card style={[styles.notice, { backgroundColor: notice === 'plan-ready' ? colors.successSoft : colors.warningSoft }]}><AppText variant="bodyStrong" color={notice === 'plan-ready' ? colors.success : colors.warning}>{notice === 'plan-ready' ? 'Your action plan is ready.' : notice}</AppText></Card> : null}
      {operationError ? <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}><AppText variant="caption" color={colors.danger}>{operationError}</AppText></Card> : null}
      <Card style={styles.sourceCard}><View style={[styles.documentIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={document.mime_type === 'application/pdf' ? 'document-text-outline' : document.mime_type === 'text/plain' ? 'text-outline' : 'image-outline'} size={28} color={colors.accent} /></View><View style={styles.headerCopy}><AppText variant="bodyStrong">Original document</AppText><AppText variant="caption" color={colors.textMuted}>{document.original_filename ?? 'Source file'} · Private</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Open original document" onPress={() => { void openOriginal(); }} style={styles.iconButton}><Ionicons name="open-outline" size={22} color={colors.accent} /></Pressable></Card>
      {processing ? <ProcessingPanel status={document.status} /> : document.status === 'failed' ? <StateView kind="error" title="Processing stopped" message={document.status_message ?? 'ActionLens could not finish reading this document.'} actionLabel="Try processing again" onAction={() => { void retry(); }} /> : document.status === 'awaiting_verification' && extraction ? <View style={styles.review}><Card style={styles.summary}><AppText variant="heading">Here’s what we found</AppText><AppText color={colors.textMuted}>{extraction.analysis.summary}</AppText><View style={styles.counts}><Count label="deadlines" value={extraction.analysis.deadlines.length} /><Count label="requirements" value={extraction.analysis.requirements.length} /><Count label="actions" value={extraction.analysis.actions.length} /></View></Card><Button label="Review & verify findings" onPress={() => router.push({ pathname: '/(app)/verification/[id]', params: { id } })} /></View> : document.status === 'verified' && obligation ? <View style={styles.review}>{extraction ? <VerifiedSummary analysis={extraction.analysis} onSource={setSelectedSource} /> : null}<ActionPlan obligation={obligation} requirements={requirements} actions={actions} history={history} onRequirement={(requirementId, completed) => requirementMutation.mutate({ id: requirementId, completed })} onAction={(actionId, completed) => actionMutation.mutate({ id: actionId, completed })} onWaiting={(actionId, waitingOn, followUpDate) => waitingMutation.mutate({ id: actionId, waitingOn, followUpDate })} busy={requirementMutation.isPending || actionMutation.isPending || waitingMutation.isPending} /></View> : <StateView title={retrying ? 'Restarting processing' : 'No action plan yet'} message="This document does not have a verified plan." />}
      <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} onOpenOriginal={() => { void openOriginal(); }} />
    </Screen>
  );
}

function VerifiedSummary({ analysis, onSource }: { analysis: DocumentAnalysis; onSource: (source: SourceSelection) => void }) {
  const { colors } = useAppTheme();
  const evidence = [
    ...analysis.deadlines.map((item) => ({ label: item.label, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.requirements.map((item) => ({ label: item.title, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.actions.map((item) => ({ label: item.title, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.payments.map((item) => ({ label: `${item.label}: ${item.amountText}`, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.contacts.map((item) => ({ label: item.name ?? item.role ?? 'Contact', sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.locations.map((item) => ({ label: item.label, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.eligibility.map((item) => ({ label: item.label, sourceText: item.sourceText, pageNumber: item.pageNumber })),
    ...analysis.links.map((item) => ({ label: item.label, sourceText: item.sourceText, pageNumber: item.pageNumber })),
  ];
  return <Card style={styles.summary}><AppText variant="heading">Verified document summary</AppText><AppText color={colors.textMuted}>{analysis.summary}</AppText>{analysis.payments.map((item, index) => <AppText key={`payment-${index}`} variant="caption">Payment · {item.amountText}{item.dueDate ? ` · due ${item.dueDate}` : ''}</AppText>)}{analysis.contacts.map((item, index) => <AppText key={`contact-${index}`} variant="caption">Contact · {[item.name, item.email, item.phone].filter(Boolean).join(' · ')}</AppText>)}{analysis.locations.map((item, index) => <AppText key={`location-${index}`} variant="caption">Location · {item.label}: {item.addressText}</AppText>)}{analysis.eligibility.map((item, index) => <AppText key={`eligibility-${index}`} variant="caption">Eligibility · {item.label}: {item.description}</AppText>)}{analysis.links.map((item, index) => <AppText key={`link-${index}`} variant="caption">Link · {item.label}: {item.url}</AppText>)}{evidence.length > 0 ? <View style={styles.sourceList}><AppText variant="bodyStrong">Source references</AppText>{evidence.map((item, index) => <SourceButton key={`${item.label}-${index}`} source={item} onPress={onSource} />)}</View> : null}</Card>;
}

function ProcessingPanel({ status }: { status: string }) {
  const { colors } = useAppTheme();
  const activeIndex = Math.max(0, processingStages.findIndex((stage) => stage.states.includes(status)));
  return <Card style={styles.processing}><AppText variant="heading">Building your action plan</AppText><AppText color={colors.textMuted}>Progress is saved. You can close ActionLens and return later.</AppText><View style={styles.stageList}>{processingStages.map((stage, index) => <View key={stage.label} style={styles.stage}><Ionicons name={index < activeIndex ? 'checkmark-circle' : index === activeIndex ? 'ellipse' : 'ellipse-outline'} size={21} color={index <= activeIndex ? colors.accent : colors.textMuted} /><AppText color={index <= activeIndex ? colors.text : colors.textMuted}>{stage.label}</AppText></View>)}</View></Card>;
}

function Count({ value, label }: { value: number; label: string }) {
  const { colors } = useAppTheme();
  return <View style={styles.count}><AppText variant="heading">{value}</AppText><AppText variant="metadata" color={colors.textMuted}>{label.toUpperCase()}</AppText></View>;
}

type PlanProps = {
  obligation: NonNullable<ReturnType<typeof useDocumentDetail>['data']>['obligation'];
  requirements: NonNullable<ReturnType<typeof useDocumentDetail>['data']>['requirements'];
  actions: NonNullable<ReturnType<typeof useDocumentDetail>['data']>['actions'];
  history: NonNullable<ReturnType<typeof useDocumentDetail>['data']>['history'];
  onRequirement: (id: string, completed: boolean) => void;
  onAction: (id: string, completed: boolean) => void;
  onWaiting: (id: string, waitingOn: string | null, followUpDate: string | null) => void;
  busy: boolean;
};

function ActionPlan({ obligation, requirements, actions, history, onRequirement, onAction, onWaiting, busy }: PlanProps) {
  const { colors } = useAppTheme();
  const [waitingActionId, setWaitingActionId] = useState<string>();
  const [waitingOn, setWaitingOn] = useState('University');
  const [followUpDate, setFollowUpDate] = useState('');
  if (!obligation) return null;
  const completed = requirements.filter((item) => item.status === 'completed').length;
  const progress = requirements.length > 0 ? completed / requirements.length : 0;
  const nextAction = selectNextAction(actions);
  return (
    <View style={styles.plan}>
      <View style={styles.planHero}><AppText variant="title">{obligation.title}</AppText><AppText variant="heading" color={obligation.due_at ? colors.warning : colors.textMuted}>{obligation.due_at ? `Due ${format(new Date(obligation.due_at), 'd MMMM yyyy')}` : 'No exact deadline confirmed'}</AppText><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.success, width: `${Math.round(progress * 100)}%` }]} /></View><AppText variant="caption" color={colors.textMuted}>{completed} of {requirements.length} requirements completed</AppText></View>
      {nextAction ? <Card style={[styles.next, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><AppText variant="metadata" color={colors.accent}>NEXT BEST ACTION</AppText><AppText variant="heading">{nextAction.title}</AppText>{nextAction.description ? <AppText color={colors.textMuted}>{nextAction.description}</AppText> : null}<Button label="Mark as done" onPress={() => onAction(nextAction.id, true)} disabled={busy} /></Card> : null}
      <View style={styles.section}><AppText variant="heading">Requirements</AppText>{requirements.length === 0 ? <AppText color={colors.textMuted}>No required documents were confirmed.</AppText> : requirements.map((item) => <ChecklistRow key={item.id} title={item.title} completed={item.status === 'completed'} disabled={busy} onPress={() => onRequirement(item.id, item.status !== 'completed')} />)}</View>
      <View style={styles.section}><AppText variant="heading">Actions</AppText>{actions.map((item, index) => <View key={item.id} style={styles.actionItem}><ChecklistRow title={`${index + 1}. ${item.title}`} completed={item.status === 'completed'} disabled={busy} waiting={item.status === 'waiting'} onPress={() => onAction(item.id, item.status !== 'completed')} />{item.status !== 'completed' ? <Button label={item.status === 'waiting' ? 'Resume action' : 'Mark as waiting'} variant="ghost" disabled={busy} onPress={() => { if (item.status === 'waiting') onWaiting(item.id, null, null); else { setWaitingActionId(item.id); setWaitingOn(item.waiting_on ?? 'University'); setFollowUpDate(''); } }} /> : null}</View>)}</View>
      {waitingActionId ? <Card style={styles.waitingEditor}><AppText variant="heading">What are you waiting on?</AppText><AppText color={colors.textMuted}>Examples: University, employer, government office, or a person.</AppText><TextField label="Waiting on" value={waitingOn} onChangeText={setWaitingOn} maxLength={100} /><TextField label="Follow-up date (optional)" value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" autoCapitalize="none" /><Button label="Save waiting status" disabled={busy || !waitingOn.trim()} onPress={() => { onWaiting(waitingActionId, waitingOn, followUpDate.trim() || null); setWaitingActionId(undefined); }} /><Button label="Cancel" variant="ghost" disabled={busy} onPress={() => setWaitingActionId(undefined)} /></Card> : null}
      <View style={styles.section}><AppText variant="heading">History</AppText>{history.map((event) => <View key={event.id} style={styles.history}><View style={[styles.historyDot, { backgroundColor: colors.accent }]} /><View style={styles.headerCopy}><AppText variant="bodyStrong">{event.display_message}</AppText><AppText variant="caption" color={colors.textMuted}>{format(new Date(event.occurred_at), 'd MMM yyyy, h:mm a')}</AppText></View></View>)}</View>
    </View>
  );
}

function ChecklistRow({ title, completed, waiting = false, disabled, onPress }: { title: string; completed: boolean; waiting?: boolean; disabled: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: completed, disabled }} disabled={disabled || waiting} onPress={onPress} style={[styles.checkRow, { borderColor: colors.border, backgroundColor: colors.surface }]}><Ionicons name={completed ? 'checkmark-circle' : waiting ? 'time-outline' : 'ellipse-outline'} size={24} color={completed ? colors.success : waiting ? colors.warning : colors.textMuted} /><AppText style={[styles.checkTitle, completed && styles.completed]} color={completed ? colors.textMuted : colors.text}>{title}</AppText>{waiting ? <AppText variant="metadata" color={colors.warning}>WAITING</AppText> : null}</Pressable>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, gap: 2 }, notice: { marginBottom: spacing.md }, sourceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }, documentIcon: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' }, processing: { gap: spacing.md }, stageList: { gap: spacing.sm }, stage: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, review: { gap: spacing.md }, summary: { gap: spacing.md }, sourceList: { gap: spacing.xs }, counts: { flexDirection: 'row', justifyContent: 'space-around' }, count: { alignItems: 'center' }, plan: { gap: spacing.xl }, planHero: { gap: spacing.sm }, progressTrack: { height: 8, borderRadius: radii.pill, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: radii.pill }, next: { gap: spacing.sm }, section: { gap: spacing.sm }, actionItem: { gap: spacing.xxs }, waitingEditor: { gap: spacing.sm }, checkRow: { minHeight: 58, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, checkTitle: { flex: 1 }, completed: { textDecorationLine: 'line-through' }, history: { flexDirection: 'row', gap: spacing.sm }, historyDot: { width: 9, height: 9, borderRadius: radii.pill, marginTop: 7 } });
