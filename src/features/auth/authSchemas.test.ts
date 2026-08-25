import assert from 'node:assert/strict';
import test from 'node:test';

import { resetPasswordSchema, signInSchema, signUpSchema } from './authSchemas.ts';

test('sign in rejects malformed email and an empty password', () => {
  const result = signInSchema.safeParse({ email: 'not-an-email', password: '' });
  assert.equal(result.success, false);
});

test('sign up accepts a valid account payload', () => {
  const result = signUpSchema.safeParse({ displayName: 'Asha Rao', email: 'asha@example.com', password: 'safe-passphrase' });
  assert.equal(result.success, true);
});

test('password reset requires matching passwords', () => {
  const result = resetPasswordSchema.safeParse({ password: 'safe-passphrase', confirmPassword: 'different-passphrase' });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues[0]?.path[0], 'confirmPassword');
});
