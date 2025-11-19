/**
 * Scene Pack Catalog
 * Curated experience bundles combining presets with visual guidance and UI themes
 */

import type { ScenePack, TopoPreset } from '@toposonics/types';

/**
 * Complete catalog of available Scene Packs
 */
export const SCENE_PACKS: ScenePack[] = [
  // ==================================================
  // SCENE 1: Majestic Mountains
  // ==================================================
  {
    id: 'scene-majestic-mountains',
    name: 'Majestic Mountains',
    tagline: 'Cinematic ridgelines and slow-moving skies.',
    description:
      'Slow, wide, orchestral-style soundscapes for mountain ranges and big horizons. Great for alpine photos and desert cliffs.',
    presetId: 'majestic-mountains',
    recommendedSubjects: ['mountain ranges', 'alpine valleys', 'desert cliffs', 'canyons'],
    recommendedLighting:
      'Golden hour or soft overcast, with clear separation between ground and sky.',
    recommendedUsageNotes:
      "Works best when there's a clear horizon and visible peaks. Avoid super busy foreground clutter.",
    demoAssets: {
      sampleImagePath: '/demo/scene-majestic-mountains.jpg',
    },
    uiThemeHints: {
      accentColor: '#A855F7',
      backgroundStyle: 'dark',
      gradientClassName: 'from-slate-900 via-slate-800 to-purple-900',
    },
  },

  // ==================================================
  // SCENE 2: Night City
  // ==================================================
  {
    id: 'scene-night-city',
    name: 'Night City',
    tagline: 'Neon skylines and blinking lights.',
    description:
      'Minor-key, rhythmic textures inspired by city skylines, highways, and building grids. Great for night shots and high contrast photos.',
    presetId: 'night-city',
    recommendedSubjects: ['city skylines', 'downtown streets', 'bridges at night', 'neon signs'],
    recommendedLighting: 'Night, twilight, or moody indoor lighting with strong highlights.',
    recommendedUsageNotes:
      "The more small bright details (windows, car lights), the more melodic activity you'll hear.",
    demoAssets: {
      sampleImagePath: '/demo/scene-night-city.jpg',
    },
    uiThemeHints: {
      accentColor: '#22D3EE',
      backgroundStyle: 'dark',
      gradientClassName: 'from-slate-950 via-slate-900 to-cyan-900',
    },
  },

  // ==================================================
  // SCENE 3: Foggy Forest
  // ==================================================
  {
    id: 'scene-foggy-forest',
    name: 'Foggy Forest',
    tagline: 'Soft, misty drones and slow melodies.',
    description:
      'Low-contrast, reverb-heavy atmospheres for forests, fog, and quiet nature scenes.',
    presetId: 'foggy-forest',
    recommendedSubjects: ['forests', 'foggy hills', 'misty fields', 'overcast trails'],
    recommendedLighting: 'Overcast, fog, or low-contrast scenes benefit most.',
    recommendedUsageNotes:
      "Don't worry if the image is low contrast — this pack is designed for that softness.",
    demoAssets: {
      sampleImagePath: '/demo/scene-foggy-forest.jpg',
    },
    uiThemeHints: {
      accentColor: '#4ADE80',
      backgroundStyle: 'dark',
      gradientClassName: 'from-slate-900 via-emerald-900 to-slate-950',
    },
  },

  // ==================================================
  // SCENE 4: Desert Drones
  // ==================================================
  {
    id: 'scene-desert-drones',
    name: 'Desert Drones',
    tagline: 'Minimal, hypnotic dunes and rockscapes.',
    description:
      'Sparse, slow-moving drones tuned for dunes, rock deserts, and minimal landscapes.',
    presetId: 'desert-drones',
    recommendedSubjects: ['sand dunes', 'rock deserts', 'Joshua Tree landscapes', 'canyons'],
    recommendedLighting: 'Harsh midday or golden hour both work; shape and shadow matter.',
    recommendedUsageNotes: 'Big shapes and clean lines work best. Embrace minimalism.',
    demoAssets: {
      sampleImagePath: '/demo/scene-desert-drones.jpg',
    },
    uiThemeHints: {
      accentColor: '#F97316',
      backgroundStyle: 'dark',
      gradientClassName: 'from-amber-900 via-stone-900 to-slate-950',
    },
  },

  // ==================================================
  // SCENE 5: Ocean Horizon
  // ==================================================
  {
    id: 'scene-ocean-horizon',
    name: 'Ocean Horizon',
    tagline: 'Flowing wave textures and sky pads.',
    description:
      'Gentle, flowing soundscapes tuned to coastlines and seascapes with visible horizons.',
    presetId: 'ocean-horizon',
    recommendedSubjects: ['ocean horizons', 'coastlines', 'beaches', 'lakes with visible horizons'],
    recommendedLighting: 'Any, but soft afternoon light or overcast gives smooth results.',
    recommendedUsageNotes:
      "Works best when the water/sky boundary is clear and there's some wave texture.",
    demoAssets: {
      sampleImagePath: '/demo/scene-ocean-horizon.jpg',
    },
    uiThemeHints: {
      accentColor: '#38BDF8',
      backgroundStyle: 'dark',
      gradientClassName: 'from-slate-950 via-sky-900 to-slate-900',
    },
  },

  // ==================================================
  // SCENE 6: Industrial Grid
  // ==================================================
  {
    id: 'scene-industrial-grid',
    name: 'Industrial Grid',
    tagline: 'Mechanical pulses and grid-based melodies.',
    description:
      'Tight, rhythmically active textures tuned to factories, bridges, wires, and infrastructure.',
    presetId: 'industrial-grid',
    recommendedSubjects: ['factories', 'bridges', 'overpasses', 'rail yards', 'power lines'],
    recommendedLighting: 'Harsh daytime or high-contrast night scenes work well.',
    recommendedUsageNotes:
      'The more geometric repetition (windows, beams, cables), the more rhythmic and mechanical the music.',
    demoAssets: {
      sampleImagePath: '/demo/scene-industrial-grid.jpg',
    },
    uiThemeHints: {
      accentColor: '#FACC15',
      backgroundStyle: 'dark',
      gradientClassName: 'from-slate-950 via-zinc-900 to-yellow-900',
    },
  },
];

/**
 * Get a scene pack by ID
 */
export function getScenePackById(id: string): ScenePack | undefined {
  return SCENE_PACKS.find((pack) => pack.id === id);
}

/**
 * Get the associated TopoPreset for a scene pack
 */
export function getScenePreset(
  scene: ScenePack,
  allPresets: TopoPreset[]
): TopoPreset | undefined {
  return allPresets.find((preset) => preset.id === scene.presetId);
}

/**
 * Get all available scene packs
 */
export function getAllScenePacks(): ScenePack[] {
  return SCENE_PACKS;
}
