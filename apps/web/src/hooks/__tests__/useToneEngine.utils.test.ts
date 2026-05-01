import { describe, expect, it } from 'vitest';
import type { NoteEvent, SoundPreset } from '@toposonics/types';
import {
  beatsToSeconds,
  getAudioGraphSignature,
  getAudioTopology,
  getNoteEventsDurationBeats,
} from '../useToneEngine.utils';

const preset: SoundPreset = {
  id: 'test-preset',
  name: 'Test Preset',
  oscillatorType: 'sine',
  description: 'test',
  synthesis: {
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.5,
      release: 0.8,
    },
    filter: {
      type: 'lowpass',
      frequency: 1200,
      resonance: 1,
    },
    effects: {
      reverb: { wet: 0.3, decay: 2 },
    },
  },
};

const singleVoiceEvents: NoteEvent[] = [
  { note: 'C4', start: 0, duration: 1, velocity: 0.8 },
];

const multiVoiceEvents: NoteEvent[] = [
  { note: 'C3', start: 0, duration: 1, velocity: 0.8, trackId: 'bass' },
  { note: 'E4', start: 0.5, duration: 0.5, velocity: 0.7, trackId: 'melody' },
];

describe('useToneEngine utils', () => {
  it('detects single-voice note events', () => {
    expect(getAudioTopology(singleVoiceEvents)).toBe('single');
  });

  it('detects multi-voice note events', () => {
    expect(getAudioTopology(multiVoiceEvents)).toBe('multi');
  });

  it('changes the audio graph signature when topology changes', () => {
    expect(getAudioGraphSignature(singleVoiceEvents, preset)).not.toBe(
      getAudioGraphSignature(multiVoiceEvents, preset)
    );
  });

  it('changes the audio graph signature when preset synthesis changes', () => {
    const brighterPreset: SoundPreset = {
      ...preset,
      oscillatorType: 'triangle',
      synthesis: {
        ...preset.synthesis!,
        filter: {
          ...preset.synthesis!.filter!,
          frequency: 2400,
        },
      },
    };

    expect(getAudioGraphSignature(singleVoiceEvents, preset)).not.toBe(
      getAudioGraphSignature(singleVoiceEvents, brighterPreset)
    );
  });

  it('calculates duration from the latest note end instead of summing notes', () => {
    expect(
      getNoteEventsDurationBeats([
        { note: 'C4', start: 0, duration: 4, velocity: 0.7 },
        { note: 'G4', start: 1.5, duration: 1, velocity: 0.7 },
        { note: 'E4', start: 3.75, duration: 0.5, velocity: 0.7 },
      ])
    ).toBe(4.25);
  });

  it('converts beats to seconds at the current tempo', () => {
    expect(beatsToSeconds(4, 120)).toBe(2);
    expect(beatsToSeconds(3, 90)).toBe(2);
  });
});
