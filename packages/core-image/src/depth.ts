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
  if (brightnessProfile.length === 0) return [];

  const depth: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < brightnessProfile.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(brightnessProfile.length, i + halfWindow + 1);
    const window = brightnessProfile.slice(start, end);

    // Calculate local contrast (range of values in window)
    let min = Infinity;
    let max = -Infinity;
    for (const value of window) {
      const finiteValue = Number.isFinite(value) ? value : 0;
      min = Math.min(min, finiteValue);
      max = Math.max(max, finiteValue);
    }
    const contrast = max - min;

    // Normalize to 0-1 (will be normalized again later)
    depth.push(contrast);
  }

  // Normalize the entire depth profile
  let maxDepth = 0;
  for (const value of depth) {
    maxDepth = Math.max(maxDepth, value);
  }
  if (maxDepth === 0) {
    return depth.map(() => 0.5);
  }

  return depth.map((d) => d / maxDepth);
}

function readChannel(pixels: Uint8ClampedArray | number[], index: number): number {
  const value = pixels[index];
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, value));
}

function clampRowIndex(rowIndex: number, height: number): number {
  if (height <= 0) return 0;
  const finiteRow = Number.isFinite(rowIndex) ? rowIndex : 0;
  return Math.max(0, Math.min(height - 1, Math.floor(finiteRow)));
}

/**
 * Apply Sobel edge detection to a 2D image
 * Uses Sobel operators (Gx and Gy kernels) to detect edges
 *
 * Sobel Kernels:
 * Gx = [-1  0  1]    Gy = [-1 -2 -1]
 *      [-2  0  2]         [ 0  0  0]
 *      [-1  0  1]         [ 1  2  1]
 *
 * @param pixels - Flattened RGBA pixel array
 * @param width - Image width
 * @param height - Image height
 * @returns Edge magnitude at each pixel (0-1)
 */
export function applySobelEdgeDetection(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): number[] {
  if (width <= 0 || height <= 0) return [];

  // Convert to grayscale first
  const grayscale: number[] = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const pixelOffset = i * 4;
    const r = readChannel(pixels, pixelOffset);
    const g = readChannel(pixels, pixelOffset + 1);
    const b = readChannel(pixels, pixelOffset + 2);
    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale[i] = gray;
  }

  const edges: number[] = [];
  let maxMagnitude = 0;

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  // Apply convolution
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;

      // Apply 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;

          // Handle boundaries with edge clamping
          const clampedX = Math.max(0, Math.min(width - 1, px));
          const clampedY = Math.max(0, Math.min(height - 1, py));

          const pixelValue = grayscale[clampedY * width + clampedX];
          const kernelIndex = (ky + 1) * 3 + (kx + 1);

          gx += pixelValue * sobelX[kernelIndex];
          gy += pixelValue * sobelY[kernelIndex];
        }
      }

      // Compute gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges.push(magnitude);
      maxMagnitude = Math.max(maxMagnitude, magnitude);
    }
  }

  // Normalize to 0-1
  if (maxMagnitude === 0) {
    return edges.map(() => 0);
  }

  return edges.map((e) => e / maxMagnitude);
}

/**
 * Extract edge strength profile from Sobel edge detection results
 * Samples edges along a horizontal line or averages across multiple rows
 *
 * @param edgeMagnitudes - Edge magnitudes from Sobel (0-1)
 * @param width - Image width
 * @param height - Image height
 * @param options - Extraction options
 * @returns Edge strength profile (0-1)
 */
export function extractEdgeProfile(
  edgeMagnitudes: number[],
  width: number,
  height: number,
  options: {
    rowIndex?: number;
    averageRows?: boolean;
    rowsToAverage?: number;
  } = {}
): number[] {
  const {
    rowIndex = Math.floor(height / 2),
    averageRows = true,
    rowsToAverage = 5,
  } = options;

  if (width <= 0 || height <= 0 || edgeMagnitudes.length === 0) return [];

  const clampedRowIndex = clampRowIndex(rowIndex, height);

  if (!averageRows) {
    // Single row extraction
    const profile: number[] = [];
    for (let x = 0; x < width; x++) {
      const value = edgeMagnitudes[clampedRowIndex * width + x];
      profile.push(Number.isFinite(value) ? value : 0);
    }
    return profile;
  }

  // Multi-row averaging for stability
  const startRow = Math.max(0, clampedRowIndex - Math.floor(rowsToAverage / 2));
  const endRow = Math.max(
    startRow + 1,
    Math.min(height, clampedRowIndex + Math.ceil(rowsToAverage / 2))
  );

  const profile: number[] = new Array(width).fill(0);

  for (let y = startRow; y < endRow; y++) {
    for (let x = 0; x < width; x++) {
      const value = edgeMagnitudes[y * width + x];
      profile[x] += Number.isFinite(value) ? value : 0;
    }
  }

  // Average
  const rowCount = endRow - startRow;
  return profile.map((sum) => sum / rowCount);
}

/**
 * Detect edges/ridges in a brightness profile using Sobel-inspired gradient
 * Uses simple gradient calculation for 1D profiles
 *
 * @param brightnessProfile - Brightness values
 * @param useSobel - Whether to use Sobel-style weighting (default: true)
 * @returns Edge strength at each position (0-1)
 */
export function detectRidges(
  brightnessProfile: number[],
  useSobel: boolean = true
): number[] {
  if (brightnessProfile.length === 0) return [];

  const ridges: number[] = [];
  let maxRidge = 0;

  for (let i = 0; i < brightnessProfile.length; i++) {
    const current = Number.isFinite(brightnessProfile[i]) ? brightnessProfile[i] : 0;
    const prevValue = brightnessProfile[i - 1] ?? current;
    const nextValue = brightnessProfile[i + 1] ?? current;
    const prev = Number.isFinite(prevValue) ? prevValue : current;
    const next = Number.isFinite(nextValue) ? nextValue : current;

    let gradient: number;

    if (useSobel) {
      // Sobel-inspired 1D gradient: weighted central difference
      // Approximates the effect of Sobel Gx kernel in 1D
      const prevPrevValue = brightnessProfile[i - 2] ?? prev;
      const nextNextValue = brightnessProfile[i + 2] ?? next;
      const prevPrev = Number.isFinite(prevPrevValue) ? prevPrevValue : prev;
      const nextNext = Number.isFinite(nextNextValue) ? nextNextValue : next;

      // Weighted gradient: center difference gets weight 2, outer differences get weight 1
      const centerGrad = (next - prev) / 2;
      const outerGrad = (nextNext - prevPrev) / 4;
      gradient = Math.abs(centerGrad * 2 + outerGrad) / 3;
    } else {
      // Simple gradient calculation (legacy)
      gradient = Math.abs(next - prev) / 2;
    }

    // Also consider local peaks
    const isPeak = current > prev && current > next;
    const peakBonus = isPeak ? 0.3 * 255 : 0;

    const strength = Math.max(0, gradient + peakBonus);
    ridges.push(strength);
    maxRidge = Math.max(maxRidge, strength);
  }

  // Normalize
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
