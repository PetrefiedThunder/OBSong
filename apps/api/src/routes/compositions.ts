/**
 * Composition CRUD routes
 */

import type { FastifyInstance } from 'fastify';
import type {
  Composition,
  CreateCompositionDTO,
  UpdateCompositionDTO,
  ApiResponse,
  ApiErrorResponse,
} from '@toposonics/types';
import { requireAuth } from '../auth';
import {
  listCompositions,
  getCompositionById,
  createComposition,
  updateComposition,
  deleteComposition,
} from '../services/compositions';

export async function compositionRoutes(fastify: FastifyInstance) {
  /**
   * GET /compositions
   * Get all compositions (optionally filtered by authenticated user)
   */
  fastify.get<{ Reply: ApiResponse<Composition[]> | ApiErrorResponse }>(
    '/compositions',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const compositions = await listCompositions(request.userId);

        return reply.send({
          success: true,
          data: compositions,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch compositions',
          },
        });
      }
    }
  );

  /**
   * GET /compositions/:id
   * Get a specific composition by ID
   */
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<Composition> | ApiErrorResponse;
  }>(
    '/compositions/:id',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const composition = await getCompositionById(id);

        if (!composition || composition.userId !== request.userId) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Composition with ID ${id} not found`,
            },
          });
        }

        return reply.send({
          success: true,
          data: composition,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch composition',
          },
        });
      }
    }
  );

  /**
   * POST /compositions
   * Create a new composition (requires auth)
   */
  fastify.post<{
    Body: Omit<CreateCompositionDTO, 'userId'>;
    Reply: ApiResponse<Composition> | ApiErrorResponse;
  }>(
    '/compositions',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const data = request.body;

      try {
        // Validate required fields
        if (!data.title || !data.noteEvents || !data.mappingMode || !data.key || !data.scale) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Missing required fields: title, noteEvents, mappingMode, key, scale',
            },
          });
        }

        // Create composition with authenticated user's ID
        const composition = await createComposition(request.userId!, data);

        return reply.status(201).send({
          success: true,
          data: composition,
          message: 'Composition created successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create composition',
          },
        });
      }
    }
  );

  /**
   * PUT /compositions/:id
   * Update an existing composition (requires auth and ownership)
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateCompositionDTO;
    Reply: ApiResponse<Composition> | ApiErrorResponse;
  }>(
    '/compositions/:id',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      try {
        const existing = await getCompositionById(id);

        if (!existing) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Composition with ID ${id} not found`,
            },
          });
        }

        // Check ownership
        if (existing.userId !== request.userId) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to update this composition',
            },
          });
        }

        const updated = await updateComposition(id, data);

        if (!updated) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'UPDATE_FAILED',
              message: 'Failed to update composition',
            },
          });
        }

        return reply.send({
          success: true,
          data: updated,
          message: 'Composition updated successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update composition',
          },
        });
      }
    }
  );

  /**
   * DELETE /compositions/:id
   * Delete a composition (requires auth and ownership)
   */
  fastify.delete<{
    Params: { id: string };
    Reply: ApiResponse<{ id: string }> | ApiErrorResponse;
  }>(
    '/compositions/:id',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const existing = await getCompositionById(id);

        if (!existing) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Composition with ID ${id} not found`,
            },
          });
        }

        // Check ownership
        if (existing.userId !== request.userId) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete this composition',
            },
          });
        }

        const deleted = await deleteComposition(id);

        if (!deleted) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'DELETE_FAILED',
              message: 'Failed to delete composition',
            },
          });
        }

        return reply.send({
          success: true,
          data: { id },
          message: 'Composition deleted successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete composition',
          },
        });
      }
    }
  );
}
