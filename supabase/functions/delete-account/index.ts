import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Account deletion is not configured.' }, 503);
    if (!authorization) return jsonResponse({ error: 'Authentication required.' }, 401);
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Invalid session.' }, 401);
    const userId = authData.user.id;
    const { data: documents, error: documentsError } = await admin.from('documents').select('storage_path, preview_path').eq('user_id', userId);
    if (documentsError) throw documentsError;
    const paths = (documents ?? []).flatMap((document) => [document.storage_path, document.preview_path]).filter((value): value is string => typeof value === 'string' && value.startsWith(`${userId}/`));
    for (let index = 0; index < paths.length; index += 100) {
      const { error: storageError } = await admin.storage.from('documents').remove(paths.slice(index, index + 100));
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('delete-account failed', { errorName: error instanceof Error ? error.name : 'unknown' });
    return jsonResponse({ error: 'Your account could not be deleted. No partial success is being reported. Try again.' }, 500);
  }
});
