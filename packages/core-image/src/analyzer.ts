/**
 * Main image analysis functions
 * Combines brightness and depth utilities into complete analysis results
 */

import type { ImageAnalysisResult } from '@toposonics/types';
import {
  computeBrightnessProfileFromRow,
  computeAveragedBrightnessProfile,
  downsampleProfile,
} from './brightness';
import { computeSimpleDepthProfile, detectRidges, smoothProfile } from './depth';
import { extractHorizonContour } from './horizon';
import { computeTextureProfile } from './texture';

/**
 * Analyze an image for LINEAR_LANDSCAPE mapping mode
 * Extracts a horizontal brightness profile from the center of the image
 *
 * @param pixels - Flattened RGBA pixel array from canvas or image buffer
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Analysis options
 * @returns ImageAnalysisResult with brightness and depth profiles
 */
export function analyzeImageForLinearLandscape(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  options: {
    /** Which row to sample (default: middle) */
    rowIndex?: number;
    /** Whether to average multiple rows (default: false) */
    averageRows?: boolean;
    /** Number of rows to average if enabled */
    rowsToAverage?: number;
    /** Maximum samples in output profile (downsamples if needed) */
    maxSamples?: number;
    /** Whether to compute depth profile */
    includeDepth?: boolean;
    /** Whether to detect ridges */
    includeRidges?: boolean;
  } = {}
): ImageAnalysisResult {
  const {
    rowIndex = Math.floor(height / 2),
    averageRows = false,
    rowsToAverage = 5,
    maxSamples = 128,
    includeDepth = true,
    includeRidges = false,
  } = options;

  // Extract brightness profile
  let brightnessProfile: number[];

  if (averageRows) {
    // Average multiple rows around the center
    const startRow = Math.max(0, rowIndex - Math.floor(rowsToAverage / 2));
    const endRow = Math.min(height, rowIndex + Math.ceil(rowsToAverage / 2));
    brightnessProfile = computeAveragedBrightnessProfile(pixels, width, height, startRow, endRow);
  } else {
    // Single row
    brightnessProfile = computeBrightnessProfileFromRow(pixels, width, height, rowIndex);
  }

  // Downsample if needed
  if (brightnessProfile.length > maxSamples) {
    brightnessProfile = downsampleProfile(brightnessProfile, maxSamples);
  }

  // Build result
  const result: ImageAnalysisResult = {
    width,
    height,
    brightnessProfile,
    metadata: {
      samplingMethod: averageRows ? 'averaged' : 'single-row',
      rowIndex,
      timestamp: Date.now(),
    },
  };

  // Optional: Compute depth profile
  if (includeDepth) {
    result.depthProfile = computeSimpleDepthProfile(brightnessProfile);
  }

  // Optional: Detect ridges
  if (includeRidges) {
    result.ridgeStrength = detectRidges(brightnessProfile);
  }

  return result;
}

/**
 * Analyze an image for DEPTH_RIDGE mapping mode (future implementation)
 * This is a more advanced mode that will use edge detection and depth estimation
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @param options - Analysis options
 * @returns ImageAnalysisResult with enhanced depth and ridge data
 */
export function analyzeImageForDepthRidge(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  options: {
    ridgeThreshold?: number;
    smoothingWindow?: number;
  } = {}
): ImageAnalysisResult {
  // TODO: Implement advanced depth-ridge analysis
  // For now, use the linear landscape analysis with ridge detection
  const result = analyzeImageForLinearLandscape(pixels, width, height, {
    includeDepth: true,
    includeRidges: true,
    averageRows: true,
  });

  // TODO: Add more sophisticated analysis:
  // - Multi-row ridge detection
  // - Contour following
  // - Peak prominence calculation
  // - Spatial feature clustering

  if (options.smoothingWindow && result.ridgeStrength) {
    result.ridgeStrength = smoothProfile(result.ridgeStrength, options.smoothingWindow);
  }

  return result;
}

/**
 * Analyze an image for MULTI_VOICE mapping mode
 * Extracts all features needed for multi-layered soundscape generation
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @param options - Analysis options
 * @returns Complete ImageAnalysisResult with all voice-specific features
 */
export function analyzeImageForMultiVoice(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  options: {
    /** Maximum samples for brightness/ridge profiles */
    maxSamples?: number;
    /** Smoothing window for horizon */
    horizonSmoothing?: number;
  } = {}
): ImageAnalysisResult {
  const {
    maxSamples = 128,
    horizonSmoothing = 7,
  } = options;

  // 1. Extract brightness profile (for melody)
  const centerRow = Math.floor(height / 2);
  let brightnessProfile = computeAveragedBrightnessProfile(
    pixels,
    width,
    height,
    centerRow - 2,
    centerRow + 3
  );

  // Downsample brightness if needed
  if (brightnessProfile.length > maxSamples) {
    brightnessProfile = downsampleProfile(brightnessProfile, maxSamples);
  }

  // 2. Detect ridges (for melody emphasis)
  const ridgeStrength = detectRidges(brightnessProfile);

  // 3. Compute depth profile (for spatial FX)
  const depthProfile = computeSimpleDepthProfile(brightnessProfile);

  // 4. Extract horizon contour (for bass voice)
  const rawHorizon = extractHorizonContour(pixels, width, height, horizonSmoothing);
  const horizonProfile =
    rawHorizon.length > maxSamples
      ? downsampleProfile(rawHorizon, maxSamples)
      : rawHorizon;

  // 5. Compute texture profile (for pad voice)
  const rawTexture = computeTextureProfile(pixels, width, height, {
    windowSize: 8,
    rowSamples: 5,
  });
  const textureProfile =
    rawTexture.length > maxSamples
      ? downsampleProfile(rawTexture, maxSamples)
      : rawTexture;

  return {
    width,
    height,
    brightnessProfile,
    ridgeStrength,
    depthProfile,
    horizonProfile,
    textureProfile,
    metadata: {
      samplingMethod: 'multi-voice',
      rowIndex: centerRow,
      timestamp: Date.now(),
    },
  };
}

/**
 * Quick analysis for preview/thumbnail purposes
 * Uses minimal sampling for fast results
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @returns Lightweight ImageAnalysisResult
 */
export function analyzeImageQuick(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): ImageAnalysisResult {
  return analyzeImageForLinearLandscape(pixels, width, height, {
    maxSamples: 32,
    includeDepth: false,
    includeRidges: false,
    averageRows: false,
  });
}
