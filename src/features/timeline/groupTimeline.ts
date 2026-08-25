import { endOfDay, endOfMonth, endOfWeek, isBefore } from 'date-fns';

import type { AttentionItem } from '@/features/documents/documentQueries';

export type TimelineGroup = { title: 'Today' | 'This Week' | 'This Month' | 'Later' | 'Date to confirm'; items: AttentionItem[] };

export function groupTimeline(items: AttentionItem[], now = new Date()): TimelineGroup[] {
  const groups: TimelineGroup[] = [
    { title: 'Today', items: [] },
    { title: 'This Week', items: [] },
    { title: 'This Month', items: [] },
    { title: 'Later', items: [] },
    { title: 'Date to confirm', items: [] },
  ];
  const today = endOfDay(now);
  const week = endOfWeek(now, { weekStartsOn: 1 });
  const month = endOfMonth(now);
  for (const item of items) {
    if (!item.due_at) { groups[4]?.items.push(item); continue; }
    const due = new Date(item.due_at);
    if (!isBefore(today, due)) groups[0]?.items.push(item);
    else if (!isBefore(week, due)) groups[1]?.items.push(item);
    else if (!isBefore(month, due)) groups[2]?.items.push(item);
    else groups[3]?.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}
