import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TEST_USER = 'user-1';
const OTHER_USER = 'user-2';
const UUID = '11111111-1111-4111-8111-111111111111';

// requireAuth is a preHandler; stub it to authenticate as TEST_USER.
vi.mock('../auth', () => ({
  requireAuth: async (req: { userId?: string }) => {
    req.userId = TEST_USER;
  },
}));

// Replace the service layer so no Supabase client is touched.
vi.mock('../services/compositions', () => ({
  listCompositions: vi.fn(),
  getCompositionById: vi.fn(),
  createComposition: vi.fn(),
  updateComposition: vi.fn(),
  deleteComposition: vi.fn(),
}));

import { compositionRoutes } from '../routes/compositions';
import * as svc from '../services/compositions';
import type { Composition, CompositionSummary } from '@toposonics/types';

const mocked = vi.mocked(svc);

const validCreateBody = {
  title: 'My Comp',
  noteEvents: [{ note: 'C4', start: 0, duration: 0.5, velocity: 0.8 }],
  mappingMode: 'LINEAR_LANDSCAPE',
  key: 'C',
  scale: 'C_MAJOR',
};

function composition(userId: string): Composition {
  return {
    id: UUID,
    userId,
    title: 'My Comp',
    noteEvents: [],
    mappingMode: 'LINEAR_LANDSCAPE',
    key: 'C',
    scale: 'C_MAJOR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function summary(userId: string): CompositionSummary {
  return {
    id: UUID,
    userId,
    title: 'My Comp',
    mappingMode: 'LINEAR_LANDSCAPE',
    key: 'C',
    scale: 'C_MAJOR',
    noteCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  app = Fastify();
  await app.register(compositionRoutes);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('POST /compositions (validation, #88)', () => {
  it('creates on a valid body', async () => {
    mocked.createComposition.mockResolvedValue(composition(TEST_USER));
    const res = await app.inject({ method: 'POST', url: '/compositions', payload: validCreateBody });
    expect(res.statusCode).toBe(201);
    expect(mocked.createComposition).toHaveBeenCalledWith(TEST_USER, expect.objectContaining({ title: 'My Comp' }));
  });

  it('rejects a missing required field with 400', async () => {
    const { title, ...noTitle } = validCreateBody;
    void title;
    const res = await app.inject({ method: 'POST', url: '/compositions', payload: noTitle });
    expect(res.statusCode).toBe(400);
    expect(mocked.createComposition).not.toHaveBeenCalled();
  });

  it('strips unknown/mass-assignment keys so they never reach the service', async () => {
    // With additionalProperties:false, Fastify's default AJV removes unknown keys rather
    // than 400-ing; either way the forged userId/id must not reach createComposition.
    mocked.createComposition.mockResolvedValue(composition(TEST_USER));
    const res = await app.inject({
      method: 'POST',
      url: '/compositions',
      payload: { ...validCreateBody, userId: OTHER_USER, id: 'forged' },
    });
    expect(res.statusCode).toBe(201);
    const body = mocked.createComposition.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('id');
  });

  it('rejects a wrong-typed field with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/compositions',
      payload: { ...validCreateBody, title: { not: 'a string' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a note event missing "note" with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/compositions',
      payload: { ...validCreateBody, noteEvents: [{ start: 0, duration: 0.5, velocity: 0.8 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(mocked.createComposition).not.toHaveBeenCalled();
  });

  it('keeps unknown note-event keys (forward compat) while enforcing the core fields', async () => {
    mocked.createComposition.mockResolvedValue(composition(TEST_USER));
    const res = await app.inject({
      method: 'POST',
      url: '/compositions',
      payload: {
        ...validCreateBody,
        noteEvents: [{ note: 'C4', start: 0, duration: 0.5, velocity: 0.8, futureField: 'x' }],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = mocked.createComposition.mock.calls[0][1] as { noteEvents: Record<string, unknown>[] };
    expect(body.noteEvents[0]).toHaveProperty('futureField', 'x');
  });
});

describe('GET /compositions (summary pagination, audit)', () => {
  it('returns an array of summaries with default pagination', async () => {
    mocked.listCompositions.mockResolvedValue({ compositions: [summary(TEST_USER)] });
    const res = await app.inject({ method: 'GET', url: '/compositions' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(mocked.listCompositions).toHaveBeenCalledWith(TEST_USER, { limit: 50, offset: 0 });
  });

  it('summary rows carry noteCount but no noteEvents/imageData blobs', async () => {
    mocked.listCompositions.mockResolvedValue({ compositions: [summary(TEST_USER)] });
    const res = await app.inject({ method: 'GET', url: '/compositions' });
    expect(res.statusCode).toBe(200);
    const row = (res.json() as { data: Record<string, unknown>[] }).data[0];
    expect(row.noteCount).toBe(3);
    expect(row).not.toHaveProperty('noteEvents');
    expect(row).not.toHaveProperty('imageData');
  });

  it('passes validated limit/offset through to the service', async () => {
    mocked.listCompositions.mockResolvedValue({ compositions: [] });
    const res = await app.inject({ method: 'GET', url: '/compositions?limit=5&offset=10' });
    expect(res.statusCode).toBe(200);
    expect(mocked.listCompositions).toHaveBeenCalledWith(TEST_USER, { limit: 5, offset: 10 });
  });

  it('rejects limit=0 with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/compositions?limit=0' });
    expect(res.statusCode).toBe(400);
    expect(mocked.listCompositions).not.toHaveBeenCalled();
  });

  it('rejects limit above 100 with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/compositions?limit=101' });
    expect(res.statusCode).toBe(400);
    expect(mocked.listCompositions).not.toHaveBeenCalled();
  });
});

describe('GET /compositions cursor pagination (#124)', () => {
  const CURSOR = Buffer.from('2020-01-01T00:00:00.000Z|' + UUID, 'utf8').toString('base64url');

  it('passes cursor mode to the service (offset omitted) and returns nextCursor when present', async () => {
    mocked.listCompositions.mockResolvedValue({
      compositions: [summary(TEST_USER)],
      nextCursor: 'next-page',
    });
    const res = await app.inject({
      method: 'GET',
      url: `/compositions?limit=5&cursor=${encodeURIComponent(CURSOR)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(mocked.listCompositions).toHaveBeenCalledWith(TEST_USER, { limit: 5, cursor: CURSOR });
    const body = res.json() as { data: unknown[]; nextCursor?: string };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.nextCursor).toBe('next-page');
  });

  it('omits nextCursor on the last page (additive envelope keeps data as a bare array)', async () => {
    mocked.listCompositions.mockResolvedValue({ compositions: [summary(TEST_USER)] });
    const res = await app.inject({ method: 'GET', url: `/compositions?cursor=${encodeURIComponent(CURSOR)}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; nextCursor?: string };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.nextCursor).toBeUndefined();
  });

  it('maps a malformed cursor to 400 INVALID_CURSOR, not 500', async () => {
    mocked.listCompositions.mockRejectedValue(new Error('Invalid cursor'));
    const res = await app.inject({ method: 'GET', url: '/compositions?cursor=not-valid' });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('INVALID_CURSOR');
  });

  it('strips unknown query keys rather than failing', async () => {
    mocked.listCompositions.mockResolvedValue({ compositions: [] });
    const res = await app.inject({ method: 'GET', url: '/compositions?bogus=1' });
    expect(res.statusCode).toBe(200);
    expect(mocked.listCompositions).toHaveBeenCalledWith(TEST_USER, { limit: 50, offset: 0 });
  });
});

describe('GET /compositions/:id (uuid + ownership, #92/#93)', () => {
  it('returns 400 for a non-UUID id', async () => {
    const res = await app.inject({ method: 'GET', url: '/compositions/not-a-uuid' });
    expect(res.statusCode).toBe(400);
    expect(mocked.getCompositionById).not.toHaveBeenCalled();
  });

  it('returns 404 when the composition does not exist', async () => {
    mocked.getCompositionById.mockResolvedValue(null);
    const res = await app.inject({ method: 'GET', url: `/compositions/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 (not 403) for a composition owned by another user', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(OTHER_USER));
    const res = await app.inject({ method: 'GET', url: `/compositions/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it('returns 200 for the owner', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(TEST_USER));
    const res = await app.inject({ method: 'GET', url: `/compositions/${UUID}` });
    expect(res.statusCode).toBe(200);
  });
});

describe('PUT/DELETE ownership scoping (#92)', () => {
  it('PUT of a foreign composition returns 404 and does not update', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(OTHER_USER));
    const res = await app.inject({ method: 'PUT', url: `/compositions/${UUID}`, payload: { title: 'x' } });
    expect(res.statusCode).toBe(404);
    expect(mocked.updateComposition).not.toHaveBeenCalled();
  });

  it('PUT of an owned composition passes the authenticated userId to the service', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(TEST_USER));
    mocked.updateComposition.mockResolvedValue(composition(TEST_USER));
    const res = await app.inject({ method: 'PUT', url: `/compositions/${UUID}`, payload: { title: 'new' } });
    expect(res.statusCode).toBe(200);
    expect(mocked.updateComposition).toHaveBeenCalledWith(UUID, TEST_USER, expect.objectContaining({ title: 'new' }));
  });

  it('DELETE of a foreign composition returns 404', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(OTHER_USER));
    const res = await app.inject({ method: 'DELETE', url: `/compositions/${UUID}` });
    expect(res.statusCode).toBe(404);
    expect(mocked.deleteComposition).not.toHaveBeenCalled();
  });

  it('DELETE of an owned composition scopes by userId', async () => {
    mocked.getCompositionById.mockResolvedValue(composition(TEST_USER));
    mocked.deleteComposition.mockResolvedValue(true);
    const res = await app.inject({ method: 'DELETE', url: `/compositions/${UUID}` });
    expect(res.statusCode).toBe(200);
    expect(mocked.deleteComposition).toHaveBeenCalledWith(UUID, TEST_USER);
  });
});
