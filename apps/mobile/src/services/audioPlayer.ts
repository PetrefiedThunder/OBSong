import { Audio } from 'expo-av';
import { noteToFrequency } from '@toposonics/core-audio';
import type { NoteEvent } from '@toposonics/types';

const BASE_FREQUENCY = 440;

export interface PlaybackOptions {
  tempo?: number;
  onProgress?: (current: number, total: number) => void;
}

const soundMap = {
  bass: require('../../assets/audio/beep.wav'),
  melody: require('../../assets/audio/beep.wav'),
  pad: require('../../assets/audio/beep.wav'),
  default: require('../../assets/audio/beep.wav'),
};

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

  const sounds: { [key: string]: Audio.Sound } = {};

  try {
    // Load all sounds
    for (const trackId in soundMap) {
      const sound = new Audio.Sound();
      // @ts-ignore
      await sound.loadAsync(soundMap[trackId]);
      sounds[trackId] = sound;
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const trackId = event.trackId || 'default';
      const sound = sounds[trackId] || sounds.default;

      if (!sound) continue;

      const frequency = noteToFrequency(event.note);
      const playbackRate = Math.max(0.5, Math.min(2.5, frequency / BASE_FREQUENCY));

      const volume = event.velocity ?? 0.8;
      const finalVolume = event.effects?.filterCutoff
        ? volume * (0.5 + event.effects.filterCutoff * 0.5)
        : volume;

      await sound.setPositionAsync(0);
      await sound.setRateAsync(playbackRate, true, 1);
      await sound.setVolumeAsync(Math.min(1, finalVolume));
      await sound.playAsync();

      options.onProgress?.(i + 1, events.length);

      const durationMs = beatDurationMs * (event.duration ?? 0.5);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
    }
  } finally {
    // Unload all sounds
    for (const trackId in sounds) {
      await sounds[trackId].unloadAsync();
    }
  }
}

export function formatNoteEventsDuration(events: NoteEvent[], tempo = 90): number {
  return events.reduce((total, event) => total + (event.duration ?? 0.5), 0) * (60 / tempo);
}
