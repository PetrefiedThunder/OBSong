import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { CreateCompositionDTO, UpdateCompositionDTO } from '@toposonics/types';

vi.mock('../supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));
import { supabaseAdmin } from '../supabase';
import { CompositionConflictError } from '../services/compositionConflict';
import { createComposition, deleteComposition, listCompositions, updateComposition } from '../services/compositions';

const UUID = '11111111-1111-4111-8111-111111111111';
const USER = 'qa-owner';
const body = {
  title: 'Original title', description: 'Original description', noteEvents: [],
  mappingMode: 'LINEAR_LANDSCAPE' as const, key: 'C' as const, scale: 'C_MAJOR' as const,
};
function row() {
  return {
    id: UUID, user_id: USER, name: body.title, data: { ...body } as Record<string, unknown>,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };
}
const fromMock = vi.mocked(supabaseAdmin.from);
function builder(result: unknown) {
  const query = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), is: vi.fn(), single: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'single', 'order', 'range', 'or'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}
// Each UPDATE evaluates its filters against the latest committed row, while the
// first two reads share a snapshot to deterministically reproduce concurrent edits.
function concurrentStore(initial = row()) {
  let persisted = structuredClone(initial);
  const reads: Array<() => void> = [];
  const writes: Array<ReturnType<typeof builder>> = [];
  const appliedVersions: string[] = [];
  fromMock.mockImplementation(() => {
    const query = builder(null);
    let update: Partial<ReturnType<typeof row>> | undefined;
    query.update.mockImplementation(value => { update = value; writes.push(query); return query; });
    query.single.mockImplementation(() => {
      if (update) {
        const matches = [...query.eq.mock.calls, ...query.is.mock.calls].every(([column, value]) => {
          const current = column === 'data->>updatedAt'
            ? persisted.data.updatedAt ?? null
            : persisted[column as keyof typeof persisted];
          return current === value;
        });
        if (!matches) return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        persisted = { ...persisted, ...JSON.parse(JSON.stringify(update)) };
        appliedVersions.push(persisted.data.updatedAt as string);
        return Promise.resolve({ data: structuredClone(persisted), error: null });
      }
      const snapshot = structuredClone(persisted);
      if (reads.length >= 2) return Promise.resolve({ data: snapshot, error: null });
      return new Promise(resolve => {
        reads.push(() => resolve({ data: snapshot, error: null }));
        if (reads.length === 2) reads.forEach(release => release());
      });
    });
    return query as unknown as ReturnType<typeof supabaseAdmin.from>;
  });
  return { current: () => persisted, writes, appliedVersions };
}

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('QA persistence boundaries', () => {
  it('creates with server ownership and drops forged system/unknown fields', async () => {
    const query = builder({ data: row(), error: null });
    fromMock.mockReturnValue(query as unknown as ReturnType<typeof supabaseAdmin.from>);
    await createComposition(USER, {
      ...body, id: 'forged', userId: 'other-owner', createdAt: 'forged', updatedAt: 'forged', extra: true,
    } as unknown as CreateCompositionDTO);
    const inserted = query.insert.mock.calls[0][0];
    expect(inserted.user_id).toBe(USER);
    expect(inserted.data).toMatchObject({ userId: USER, id: '', title: body.title });
    expect(inserted.data.createdAt).toBeInstanceOf(Date);
    expect(inserted.data).not.toHaveProperty('extra');
  });

  it('preserves protected fields and untouched content on an ordinary partial update', async () => {
    const read = builder({ data: row(), error: null });
    const write = builder({ data: row(), error: null });
    fromMock.mockReturnValueOnce(read as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(write as unknown as ReturnType<typeof supabaseAdmin.from>);
    await updateComposition(UUID, USER, {
      title: 'Changed', id: 'forged', userId: 'other-owner', createdAt: 'forged', updatedAt: 'forged', extra: true,
    } as unknown as UpdateCompositionDTO);
    const updated = write.update.mock.calls[0][0];
    expect(updated.data).toMatchObject({ id: UUID, userId: USER, title: 'Changed', description: body.description });
    expect(updated.data.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(updated.data.updatedAt).toBeInstanceOf(Date);
    expect(updated.data).not.toHaveProperty('extra');
    expect(write.eq.mock.calls).toEqual([['id', UUID], ['user_id', USER]]);
    expect(write.is.mock.calls).toEqual([['data->>updatedAt', null]]);
  });

  it.each(['PGRST116', '22P02'])('maps a raced-away update (%s) to null', async code => {
    const read = builder({ data: row(), error: null });
    const write = builder({ data: null, error: { code } });
    fromMock.mockReturnValueOnce(read as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(write as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(builder({ data: null, error: { code: 'PGRST116' } }) as unknown as ReturnType<typeof supabaseAdmin.from>);
    expect(await updateComposition(UUID, USER, { title: 'Changed' })).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(code === 'PGRST116' ? 3 : 2);
  });

  it('does not turn a delete provider failure into reported success', async () => {
    const query = builder({ data: null, error: new Error('QA provider unavailable') });
    fromMock.mockReturnValue(query as unknown as ReturnType<typeof supabaseAdmin.from>);
    await expect(deleteComposition(UUID, USER)).rejects.toThrow('QA provider unavailable');
  });

  it.each(['', 'not a date', '2026-99-99', '2026-01-01|unexpected'])('rejects malformed cursor timestamp %s without querying', async timestamp => {
    const cursor = Buffer.from(`${timestamp}|${UUID}`).toString('base64url');
    await expect(listCompositions(USER, { cursor })).rejects.toThrow('Invalid cursor');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('BE-002 preserves both disjoint edits from concurrent partial updates', async () => {
    const store = concurrentStore();
    const results = await Promise.all([
      updateComposition(UUID, USER, { title: 'New title' }),
      updateComposition(UUID, USER, { description: 'New description' }),
    ]);
    expect(results.every(Boolean)).toBe(true);
    expect(store.current().data).toMatchObject({ title: 'New title', description: 'New description' });
    expect(store.writes).toHaveLength(3);
    for (const query of store.writes) {
      expect(query.eq.mock.calls).toContainEqual(['id', UUID]);
      expect(query.eq.mock.calls).toContainEqual(['user_id', USER]);
    }
  });

  it.each([null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.123456Z', 'invalid-legacy-date'])(
    'BE-002 advances concurrent revisions with a frozen clock from %s', async previousVersion => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-01T00:00:00.000Z'));
      const initial = row();
      initial.data.updatedAt = previousVersion;
      const store = concurrentStore(initial);
      await Promise.all([
        updateComposition(UUID, USER, { title: 'New title' }),
        updateComposition(UUID, USER, { description: 'New description' }),
      ]);
      expect(store.current().data).toMatchObject({ title: 'New title', description: 'New description' });
      expect(store.appliedVersions).toHaveLength(2);
      if (previousVersion && Number.isFinite(Date.parse(previousVersion))) {
        expect(Date.parse(store.appliedVersions[0])).toBeGreaterThan(Date.parse(previousVersion));
      }
      expect(Date.parse(store.appliedVersions[1])).toBeGreaterThan(Date.parse(store.appliedVersions[0]));
      if (previousVersion === null) {
        expect(store.writes[0].is.mock.calls).toEqual([['data->>updatedAt', null]]);
      } else {
        expect(store.writes[0].eq.mock.calls).toContainEqual(['data->>updatedAt', previousVersion]);
      }
    }
  );

  it.each([42, { malformed: true }])('BE-002 rejects a non-string legacy revision without writing (%j)', async version => {
    const initial = row();
    initial.data.updatedAt = version;
    const read = builder({ data: initial, error: null });
    fromMock.mockReturnValue(read as unknown as ReturnType<typeof supabaseAdmin.from>);
    await expect(updateComposition(UUID, USER, { title: 'Changed' })).rejects.toBeInstanceOf(CompositionConflictError);
    expect(read.update).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('BE-002 stops without writing after ownership changes during a retry', async () => {
    const read = builder({ data: row(), error: null });
    const write = builder({ data: null, error: { code: 'PGRST116' } });
    const moved = builder({ data: { ...row(), user_id: 'another-owner' }, error: null });
    fromMock.mockReturnValueOnce(read as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(write as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(moved as unknown as ReturnType<typeof supabaseAdmin.from>);
    expect(await updateComposition(UUID, USER, { title: 'Changed' })).toBeNull();
    expect(write.eq.mock.calls).toContainEqual(['user_id', USER]);
    expect(read.eq.mock.calls).toContainEqual(['user_id', USER]);
    expect(moved.eq.mock.calls).toContainEqual(['user_id', USER]);
    expect(moved.update).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledTimes(3);
  });

  it('BE-002 reports conflict after three unsuccessful atomic writes', async () => {
    const queries: Array<ReturnType<typeof builder>> = [];
    fromMock.mockImplementation(() => {
      const query = builder(queries.length % 2 === 0
        ? { data: row(), error: null }
        : { data: null, error: { code: 'PGRST116' } });
      queries.push(query);
      return query as unknown as ReturnType<typeof supabaseAdmin.from>;
    });
    await expect(updateComposition(UUID, USER, { title: 'Changed' })).rejects.toBeInstanceOf(CompositionConflictError);
    expect(queries).toHaveLength(6);
    for (const write of queries.filter((_, index) => index % 2 === 1)) {
      expect(write.eq.mock.calls).toContainEqual(['id', UUID]);
      expect(write.eq.mock.calls).toContainEqual(['user_id', USER]);
      expect(write.is.mock.calls).toEqual([['data->>updatedAt', null]]);
    }
  });

  it.each([undefined, null, '2026-01-01T00:00:00.123456Z'])(
    'BE-002 serializes the revision precondition through the installed provider client (%s)', async previousVersion => {
      const initial = row();
      initial.data.updatedAt = previousVersion;
      const requests: Array<{ url: URL; method: string }> = [];
      const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        requests.push({ url, method: init?.method ?? 'GET' });
        const result = init?.method === 'PATCH'
          ? { ...initial, ...JSON.parse(init.body as string) }
          : initial;
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      });
      const client = createClient('https://qa.invalid', 'qa-synthetic-placeholder', {
        global: { fetch },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      fromMock.mockImplementation(client.from.bind(client));
      const result = await updateComposition(UUID, USER, { title: 'Changed' });
      expect(result?.title).toBe('Changed');
      expect(requests.map(request => request.method)).toEqual(['GET', 'PATCH']);
      for (const request of requests) {
        expect(request.url.searchParams.get('id')).toBe('eq.' + UUID);
        expect(request.url.searchParams.get('user_id')).toBe('eq.' + USER);
      }
      expect(requests[1].url.searchParams.get('data->>updatedAt')).toBe(
        previousVersion == null ? 'is.null' : 'eq.' + previousVersion
      );
    }
  );

  it('BE-002 propagates provider failures without retrying writes', async () => {
    const read = builder({ data: row(), error: null });
    const write = builder({ data: null, error: new Error('QA provider unavailable') });
    fromMock.mockReturnValueOnce(read as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(write as unknown as ReturnType<typeof supabaseAdmin.from>);
    await expect(updateComposition(UUID, USER, { title: 'Changed' })).rejects.toThrow('QA provider unavailable');
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
