import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeTextLocally } from './localAnalysis.ts';

test('extracts actionable findings locally with source evidence', () => {
  const analysis = analyzeTextLocally([{ pageNumber: 1, text: [
    'Example University Scholarship Renewal',
    'Submit the renewal form by 12 September 2026.',
    'Applicants must provide an income certificate.',
    'Application fee: Rs. 500 due by 10/09/2026.',
    'Questions: scholarships@example.edu or +91 98765 43210.',
    'Important: Late applications will be rejected.',
  ].join('\n') }], 'renewal-notice.jpg');

  assert.equal(analysis.documentTitle, 'Example University Scholarship Renewal');
  assert.equal(analysis.documentType, 'Funding notice');
  assert.equal(analysis.deadlines.some((item) => item.date === '2026-09-12'), true);
  assert.equal(analysis.payments[0]?.currency, 'INR');
  assert.equal(analysis.payments[0]?.amountText, 'Rs. 500');
  assert.equal(analysis.contacts[0]?.email, 'scholarships@example.edu');
  assert.equal(analysis.requirements.some((item) => item.required), true);
  assert.equal(analysis.warnings.length, 1);
  assert.equal(analysis.actions.every((item) => item.sourceText.length > 0 && item.pageNumber === 1), true);
  assert.equal(analysis.confidence, 'review_recommended');
});

test('returns a reviewable uncertain result when OCR finds no text', () => {
  const analysis = analyzeTextLocally([{ pageNumber: 1, text: '' }], 'blank-scan.png');
  assert.equal(analysis.documentTitle, 'blank scan');
  assert.equal(analysis.confidence, 'uncertain');
  assert.equal(analysis.actions.length, 0);
  assert.match(analysis.summary, /No readable text/);
});
