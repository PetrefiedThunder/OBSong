import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER = 'user-1';
const OTHER = 'user-2';
const UUID = '11111111-1111-4111-8111-111111111111';

// Mock the Supabase admin client with a chainable, awaitable query-builder so we can assert
// the tenant-scoping (.eq('user_id', ...)) and PostgREST error-code mapping in the service
// layer — which the route tests (which mock the whole service) cannot exercise.
vi.mock('../supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));

import {
  listCompositions,
  getCompositionById,
  updateComposition,
  deleteComposition,
} from '../services/compositions';
import { supabaseAdmin } from '../supabase';

const fromMock = vi.mocked(supabaseAdmin.from);

interface Builder {
  eqCalls: Array<[string, unknown]>;
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  [k: string]: unknown;
}

function makeBuilder(result: unknown): Builder {
  const eqCalls: Array<[string, unknown]> = [];
  const builder = { eqCalls } as Builder;
  for (const m of ['select', 'insert', 'update', 'delete', 'order', 'single', 'eq']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      if (m === 'eq') eqCalls.push([args[0] as string, args[1]]);
      return builder;
    });
  }
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function row(userId: string) {
  return {
    id: UUID,
    user_id: userId,
    name: 'My Comp',
    data: { title: 'My Comp', noteEvents: [], mappingMode: 'LINEAR_LANDSCAPE', key: 'C', scale: 'C_MAJOR' },
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (b: Builder) => b as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listCompositions fail-closed (#92)', () => {
  it('throws instead of querying when called without a userId', async () => {
    await expect(listCompositions('' as unknown as string)).rejects.toThrow(/userId/i);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('getCompositionById error-code mapping (#93)', () => {
  it('maps PGRST116 (no rows) to null', async () => {
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: null, error: { code: 'PGRST116' } })));
    expect(await getCompositionById(UUID)).toBeNull();
  });

  it('maps 22P02 (invalid uuid) to null instead of throwing', async () => {
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: null, error: { code: '22P02' } })));
    expect(await getCompositionById('not-a-uuid')).toBeNull();
  });

  it('rethrows an unexpected DB error', async () => {
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: null, error: { code: '08006', message: 'conn' } })));
    await expect(getCompositionById(UUID)).rejects.toBeTruthy();
  });
});

describe('updateComposition tenant scoping (#92)', () => {
  it('scopes the update by user_id and returns the updated row for the owner', async () => {
    const read = makeBuilder({ data: row(USER), error: null });
    const write = makeBuilder({ data: row(USER), error: null });
    fromMock.mockReturnValueOnce(asMock(read)).mockReturnValueOnce(asMock(write));

    const result = await updateComposition(UUID, USER, { title: 'new' });
    expect(result).not.toBeNull();
    expect(write.eqCalls).toContainEqual(['user_id', USER]);
  });

  it('returns null for a composition owned by another user and never writes', async () => {
    const read = makeBuilder({ data: row(OTHER), error: null });
    fromMock.mockReturnValueOnce(asMock(read));

    expect(await updateComposition(UUID, USER, { title: 'x' })).toBeNull();
    // Only the ownership read happened — no second (write) query.
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});

describe('deleteComposition tenant scoping (#92)', () => {
  it('scopes the delete by user_id and reports success when a row was removed', async () => {
    const del = makeBuilder({ data: [{ id: UUID }], error: null });
    fromMock.mockReturnValueOnce(asMock(del));

    expect(await deleteComposition(UUID, USER)).toBe(true);
    expect(del.eqCalls).toContainEqual(['user_id', USER]);
    expect(del.eqCalls).toContainEqual(['id', UUID]);
  });

  it('returns false when nothing matched (missing or not owned)', async () => {
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: [], error: null })));
    expect(await deleteComposition(UUID, USER)).toBe(false);
  });
});
