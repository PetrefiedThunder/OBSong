import { describe, expect, it } from 'vitest';
import {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
  analyzeImageForMultiVoice,
} from '../analyzer';

// Fixed LCG corpus: failures reproduce without external fuzzing dependencies.
function pixelsFor(width: number, height: number, seed: number) {
  let state = seed >>> 0;
  return Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return i % 4 === 3 ? 255 : state >>> 24;
  });
}

const sizes = [
  [1, 1], [1, 9], [2, 1], [2, 2], [7, 3], [8, 5],
  [127, 7], [128, 8], [129, 9], [257, 16], [640, 480],
];

describe('QA seeded image contracts', () => {
  it.each(sizes)('%ix%i valid RGBA inputs produce finite, bounded profiles without mutation', (width, height) => {
    const pixels = pixelsFor(width, height, 20261002 + width * 31 + height);
    const original = pixels.slice();
    const analyzers = [
      analyzeImageForLinearLandscape,
      analyzeImageForDepthRidge,
      analyzeImageForMultiVoice,
    ];
    for (const analyze of analyzers) {
      const result = analyze(pixels, width, height);
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      const profiles = [
        [result.brightnessProfile, 255],
        [result.depthProfile, 1],
        [result.ridgeStrength, 1],
        [result.horizonProfile, 1],
        [result.textureProfile, 1],
      ] as const;
      for (const [profile, upperBound] of profiles) {
        if (!profile) continue;
        expect(profile.length).toBe(Math.min(width, 128));
        for (const value of profile) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(upperBound + 1e-9);
        }
      }
    }
    expect(pixels).toEqual(original);
  });

  it.each([1, 2, 7, 128, 256])('respects maxSamples=%i for every available feature', (maxSamples) => {
    const width = 257;
    const height = 7;
    const pixels = pixelsFor(width, height, 20261002);
    for (const analyze of [
      analyzeImageForLinearLandscape,
      analyzeImageForDepthRidge,
      analyzeImageForMultiVoice,
    ]) {
      const result = analyze(pixels, width, height, { maxSamples });
      for (const profile of [
        result.brightnessProfile, result.depthProfile, result.ridgeStrength,
        result.horizonProfile, result.textureProfile,
      ]) {
        if (profile) {
          expect(profile.length).toBe(maxSamples);
          expect(profile.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it.each([0, 255])('preserves uniform %i brightness and emits no artificial texture or ridge', (brightness) => {
    const pixels = new Uint8ClampedArray(17 * 7 * 4).fill(brightness);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
    const result = analyzeImageForMultiVoice(pixels, 17, 7);
    for (const value of result.brightnessProfile) expect(value).toBeCloseTo(brightness, 8);
    for (const value of result.ridgeStrength!) expect(value).toBeCloseTo(0, 8);
    for (const value of result.textureProfile!) expect(value).toBeCloseTo(0, 8);
  });
});
