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
export type MappingMode = 'LINEAR_LANDSCAPE' | 'DEPTH_RIDGE';

/**
 * Musical scale types
 */
export type ScaleType =
  | 'C_MAJOR'
  | 'C_MINOR'
  | 'A_MINOR'
  | 'C_PENTATONIC'
  | 'A_MINOR_PENTATONIC'
  | 'C_BLUES'
  | 'D_DORIAN'
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

  /** Optional: Track/layer identifier for multi-track compositions */
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

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Re-export everything for convenience
};
