import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createComposition,
  deleteComposition,
  getCompositionById,
  listCompositions,
  updateComposition,
} from './compositions';

type QueryResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function createQuery(result: QueryResult) {
  const query = {
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => result),
    update: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

const { from } = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from,
  },
}));

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'user-1',
  name: 'Mountain line',
  created_at: '2026-05-01T12:00:00.000Z',
  updated_at: '2026-05-01T12:05:00.000Z',
  data: {
    schemaVersion: 1,
    title: 'Mountain line',
    noteEvents: [{ note: 'C4', start: 0, duration: 1, velocity: 0.8 }],
    mappingMode: 'LINEAR_LANDSCAPE',
    key: 'C',
    scale: 'C_MAJOR',
    tempo: 90,
  },
};

describe('composition service ownership scoping', () => {
  afterEach(() => {
    from.mockReset();
  });

  it('requires user_id when listing compositions', async () => {
    const query = createQuery({ data: [], error: null });
    from.mockReturnValue(query);

    await listCompositions('user-1');

    expect(from).toHaveBeenCalledWith('compositions');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('requires id and user_id when reading a composition', async () => {
    const query = createQuery({ data: row, error: null });
    from.mockReturnValue(query);

    const composition = await getCompositionById('user-1', row.id);

    expect(query.eq).toHaveBeenCalledWith('id', row.id);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(composition).toMatchObject({
      id: row.id,
      userId: 'user-1',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  it('stores only validated payload data on create', async () => {
    const query = createQuery({ data: row, error: null });
    from.mockReturnValue(query);

    await createComposition('user-1', {
      title: 'Mountain line',
      noteEvents: [{ note: 'C4', start: 0, duration: 1, velocity: 0.8 }],
      mappingMode: 'LINEAR_LANDSCAPE',
      key: 'C',
      scale: 'C_MAJOR',
      tempo: 90,
    });

    expect(query.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Mountain line',
      data: {
        schemaVersion: 1,
        title: 'Mountain line',
        noteEvents: [{ note: 'C4', start: 0, duration: 1, velocity: 0.8 }],
        mappingMode: 'LINEAR_LANDSCAPE',
        key: 'C',
        scale: 'C_MAJOR',
        tempo: 90,
      },
    });
  });

  it('requires id and user_id when updating a composition', async () => {
    const readQuery = createQuery({ data: row, error: null });
    const updateQuery = createQuery({
      data: {
        ...row,
        name: 'Updated title',
        data: {
          ...row.data,
          title: 'Updated title',
        },
      },
      error: null,
    });
    from.mockReturnValueOnce(readQuery).mockReturnValueOnce(updateQuery);

    await updateComposition('user-1', row.id, { title: 'Updated title' });

    expect(readQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('id', row.id);
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated title',
        data: expect.objectContaining({
          schemaVersion: 1,
          title: 'Updated title',
        }),
      })
    );
  });

  it('requires id and user_id when deleting a composition', async () => {
    const query = createQuery({ data: { id: row.id }, error: null });
    from.mockReturnValue(query);

    const deleted = await deleteComposition('user-1', row.id);

    expect(deleted).toBe(true);
    expect(query.eq).toHaveBeenCalledWith('id', row.id);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.select).toHaveBeenCalledWith('id');
  });
});
