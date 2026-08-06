import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiRequest, createApiClient } from '../apiClient';

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

describe('createApiClient.fetchCompositions', () => {
  it('requests /compositions with no query string by default', async () => {
    const fn = stubFetch(mockResponse({ status: 200, body: { success: true, data: [] } }));
    const client = createApiClient({ baseUrl: 'http://api' });
    const result = await client.fetchCompositions('tok');
    expect(fn.mock.calls[0][0]).toBe('http://api/compositions');
    expect(result).toEqual([]);
  });

  it('appends limit/offset as a query string when provided', async () => {
    const fn = stubFetch(mockResponse({ status: 200, body: { success: true, data: [] } }));
    const client = createApiClient({ baseUrl: 'http://api' });
    await client.fetchCompositions('tok', { limit: 10, offset: 20 });
    expect(fn.mock.calls[0][0]).toBe('http://api/compositions?limit=10&offset=20');
  });
});

describe('createApiClient.fetchAllCompositions', () => {
  it('pages until a short page and concatenates the results in order', async () => {
    // First page full (100 rows), second page short (3 rows) => exactly two requests.
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` }));
    const page2 = [{ id: 'c100' }, { id: 'c101' }, { id: 'c102' }];
    const fn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ status: 200, body: { success: true, data: page1 } }))
      .mockResolvedValueOnce(mockResponse({ status: 200, body: { success: true, data: page2 } }));
    vi.stubGlobal('fetch', fn);

    const client = createApiClient({ baseUrl: 'http://api' });
    const result = await client.fetchAllCompositions('tok');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0]).toBe('http://api/compositions?limit=100&offset=0');
    expect(fn.mock.calls[1][0]).toBe('http://api/compositions?limit=100&offset=100');
    expect(result).toHaveLength(103);
    expect(result[0]).toEqual({ id: 'c0' });
    expect(result[102]).toEqual({ id: 'c102' });
  });

  it('stops after one request when the first page is short', async () => {
    const fn = stubFetch(
      mockResponse({ status: 200, body: { success: true, data: [{ id: 'only' }] } })
    );
    const client = createApiClient({ baseUrl: 'http://api' });
    const result = await client.fetchAllCompositions('tok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 'only' }]);
  });

  it('survives destructuring (no `this` dependence)', async () => {
    const fn = stubFetch(mockResponse({ status: 200, body: { success: true, data: [] } }));
    const { fetchAllCompositions } = createApiClient({ baseUrl: 'http://api' });
    await expect(fetchAllCompositions('tok')).resolves.toEqual([]);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

async function stubFetchAndCall(opts: Parameters<typeof mockResponse>[0]) {
  stubFetch(mockResponse(opts));
  return apiRequest('http://api', '/thing');
}
