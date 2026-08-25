import assert from 'node:assert/strict';
import test from 'node:test';

import { selectNextAction } from './nextAction.ts';

const base = { status: 'not_started' as const, priority: 'normal' as const, due_at: null, estimated_minutes: 30, sort_order: 0, depends_on_ids: [] as string[] };

test('next action excludes waiting and blocked work', () => {
  const selected = selectNextAction([{ ...base, id: 'waiting', status: 'waiting' as const, priority: 'urgent' as const }, { ...base, id: 'ready', status: 'ready' as const }], new Date('2026-08-25T00:00:00Z'));
  assert.equal(selected?.id, 'ready');
});

test('next action favors an imminent deadline', () => {
  const selected = selectNextAction([{ ...base, id: 'later', priority: 'high' as const }, { ...base, id: 'tomorrow', due_at: '2026-08-26T00:00:00Z' }], new Date('2026-08-25T00:00:00Z'));
  assert.equal(selected?.id, 'tomorrow');
});

test('next action waits for unfinished prerequisites', () => {
  const selected = selectNextAction([
    { ...base, id: 'prerequisite' },
    { ...base, id: 'dependent', priority: 'urgent' as const, depends_on_ids: ['prerequisite'] },
  ]);
  assert.equal(selected?.id, 'prerequisite');
});
