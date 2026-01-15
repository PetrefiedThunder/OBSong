import { analyzeImageForLinearLandscape } from '../analyzer';

describe('analyzeImageForLinearLandscape', () => {
  it('should calculate the correct brightness profile', () => {
    // Create a simple 3x3 image with a gradient from black to white
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255,   128, 128, 128, 255,   255, 255, 255, 255, // Row 1
      0, 0, 0, 255,   128, 128, 128, 255,   255, 255, 255, 255, // Row 2
      0, 0, 0, 255,   128, 128, 128, 255,   255, 255, 255, 255, // Row 3
    ]);

    const result = analyzeImageForLinearLandscape(pixels, 3, 3);

    // The brightness profile should be the average of the rows
    expect(result.brightnessProfile[0]).toBeCloseTo(0, 5);
    expect(result.brightnessProfile[1]).toBeCloseTo(128, 5);
    expect(result.brightnessProfile[2]).toBeCloseTo(255, 5);
  });
});
