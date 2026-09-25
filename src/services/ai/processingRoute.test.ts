import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldProcessLocally } from './processingRoute.ts';

test('Android images and plain text use on-device processing', () => {
  assert.equal(shouldProcessLocally('android', 'image/jpeg'), true);
  assert.equal(shouldProcessLocally('android', 'image/png'), true);
  assert.equal(shouldProcessLocally('android', 'text/plain'), true);
});

test('Android PDFs retain the remote processor while the web processes every supported source locally', () => {
  assert.equal(shouldProcessLocally('android', 'application/pdf'), false);
  assert.equal(shouldProcessLocally('web', 'application/pdf'), true);
});
