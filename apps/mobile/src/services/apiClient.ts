/**
 * API client for mobile application
 * Uses the shared API client with mobile-specific configuration
 * Automatically injects authentication tokens from Supabase session
 */

import { createApiClient } from '@toposonics/shared';
import type {
  CreateCompositionDTO,
  UpdateCompositionDTO,
  Composition,
  CompositionSummary,
} from '@toposonics/types';
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
   * Fetch the user's composition summaries (paginated; no noteEvents/imageData blobs)
   * Automatically attaches auth token if user is signed in
   */
  async fetchCompositions(): Promise<CompositionSummary[]> {
    const token = await getAuthToken();
    return baseClient.fetchCompositions(token);
  },

  /**
   * Fetch the entire composition library, paging past the server's page cap so
   * libraries larger than one page don't lose older saves from the list.
   */
  async fetchAllCompositions(): Promise<CompositionSummary[]> {
    const token = await getAuthToken();
    return baseClient.fetchAllCompositions(token);
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
  fetchAllCompositions,
  fetchComposition,
  createComposition,
  updateComposition,
  deleteComposition,
} = apiClient;
