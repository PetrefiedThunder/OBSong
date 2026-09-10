/**
 * Shared API client utilities
 * Provides a unified interface for making API requests
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  Composition,
  CompositionSummary,
  CreateCompositionDTO,
  UpdateCompositionDTO,
} from '@toposonics/types';

export interface ApiClientConfig {
  baseUrl: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export interface FetchCompositionsOptions {
  /** Page size; the server accepts 1-100 and defaults to 50. */
  limit?: number;
  /**
   * Rows to skip before the page; defaults to 0. Legacy offset pagination —
   * prefer `cursor` for a stable read under concurrent writes (#124).
   * Ignored when `cursor` is set.
   */
  offset?: number;
  /**
   * Opaque cursor from a previous page's `nextCursor`. Keyset-paginates over
   * (created_at DESC, id DESC) so rows inserted mid-pagination can't shift the
   * read window the way offset paging can.
   */
  cursor?: string;
}

/** A page of composition summaries plus the cursor for the next page, if any. */
export interface CompositionsPage {
  compositions: CompositionSummary[];
  /** Present only when another page exists. */
  nextCursor?: string;
}

/**
 * Generic API request function
 * Handles auth headers and response parsing
 */
export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 204/empty bodies (e.g. DELETE) have nothing to parse.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return undefined as T;
  }

  // Parse defensively: a gateway/proxy may return non-JSON (HTML) error pages, and we
  // must not let a JSON.parse failure mask the real HTTP status.
  let parsed: (ApiResponse<T> | ApiErrorResponse) | null = null;
  try {
    parsed = (await response.json()) as ApiResponse<T> | ApiErrorResponse;
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    throw new Error('Invalid JSON response from server');
  }

  // A body that parses to null/non-object (e.g. a proxy returning bare `null`) would make
  // `parsed.success` throw a TypeError and mask the real status.
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error(response.ok ? 'Invalid response from server' : `HTTP ${response.status}`);
  }

  if (!response.ok || !parsed.success) {
    const errorResponse = parsed as ApiErrorResponse;
    const message = errorResponse.error?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return (parsed as ApiResponse<T>).data;
}

/**
 * Generic API request function that keeps the full success envelope, for
 * endpoints that put metadata (e.g. `nextCursor`) next to `data`.
 */
export async function apiRequestEnvelope<T, M extends Record<string, unknown> = {}>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T } & M> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = 'Bearer ' + options.token;
  }

  const response = await fetch(baseUrl + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 204/empty bodies (e.g. DELETE) have nothing to parse.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return { data: undefined as T } as { data: T } & M;
  }

  // Parse defensively: a gateway/proxy may return non-JSON (HTML) error pages, and we
  // must not let a JSON.parse failure mask the real HTTP status.
  let parsed: (ApiResponse<T> | ApiErrorResponse) | null = null;
  try {
    parsed = (await response.json()) as ApiResponse<T> | ApiErrorResponse;
  } catch {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    throw new Error('Invalid JSON response from server');
  }

  // A body that parses to null/non-object would make `parsed.success` throw a
  // TypeError and mask the real status.
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error(response.ok ? 'Invalid response from server' : 'HTTP ' + response.status);
  }

  if (!response.ok || !parsed.success) {
    const errorResponse = parsed as ApiErrorResponse;
    const message = errorResponse.error?.message ?? 'HTTP ' + response.status;
    throw new Error(message);
  }

  const { success: _success, ...rest } = parsed as ApiResponse<T> & Record<string, unknown>;
  return rest as { data: T } & M;
}

/**
 * Create an API client with a base URL
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config;

  /**
   * Fetch the user's composition summaries (paginated; no noteEvents/imageData blobs)
   * Requires authentication for private library access
   */
  const fetchCompositions = async (
    token: string | null,
    options: FetchCompositionsOptions = {}
  ): Promise<CompositionSummary[]> => {
    const page = await fetchCompositionsPage(token, options);
    return page.compositions;
  };

  /**
   * Like fetchCompositions but also returns the `nextCursor` from the response
   * envelope, for callers driving cursor pagination themselves (#124).
   */
  const fetchCompositionsPage = async (
    token: string | null,
    options: FetchCompositionsOptions = {}
  ): Promise<CompositionsPage> => {
    // Build the query string by hand: React Native's URLSearchParams lacks set().
    const params: string[] = [];
    if (options.limit !== undefined) params.push(`limit=${options.limit}`);
    if (options.offset !== undefined) params.push(`offset=${options.offset}`);
    if (options.cursor !== undefined) params.push(`cursor=${encodeURIComponent(options.cursor)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    const envelope = await apiRequestEnvelope<CompositionSummary[], { nextCursor?: string }>(
      baseUrl,
      `/compositions${query}`,
      { token }
    );
    return { compositions: envelope.data, nextCursor: envelope.nextCursor };
  };

  return {
    fetchCompositions,
    fetchCompositionsPage,

    /**
     * Fetch the user's entire composition library by following the cursor chain
     * until the server stops returning `nextCursor`. Cursor (keyset) pagination
     * keeps a stable read window even if rows are inserted mid-pagination (#124),
     * which offset paging can't guarantee. Summaries are small (no noteEvents /
     * imageData blobs), so loading the full library stays cheap. Bounded at 50
     * pages (5000 rows) as a runaway guard. A closure over fetchCompositionsPage
     * (not `this`) so the method survives the destructuring re-exports in the apps.
     */
    async fetchAllCompositions(token: string | null): Promise<CompositionSummary[]> {
      const pageSize = 100;
      const maxPages = 50;
      const all: CompositionSummary[] = [];
      let cursor: string | undefined;
      let exhausted = false;

      for (let page = 0; page < maxPages; page++) {
        const result = await fetchCompositionsPage(token, {
          limit: pageSize,
          ...(cursor ? { cursor } : {}),
        });
        all.push(...result.compositions);
        if (!result.nextCursor) {
          exhausted = true;
          break;
        }
        cursor = result.nextCursor;
      }

      // The cursor chain never terminated, so more rows may exist beyond the
      // runaway guard. Don't silently present a truncated result as complete.
      if (!exhausted) {
        console.warn(
          `fetchAllCompositions stopped at the ${maxPages * pageSize}-row guard; ` +
            'the library may be larger than what was returned.'
        );
      }

      return all;
    },

    /**
     * Fetch a single composition by ID
     * Requires authentication for private composition access
     */
    async fetchComposition(id: string, token: string | null): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, `/compositions/${id}`, { token });
    },

    /**
     * Create a new composition
     * Requires authentication - userId is extracted from the auth token by the API server
     */
    async createComposition(
      payload: Omit<CreateCompositionDTO, 'userId'>,
      token: string
    ): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, '/compositions', {
        method: 'POST',
        body: payload,
        token,
      });
    },

    /**
     * Update a composition
     * Requires authentication - only the owner can update their composition
     */
    async updateComposition(
      id: string,
      updates: UpdateCompositionDTO,
      token: string
    ): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, `/compositions/${id}`, {
        method: 'PUT',
        body: updates,
        token,
      });
    },

    /**
     * Delete a composition
     * Requires authentication - only the owner can delete their composition
     */
    async deleteComposition(id: string, token: string): Promise<void> {
      await apiRequest<void>(baseUrl, `/compositions/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  };
}
