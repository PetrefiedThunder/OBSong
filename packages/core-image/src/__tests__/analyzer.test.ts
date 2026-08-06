import {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
} from '../analyzer';
import { applySobelEdgeDetection } from '../depth';

describe('Image Analyzers', () => {
  // Create a simple 3x3 black and white test image (2 pixels black, 1 pixel white)
  const width = 3;
  const height = 3;
  const pixels = new Uint8ClampedArray([
    // Row 1
    0, 0, 0, 255, // Black
    0, 0, 0, 255, // Black
    255, 255, 255, 255, // White
    // Row 2
    0, 0, 0, 255,
    0, 0, 0, 255,
    255, 255, 255, 255,
    // Row 3
    0, 0, 0, 255,
    0, 0, 0, 255,
    255, 255, 255, 255,
  ]);

  describe('analyzeImageForLinearLandscape', () => {
    it('should correctly calculate a brightness profile from the center row', () => {
      const result = analyzeImageForLinearLandscape(pixels, width, height, {
        averageRows: false,
      });

      // Expected: Luminance is ~0 for black, ~255 for white
      expect(result.brightnessProfile.length).toBe(3);
      expect(result.brightnessProfile[0]).toBeCloseTo(0);
      expect(result.brightnessProfile[1]).toBeCloseTo(0);
      expect(result.brightnessProfile[2]).toBeCloseTo(255);
    });

    it('should correctly compute a simple depth profile', () => {
      const result = analyzeImageForLinearLandscape(pixels, width, height);
      // Depth is based on contrast, so we expect a dip in the middle
      expect(result.depthProfile).toBeDefined();
      expect(result.depthProfile?.length).toBe(3);
    });
  });

  describe('analyzeImageForDepthRidge', () => {
    it('should produce ridge and depth profiles of the correct length', () => {
      const result = analyzeImageForDepthRidge(pixels, width, height);

      expect(result.ridgeStrength).toBeDefined();
      expect(result.depthProfile).toBeDefined();
      expect(result.ridgeStrength?.length).toBe(width);
      expect(result.depthProfile?.length).toBe(width);
    });

    it('should identify a strong ridge at the color boundary', () => {
      const result = analyzeImageForDepthRidge(pixels, width, height);
      // The strongest edge is between the second (black) and third (white) pixels
      const maxRidge = Math.max(...(result.ridgeStrength || []));
      const maxRidgeIndex = result.ridgeStrength?.indexOf(maxRidge);

      // The peak should be at or next to the boundary
      expect(maxRidgeIndex).toBe(2);
      expect(maxRidge).toBeGreaterThan(0.9);
    });

    it('produces finite (non-NaN) profiles for a short image', () => {
      // height 3 previously read rows -1 and 3 (out of bounds) -> all-NaN profiles.
      const result = analyzeImageForDepthRidge(pixels, width, height);
      expect(result.brightnessProfile.every(Number.isFinite)).toBe(true);
      expect(result.ridgeStrength?.every(Number.isFinite)).toBe(true);
      expect(result.depthProfile?.every(Number.isFinite)).toBe(true);
    });
  });

  describe('determinism', () => {
    it('produces deep-equal profiles for the same input twice', () => {
      const first = analyzeImageForDepthRidge(pixels, width, height);
      const second = analyzeImageForDepthRidge(pixels, width, height);

      // metadata.timestamp is wall-clock time, so compare everything except metadata.
      const strip = ({ metadata: _metadata, ...rest }: typeof first) => rest;
      expect(strip(second)).toEqual(strip(first));
    });
  });

  describe('precomputed edge magnitudes', () => {
    // A 64x16 image with varied content so the Sobel output is non-trivial.
    const w = 64;
    const h = 16;
    const varied = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = Math.round((Math.sin(x * 0.4) * 0.5 + 0.5) * 255 * ((y % 4) / 3 || 0.2));
        const i = (y * w + x) * 4;
        varied[i] = v;
        varied[i + 1] = v;
        varied[i + 2] = v;
        varied[i + 3] = 255;
      }
    }

    it('accepts 0-1 float magnitudes and matches the self-computed result exactly', () => {
      const sobel = applySobelEdgeDetection(varied, w, h);
      const self = analyzeImageForDepthRidge(varied, w, h);
      const precomputed = analyzeImageForDepthRidge(varied, w, h, {
        precomputedEdgeMagnitudes: sobel,
      });

      expect(precomputed.ridgeStrength).toEqual(self.ridgeStrength);
      expect(precomputed.brightnessProfile).toEqual(self.brightnessProfile);
      expect(precomputed.depthProfile).toEqual(self.depthProfile);
    });

    it('normalizes 0-255 byte magnitudes and stays close to the self-computed result', () => {
      const sobel = applySobelEdgeDetection(varied, w, h);
      const bytes = Uint8ClampedArray.from(sobel.map((v) => Math.round(v * 255)));

      const self = analyzeImageForDepthRidge(varied, w, h);
      const precomputed = analyzeImageForDepthRidge(varied, w, h, {
        precomputedEdgeMagnitudes: bytes,
      });

      expect(precomputed.ridgeStrength).toBeDefined();
      expect(precomputed.ridgeStrength!.length).toBe(self.ridgeStrength!.length);

      // Byte quantization introduces at most ~0.5/255 per pixel; after row averaging and
      // smoothing the profiles must remain very close.
      for (let i = 0; i < self.ridgeStrength!.length; i++) {
        expect(Math.abs(precomputed.ridgeStrength![i] - self.ridgeStrength![i])).toBeLessThan(0.01);
      }

      // Brightness and depth are unaffected by the precomputed edges.
      expect(precomputed.brightnessProfile).toEqual(self.brightnessProfile);
      expect(precomputed.depthProfile).toEqual(self.depthProfile);
    });

    it('ignores a too-short precomputed buffer and falls back to the JS Sobel result', () => {
      const self = analyzeImageForDepthRidge(varied, w, h);
      // Length w*h - 1: one pixel short, which would index out of bounds.
      const short = new Array(w * h - 1).fill(0.5);
      const result = analyzeImageForDepthRidge(varied, w, h, {
        precomputedEdgeMagnitudes: short,
      });

      expect(result.ridgeStrength).toEqual(self.ridgeStrength);
    });

    it('ignores an oversized precomputed buffer and falls back to the JS Sobel result', () => {
      const self = analyzeImageForDepthRidge(varied, w, h);
      const oversized = new Array(w * h + 5).fill(0.5);
      const result = analyzeImageForDepthRidge(varied, w, h, {
        precomputedEdgeMagnitudes: oversized,
      });

      expect(result.ridgeStrength).toEqual(self.ridgeStrength);
    });
  });

  describe('large images', () => {
    it('does not overflow the call stack on a realistic (640x480) image', () => {
      // Math.max(...edges) threw RangeError above ~125k elements; 640x480 = 307,200 px.
      const w = 640;
      const h = 480;
      const big = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < big.length; i += 4) {
        const v = (i / 4) % w < w / 2 ? 0 : 255;
        big[i] = v;
        big[i + 1] = v;
        big[i + 2] = v;
        big[i + 3] = 255;
      }

      expect(() => analyzeImageForDepthRidge(big, w, h)).not.toThrow();
      const result = analyzeImageForDepthRidge(big, w, h);
      expect(result.brightnessProfile.every(Number.isFinite)).toBe(true);
    });
  });
});
