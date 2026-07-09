import {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
} from '../analyzer';

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
