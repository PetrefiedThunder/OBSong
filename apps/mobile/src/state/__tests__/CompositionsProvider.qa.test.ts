import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Composition, CompositionSummary } from '@toposonics/types';
import { CompositionsProvider, useCompositions } from '../CompositionsProvider';
import { getCompositionListCacheKey } from '../compositionCache';

const mocks = vi.hoisted(() => ({
  auth: { token: 'qa-session-a', user: { id: 'qa-user-a' } } as {
    token: string | null; user: { id: string } | null;
  },
  storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  api: {
    fetchComposition: vi.fn(), fetchAllCompositions: vi.fn(),
    createComposition: vi.fn(), deleteComposition: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks.storage }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../services/apiClient', () => mocks.api);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function composition(id: string, userId = 'qa-user-a'): Composition {
  return {
    id, userId, title: id, mappingMode: 'LINEAR_LANDSCAPE', key: 'C', scale: 'C_MAJOR',
    createdAt: new Date('2026-10-02T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
    noteEvents: [],
  };
}

let renderer: ReactTestRenderer | undefined;
let current: ReturnType<typeof useCompositions>;
function Probe() { current = useCompositions(); return null; }
const tree = () => React.createElement(CompositionsProvider, null, React.createElement(Probe));

async function mount() {
  await act(async () => { renderer = create(tree()); });
}

async function switchAccount(userId: string | null) {
  mocks.auth = { user: userId ? { id: userId } : null, token: userId ? 'qa-session-b' : null };
  await act(async () => { renderer!.update(tree()); });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  mocks.auth = { token: 'qa-session-a', user: { id: 'qa-user-a' } };
  mocks.storage.getItem.mockResolvedValue(null);
  mocks.storage.setItem.mockResolvedValue(undefined);
  mocks.storage.removeItem.mockResolvedValue(undefined);
  mocks.api.fetchAllCompositions.mockResolvedValue([]);
  // Expected network failures are exercised without printing payloads or user information.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); });
  renderer = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('QA private mobile library state', () => {
  it('does not fetch or hydrate cache while signed out', async () => {
    mocks.auth = { token: null, user: null };
    await mount();
    expect(current.compositions).toEqual([]);
    expect(current.loading).toBe(false);
    expect(mocks.api.fetchAllCompositions).not.toHaveBeenCalled();
    expect(mocks.storage.getItem).not.toHaveBeenCalled();
  });

  it('discards a delayed successful list response after account switch', async () => {
    const oldRequest = deferred<CompositionSummary[]>();
    mocks.api.fetchAllCompositions.mockReturnValueOnce(oldRequest.promise);
    await mount();
    const other = composition('b-private', 'qa-user-b');
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([other]);
    await switchAccount('qa-user-b');
    await act(async () => { oldRequest.resolve([composition('a-private')]); });
    expect(current.compositions).toEqual([other]);
  });

  it('loads only the active user cache during an ordinary offline refresh', async () => {
    const item = composition('a-offline');
    mocks.api.fetchAllCompositions.mockRejectedValueOnce(new Error('Offline fixture'));
    mocks.storage.getItem.mockResolvedValueOnce(JSON.stringify({ items: [item] }));
    await mount();
    expect(mocks.storage.getItem).toHaveBeenCalledExactlyOnceWith(getCompositionListCacheKey('qa-user-a'));
    expect(current.compositions[0].id).toBe('a-offline');
    expect(current.usingCache).toBe(true);
  });

  it('retains both saves that complete before React commits their state updates', async () => {
    await mount();
    mocks.api.createComposition
      .mockResolvedValueOnce(composition('first'))
      .mockResolvedValueOnce(composition('second'));
    await act(async () => {
      await Promise.all([
        current.saveComposition(composition('first')),
        current.saveComposition(composition('second')),
      ]);
    });
    expect(current.compositions.map((item) => item.id)).toEqual(['second', 'first']);
    const listWrites = mocks.storage.setItem.mock.calls.filter(
      ([key]) => key === getCompositionListCacheKey('qa-user-a')
    );
    const persisted = JSON.parse(listWrites.at(-1)![1]);
    expect(persisted.items.map((item: CompositionSummary) => item.id)).toEqual(['second', 'first']);
    expect(persisted.items[0]).not.toHaveProperty('noteEvents');
  });

  it('evicts a deleted composition from state and both cache surfaces', async () => {
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([composition('deleted')]);
    mocks.api.deleteComposition.mockResolvedValueOnce(undefined);
    await mount();
    await act(async () => { await current.removeComposition('deleted'); });
    expect(current.compositions).toEqual([]);
    expect(mocks.storage.removeItem).toHaveBeenCalledExactlyOnceWith(
      '@toposonics:compositions:qa-user-a:deleted'
    );
    const lastList = mocks.storage.setItem.mock.calls.at(-1)!;
    expect(JSON.parse(lastList[1]).items).toEqual([]);
  });

  it.fails('FE-002: discards delayed cache hydration after switching accounts', async () => {
    const oldCacheRead = deferred<string>();
    mocks.api.fetchAllCompositions.mockRejectedValueOnce(new Error('Offline fixture'));
    mocks.storage.getItem.mockReturnValueOnce(oldCacheRead.promise);
    await mount();
    expect(mocks.storage.getItem).toHaveBeenCalledWith(getCompositionListCacheKey('qa-user-a'));
    const other = composition('b-private', 'qa-user-b');
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([other]);
    await switchAccount('qa-user-b');
    await act(async () => {
      oldCacheRead.resolve(JSON.stringify({ items: [composition('a-private')] }));
    });
    expect(current.compositions).toEqual([other]);
  });

  it.fails('FE-002: a prior-account delete cannot persist the next account library under the old key', async () => {
    const deletion = deferred<void>();
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([composition('a-private')]);
    mocks.api.deleteComposition.mockReturnValueOnce(deletion.promise);
    await mount();
    const remove = current.removeComposition('a-private');
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([composition('b-private', 'qa-user-b')]);
    await switchAccount('qa-user-b');
    mocks.storage.setItem.mockClear();
    await act(async () => { deletion.resolve(); await remove; });
    const writesToOldAccount = mocks.storage.setItem.mock.calls.filter(
      ([key]) => key === getCompositionListCacheKey('qa-user-a')
    );
    expect(writesToOldAccount).toEqual([]);
  });

  it.fails('FE-002: detail reads cannot return prior-account data after the account changes', async () => {
    const detail = deferred<Composition>();
    mocks.api.fetchComposition.mockReturnValueOnce(detail.promise);
    await mount();
    const load = current.loadComposition('a-private');
    await switchAccount('qa-user-b');
    let received: Composition | null = null;
    await act(async () => { detail.resolve(composition('a-private')); received = await load; });
    // CompositionDetailScreen consumes this returned value directly into screen state.
    expect(received).toBeNull();
    expect(current.compositionsById).toEqual({});
  });
});
