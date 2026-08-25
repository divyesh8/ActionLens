import assert from 'node:assert/strict';
import test from 'node:test';

import { documentAnalysisSchema } from './analysisSchema.ts';

const validAnalysis = {
  documentTitle: 'Example scholarship renewal',
  documentType: 'Scholarship notice',
  organization: 'Example University',
  summary: 'Renewal applications close in September.',
  language: 'en',
  deadlines: [{ label: 'Renewal deadline', date: '2026-09-12', dateText: '12 September 2026', conflictGroup: null, confidence: 'high', sourceText: 'Submit by 12 September 2026.', pageNumber: 1 }],
  actions: [],
  requirements: [{ title: 'Bonafide certificate', description: null, required: true, dependsOnRequirementIndexes: [], confidence: 'review_recommended', sourceText: 'Attach a bonafide certificate.', pageNumber: 1 }],
  payments: [],
  contacts: [],
  locations: [],
  eligibility: [],
  links: [],
  warnings: [],
  confidence: 'review_recommended',
};

test('accepts bounded analysis with evidence for every finding', () => {
  assert.equal(documentAnalysisSchema.parse(validAnalysis).deadlines[0]?.label, 'Renewal deadline');
});

test('rejects an important finding without source evidence', () => {
  const invalid = structuredClone(validAnalysis);
  invalid.deadlines[0]!.sourceText = '';
  assert.equal(documentAnalysisSchema.safeParse(invalid).success, false);
});

test('rejects fake numeric confidence', () => {
  assert.equal(documentAnalysisSchema.safeParse({ ...validAnalysis, confidence: 0.9237 }).success, false);
});
