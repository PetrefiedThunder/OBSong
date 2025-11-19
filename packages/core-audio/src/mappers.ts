/**
 * Mapping functions that convert ImageAnalysisResult to NoteEvent arrays
 */

import type {
  ImageAnalysisResult,
  NoteEvent,
  LinearLandscapeOptions,
  DepthRidgeOptions,
} from '@toposonics/types';
import { getScaleNotes, brightnessToScaleIndex } from './scales';

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
