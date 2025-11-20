import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'fast-png';
import type { ImageAnalysisResult, NoteEvent, KeyType, ScaleType } from '@toposonics/types';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import { mapLinearLandscape } from '@toposonics/core-audio';

export interface PixelExtractionResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  base64: string;
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

  const analysis = analyzeImageForLinearLandscape(pixels, width, height, {
    averageRows: true,
    rowsToAverage: 7,
    includeDepth: true,
    includeRidges: true,
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
    imageBase64: base64,
  };
}
