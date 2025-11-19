/**
 * Authentication utilities (stub implementation)
 * In production, integrate with Auth0, Clerk, or similar
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User, AuthTokenResponse } from '@toposonics/types';

/**
 * Stub user database
 * In production, this would be a real database
 */
const STUB_USERS: Map<string, User> = new Map([
  [
    'demo@toposonics.com',
    {
      id: 'user-demo',
      email: 'demo@toposonics.com',
      displayName: 'Demo User',
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
    },
  ],
]);

/**
 * Stub token storage (session tokens)
 * In production, use JWT or session storage
 */
const ACTIVE_TOKENS: Map<string, string> = new Map(); // token -> userId

/**
 * Stub login function
 * Accepts an email and returns a fake token
 */
export async function stubLogin(email: string): Promise<AuthTokenResponse> {
  const { nanoid } = await import('nanoid');

  // Get or create user
  let user = STUB_USERS.get(email);

  if (!user) {
    user = {
      id: `user-${nanoid(8)}`,
      email,
      displayName: email.split('@')[0],
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    STUB_USERS.set(email, user);
  }

  // Update last login
  user.lastLoginAt = new Date();

  // Generate fake token
  const token = `fake-${nanoid(32)}`;
  ACTIVE_TOKENS.set(token, user.id);

  return {
    token,
    user,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
}

/**
 * Verify a token and return the user ID
 */
export function verifyToken(token: string): string | null {
  return ACTIVE_TOKENS.get(token) || null;
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | null {
  for (const user of STUB_USERS.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}

/**
 * Fastify middleware to require authentication
 * Extracts token from Authorization header
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing authorization header',
      },
    });
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_AUTH_HEADER',
        message: 'Authorization header must be "Bearer <token>"',
      },
    });
  }

  const token = parts[1];
  const userId = verifyToken(token);

  if (!userId) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  // Attach user ID to request for downstream handlers
  (request as any).userId = userId;
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const userId = verifyToken(token);
      if (userId) {
        (request as any).userId = userId;
      }
    }
  }
}

// Type augmentation for FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}
