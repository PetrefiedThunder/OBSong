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
import type { Composition } from '@toposonics/types';

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
