import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth', () => ({ requireAuth: async (req: { userId?: string }) => { req.userId = 'qa-user'; } }));
vi.mock('../services/compositions', () => ({
  listCompositions: vi.fn(), getCompositionById: vi.fn(), createComposition: vi.fn(),
  updateComposition: vi.fn(), deleteComposition: vi.fn(),
}));
import { compositionRoutes } from '../routes/compositions';
import * as service from '../services/compositions';

const mocked = vi.mocked(service);
const UUID = '11111111-1111-4111-8111-111111111111';
const validNote = { note: 'C4', start: 0, duration: 0.5, velocity: 0.8 };
const body = {
  title: 'QA composition', noteEvents: [validNote], mappingMode: 'LINEAR_LANDSCAPE', key: 'C', scale: 'C_MAJOR',
};
const stored = {
  ...body, mappingMode: 'LINEAR_LANDSCAPE' as const, key: 'C' as const, scale: 'C_MAJOR' as const,
  id: UUID, userId: 'qa-user', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
};
let app: FastifyInstance;

beforeEach(async () => {
  vi.resetAllMocks();
  mocked.createComposition.mockResolvedValue(stored);
  mocked.getCompositionById.mockResolvedValue(stored);
  mocked.updateComposition.mockResolvedValue(stored);
  app = Fastify();
  await app.register(compositionRoutes);
  await app.ready();
});
afterEach(async () => { await app.close(); });

describe('QA composition boundary values and error handling', () => {
  it.each([
    { title: '' }, { title: 'x'.repeat(201) }, { description: 'x'.repeat(2001) },
    { tempo: 0 }, { tempo: 1001 },
    { noteEvents: [{ ...validNote, start: -1 }] },
    { noteEvents: [{ ...validNote, duration: 0 }] },
    { noteEvents: [{ ...validNote, velocity: -0.001 }] },
    { noteEvents: [{ ...validNote, velocity: 1.001 }] },
    { noteEvents: [{ ...validNote, pan: -1.001 }] },
    { noteEvents: [{ ...validNote, pan: 1.001 }] },
  ])('rejects out-of-range payload %#', async invalid => {
    const response = await app.inject({ method: 'POST', url: '/compositions', payload: { ...body, ...invalid } });
    expect(response.statusCode).toBe(400);
    expect(mocked.createComposition).not.toHaveBeenCalled();
  });

  it.each([
    { title: 'x'.repeat(200), tempo: 1 }, { description: 'x'.repeat(2000), tempo: 1000 },
    { noteEvents: [{ ...validNote, velocity: 0, pan: -1 }] },
    { noteEvents: [{ ...validNote, velocity: 1, pan: 1 }] },
  ])('accepts exact inclusive boundary %#', async valid => {
    const response = await app.inject({ method: 'POST', url: '/compositions', payload: { ...body, ...valid } });
    expect(response.statusCode).toBe(201);
  });

  it.each(['limit=0', 'limit=101', 'limit=1.1', 'offset=-1', 'offset=1.1', 'cursor='])('rejects invalid pagination %s', async query => {
    const response = await app.inject({ method: 'GET', url: `/compositions?${query}` });
    expect(response.statusCode).toBe(400);
    expect(mocked.listCompositions).not.toHaveBeenCalled();
  });

  it.each([
    { method: 'GET' as const, url: '/compositions', mock: mocked.listCompositions },
    { method: 'GET' as const, url: `/compositions/${UUID}`, mock: mocked.getCompositionById },
    { method: 'POST' as const, url: '/compositions', payload: body, mock: mocked.createComposition },
    { method: 'PUT' as const, url: `/compositions/${UUID}`, payload: { title: 'Changed' }, mock: mocked.updateComposition },
    { method: 'DELETE' as const, url: `/compositions/${UUID}`, mock: mocked.deleteComposition },
  ])('returns a safe error after provider failure on $method $url', async ({ mock, ...route }) => {
    mock.mockRejectedValue(new Error('QA_PRIVATE_DATABASE_DETAIL'));
    const response = await app.inject(route);
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
    expect(response.body).not.toContain('QA_PRIVATE_DATABASE_DETAIL');
  });

  // BE-001: schema checks lengths, not the public musical-value contract.
  it.fails.each([
    { noteEvents: [{ ...validNote, note: 'H4' }] },
    { mappingMode: 'UNKNOWN_MODE' }, { key: 'Z' }, { scale: 'UNKNOWN_SCALE' },
    { noteEvents: [{ ...validNote, effects: { reverbSend: 'loud' } }] },
  ])('BE-001 rejects non-musical or wrong-typed musical values %#', async invalid => {
    const response = await app.inject({ method: 'POST', url: '/compositions', payload: { ...body, ...invalid } });
    expect(response.statusCode).toBe(400);
    expect(mocked.createComposition).not.toHaveBeenCalled();
  });
});
