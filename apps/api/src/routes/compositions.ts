/**
 * Composition CRUD routes
 */

import type { FastifyInstance } from 'fastify';
import type {
  Composition,
  CompositionSummary,
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
// (forward compat for new per-note fields) but the top-level body is closed so unknown
// keys can't be smuggled in. The core playback/MIDI-export fields are required and typed
// so a saved composition can never hold events that crash the players later.
const noteEventsSchema = {
  type: 'array',
  maxItems: 100000,
  items: {
    type: 'object',
    required: ['note', 'start', 'duration', 'velocity'],
    properties: {
      note: { type: 'string', minLength: 2, maxLength: 8 },
      start: { type: 'number', minimum: 0 },
      duration: { type: 'number', exclusiveMinimum: 0 },
      velocity: { type: 'number', minimum: 0, maximum: 1 },
      pan: { type: 'number', minimum: -1, maximum: 1 },
      trackId: { type: 'string', maxLength: 32 },
      effects: { type: 'object' },
    },
  },
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
    // Keep the combined field maxima below the server bodyLimit (10 MB, server.ts) so a
    // request carrying both near their limits is validated, not rejected with a 413.
    imageThumbnail: { type: 'string', maxLength: 500_000 },
    imageData: { type: 'string', maxLength: 8_000_000 },
    metadata: { type: 'object' },
  },
} as const;

const updateBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: createBodySchema.properties,
} as const;

// Pagination for the list endpoint. Bounded limit keeps a single response well under the
// API's under-pressure heap cap; unknown query keys are stripped by AJV's removeAdditional.
// `cursor` is the additive keyset-pagination param (#124); offset still works for legacy
// clients that don't send it.
const listQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    cursor: { type: 'string', minLength: 1, maxLength: 512 },
  },
} as const;

export async function compositionRoutes(fastify: FastifyInstance) {
  /**
   * GET /compositions
   * Get the authenticated user's composition summaries (paginated). Full noteEvents and
   * imageData blobs are only served by GET /compositions/:id.
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; cursor?: string };
    Reply:
      | (ApiResponse<CompositionSummary[]> & { nextCursor?: string })
      | ApiErrorResponse;
  }>(
    '/compositions',
    {
      preHandler: requireAuth,
      schema: { querystring: listQuerySchema },
    },
    async (request, reply) => {
      try {
        const { limit = 50, offset = 0, cursor } = request.query;
        const result = await listCompositions(request.userId as string, {
          limit,
          // Cursor mode ignores offset entirely (keyset over (created_at, id) DESC).
          ...(cursor ? { cursor } : { offset }),
        });

        // Additive envelope (#124): `data` stays an array for existing offset clients;
        // cursor clients follow `nextCursor` until it is absent.
        return reply.send({
          success: true,
          data: result.compositions,
          ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        });
      } catch (error) {
        fastify.log.error(error);
        if (error instanceof Error && error.message === 'Invalid cursor') {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_CURSOR',
              message: 'Invalid cursor',
            },
          });
        }
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
