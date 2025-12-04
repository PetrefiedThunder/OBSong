import { NativeModulesProxy } from 'expo-modules-core';

export interface NativeImageProcessingOptions {
  /** Local file URI to analyze */
  uri?: string;
  /** Texture identifier to analyze if available */
  textureId?: number;
  /** Requested resize width; aspect ratio preserved */
  targetWidth?: number;
}

export interface NativeImageProcessingResult {
  pixels: Uint8Array;
  width: number;
  height: number;
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

  return {
    pixels: new Uint8Array(result.pixels),
    width: result.width,
    height: result.height,
  };
}

export function isNativeImageProcessingAvailable() {
  return Boolean(NativeImageProcessingModule?.processImage);
}
