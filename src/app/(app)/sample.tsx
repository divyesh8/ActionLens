import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { ConfidenceBadge } from '@/design-system/ConfidenceBadge';
import { Screen } from '@/design-system/Screen';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

const requirements = ['Faculty recommendation', 'Latest marksheet', 'Project summary'];

export default function SampleExperienceScreen() {
  const { colors } = useAppTheme();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const toggle = (item: string) => setCompleted((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close example" onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><AppText variant="metadata" color={colors.accent}>EXAMPLE · NOT SAVED</AppText><AppText variant="heading">See the ActionLens loop</AppText></View>
      </View>

      <View style={styles.progress} accessibilityLabel={`Example step ${step + 1} of 3`}>
        {[0, 1, 2].map((value) => <View key={value} style={[styles.progressSegment, { backgroundColor: value <= step ? colors.accent : colors.border }]} />)}
      </View>

      {step === 0 ? <DocumentStep /> : null}
      {step === 1 ? <FindingsStep /> : null}
      {step === 2 ? <PlanStep completed={completed} onToggle={toggle} /> : null}

      <View style={styles.actions}>
        {step > 0 ? <Button label="Back" variant="secondary" onPress={() => setStep((value) => value - 1)} /> : null}
        {step < 2 ? <Button label={step === 0 ? 'Show source-backed findings' : 'Confirm example plan'} onPress={() => setStep((value) => value + 1)} /> : <Button label="Import my own document" onPress={() => router.replace('/(app)/capture')} />}
      </View>
      <AppText variant="caption" color={colors.textMuted}>This fictional example stays on this screen and is never added to your account.</AppText>
    </Screen>
  );
}

function DocumentStep() {
  const { colors } = useAppTheme();
  return <View style={styles.section}><AppText variant="title">A document arrives</AppText><AppText color={colors.textMuted}>ActionLens keeps the original authoritative while turning its instructions into a reviewable draft.</AppText><Card style={[styles.notice, { backgroundColor: colors.surface }]}><AppText variant="metadata" color={colors.textMuted}>RIVERVIEW COLLEGE · FICTIONAL NOTICE</AppText><AppText variant="heading">Student Innovation Grant 2026</AppText><AppText>Applications must be submitted by 12 September 2026.</AppText><AppText>Attach your latest marksheet, a faculty recommendation, and a one-page project summary.</AppText><AppText>Email questions to grants@example.edu.</AppText></Card></View>;
}

function FindingsStep() {
  const { colors } = useAppTheme();
  return <View style={styles.section}><AppText variant="title">Here’s what this document requires.</AppText><Card style={styles.finding}><View style={styles.row}><AppText variant="bodyStrong">Deadline · 12 September 2026</AppText><ConfidenceBadge value="high" /></View><AppText variant="caption" color={colors.textMuted}>Source: “Applications must be submitted by 12 September 2026.”</AppText></Card><Card style={styles.finding}><AppText variant="bodyStrong">3 required items</AppText>{requirements.map((item) => <AppText key={item}>• {item}</AppText>)}<AppText variant="caption" color={colors.textMuted}>Source: page 1 attachment instruction</AppText></Card><Card style={[styles.finding, { backgroundColor: colors.warningSoft }]}><AppText variant="bodyStrong">You stay in control</AppText><AppText>Edit or remove a finding before confirming. Nothing becomes an obligation automatically.</AppText></Card></View>;
}

function PlanStep({ completed, onToggle }: { completed: string[]; onToggle: (item: string) => void }) {
  const { colors } = useAppTheme();
  const next = requirements.find((item) => !completed.includes(item));
  return <View style={styles.section}><AppText variant="title">Your example action plan</AppText><Card style={[styles.finding, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><AppText variant="metadata" color={colors.accent}>NEXT BEST ACTION</AppText><AppText variant="heading">{next ? `Get ${next.toLowerCase()}` : 'Ready to submit'}</AppText></Card><Card style={styles.finding}>{requirements.map((item) => { const done = completed.includes(item); return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => onToggle(item)} style={styles.checkRow}><Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? colors.success : colors.textMuted} /><AppText style={done ? styles.completed : undefined}>{item}</AppText></Pressable>; })}</Card><Card style={styles.row}><Ionicons name="notifications-outline" size={22} color={colors.accent} /><View style={styles.headerCopy}><AppText variant="bodyStrong">Reminder · 5 September</AppText><AppText variant="caption" color={colors.textMuted}>Scheduled only after a real plan is confirmed.</AppText></View></Card></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xxs },
  close: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.lg },
  progressSegment: { height: 4, flex: 1, borderRadius: radii.pill },
  section: { gap: spacing.md },
  notice: { gap: spacing.md, paddingVertical: spacing.xl },
  finding: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  completed: { textDecorationLine: 'line-through', opacity: 0.65 },
  actions: { gap: spacing.sm, paddingTop: spacing.xl },
});
