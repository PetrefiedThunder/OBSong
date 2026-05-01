import {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
  analyzeImageForMultiVoice,
} from '../analyzer';
import { applySobelEdgeDetection, detectRidges } from '../depth';
import { classifyTexture, computeTextureFromBrightness } from '../texture';

function expectFiniteRange(values: number[], min: number, max: number) {
  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }
}

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

    it('should return finite bounded profiles for a 1px image', () => {
      const tinyPixels = new Uint8ClampedArray([128, 128, 128, 255]);
      const result = analyzeImageForDepthRidge(tinyPixels, 1, 1);

      expect(result.brightnessProfile).toHaveLength(1);
      expect(result.ridgeStrength).toHaveLength(1);
      expect(result.depthProfile).toHaveLength(1);
      expectFiniteRange(result.brightnessProfile, 0, 255);
      expectFiniteRange(result.ridgeStrength || [], 0, 1);
      expectFiniteRange(result.depthProfile || [], 0, 1);
    });

    it('should return finite profiles for malformed tiny pixel buffers', () => {
      const result = analyzeImageForDepthRidge([255, 255], 1, 1);

      expect(result.brightnessProfile).toHaveLength(1);
      expect(result.ridgeStrength).toHaveLength(1);
      expect(result.depthProfile).toHaveLength(1);
      expectFiniteRange(result.brightnessProfile, 0, 255);
      expectFiniteRange(result.ridgeStrength || [], 0, 1);
      expectFiniteRange(result.depthProfile || [], 0, 1);
    });
  });

  describe('core algorithm normalization', () => {
    it('should normalize Sobel output without overflowing on large arrays', () => {
      const largeWidth = 350;
      const largeHeight = 350;
      const largePixels = new Uint8ClampedArray(largeWidth * largeHeight * 4);

      for (let i = 0; i < largeWidth * largeHeight; i++) {
        const value = i % 256;
        const offset = i * 4;
        largePixels[offset] = value;
        largePixels[offset + 1] = value;
        largePixels[offset + 2] = value;
        largePixels[offset + 3] = 255;
      }

      const edges = applySobelEdgeDetection(largePixels, largeWidth, largeHeight);
      expect(edges).toHaveLength(largeWidth * largeHeight);
      expectFiniteRange(edges, 0, 1);
    }, 10000);

    it('should make high texture reachable for maximum contrast profiles', () => {
      const texture = computeTextureFromBrightness(
        [0, 255, 0, 255, 0, 255, 0, 255],
        8
      );
      const maxTexture = Math.max(...texture);

      expectFiniteRange(texture, 0, 1);
      expect(maxTexture).toBeGreaterThanOrEqual(0.7);
      expect(classifyTexture(maxTexture)).toBe('high');
    });

    it('should preserve relative ridge strengths before final normalization', () => {
      const ridges = detectRidges([0, 255, 0, 64, 0]);

      expectFiniteRange(ridges, 0, 1);
      expect(Math.max(...ridges)).toBeCloseTo(1);
      expect(ridges.some((ridge) => ridge > 0 && ridge < 1)).toBe(true);
    });

    it('should return finite bounded multi-voice analysis for a 1px image', () => {
      const tinyPixels = new Uint8ClampedArray([64, 128, 192, 255]);
      const result = analyzeImageForMultiVoice(tinyPixels, 1, 1);

      expectFiniteRange(result.brightnessProfile, 0, 255);
      expectFiniteRange(result.ridgeStrength || [], 0, 1);
      expectFiniteRange(result.depthProfile || [], 0, 1);
      expectFiniteRange(result.horizonProfile || [], 0, 1);
      expectFiniteRange(result.textureProfile || [], 0, 1);
    });
  });
});
