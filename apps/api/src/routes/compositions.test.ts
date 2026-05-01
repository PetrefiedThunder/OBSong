import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compositionRoutes } from './compositions';

const validId = '11111111-1111-4111-8111-111111111111';
const now = '2026-05-01T12:00:00.000Z';

const validPayload = {
  title: 'Mountain line',
  description: 'Generated from an image',
  noteEvents: [{ note: 'C4', start: 0, duration: 1, velocity: 0.8 }],
  mappingMode: 'LINEAR_LANDSCAPE',
  key: 'C',
  scale: 'C_MAJOR',
  tempo: 90,
};

const validComposition = {
  ...validPayload,
  schemaVersion: 1,
  id: validId,
  userId: 'user-1',
  createdAt: now,
  updatedAt: now,
};

const {
  CompositionDataValidationError,
  createComposition,
  deleteComposition,
  getCompositionById,
  listCompositions,
  requireAuth,
  updateComposition,
} = vi.hoisted(() => ({
  CompositionDataValidationError: class MockCompositionDataValidationError extends Error {
    constructor(
      message: string,
      public readonly compositionId: string,
      public readonly details: unknown
    ) {
      super(message);
    }
  },
  createComposition: vi.fn(),
  deleteComposition: vi.fn(),
  getCompositionById: vi.fn(),
  listCompositions: vi.fn(),
  requireAuth: vi.fn(async (request: { userId?: string }) => {
    request.userId = 'user-1';
  }),
  updateComposition: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireAuth,
}));

vi.mock('../services/compositions', () => ({
  CompositionDataValidationError,
  createComposition,
  deleteComposition,
  getCompositionById,
  listCompositions,
  updateComposition,
}));

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(compositionRoutes);
  return app;
}

describe('composition routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('validates create payloads before calling the service', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/compositions',
      headers: { authorization: 'Bearer token' },
      payload: { ...validPayload, id: validId },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        details: {
          fieldErrors: {
            id: expect.any(Array),
          },
        },
      },
    });
    expect(createComposition).not.toHaveBeenCalled();
    await app.close();
  });

  it('creates compositions for the authenticated user only', async () => {
    createComposition.mockResolvedValue(validComposition);
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/compositions',
      headers: { authorization: 'Bearer token' },
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(createComposition).toHaveBeenCalledWith('user-1', {
      ...validPayload,
      schemaVersion: 1,
    });
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: validId,
        userId: 'user-1',
        createdAt: now,
        updatedAt: now,
      },
    });
    await app.close();
  });

  it('validates update payloads and rejects protected fields', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/compositions/${validId}`,
      headers: { authorization: 'Bearer token' },
      payload: { userId: 'user-2', title: 'Nope' },
    });

    expect(response.statusCode).toBe(400);
    expect(updateComposition).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        details: {
          fieldErrors: {
            userId: expect.any(Array),
          },
        },
      },
    });
    await app.close();
  });

  it('updates through the scoped service path and fails closed on misses', async () => {
    updateComposition.mockResolvedValue(null);
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/compositions/${validId}`,
      headers: { authorization: 'Bearer token' },
      payload: { title: 'New title' },
    });

    expect(updateComposition).toHaveBeenCalledWith('user-1', validId, { title: 'New title' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
      },
    });
    await app.close();
  });

  it('reads through the scoped service path', async () => {
    getCompositionById.mockResolvedValue(validComposition);
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/compositions/${validId}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(response.statusCode).toBe(200);
    expect(getCompositionById).toHaveBeenCalledWith('user-1', validId);
    await app.close();
  });

  it('returns a typed compatibility error for corrupt stored rows', async () => {
    getCompositionById.mockRejectedValue(
      new CompositionDataValidationError('bad row', validId, {
        fieldErrors: { noteEvents: ['Required'] },
      })
    );
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/compositions/${validId}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'COMPOSITION_DATA_INVALID',
        details: {
          compositionId: validId,
        },
      },
    });
    await app.close();
  });

  it('deletes through the scoped service path', async () => {
    deleteComposition.mockResolvedValue(false);
    const app = await buildApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/compositions/${validId}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(deleteComposition).toHaveBeenCalledWith('user-1', validId);
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
