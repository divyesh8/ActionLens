import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Screen } from '@/design-system/Screen';
import { StateView } from '@/design-system/StateView';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { AttentionCard } from '@/features/actions/AttentionCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTimeline } from '@/features/documents/documentQueries';
import { groupTimeline } from '@/features/timeline/groupTimeline';

export default function TimelineScreen() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const timeline = useTimeline(session?.user.id ?? '');
  const groups = groupTimeline(timeline.data ?? []);
  return (
    <Screen>
      <View style={styles.header}><AppText variant="title">Timeline</AppText><AppText color={colors.textMuted}>Only real obligations and dates that need your attention.</AppText></View>
      {timeline.isPending ? <StateView title="Checking your deadlines" message="Building a clear view of what is ahead…" /> : timeline.isError ? <StateView kind="error" title="We couldn't load your timeline" message="Check your connection and try again." actionLabel="Try again" onAction={() => { void timeline.refetch(); }} /> : groups.length === 0 ? <StateView title="No upcoming obligations" message="Verified deadlines from your documents will appear here." /> : <View style={styles.groups}>{groups.map((group) => <View key={group.title} style={styles.group}><AppText variant="heading">{group.title}</AppText>{group.items.map((item) => <AttentionCard key={item.id} item={item} />)}</View>)}</View>}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.xs, paddingBottom: spacing.xl }, groups: { gap: spacing.xl }, group: { gap: spacing.sm } });
