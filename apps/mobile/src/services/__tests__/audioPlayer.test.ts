import { describe, expect, it, vi } from 'vitest';
import type { NoteEvent } from '@toposonics/types';
import { formatNoteEventsDuration, getNoteEventsDurationBeats } from '../audioPlayer';

vi.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: vi.fn(),
    Sound: vi.fn(),
  },
}));

const overlappingEvents: NoteEvent[] = [
  { note: 'C4', start: 0, duration: 4, velocity: 0.8 },
  { note: 'E4', start: 1, duration: 1, velocity: 0.8 },
  { note: 'G4', start: 3.5, duration: 0.75, velocity: 0.8 },
];

describe('audioPlayer timing helpers', () => {
  it('calculates duration from the latest note end instead of summing notes', () => {
    expect(getNoteEventsDurationBeats(overlappingEvents)).toBe(4.25);
  });

  it('formats duration using beats and tempo', () => {
    expect(formatNoteEventsDuration(overlappingEvents, 120)).toBe(2.125);
  });
});
