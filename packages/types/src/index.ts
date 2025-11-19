/**
 * @toposonics/types
 * Shared TypeScript types and interfaces for the TopoSonics platform
 */

// ============================================================================
// MAPPING & ANALYSIS TYPES
// ============================================================================

/**
 * Supported mapping modes for converting images to audio
 */
export type MappingMode = 'LINEAR_LANDSCAPE' | 'DEPTH_RIDGE' | 'MULTI_VOICE';

/**
 * Voice types for multi-voice compositions
 * Each voice represents a different musical layer in the soundscape
 */
export type VoiceType = 'bass' | 'melody' | 'pad' | 'fx';

/**
 * Configuration for a single voice in a multi-voice preset
 */
export interface VoiceConfig {
  /** Whether this voice is enabled */
  enabled: boolean;
  /** Minimum note in scientific notation (e.g., "C2") */
  minNote: string;
  /** Maximum note in scientific notation (e.g., "C4") */
  maxNote: string;
  /** Note density (0-1): 0 = sparse, 1 = dense */
  density: number;
  /** Duration multiplier (0-2): 1 = normal, >1 longer, <1 shorter */
  durationFactor: number;
  /** Minimum velocity (0-1) */
  velocityMin: number;
  /** Maximum velocity (0-1) */
  velocityMax: number;
  /** Reverb send amount (0-1) */
  reverbSend: number;
  /** Filter brightness (0-1): 0 = dark, 1 = bright */
  filterBrightness: number;
  /** Stereo spread (0-1): 0 = center, 1 = wide */
  stereoSpread: number;
}

/**
 * Weights for mapping visual features to a voice
 */
export interface MappingBias {
  /** Weight for horizon/contour influence (0-1) */
  horizonWeight: number;
  /** Weight for ridge/peak influence (0-1) */
  ridgeWeight: number;
  /** Weight for texture/variance influence (0-1) */
  textureWeight: number;
  /** Weight for depth influence (0-1) */
  depthWeight: number;
}

/**
 * A complete musical preset defining the behavior of all voices
 */
export interface TopoPreset {
  /** Unique preset identifier */
  id: string;
  /** Human-readable preset name */
  name: string;
  /** Description of the preset's character */
  description: string;
  /** Default musical key */
  defaultKey: KeyType;
  /** Default musical scale */
  defaultScale: ScaleType;
  /** Default tempo in BPM */
  defaultTempoBpm: number;
  /** Mapping mode to use */
  mappingMode: 'SIMPLE' | 'MULTI_VOICE';
  /** Configuration for each voice */
  voices: {
    bass: VoiceConfig;
    melody: VoiceConfig;
    pad: VoiceConfig;
    fx: VoiceConfig;
  };
  /** Mapping biases for each voice */
  mappingBias: {
    bass: MappingBias;
    melody: MappingBias;
    pad: MappingBias;
    fx: MappingBias;
  };
}

/**
 * Scene Pack: A curated experience bundle combining preset, visual guidance, and demo assets
 */
export interface ScenePack {
  /** Unique scene pack identifier */
  id: string;
  /** Scene pack name */
  name: string;
  /** Short tagline describing the scene */
  tagline: string;
  /** Detailed description */
  description: string;
  /** Category for grouping and filtering */
  category: 'Nature' | 'Urban' | 'Atmospheric';

  /** Associated TopoPreset ID */
  presetId: string;

  /** Recommended image subjects for this scene */
  recommendedSubjects: string[];
  /** Recommended lighting conditions */
  recommendedLighting: string;
  /** Optional usage notes */
  recommendedUsageNotes?: string;

  /** Demo assets */
  demoAssets?: {
    /** Path to sample image (e.g., "/demo/mountains-01.jpg") */
    sampleImagePath?: string;
    /** Pre-generated composition ID */
    sampleCompositionId?: string;
  };

  /** UI theming hints */
  uiThemeHints?: {
    /** Accent color (hex) */
    accentColor?: string;
    /** Background style preference */
    backgroundStyle?: 'dark' | 'light';
    /** Tailwind gradient class suggestion */
    gradientClassName?: string;
  };
}

/**
 * Musical scale types
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
 * Musical key/root note
 */
export type KeyType =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

// ============================================================================
// IMAGE ANALYSIS
// ============================================================================

/**
 * Result of analyzing an image for musical mapping
 * Contains extracted features like brightness and depth profiles
 */
export interface ImageAnalysisResult {
  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** Brightness values (0-255) sampled horizontally across the image */
  brightnessProfile: number[];

  /** Optional: Strength of ridge/edge features at each horizontal position (0-1) */
  ridgeStrength?: number[];

  /** Optional: Estimated depth values at each horizontal position (0-1, higher = closer) */
  depthProfile?: number[];

  /** Optional: Horizon/base contour height at each horizontal position (0-1) */
  horizonProfile?: number[];

  /** Optional: Texture/variance values at each horizontal position (0-1) */
  textureProfile?: number[];

  /** Optional: Additional metadata about the analysis */
  metadata?: {
    samplingMethod?: string;
    rowIndex?: number;
    timestamp?: number;
  };
}

// ============================================================================
// AUDIO & MUSICAL EVENTS
// ============================================================================

/**
 * A single musical note event with timing, pitch, and effects
 */
export interface NoteEvent {
  /** Note in scientific pitch notation (e.g., "C4", "A#5") */
  note: string;

  /** Start time in seconds (or beats, depending on context) */
  start: number;

  /** Duration in seconds (or beats) */
  duration: number;

  /** Velocity/volume (0-1) */
  velocity: number;

  /** Optional: Stereo pan position (-1 = left, 0 = center, 1 = right) */
  pan?: number;

  /** Optional: Track/layer identifier for multi-track compositions (use VoiceType for multi-voice mode) */
  trackId?: string;

  /** Optional: Effect parameters for this note */
  effects?: {
    /** Reverb send amount (0-1) */
    reverbSend?: number;

    /** Filter cutoff frequency multiplier (0-1) */
    filterCutoff?: number;

    /** Additional custom effect parameters */
    [key: string]: number | undefined;
  };
}

/**
 * Sound preset/instrument configuration
 */
export interface SoundPreset {
  /** Unique preset identifier */
  id: string;

  /** Human-readable preset name */
  name: string;

  /** Base oscillator waveform type */
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';

  /** Optional description of the preset's character */
  description?: string;

  /** Optional: Advanced synthesis parameters */
  synthesis?: {
    /** ADSR envelope settings */
    envelope?: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };

    /** Filter settings */
    filter?: {
      type: 'lowpass' | 'highpass' | 'bandpass';
      frequency: number;
      resonance: number;
    };

    /** Effect chain */
    effects?: {
      reverb?: { wet: number; decay: number };
      delay?: { time: number; feedback: number };
    };
  };
}

// ============================================================================
// COMPOSITION & PERSISTENCE
// ============================================================================

/**
 * A complete musical composition generated from an image
 */
export interface Composition {
  /** Unique composition identifier */
  id: string;

  /** User ID of the creator */
  userId: string;

  /** Composition title */
  title: string;

  /** Optional description or notes */
  description?: string;

  /** Array of all note events in this composition */
  noteEvents: NoteEvent[];

  /** Mapping mode used to generate this composition */
  mappingMode: MappingMode;

  /** Musical key */
  key: KeyType;

  /** Musical scale */
  scale: ScaleType;

  /** Sound preset used */
  presetId?: string;

  /** Tempo in BPM (beats per minute) */
  tempo?: number;

  /** Optional: Base64-encoded thumbnail of source image */
  imageThumbnail?: string;

  /** Optional: Full image data URL (may be large) */
  imageData?: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Optional: Additional metadata */
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    noteCount?: number;
    duration?: number;
    tags?: string[];
  };
}

/**
 * DTO for creating a new composition (excludes generated fields)
 */
export type CreateCompositionDTO = Omit<
  Composition,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * DTO for updating an existing composition
 */
export type UpdateCompositionDTO = Partial<
  Omit<Composition, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

/**
 * User account (stub for future implementation)
 */
export interface User {
  /** Unique user identifier */
  id: string;

  /** User email */
  email: string;

  /** Display name */
  displayName?: string;

  /** Account creation date */
  createdAt: Date;

  /** Last login timestamp */
  lastLoginAt?: Date;
}

/**
 * Authentication token response
 */
export interface AuthTokenResponse {
  /** JWT or session token */
  token: string;

  /** Token expiration timestamp */
  expiresAt?: Date;

  /** User information */
  user: User;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version?: string;
  uptime?: number;
}

// ============================================================================
// MAPPING CONFIGURATION
// ============================================================================

/**
 * Configuration options for the LINEAR_LANDSCAPE mapping mode
 */
export interface LinearLandscapeOptions {
  /** Musical key */
  key: KeyType;

  /** Musical scale */
  scale: ScaleType;

  /** Maximum number of notes to generate (downsamples if needed) */
  maxNotes?: number;

  /** Duration of each note in beats */
  noteDurationBeats?: number;

  /** Whether to apply stereo panning based on horizontal position */
  enablePanning?: boolean;

  /** Whether to apply velocity variation based on brightness */
  enableVelocityVariation?: boolean;
}

/**
 * Configuration options for the DEPTH_RIDGE mapping mode (future)
 */
export interface DepthRidgeOptions extends LinearLandscapeOptions {
  /** Sensitivity threshold for ridge detection (0-1) */
  ridgeThreshold?: number;

  /** Whether to emphasize depth in reverb amount */
  depthToReverb?: boolean;
}

/**
 * Configuration options for multi-voice mapping mode
 */
export interface MultiVoiceOptions {
  /** Musical key */
  key: KeyType;

  /** Musical scale */
  scale: ScaleType;

  /** Tempo in BPM */
  tempoBpm?: number;

  /** Enable bass voice (horizon → low notes) */
  enableBass?: boolean;

  /** Enable melody voice (ridges → high notes) */
  enableMelody?: boolean;

  /** Enable pad voice (texture → chords/ambient) */
  enablePad?: boolean;

  /** Enable spatial FX layer */
  enableFx?: boolean;

  /** Bass voice configuration */
  bassOptions?: {
    /** Pitch range for bass (default: C2-C3) */
    minNote?: string;
    maxNote?: string;
    /** Note duration in beats (default: 2-4) */
    noteDuration?: number;
  };

  /** Melody voice configuration */
  melodyOptions?: {
    /** Pitch range for melody (default: C4-C6) */
    minNote?: string;
    maxNote?: string;
    /** Minimum ridge threshold to trigger notes (0-1) */
    ridgeThreshold?: number;
  };

  /** Pad voice configuration */
  padOptions?: {
    /** Number of chord segments (default: 4-8) */
    segments?: number;
    /** Note duration in beats (default: 4-8) */
    noteDuration?: number;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Re-export everything for convenience
};
