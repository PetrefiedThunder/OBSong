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
  /** Rows to skip before the page; defaults to 0. */
  offset?: number;
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
 * Create an API client with a base URL
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config;

  return {
    /**
     * Fetch the user's composition summaries (paginated; no noteEvents/imageData blobs)
     * Requires authentication for private library access
     */
    async fetchCompositions(
      token: string | null,
      options: FetchCompositionsOptions = {}
    ): Promise<CompositionSummary[]> {
      // Build the query string by hand: React Native's URLSearchParams lacks set().
      const params: string[] = [];
      if (options.limit !== undefined) params.push(`limit=${options.limit}`);
      if (options.offset !== undefined) params.push(`offset=${options.offset}`);
      const query = params.length > 0 ? `?${params.join('&')}` : '';
      return apiRequest<CompositionSummary[]>(baseUrl, `/compositions${query}`, { token });
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
