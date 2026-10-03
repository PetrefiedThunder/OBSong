import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secureStorage } from '../secureStorage';

// Synthetic noncredential strings only. Never load the device keychain or AsyncStorage.
const stores = vi.hoisted(() => ({ secure: new Map<string, string>(), refs: new Map<string, string>() }));
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(async (key: string, value: string) => { stores.secure.set(key, value); }),
  getItemAsync: vi.fn(async (key: string) => stores.secure.get(key) ?? null),
  deleteItemAsync: vi.fn(async (key: string) => { stores.secure.delete(key); }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(async (key: string, value: string) => { stores.refs.set(key, value); }),
    getItem: vi.fn(async (key: string) => stores.refs.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => { stores.refs.delete(key); }),
  },
}));

beforeEach(() => { stores.secure.clear(); stores.refs.clear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('QA encrypted session storage lifecycle', () => {
  it.each([1, 2048, 2049, 5000])('round-trips a synthetic %i-character value', async (length) => {
    const value = 'x'.repeat(length);
    await secureStorage.setItem('qa-fixture', value);
    expect(await secureStorage.getItem('qa-fixture')).toBe(value);
    // The public reference store must never hold any segment of the value.
    for (const reference of stores.refs.values()) {
      expect(JSON.parse(reference)).toEqual({ chunks: Math.ceil(length / 2048) });
    }
  });

  it('returns null if an encrypted chunk is missing', async () => {
    await secureStorage.setItem('qa-fixture', 'x'.repeat(5000));
    stores.secure.delete('supabase.auth.qa-fixture.chunk.1');
    expect(await secureStorage.getItem('qa-fixture')).toBeNull();
  });

  it('removes a short unchunked value', async () => {
    await secureStorage.setItem('qa-fixture', 'synthetic');
    await secureStorage.removeItem('qa-fixture');
    expect(stores.secure.size).toBe(0);
    expect(await secureStorage.getItem('qa-fixture')).toBeNull();
  });

  it.fails('FE-003: sign-out removes every encrypted chunk of a long session', async () => {
    await secureStorage.setItem('qa-fixture', 'x'.repeat(5000));
    expect(stores.secure.size).toBe(3);
    await secureStorage.removeItem('qa-fixture');
    expect(stores.secure.size).toBe(0);
  });

  it.fails('FE-003: overwriting a long session with a short one removes its old chunks', async () => {
    await secureStorage.setItem('qa-fixture', 'x'.repeat(5000));
    await secureStorage.setItem('qa-fixture', 'replacement');
    expect(await secureStorage.getItem('qa-fixture')).toBe('replacement');
    expect([...stores.secure.keys()]).toEqual(['supabase.auth.qa-fixture']);
  });
});
