"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteEventSchema = exports.imageAnalysisResultSchema = void 0;
const zod_1 = require("zod");
/**
 * Runtime validation schema for {@link ImageAnalysisResult}.
 */
exports.imageAnalysisResultSchema = zod_1.z.object({
    width: zod_1.z.number().int().nonnegative(),
    height: zod_1.z.number().int().nonnegative(),
    brightnessProfile: zod_1.z.array(zod_1.z.number()),
    ridgeStrength: zod_1.z.array(zod_1.z.number()).optional(),
    depthProfile: zod_1.z.array(zod_1.z.number()).optional(),
    horizonProfile: zod_1.z.array(zod_1.z.number()).optional(),
    textureProfile: zod_1.z.array(zod_1.z.number()).optional(),
    metadata: zod_1.z
        .object({
        samplingMethod: zod_1.z.string().optional(),
        rowIndex: zod_1.z.number().int().optional(),
        timestamp: zod_1.z.number().optional(),
    })
        .optional(),
});
/**
 * Runtime validation schema for {@link NoteEvent}.
 */
exports.noteEventSchema = zod_1.z.object({
    note: zod_1.z.string(),
    start: zod_1.z.number(),
    duration: zod_1.z.number(),
    velocity: zod_1.z.number(),
    pan: zod_1.z.number().min(-1).max(1).optional(),
    trackId: zod_1.z.string().optional(),
    effects: zod_1.z
        .object({
        reverbSend: zod_1.z.number().optional(),
        filterCutoff: zod_1.z.number().optional(),
    })
        .catchall(zod_1.z.number().optional())
        .optional(),
});
//# sourceMappingURL=schemas.js.map