import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { z } from 'npm:zod@4.4.3';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const requestSchema = z.object({ documentId: z.string().uuid() });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Deletion is not configured.' }, 503);
    if (!authorization) return jsonResponse({ error: 'Authentication required.' }, 401);
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Invalid session.' }, 401);
    const { documentId } = requestSchema.parse(await request.json());
    const { data: document, error } = await admin.from('documents').select('id, storage_path, preview_path').eq('id', documentId).eq('user_id', authData.user.id).single();
    if (error || !document) return jsonResponse({ error: 'Document not found.' }, 404);
    const paths = [document.storage_path, document.preview_path].filter((value): value is string => typeof value === 'string' && value.startsWith(`${authData.user.id}/`));
    if (paths.length > 0) {
      const { error: storageError } = await admin.storage.from('documents').remove(paths);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await admin.from('documents').delete().eq('id', documentId).eq('user_id', authData.user.id);
    if (deleteError) throw deleteError;
    return jsonResponse({ deleted: true, documentId });
  } catch (error) {
    console.error('delete-document failed', { errorName: error instanceof Error ? error.name : 'unknown' });
    return jsonResponse({ error: 'The document could not be permanently deleted. Try again.' }, error instanceof z.ZodError ? 400 : 500);
  }
});
