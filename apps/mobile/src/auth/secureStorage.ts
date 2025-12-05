/**
 * Secure storage adapter for Supabase authentication
 * Uses expo-secure-store to encrypt and store sensitive data (JWTs)
 * on the device's secure keychain/keystore
 */
import * as SecureStore from 'expo-secure-store';
import { SupportedStorage } from '@supabase/supabase-js';

const STORAGE_KEY_PREFIX = 'supabase.auth.';

export const secureStorage: SupportedStorage = {
  /**
   * Store a value securely in the device's encrypted storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_PREFIX + key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
      throw error;
    }
  },

  /**
   * Retrieve a value from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await SecureStore.getItemAsync(STORAGE_KEY_PREFIX + key);
      return result;
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY_PREFIX + key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
      throw error;
    }
  },
};
