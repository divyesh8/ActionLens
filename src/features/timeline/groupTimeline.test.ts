import assert from 'node:assert/strict';
import test from 'node:test';

import type { AttentionItem } from '../documents/documentQueries.ts';
import { groupTimeline } from './groupTimeline.ts';

function item(id: string, dueAt: string | null): AttentionItem {
  return { id, document_id: '00000000-0000-4000-8000-000000000001', documentTitle: 'Notice', title: 'Submit', status: 'not_started', priority: 'normal', due_at: dueAt, due_date_is_uncertain: false, completedRequirements: 0, totalRequirements: 0 };
}

test('timeline keeps unknown dates visible for confirmation', () => {
  const groups = groupTimeline([item('00000000-0000-4000-8000-000000000002', null)], new Date('2026-08-25T10:00:00Z'));
  assert.equal(groups[0]?.title, 'Date to confirm');
});

test('timeline places a far future obligation in later', () => {
  const groups = groupTimeline([item('00000000-0000-4000-8000-000000000002', '2027-01-10T10:00:00Z')], new Date('2026-08-25T10:00:00Z'));
  assert.equal(groups[0]?.title, 'Later');
});
