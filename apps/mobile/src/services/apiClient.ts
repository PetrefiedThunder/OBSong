/**
 * API client for mobile application
 * Uses the shared API client with mobile-specific configuration
 * Automatically injects authentication tokens from Supabase session
 */

import { createApiClient } from '@toposonics/shared';
import type { CreateCompositionDTO, UpdateCompositionDTO, Composition } from '@toposonics/types';
import { API_URL } from '../config';
import { supabase } from '../auth/supabaseClient';

/**
 * Get the current authentication token from Supabase session
 * Returns null if the user is not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Base API client instance
 */
const baseClient = createApiClient({ baseUrl: API_URL });

/**
 * Mobile API client with automatic token injection
 * All methods automatically retrieve and attach the current user's auth token
 */
export const apiClient = {
  /**
   * Fetch all compositions
   * Automatically attaches auth token if user is signed in
   */
  async fetchCompositions(): Promise<Composition[]> {
    const token = await getAuthToken();
    return baseClient.fetchCompositions(token);
  },

  /**
   * Fetch a single composition by ID
   * Automatically attaches auth token if user is signed in
   */
  async fetchComposition(id: string): Promise<Composition> {
    const token = await getAuthToken();
    return baseClient.fetchComposition(id, token);
  },

  /**
   * Create a new composition
   * Requires authentication - throws error if user is not signed in
   */
  async createComposition(payload: Omit<CreateCompositionDTO, 'userId'>): Promise<Composition> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required to create compositions');
    }
    return baseClient.createComposition(payload, token);
  },

  /**
   * Update a composition
   * Requires authentication - throws error if user is not signed in
   */
  async updateComposition(id: string, updates: UpdateCompositionDTO): Promise<Composition> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required to update compositions');
    }
    return baseClient.updateComposition(id, updates, token);
  },

  /**
   * Delete a composition
   * Requires authentication - throws error if user is not signed in
   */
  async deleteComposition(id: string): Promise<void> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required to delete compositions');
    }
    return baseClient.deleteComposition(id, token);
  },
};

// Export individual methods for convenience
export const {
  fetchCompositions,
  fetchComposition,
  createComposition,
  updateComposition,
  deleteComposition,
} = apiClient;
