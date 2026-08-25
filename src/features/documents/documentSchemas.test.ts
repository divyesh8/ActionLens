import assert from 'node:assert/strict';
import test from 'node:test';

import { documentStatusSchema, itemStatusSchema } from './documentSchemas.ts';

test('document status accepts every persisted processing state', () => {
  const statuses = ['draft', 'uploading', 'uploaded', 'queued', 'ocr_processing', 'ocr_complete', 'ai_processing', 'awaiting_verification', 'verified', 'failed', 'archived'];
  assert.deepEqual(documentStatusSchema.array().parse(statuses), statuses);
});

test('document and plan status contracts reject unknown states', () => {
  assert.equal(documentStatusSchema.safeParse('waiting_for_connection').success, false);
  assert.equal(itemStatusSchema.safeParse('deleted').success, false);
});
