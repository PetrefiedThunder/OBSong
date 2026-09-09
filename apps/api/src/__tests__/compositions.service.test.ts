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
  selectCalls: string[];
  rangeCalls: Array<[number, number]>;
  orderCalls: Array<[string, unknown]>;
  orCalls: string[];
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  [k: string]: unknown;
}

function makeBuilder(result: unknown): Builder {
  const eqCalls: Array<[string, unknown]> = [];
  const selectCalls: string[] = [];
  const rangeCalls: Array<[number, number]> = [];
  const orderCalls: Array<[string, unknown]> = [];
  const orCalls: string[] = [];
  const builder = { eqCalls, selectCalls, rangeCalls, orderCalls, orCalls } as Builder;
  for (const m of ['select', 'insert', 'update', 'delete', 'order', 'single', 'eq', 'range', 'or']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      if (m === 'eq') eqCalls.push([args[0] as string, args[1]]);
      if (m === 'select') selectCalls.push(args[0] as string);
      if (m === 'range') rangeCalls.push([args[0] as number, args[1] as number]);
      if (m === 'order') orderCalls.push([args[0] as string, args[1]]);
      if (m === 'or') orCalls.push(args[0] as string);
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

describe('listCompositions summary projection + pagination (audit)', () => {
  // Shape of a row returned by the summary select(): scalars projected out of the `data`
  // JSONB column — no noteEvents/imageData blobs.
  function summaryRow(userId: string) {
    return {
      id: UUID,
      user_id: userId,
      name: 'My Comp',
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2020-01-01T00:00:00Z',
      title: 'My Comp',
      description: null,
      mappingMode: 'LINEAR_LANDSCAPE',
      key: 'C',
      scale: 'C_MAJOR',
      presetId: null,
      tempo: '120',
      imageThumbnail: null,
      metadata: { noteCount: 3 },
    };
  }

  it('selects a JSON projection (never the full blob) scoped to the user', async () => {
    const list = makeBuilder({ data: [summaryRow(USER)], error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    const { compositions } = await listCompositions(USER);
    const [result] = compositions;
    expect(list.selectCalls[0]).not.toContain('*');
    expect(list.selectCalls[0]).toContain('title:data->>title');
    expect(list.selectCalls[0]).not.toContain('noteEvents');
    expect(list.selectCalls[0]).not.toContain('imageData');
    expect(list.eqCalls).toContainEqual(['user_id', USER]);
    expect(result).not.toHaveProperty('noteEvents');
    expect(result).not.toHaveProperty('imageData');
  });

  it('maps a row to a summary, deriving noteCount and coercing tempo to a number', async () => {
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: [summaryRow(USER)], error: null })));

    const { compositions } = await listCompositions(USER);
    const [result] = compositions;
    expect(result).toMatchObject({
      id: UUID,
      userId: USER,
      title: 'My Comp',
      noteCount: 3,
      tempo: 120,
    });
  });

  it('leaves noteCount undefined for legacy rows without metadata', async () => {
    const legacy = { ...summaryRow(USER), metadata: null, tempo: null };
    fromMock.mockReturnValueOnce(asMock(makeBuilder({ data: [legacy], error: null })));

    const { compositions } = await listCompositions(USER);
    const [result] = compositions;
    expect(result.noteCount).toBeUndefined();
    expect(result.tempo).toBeUndefined();
  });

  it('orders by the stable (created_at DESC, id DESC) tuple', async () => {
    const list = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    await listCompositions(USER);
    expect(list.orderCalls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });

  it('fetches limit+1 rows in the default window (range(0, 50)) to detect a next page', async () => {
    const list = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    await listCompositions(USER);
    expect(list.rangeCalls).toEqual([[0, 50]]);
  });

  it('applies a custom limit/offset window via range(offset, offset+limit)', async () => {
    const list = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    await listCompositions(USER, { limit: 10, offset: 20 });
    expect(list.rangeCalls).toEqual([[20, 30]]);
  });
});

describe('listCompositions cursor pagination (#124)', () => {
  const TS = '2020-01-01T00:00:00.000Z';
  const CURSOR = Buffer.from(`${TS}|${UUID}`, 'utf8').toString('base64url');

  function pageRows(count: number) {
    // Distinct ids/timestamps so cursor extraction is observable.
    return Array.from({ length: count }, (_, i) => ({
      ...row(USER),
      id: `11111111-1111-4111-8111-1111111111${String(i).padStart(2, '0')}`,
      created_at: `2020-01-0${i + 1}T00:00:00.000Z`,
      // Summary-select shape: scalar projections instead of a `data` blob.
      title: 'My Comp',
      description: null,
      mappingMode: 'LINEAR_LANDSCAPE',
      key: 'C',
      scale: 'C_MAJOR',
      presetId: null,
      tempo: null,
      imageThumbnail: null,
      metadata: null,
    }));
  }

  it('applies the keyset or() filter and fetches limit+1 rows in cursor mode', async () => {
    const list = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    await listCompositions(USER, { limit: 10, cursor: CURSOR });
    expect(list.orCalls).toEqual([
      `created_at.lt.${TS},and(created_at.eq.${TS},id.lt.${UUID})`,
    ]);
    expect(list.rangeCalls).toEqual([[0, 10]]);
  });

  it('emits nextCursor from the last returned row when a further page exists', async () => {
    // limit=2, 3 rows returned -> the extra row means another page exists.
    const list = makeBuilder({ data: pageRows(3), error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    const { compositions, nextCursor } = await listCompositions(USER, { limit: 2, cursor: CURSOR });
    expect(compositions).toHaveLength(2);
    const expected = Buffer.from('2020-01-02T00:00:00.000Z|11111111-1111-4111-8111-111111111101', 'utf8').toString('base64url');
    expect(nextCursor).toBe(expected);
  });

  it('returns no nextCursor on the final page', async () => {
    const list = makeBuilder({ data: pageRows(2), error: null });
    fromMock.mockReturnValueOnce(asMock(list));

    const { compositions, nextCursor } = await listCompositions(USER, { limit: 2, cursor: CURSOR });
    expect(compositions).toHaveLength(2);
    expect(nextCursor).toBeUndefined();
  });

  it('round-trips: a cursor produced by one page is accepted as the next page filter', async () => {
    const first = makeBuilder({ data: pageRows(3), error: null });
    const second = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValueOnce(asMock(first)).mockReturnValueOnce(asMock(second));

    const { nextCursor } = await listCompositions(USER, { limit: 2, cursor: CURSOR });
    await listCompositions(USER, { limit: 2, cursor: nextCursor });
    expect(second.orCalls[0]).toContain('created_at.lt.2020-01-02T00:00:00.000Z');
  });

  it('throws "Invalid cursor" for a malformed cursor without querying', async () => {
    await expect(listCompositions(USER, { cursor: '!!!not-a-cursor!!!' })).rejects.toThrow(/invalid cursor/i);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('throws "Invalid cursor" for a cursor whose id is not a UUID', async () => {
    const bad = Buffer.from(`${TS}|not-a-uuid`, 'utf8').toString('base64url');
    await expect(listCompositions(USER, { cursor: bad })).rejects.toThrow(/invalid cursor/i);
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
