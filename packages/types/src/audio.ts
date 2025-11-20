/**
 * Audio and musical event structures shared across the platform.
 */
export interface NoteEvent {
  /** Note in scientific pitch notation (e.g., "C4", "A#5"). */
  note: string;
  /** Start time in seconds (or beats, depending on context). */
  start: number;
  /** Duration in seconds (or beats). */
  duration: number;
  /** Velocity/volume (0-1). */
  velocity: number;
  /** Optional: Stereo pan position (-1 = left, 0 = center, 1 = right). */
  pan?: number;
  /** Optional: Track/layer identifier for multi-track compositions (use VoiceType for multi-voice mode). */
  trackId?: string;
  /** Optional: Effect parameters for this note. */
  effects?: {
    /** Reverb send amount (0-1). */
    reverbSend?: number;
    /** Filter cutoff frequency multiplier (0-1). */
    filterCutoff?: number;
    /** Additional custom effect parameters. */
    [key: string]: number | undefined;
  };
}

/**
 * Sound preset/instrument configuration used by Tone.js or other synth engines.
 */
export interface SoundPreset {
  /** Unique preset identifier. */
  id: string;
  /** Human-readable preset name. */
  name: string;
  /** Base oscillator waveform type. */
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  /** Optional description of the preset's character. */
  description?: string;
  /** Optional: Advanced synthesis parameters. */
  synthesis?: {
    /** ADSR envelope settings. */
    envelope?: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
    /** Filter settings. */
    filter?: {
      type: 'lowpass' | 'highpass' | 'bandpass';
      frequency: number;
      resonance: number;
    };
    /** Effect chain. */
    effects?: {
      reverb?: { wet: number; decay: number };
      delay?: { time: number; feedback: number };
    };
  };
}
