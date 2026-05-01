/**
 * Brightness analysis utilities
 * Environment-agnostic functions for analyzing image brightness
 */

/**
 * Compute brightness for a single pixel from RGBA values
 * Uses weighted average based on human perception (ITU-R BT.709)
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns Brightness value (0-255)
 */
function finiteChannel(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, value));
}

function clampRowIndex(rowIndex: number, height: number): number {
  if (height <= 0) return 0;
  const finiteRow = Number.isFinite(rowIndex) ? rowIndex : 0;
  return Math.max(0, Math.min(height - 1, Math.floor(finiteRow)));
}

export function computePixelBrightness(r: number, g: number, b: number): number {
  // Weighted average based on human perception
  // Red: 21%, Green: 72%, Blue: 7%
  return 0.2126 * finiteChannel(r) + 0.7152 * finiteChannel(g) + 0.0722 * finiteChannel(b);
}

/**
 * Extract brightness profile from a specific row of pixels
 *
 * @param pixels - Flattened RGBA pixel array (Uint8ClampedArray or number[])
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param rowIndex - Which row to analyze (0 = top, height-1 = bottom)
 * @returns Array of brightness values (0-255) for each x position
 */
export function computeBrightnessProfileFromRow(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  rowIndex: number
): number[] {
  if (width <= 0 || height <= 0) return [];

  const profile: number[] = [];
  const clampedRow = clampRowIndex(rowIndex, height);
  const rowOffset = clampedRow * width * 4; // 4 channels per pixel (RGBA)

  for (let x = 0; x < width; x++) {
    const pixelOffset = rowOffset + x * 4;
    const r = pixels[pixelOffset];
    const g = pixels[pixelOffset + 1];
    const b = pixels[pixelOffset + 2];
    // Alpha channel (pixels[pixelOffset + 3]) is ignored

    profile.push(computePixelBrightness(r, g, b));
  }

  return profile;
}

/**
 * Normalize brightness values to 0-1 range
 *
 * @param profile - Brightness values (any range)
 * @returns Normalized values (0-1)
 */
export function computeNormalizedBrightness(profile: number[]): number[] {
  if (profile.length === 0) return [];

  let min = Infinity;
  let max = -Infinity;
  for (const value of profile) {
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (min === Infinity || max === -Infinity) {
    return profile.map(() => 0.5);
  }

  const range = max - min;

  // Avoid division by zero
  if (range === 0) {
    return profile.map(() => 0.5);
  }

  return profile.map((value) => (value - min) / range);
}

/**
 * Downsample a brightness profile to a target number of samples
 * Uses averaging within each bin
 *
 * @param profile - Original brightness profile
 * @param targetSamples - Desired number of samples
 * @returns Downsampled profile
 */
export function downsampleProfile(profile: number[], targetSamples: number): number[] {
  const sampleCount = Math.floor(targetSamples);
  if (sampleCount <= 0 || profile.length === 0) return [];

  if (profile.length <= sampleCount) {
    return [...profile];
  }

  const result: number[] = [];
  const binSize = profile.length / sampleCount;

  for (let i = 0; i < sampleCount; i++) {
    const startIdx = Math.floor(i * binSize);
    const endIdx = Math.max(startIdx + 1, Math.floor((i + 1) * binSize));
    const bin = profile.slice(startIdx, endIdx);

    // Average the values in this bin
    const average = bin.reduce((sum, val) => sum + val, 0) / bin.length;
    result.push(average);
  }

  return result;
}

/**
 * Compute average brightness across multiple rows (vertical averaging)
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @param startRow - Starting row index
 * @param endRow - Ending row index (exclusive)
 * @returns Averaged brightness profile
 */
export function computeAveragedBrightnessProfile(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  startRow: number,
  endRow: number
): number[] {
  if (width <= 0 || height <= 0) return [];

  const clampedStart = clampRowIndex(startRow, height);
  const finiteEndRow = Number.isFinite(endRow) ? endRow : clampedStart + 1;
  const clampedEndExclusive = Math.max(
    clampedStart + 1,
    Math.min(height, Math.ceil(finiteEndRow))
  );
  const profiles: number[][] = [];

  for (let row = clampedStart; row < clampedEndExclusive; row++) {
    profiles.push(computeBrightnessProfileFromRow(pixels, width, height, row));
  }

  // Average across all rows
  const result: number[] = new Array(width).fill(0);

  for (const profile of profiles) {
    for (let x = 0; x < width; x++) {
      result[x] += profile[x] / profiles.length;
    }
  }

  return result;
}
