import type {
  ImageAnalysisResult,
  NoteEvent,
  KeyType,
  ScaleType,
  MappingMode,
} from '@toposonics/types';
import { Platform } from 'react-native';
import {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
  analyzeImageForMultiVoice,
} from '@toposonics/core-image';
import {
  mapLinearLandscape,
  mapDepthRidge,
  mapImageToMultiVoiceComposition,
} from '@toposonics/core-audio';

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
  options: { targetWidth?: number; includeRidgeStrength?: boolean } = {}
): Promise<PixelExtractionResult> {
  // Ridge strength runs a native Sobel pass over the full frame, so only request it when
  // the caller (the DEPTH_RIDGE mode) will actually consume it.
  const { targetWidth = 640, includeRidgeStrength = false } = options;
  const { processImage } = await import('@toposonics/native-image-processing');

  const nativeResult = await processImage({ uri, targetWidth, includeRidgeStrength });
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
    mappingMode: MappingMode;
  };
  sourceUri: string;
}

export async function generateCompositionFromImage(
  uri: string,
  options: {
    key: KeyType;
    scale: ScaleType;
    mode?: MappingMode;
    maxNotes?: number;
  }
): Promise<CompositionGenerationResult> {
  if (Platform.OS === 'ios') {
    throw new Error('On-device image generation is currently available on Android only.');
  }

  const mode = options.mode ?? 'LINEAR_LANDSCAPE';
  const { pixels, width, height, ridgeStrength, ridgeWidth, ridgeHeight } =
    await extractPixelsFromImage(uri, { includeRidgeStrength: mode === 'DEPTH_RIDGE' });

  let analysis: ImageAnalysisResult;
  let noteEvents: NoteEvent[];

  switch (mode) {
    case 'DEPTH_RIDGE': {
      // Reuse the native Sobel pass when its dimensions match the decoded frame; the
      // analyzer safely recomputes edges in JS when it is omitted.
      const precomputedEdgeMagnitudes =
        ridgeStrength && ridgeWidth != null && ridgeHeight != null && ridgeWidth * ridgeHeight === width * height
          ? ridgeStrength
          : undefined;
      analysis = analyzeImageForDepthRidge(pixels, width, height, {
        ...(precomputedEdgeMagnitudes && { precomputedEdgeMagnitudes }),
      });
      noteEvents = mapDepthRidge(analysis, {
        key: options.key,
        scale: options.scale,
        maxNotes: options.maxNotes ?? 96,
        noteDurationBeats: 0.35,
        ridgeThreshold: 0.35,
        depthToReverb: true,
      });
      break;
    }
    case 'MULTI_VOICE': {
      analysis = analyzeImageForMultiVoice(pixels, width, height);
      noteEvents = mapImageToMultiVoiceComposition(analysis, {
        key: options.key,
        scale: options.scale,
      });
      break;
    }
    case 'LINEAR_LANDSCAPE':
    default: {
      analysis = analyzeImageForLinearLandscape(pixels, width, height, {
        averageRows: true,
        rowsToAverage: 7,
      });
      noteEvents = mapLinearLandscape(analysis, {
        key: options.key,
        scale: options.scale,
        maxNotes: options.maxNotes ?? 96,
        noteDurationBeats: 0.35,
      });
      break;
    }
  }

  return {
    analysis,
    noteEvents,
    metadata: {
      key: options.key,
      scale: options.scale,
      mappingMode: mode,
    },
    sourceUri: uri,
  };
}
