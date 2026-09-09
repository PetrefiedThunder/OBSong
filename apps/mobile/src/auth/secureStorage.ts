/**
 * Secure storage adapter for Supabase authentication
 * Uses expo-secure-store to encrypt and store sensitive data (JWTs)
 * on the device's secure keychain/keystore
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedStorage } from '@supabase/supabase-js';

const STORAGE_KEY_PREFIX = 'supabase.auth.';
const CHUNK_SUFFIX = '.chunk.';
const CHUNK_COUNT_SUFFIX = '.chunks';

// expo-secure-store 12.x (SDK 50) caps values at 2048 bytes, and some Android
// keystore implementations hard-fail above it. A Supabase session blob (access JWT +
// refresh token + serialized user) is routinely 3-5 KB, so values that exceed the limit
// are split across numbered SecureStore keys instead of being silently dropped/truncated.
const SECURE_STORE_VALUE_LIMIT = 2048;

interface ChunkedRef {
  chunks: number;
}

async function removeChunks(prefixedKey: string): Promise<void> {
  const countRaw = await AsyncStorage.getItem(prefixedKey + CHUNK_COUNT_SUFFIX);
  if (countRaw == null) return;

  const count = Number.parseInt(countRaw, 10);
  for (let i = 0; i < count; i++) {
    try {
      await SecureStore.deleteItemAsync(prefixedKey + CHUNK_SUFFIX + i);
    } catch {
      // best-effort cleanup
    }
  }
  await AsyncStorage.removeItem(prefixedKey + CHUNK_COUNT_SUFFIX);
}

export const secureStorage: SupportedStorage = {
  /**
   * Store a value securely in the device's encrypted storage
   */
  async setItem(key: string, value: string): Promise<void> {
    const prefixedKey = STORAGE_KEY_PREFIX + key;
    try {
      if (value.length <= SECURE_STORE_VALUE_LIMIT) {
        // Fits a single key: store directly and clear any stale chunks from a
        // previous oversized value so getItem doesn't reassemble them.
        await removeChunks(prefixedKey);
        await SecureStore.setItemAsync(prefixedKey, value);
        return;
      }

      const chunkCount = Math.ceil(value.length / SECURE_STORE_VALUE_LIMIT);
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.setItemAsync(
          prefixedKey + CHUNK_SUFFIX + i,
          value.slice(i * SECURE_STORE_VALUE_LIMIT, (i + 1) * SECURE_STORE_VALUE_LIMIT)
        );
      }

      // The ref goes through AsyncStorage because it is JSON (a SecureStore value is a
      // plain string, and parsing "null"/"{" is ambiguous with raw stored values).
      await AsyncStorage.setItem(
        prefixedKey + CHUNK_COUNT_SUFFIX,
        JSON.stringify({ chunks: chunkCount } satisfies ChunkedRef)
      );
      // Clear the single-key slot so an old small value can't shadow the chunks.
      await SecureStore.deleteItemAsync(prefixedKey);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
      throw error;
    }
  },

  /**
   * Retrieve a value from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    const prefixedKey = STORAGE_KEY_PREFIX + key;
    try {
      const refRaw = await AsyncStorage.getItem(prefixedKey + CHUNK_COUNT_SUFFIX);
      if (refRaw == null) {
        return await SecureStore.getItemAsync(prefixedKey);
      }

      const ref = JSON.parse(refRaw) as ChunkedRef;
      const parts: string[] = [];
      for (let i = 0; i < ref.chunks; i++) {
        const part = await SecureStore.getItemAsync(prefixedKey + CHUNK_SUFFIX + i);
        if (part == null) {
          // A chunk vanished (keystore reset, partial wipe) — the session is
          // unrecoverable; report null rather than a corrupt partial blob.
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   */
  async removeItem(key: string): Promise<void> {
    const prefixedKey = STORAGE_KEY_PREFIX + key;
    try {
      await removeChunks(prefixedKey);
      await SecureStore.deleteItemAsync(prefixedKey);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
      throw error;
    }
  },
};
