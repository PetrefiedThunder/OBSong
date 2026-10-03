import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// This is the only provider boundary. Real auth and route code run without a network.
vi.mock('../supabase', () => ({ supabaseAdmin: { auth: { getUser: vi.fn() } } }));
vi.mock('../services/compositions', () => ({
  listCompositions: vi.fn().mockResolvedValue({ compositions: [] }),
  getCompositionById: vi.fn(),
  createComposition: vi.fn(),
  updateComposition: vi.fn(),
  deleteComposition: vi.fn(),
}));

const UUID = '11111111-1111-4111-8111-111111111111';
const validBody = {
  title: 'QA composition', noteEvents: [], mappingMode: 'LINEAR_LANDSCAPE', key: 'C', scale: 'C_MAJOR',
};
const protectedRoutes = [
  { method: 'GET' as const, url: '/compositions' },
  { method: 'GET' as const, url: `/compositions/${UUID}` },
  { method: 'POST' as const, url: '/compositions', payload: validBody },
  { method: 'PUT' as const, url: `/compositions/${UUID}`, payload: { title: 'Changed' } },
  { method: 'DELETE' as const, url: `/compositions/${UUID}` },
  { method: 'GET' as const, url: '/health/detailed' },
];
const providerUser = {
  id: 'qa-user', email: 'qa@example.invalid', created_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-10-01T00:00:00Z', user_metadata: { full_name: 'QA User' },
};

let app: FastifyInstance;
let getUser: ReturnType<typeof vi.fn>;
let resolveToken: typeof import('../auth').getUserFromToken;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const { supabaseAdmin } = await import('../supabase');
  getUser = vi.mocked(supabaseAdmin.auth.getUser);
  getUser.mockResolvedValue({ data: { user: providerUser }, error: null });
  resolveToken = (await import('../auth')).getUserFromToken;
  app = Fastify();
  await app.register((await import('../routes/compositions')).compositionRoutes);
  await app.register((await import('../routes/health')).healthRoutes);
  await app.ready();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await app.close();
});

describe('QA real-auth permissions matrix', () => {
  it.each(protectedRoutes)('rejects anonymous $method $url before provider access', async route => {
    const response = await app.inject(route);
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
    expect(getUser).not.toHaveBeenCalled();
  });

  it.each(protectedRoutes)('rejects invalid-token $method $url', async route => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid fixture' } });
    const response = await app.inject({ ...route, headers: { authorization: 'Bearer qa-invalid' } });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_TOKEN');
  });

  it.each(['Basic fixture', 'Bearer', 'Bearer one two'])('rejects malformed header %s', async authorization => {
    const response = await app.inject({ method: 'GET', url: '/compositions', headers: { authorization } });
    expect(response.statusCode).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('exposes only basic health anonymously and detailed health after auth', async () => {
    const publicHealth = await app.inject({ method: 'GET', url: '/health' });
    expect(publicHealth.statusCode).toBe(200);
    expect(publicHealth.json()).not.toHaveProperty('memory');
    const detailed = await app.inject({
      method: 'GET', url: '/health/detailed', headers: { authorization: 'Bearer qa-valid' },
    });
    expect(detailed.statusCode).toBe(200);
    expect(detailed.json()).toHaveProperty('memory');
  });

  it('maps provider user fields and reuses a token for no longer than 30 seconds', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const first = await resolveToken('qa-cache');
    expect(first).toMatchObject({ id: 'qa-user', email: 'qa@example.invalid', displayName: 'QA User' });
    expect(first?.createdAt).toBeInstanceOf(Date);
    clock.mockReturnValue(30_999);
    expect(await resolveToken('qa-cache')).toEqual(first);
    expect(getUser).toHaveBeenCalledTimes(1);
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Revoked fixture' } });
    clock.mockReturnValue(31_000);
    expect(await resolveToken('qa-cache')).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('bounds cached token entries rather than keeping all token lookups forever', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    for (let i = 0; i <= 5_000; i++) await resolveToken(`qa-eviction-${i}`);
    await resolveToken('qa-eviction-0');
    expect(getUser).toHaveBeenCalledTimes(5_002);
  });
});
