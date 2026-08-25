import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { ConfidenceBadge } from '@/design-system/ConfidenceBadge';
import { Screen } from '@/design-system/Screen';
import { SourceButton, SourceModal, type SourceSelection } from '@/design-system/SourceReference';
import { StateView, FullScreenLoading } from '@/design-system/StateView';
import { radii, spacing, typography } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { getOriginalSignedUrl, useDocumentDetail } from '@/features/documents/documentDetailService';
import { analysisToPayload, useVerifyDocument, type VerificationPayload } from '@/features/verification/verificationService';
import type { Confidence, DocumentAnalysis } from '@/services/ai/analysisSchema';

const confidenceOrder: Confidence[] = ['high', 'review_recommended', 'uncertain'];
function nextConfidence(current: Confidence): Confidence { return confidenceOrder[(confidenceOrder.indexOf(current) + 1) % confidenceOrder.length] ?? 'high'; }

function VerificationEditor({ userId, documentId, initial, analysis }: { userId: string; documentId: string; initial: VerificationPayload; analysis: DocumentAnalysis }) {
  const { colors } = useAppTheme();
  const [payload, setPayload] = useState(initial);
  const [reminder, setReminder] = useState(Boolean(initial.deadline.date));
  const [source, setSource] = useState<SourceSelection | null>(null);
  const [error, setError] = useState<string>();
  const mutation = useVerifyDocument(userId, documentId);
  const deadlines = [payload.deadline, ...payload.additionalDeadlines];
  const updateDeadline = (index: number, values: Partial<typeof payload.deadline>) => {
    const updated = deadlines.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...values } : entry);
    setPayload((current) => ({ ...current, deadline: updated[0] ?? current.deadline, additionalDeadlines: updated.slice(1) }));
  };
  const removeDeadline = (index: number) => {
    const updated = deadlines.filter((_entry, entryIndex) => entryIndex !== index);
    const fallback = { label: 'Deadline to confirm', date: null, uncertain: true, confidence: 'uncertain' as const, sourceText: '', pageNumber: null };
    setPayload((current) => ({ ...current, deadline: updated[0] ?? fallback, additionalDeadlines: updated.slice(1) }));
  };
  const confirm = async () => {
    setError(undefined);
    try {
      const result = await mutation.mutateAsync({ payload, createReminder: reminder });
      router.replace({ pathname: '/(app)/document/[id]', params: { id: documentId, notice: result.reminderWarning ?? 'plan-ready' } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'ActionLens could not save this plan. Review the fields and try again.'); }
  };
  const openOriginal = async () => {
    try { const url = await getOriginalSignedUrl(userId, documentId); await Linking.openURL(url); } catch { setError('The original file could not be opened. Try again.'); }
  };
  return (
    <Screen keyboard>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><View style={styles.headerCopy}><AppText variant="heading">Verify what we found</AppText><AppText variant="caption" color={colors.textMuted}>Nothing becomes official until you confirm</AppText></View></View>
      <View style={styles.intro}><AppText variant="title">Here’s what this document requires.</AppText><AppText color={colors.textMuted}>Edit, remove, or add anything. Use the source links whenever a finding is unclear.</AppText></View>
      <View style={styles.section}><AppText variant="heading">Action plan</AppText><TextInput accessibilityLabel="Action plan title" value={payload.title} onChangeText={(title) => setPayload((current) => ({ ...current, title }))} style={[styles.input, typography.heading, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /><TextInput accessibilityLabel="Summary" multiline value={payload.summary} onChangeText={(summary) => setPayload((current) => ({ ...current, summary }))} style={[styles.input, styles.multiline, typography.body, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
      <View style={styles.section}><AppText variant="heading">Deadlines</AppText>{deadlines.map((deadline, index) => <Card key={`${deadline.label}-${index}`} style={styles.finding}><View style={styles.findingTop}><AppText variant="metadata" color={colors.textMuted}>{index === 0 ? 'PRIMARY DEADLINE' : 'IMPORTANT DATE'}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Remove deadline" onPress={() => removeDeadline(index)} style={styles.remove}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable></View><TextInput accessibilityLabel="Deadline label" value={deadline.label} onChangeText={(label) => updateDeadline(index, { label })} style={[styles.inlineInput, typography.bodyStrong, { color: colors.text, borderBottomColor: colors.border }]} /><TextInput accessibilityLabel="Deadline date" value={deadline.date ?? ''} onChangeText={(date) => updateDeadline(index, { date: date || null, uncertain: !date })} placeholder="YYYY-MM-DD or leave blank if uncertain" placeholderTextColor={colors.textMuted} style={[styles.inlineInput, typography.body, { color: colors.text, borderBottomColor: colors.border }]} /><ConfidenceBadge value={deadline.confidence} onPress={() => updateDeadline(index, { confidence: nextConfidence(deadline.confidence), uncertain: nextConfidence(deadline.confidence) === 'uncertain' })} /><SourceButton source={{ label: deadline.label, sourceText: deadline.sourceText, pageNumber: deadline.pageNumber }} onPress={setSource} /></Card>)}</View>
      <FindingSection title="Required items" kind="requirement" items={payload.requirements} colors={colors} onSource={setSource} onChange={(requirements) => setPayload((current) => ({ ...current, requirements }))} />
      <FindingSection title="Actions" kind="action" items={payload.actions} colors={colors} onSource={setSource} onChange={(actions) => setPayload((current) => ({ ...current, actions }))} />
      <SupportingFindings analysis={analysis} onSource={setSource} />
      {analysis.warnings.length > 0 ? <View style={styles.section}><AppText variant="heading">Important notes</AppText>{analysis.warnings.map((warning, index) => <Card key={`${warning.title}-${index}`} style={[styles.finding, { backgroundColor: colors.warningSoft }]}><AppText variant="bodyStrong" color={colors.warning}>{warning.title}</AppText><AppText>{warning.description}</AppText><SourceButton source={{ label: warning.title, sourceText: warning.sourceText, pageNumber: warning.pageNumber }} onPress={setSource} /></Card>)}</View> : null}
      <Card style={styles.reminder}><View style={styles.headerCopy}><AppText variant="bodyStrong">Remind me before the primary deadline</AppText><AppText variant="caption" color={colors.textMuted}>{payload.deadline.date ? 'Schedules a useful deadline reminder after you confirm.' : 'Add an exact deadline to enable a reminder.'}</AppText></View><Switch value={reminder && Boolean(payload.deadline.date)} disabled={!payload.deadline.date} onValueChange={setReminder} trackColor={{ false: colors.border, true: colors.accentSoft }} thumbColor={reminder ? colors.accent : colors.textMuted} /></Card>
      {error ? <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}><AppText variant="caption" color={colors.danger}>{error}</AppText></Card> : null}
      <Button label="Confirm & create action plan" loading={mutation.isPending} onPress={() => { void confirm(); }} />
      <SourceModal source={source} onClose={() => setSource(null)} onOpenOriginal={() => { void openOriginal(); }} />
    </Screen>
  );
}

function SupportingFindings({ analysis, onSource }: { analysis: DocumentAnalysis; onSource: (source: SourceSelection) => void }) {
  const { colors } = useAppTheme();
  const groups = [
    { title: 'Payments', items: analysis.payments.map((item) => ({ title: item.label, detail: `${item.amountText}${item.dueDate ? ` · due ${item.dueDate}` : ''}`, ...item })) },
    { title: 'Contact information', items: analysis.contacts.map((item) => ({ title: item.name ?? item.role ?? 'Contact', detail: [item.role, item.email, item.phone].filter(Boolean).join(' · '), ...item })) },
    { title: 'Locations', items: analysis.locations.map((item) => ({ title: item.label, detail: item.addressText, ...item })) },
    { title: 'Eligibility', items: analysis.eligibility.map((item) => ({ title: item.label, detail: `${item.status === 'unknown' ? 'Needs confirmation' : item.status === 'met' ? 'Appears met' : 'Appears not met'} · ${item.description}`, ...item })) },
    { title: 'Links', items: analysis.links.map((item) => ({ title: item.label, detail: item.url, ...item })) },
  ];
  return <>{groups.map((group) => group.items.length > 0 ? <View key={group.title} style={styles.section}><AppText variant="heading">{group.title}</AppText>{group.items.map((item, index) => <Card key={`${item.title}-${index}`} style={styles.finding}><AppText variant="bodyStrong">{item.title}</AppText><AppText color={colors.textMuted}>{item.detail}</AppText><ConfidenceBadge value={item.confidence} /><SourceButton source={{ label: item.title, sourceText: item.sourceText, pageNumber: item.pageNumber }} onPress={onSource} /></Card>)}</View> : null)}</>;
}

type Requirement = VerificationPayload['requirements'][number];
type Action = VerificationPayload['actions'][number];

function removeFinding<T extends Requirement | Action>(items: T[], removedIndex: number): T[] {
  return items
    .filter((_item, index) => index !== removedIndex)
    .map((item) => {
      if ('dependsOnActionIndexes' in item) {
        return {
          ...item,
          dependsOnActionIndexes: item.dependsOnActionIndexes
            .filter((index) => index !== removedIndex)
            .map((index) => index > removedIndex ? index - 1 : index),
        } as T;
      }
      return {
        ...item,
        dependsOnRequirementIndexes: item.dependsOnRequirementIndexes
          .filter((index) => index !== removedIndex)
          .map((index) => index > removedIndex ? index - 1 : index),
      } as T;
    });
}

function FindingSection<T extends Requirement | Action>({ title, kind, items, colors, onSource, onChange }: { title: string; kind: 'requirement' | 'action'; items: T[]; colors: ReturnType<typeof useAppTheme>['colors']; onSource: (source: SourceSelection) => void; onChange: (items: T[]) => void }) {
  const update = (index: number, values: Partial<T>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
  const add = () => {
    const common = { title: '', description: '', confidence: 'high' as const, sourceText: 'Added by user', pageNumber: null, sortOrder: items.length };
    const item = (kind === 'requirement' ? { ...common, required: true, dependsOnRequirementIndexes: [] } : { ...common, priority: 'normal' as const, dueDate: null, dependsOnActionIndexes: [] }) as unknown as T;
    onChange([...items, item]);
  };
  return (
    <View style={styles.section}><View style={styles.sectionHeader}><AppText variant="heading">{title}</AppText><Pressable accessibilityRole="button" onPress={add} style={styles.add}><Ionicons name="add" size={18} color={colors.accent} /><AppText variant="caption" color={colors.accent}>Add</AppText></Pressable></View>{items.map((item, index) => <Card key={`${item.title}-${index}`} style={styles.finding}><View style={styles.findingTop}><ConfidenceBadge value={item.confidence} onPress={() => update(index, { confidence: nextConfidence(item.confidence) } as Partial<T>)} /><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${kind}`} onPress={() => onChange(removeFinding(items, index))} style={styles.remove}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable></View><TextInput accessibilityLabel={`${kind} title`} value={item.title} onChangeText={(value) => update(index, { title: value } as Partial<T>)} placeholder={`Add ${kind}`} placeholderTextColor={colors.textMuted} style={[styles.inlineInput, typography.bodyStrong, { color: colors.text, borderBottomColor: colors.border }]} /><TextInput accessibilityLabel={`${kind} description`} value={item.description} onChangeText={(value) => update(index, { description: value } as Partial<T>)} placeholder="Optional detail" placeholderTextColor={colors.textMuted} style={[styles.inlineInput, typography.body, { color: colors.text, borderBottomColor: colors.border }]} /><SourceButton source={{ label: item.title, sourceText: item.sourceText, pageNumber: item.pageNumber }} onPress={onSource} /></Card>)}</View>
  );
}

export default function VerificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const detail = useDocumentDetail(session?.user.id ?? '', id);
  if (detail.isPending) return <FullScreenLoading label="Opening findings" />;
  if (detail.isError || !detail.data.extraction) return <StateView kind="error" title="Findings are unavailable" message="Processing may still be running. Go back and try again." actionLabel="Go back" onAction={() => router.back()} />;
  return <VerificationEditor userId={session?.user.id ?? ''} documentId={id} initial={analysisToPayload(detail.data.extraction.analysis, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')} analysis={detail.data.extraction.analysis} />;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, gap: 2 }, intro: { gap: spacing.xs, paddingBottom: spacing.xl }, section: { gap: spacing.sm, paddingBottom: spacing.lg }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }, input: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md }, multiline: { minHeight: 100, textAlignVertical: 'top' }, finding: { gap: spacing.sm }, findingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, inlineInput: { borderBottomWidth: 1, minHeight: 44, paddingVertical: spacing.xs }, reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } });
