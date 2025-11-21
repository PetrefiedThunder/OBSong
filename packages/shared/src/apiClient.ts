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
     */
    async fetchCompositions(token: string | null): Promise<Composition[]> {
      return apiRequest<Composition[]>(baseUrl, '/compositions', { token });
    },

    /**
     * Fetch a single composition by ID
     */
    async fetchComposition(token: string | null, id: string): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, `/compositions/${id}`, { token });
    },

    /**
     * Create a new composition
     */
    async createComposition(
      token: string | null,
      payload: Omit<CreateCompositionDTO, 'userId'>
    ): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, '/compositions', {
        method: 'POST',
        body: payload,
        token,
      });
    },

    /**
     * Update a composition
     */
    async updateComposition(
      token: string,
      id: string,
      updates: UpdateCompositionDTO
    ): Promise<Composition> {
      return apiRequest<Composition>(baseUrl, `/compositions/${id}`, {
        method: 'PUT',
        body: updates,
        token,
      });
    },

    /**
     * Delete a composition
     */
    async deleteComposition(token: string, id: string): Promise<void> {
      await apiRequest<void>(baseUrl, `/compositions/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  };
}
