import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { cancelDocumentReminders } from '@/services/notifications/notificationService';
import { requireSupabaseClient } from '@/services/supabase/client';

const tagSchema = z.object({ id: z.string().uuid(), name: z.string(), color: z.string().nullable() });
const tagListSchema = z.array(tagSchema);

export async function renameDocument(userId: string, documentId: string, title: string) {
  const normalized = title.trim();
  if (!normalized || normalized.length > 240) throw new Error('Use a title between 1 and 240 characters.');
  const { error } = await requireSupabaseClient().from('documents').update({ title: normalized }).eq('id', documentId).eq('user_id', userId);
  if (error) throw error;
}

export async function archiveDocument(userId: string, documentId: string) {
  const now = new Date().toISOString();
  const { error } = await requireSupabaseClient().from('documents').update({ status: 'archived', archived_at: now }).eq('id', documentId).eq('user_id', userId);
  if (error) throw error;
  await cancelDocumentReminders(userId, documentId);
}

export async function permanentlyDeleteDocument(userId: string, documentId: string) {
  await cancelDocumentReminders(userId, documentId);
  const { error } = await requireSupabaseClient().functions.invoke('delete-document', { body: { documentId } });
  if (error) throw error;
}

export function useDocumentTags(userId: string, documentId: string) {
  return useQuery({
    queryKey: ['document-tags', userId, documentId],
    queryFn: async () => {
      const supabase = requireSupabaseClient();
      const { data: links, error: linksError } = await supabase.from('document_tags').select('tag_id').eq('user_id', userId).eq('document_id', documentId);
      if (linksError) throw linksError;
      const tagIds = (links ?? []).map((link) => link.tag_id).filter((id): id is string => typeof id === 'string');
      if (tagIds.length === 0) return [];
      const { data, error } = await supabase.from('tags').select('id, name, color').eq('user_id', userId).in('id', tagIds).order('name');
      if (error) throw error;
      return tagListSchema.parse(data);
    },
  });
}

export function useAddDocumentTag(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: string) => {
      const name = value.trim();
      if (!name || name.length > 40) throw new Error('Use a tag between 1 and 40 characters.');
      const supabase = requireSupabaseClient();
      const { data, error } = await supabase.from('tags').upsert({ user_id: userId, name }, { onConflict: 'user_id,name' }).select('id, name, color').single();
      if (error) throw error;
      const tag = tagSchema.parse(data);
      const { error: linkError } = await supabase.from('document_tags').upsert({ user_id: userId, document_id: documentId, tag_id: tag.id }, { onConflict: 'document_id,tag_id' });
      if (linkError) throw linkError;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['document-tags', userId, documentId] }); },
  });
}

export function useRemoveDocumentTag(userId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await requireSupabaseClient().from('document_tags').delete().eq('user_id', userId).eq('document_id', documentId).eq('tag_id', tagId);
      if (error) throw error;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['document-tags', userId, documentId] }); },
  });
}
