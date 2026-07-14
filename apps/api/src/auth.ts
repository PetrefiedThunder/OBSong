/**
 * Authentication utilities backed by Supabase
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User, AuthTokenResponse } from '@toposonics/types';
import { supabaseAdmin } from './supabase';

// Short-TTL cache of token -> resolved user so repeated requests from the same client
// don't each make a blocking network call to Supabase Auth (which would double per-request
// latency and couple every authed endpoint to Supabase availability / rate limits). A
// 30s TTL bounds token-revocation lag; the size cap prevents unbounded growth.
const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX = 5_000;
const tokenCache = new Map<string, { user: User | null; expiresAt: number }>();

export async function getUserFromToken(token: string): Promise<User | null> {
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  let user: User | null = null;
  if (!error && data.user) {
    const supabaseUser = data.user;
    user = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: (supabaseUser.user_metadata as Record<string, unknown>)?.full_name as
        | string
        | undefined,
      createdAt: new Date(supabaseUser.created_at),
      lastLoginAt: supabaseUser.last_sign_in_at
        ? new Date(supabaseUser.last_sign_in_at)
        : undefined,
    };
  }

  // Bound the cache size (drop the oldest entry — Map preserves insertion order).
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const oldest = tokenCache.keys().next().value;
    if (oldest !== undefined) tokenCache.delete(oldest);
  }
  tokenCache.set(token, { user, expiresAt: now + TOKEN_CACHE_TTL_MS });

  return user;
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

  request.userId = user.id;
  request.user = user;
}

// Type augmentation for FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: User;
  }
}
