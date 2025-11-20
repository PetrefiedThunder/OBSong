import { z } from 'zod';
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
    ridgeStrength?: number[] | undefined;
    depthProfile?: number[] | undefined;
    horizonProfile?: number[] | undefined;
    textureProfile?: number[] | undefined;
    metadata?: {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    brightnessProfile: number[];
    ridgeStrength?: number[] | undefined;
    depthProfile?: number[] | undefined;
    horizonProfile?: number[] | undefined;
    textureProfile?: number[] | undefined;
    metadata?: {
        samplingMethod?: string | undefined;
        rowIndex?: number | undefined;
        timestamp?: number | undefined;
    } | undefined;
}>;
/**
 * Runtime validation schema for {@link NoteEvent}.
 */
export declare const noteEventSchema: z.ZodObject<{
    note: z.ZodString;
    start: z.ZodNumber;
    duration: z.ZodNumber;
    velocity: z.ZodNumber;
    pan: z.ZodOptional<z.ZodNumber>;
    trackId: z.ZodOptional<z.ZodString>;
    effects: z.ZodOptional<z.ZodObject<{
        reverbSend: z.ZodOptional<z.ZodNumber>;
        filterCutoff: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodOptional<z.ZodNumber>, z.objectOutputType<{
        reverbSend: z.ZodOptional<z.ZodNumber>;
        filterCutoff: z.ZodOptional<z.ZodNumber>;
    }, z.ZodOptional<z.ZodNumber>, "strip">, z.objectInputType<{
        reverbSend: z.ZodOptional<z.ZodNumber>;
        filterCutoff: z.ZodOptional<z.ZodNumber>;
    }, z.ZodOptional<z.ZodNumber>, "strip">>>;
}, "strip", z.ZodTypeAny, {
    note: string;
    start: number;
    duration: number;
    velocity: number;
    pan?: number | undefined;
    trackId?: string | undefined;
    effects?: z.objectOutputType<{
        reverbSend: z.ZodOptional<z.ZodNumber>;
        filterCutoff: z.ZodOptional<z.ZodNumber>;
    }, z.ZodOptional<z.ZodNumber>, "strip"> | undefined;
}, {
    note: string;
    start: number;
    duration: number;
    velocity: number;
    pan?: number | undefined;
    trackId?: string | undefined;
    effects?: z.objectInputType<{
        reverbSend: z.ZodOptional<z.ZodNumber>;
        filterCutoff: z.ZodOptional<z.ZodNumber>;
    }, z.ZodOptional<z.ZodNumber>, "strip"> | undefined;
}>;
/**
 * Runtime-safe type derived from {@link imageAnalysisResultSchema}.
 */
export type ImageAnalysisResultDTO = z.infer<typeof imageAnalysisResultSchema>;
/**
 * Runtime-safe type derived from {@link noteEventSchema}.
 */
export type NoteEventDTO = z.infer<typeof noteEventSchema>;
//# sourceMappingURL=schemas.d.ts.map