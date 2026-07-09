/**
 * TopoSonics API Server
 * Fastify-based backend for managing compositions
 */

import 'dotenv/config';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { compositionRoutes } from './routes/compositions';

/**
 * Create and configure the Fastify server
 */
async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    trustProxy: config.trustProxy,
    bodyLimit: 10485760, // 10MB
  });

  const normalizeOrigin = (origin: string, logMessage?: string): string | null => {
    try {
      return new URL(origin).origin;
    } catch (error) {
      if (logMessage) {
        fastify.log.warn({ err: error, origin }, logMessage);
      }
      return null;
    }
  };

  const allowedOrigins = new Set(
    config.corsOrigins
      .map((origin) => normalizeOrigin(origin, 'Invalid configured CORS origin'))
      .filter((origin): origin is string => Boolean(origin))
  );

  // Hosts allowed as the target of the HTTP->HTTPS redirect. Derived from the configured
  // canonical hosts plus the hosts of the allowed CORS origins, so the redirect can't be
  // pointed at an attacker-controlled Host header (open redirect).
  const allowedHosts = new Set<string>(config.canonicalHosts.map((h) => h.toLowerCase()));
  for (const normalized of allowedOrigins) {
    try {
      allowedHosts.add(new URL(normalized).host.toLowerCase());
    } catch {
      // ignore malformed origin
    }
  }

  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    hsts:
      config.enforceHttps && config.isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  });

  if (config.enforceHttps && config.isProduction) {
    fastify.addHook('onRequest', (request, reply, done) => {
      // request.protocol is proxy-aware when trustProxy is configured.
      if (request.protocol !== 'https') {
        const host = request.headers.host;
        if (host && allowedHosts.has(host.toLowerCase())) {
          reply.redirect(`https://${host}${request.url}`, 301);
        } else {
          // Never redirect to an untrusted Host header.
          reply.status(400).send({
            success: false,
            error: { code: 'INVALID_HOST', message: 'Invalid host' },
          });
        }
        return;
      }

      done();
    });
  }

  // Register CORS
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin, 'Invalid origin provided for CORS');

      if (requestOrigin && allowedOrigins.has(requestOrigin)) {
        cb(null, true);
        return;
      }

      cb(new Error('Origin not allowed by CORS policy'), false);
    },
    credentials: true,
  });

  if (config.rateLimit.enabled) {
    await fastify.register(rateLimit, {
      global: true,
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
      allowList: config.rateLimit.allowList,
    });
  }

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(compositionRoutes);

  await fastify.register(underPressure, {
    maxEventLoopDelay: config.monitoring.maxEventLoopDelay,
    maxHeapUsedBytes: config.monitoring.maxHeapUsedBytes,
    maxRssBytes: config.monitoring.maxRssBytes,
    // Only expose the public status route outside production; it reveals load internals.
    exposeStatusRoute: config.isProduction ? false : config.monitoring.statusRoute,
    healthCheck: async () => true,
  });

  // Root route
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      name: 'TopoSonics API',
      version: config.apiVersion,
      status: 'running',
      documentation: '/health',
      endpoints: {
        health: '/health',
        auth: '/auth/login',
        compositions: '/compositions',
      },
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    // Fastify schema validation errors -> 400 with a safe, generic message.
    if (
      typeof error === 'object' &&
      error !== null &&
      'validation' in error &&
      error.validation
    ) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Request validation failed' },
      });
    }

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    // Never leak internal error messages/codes (Supabase/PostgREST details, SQL states,
    // stack info) to clients on 5xx. Log the real error server-side (above) only.
    if (statusCode >= 500) {
      return reply.status(statusCode).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }

    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'ERROR';
    const message = error instanceof Error ? error.message : 'Request failed';

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    });
  });

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  let fastify: FastifyInstance;
  try {
    fastify = await createServer();

    // Start listening
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    console.log('\n🎵 TopoSonics API Server');
    console.log(`   Environment: ${config.isDevelopment ? 'development' : 'production'}`);
    console.log(`   Version: ${config.apiVersion}`);
    console.log(`   Server running at: http://localhost:${config.port}`);
    console.log(`   Health check: http://localhost:${config.port}/health\n`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  // Drain in-flight requests before exiting (SIGTERM is sent by rolling deploys), with a
  // timeout fallback so a stuck connection can't block shutdown forever.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    const timeout = setTimeout(() => {
      console.error('Graceful shutdown timed out; forcing exit.');
      process.exit(1);
    }, 10000);
    try {
      await fastify.close();
      clearTimeout(timeout);
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Start the server
start();
