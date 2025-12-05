import { NativeModulesProxy } from 'expo-modules-core';

export interface NativeImageProcessingOptions {
  /** Local file URI to analyze */
  uri?: string;
  /** Texture identifier to analyze if available */
  textureId?: number;
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

if (!NativeImageProcessingModule) {
  throw new Error('NativeImageProcessing module is not available');
}

export async function processImage(
  options: NativeImageProcessingOptions
): Promise<NativeImageProcessingResult> {
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

export function isNativeImageProcessingAvailable() {
  return Boolean(NativeImageProcessingModule?.processImage);
}
