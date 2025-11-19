/**
 * @toposonics/core-image
 * Environment-agnostic image analysis utilities for TopoSonics
 *
 * This package provides functions for analyzing images and extracting
 * features that can be mapped to musical parameters.
 *
 * All functions are pure and environment-agnostic (no DOM/Canvas dependencies).
 * The consuming application is responsible for extracting pixel data.
 */

// Export brightness utilities
export {
  computePixelBrightness,
  computeBrightnessProfileFromRow,
  computeNormalizedBrightness,
  downsampleProfile,
  computeAveragedBrightnessProfile,
} from './brightness';

// Export depth utilities
export {
  computeSimpleDepthProfile,
  detectRidges,
  smoothProfile,
} from './depth';

// Export main analyzers
export {
  analyzeImageForLinearLandscape,
  analyzeImageForDepthRidge,
  analyzeImageForMultiVoice,
  analyzeImageQuick,
} from './analyzer';

// Export horizon utilities
export {
  computeHorizonProfile,
  smoothHorizonProfile,
  extractHorizonContour,
} from './horizon';

// Export texture utilities
export {
  computeTextureFromBrightness,
  computeTextureProfile,
  segmentTexture,
  classifyTexture,
} from './texture';

// Re-export types for convenience
export type { ImageAnalysisResult } from '@toposonics/types';
