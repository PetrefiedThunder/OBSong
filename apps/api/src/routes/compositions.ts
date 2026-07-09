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

// JSON schema for :id params — rejects non-UUIDs with a 400 instead of letting Postgres
// raise 22P02 (which previously surfaced as a 500).
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

// Shared body field constraints. additionalProperties is allowed at the note-event level
// but the top-level body is closed so unknown keys can't be smuggled in.
const noteEventsSchema = {
  type: 'array',
  maxItems: 100000,
  items: { type: 'object' },
} as const;

const createBodySchema = {
  type: 'object',
  required: ['title', 'noteEvents', 'mappingMode', 'key', 'scale'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    noteEvents: noteEventsSchema,
    mappingMode: { type: 'string', maxLength: 64 },
    key: { type: 'string', maxLength: 8 },
    scale: { type: 'string', maxLength: 64 },
    presetId: { type: 'string', maxLength: 64 },
    tempo: { type: 'number', minimum: 1, maximum: 1000 },
    imageThumbnail: { type: 'string', maxLength: 5_000_000 },
    imageData: { type: 'string', maxLength: 9_000_000 },
    metadata: { type: 'object' },
  },
} as const;

const updateBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: createBodySchema.properties,
} as const;

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
        const compositions = await listCompositions(request.userId as string);

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
      schema: { params: idParamsSchema },
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
      schema: { body: createBodySchema },
    },
    async (request, reply) => {
      const data = request.body;

      try {
        // Field presence/type/length is enforced by the JSON schema above.
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
      schema: { params: idParamsSchema, body: updateBodySchema },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      try {
        const existing = await getCompositionById(id);

        // Return 404 (not 403) for both missing and foreign rows so an attacker can't
        // distinguish "doesn't exist" from "exists but owned by someone else" (matches GET).
        if (!existing || existing.userId !== request.userId) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Composition with ID ${id} not found`,
            },
          });
        }

        const updated = await updateComposition(id, request.userId!, data);

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
      schema: { params: idParamsSchema },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const existing = await getCompositionById(id);

        // 404 for both missing and foreign rows (avoid id enumeration; matches GET/PUT).
        if (!existing || existing.userId !== request.userId) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Composition with ID ${id} not found`,
            },
          });
        }

        const deleted = await deleteComposition(id, request.userId!);

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
