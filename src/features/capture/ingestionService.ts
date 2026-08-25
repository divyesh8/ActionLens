import { Directory, File, Paths, UploadType } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { requireSupabaseClient } from '@/services/supabase/client';
import { processAndPersistLocally, safeLocalProcessingMessage } from '@/services/ai/localProcessingService';
import { addPendingIngestion, listPendingIngestions, removePendingIngestion, type PendingIngestion } from '@/services/storage/offlineCache';
import type { ImportSource } from './captureService';

export type IngestionStage = 'preparing' | 'checking_duplicate' | 'uploading' | 'queueing' | 'reading_locally' | 'analyzing_locally' | 'saving_results' | 'waiting_connection';
type StageListener = (stage: IngestionStage) => void;

export class DuplicateDocumentError extends Error {
  constructor(readonly documentId: string) { super('This document is already in your vault.'); }
}

export class IngestionCancelledError extends Error {}
export class WaitingForConnectionError extends Error {}

type IngestionInput =
  | { kind: 'file'; source: ImportSource }
  | { kind: 'text'; text: string; name?: string };

export type IngestionResult =
  | { status: 'processing'; documentId: string }
  | { status: 'waiting_connection'; queueId: string };

const activeFlushes = new Map<string, Promise<number>>();

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new IngestionCancelledError('Import cancelled.');
}

function bytesToHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function titleFromName(name: string): string {
  const title = name.replace(/\.[^.]+$/, '').replaceAll(/[_-]+/g, ' ').trim();
  return title.slice(0, 240) || 'Untitled document';
}

async function readInput(input: IngestionInput): Promise<{ bytes: ArrayBuffer; name: string; mimeType: string; title: string; fileUri: string | null }> {
  if (input.kind === 'text') {
    const name = input.name ?? `pasted-text-${new Date().toISOString().slice(0, 10)}.txt`;
    return { bytes: new TextEncoder().encode(input.text).buffer, name, mimeType: 'text/plain', title: 'Pasted text', fileUri: null };
  }
  if (Platform.OS === 'web') {
    const bytes = input.source.webFile
      ? await input.source.webFile.arrayBuffer()
      : await (await fetch(input.source.uri)).arrayBuffer();
    return { bytes, name: input.source.name, mimeType: input.source.mimeType, title: titleFromName(input.source.name), fileUri: input.source.uri };
  }
  const file = new File(input.source.uri);
  return { bytes: await file.arrayBuffer(), name: input.source.name, mimeType: input.source.mimeType, title: titleFromName(input.source.name), fileUri: input.source.uri };
}

async function hasConnection(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

async function queueInput(userId: string, input: IngestionInput): Promise<string> {
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  if (input.kind === 'text') {
    await addPendingIngestion({ id, userId, kind: 'text', payload: input.text, name: input.name ?? null, mimeType: 'text/plain', size: new TextEncoder().encode(input.text).byteLength, createdAt });
    return id;
  }

  let uri = input.source.uri;
  if (Platform.OS !== 'web') {
    const directory = new Directory(Paths.document, 'pending-imports');
    if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
    const extension = input.source.name.toLowerCase().match(/\.[a-z0-9]{1,5}$/)?.[0] ?? '.bin';
    const destination = new File(directory, `${id}${extension}`);
    await new File(input.source.uri).copy(destination, { overwrite: true });
    uri = destination.uri;
  }
  await addPendingIngestion({ id, userId, kind: 'file', payload: uri, name: input.source.name, mimeType: input.source.mimeType, size: input.source.size, createdAt });
  return id;
}

function pendingToInput(item: PendingIngestion): IngestionInput {
  if (item.kind === 'text') return { kind: 'text', text: item.payload, ...(item.name ? { name: item.name } : {}) };
  if (!item.name || !item.mimeType || item.size === null) throw new Error('Queued file metadata is incomplete.');
  return { kind: 'file', source: { uri: item.payload, name: item.name, mimeType: item.mimeType, size: item.size, origin: 'file' } };
}

async function discardPending(item: PendingIngestion) {
  await removePendingIngestion(item.id);
  if (item.kind === 'file' && Platform.OS !== 'web') {
    const file = new File(item.payload);
    if (file.exists) file.delete();
  }
}

export async function ingestDocument(options: { userId: string; input: IngestionInput; onStage?: StageListener; onUploadProgress?: (fraction: number) => void; signal?: AbortSignal; allowOfflineQueue?: boolean }): Promise<IngestionResult> {
  const { userId, input, onStage, signal } = options;
  const supabase = requireSupabaseClient();
  let documentId: string | undefined;
  let storagePath: string | undefined;
  let temporaryUploadFile: File | undefined;
  let localProcessingStarted = false;
  onStage?.('preparing');
  throwIfCancelled(signal);
  if (!(await hasConnection())) {
    if (options.allowOfflineQueue === false) throw new WaitingForConnectionError('Waiting for connection.');
    onStage?.('waiting_connection');
    return { status: 'waiting_connection', queueId: await queueInput(userId, input) };
  }
  const source = await readInput(input);
  const digest = bytesToHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, source.bytes));
  onStage?.('checking_duplicate');
  const { data: duplicate, error: duplicateError } = await supabase.from('documents').select('id').eq('user_id', userId).eq('content_hash', digest).is('archived_at', null).maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate && typeof duplicate.id === 'string') throw new DuplicateDocumentError(duplicate.id);
  throwIfCancelled(signal);

  documentId = Crypto.randomUUID();
  const clientId = Crypto.randomUUID();
  const safeExtension = source.name.toLowerCase().match(/\.[a-z0-9]{1,5}$/)?.[0] ?? (source.mimeType === 'application/pdf' ? '.pdf' : source.mimeType === 'text/plain' ? '.txt' : '.jpg');
  storagePath = `${userId}/${documentId}/original${safeExtension}`;
  const { error: createError } = await supabase.from('documents').insert({
    id: documentId,
    user_id: userId,
    client_id: clientId,
    title: source.title,
    storage_path: storagePath,
    original_filename: source.name,
    mime_type: source.mimeType,
    byte_size: source.bytes.byteLength,
    content_hash: digest,
    status: 'uploading',
  });
  if (createError) throw createError;

  try {
    onStage?.('uploading');
    throwIfCancelled(signal);
    if (Platform.OS === 'web') {
      const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, source.bytes, { contentType: source.mimeType, upsert: false, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      options.onUploadProgress?.(1);
    } else {
      const { data: signedUpload, error: signedUploadError } = await supabase.storage.from('documents').createSignedUploadUrl(storagePath, { upsert: false });
      if (signedUploadError) throw signedUploadError;
      let uploadFile = source.fileUri ? new File(source.fileUri) : null;
      if (!uploadFile) {
        temporaryUploadFile = new File(Paths.cache, `actionlens-upload-${documentId}.txt`);
        temporaryUploadFile.create({ overwrite: true, intermediates: true });
        temporaryUploadFile.write(new Uint8Array(source.bytes));
        uploadFile = temporaryUploadFile;
      }
      const task = uploadFile.createUploadTask(signedUpload.signedUrl, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        mimeType: source.mimeType,
        headers: { 'content-type': source.mimeType, 'cache-control': 'max-age=3600', 'x-upsert': 'false' },
        ...(signal ? { signal } : {}),
        onProgress: ({ bytesSent, totalBytes }) => { if (totalBytes > 0) options.onUploadProgress?.(Math.min(1, bytesSent / totalBytes)); },
      });
      const result = await task.uploadAsync();
      if (result.status < 200 || result.status >= 300) throw new Error('Secure upload failed.');
    }
    throwIfCancelled(signal);
    await supabase.from('documents').update({ status: 'uploaded' }).eq('id', documentId).eq('user_id', userId);

    onStage?.('queueing');
    const jobId = Crypto.randomUUID();
    const { error: jobError } = await supabase.from('processing_jobs').insert({ id: jobId, user_id: userId, document_id: documentId, idempotency_key: clientId, stage: 'queued' });
    if (jobError) throw jobError;
    const { error: queuedError } = await supabase.from('documents').update({ status: 'queued', status_message: null }).eq('id', documentId).eq('user_id', userId);
    if (queuedError) throw queuedError;
    throwIfCancelled(signal);

    localProcessingStarted = true;
    onStage?.('reading_locally');
    await processAndPersistLocally({
      userId,
      documentId,
      jobId,
      bytes: source.bytes,
      fileName: source.name,
      mimeType: source.mimeType,
      ...(signal ? { signal } : {}),
      onProgress: (processingStage, fraction) => {
        if (processingStage === 'reading') onStage?.('reading_locally');
        else onStage?.(fraction >= 1 ? 'saving_results' : 'analyzing_locally');
      },
    });
    return { status: 'processing', documentId };
  } catch (error) {
    if (signal?.aborted && !(error instanceof IngestionCancelledError)) error = new IngestionCancelledError('Import cancelled.');
    if (error instanceof IngestionCancelledError && documentId && storagePath) {
      await supabase.storage.from('documents').remove([storagePath]);
      await supabase.from('documents').delete().eq('id', documentId).eq('user_id', userId);
    } else if (documentId) {
      const statusMessage = localProcessingStarted ? safeLocalProcessingMessage(error) : 'Import did not finish. Try again.';
      await supabase.from('documents').update({ status: 'failed', status_message: statusMessage }).eq('id', documentId).eq('user_id', userId);
    }
    throw error;
  } finally {
    if (temporaryUploadFile?.exists) temporaryUploadFile.delete();
  }
}

export function flushPendingIngestions(userId: string): Promise<number> {
  const existing = activeFlushes.get(userId);
  if (existing) return existing;
  const flush = (async () => {
    if (!(await hasConnection())) return 0;
    let completed = 0;
    for (const item of await listPendingIngestions(userId)) {
      try {
        if (item.kind === 'file' && Platform.OS !== 'web' && !new File(item.payload).exists) {
          await discardPending(item);
          continue;
        }
        await ingestDocument({ userId, input: pendingToInput(item), allowOfflineQueue: false });
        await discardPending(item);
        completed++;
      } catch (error) {
        if (error instanceof DuplicateDocumentError) {
          await discardPending(item);
          completed++;
          continue;
        }
        break;
      }
    }
    return completed;
  })().finally(() => activeFlushes.delete(userId));
  activeFlushes.set(userId, flush);
  return flush;
}
