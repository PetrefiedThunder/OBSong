/**
 * Authentication routes (stub implementation)
 */

import type { FastifyInstance } from 'fastify';
import type { ApiResponse, ApiErrorResponse, AuthTokenResponse } from '@toposonics/types';
import { stubLogin } from '../auth';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login
   * Stub login endpoint - accepts email and returns a fake token
   */
  fastify.post<{
    Body: { email: string };
    Reply: ApiResponse<AuthTokenResponse> | ApiErrorResponse;
  }>('/auth/login', async (request, reply) => {
    const { email } = request.body;

    if (!email || typeof email !== 'string') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Email is required and must be a string',
        },
      } as ApiErrorResponse);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Invalid email format',
        },
      } as ApiErrorResponse);
    }

    // Perform stub login
    const authResponse = await stubLogin(email);

    return reply.send({
      success: true,
      data: authResponse,
      message: 'Login successful (development mode)',
    });
  });

  /**
   * POST /auth/logout
   * Stub logout endpoint (no-op in this implementation)
   */
  fastify.post('/auth/logout', async (_request, reply) => {
    // In a real implementation, invalidate the token
    return reply.send({
      success: true,
      message: 'Logout successful',
    });
  });
}
