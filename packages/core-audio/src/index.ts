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
  // Multi-voice mapping functions
  mapHorizonToBass,
  mapRidgesToMelody,
  mapTextureToPad,
  mapImageToMultiVoiceComposition,
} from './mappers';

// Export MIDI helpers
export { compositionToMidiBlob, noteEventsToMidiBlob } from './midi';

// Export preset utilities
export {
  SOUND_PRESETS,
  getPresetById,
  getDefaultPreset,
  getAllPresets,
} from './presets';

// Export TopoSonics musical presets
export {
  TOPO_PRESETS,
  getTopoPresetById,
  getDefaultTopoPreset,
  getAllTopoPresets,
} from './topoPresets';

// Export Scene Packs
export {
  SCENE_PACKS,
  getScenePackById,
  getScenePreset,
  getAllScenePacks,
} from './scenePacks';

// Re-export types for convenience
export type {
  NoteEvent,
  SoundPreset,
  LinearLandscapeOptions,
  DepthRidgeOptions,
  MultiVoiceOptions,
  ScaleType,
  KeyType,
  MappingMode,
  VoiceType,
  TopoPreset,
  VoiceConfig,
  MappingBias,
  ScenePack,
} from '@toposonics/types';
