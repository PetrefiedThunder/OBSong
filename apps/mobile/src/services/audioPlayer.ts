import { Audio } from 'expo-av';
import { noteToFrequency } from '@toposonics/core-audio';
import type { NoteEvent } from '@toposonics/types';

const BASE_FREQUENCY = 440;

export interface PlaybackOptions {
  tempo?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function playNoteEvents(
  events: NoteEvent[],
  options: PlaybackOptions = {}
): Promise<void> {
  if (events.length === 0) return;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
  });

  const tempo = options.tempo ?? 90;
  const beatDurationMs = (60 / tempo) * 1000;

  const sound = new Audio.Sound();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await sound.loadAsync(require('../../assets/audio/beep.wav'));

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const frequency = noteToFrequency(event.note);
      const playbackRate = Math.max(0.5, Math.min(2.5, frequency / BASE_FREQUENCY));

      await sound.setPositionAsync(0);
      await sound.setRateAsync(playbackRate, true, 1);
      await sound.setVolumeAsync(Math.min(1, event.velocity ?? 0.8));
      await sound.playAsync();

      options.onProgress?.(i + 1, events.length);

      const durationMs = beatDurationMs * (event.duration ?? 0.5);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
    }
  } finally {
    await sound.unloadAsync();
  }
}

export function formatNoteEventsDuration(events: NoteEvent[], tempo = 90): number {
  return events.reduce((total, event) => total + (event.duration ?? 0.5), 0) * (60 / tempo);
}
