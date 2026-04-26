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
