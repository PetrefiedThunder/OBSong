/**
 * Musical scale definitions and utilities
 */

import type { ScaleType, KeyType } from '@toposonics/types';

/**
 * All musical notes in chromatic order
 */
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Scale interval patterns (semitones from root)
 * W = whole step (2 semitones), H = half step (1 semitone)
 */
const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  // Major scale: W-W-H-W-W-W-H
  C_MAJOR: [0, 2, 4, 5, 7, 9, 11],
  // Natural minor: W-H-W-W-H-W-W
  C_MINOR: [0, 2, 3, 5, 7, 8, 10],
  A_MINOR: [0, 2, 3, 5, 7, 8, 10],
  // Major pentatonic: W-W-m3-W-m3
  C_PENTATONIC: [0, 2, 4, 7, 9],
  // Minor pentatonic: m3-W-W-m3-W
  A_MINOR_PENTATONIC: [0, 3, 5, 7, 10],
  // Blues scale: m3-W-H-H-m3-W
  C_BLUES: [0, 3, 5, 6, 7, 10],
  // Dorian mode: W-H-W-W-W-H-W
  D_DORIAN: [0, 2, 3, 5, 7, 9, 10],
  // Phrygian mode: H-W-W-W-H-W-W
  E_PHRYGIAN: [0, 1, 3, 5, 7, 8, 10],
};

/**
 * Get the semitone offset for a given key
 *
 * @param key - Musical key (C, C#, D, etc.)
 * @returns Semitone offset from C (0-11)
 */
export function getKeyOffset(key: KeyType): number {
  return CHROMATIC_NOTES.indexOf(key);
}

/**
 * Generate an array of note names for a given key and scale
 * Returns multiple octaves if needed
 *
 * @param key - Root key
 * @param scale - Scale type
 * @param octaves - Number of octaves to generate (default: 3)
 * @param startOctave - Starting octave number (default: 3)
 * @returns Array of note names in scientific pitch notation (e.g., ["C3", "D3", "E3", ...])
 */
export function getScaleNotes(
  key: KeyType,
  scale: ScaleType,
  octaves: number = 3,
  startOctave: number = 3
): string[] {
  const keyOffset = getKeyOffset(key);
  const intervals = SCALE_INTERVALS[scale];
  const notes: string[] = [];

  for (let octave = 0; octave < octaves; octave++) {
    for (const interval of intervals) {
      const absoluteSemitone = keyOffset + interval;
      const noteIndex = absoluteSemitone % 12;
      const noteName = CHROMATIC_NOTES[noteIndex];
      const octaveNumber = startOctave + octave + Math.floor(absoluteSemitone / 12);

      notes.push(`${noteName}${octaveNumber}`);
    }
  }

  return notes;
}

/**
 * Map a normalized value (0-1) to a scale degree index
 *
 * @param normalizedValue - Input value (0-1)
 * @param scaleLength - Number of notes in the scale
 * @returns Index into the scale array
 */
export function valueToScaleIndex(normalizedValue: number, scaleLength: number): number {
  // Clamp to 0-1 range
  const clamped = Math.max(0, Math.min(1, normalizedValue));

  // Map to scale index (0 to scaleLength - 1)
  const index = Math.floor(clamped * scaleLength);

  // Ensure we don't exceed bounds
  return Math.min(index, scaleLength - 1);
}

/**
 * Map a brightness value (0-255) to a scale degree index
 *
 * @param brightness - Brightness value (0-255)
 * @param scaleLength - Number of notes in the scale
 * @returns Index into the scale array
 */
export function brightnessToScaleIndex(brightness: number, scaleLength: number): number {
  const normalized = brightness / 255;
  return valueToScaleIndex(normalized, scaleLength);
}

/**
 * Get a note name from a MIDI number
 *
 * @param midiNumber - MIDI note number (0-127)
 * @returns Note name in scientific pitch notation
 */
export function midiToNoteName(midiNumber: number): string {
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${CHROMATIC_NOTES[noteIndex]}${octave}`;
}

/**
 * Get a MIDI number from a note name
 *
 * @param noteName - Note in scientific pitch notation (e.g., "C4")
 * @returns MIDI note number (0-127)
 */
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const [, note, octaveStr] = match;
  const noteIndex = CHROMATIC_NOTES.indexOf(note);
  const octave = parseInt(octaveStr, 10);

  return (octave + 1) * 12 + noteIndex;
}

/**
 * Get frequency in Hz for a given note name
 *
 * @param noteName - Note in scientific pitch notation
 * @returns Frequency in Hz
 */
export function noteToFrequency(noteName: string): number {
  const midi = noteNameToMidi(noteName);
  // A4 = 440 Hz = MIDI 69
  return 440 * Math.pow(2, (midi - 69) / 12);
}
