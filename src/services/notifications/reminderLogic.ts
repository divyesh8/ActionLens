const MINIMUM_LEAD_MS = 60 * 60 * 1000;

export function chooseDeadlineReminderDate(dueAt: string, now = new Date(), offsetMinutes = 3 * 24 * 60): Date | null {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) throw new Error('The reminder deadline is invalid.');
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < 0 || offsetMinutes > 30 * 24 * 60) throw new Error('The reminder offset is invalid.');
  const preferred = new Date(due.getTime() - offsetMinutes * 60_000);
  const earliest = new Date(now.getTime() + MINIMUM_LEAD_MS);
  if (preferred > earliest) return preferred;
  if (due > earliest) return due;
  return null;
}
