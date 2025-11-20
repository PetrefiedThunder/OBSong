import type { ApiResponse, Composition, CreateCompositionDTO } from '@toposonics/types';
import { API_URL } from '../config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const parsed = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !parsed.success) {
    const message = parsed.error?.message ?? 'Request failed';
    throw new Error(message);
  }

  return parsed.data as T;
}

export async function fetchCompositions(token: string | null): Promise<Composition[]> {
  return apiRequest<Composition[]>('/compositions', { token });
}

export async function fetchComposition(token: string | null, id: string): Promise<Composition> {
  return apiRequest<Composition>(`/compositions/${id}`, { token });
}

export async function postComposition(
  token: string | null,
  payload: Omit<CreateCompositionDTO, 'userId'>
): Promise<Composition> {
  return apiRequest<Composition>('/compositions', {
    method: 'POST',
    body: payload,
    token,
  });
}
