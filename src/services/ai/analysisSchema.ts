import { z } from 'zod';

export const confidenceSchema = z.enum(['high', 'review_recommended', 'uncertain']);
const evidenceFields = { confidence: confidenceSchema, sourceText: z.string().min(1).max(4000), pageNumber: z.number().int().positive().nullable() };

export const documentAnalysisSchema = z.object({
  documentTitle: z.string().min(1).max(240),
  documentType: z.string().max(100).nullable(),
  organization: z.string().max(240).nullable(),
  summary: z.string().min(1).max(2000),
  language: z.string().min(2).max(40),
  deadlines: z.array(z.object({ label: z.string().min(1).max(240), date: z.string().max(40).nullable(), dateText: z.string().min(1).max(240), conflictGroup: z.string().max(80).nullable(), ...evidenceFields })).max(30),
  actions: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(1000).nullable(), priority: z.enum(['low', 'normal', 'high', 'urgent']), suggestedDueDate: z.string().max(40).nullable(), dependsOnActionIndexes: z.array(z.number().int().nonnegative()).max(20), ...evidenceFields })).max(50),
  requirements: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(1000).nullable(), required: z.boolean(), dependsOnRequirementIndexes: z.array(z.number().int().nonnegative()).max(20), ...evidenceFields })).max(50),
  payments: z.array(z.object({ label: z.string().min(1).max(240), amountText: z.string().min(1).max(120), currency: z.string().max(12).nullable(), dueDate: z.string().max(40).nullable(), ...evidenceFields })).max(20),
  contacts: z.array(z.object({ name: z.string().max(240).nullable(), role: z.string().max(240).nullable(), email: z.string().max(320).nullable(), phone: z.string().max(80).nullable(), ...evidenceFields })).max(30),
  locations: z.array(z.object({ label: z.string().min(1).max(240), addressText: z.string().min(1).max(1000), ...evidenceFields })).max(30),
  eligibility: z.array(z.object({ label: z.string().min(1).max(240), description: z.string().min(1).max(1000), status: z.enum(['met', 'not_met', 'unknown']), ...evidenceFields })).max(50),
  links: z.array(z.object({ label: z.string().min(1).max(240), url: z.string().max(2000), ...evidenceFields })).max(30),
  warnings: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().min(1).max(1000), ...evidenceFields })).max(30),
  confidence: confidenceSchema,
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
