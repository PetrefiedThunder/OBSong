/**
 * Shared API client utilities
 * Provides a unified interface for making API requests
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  Composition,
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

  const parsed = (await response.json()) as ApiResponse<T> | ApiErrorResponse;

  if (!response.ok || !parsed.success) {
    const errorResponse = parsed as ApiErrorResponse;
    const message = errorResponse.error?.message ?? 'Request failed';
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
     * Fetch all compositions
     * Token is optional - may return only public compositions if not authenticated
     */
    async fetchCompositions(token: string | null): Promise<Composition[]> {
      return apiRequest<Composition[]>(baseUrl, '/compositions', { token });
    },

    /**
     * Fetch a single composition by ID
     * Token is optional - may fail for private compositions if not authenticated
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
