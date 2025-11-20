import { z } from 'zod';
import type { ImageAnalysisResult } from './image';
import type { NoteEvent } from './audio';

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
    })
    .optional(),
}) satisfies z.ZodType<ImageAnalysisResult>;

/**
 * Runtime validation schema for {@link NoteEvent}.
 */
export const noteEventSchema = z.object({
  note: z.string(),
  start: z.number(),
  duration: z.number(),
  velocity: z.number(),
  pan: z.number().min(-1).max(1).optional(),
  trackId: z.string().optional(),
  effects: z
    .object({
      reverbSend: z.number().optional(),
      filterCutoff: z.number().optional(),
    })
    .catchall(z.number().optional())
    .optional(),
}) satisfies z.ZodType<NoteEvent>;

/**
 * Runtime-safe type derived from {@link imageAnalysisResultSchema}.
 */
export type ImageAnalysisResultDTO = z.infer<typeof imageAnalysisResultSchema>;

/**
 * Runtime-safe type derived from {@link noteEventSchema}.
 */
export type NoteEventDTO = z.infer<typeof noteEventSchema>;
