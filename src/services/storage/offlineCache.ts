import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { ZodType } from 'zod';

const memoryCache = new Map<string, string>();
const memoryPendingIngestions = new Map<string, PendingIngestion>();
let databasePromise: Promise<SQLiteDatabase> | undefined;

export type PendingIngestion = {
  id: string;
  userId: string;
  kind: 'file' | 'text';
  payload: string;
  name: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
};

async function database(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync('actionlens-offline.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS cache_entries (
          cache_key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending_ingestions (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('file', 'text')),
          payload TEXT NOT NULL,
          name TEXT,
          mime_type TEXT,
          size INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS pending_ingestions_user_time_idx
          ON pending_ingestions(user_id, created_at);
      `);
      return db;
    });
  }
  return databasePromise;
}

export async function putCached<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  if (Platform.OS === 'web') { memoryCache.set(key, serialized); return; }
  const db = await database();
  await db.runAsync('INSERT INTO cache_entries (cache_key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', key, serialized, new Date().toISOString());
}

export async function getCached<T>(key: string, schema: ZodType<T>): Promise<T | null> {
  const serialized = Platform.OS === 'web' ? memoryCache.get(key) ?? null : (await (await database()).getFirstAsync<{ value: string }>('SELECT value FROM cache_entries WHERE cache_key = ?', key))?.value ?? null;
  if (!serialized) return null;
  try { return schema.parse(JSON.parse(serialized) as unknown); } catch { return null; }
}

export async function clearUserCache(userId: string): Promise<void> {
  const prefix = `${userId}:%`;
  if (Platform.OS === 'web') {
    for (const key of memoryCache.keys()) if (key.startsWith(`${userId}:`)) memoryCache.delete(key);
    for (const [id, item] of memoryPendingIngestions) if (item.userId === userId) memoryPendingIngestions.delete(id);
    return;
  }
  const db = await database();
  const pendingFiles = await db.getAllAsync<{ payload: string }>("SELECT payload FROM pending_ingestions WHERE user_id = ? AND kind = 'file'", userId);
  for (const item of pendingFiles) {
    const file = new File(item.payload);
    if (file.exists) file.delete();
  }
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('DELETE FROM cache_entries WHERE cache_key LIKE ?', prefix);
    await transaction.runAsync('DELETE FROM pending_ingestions WHERE user_id = ?', userId);
  });
}

export async function addPendingIngestion(item: PendingIngestion): Promise<void> {
  if (Platform.OS === 'web') {
    memoryPendingIngestions.set(item.id, item);
    return;
  }
  await (await database()).runAsync(
    'INSERT INTO pending_ingestions (id, user_id, kind, payload, name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    item.id,
    item.userId,
    item.kind,
    item.payload,
    item.name,
    item.mimeType,
    item.size,
    item.createdAt,
  );
}

export async function listPendingIngestions(userId: string): Promise<PendingIngestion[]> {
  if (Platform.OS === 'web') {
    return [...memoryPendingIngestions.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  const rows = await (await database()).getAllAsync<{
    id: string;
    user_id: string;
    kind: 'file' | 'text';
    payload: string;
    name: string | null;
    mime_type: string | null;
    size: number | null;
    created_at: string;
  }>('SELECT id, user_id, kind, payload, name, mime_type, size, created_at FROM pending_ingestions WHERE user_id = ? ORDER BY created_at', userId);
  return rows.map((row) => ({ id: row.id, userId: row.user_id, kind: row.kind, payload: row.payload, name: row.name, mimeType: row.mime_type, size: row.size, createdAt: row.created_at }));
}

export async function removePendingIngestion(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryPendingIngestions.delete(id);
    return;
  }
  await (await database()).runAsync('DELETE FROM pending_ingestions WHERE id = ?', id);
}
