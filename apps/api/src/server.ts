/**
 * TopoSonics API Server
 * Fastify-based backend for managing compositions
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { compositionRoutes } from './routes/compositions';
import { compositionStore } from './store';

/**
 * Create and configure the Fastify server
 */
async function createServer() {
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
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(compositionRoutes);

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

    // Seed development data if needed
    if (config.isDevelopment) {
      const count = await compositionStore.count();
      if (count === 0) {
        await compositionStore.seed();
      }
    }

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
