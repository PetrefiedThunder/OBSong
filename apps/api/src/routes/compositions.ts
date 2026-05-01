/**
 * Composition CRUD routes
 */

import type { FastifyInstance } from 'fastify';
import type {
  CompositionResponseDTO,
  ApiResponse,
  ApiErrorResponse,
} from '@toposonics/types';
import {
  createCompositionRequestSchema,
  updateCompositionRequestSchema,
} from '@toposonics/types';
import { requireAuth } from '../auth';
import {
  listCompositions,
  getCompositionById,
  createComposition,
  updateComposition,
  deleteComposition,
  CompositionDataValidationError,
} from '../services/compositions';

function invalidInput(details: unknown, message = 'Invalid composition payload'): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: 'INVALID_INPUT',
      message,
      details,
    },
  };
}

function corruptComposition(error: CompositionDataValidationError): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: 'COMPOSITION_DATA_INVALID',
      message: 'Stored composition data is invalid',
      details: {
        compositionId: error.compositionId,
        validation: error.details,
      },
    },
  };
}

export async function compositionRoutes(fastify: FastifyInstance) {
  /**
   * GET /compositions
   * Get all compositions (optionally filtered by authenticated user)
   */
  fastify.get<{ Reply: ApiResponse<CompositionResponseDTO[]> | ApiErrorResponse }>(
    '/compositions',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const compositions = await listCompositions(request.userId!);

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
    Reply: ApiResponse<CompositionResponseDTO> | ApiErrorResponse;
  }>(
    '/compositions/:id',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const composition = await getCompositionById(request.userId!, id);

        if (!composition) {
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
        if (error instanceof CompositionDataValidationError) {
          return reply.status(409).send(corruptComposition(error));
        }

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
    Body: unknown;
    Reply: ApiResponse<CompositionResponseDTO> | ApiErrorResponse;
  }>(
    '/compositions',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const result = createCompositionRequestSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send(invalidInput(result.error.flatten()));
      }

      const data = result.data;

      try {
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
    Body: unknown;
    Reply: ApiResponse<CompositionResponseDTO> | ApiErrorResponse;
  }>(
    '/compositions/:id',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params;
      const result = updateCompositionRequestSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send(invalidInput(result.error.flatten()));
      }

      const data = result.data;

      try {
        const updated = await updateComposition(request.userId!, id, data);

        if (!updated) {
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
          data: updated,
          message: 'Composition updated successfully',
        });
      } catch (error) {
        if (error instanceof CompositionDataValidationError) {
          return reply.status(409).send(corruptComposition(error));
        }

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
        const deleted = await deleteComposition(request.userId!, id);

        if (!deleted) {
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
