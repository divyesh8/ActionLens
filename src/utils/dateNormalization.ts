import { fromZonedTime } from 'date-fns-tz';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts a reviewed date into an instant without moving date-only deadlines
 * to the previous calendar day for users east of UTC.
 */
export function normalizeVerifiedDate(value: string | null, timezone: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const date = DATE_ONLY_PATTERN.test(normalized)
    ? fromZonedTime(`${normalized}T23:59:00`, timezone)
    : new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Review the date “${value}” before creating the plan.`);
  }

  return date.toISOString();
}
