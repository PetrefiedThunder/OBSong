/**
 * Mapping functions that convert ImageAnalysisResult to NoteEvent arrays
 */

import type {
  ImageAnalysisResult,
  NoteEvent,
  LinearLandscapeOptions,
  DepthRidgeOptions,
  MultiVoiceOptions,
  KeyType,
  ScaleType,
  TopoPreset,
} from '@toposonics/types';
import { getScaleNotes, brightnessToScaleIndex, noteNameToMidi, midiToNoteName } from './scales';

// Constants for mapDepthRidge
const RIDGE_VELOCITY_BOOST = 0.3;
const RIDGE_DURATION_MULTIPLIER = 0.5;
const RHYTHMIC_GAP_FACTOR = 0.25;
const REVERB_DEPTH_SENSITIVITY = 0.5;

function calculatePan(index: number, totalPoints: number, spread = 1): number {
  if (totalPoints <= 1) return 0;
  const normalizedPosition = index / (totalPoints - 1);
  return (normalizedPosition * 2 - 1) * spread;
}

/** Parse the (possibly negative) octave number out of a scientific-pitch note name. */
function octaveOf(noteName: string): number {
  const match = noteName.match(/-?\d+$/);
  return match ? parseInt(match[0], 10) : 3;
}

/**
 * Generate scale notes that span the octaves of [minNote, maxNote] (plus one octave of
 * headroom), rather than a hardcoded start octave. This makes low ranges such as A1-E2
 * reachable instead of silently producing an empty voice.
 */
function getScaleNotesForRange(
  key: KeyType,
  scale: ScaleType,
  minNote: string,
  maxNote: string
): string[] {
  const startOctave = octaveOf(minNote);
  const span = Math.max(1, octaveOf(maxNote) - startOctave + 1);
  return getScaleNotes(key, scale, span + 1, startOctave);
}

/**
 * Keep only the scale notes within [minMidi, maxMidi]. If none fall in range, fall back
 * to the single scale note nearest the range so the voice is never silently empty.
 */
function filterScaleToRange(scaleNotes: string[], minMidi: number, maxMidi: number): string[] {
  const inRange = scaleNotes.filter((note) => {
    const midi = noteNameToMidi(note);
    return midi >= minMidi && midi <= maxMidi;
  });
  if (inRange.length > 0 || scaleNotes.length === 0) return inRange;

  const target = (minMidi + maxMidi) / 2;
  let nearest = scaleNotes[0];
  let nearestDist = Infinity;
  for (const note of scaleNotes) {
    const dist = Math.abs(noteNameToMidi(note) - target);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = note;
    }
  }
  return [nearest];
}

/**
 * Map an image analysis result to musical notes using LINEAR_LANDSCAPE mode
 *
 * This mode:
 * 1. Samples brightness horizontally across the image
 * 2. Maps each brightness value to a pitch in the selected scale
 * 3. Creates a sequence of notes with consistent timing
 * 4. Applies panning based on horizontal position
 * 5. Applies velocity based on brightness intensity
 *
 * @param analysis - Result from core-image analysis
 * @param options - Mapping configuration
 * @returns Array of musical note events
 */
export function mapLinearLandscape(
  analysis: ImageAnalysisResult,
  options: LinearLandscapeOptions
): NoteEvent[] {
  const {
    key,
    scale,
    maxNotes = 64,
    noteDurationBeats = 0.5,
    enablePanning = true,
    enableVelocityVariation = true,
  } = options;

  // Get the scale notes (multiple octaves for wider range)
  const scaleNotes = getScaleNotes(key, scale, 3, 3);

  // Determine how many notes to generate
  const brightnessProfile = analysis.brightnessProfile;
  const sampleCount = Math.min(brightnessProfile.length, maxNotes);

  // Downsample brightness profile if needed
  const step = brightnessProfile.length / sampleCount;
  const sampledBrightness: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.floor(i * step);
    sampledBrightness.push(brightnessProfile[idx]);
  }

  // Generate note events
  const noteEvents: NoteEvent[] = [];
  let currentTime = 0;

  for (let i = 0; i < sampledBrightness.length; i++) {
    const brightness = sampledBrightness[i];

    // Map brightness to a note in the scale
    const scaleIndex = brightnessToScaleIndex(brightness, scaleNotes.length);
    const note = scaleNotes[scaleIndex];

    // Calculate velocity (0.3 to 1.0 range for better audibility)
    let velocity = 0.7; // Default
    if (enableVelocityVariation) {
      const normalizedBrightness = brightness / 255;
      velocity = 0.3 + normalizedBrightness * 0.7;
    }

    // Calculate pan (-1 to 1, left to right)
    let pan = 0;
    if (enablePanning) {
      pan = calculatePan(i, sampledBrightness.length);
    }

    // Use depth for reverb if available. The brightness profile was downsampled with
    // `idx = floor(i * step)`, so the depth profile (full length) must be indexed by the
    // same source index, not the sampled index `i`, or reverb describes a different
    // horizontal position than pitch.
    let reverbSend = 0.2; // Default light reverb
    const depthIdx = Math.floor(i * step);
    if (analysis.depthProfile && analysis.depthProfile[depthIdx] !== undefined) {
      // Lower depth (farther away) = more reverb
      const depth = analysis.depthProfile[depthIdx];
      reverbSend = 0.1 + (1 - depth) * 0.6; // Inverted: far = more reverb
    }

    // Create the note event
    const noteEvent: NoteEvent = {
      note,
      start: currentTime,
      duration: noteDurationBeats,
      velocity,
      pan,
      effects: {
        reverbSend,
        filterCutoff: brightness / 255, // Brighter = more open filter
      },
    };

    noteEvents.push(noteEvent);
    currentTime += noteDurationBeats;
  }

  return noteEvents;
}

/**
 * Map an image analysis result using DEPTH_RIDGE mode.
 *
 * This mode creates a sparse, accent-driven composition by:
 * 1. Creating notes only where ridge strength exceeds a threshold.
 * 2. Emphasizing ridges with higher velocity and longer duration.
 * 3. Using the depth profile to control the reverb amount.
 * 4. Varying the rhythm based on the spacing of the ridges.
 *
 * @param analysis - Result from core-image analysis
 * @param options - Mapping configuration with ridge-specific options
 * @returns Array of musical note events
 */
export function mapDepthRidge(
  analysis: ImageAnalysisResult,
  options: DepthRidgeOptions
): NoteEvent[] {
  const {
    key,
    scale,
    maxNotes = 64,
    noteDurationBeats = 0.5,
    ridgeThreshold = 0.5,
    depthToReverb = true,
  } = options;

  const scaleNotes = getScaleNotes(key, scale, 3, 3);
  const brightnessProfile = analysis.brightnessProfile;
  const ridgeStrength = analysis.ridgeStrength || [];

  const noteEvents: NoteEvent[] = [];
  let currentTime = 0;
  let lastRidgeIndex = -1;

  // Scan the WHOLE profile (not just the first maxNotes columns, which ignored the
  // right half of the image) and stop once maxNotes notes have been emitted.
  for (let i = 0; i < brightnessProfile.length && noteEvents.length < maxNotes; i++) {
    const brightness = brightnessProfile[i];
    const ridge = ridgeStrength[i] ?? 0;

    if (ridgeStrength.length > 0 && ridge >= ridgeThreshold) {
      if (lastRidgeIndex !== -1) {
        const distance = i - lastRidgeIndex;
        // Time advance is proportional to distance, creating rhythmic variation
        currentTime += (distance / brightnessProfile.length) * noteDurationBeats * 8;
      }
      lastRidgeIndex = i;

      const scaleIndex = brightnessToScaleIndex(brightness, scaleNotes.length);
      const note = scaleNotes[scaleIndex];

      // Emphasize ridges with higher velocity
      const normalizedBrightness = brightness / 255;
      const ridgeBoost = ridge * RIDGE_VELOCITY_BOOST;
      const velocity = Math.min(1, 0.4 + normalizedBrightness * 0.6 + ridgeBoost);

      const pan = calculatePan(i, brightnessProfile.length);

      let reverbSend = 0.3;
      if (depthToReverb && analysis.depthProfile && analysis.depthProfile[i] !== undefined) {
        const depth = analysis.depthProfile[i];
        reverbSend = 0.2 + (1 - depth) * REVERB_DEPTH_SENSITIVITY;
      }

      const noteEvent: NoteEvent = {
        note,
        start: currentTime,
        duration: noteDurationBeats * (1 + ridge * RIDGE_DURATION_MULTIPLIER),
        velocity,
        pan,
        effects: {
          reverbSend,
          filterCutoff: brightness / 255,
        },
      };

      noteEvents.push(noteEvent);
    } else {
      currentTime += noteDurationBeats * RHYTHMIC_GAP_FACTOR;
    }
  }

  // TODO: Add more sophisticated ridge-following logic:
  // - Contour detection and melodic arcs
  // - Harmonic layering at prominent features
  // - Polyphonic textures for complex regions

  return noteEvents;
}

/**
 * Quantize note timings to a grid (optional post-processing)
 *
 * @param notes - Array of note events
 * @param gridSize - Grid resolution in beats (e.g., 0.25 for 16th notes)
 * @returns Quantized note events
 */
export function quantizeNotes(notes: NoteEvent[], gridSize: number = 0.25): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    start: Math.round(note.start / gridSize) * gridSize,
    duration: Math.max(gridSize, Math.round(note.duration / gridSize) * gridSize),
  }));
}

/**
 * Apply global velocity scaling to all notes
 *
 * @param notes - Array of note events
 * @param scale - Scaling factor (0-1+)
 * @returns Scaled note events
 */
export function scaleVelocity(notes: NoteEvent[], scale: number): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    velocity: Math.max(0, Math.min(1, note.velocity * scale)),
  }));
}

/**
 * Transpose all notes by a number of semitones
 *
 * @param notes - Array of note events
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @returns Transposed note events
 */
export function transposeNotes(notes: NoteEvent[], semitones: number): NoteEvent[] {
  return notes.map((note) => {
    const midi = noteNameToMidi(note.note);
    const transposedMidi = midi + semitones;
    return {
      ...note,
      note: midiToNoteName(transposedMidi),
    };
  });
}

// ============================================================================
// MULTI-VOICE MAPPING FUNCTIONS
// ============================================================================

/**
 * Map horizon profile to bass voice
 * Creates slow-moving bassline from image base/contour
 *
 * @param horizonProfile - Horizon heights (0-1)
 * @param key - Musical key
 * @param scale - Musical scale
 * @param options - Bass voice options
 * @returns Bass note events with trackId='bass'
 */
export function mapHorizonToBass(
  horizonProfile: number[],
  key: KeyType,
  scale: ScaleType,
  options: {
    minNote?: string;
    maxNote?: string;
    noteDuration?: number;
    maxNotes?: number;
  } = {}
): NoteEvent[] {
  if (!horizonProfile || horizonProfile.length === 0) return [];
  const {
    minNote = 'C2',
    maxNote = 'C3',
    noteDuration = 3,
    maxNotes = 16,
  } = options;

  // Get scale notes covering the requested bass range. Deriving the octave span from
  // minNote/maxNote (instead of hardcoding startOctave=2) is what lets sub-C2 preset
  // ranges like A1-E2 actually produce notes.
  const minMidi = noteNameToMidi(minNote);
  const maxMidi = noteNameToMidi(maxNote);
  const scaleNotes = getScaleNotesForRange(key, scale, minNote, maxNote);

  // Filter to bass range, falling back to the nearest scale note if the range is empty.
  const bassNotes = filterScaleToRange(scaleNotes, minMidi, maxMidi);

  if (bassNotes.length === 0) return [];

  // Downsample horizon for slower movement
  const step = Math.max(1, Math.ceil(horizonProfile.length / maxNotes));
  const sampledHorizon: number[] = [];

  for (let i = 0; i < horizonProfile.length; i += step) {
    // Average a few samples for stability
    const end = Math.min(i + step, horizonProfile.length);
    const segment = horizonProfile.slice(i, end);
    const avg = segment.reduce((sum, val) => sum + val, 0) / segment.length;
    sampledHorizon.push(avg);
  }

  // Generate bass notes
  const noteEvents: NoteEvent[] = [];
  let currentTime = 0;

  for (let i = 0; i < sampledHorizon.length; i++) {
    const horizonHeight = sampledHorizon[i];

    // Map horizon height to bass note (higher horizon = higher bass note)
    const noteIndex = Math.floor(horizonHeight * bassNotes.length);
    const clampedIndex = Math.min(noteIndex, bassNotes.length - 1);
    const note = bassNotes[clampedIndex];

    noteEvents.push({
      note,
      start: currentTime,
      duration: noteDuration,
      velocity: 0.6 + horizonHeight * 0.3, // Subtle variation
      pan: 0, // Center bass
      trackId: 'bass',
      effects: {
        reverbSend: 0.15, // Minimal reverb for bass clarity
        filterCutoff: 0.4 + horizonHeight * 0.3, // Slightly vary timbre
      },
    });

    currentTime += noteDuration;
  }

  return noteEvents;
}

/**
 * Map ridge strength to melody voice
 * Creates melodic phrases from prominent image features
 *
 * @param brightnessProfile - Brightness values (0-255)
 * @param ridgeStrength - Ridge/peak strength (0-1)
 * @param key - Musical key
 * @param scale - Musical scale
 * @param options - Melody voice options
 * @returns Melody note events with trackId='melody'
 */
export function mapRidgesToMelody(
  brightnessProfile: number[],
  ridgeStrength: number[],
  key: KeyType,
  scale: ScaleType,
  options: {
    minNote?: string;
    maxNote?: string;
    ridgeThreshold?: number;
    noteDuration?: number;
  } = {}
): NoteEvent[] {
  if (!ridgeStrength || ridgeStrength.length === 0) return [];
  const {
    minNote = 'C4',
    maxNote = 'C6',
    ridgeThreshold = 0.4,
    noteDuration = 0.75,
  } = options;

  // Get scale notes covering the requested melody range (derive the octave span from
  // minNote/maxNote instead of hardcoding startOctave=4, so sub-C4 range portions are
  // reachable).
  const minMidi = noteNameToMidi(minNote);
  const maxMidi = noteNameToMidi(maxNote);
  const scaleNotes = getScaleNotesForRange(key, scale, minNote, maxNote);

  // Filter to melody range (nearest-note fallback if the range is empty).
  const melodyNotes = filterScaleToRange(scaleNotes, minMidi, maxMidi);

  if (melodyNotes.length === 0) return [];

  const noteEvents: NoteEvent[] = [];
  let currentTime = 0;

  for (let i = 0; i < Math.min(brightnessProfile.length, ridgeStrength.length); i++) {
    const brightness = brightnessProfile[i];
    const ridge = ridgeStrength[i];

    // Only create notes at significant ridges
    if (ridge < ridgeThreshold) {
      currentTime += noteDuration * 0.5; // Maintain tempo with gaps
      continue;
    }

    // Map brightness to pitch
    const normalizedBrightness = brightness / 255;
    const noteIndex = Math.floor(normalizedBrightness * melodyNotes.length);
    const clampedIndex = Math.min(noteIndex, melodyNotes.length - 1);
    const note = melodyNotes[clampedIndex];

    // Pan based on position
    const pan = calculatePan(i, brightnessProfile.length, 0.6); // Less extreme than full pan

    noteEvents.push({
      note,
      start: currentTime,
      duration: noteDuration * (0.8 + ridge * 0.4), // Longer for stronger ridges
      velocity: 0.6 + ridge * 0.4, // Emphasize strong ridges
      pan,
      trackId: 'melody',
      effects: {
        reverbSend: 0.3 + ridge * 0.2, // More reverb on prominent notes
        filterCutoff: 0.6 + normalizedBrightness * 0.4,
      },
    });

    currentTime += noteDuration;
  }

  return noteEvents;
}

/**
 * Map texture profile to pad/harmony voice
 * Creates ambient chordal layer based on textural complexity
 *
 * @param textureProfile - Texture/variance values (0-1)
 * @param key - Musical key
 * @param scale - Musical scale
 * @param options - Pad voice options
 * @returns Pad note events with trackId='pad'
 */
export function mapTextureToPad(
  textureProfile: number[],
  key: KeyType,
  scale: ScaleType,
  options: {
    segments?: number;
    noteDuration?: number;
  } = {}
): NoteEvent[] {
  if (!textureProfile || textureProfile.length === 0) return [];
  const { segments = 6, noteDuration = 6 } = options;

  // Segment texture into larger chunks
  const segmentSize = Math.max(1, Math.floor(textureProfile.length / segments));
  const textureSegments: number[] = [];

  for (let i = 0; i < segments; i++) {
    const start = i * segmentSize;
    if (start >= textureProfile.length) break;
    const end = Math.min(start + segmentSize, textureProfile.length);
    const segment = textureProfile.slice(start, end);
    const avg = segment.reduce((sum, val) => sum + val, 0) / segment.length;
    textureSegments.push(avg);
  }

  // Get scale notes for chords (mid range)
  const scaleNotes = getScaleNotes(key, scale, 2, 3);

  const noteEvents: NoteEvent[] = [];
  let currentTime = 0;

  for (const textureValue of textureSegments) {
    // Determine chord complexity based on texture
    let chordDegrees: number[];

    if (textureValue < 0.3) {
      // Low texture: simple root note or dyad
      chordDegrees = [0, 4]; // Root and 5th
    } else if (textureValue < 0.7) {
      // Medium texture: triad
      chordDegrees = [0, 2, 4]; // Root, 3rd, 5th
    } else {
      // High texture: 7th chord
      chordDegrees = [0, 2, 4, 6]; // Root, 3rd, 5th, 7th
    }

    // Create chord notes
    for (const degree of chordDegrees) {
      if (degree < scaleNotes.length) {
        const note = scaleNotes[degree];

        noteEvents.push({
          note,
          start: currentTime,
          duration: noteDuration,
          velocity: 0.4 + textureValue * 0.3, // Subtle
          pan: (Math.random() - 0.5) * 0.4, // Slight random spread
          trackId: 'pad',
          effects: {
            reverbSend: 0.5 + textureValue * 0.3, // More reverb for complex texture
            filterCutoff: 0.5 + textureValue * 0.3,
          },
        });
      }
    }

    currentTime += noteDuration;
  }

  return noteEvents;
}

/**
 * Map complete image to multi-voice composition
 * Combines bass, melody, and pad voices into unified composition
 *
 * @param analysis - Complete image analysis result
 * @param options - Multi-voice mapping configuration
 * @param preset - Optional TopoPreset to apply voice configurations
 * @returns Array of all note events across all voices
 */
export function mapImageToMultiVoiceComposition(
  analysis: ImageAnalysisResult,
  options: MultiVoiceOptions,
  preset?: TopoPreset
): NoteEvent[] {
  const {
    key,
    scale,
    bassOptions = {},
    melodyOptions = {},
    padOptions = {},
  } = options;

  // Apply the preset's per-voice configuration. Caller-supplied options still win; the
  // preset fills in the voice pitch ranges and enabled flags that were previously ignored
  // (so different presets no longer generate identical music). NOTE: fuller threading of
  // velocity/density/reverb/durationFactor — and the enableFx voice — is a follow-up.
  const enableBass = options.enableBass ?? preset?.voices.bass.enabled ?? true;
  const enableMelody = options.enableMelody ?? preset?.voices.melody.enabled ?? true;
  const enablePad = options.enablePad ?? preset?.voices.pad.enabled ?? true;

  const resolvedBassOptions = {
    minNote: preset?.voices.bass.minNote,
    maxNote: preset?.voices.bass.maxNote,
    ...bassOptions,
  };
  const resolvedMelodyOptions = {
    minNote: preset?.voices.melody.minNote,
    maxNote: preset?.voices.melody.maxNote,
    ...melodyOptions,
  };
  const resolvedPadOptions = { ...padOptions };

  const allNotes: NoteEvent[] = [];

  // 1. Bass voice from horizon
  if (enableBass && analysis.horizonProfile) {
    const bassNotes = mapHorizonToBass(analysis.horizonProfile, key, scale, resolvedBassOptions);
    allNotes.push(...bassNotes);
  }

  // 2. Melody voice from ridges
  if (enableMelody && analysis.ridgeStrength) {
    const melodyNotes = mapRidgesToMelody(
      analysis.brightnessProfile,
      analysis.ridgeStrength,
      key,
      scale,
      resolvedMelodyOptions
    );
    allNotes.push(...melodyNotes);
  }

  // 3. Pad voice from texture
  if (enablePad && analysis.textureProfile) {
    const padNotes = mapTextureToPad(analysis.textureProfile, key, scale, resolvedPadOptions);
    allNotes.push(...padNotes);
  }

  // Sort by start time for proper playback
  allNotes.sort((a, b) => a.start - b.start);

  return allNotes;
}
