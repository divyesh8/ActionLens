import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseDeadlineReminderDate } from './reminderLogic.ts';

const now = new Date('2026-08-25T00:00:00.000Z');

test('uses the three-day offset when there is enough lead time', () => {
  assert.equal(chooseDeadlineReminderDate('2026-09-04T00:00:00.000Z', now)?.toISOString(), '2026-09-01T00:00:00.000Z');
});

test('falls back to the deadline for a near-term obligation', () => {
  assert.equal(chooseDeadlineReminderDate('2026-08-27T00:00:00.000Z', now)?.toISOString(), '2026-08-27T00:00:00.000Z');
});

test('does not schedule a stale reminder', () => {
  assert.equal(chooseDeadlineReminderDate('2026-08-25T00:30:00.000Z', now), null);
});

test('supports a user-selected one-day lead time', () => {
  const selected = chooseDeadlineReminderDate('2026-08-30T12:00:00Z', new Date('2026-08-25T12:00:00Z'), 1440);
  assert.equal(selected?.toISOString(), '2026-08-29T12:00:00.000Z');
});
