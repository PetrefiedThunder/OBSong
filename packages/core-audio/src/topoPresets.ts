/**
 * TopoSonics Musical Presets
 * Named mood/character presets for image-to-audio mapping
 */

import type { TopoPreset } from '@toposonics/types';

/**
 * Catalog of all available TopoSonics presets
 */
export const TOPO_PRESETS: TopoPreset[] = [
  // ==================================================
  // PRESET 1: Majestic Mountains
  // ==================================================
  {
    id: 'majestic-mountains',
    name: 'Majestic Mountains',
    description: 'Wide, slow, cinematic. Perfect for ridgelines and vast landscapes.',
    defaultKey: 'D',
    defaultScale: 'D_MAJOR',
    defaultTempoBpm: 60,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'D2',
        maxNote: 'A2',
        density: 0.3,
        durationFactor: 1.8,
        velocityMin: 0.4,
        velocityMax: 0.7,
        reverbSend: 0.4,
        filterBrightness: 0.3,
        stereoSpread: 0.1,
      },
      melody: {
        enabled: true,
        minNote: 'A3',
        maxNote: 'D5',
        density: 0.5,
        durationFactor: 1.0,
        velocityMin: 0.4,
        velocityMax: 0.9,
        reverbSend: 0.6,
        filterBrightness: 0.6,
        stereoSpread: 0.3,
      },
      pad: {
        enabled: true,
        minNote: 'D3',
        maxNote: 'A4',
        density: 0.2,
        durationFactor: 2.0,
        velocityMin: 0.3,
        velocityMax: 0.6,
        reverbSend: 0.8,
        filterBrightness: 0.5,
        stereoSpread: 0.4,
      },
    },
  },

  // ==================================================
  // PRESET 2: Night City
  // ==================================================
  {
    id: 'night-city',
    name: 'Night City',
    description: 'Neon skyline, busy but moody. Great for urban scenes.',
    defaultKey: 'E',
    defaultScale: 'E_MINOR',
    defaultTempoBpm: 90,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'E2',
        maxNote: 'B2',
        density: 0.6,
        durationFactor: 0.8,
        velocityMin: 0.5,
        velocityMax: 0.9,
        reverbSend: 0.3,
        filterBrightness: 0.5,
        stereoSpread: 0.2,
      },
      melody: {
        enabled: true,
        minNote: 'B3',
        maxNote: 'E5',
        density: 0.7,
        durationFactor: 0.5,
        velocityMin: 0.4,
        velocityMax: 1.0,
        reverbSend: 0.4,
        filterBrightness: 0.8,
        stereoSpread: 0.5,
      },
      pad: {
        enabled: true,
        minNote: 'E3',
        maxNote: 'B4',
        density: 0.4,
        durationFactor: 1.5,
        velocityMin: 0.2,
        velocityMax: 0.6,
        reverbSend: 0.7,
        filterBrightness: 0.4,
        stereoSpread: 0.3,
      },
    },
  },

  // ==================================================
  // PRESET 3: Foggy Forest
  // ==================================================
  {
    id: 'foggy-forest',
    name: 'Foggy Forest',
    description: 'Low-contrast, moody, almost lo-fi. Soft attacks and darker tones.',
    defaultKey: 'A',
    defaultScale: 'A_DORIAN',
    defaultTempoBpm: 55,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'A1',
        maxNote: 'E2',
        density: 0.2,
        durationFactor: 2.0,
        velocityMin: 0.2,
        velocityMax: 0.5,
        reverbSend: 0.7,
        filterBrightness: 0.2,
        stereoSpread: 0.1,
      },
      melody: {
        enabled: true,
        minNote: 'E3',
        maxNote: 'C5',
        density: 0.3,
        durationFactor: 1.2,
        velocityMin: 0.3,
        velocityMax: 0.7,
        reverbSend: 0.9,
        filterBrightness: 0.3,
        stereoSpread: 0.4,
      },
      pad: {
        enabled: true,
        minNote: 'A2',
        maxNote: 'E4',
        density: 0.3,
        durationFactor: 2.0,
        velocityMin: 0.2,
        velocityMax: 0.6,
        reverbSend: 1.0,
        filterBrightness: 0.2,
        stereoSpread: 0.5,
      },
    },
  },

  // ==================================================
  // PRESET 4: Desert Drones
  // ==================================================
  {
    id: 'desert-drones',
    name: 'Desert Drones',
    description: 'Minimal, hypnotic, very slow-moving. Great for dunes and rock deserts.',
    defaultKey: 'C',
    defaultScale: 'C_PENTATONIC',
    defaultTempoBpm: 40,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'C1',
        maxNote: 'G2',
        density: 0.1,
        durationFactor: 2.5,
        velocityMin: 0.3,
        velocityMax: 0.8,
        reverbSend: 0.6,
        filterBrightness: 0.4,
        stereoSpread: 0.1,
      },
      melody: {
        enabled: true,
        minNote: 'G2',
        maxNote: 'D4',
        density: 0.2,
        durationFactor: 1.5,
        velocityMin: 0.3,
        velocityMax: 0.7,
        reverbSend: 0.5,
        filterBrightness: 0.5,
        stereoSpread: 0.3,
      },
      pad: {
        enabled: true,
        minNote: 'C2',
        maxNote: 'G4',
        density: 0.2,
        durationFactor: 2.5,
        velocityMin: 0.2,
        velocityMax: 0.6,
        reverbSend: 0.7,
        filterBrightness: 0.4,
        stereoSpread: 0.4,
      },
    },
  },

  // ==================================================
  // PRESET 5: Ocean Horizon
  // ==================================================
  {
    id: 'ocean-horizon',
    name: 'Ocean Horizon',
    description: 'Gentle, flowing, more legato and wavy. Perfect for seascapes.',
    defaultKey: 'G',
    defaultScale: 'G_MAJOR',
    defaultTempoBpm: 70,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'G2',
        maxNote: 'D3',
        density: 0.3,
        durationFactor: 1.8,
        velocityMin: 0.4,
        velocityMax: 0.8,
        reverbSend: 0.5,
        filterBrightness: 0.4,
        stereoSpread: 0.2,
      },
      melody: {
        enabled: true,
        minNote: 'D3',
        maxNote: 'G5',
        density: 0.6,
        durationFactor: 0.8,
        velocityMin: 0.4,
        velocityMax: 0.9,
        reverbSend: 0.7,
        filterBrightness: 0.6,
        stereoSpread: 0.5,
      },
      pad: {
        enabled: true,
        minNote: 'G3',
        maxNote: 'D5',
        density: 0.3,
        durationFactor: 2.0,
        velocityMin: 0.3,
        velocityMax: 0.7,
        reverbSend: 0.8,
        filterBrightness: 0.5,
        stereoSpread: 0.6,
      },
    },
  },

  // ==================================================
  // PRESET 6: Industrial Grid
  // ==================================================
  {
    id: 'industrial-grid',
    name: 'Industrial Grid',
    description: 'Mechanical, tight, rhythmic. Great for geometric, man-made photos.',
    defaultKey: 'A#',
    defaultScale: 'A_SHARP_MINOR',
    defaultTempoBpm: 110,
    mappingMode: 'MULTI_VOICE',
    voices: {
      bass: {
        enabled: true,
        minNote: 'A#1',
        maxNote: 'F2',
        density: 0.7,
        durationFactor: 0.6,
        velocityMin: 0.5,
        velocityMax: 1.0,
        reverbSend: 0.2,
        filterBrightness: 0.5,
        stereoSpread: 0.1,
      },
      melody: {
        enabled: true,
        minNote: 'F3',
        maxNote: 'A#5',
        density: 0.8,
        durationFactor: 0.4,
        velocityMin: 0.5,
        velocityMax: 1.0,
        reverbSend: 0.3,
        filterBrightness: 0.9,
        stereoSpread: 0.4,
      },
      pad: {
        enabled: true,
        minNote: 'A#2',
        maxNote: 'F4',
        density: 0.3,
        durationFactor: 1.2,
        velocityMin: 0.3,
        velocityMax: 0.7,
        reverbSend: 0.5,
        filterBrightness: 0.6,
        stereoSpread: 0.3,
      },
    },
  },
];

/**
 * Get all available presets
 */
export function getAllTopoPresets(): TopoPreset[] {
  return TOPO_PRESETS;
}
