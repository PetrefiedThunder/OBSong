/**
 * API client utilities for web application
 * Uses the shared API client with web-specific configuration
 */

import { createApiClient } from '@toposonics/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
