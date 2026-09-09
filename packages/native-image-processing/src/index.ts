import { NativeModulesProxy } from 'expo-modules-core';

export interface NativeImageProcessingOptions {
  /** Local file URI to analyze */
  uri?: string;
  /** Requested resize width; aspect ratio preserved */
  targetWidth?: number;
  /** Whether to compute ridge strength using Sobel edge detection */
  includeRidgeStrength?: boolean;
}

export interface NativeImageProcessingResult {
  pixels: Uint8Array;
  width: number;
  height: number;
  /** Ridge strength data (grayscale edge magnitude) if requested */
  ridgeStrength?: Uint8Array;
  /** Width of ridge strength data */
  ridgeWidth?: number;
  /** Height of ridge strength data */
  ridgeHeight?: number;
}

const NativeImageProcessingModule = NativeModulesProxy.NativeImageProcessing;

/**
 * Whether native image processing is actually usable on this platform. The native module
 * exposes an explicit `isAvailable` constant (Android: true; iOS: false — the iOS module
 * is a stub) because the mere presence of `processImage` is not enough: iOS registers the
 * function but always throws.
 *
 * Note: this does NOT throw at import time (a missing module or unsupported platform must
 * not crash the whole JS bundle); callers should guard with this before calling
 * processImage.
 */
export function isNativeImageProcessingAvailable(): boolean {
  return Boolean(NativeImageProcessingModule?.isAvailable);
}

export async function processImage(
  options: NativeImageProcessingOptions
): Promise<NativeImageProcessingResult> {
  if (!isNativeImageProcessingAvailable()) {
    throw new Error('Native image processing is not available on this platform');
  }

  const result = await NativeImageProcessingModule.processImage(options);

  if (!result || typeof result.width !== 'number' || typeof result.height !== 'number') {
    throw new Error('Native image processing returned an invalid payload');
  }

  const processed: NativeImageProcessingResult = {
    pixels: new Uint8Array(result.pixels),
    width: result.width,
    height: result.height,
  };

  // Add ridge strength data if present
  if (result.ridgeStrength && result.ridgeWidth && result.ridgeHeight) {
    processed.ridgeStrength = new Uint8Array(result.ridgeStrength);
    processed.ridgeWidth = result.ridgeWidth;
    processed.ridgeHeight = result.ridgeHeight;
  }

  return processed;
}
