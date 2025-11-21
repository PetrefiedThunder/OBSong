/**
 * Image analysis outputs used to derive musical mappings.
 */
export interface ImageAnalysisResult {
    /** Image width in pixels. */
    width: number;
    /** Image height in pixels. */
    height: number;
    /** Brightness values (0-255) sampled horizontally across the image. */
    brightnessProfile: number[];
    /** Optional: Strength of ridge/edge features at each horizontal position (0-1). */
    ridgeStrength?: number[];
    /** Optional: Estimated depth values at each horizontal position (0-1, higher = closer). */
    depthProfile?: number[];
    /** Optional: Horizon/base contour height at each horizontal position (0-1). */
    horizonProfile?: number[];
    /** Optional: Texture/variance values at each horizontal position (0-1). */
    textureProfile?: number[];
    /** Optional: Additional metadata about the analysis. */
    metadata?: {
        /** Sampling method used to extract the profiles. */
        samplingMethod?: string;
        /** Row index used for sampling. */
        rowIndex?: number;
        /** Timestamp when the analysis was generated. */
        timestamp?: number;
    };
}
//# sourceMappingURL=image.d.ts.map