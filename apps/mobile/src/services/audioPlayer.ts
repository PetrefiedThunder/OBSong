import { Audio } from 'expo-av';
import { noteToFrequency } from '@toposonics/core-audio';
import type { NoteEvent } from '@toposonics/types';

const BASE_FREQUENCY = 440;

export interface PlaybackOptions {
  tempo?: number;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Handle for an in-flight playback. `done` resolves when playback finishes (or is
 * cancelled); `cancel()` stops audio and short-circuits the note loop so callers can
 * abort on unmount / navigation.
 */
export interface PlaybackController {
  cancel(): void;
  done: Promise<void>;
}

const soundMap = {
  bass: require('../../assets/audio/beep.wav'),
  melody: require('../../assets/audio/beep.wav'),
  pad: require('../../assets/audio/beep.wav'),
  default: require('../../assets/audio/beep.wav'),
} as const;

export function playNoteEvents(
  events: NoteEvent[],
  options: PlaybackOptions = {}
): PlaybackController {
  let cancelled = false;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let wake: (() => void) | null = null;

  const cancel = () => {
    cancelled = true;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    if (wake) {
      wake();
      wake = null;
    }
  };

  const done = (async () => {
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
      for (const trackId of Object.keys(soundMap) as Array<keyof typeof soundMap>) {
        if (cancelled) return;
        const sound = new Audio.Sound();
        await sound.loadAsync(soundMap[trackId]);
        sounds[trackId] = sound;
      }

      for (let i = 0; i < events.length; i++) {
        if (cancelled) break;

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
        // shouldCorrectPitch MUST be false: the whole pitch mechanism is varying the
        // playback rate of a single beep. Pitch correction would time-stretch while
        // preserving pitch, flattening every note to the sample's native pitch.
        await sound.setRateAsync(playbackRate, false);
        await sound.setVolumeAsync(Math.min(1, finalVolume));
        await sound.playAsync();

        options.onProgress?.(i + 1, events.length);

        const durationMs = beatDurationMs * (event.duration ?? 0.5);
        // Interruptible wait so cancel() halts playback promptly.
        await new Promise<void>((resolve) => {
          wake = resolve;
          pendingTimer = setTimeout(() => {
            pendingTimer = null;
            wake = null;
            resolve();
          }, durationMs);
        });
      }
    } finally {
      // Stop + unload every sound, isolating per-sound failures so one rejection
      // doesn't leak the remaining native Audio.Sound instances.
      for (const trackId in sounds) {
        try {
          await sounds[trackId].stopAsync();
        } catch {
          // ignore — sound may already be stopped/unloaded
        }
        try {
          await sounds[trackId].unloadAsync();
        } catch {
          // ignore — best-effort cleanup
        }
      }
    }
  })();

  return { cancel, done };
}

export function formatNoteEventsDuration(events: NoteEvent[], tempo = 90): number {
  return events.reduce((total, event) => total + (event.duration ?? 0.5), 0) * (60 / tempo);
}
