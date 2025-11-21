/**
 * API client for mobile application
 * Uses the shared API client with mobile-specific configuration
 */

import { createApiClient } from '@toposonics/shared';
import { API_URL } from '../config';

/**
 * Mobile application API client instance
 */
const apiClient = createApiClient({ baseUrl: API_URL });

export const {
  fetchCompositions,
  fetchComposition,
  createComposition,
  updateComposition,
  deleteComposition,
} = apiClient;

// Re-export for convenience
export { apiClient };

