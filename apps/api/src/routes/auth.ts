/**
 * Authentication routes backed by Supabase tokens
 */

import type { FastifyInstance } from 'fastify';
import type { ApiResponse, ApiErrorResponse, AuthTokenResponse } from '@toposonics/types';
import { authLoginRequestSchema } from '@toposonics/types';
import { exchangeAccessToken } from '../auth';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login
   * Validates a Supabase access token and returns the user payload
   */
  fastify.post<{
    Body: unknown;
    Reply: ApiResponse<AuthTokenResponse> | ApiErrorResponse;
  }>('/auth/login', async (request, reply) => {
    const result = authLoginRequestSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'accessToken is required and must be a string',
          details: result.error.flatten(),
        },
      });
    }

    const { accessToken } = result.data;
    const authResponse = await exchangeAccessToken(accessToken);

    if (!authResponse) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired Supabase access token',
        },
      });
    }

    return reply.send({
      success: true,
      data: authResponse,
      message: 'Token validated successfully',
    });
  });

  /**
   * POST /auth/logout
   * Client-side logout is handled by Supabase; this is a no-op
   */
  fastify.post('/auth/logout', async (_request, reply) => {
    return reply.send({
      success: true,
      message: 'Logout successful',
    });
  });
}
