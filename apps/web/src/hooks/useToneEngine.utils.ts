import type { NoteEvent, SoundPreset, VoiceType } from '@toposonics/types';

export type AudioTopology = 'single' | 'multi';

const MULTI_VOICE_TRACK_IDS: VoiceType[] = ['bass', 'melody', 'pad', 'fx'];

export function getAudioTopology(noteEvents: NoteEvent[]): AudioTopology {
  return noteEvents.some(
    (event) => !!event.trackId && MULTI_VOICE_TRACK_IDS.includes(event.trackId as VoiceType)
  )
    ? 'multi'
    : 'single';
}

export function getNoteEventsDurationBeats(noteEvents: NoteEvent[]): number {
  return noteEvents.reduce(
    (durationBeats, event) => Math.max(durationBeats, event.start + event.duration),
    0
  );
}

export function beatsToSeconds(beats: number, tempo: number): number {
  return beats * (60 / Math.max(1, tempo));
}

export function getAudioGraphSignature(
  noteEvents: NoteEvent[],
  preset: SoundPreset
): string {
  return JSON.stringify({
    topology: getAudioTopology(noteEvents),
    oscillatorType: preset.oscillatorType,
    synthesis: preset.synthesis ?? null,
  });
}
