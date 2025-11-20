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
  });

  const allowedOrigins = new Set(config.corsOrigins);

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
      const forwardedProto = request.headers['x-forwarded-proto'];
      const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto || request.protocol;

      if (protocol !== 'https' && request.headers.host) {
        reply.redirect(301, `https://${request.headers.host}${request.url}`);
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

      if (allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }

      try {
        const requestUrl = new URL(origin);
        const isAllowed = Array.from(allowedOrigins).some((allowed) => {
          const allowedUrl = new URL(allowed);
          return allowedUrl.hostname === requestUrl.hostname;
        });

        if (isAllowed) {
          cb(null, true);
          return;
        }
      } catch (error) {
        fastify.log.warn({ err: error, origin }, 'Invalid origin provided for CORS');
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
    exposeStatusRoute: config.monitoring.statusRoute,
    healthCheck: async () => true,
    onExceeding: () => fastify.log.warn('Server nearing resource limits'),
    onExceeded: () => fastify.log.error('Server resource limits exceeded'),
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

    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    });
  });

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    const fastify = await createServer();

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
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
start();
