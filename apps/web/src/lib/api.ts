/**
 * API client utilities
 */

import type { Composition, CreateCompositionDTO, UpdateCompositionDTO } from '@toposonics/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get authorization headers
 */
function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch all compositions
 */
export async function fetchCompositions(token?: string | null): Promise<Composition[]> {
  const response = await fetch(`${API_URL}/compositions`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch compositions');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch a single composition by ID
 */
export async function fetchComposition(
  id: string,
  token?: string | null
): Promise<Composition> {
  const response = await fetch(`${API_URL}/compositions/${id}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch composition');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a new composition
 */
export async function createComposition(
  composition: CreateCompositionDTO,
  token: string
): Promise<Composition> {
  const response = await fetch(`${API_URL}/compositions`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(composition),
  });

  if (!response.ok) {
    throw new Error('Failed to create composition');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update a composition
 */
export async function updateComposition(
  id: string,
  updates: UpdateCompositionDTO,
  token: string
): Promise<Composition> {
  const response = await fetch(`${API_URL}/compositions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update composition');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete a composition
 */
export async function deleteComposition(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/compositions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to delete composition');
  }
}
