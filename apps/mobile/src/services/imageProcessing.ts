import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'fast-png';
import type {
  DepthSource,
  DepthUnit,
  ImageAnalysisResult,
  KeyType,
  NoteEvent,
  ScaleType,
} from '@toposonics/types';
import {
  analyzeImageForLinearLandscape,
  computeSimpleDepthProfile,
  downsampleProfile,
} from '@toposonics/core-image';
import { mapLinearLandscape } from '@toposonics/core-audio';
import { requestNativeDepthMap, type DepthFrame } from '../native/depthProvider';

export interface PixelExtractionResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  base64: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeDepthSamples(samples: number[]): number[] {
  const valid = samples.filter((value) => Number.isFinite(value) && value > 0);

  if (valid.length === 0) {
    return samples.map(() => 0);
  }

  const minDepth = Math.min(...valid);
  const maxDepth = Math.max(...valid);
  const depthRange = Math.max(maxDepth - minDepth, 1e-3);

  return samples.map((value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    const normalizedDistance = (value - minDepth) / depthRange;
    return 1 - clamp(normalizedDistance, 0, 1);
  });
}

function deriveDepthProfileFromFrame(
  frame: DepthFrame,
  targetLength: number,
  rowsToAverage = 5
): number[] {
  const centerRow = Math.floor(frame.height / 2);
  const halfWindow = Math.floor(rowsToAverage / 2);
  const rawProfile: number[] = [];

  for (let x = 0; x < frame.width; x++) {
    let accumulator = 0;
    let count = 0;

    for (let offset = -halfWindow; offset <= halfWindow; offset++) {
      const row = clamp(centerRow + offset, 0, frame.height - 1);
      const index = row * frame.width + x;
      const depthValue = frame.data[index];

      if (Number.isFinite(depthValue) && depthValue > 0) {
        accumulator += depthValue;
        count++;
      }
    }

    rawProfile.push(count > 0 ? accumulator / count : Number.NaN);
  }

  const normalized = normalizeDepthSamples(rawProfile);
  return normalized.length === targetLength
    ? normalized
    : downsampleProfile(normalized, targetLength);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const BufferRef = (globalThis as typeof globalThis & { Buffer?: { from: (input: string, encoding: string) => Uint8Array } }).Buffer;
  if (BufferRef) {
    return Uint8Array.from(BufferRef.from(base64, 'base64'));
  }

  const binaryString = globalThis.atob?.(base64);
  if (!binaryString) {
    throw new Error('Base64 decoding not supported');
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function extractPixelsFromImage(
  uri: string,
  options: { targetWidth?: number } = {}
): Promise<PixelExtractionResult> {
  const { targetWidth = 640 } = options;

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetWidth } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.PNG,
      base64: true,
    }
  );

  if (!manipulated.base64) {
    throw new Error('Failed to extract base64 from image');
  }

  const pngBytes = base64ToUint8Array(manipulated.base64);
  const decoded = decode(pngBytes);
  const pixels = new Uint8ClampedArray(decoded.data);

  return {
    pixels,
    width: decoded.width,
    height: decoded.height,
    base64: manipulated.base64,
  };
}

export interface CompositionGenerationResult {
  analysis: ImageAnalysisResult;
  noteEvents: NoteEvent[];
  metadata: {
    key: KeyType;
    scale: ScaleType;
  };
  imageBase64: string;
}

export async function generateCompositionFromImage(
  uri: string,
  options: {
    key: KeyType;
    scale: ScaleType;
    maxNotes?: number;
  }
): Promise<CompositionGenerationResult> {
  const { pixels, width, height, base64 } = await extractPixelsFromImage(uri);

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
    imageBase64: base64,
  };
}
