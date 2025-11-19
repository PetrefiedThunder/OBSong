/**
 * @toposonics/core-audio
 * Audio mapping utilities for converting image features to musical events
 *
 * This package provides the core logic for mapping ImageAnalysisResult
 * objects to arrays of NoteEvent objects, which can then be rendered
 * by any audio engine (Tone.js, expo-av, etc.)
 */

// Export scale utilities
export {
  getScaleNotes,
  valueToScaleIndex,
  brightnessToScaleIndex,
  getKeyOffset,
  midiToNoteName,
  noteNameToMidi,
  noteToFrequency,
} from './scales';

// Export mapping functions
export {
  mapLinearLandscape,
  mapDepthRidge,
  quantizeNotes,
  scaleVelocity,
  transposeNotes,
} from './mappers';

// Export preset utilities
export {
  SOUND_PRESETS,
  getPresetById,
  getDefaultPreset,
  getAllPresets,
} from './presets';

// Re-export types for convenience
export type {
  NoteEvent,
  SoundPreset,
  LinearLandscapeOptions,
  DepthRidgeOptions,
  ScaleType,
  KeyType,
  MappingMode,
} from '@toposonics/types';
