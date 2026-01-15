import type { ImageAnalysisResult, NoteEvent, KeyType, ScaleType } from '@toposonics/types';
import { analyzeImageForLinearLandscape, analyzeImageForDepthRidge } from '@toposonics/core-image';
import { mapLinearLandscape } from '@toposonics/core-audio';
import { processImage } from '@toposonics/native-image-processing';

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
    mappingMode?: 'LINEAR_LANDSCAPE' | 'DEPTH_RIDGE';
  }
): Promise<CompositionGenerationResult> {
  const { pixels, width, height, ridgeStrength } = await extractPixelsFromImage(uri);

  let analysis: ImageAnalysisResult;

  // Choose analysis based on mapping mode and available data
  if (options.mappingMode === 'DEPTH_RIDGE' && ridgeStrength) {
    analysis = analyzeImageForDepthRidge(pixels, width, height, {
      ridgeThreshold: 0.5, // Default threshold
    });
  } else {
    analysis = analyzeImageForLinearLandscape(pixels, width, height, {
      averageRows: true,
      rowsToAverage: 7,
    });
  }

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
