/**
 * Authentication utilities backed by Supabase
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User, AuthTokenResponse } from '@toposonics/types';
import { supabaseAdmin } from './supabase';

export async function getUserFromToken(token: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const supabaseUser = data.user;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    displayName: (supabaseUser.user_metadata as Record<string, unknown>)?.full_name as string | undefined,
    createdAt: new Date(supabaseUser.created_at),
    lastLoginAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : undefined,
  };
}

export async function exchangeAccessToken(token: string): Promise<AuthTokenResponse | null> {
  const user = await getUserFromToken(token);
  if (!user) return null;

  return {
    token,
    user,
    expiresAt: undefined,
  };
}

/**
 * Fastify middleware to require authentication using Supabase access tokens
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
  const user = await getUserFromToken(token);

  if (!user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired Supabase token',
      },
    });
  }

  (request as any).userId = user.id;
  (request as any).user = user;
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
      const user = await getUserFromToken(token);
      if (user) {
        (request as any).userId = user.id;
        (request as any).user = user;
      }
    }
  }
}

// Type augmentation for FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: User;
  }
}
