/**
 * Browser-side image processing utilities
 * Extracts pixel data from images for analysis
 */

import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import type { ImageAnalysisResult } from '@toposonics/types';

/**
 * Load an image file and extract pixel data
 */
export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Extract pixel data from an image element
 */
export function extractPixelData(img: HTMLImageElement): {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Resize for performance if image is very large
  const maxDimension = 1200;
  let width = img.width;
  let height = img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = (height / width) * maxDimension;
      width = maxDimension;
    } else {
      width = (width / height) * maxDimension;
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);

  return {
    pixels: imageData.data,
    width,
    height,
  };
}

/**
 * Full pipeline: file -> analysis result
 */
export async function analyzeImageFile(file: File): Promise<{
  analysis: ImageAnalysisResult;
  imageDataUrl: string;
  width: number;
  height: number;
}> {
  const img = await loadImageFromFile(file);
  const { pixels, width, height } = extractPixelData(img);

  const analysis = analyzeImageForLinearLandscape(pixels, width, height, {
    maxSamples: 64,
    includeDepth: true,
    averageRows: true,
    rowsToAverage: 5,
  });

  // Also get data URL for thumbnail
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
  }

  return {
    analysis,
    imageDataUrl: canvas.toDataURL('image/jpeg', 0.8),
    width,
    height,
  };
}
