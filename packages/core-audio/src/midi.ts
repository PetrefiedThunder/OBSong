/// <reference lib="dom" />
import { Midi } from '@tonejs/midi';
import { noteNameToMidi } from './scales';
import type { Composition, NoteEvent } from '@toposonics/types';

const TICKS_PER_BEAT = 480;
const DEFAULT_TEMPO = 120;
const MIN_DURATION_BEATS = 0.01;

function normalizeVelocity(velocity?: number) {
  const normalized = velocity ?? 0.8;
  return Math.min(1, Math.max(0, normalized));
}

function sortEventsByStart(noteEvents: NoteEvent[]) {
  return [...noteEvents].sort((a, b) => {
    if (a.start === b.start) {
      return a.duration - b.duration;
    }
    return a.start - b.start;
  });
}

function buildMidi(noteEvents: NoteEvent[], tempoBpm: number, title?: string) {
  const midi = new Midi();

  midi.header.ppq = TICKS_PER_BEAT;
  midi.header.setTempo(Math.max(1, tempoBpm || DEFAULT_TEMPO));

  if (title?.trim()) {
    midi.name = title.trim();
  }

  const tracks = new Map<string, ReturnType<Midi['addTrack']>>();

  const getTrack = (trackId: string) => {
    if (!tracks.has(trackId)) {
      const track = midi.addTrack();
      track.name = trackId;
      tracks.set(trackId, track);
    }

    return tracks.get(trackId)!;
  };

  sortEventsByStart(noteEvents).forEach((event) => {
    const trackId = event.trackId?.trim() || 'Main';
    const track = getTrack(trackId);

    track.addNote({
      midi: noteNameToMidi(event.note),
      ticks: Math.max(0, Math.round(event.start * TICKS_PER_BEAT)),
      durationTicks: Math.max(1, Math.round(Math.max(MIN_DURATION_BEATS, event.duration) * TICKS_PER_BEAT)),
      velocity: normalizeVelocity(event.velocity),
      channel: 0,
    });
  });

  return midi;
}

function midiToBlob(midi: Midi): Blob {
  const bytes = midi.toArray();
  return new Blob([bytes], { type: 'audio/midi', endings: 'transparent' });
}

export function noteEventsToMidiBlob(noteEvents: NoteEvent[], tempoBpm: number, name?: string): Blob {
  if (!noteEvents.length) {
    throw new Error('No notes to export');
  }

  const midi = buildMidi(noteEvents, tempoBpm || DEFAULT_TEMPO, name?.trim());
  return midiToBlob(midi);
}

export function compositionToMidiBlob(composition: Composition, tempoOverride?: number): Blob {
  const tempo = tempoOverride ?? composition.tempo ?? DEFAULT_TEMPO;
  return noteEventsToMidiBlob(composition.noteEvents, tempo, composition.title);
}
