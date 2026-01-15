/**
 * API client utilities for web application
 * Uses the shared API client with web-specific configuration
 */

import { createApiClient } from '@toposonics/shared';
import { API_URL } from '@toposonics/shared/dist/config';

/**
 * Web application API client instance
 */
const apiClient = createApiClient({ baseUrl: API_URL });

export const {
  fetchCompositions,
  fetchComposition,
  createComposition,
  updateComposition,
  deleteComposition,
} = apiClient;
