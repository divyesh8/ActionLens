import assert from 'node:assert/strict';
import test from 'node:test';

import { hasActiveNetworkConnection } from './connectionState.ts';

test('only an explicitly disconnected network is treated as offline', () => {
  assert.equal(hasActiveNetworkConnection({ isConnected: true }), true);
  assert.equal(hasActiveNetworkConnection({}), true);
  assert.equal(hasActiveNetworkConnection({ isConnected: false }), false);
});
