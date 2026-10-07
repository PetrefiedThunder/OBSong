import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateCompositionDTO, UpdateCompositionDTO } from '@toposonics/types';

vi.mock('../supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));
import { supabaseAdmin } from '../supabase';
import { createComposition, deleteComposition, listCompositions, updateComposition } from '../services/compositions';

const UUID = '11111111-1111-4111-8111-111111111111';
const USER = 'qa-owner';
const body = {
  title: 'Original title', description: 'Original description', noteEvents: [],
  mappingMode: 'LINEAR_LANDSCAPE' as const, key: 'C' as const, scale: 'C_MAJOR' as const,
};
function row() {
  return {
    id: UUID, user_id: USER, name: body.title, data: { ...body },
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };
}
const fromMock = vi.mocked(supabaseAdmin.from);
function builder(result: unknown) {
  const query = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), single: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'single', 'order', 'range', 'or'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}
beforeEach(() => { vi.resetAllMocks(); });

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
      title: 'Changed', id: 'forged', userId: 'other-owner', createdAt: 'forged', extra: true,
    } as unknown as UpdateCompositionDTO);
    const updated = write.update.mock.calls[0][0];
    expect(updated.data).toMatchObject({ id: UUID, userId: USER, title: 'Changed', description: body.description });
    expect(updated.data.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(updated.data).not.toHaveProperty('extra');
    expect(write.eq.mock.calls).toEqual([['id', UUID], ['user_id', USER]]);
  });

  it.each(['PGRST116', '22P02'])('maps a raced-away update (%s) to null', async code => {
    const read = builder({ data: row(), error: null });
    const write = builder({ data: null, error: { code } });
    fromMock.mockReturnValueOnce(read as unknown as ReturnType<typeof supabaseAdmin.from>)
      .mockReturnValueOnce(write as unknown as ReturnType<typeof supabaseAdmin.from>);
    expect(await updateComposition(UUID, USER, { title: 'Changed' })).toBeNull();
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

  // BE-002: model two calls that read the same committed row before either writes.
  // Both resolve successfully, but the second full-JSONB write drops the first edit.
  it.fails('BE-002 preserves both disjoint edits from concurrent partial updates', async () => {
    let persisted = row();
    const reads: Array<() => void> = [];
    fromMock.mockImplementation(() => {
      const query = builder(null);
      let update: ReturnType<typeof row> | undefined;
      query.update.mockImplementation(value => { update = value; return query; });
      query.single.mockImplementation(() => {
        if (update) {
          persisted = { ...persisted, ...update };
          return Promise.resolve({ data: structuredClone(persisted), error: null });
        }
        const snapshot = structuredClone(persisted);
        return new Promise(resolve => {
          reads.push(() => resolve({ data: snapshot, error: null }));
          if (reads.length === 2) reads.forEach(release => release());
        });
      });
      return query as unknown as ReturnType<typeof supabaseAdmin.from>;
    });
    const results = await Promise.all([
      updateComposition(UUID, USER, { title: 'New title' }),
      updateComposition(UUID, USER, { description: 'New description' }),
    ]);
    expect(results.every(Boolean)).toBe(true);
    expect(persisted.data).toMatchObject({ title: 'New title', description: 'New description' });
  });
});
