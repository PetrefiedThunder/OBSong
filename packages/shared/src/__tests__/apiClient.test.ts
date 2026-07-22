import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiRequest } from '../apiClient';

/** Build a minimal Response-like object for the global fetch mock. */
function mockResponse(opts: {
  status: number;
  ok?: boolean;
  body?: unknown;
  jsonThrows?: boolean;
  contentLength?: string;
}) {
  const headers = new Map<string, string>();
  if (opts.contentLength !== undefined) headers.set('content-length', opts.contentLength);
  return {
    status: opts.status,
    ok: opts.ok ?? (opts.status >= 200 && opts.status < 300),
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    json: opts.jsonThrows
      ? () => Promise.reject(new SyntaxError('Unexpected token < in JSON'))
      : () => Promise.resolve(opts.body),
  };
}

function stubFetch(response: ReturnType<typeof mockResponse>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('returns data on a successful JSON response', async () => {
    stubFetch(mockResponse({ status: 200, body: { success: true, data: { id: 'x' } } }));
    const result = await apiRequest<{ id: string }>('http://api', '/thing');
    expect(result).toEqual({ id: 'x' });
  });

  it('attaches a Bearer token when provided', async () => {
    const fn = stubFetch(mockResponse({ status: 200, body: { success: true, data: null } }));
    await apiRequest('http://api', '/thing', { token: 'tok123' });
    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
  });

  it('returns without parsing on 204 No Content', async () => {
    const fn = stubFetch(mockResponse({ status: 204, ok: true }));
    // json() would reject if called; reaching here proves it was not parsed.
    const result = await apiRequest('http://api', '/thing', { method: 'DELETE' });
    expect(result).toBeUndefined();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('treats content-length: 0 as an empty body', async () => {
    const result = await stubFetchAndCall({ status: 200, ok: true, contentLength: '0' });
    expect(result).toBeUndefined();
  });

  it('throws HTTP <status> when an error response body is not JSON', async () => {
    stubFetch(mockResponse({ status: 502, ok: false, jsonThrows: true }));
    await expect(apiRequest('http://api', '/thing')).rejects.toThrow('HTTP 502');
  });

  it('surfaces the API error message on a JSON error response', async () => {
    stubFetch(
      mockResponse({
        status: 400,
        ok: false,
        body: { success: false, error: { code: 'INVALID_INPUT', message: 'bad title' } },
      })
    );
    await expect(apiRequest('http://api', '/thing')).rejects.toThrow('bad title');
  });

  it('throws on ok:true but success:false', async () => {
    stubFetch(mockResponse({ status: 200, ok: true, body: { success: false, error: {} } }));
    await expect(apiRequest('http://api', '/thing')).rejects.toThrow('HTTP 200');
  });
});

async function stubFetchAndCall(opts: Parameters<typeof mockResponse>[0]) {
  stubFetch(mockResponse(opts));
  return apiRequest('http://api', '/thing');
}
