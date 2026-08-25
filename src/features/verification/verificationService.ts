import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type { Confidence, DocumentAnalysis } from '@/services/ai/analysisSchema';
import { scheduleDeadlineReminder } from '@/services/notifications/notificationService';
import { requireSupabaseClient } from '@/services/supabase/client';
import { normalizeVerifiedDate } from '@/utils/dateNormalization';
import { trackAnalyticsEvent } from '@/services/analytics/analyticsService';

const deadlinePayloadSchema = z.object({ label: z.string().min(1).max(240), date: z.string().nullable(), uncertain: z.boolean(), confidence: z.enum(['high', 'review_recommended', 'uncertain']), sourceText: z.string().max(4000), pageNumber: z.number().int().positive().nullable() });
const payloadSchema = z.object({
  title: z.string().min(1).max(240),
  summary: z.string().max(2000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  timezone: z.string().min(1),
  deadline: deadlinePayloadSchema,
  additionalDeadlines: z.array(deadlinePayloadSchema),
  requirements: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(1000), required: z.boolean(), dependsOnRequirementIndexes: z.array(z.number().int().nonnegative()), confidence: z.enum(['high', 'review_recommended', 'uncertain']), sourceText: z.string().max(4000), pageNumber: z.number().int().positive().nullable(), sortOrder: z.number().int() })),
  actions: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(1000), priority: z.enum(['low', 'normal', 'high', 'urgent']), dueDate: z.string().nullable(), dependsOnActionIndexes: z.array(z.number().int().nonnegative()), confidence: z.enum(['high', 'review_recommended', 'uncertain']), sourceText: z.string().max(4000), pageNumber: z.number().int().positive().nullable(), sortOrder: z.number().int() })),
});

export type VerificationPayload = z.infer<typeof payloadSchema>;

export function analysisToPayload(analysis: DocumentAnalysis, timezone: string): VerificationPayload {
  const deadlines = analysis.deadlines.map((deadline) => ({ label: deadline.label, date: deadline.date, uncertain: deadline.confidence === 'uncertain' || !deadline.date, confidence: deadline.confidence, sourceText: deadline.sourceText, pageNumber: deadline.pageNumber }));
  const primary = deadlines[0] ?? { label: 'Deadline to confirm', date: null, uncertain: true, confidence: 'uncertain' as Confidence, sourceText: '', pageNumber: null };
  return {
    title: analysis.documentTitle,
    summary: analysis.summary,
    priority: 'normal',
    timezone,
    deadline: primary,
    additionalDeadlines: deadlines.slice(1),
    requirements: analysis.requirements.map((item, index) => ({ title: item.title, description: item.description ?? '', required: item.required, dependsOnRequirementIndexes: item.dependsOnRequirementIndexes, confidence: item.confidence, sourceText: item.sourceText, pageNumber: item.pageNumber, sortOrder: index })),
    actions: analysis.actions.map((item, index) => ({ title: item.title, description: item.description ?? '', priority: item.priority, dueDate: item.suggestedDueDate, dependsOnActionIndexes: item.dependsOnActionIndexes, confidence: item.confidence, sourceText: item.sourceText, pageNumber: item.pageNumber, sortOrder: index })),
  };
}

export function useVerifyDocument(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, createReminder }: { payload: VerificationPayload; createReminder: boolean }) => {
      const parsed = payloadSchema.parse({ ...payload, deadline: { ...payload.deadline, date: normalizeVerifiedDate(payload.deadline.date, payload.timezone) }, additionalDeadlines: payload.additionalDeadlines.map((deadline) => ({ ...deadline, date: normalizeVerifiedDate(deadline.date, payload.timezone) })), actions: payload.actions.map((action) => ({ ...action, dueDate: normalizeVerifiedDate(action.dueDate, payload.timezone) })) });
      const { data, error } = await requireSupabaseClient().rpc('verify_document', { p_document_id: documentId, p_payload: parsed });
      if (error) throw error;
      const result = z.object({ obligationId: z.string().uuid(), verifiedAt: z.string() }).parse(data);
      let reminderWarning: string | null = null;
      if (createReminder && parsed.deadline.date) {
        try { const scheduleId = await scheduleDeadlineReminder({ userId, documentId, obligationId: result.obligationId, dueAt: parsed.deadline.date, title: parsed.title, timezone: parsed.timezone }); if (scheduleId) void trackAnalyticsEvent(userId, 'reminder_created', { channel: 'local' }); }
        catch { reminderWarning = 'Your plan is saved, but the reminder could not be scheduled. You can try again from the plan.'; }
      }
      void trackAnalyticsEvent(userId, 'verification_completed', { reminderRequested: createReminder });
      return { ...result, reminderWarning };
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['document', userId, documentId] }), queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }), queryClient.invalidateQueries({ queryKey: ['documents', userId] }), queryClient.invalidateQueries({ queryKey: ['timeline', userId] })]); },
  });
}
