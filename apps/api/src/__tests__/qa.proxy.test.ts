import Fastify from 'fastify';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('does not trust forwarding headers with the default proxy configuration', async () => {
  vi.stubEnv('TRUST_PROXY', '');
  vi.resetModules();
  const { config } = await import('../config');
  const app = Fastify({ trustProxy: config.trustProxy });
  app.get('/qa-ip', request => ({ ip: request.ip }));
  try {
    const response = await app.inject({
      method: 'GET', url: '/qa-ip', remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.10' },
    });
    expect(response.json().ip).toBe('127.0.0.1');
  } finally { await app.close(); }
});

// BE-003: the documented numeric hop-count setting is converted to unrestricted true.
it.fails('BE-003 trusts only one proxy hop when TRUST_PROXY=1', async () => {
  vi.stubEnv('TRUST_PROXY', '1');
  vi.resetModules();
  const { config } = await import('../config');
  const app = Fastify({ trustProxy: config.trustProxy });
  app.get('/qa-ip', request => ({ ip: request.ip }));
  try {
    const response = await app.inject({
      method: 'GET', url: '/qa-ip', remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.10' },
    });
    expect(response.json().ip).toBe('203.0.113.10');
  } finally { await app.close(); }
});
