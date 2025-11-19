/**
 * Health check routes
 */

import type { FastifyInstance } from 'fastify';
import type { HealthCheckResponse } from '@toposonics/types';
import { config } from '../config';

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Basic health check endpoint
   */
  fastify.get<{ Reply: HealthCheckResponse }>('/health', async (_request, reply) => {
    const uptime = process.uptime();

    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.apiVersion,
      uptime: Math.floor(uptime),
    };

    return reply.send(response);
  });

  /**
   * GET /health/detailed
   * More detailed health information
   */
  fastify.get('/health/detailed', async (_request, reply) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.apiVersion,
      uptime: Math.floor(uptime),
      environment: config.isProduction ? 'production' : 'development',
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      },
    });
  });
}
