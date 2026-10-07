import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Composition, CompositionSummary } from '@toposonics/types';
import { CompositionsProvider, useCompositions } from '../CompositionsProvider';
import { getCompositionDetailCacheKey, getCompositionListCacheKey } from '../compositionCache';

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

  it('FE-002: discards delayed cache hydration after switching accounts', async () => {
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

  it('FE-002: a prior-account delete cannot persist the next account library under the old key', async () => {
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
    expect(mocks.storage.removeItem).not.toHaveBeenCalled();
    expect(current.compositions.map((item) => item.id)).toEqual(['b-private']);
  });

  it('FE-002: detail reads cannot return prior-account data after the account changes', async () => {
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

  it('FE-002: discards a response from an earlier session after switching A to B to A', async () => {
    const oldRequest = deferred<CompositionSummary[]>();
    mocks.api.fetchAllCompositions.mockReturnValueOnce(oldRequest.promise);
    await mount();
    await switchAccount('qa-user-b');
    const fresh = composition('a-new-session');
    mocks.api.fetchAllCompositions.mockResolvedValueOnce([fresh]);
    await switchAccount('qa-user-a');
    mocks.storage.setItem.mockClear();
    await act(async () => { oldRequest.resolve([composition('a-old-session')]); });
    expect(current.compositions).toEqual([fresh]);
    expect(mocks.storage.setItem).not.toHaveBeenCalled();
  });

  it('FE-002: a stale detail failure does not start an old account cache read', async () => {
    const detail = deferred<Composition>();
    mocks.api.fetchComposition.mockReturnValueOnce(detail.promise);
    await mount();
    const load = current.loadComposition('a-private');
    await switchAccount('qa-user-b');
    await act(async () => { detail.reject(new Error('Offline fixture')); await load; });
    expect(mocks.storage.getItem).not.toHaveBeenCalled();
  });

  it('FE-002: ignores detail cache reads completed after account switch', async () => {
    const cacheRead = deferred<string>();
    mocks.api.fetchComposition.mockRejectedValueOnce(new Error('Offline fixture'));
    mocks.storage.getItem.mockReturnValueOnce(cacheRead.promise);
    await mount();
    let load!: Promise<Composition | null>;
    await act(async () => { load = current.loadComposition('a-private'); });
    expect(mocks.storage.getItem).toHaveBeenCalledWith(getCompositionDetailCacheKey('qa-user-a', 'a-private'));
    await switchAccount('qa-user-b');
    let received: Composition | null = null;
    await act(async () => { cacheRead.resolve(JSON.stringify(composition('a-private'))); received = await load; });
    expect(received).toBeNull();
    expect(current.compositionsById).toEqual({});
  });

  it('FE-002: rechecks the session after a detail cache write before returning data', async () => {
    const cacheWrite = deferred<void>();
    mocks.api.fetchComposition.mockResolvedValueOnce(composition('a-private'));
    await mount();
    mocks.storage.setItem.mockReturnValueOnce(cacheWrite.promise);
    let load!: Promise<Composition | null>;
    await act(async () => { load = current.loadComposition('a-private'); });
    await switchAccount('qa-user-b');
    let received: Composition | null = null;
    await act(async () => { cacheWrite.resolve(); received = await load; });
    expect(received).toBeNull();
    expect(current.compositionsById).toEqual({});
  });

  it('FE-002: a delayed save cannot return or cache a prior account composition', async () => {
    const creation = deferred<Composition>();
    mocks.api.createComposition.mockReturnValueOnce(creation.promise);
    await mount();
    const save = current.saveComposition(composition('a-created'));
    await switchAccount('qa-user-b');
    mocks.storage.setItem.mockClear();
    let received: Composition | null = null;
    await act(async () => { creation.resolve(composition('a-created')); received = await save; });
    expect(received).toBeNull();
    expect(current.compositionsById).toEqual({});
    expect(mocks.storage.setItem).not.toHaveBeenCalled();
  });

  it('FE-002: retained callbacks cannot start work using a previous session', async () => {
    await mount();
    const previous = current;
    await switchAccount('qa-user-b');
    mocks.api.fetchAllCompositions.mockClear();
    await act(async () => {
      await previous.refresh();
      await previous.loadComposition('a-private');
      await previous.saveComposition(composition('a-created'));
      await previous.removeComposition('a-private');
    });
    expect(mocks.api.fetchAllCompositions).not.toHaveBeenCalled();
    expect(mocks.api.fetchComposition).not.toHaveBeenCalled();
    expect(mocks.api.createComposition).not.toHaveBeenCalled();
    expect(mocks.api.deleteComposition).not.toHaveBeenCalled();
  });

  it('FE-002: signed-out deletion does not call the API or change caches', async () => {
    mocks.auth = { token: null, user: null };
    await mount();
    await act(async () => { await current.removeComposition('a-private'); });
    expect(mocks.api.deleteComposition).not.toHaveBeenCalled();
    expect(mocks.storage.setItem).not.toHaveBeenCalled();
    expect(mocks.storage.removeItem).not.toHaveBeenCalled();
  });

  it('FE-002: unmount invalidates outstanding detail reads', async () => {
    const detail = deferred<Composition>();
    mocks.api.fetchComposition.mockReturnValueOnce(detail.promise);
    await mount();
    const load = current.loadComposition('a-private');
    await act(async () => { renderer!.unmount(); });
    renderer = undefined;
    mocks.storage.setItem.mockClear();
    let received: Composition | null = null;
    await act(async () => { detail.resolve(composition('a-private')); received = await load; });
    expect(received).toBeNull();
    expect(mocks.storage.setItem).not.toHaveBeenCalled();
  });
});
