import { z } from 'zod';
import type { ImageAnalysisResult } from './image';
import type { NoteEvent } from './audio';
import type { ApiErrorResponse } from './api';
import type {
  CompositionResponseDTO,
  CreateCompositionDTO,
  UpdateCompositionDTO,
} from './composition';

export const mappingModeValues = ['LINEAR_LANDSCAPE', 'DEPTH_RIDGE', 'MULTI_VOICE'] as const;
export const keyValues = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const scaleValues = [
  'C_MAJOR',
  'C_MINOR',
  'D_MAJOR',
  'E_MINOR',
  'A_MINOR',
  'A_SHARP_MINOR',
  'G_MAJOR',
  'C_PENTATONIC',
  'A_MINOR_PENTATONIC',
  'C_BLUES',
  'D_DORIAN',
  'A_DORIAN',
  'C_MIXOLYDIAN',
  'E_PHRYGIAN',
] as const;

const isoDateStringSchema = z.string().datetime({ offset: true });
const noteNameSchema = z
  .string()
  .regex(/^[A-G](?:#|b)?-?\d$/, 'Expected scientific pitch notation, for example C4 or A#5');
const boundedString = (max: number) => z.string().trim().min(1).max(max);
const optionalBoundedString = (max: number) => z.string().trim().max(max).optional();
const protectedCompositionFields = ['id', 'userId', 'createdAt', 'updatedAt'] as const;

function rejectProtectedFields(value: Record<string, unknown>, ctx: z.RefinementCtx) {
  for (const field of protectedCompositionFields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is managed by the API and cannot be provided`,
      });
    }
  }
}

/**
 * Runtime validation schema for {@link ImageAnalysisResult}.
 */
export const imageAnalysisResultSchema = z.object({
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  brightnessProfile: z.array(z.number()),
  ridgeStrength: z.array(z.number()).optional(),
  depthProfile: z.array(z.number()).optional(),
  horizonProfile: z.array(z.number()).optional(),
  textureProfile: z.array(z.number()).optional(),
  metadata: z
    .object({
      samplingMethod: z.string().optional(),
      rowIndex: z.number().int().optional(),
      timestamp: z.number().optional(),
      depthSource: z
        .enum(['ARCORE_DEPTH_API', 'TOF_SENSOR', 'SIMULATED', 'HEURISTIC', 'UNKNOWN'])
        .optional(),
      depthUnit: z.enum(['meters', 'millimeters', 'normalized', 'unknown']).optional(),
      depthCaptureTimestamp: z.number().optional(),
    })
    .optional(),
}) satisfies z.ZodType<ImageAnalysisResult>;

/**
 * Runtime validation schema for {@link NoteEvent}.
 */
export const noteEventSchema: z.ZodType<NoteEvent> = z
  .object({
    note: noteNameSchema,
    start: z.number().finite().min(0).max(3600),
    duration: z.number().finite().positive().max(256),
    velocity: z.number().finite().min(0).max(1),
    pan: z.number().min(-1).max(1).optional(),
    trackId: z.string().trim().min(1).max(64).optional(),
    effects: z
      .object({
        reverbSend: z.number().finite().min(0).max(1).optional(),
        filterCutoff: z.number().finite().min(0).max(1).optional(),
      })
      .catchall(z.number().finite().min(0).max(1).optional())
      .optional(),
  });

const compositionMetadataSchema = z
  .object({
    imageWidth: z.number().int().positive().max(100000).optional(),
    imageHeight: z.number().int().positive().max(100000).optional(),
    noteCount: z.number().int().nonnegative().max(5000).optional(),
    duration: z.number().finite().nonnegative().max(86400).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .strict()
  .optional();

export const compositionPayloadSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    title: boundedString(120),
    description: optionalBoundedString(1000),
    noteEvents: z.array(noteEventSchema).min(1).max(5000),
    mappingMode: z.enum(mappingModeValues),
    key: z.enum(keyValues),
    scale: z.enum(scaleValues),
    presetId: z.string().trim().min(1).max(120).optional(),
    tempo: z.number().finite().min(20).max(300).optional(),
    imageThumbnail: z.string().max(262144).optional(),
    imageData: z.string().max(8 * 1024 * 1024).optional(),
    metadata: compositionMetadataSchema,
  })
  .strict();

export const compositionSummarySchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().min(1),
    schemaVersion: z.literal(1),
    title: boundedString(120),
    description: optionalBoundedString(1000),
    mappingMode: z.enum(mappingModeValues),
    key: z.enum(keyValues),
    scale: z.enum(scaleValues),
    presetId: z.string().trim().min(1).max(120).optional(),
    tempo: z.number().finite().min(20).max(300).optional(),
    imageThumbnail: z.string().max(262144).optional(),
    metadata: compositionMetadataSchema,
    createdAt: isoDateStringSchema,
    updatedAt: isoDateStringSchema,
  })
  .strict();

export const compositionResponseSchema = compositionPayloadSchema
  .extend({
    id: z.string().uuid(),
    userId: z.string().min(1),
    createdAt: isoDateStringSchema,
    updatedAt: isoDateStringSchema,
  })
  .strict() satisfies z.ZodType<CompositionResponseDTO, z.ZodTypeDef, unknown>;

export const createCompositionRequestSchema: z.ZodType<Omit<CreateCompositionDTO, 'userId'>> =
  compositionPayloadSchema.passthrough().superRefine(rejectProtectedFields).pipe(compositionPayloadSchema);

export const updateCompositionRequestSchema: z.ZodType<UpdateCompositionDTO> =
  compositionPayloadSchema
    .partial()
    .passthrough()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field must be provided',
    })
    .superRefine(rejectProtectedFields)
    .pipe(compositionPayloadSchema.partial());

export const authLoginRequestSchema = z
  .object({
    accessToken: z.string().trim().min(1).max(8192),
  })
  .strict();

export const apiSuccessSchema = z
  .object({
    success: z.literal(true),
    data: z.any(),
    message: z.string().optional(),
  })
  .strict();

export const apiErrorSchema: z.ZodType<ApiErrorResponse> = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();

/**
 * Runtime-safe type derived from {@link imageAnalysisResultSchema}.
 */
export type ImageAnalysisResultDTO = z.infer<typeof imageAnalysisResultSchema>;

/**
 * Runtime-safe type derived from {@link noteEventSchema}.
 */
export type NoteEventDTO = z.infer<typeof noteEventSchema>;
export type CompositionPayloadDTO = z.infer<typeof compositionPayloadSchema>;
export type CompositionSummaryDTO = z.infer<typeof compositionSummarySchema>;
export type CreateCompositionRequestDTO = z.infer<typeof createCompositionRequestSchema>;
export type UpdateCompositionRequestDTO = z.infer<typeof updateCompositionRequestSchema>;
export type AuthLoginRequestDTO = z.infer<typeof authLoginRequestSchema>;
export type CompositionWireDTO = z.infer<typeof compositionResponseSchema>;
