import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authRoutes } from './auth';

const { exchangeAccessToken } = vi.hoisted(() => ({
  exchangeAccessToken: vi.fn(),
}));

vi.mock('../auth', () => ({
  exchangeAccessToken,
}));

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(authRoutes);
  return app;
}

describe('auth routes', () => {
  afterEach(() => {
    exchangeAccessToken.mockReset();
  });

  it('rejects malformed login payloads with field details', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { accessToken: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        details: {
          fieldErrors: {
            accessToken: expect.any(Array),
          },
        },
      },
    });
    expect(exchangeAccessToken).not.toHaveBeenCalled();
    await app.close();
  });

  it('validates a Supabase access token', async () => {
    exchangeAccessToken.mockResolvedValue({
      token: 'valid-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { accessToken: 'valid-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(exchangeAccessToken).toHaveBeenCalledWith('valid-token');
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        token: 'valid-token',
        user: {
          id: 'user-1',
        },
      },
    });
    await app.close();
  });
});
