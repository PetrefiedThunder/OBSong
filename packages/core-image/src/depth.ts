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
  // Convert to grayscale first
  const grayscale: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale.push(gray);
  }

  const edges: number[] = [];

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
    }
  }

  // Normalize to 0-1
  const maxMagnitude = Math.max(...edges);
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

  if (!averageRows) {
    // Single row extraction
    const profile: number[] = [];
    for (let x = 0; x < width; x++) {
      profile.push(edgeMagnitudes[rowIndex * width + x]);
    }
    return profile;
  }

  // Multi-row averaging for stability
  const startRow = Math.max(0, rowIndex - Math.floor(rowsToAverage / 2));
  const endRow = Math.min(height, rowIndex + Math.ceil(rowsToAverage / 2));

  const profile: number[] = new Array(width).fill(0);

  for (let y = startRow; y < endRow; y++) {
    for (let x = 0; x < width; x++) {
      profile[x] += edgeMagnitudes[y * width + x];
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
  const ridges: number[] = [];

  for (let i = 0; i < brightnessProfile.length; i++) {
    const prev = brightnessProfile[i - 1] ?? brightnessProfile[i];
    const next = brightnessProfile[i + 1] ?? brightnessProfile[i];
    const current = brightnessProfile[i];

    let gradient: number;

    if (useSobel) {
      // Sobel-inspired 1D gradient: weighted central difference
      // Approximates the effect of Sobel Gx kernel in 1D
      const prevPrev = brightnessProfile[i - 2] ?? prev;
      const nextNext = brightnessProfile[i + 2] ?? next;

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
