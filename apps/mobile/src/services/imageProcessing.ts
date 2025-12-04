import type { ImageAnalysisResult, NoteEvent, KeyType, ScaleType } from '@toposonics/types';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import { mapLinearLandscape } from '@toposonics/core-audio';
import { processImage } from '@toposonics/native-image-processing';

export interface PixelExtractionResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export async function extractPixelsFromImage(
  uri: string,
  options: { targetWidth?: number } = {}
): Promise<PixelExtractionResult> {
  const { targetWidth = 640 } = options;

  const nativeResult = await processImage({ uri, targetWidth });
  const pixels = new Uint8ClampedArray(nativeResult.pixels);

  return {
    pixels,
    width: nativeResult.width,
    height: nativeResult.height,
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
  const { pixels, width, height } = await extractPixelsFromImage(uri);

  const baseAnalysis = analyzeImageForLinearLandscape(pixels, width, height, {
    averageRows: true,
    rowsToAverage: 7,
    includeDepth: false,
    includeRidges: true,
  });

  const depthFrame = await requestNativeDepthMap({
    imageUri: uri,
    targetWidth: width,
    targetHeight: height,
  });

  const targetLength = baseAnalysis.brightnessProfile.length;
  const depthProfile = depthFrame
    ? deriveDepthProfileFromFrame(depthFrame, targetLength)
    : computeSimpleDepthProfile(baseAnalysis.brightnessProfile);

  const depthSource: DepthSource = depthFrame?.source ?? (depthFrame ? 'UNKNOWN' : 'HEURISTIC');
  const depthUnit: DepthUnit = depthFrame?.unit ?? (depthFrame ? 'meters' : 'normalized');

  const analysis: ImageAnalysisResult = {
    ...baseAnalysis,
    depthProfile,
    metadata: {
      ...baseAnalysis.metadata,
      depthSource,
      depthUnit,
      depthCaptureTimestamp: depthFrame?.timestamp,
    },
  };

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
