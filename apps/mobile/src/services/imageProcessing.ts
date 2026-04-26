import type { ImageAnalysisResult, NoteEvent, KeyType, ScaleType } from '@toposonics/types';
import { Platform } from 'react-native';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import { mapLinearLandscape } from '@toposonics/core-audio';

export interface PixelExtractionResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  ridgeStrength?: Uint8ClampedArray;
  ridgeWidth?: number;
  ridgeHeight?: number;
}

export async function extractPixelsFromImage(
  uri: string,
  options: { targetWidth?: number } = {}
): Promise<PixelExtractionResult> {
  const { targetWidth = 640 } = options;
  const { processImage } = await import('@toposonics/native-image-processing');

  const nativeResult = await processImage({ uri, targetWidth, includeRidgeStrength: true });
  const pixels = new Uint8ClampedArray(nativeResult.pixels);

  return {
    pixels,
    width: nativeResult.width,
    height: nativeResult.height,
    ...(nativeResult.ridgeStrength && {
      ridgeStrength: new Uint8ClampedArray(nativeResult.ridgeStrength),
      ridgeWidth: nativeResult.ridgeWidth,
      ridgeHeight: nativeResult.ridgeHeight,
    }),
  };
}

export interface CompositionGenerationResult {
  analysis: ImageAnalysisResult;
  noteEvents: NoteEvent[];
  metadata: {
    key: KeyType;
    scale: ScaleType;
  };
  sourceUri: string;
}

export async function generateCompositionFromImage(
  uri: string,
  options: {
    key: KeyType;
    scale: ScaleType;
    maxNotes?: number;
  }
): Promise<CompositionGenerationResult> {
  if (Platform.OS === 'ios') {
    throw new Error('On-device image generation is currently available on Android only.');
  }

  const { pixels, width, height } = await extractPixelsFromImage(uri);

  const analysis: ImageAnalysisResult = analyzeImageForLinearLandscape(pixels, width, height, {
    averageRows: true,
    rowsToAverage: 7,
  });

  const noteEvents = mapLinearLandscape(analysis, {
    key: options.key,
    scale: options.scale,
    maxNotes: options.maxNotes ?? 96,
    noteDurationBeats: 0.35,
  });

  return {
    analysis,
    noteEvents,
    metadata: {
      key: options.key,
      scale: options.scale,
    },
    sourceUri: uri,
  };
}
