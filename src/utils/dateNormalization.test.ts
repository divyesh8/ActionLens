import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeVerifiedDate } from './dateNormalization.ts';

test('date-only deadlines end on the selected day in the user timezone', () => {
  assert.equal(
    normalizeVerifiedDate('2026-09-12', 'Asia/Calcutta'),
    '2026-09-12T18:29:00.000Z',
  );
});

test('explicit instants are preserved and blank dates stay empty', () => {
  assert.equal(
    normalizeVerifiedDate('2026-09-12T10:30:00.000Z', 'Asia/Calcutta'),
    '2026-09-12T10:30:00.000Z',
  );
  assert.equal(normalizeVerifiedDate('  ', 'UTC'), null);
});

test('invalid dates fail before a plan is saved', () => {
  assert.throws(
    () => normalizeVerifiedDate('not-a-date', 'UTC'),
    /Review the date/,
  );
});
