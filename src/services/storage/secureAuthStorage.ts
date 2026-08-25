import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 64;
const memoryStorage = new Map<string, string>();

type StorageMeta = { generation: string; chunks: number };

function metaKey(key: string) { return `${key}.meta`; }
function chunkKey(key: string, generation: string, index: number) { return `${key}.${generation}.${index}`; }

function parseMeta(value: string | null): StorageMeta | null {
  if (!value) return null;
  try {
    const candidate: unknown = JSON.parse(value);
    if (typeof candidate !== 'object' || candidate === null) return null;
    const generation = Reflect.get(candidate, 'generation');
    const chunks = Reflect.get(candidate, 'chunks');
    if (typeof generation !== 'string' || typeof chunks !== 'number' || chunks < 1 || chunks > MAX_CHUNKS) return null;
    return { generation, chunks };
  } catch {
    return null;
  }
}

async function removeGeneration(key: string, meta: StorageMeta | null) {
  if (!meta) return;
  await Promise.all(Array.from({ length: meta.chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, meta.generation, index))));
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return memoryStorage.get(key) ?? null;
    const meta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
    if (!meta) return SecureStore.getItemAsync(key);
    const chunks = await Promise.all(Array.from({ length: meta.chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(key, meta.generation, index))));
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryStorage.set(key, value);
      return;
    }
    const previousMeta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
    const generation = Crypto.randomUUID().replaceAll('-', '');
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) || 1 }, (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    if (chunks.length > MAX_CHUNKS) throw new Error('The secure session is unexpectedly large. Please sign in again.');
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, generation, index), chunk)));
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ generation, chunks: chunks.length } satisfies StorageMeta));
    await SecureStore.deleteItemAsync(key);
    await removeGeneration(key, previousMeta);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryStorage.delete(key);
      return;
    }
    const meta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
    await SecureStore.deleteItemAsync(metaKey(key));
    await SecureStore.deleteItemAsync(key);
    await removeGeneration(key, meta);
  },
};
