import { z } from 'zod';
import type { NoteEvent } from './audio';
/**
 * Runtime validation schema for {@link ImageAnalysisResult}.
 */
export declare const imageAnalysisResultSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
    brightnessProfile: z.ZodArray<z.ZodNumber, "many">;
    ridgeStrength: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    depthProfile: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    horizonProfile: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    textureProfile: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    metadata: z.ZodOptional<z.ZodObject<{
        samplingMethod: z.ZodOptional<z.ZodString>;
        rowIndex: z.ZodOptional<z.ZodNumber>;
        timestamp: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    }, {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    brightnessProfile: number[];
    metadata?: {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    } | undefined;
    ridgeStrength?: number[] | undefined;
    depthProfile?: number[] | undefined;
    horizonProfile?: number[] | undefined;
    textureProfile?: number[] | undefined;
}, {
    width: number;
    height: number;
    brightnessProfile: number[];
    metadata?: {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    } | undefined;
    ridgeStrength?: number[] | undefined;
    depthProfile?: number[] | undefined;
    horizonProfile?: number[] | undefined;
    textureProfile?: number[] | undefined;
}>;
/**
 * Runtime validation schema for {@link NoteEvent}.
 */
export declare const noteEventSchema: z.ZodType<NoteEvent>;
/**
 * Runtime-safe type derived from {@link imageAnalysisResultSchema}.
 */
export type ImageAnalysisResultDTO = z.infer<typeof imageAnalysisResultSchema>;
/**
 * Runtime-safe type derived from {@link noteEventSchema}.
 */
export type NoteEventDTO = z.infer<typeof noteEventSchema>;
//# sourceMappingURL=schemas.d.ts.map