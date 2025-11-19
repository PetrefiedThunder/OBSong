/**
 * Depth estimation utilities
 * Simple heuristics for estimating relative depth from image features
 */

/**
 * Compute a simple depth profile based on local contrast
 * Higher contrast = assumed to be closer/more prominent
 *
 * This is a simplified heuristic - real depth estimation would use
 * stereo vision, depth cameras, or ML models
 *
 * @param brightnessProfile - Brightness values along a horizontal line
 * @param windowSize - Size of the local window for contrast calculation
 * @returns Depth estimates (0-1, higher = closer/more prominent)
 */
export function computeSimpleDepthProfile(
  brightnessProfile: number[],
  windowSize: number = 5
): number[] {
  const depth: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < brightnessProfile.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(brightnessProfile.length, i + halfWindow + 1);
    const window = brightnessProfile.slice(start, end);

    // Calculate local contrast (range of values in window)
    const min = Math.min(...window);
    const max = Math.max(...window);
    const contrast = max - min;

    // Normalize to 0-1 (will be normalized again later)
    depth.push(contrast);
  }

  // Normalize the entire depth profile
  const maxDepth = Math.max(...depth);
  if (maxDepth === 0) {
    return depth.map(() => 0.5);
  }

  return depth.map((d) => d / maxDepth);
}

/**
 * Detect edges/ridges in a brightness profile
 * Uses simple gradient calculation
 *
 * @param brightnessProfile - Brightness values
 * @returns Edge strength at each position (0-1)
 */
export function detectRidges(brightnessProfile: number[]): number[] {
  const ridges: number[] = [];

  for (let i = 0; i < brightnessProfile.length; i++) {
    const prev = brightnessProfile[i - 1] ?? brightnessProfile[i];
    const next = brightnessProfile[i + 1] ?? brightnessProfile[i];
    const current = brightnessProfile[i];

    // Calculate gradient magnitude (absolute change)
    const gradient = Math.abs(next - prev) / 2;

    // Also consider local peaks
    const isPeak = current > prev && current > next;
    const peakBonus = isPeak ? 0.3 : 0;

    ridges.push(Math.min(1, gradient + peakBonus));
  }

  // Normalize
  const maxRidge = Math.max(...ridges);
  if (maxRidge === 0) {
    return ridges.map(() => 0);
  }

  return ridges.map((r) => r / maxRidge);
}

/**
 * Apply smoothing to a profile using a simple moving average
 *
 * @param profile - Input values
 * @param windowSize - Smoothing window size
 * @returns Smoothed profile
 */
export function smoothProfile(profile: number[], windowSize: number = 3): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < profile.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(profile.length, i + halfWindow + 1);
    const window = profile.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }

  return result;
}
