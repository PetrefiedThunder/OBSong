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
} from '@toposonics/types';
import { getScaleNotes, brightnessToScaleIndex, noteNameToMidi, midiToNoteName } from './scales';

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
      const normalizedPosition = i / (sampledBrightness.length - 1);
      pan = normalizedPosition * 2 - 1; // Map 0-1 to -1-1
    }

    // Use depth for reverb if available
    let reverbSend = 0.2; // Default light reverb
    if (analysis.depthProfile && analysis.depthProfile[i] !== undefined) {
      // Lower depth (farther away) = more reverb
      const depth = analysis.depthProfile[i];
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
 * Map an image analysis result using DEPTH_RIDGE mode (future implementation)
 *
 * This mode will:
 * 1. Identify peaks/ridges in the brightness profile
 * 2. Create emphasized notes at ridge points
 * 3. Use depth information for spatial effects
 * 4. Create a more dynamic, contour-following composition
 *
 * @param analysis - Result from core-image analysis
 * @param options - Mapping configuration with ridge-specific options
 * @returns Array of musical note events
 */
export function mapDepthRidge(
  analysis: ImageAnalysisResult,
  options: DepthRidgeOptions
): NoteEvent[] {
  // TODO: Implement advanced depth-ridge mapping
  // For now, fall back to linear landscape with some modifications

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

  // Simplified ridge-based approach:
  // Only create notes where ridge strength exceeds threshold
  for (let i = 0; i < Math.min(brightnessProfile.length, maxNotes); i++) {
    const brightness = brightnessProfile[i];
    const ridge = ridgeStrength[i] ?? 0;

    // Skip this position if ridge is too weak (unless no ridges detected)
    if (ridgeStrength.length > 0 && ridge < ridgeThreshold) {
      // Still advance time to maintain rhythm
      currentTime += noteDurationBeats * 0.25; // Shorter gap
      continue;
    }

    const scaleIndex = brightnessToScaleIndex(brightness, scaleNotes.length);
    const note = scaleNotes[scaleIndex];

    // Emphasize ridges with higher velocity
    const normalizedBrightness = brightness / 255;
    const ridgeBoost = ridge * 0.3; // Up to +0.3 velocity
    const velocity = Math.min(1, 0.4 + normalizedBrightness * 0.6 + ridgeBoost);

    // Pan based on position
    const normalizedPosition = i / (brightnessProfile.length - 1);
    const pan = normalizedPosition * 2 - 1;

    // Depth-based reverb
    let reverbSend = 0.3;
    if (depthToReverb && analysis.depthProfile && analysis.depthProfile[i] !== undefined) {
      const depth = analysis.depthProfile[i];
      reverbSend = 0.2 + (1 - depth) * 0.5;
    }

    const noteEvent: NoteEvent = {
      note,
      start: currentTime,
      duration: noteDurationBeats * (1 + ridge * 0.5), // Longer notes at ridges
      velocity,
      pan,
      effects: {
        reverbSend,
        filterCutoff: brightness / 255,
      },
    };

    noteEvents.push(noteEvent);
    currentTime += noteDurationBeats;
  }

  // TODO: Add more sophisticated ridge-following logic:
  // - Contour detection and melodic arcs
  // - Harmonic layering at prominent features
  // - Rhythmic variation based on ridge spacing
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
  // TODO: Implement note transposition
  // This would require parsing note names, adjusting MIDI numbers, and converting back
  return notes; // Placeholder
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
  const {
    minNote = 'C2',
    maxNote = 'C3',
    noteDuration = 3,
    maxNotes = 16,
  } = options;

  // Get scale notes in bass range
  const scaleNotes = getScaleNotes(key, scale, 2, 2); // 2 octaves starting at octave 2
  const minMidi = noteNameToMidi(minNote);
  const maxMidi = noteNameToMidi(maxNote);

  // Filter to bass range
  const bassNotes = scaleNotes.filter((note) => {
    const midi = noteNameToMidi(note);
    return midi >= minMidi && midi <= maxMidi;
  });

  if (bassNotes.length === 0) return [];

  // Downsample horizon for slower movement
  const step = Math.ceil(horizonProfile.length / maxNotes);
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
  const {
    minNote = 'C4',
    maxNote = 'C6',
    ridgeThreshold = 0.4,
    noteDuration = 0.75,
  } = options;

  // Get scale notes in melody range
  const scaleNotes = getScaleNotes(key, scale, 3, 4); // 3 octaves starting at octave 4
  const minMidi = noteNameToMidi(minNote);
  const maxMidi = noteNameToMidi(maxNote);

  // Filter to melody range
  const melodyNotes = scaleNotes.filter((note) => {
    const midi = noteNameToMidi(note);
    return midi >= minMidi && midi <= maxMidi;
  });

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
    const normalizedPosition = i / (brightnessProfile.length - 1);
    const pan = (normalizedPosition * 2 - 1) * 0.6; // Less extreme than full pan

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
  const { segments = 6, noteDuration = 6 } = options;

  // Segment texture into larger chunks
  const segmentSize = Math.floor(textureProfile.length / segments);
  const textureSegments: number[] = [];

  for (let i = 0; i < segments; i++) {
    const start = i * segmentSize;
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
 * @returns Array of all note events across all voices
 */
export function mapImageToMultiVoiceComposition(
  analysis: ImageAnalysisResult,
  options: MultiVoiceOptions
): NoteEvent[] {
  const {
    key,
    scale,
    enableBass = true,
    enableMelody = true,
    enablePad = true,
    bassOptions = {},
    melodyOptions = {},
    padOptions = {},
  } = options;

  const allNotes: NoteEvent[] = [];

  // 1. Bass voice from horizon
  if (enableBass && analysis.horizonProfile) {
    const bassNotes = mapHorizonToBass(analysis.horizonProfile, key, scale, {
      minNote: bassOptions.minNote || 'C2',
      maxNote: bassOptions.maxNote || 'C3',
      noteDuration: bassOptions.noteDuration || 3,
      maxNotes: 16,
    });
    allNotes.push(...bassNotes);
  }

  // 2. Melody voice from ridges
  if (enableMelody && analysis.ridgeStrength) {
    const melodyNotes = mapRidgesToMelody(
      analysis.brightnessProfile,
      analysis.ridgeStrength,
      key,
      scale,
      {
        minNote: melodyOptions.minNote || 'C4',
        maxNote: melodyOptions.maxNote || 'C6',
        ridgeThreshold: melodyOptions.ridgeThreshold || 0.4,
        noteDuration: 0.75,
      }
    );
    allNotes.push(...melodyNotes);
  }

  // 3. Pad voice from texture
  if (enablePad && analysis.textureProfile) {
    const padNotes = mapTextureToPad(analysis.textureProfile, key, scale, {
      segments: padOptions.segments || 6,
      noteDuration: padOptions.noteDuration || 6,
    });
    allNotes.push(...padNotes);
  }

  // Sort by start time for proper playback
  allNotes.sort((a, b) => a.start - b.start);

  return allNotes;
}
