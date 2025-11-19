/**
 * Horizon and contour detection utilities
 * Identifies base/horizon lines in images for bass voice generation
 */

/**
 * Compute horizon/base contour by scanning columns from bottom to top
 * Finds the first significant brightness change in each column
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Detection options
 * @returns Array of horizon heights (0-1, normalized) for each x position
 */
export function computeHorizonProfile(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  options: {
    /** Brightness threshold for detecting edge (0-255, default: 30) */
    brightnessThreshold?: number;
    /** Gradient threshold for edge detection (default: 20) */
    gradientThreshold?: number;
  } = {}
): number[] {
  const { brightnessThreshold = 30, gradientThreshold = 20 } = options;

  const horizonHeights: number[] = [];

  for (let x = 0; x < width; x++) {
    let horizonY = height - 1; // Default to bottom

    // Scan from bottom up
    for (let y = height - 1; y >= 1; y--) {
      const currentIdx = (y * width + x) * 4;
      const aboveIdx = ((y - 1) * width + x) * 4;

      // Calculate brightness using luma formula
      const currentBrightness =
        0.299 * pixels[currentIdx] +
        0.587 * pixels[currentIdx + 1] +
        0.114 * pixels[currentIdx + 2];

      const aboveBrightness =
        0.299 * pixels[aboveIdx] +
        0.587 * pixels[aboveIdx + 1] +
        0.114 * pixels[aboveIdx + 2];

      const gradient = Math.abs(currentBrightness - aboveBrightness);

      // Detect significant edge
      if (
        currentBrightness > brightnessThreshold &&
        gradient > gradientThreshold
      ) {
        horizonY = y;
        break;
      }
    }

    // Normalize to 0-1 (0 = bottom, 1 = top)
    horizonHeights.push(1 - horizonY / (height - 1));
  }

  return horizonHeights;
}

/**
 * Smooth horizon profile to remove noise
 * Uses moving average filter
 *
 * @param horizonProfile - Raw horizon heights
 * @param windowSize - Smoothing window size (default: 5)
 * @returns Smoothed horizon profile
 */
export function smoothHorizonProfile(
  horizonProfile: number[],
  windowSize: number = 5
): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < horizonProfile.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(horizonProfile.length, i + halfWindow + 1);
    const window = horizonProfile.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }

  return result;
}

/**
 * Extract horizon contour with adaptive smoothing
 * Combines detection and smoothing for cleaner results
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @param smoothWindow - Smoothing window size (default: 7)
 * @returns Smoothed horizon profile (0-1)
 */
export function extractHorizonContour(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  smoothWindow: number = 7
): number[] {
  const raw = computeHorizonProfile(pixels, width, height);
  return smoothHorizonProfile(raw, smoothWindow);
}
