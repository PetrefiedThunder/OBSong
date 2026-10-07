import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import type { Composition, ImageAnalysisResult, KeyType, NoteEvent, ScaleType } from '@toposonics/types';
import { mapLinearLandscape, mapDepthRidge, mapImageToMultiVoiceComposition, mapTextureToPad } from '../mappers';
import { noteNameToMidi } from '../scales';
import { noteEventsToMidiBlob, compositionToMidiBlob } from '../midi';
import { TOPO_PRESETS } from '../topoPresets';

const keys: KeyType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const scales: ScaleType[] = [
  'C_MAJOR', 'C_MINOR', 'D_MAJOR', 'E_MINOR', 'A_MINOR', 'A_SHARP_MINOR',
  'G_MAJOR', 'C_PENTATONIC', 'A_MINOR_PENTATONIC', 'C_BLUES', 'D_DORIAN',
  'A_DORIAN', 'C_MIXOLYDIAN', 'E_PHRYGIAN', 'A_HARMONIC_MINOR', 'C_LYDIAN', 'C_WHOLE_TONE',
];

function analysisFor(seed: number, size = 37): ImageAnalysisResult {
  let state = seed >>> 0;
  const sample = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const profile = () => Array.from({ length: size }, (_, i) => i === 0 ? 0 : i === size - 1 ? 1 : sample());
  return {
    width: size, height: 7,
    brightnessProfile: profile().map(value => value * 255),
    ridgeStrength: profile(), depthProfile: profile(),
    horizonProfile: profile(), textureProfile: profile(),
  };
}

function assertPlayable(notes: NoteEvent[]) {
  expect(notes.length).toBeGreaterThan(0);
  let previousStart = -1;
  for (const note of notes) {
    const midi = noteNameToMidi(note.note);
    expect(Number.isInteger(midi)).toBe(true);
    expect(midi).toBeGreaterThanOrEqual(0);
    expect(midi).toBeLessThanOrEqual(127);
    expect(Number.isFinite(note.start)).toBe(true);
    expect(note.start).toBeGreaterThanOrEqual(previousStart);
    previousStart = note.start;
    expect(Number.isFinite(note.duration)).toBe(true);
    expect(note.duration).toBeGreaterThan(0);
    expect(note.velocity).toBeGreaterThanOrEqual(0);
    expect(note.velocity).toBeLessThanOrEqual(1);
    expect(note.pan ?? 0).toBeGreaterThanOrEqual(-1);
    expect(note.pan ?? 0).toBeLessThanOrEqual(1);
    for (const value of Object.values(note.effects ?? {})) {
      if (value !== undefined) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  }
}

describe('QA seeded mapping contracts', () => {
  it.each(scales)('%s remains playable for all 12 keys and all three modes', (scale) => {
    for (const [i, key] of keys.entries()) {
      const analysis = analysisFor(20261002 + i);
      const original = structuredClone(analysis);
      const options = { key, scale };
      const linear = mapLinearLandscape(analysis, { ...options, maxNotes: 13 });
      const ridge = mapDepthRidge(analysis, { ...options, maxNotes: 13 });
      const multi = mapImageToMultiVoiceComposition(analysis, options);
      expect(linear.length).toBe(13);
      expect(ridge.length).toBeLessThanOrEqual(13);
      for (const notes of [linear, ridge, multi]) assertPlayable(notes);
      expect(mapImageToMultiVoiceComposition(analysis, options)).toEqual(multi);
      expect(analysis).toEqual(original);
    }
  });

  it.each(TOPO_PRESETS)('$id emits playable notes within each enabled voice pitch range', (preset) => {
    const notes = mapImageToMultiVoiceComposition(
      analysisFor(20261002), { key: preset.defaultKey, scale: preset.defaultScale }, preset,
    );
    assertPlayable(notes);
    for (const note of notes) {
      const voice = preset.voices[note.trackId as 'bass' | 'melody' | 'pad'];
      expect(voice.enabled).toBe(true);
      expect(noteNameToMidi(note.note)).toBeGreaterThanOrEqual(noteNameToMidi(voice.minNote));
      expect(noteNameToMidi(note.note)).toBeLessThanOrEqual(noteNameToMidi(voice.maxNote));
    }
  });

  it('explicitly disabling every voice returns an empty composition', () => {
    expect(mapImageToMultiVoiceComposition(analysisFor(1), {
      key: 'C', scale: 'C_MAJOR', enableBass: false, enableMelody: false, enablePad: false,
    })).toEqual([]);
  });

  it('BE-101: pad segmentation includes a final partial texture segment', () => {
    // Seven valid samples split into six segments must not discard the final sample.
    const flat = mapTextureToPad([0, 0, 0, 0, 0, 0, 0], 'C', 'C_MAJOR', { segments: 6 });
    const rightEdge = mapTextureToPad([0, 0, 0, 0, 0, 0, 1], 'C', 'C_MAJOR', { segments: 6 });
    expect(rightEdge).not.toEqual(flat);
  });

  it.each([126, 127])('BE-101: the normal 128-sample profile includes trailing index %i', (index) => {
    const flatProfile = new Array(128).fill(0);
    const changedProfile = [...flatProfile];
    changedProfile[index] = 1;
    const flat = mapTextureToPad(flatProfile, 'C', 'C_MAJOR');
    const changed = mapTextureToPad(changedProfile, 'C', 'C_MAJOR');
    expect(changed).not.toEqual(flat);
    expect(changed.filter((note) => note.start < 30)).toEqual(
      flat.filter((note) => note.start < 30)
    );
    assertPlayable(changed);
    expect(changedProfile[index]).toBe(1);
  });
});

async function decode(blob: Blob) {
  expect(blob.type).toBe('audio/midi');
  return new Midi(new Uint8Array(await blob.arrayBuffer()));
}

describe('QA MIDI round-trip contracts', () => {
  it.each([40, 90, 120, 240])('retains tempo=%i BPM, beats, track names and pitches without mutating input', async (tempo) => {
    const events: NoteEvent[] = [
      { note: 'G9', start: 2, duration: 0.25, velocity: 1, trackId: 'melody' },
      { note: 'C-1', start: 0, duration: 1, velocity: 0.5, trackId: 'bass' },
      { note: 'C4', start: 1 / 7, duration: 2 / 7, velocity: 0.7, trackId: 'melody' },
    ];
    const original = structuredClone(events);
    const midi = await decode(noteEventsToMidiBlob(events, tempo, ' QA round trip '));
    expect(midi.header.tempos[0].bpm).toBeCloseTo(tempo, 3);
    expect(midi.name).toBe('QA round trip');
    expect(midi.tracks.map(track => track.name).sort()).toEqual(['bass', 'melody']);
    for (const event of events) {
      const track = midi.tracks.find(candidate => candidate.name === event.trackId)!;
      const note = track.notes.find(candidate => candidate.midi === noteNameToMidi(event.note))!;
      expect(note).toBeDefined();
      const beatSeconds = 60 / tempo;
      expect(Math.abs(note.time / beatSeconds - event.start)).toBeLessThanOrEqual(1 / midi.header.ppq);
      expect(Math.abs(note.duration / beatSeconds - event.duration)).toBeLessThanOrEqual(1 / midi.header.ppq);
      expect(Math.abs(note.velocity - event.velocity)).toBeLessThanOrEqual(1 / 127);
    }
    expect(midi.tracks.reduce((count, track) => count + track.notes.length, 0)).toBe(events.length);
    expect(events).toEqual(original);
  });

  it('uses composition tempo and accepts an explicit export tempo override', async () => {
    const composition: Composition = {
      id: 'qa', userId: 'qa', title: 'QA composition', mappingMode: 'LINEAR_LANDSCAPE',
      key: 'C', scale: 'C_MAJOR', tempo: 90, createdAt: new Date(0), updatedAt: new Date(0),
      noteEvents: [{ note: 'C4', start: 0, duration: 1, velocity: 0.8 }],
    };
    const original = structuredClone(composition);
    const normal = await decode(compositionToMidiBlob(composition));
    const overridden = await decode(compositionToMidiBlob(composition, 180));
    expect(normal.header.tempos[0].bpm).toBeCloseTo(90, 3);
    expect(overridden.header.tempos[0].bpm).toBeCloseTo(180, 3);
    expect(normal.tracks[0].name).toBe('Main');
    expect(normal.tracks[0].notes[0].duration).toBeCloseTo(2 / 3, 5);
    expect(overridden.tracks[0].notes[0].duration).toBeCloseTo(1 / 3, 5);
    expect(composition).toEqual(original);
  });

  it('rejects an empty export with an actionable error', () => {
    expect(() => noteEventsToMidiBlob([], 120)).toThrow('No notes to export');
  });
});
