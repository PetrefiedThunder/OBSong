/**
 * Texture and variance analysis utilities
 * Identifies textural complexity for pad/harmony generation
 */

import { computeBrightnessProfileFromRow } from './brightness';

/**
 * Compute texture profile using local variance
 * Measures brightness variation in sliding windows
 *
 * @param brightnessProfile - 1D brightness array
 * @param windowSize - Window size for variance calculation (default: 8)
 * @returns Texture values (0-1) for each position
 */
export function computeTextureFromBrightness(
  brightnessProfile: number[],
  windowSize: number = 8
): number[] {
  const texture: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < brightnessProfile.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(brightnessProfile.length, i + halfWindow + 1);
    const window = brightnessProfile.slice(start, end);

    // Calculate variance
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
    const variance =
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;

    // Normalize variance to 0-1 range (using standard deviation)
    const stdDev = Math.sqrt(variance);
    texture.push(stdDev / 255); // Normalize by max possible std dev
  }

  return texture;
}

/**
 * Compute 2D texture map by averaging texture across multiple rows
 * Provides more stable texture estimation
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @param options - Texture computation options
 * @returns Texture profile (0-1)
 */
export function computeTextureProfile(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  options: {
    /** Window size for variance calculation */
    windowSize?: number;
    /** Number of rows to sample for stability */
    rowSamples?: number;
  } = {}
): number[] {
  const { windowSize = 8, rowSamples = 5 } = options;

  // Sample multiple rows across the image
  const textureProfiles: number[][] = [];
  const rowStep = Math.floor(height / (rowSamples + 1));

  for (let i = 1; i <= rowSamples; i++) {
    const rowIndex = rowStep * i;
    const brightnessProfile = computeBrightnessProfileFromRow(
      pixels,
      width,
      height,
      rowIndex
    );
    const texture = computeTextureFromBrightness(brightnessProfile, windowSize);
    textureProfiles.push(texture);
  }

  // Average across all sampled rows
  const avgTexture: number[] = new Array(width).fill(0);

  for (const profile of textureProfiles) {
    for (let x = 0; x < width; x++) {
      avgTexture[x] += profile[x] / textureProfiles.length;
    }
  }

  return avgTexture;
}

/**
 * Segment texture profile into coarser regions
 * Useful for pad voice (fewer, longer chord changes)
 *
 * @param textureProfile - Fine-grained texture array
 * @param segments - Number of segments to create (default: 8)
 * @returns Array of average texture values per segment
 */
export function segmentTexture(
  textureProfile: number[],
  segments: number = 8
): number[] {
  const segmentSize = textureProfile.length / segments;
  const segmented: number[] = [];

  for (let i = 0; i < segments; i++) {
    const start = Math.floor(i * segmentSize);
    const end = Math.floor((i + 1) * segmentSize);
    const segment = textureProfile.slice(start, end);
    const average = segment.reduce((sum, val) => sum + val, 0) / segment.length;
    segmented.push(average);
  }

  return segmented;
}

/**
 * Classify texture intensity into discrete levels
 * Useful for mapping to chord complexity
 *
 * @param textureValue - Texture value (0-1)
 * @returns Texture level: 'low' | 'medium' | 'high'
 */
export function classifyTexture(textureValue: number): 'low' | 'medium' | 'high' {
  if (textureValue < 0.3) return 'low';
  if (textureValue < 0.7) return 'medium';
  return 'high';
}
