/**
 * Shared types for mapping visual features into audio structures.
 */

/**
 * Supported mapping modes for converting images to audio.
 */
export type MappingMode = 'LINEAR_LANDSCAPE' | 'DEPTH_RIDGE' | 'MULTI_VOICE';

/**
 * Voice types for multi-voice compositions. Each voice represents a distinct musical layer.
 */
export type VoiceType = 'bass' | 'melody' | 'pad' | 'fx';

/**
 * Musical scale types used to constrain generated notes.
 */
export type ScaleType =
  | 'C_MAJOR'
  | 'C_MINOR'
  | 'D_MAJOR'
  | 'E_MINOR'
  | 'A_MINOR'
  | 'A_SHARP_MINOR'
  | 'G_MAJOR'
  | 'C_PENTATONIC'
  | 'A_MINOR_PENTATONIC'
  | 'C_BLUES'
  | 'D_DORIAN'
  | 'A_DORIAN'
  | 'C_MIXOLYDIAN'
  | 'E_PHRYGIAN';

/**
 * Musical key/root note for mapping and playback.
 */
export type KeyType = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/**
 * Configuration for a single voice in a multi-voice preset.
 */
export interface VoiceConfig {
  /** Whether this voice is enabled. */
  enabled: boolean;
  /** Minimum note in scientific notation (e.g., "C2"). */
  minNote: string;
  /** Maximum note in scientific notation (e.g., "C4"). */
  maxNote: string;
  /** Note density (0-1): 0 = sparse, 1 = dense. */
  density: number;
  /** Duration multiplier (0-2): 1 = normal, >1 longer, <1 shorter. */
  durationFactor: number;
  /** Minimum velocity (0-1). */
  velocityMin: number;
  /** Maximum velocity (0-1). */
  velocityMax: number;
  /** Reverb send amount (0-1). */
  reverbSend: number;
  /** Filter brightness (0-1): 0 = dark, 1 = bright. */
  filterBrightness: number;
  /** Stereo spread (0-1): 0 = center, 1 = wide. */
  stereoSpread: number;
}

/**
 * Weights for mapping visual features to a voice.
 */
export interface MappingBias {
  /** Weight for horizon/contour influence (0-1). */
  horizonWeight: number;
  /** Weight for ridge/peak influence (0-1). */
  ridgeWeight: number;
  /** Weight for texture/variance influence (0-1). */
  textureWeight: number;
  /** Weight for depth influence (0-1). */
  depthWeight: number;
}

/**
 * A complete musical preset defining the behavior of all voices.
 */
export interface TopoPreset {
  /** Unique preset identifier. */
  id: string;
  /** Human-readable preset name. */
  name: string;
  /** Description of the preset's character. */
  description: string;
  /** Default musical key. */
  defaultKey: KeyType;
  /** Default musical scale. */
  defaultScale: ScaleType;
  /** Default tempo in BPM. */
  defaultTempoBpm: number;
  /** Mapping mode to use. */
  mappingMode: 'SIMPLE' | 'MULTI_VOICE';
  /** Configuration for each voice. */
  voices: {
    bass: VoiceConfig;
    melody: VoiceConfig;
    pad: VoiceConfig;
    fx: VoiceConfig;
  };
  /** Mapping biases for each voice. */
  mappingBias: {
    bass: MappingBias;
    melody: MappingBias;
    pad: MappingBias;
    fx: MappingBias;
  };
}

/**
 * Scene Pack: A curated experience bundle combining preset, visual guidance, and demo assets.
 */
export interface ScenePack {
  /** Unique scene pack identifier. */
  id: string;
  /** Scene pack name. */
  name: string;
  /** Short tagline describing the scene. */
  tagline: string;
  /** Detailed description. */
  description: string;
  /** Category for grouping and filtering. */
  category: 'Nature' | 'Urban' | 'Atmospheric';
  /** Associated TopoPreset ID. */
  presetId: string;
  /** Recommended image subjects for this scene. */
  recommendedSubjects: string[];
  /** Recommended lighting conditions. */
  recommendedLighting: string;
  /** Optional usage notes. */
  recommendedUsageNotes?: string;
  /** Demo assets. */
  demoAssets?: {
    /** Path to sample image (e.g., "/demo/mountains-01.jpg"). */
    sampleImagePath?: string;
    /** Pre-generated composition ID. */
    sampleCompositionId?: string;
  };
  /** UI theming hints. */
  uiThemeHints?: {
    /** Accent color (hex). */
    accentColor?: string;
    /** Background style preference. */
    backgroundStyle?: 'dark' | 'light';
    /** Tailwind gradient class suggestion. */
    gradientClassName?: string;
  };
}

/**
 * Configuration options for the LINEAR_LANDSCAPE mapping mode.
 */
export interface LinearLandscapeOptions {
  /** Musical key. */
  key: KeyType;
  /** Musical scale. */
  scale: ScaleType;
  /** Maximum number of notes to generate (downsamples if needed). */
  maxNotes?: number;
  /** Duration of each note in beats. */
  noteDurationBeats?: number;
  /** Whether to apply stereo panning based on horizontal position. */
  enablePanning?: boolean;
  /** Whether to apply velocity variation based on brightness. */
  enableVelocityVariation?: boolean;
}

/**
 * Configuration options for the DEPTH_RIDGE mapping mode (future).
 */
export interface DepthRidgeOptions extends LinearLandscapeOptions {
  /** Sensitivity threshold for ridge detection (0-1). */
  ridgeThreshold?: number;
  /** Whether to emphasize depth in reverb amount. */
  depthToReverb?: boolean;
}

/**
 * Configuration options for the multi-voice mapping mode.
 */
export interface MultiVoiceOptions {
  /** Musical key. */
  key: KeyType;
  /** Musical scale. */
  scale: ScaleType;
  /** Tempo in BPM. */
  tempoBpm?: number;
  /** Enable bass voice (horizon → low notes). */
  enableBass?: boolean;
  /** Enable melody voice (ridges → high notes). */
  enableMelody?: boolean;
  /** Enable pad voice (texture → chords/ambient). */
  enablePad?: boolean;
  /** Enable spatial FX layer. */
  enableFx?: boolean;
  /** Bass voice configuration. */
  bassOptions?: {
    /** Pitch range for bass (default: C2-C3). */
    minNote?: string;
    /** Pitch range for bass (default: C2-C3). */
    maxNote?: string;
    /** Note duration in beats (default: 2-4). */
    noteDuration?: number;
  };
  /** Melody voice configuration. */
  melodyOptions?: {
    /** Pitch range for melody (default: C4-C6). */
    minNote?: string;
    /** Pitch range for melody (default: C4-C6). */
    maxNote?: string;
    /** Minimum ridge threshold to trigger notes (0-1). */
    ridgeThreshold?: number;
  };
  /** Pad voice configuration. */
  padOptions?: {
    /** Number of chord segments (default: 4-8). */
    segments?: number;
    /** Note duration in beats (default: 4-8). */
    noteDuration?: number;
  };
}
