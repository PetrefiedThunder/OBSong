/**
 * Sound preset definitions
 */

import type { SoundPreset } from '@toposonics/types';

/**
 * Built-in sound presets for TopoSonics
 */
export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'sine-soft',
    name: 'Soft Sine',
    oscillatorType: 'sine',
    description: 'Gentle, pure tone - good for landscapes and ambient textures',
    synthesis: {
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.6,
        release: 0.8,
      },
      filter: {
        type: 'lowpass',
        frequency: 2000,
        resonance: 1,
      },
      effects: {
        reverb: { wet: 0.3, decay: 2.5 },
      },
    },
  },
  {
    id: 'triangle-warm',
    name: 'Warm Triangle',
    oscillatorType: 'triangle',
    description: 'Warm, mellow tone with subtle harmonics',
    synthesis: {
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.7,
        release: 0.5,
      },
      filter: {
        type: 'lowpass',
        frequency: 1500,
        resonance: 2,
      },
      effects: {
        reverb: { wet: 0.2, decay: 1.5 },
      },
    },
  },
  {
    id: 'square-bright',
    name: 'Bright Square',
    oscillatorType: 'square',
    description: 'Bright, digital sound - good for urban scenes',
    synthesis: {
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3,
      },
      filter: {
        type: 'lowpass',
        frequency: 3000,
        resonance: 3,
      },
      effects: {
        reverb: { wet: 0.15, decay: 1.0 },
      },
    },
  },
  {
    id: 'sawtooth-rich',
    name: 'Rich Sawtooth',
    oscillatorType: 'sawtooth',
    description: 'Rich harmonics - good for mountains and dramatic scenes',
    synthesis: {
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.7,
        release: 0.6,
      },
      filter: {
        type: 'lowpass',
        frequency: 2500,
        resonance: 4,
      },
      effects: {
        reverb: { wet: 0.4, decay: 3.0 },
      },
    },
  },
  {
    id: 'sine-ambient',
    name: 'Ambient Pad',
    oscillatorType: 'sine',
    description: 'Long, sustained ambient texture',
    synthesis: {
      envelope: {
        attack: 0.5,
        decay: 0.3,
        sustain: 0.8,
        release: 2.0,
      },
      filter: {
        type: 'lowpass',
        frequency: 1000,
        resonance: 1,
      },
      effects: {
        reverb: { wet: 0.6, decay: 5.0 },
        delay: { time: 0.375, feedback: 0.3 },
      },
    },
  },
  {
    id: 'triangle-pluck',
    name: 'Plucked',
    oscillatorType: 'triangle',
    description: 'Short, plucked notes - good for rhythmic textures',
    synthesis: {
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.1,
        release: 0.2,
      },
      filter: {
        type: 'lowpass',
        frequency: 4000,
        resonance: 2,
      },
      effects: {
        reverb: { wet: 0.1, decay: 0.8 },
      },
    },
  },
];

/**
 * Get a preset by ID
 *
 * @param id - Preset identifier
 * @returns Sound preset or undefined if not found
 */
export function getPresetById(id: string): SoundPreset | undefined {
  return SOUND_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get the default preset
 *
 * @returns Default sound preset
 */
export function getDefaultPreset(): SoundPreset {
  return SOUND_PRESETS[0]; // Soft Sine
}

/**
 * Get all available presets
 *
 * @returns Array of all sound presets
 */
export function getAllPresets(): SoundPreset[] {
  return [...SOUND_PRESETS];
}
