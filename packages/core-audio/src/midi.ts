/// <reference lib="dom" />
import { noteNameToMidi } from './scales';
import type { Composition, NoteEvent } from '@toposonics/types';

const TICKS_PER_BEAT = 480;
const DEFAULT_TEMPO = 120;

function clampVelocity(velocity?: number) {
  const normalized = velocity ?? 0.8;
  return Math.min(127, Math.max(1, Math.round(normalized * 127)));
}

function encodeVarLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let remaining = value >> 7;

  while (remaining > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80);
    remaining >>= 7;
  }

  return bytes;
}

function writeUint32BE(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function tempoChunk(tempoBpm: number, title?: string): number[] {
  const microsecondsPerBeat = Math.round(60000000 / Math.max(1, tempoBpm || DEFAULT_TEMPO));
  const trackData: number[] = [
    0x00,
    0xff,
    0x51,
    0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
    // Time signature 4/4 to keep DAWs happy
    0x00,
    0xff,
    0x58,
    0x04,
    0x04,
    0x02,
    0x18,
    0x08,
  ];

  if (title) {
    const nameBytes = Array.from(title).map((char) => char.charCodeAt(0));
    trackData.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);
  }

  // End of track
  trackData.push(0x00, 0xff, 0x2f, 0x00);

  return [
    0x4d,
    0x54,
    0x72,
    0x6b,
    ...writeUint32BE(trackData.length),
    ...trackData,
  ];
}

function noteTrackChunk(noteEvents: NoteEvent[], trackName?: string): number[] {
  const trackData: number[] = [];

  if (trackName) {
    const nameBytes = Array.from(trackName).map((char) => char.charCodeAt(0));
    trackData.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);
  }

  const events = noteEvents.flatMap((event) => {
    const startTicks = Math.max(0, Math.round(event.start * TICKS_PER_BEAT));
    const durationTicks = Math.max(1, Math.round(event.duration * TICKS_PER_BEAT));
    const midi = noteNameToMidi(event.note);
    const velocity = clampVelocity(event.velocity);

    return [
      { tick: startTicks, type: 'on' as const, midi, velocity },
      { tick: startTicks + durationTicks, type: 'off' as const, midi, velocity: 0 },
    ];
  });

  events.sort((a, b) => {
    if (a.tick === b.tick) {
      return a.type === 'off' && b.type === 'on' ? 1 : -1;
    }
    return a.tick - b.tick;
  });

  let lastTick = 0;

  for (const event of events) {
    const delta = event.tick - lastTick;
    trackData.push(...encodeVarLength(delta));
    lastTick = event.tick;

    const status = event.type === 'on' ? 0x90 : 0x80; // channel 0
    trackData.push(status, event.midi, event.velocity);
  }

  // End of track
  trackData.push(0x00, 0xff, 0x2f, 0x00);

  return [
    0x4d,
    0x54,
    0x72,
    0x6b,
    ...writeUint32BE(trackData.length),
    ...trackData,
  ];
}

function createMidiFile(noteEvents: NoteEvent[], tempoBpm: number, title?: string): Uint8Array {
  const trackGroups = new Map<string, NoteEvent[]>();

  noteEvents.forEach((event) => {
    const key = event.trackId || 'Main';
    if (!trackGroups.has(key)) {
      trackGroups.set(key, []);
    }
    trackGroups.get(key)!.push(event);
  });

  const trackChunks = [tempoChunk(tempoBpm, title)];

  for (const [trackName, events] of trackGroups.entries()) {
    trackChunks.push(noteTrackChunk(events, trackName));
  }

  const header = [
    0x4d,
    0x54,
    0x68,
    0x64,
    // Header length (6 bytes)
    0x00,
    0x00,
    0x00,
    0x06,
    // Format type 1
    0x00,
    0x01,
    // Number of tracks (tempo + note tracks)
    (trackChunks.length >> 8) & 0xff,
    trackChunks.length & 0xff,
    // Division (ticks per quarter note)
    (TICKS_PER_BEAT >> 8) & 0xff,
    TICKS_PER_BEAT & 0xff,
  ];

  const totalLength = header.length + trackChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(totalLength);

  bytes.set(header, 0);

  let offset = header.length;
  for (const chunk of trackChunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return bytes;
}

export function noteEventsToMidiBlob(noteEvents: NoteEvent[], tempoBpm: number, name?: string): Blob {
  if (!noteEvents.length) {
    throw new Error('No notes to export');
  }

  const midiData = createMidiFile(noteEvents, tempoBpm || DEFAULT_TEMPO, name?.trim());
  const midiBuffer = midiData.buffer.slice(midiData.byteOffset, midiData.byteOffset + midiData.byteLength);

  return new Blob([midiBuffer], { type: 'audio/midi', endings: 'transparent' });
}

export function compositionToMidiBlob(composition: Composition, tempoOverride?: number): Blob {
  const tempo = tempoOverride ?? composition.tempo ?? DEFAULT_TEMPO;
  return noteEventsToMidiBlob(composition.noteEvents, tempo, composition.title);
}
