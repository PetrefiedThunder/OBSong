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

// Every voice is the same beep sample pitch-shifted per note; a single Audio.Sound can only
// play one source at a time, so overlapping notes (e.g. a pad chord) need distinct instances.
// A small round-robin pool provides that polyphony without allocating one sound per note.
// (The sample lives in an object literal because RN assets need require(), and a bare
// `const x = require(...)` trips @typescript-eslint/no-var-requires.)
const samples = {
  beep: require('../../assets/audio/beep.wav'),
} as const;
const VOICE_POOL_SIZE = 8;

export function playNoteEvents(
  events: NoteEvent[],
  options: PlaybackOptions = {}
): PlaybackController {
  let cancelled = false;
  let wake: (() => void) | null = null;
  const timers: Array<ReturnType<typeof setTimeout>> = [];

  const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
  };

  const cancel = () => {
    cancelled = true;
    clearTimers();
    if (wake) {
      const resolve = wake;
      wake = null;
      resolve();
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

    const pool: Audio.Sound[] = [];
    let nextVoice = 0;

    // Trigger one note on the next free pool voice (round-robin), so simultaneous notes play
    // concurrently instead of cutting each other off on a shared instance. Errors are
    // swallowed so a mid-playback reuse can't reject the whole session.
    const triggerNote = async (event: NoteEvent) => {
      if (cancelled || pool.length === 0) return;
      const sound = pool[nextVoice % pool.length];
      nextVoice += 1;

      const frequency = noteToFrequency(event.note);
      const playbackRate = Math.max(0.5, Math.min(2.5, frequency / BASE_FREQUENCY));

      const volume = event.velocity ?? 0.8;
      // Use != null (not truthiness) so filterCutoff === 0 (a fully dark pixel) applies
      // the intended 0.5x attenuation instead of falling through to full volume.
      const finalVolume =
        event.effects?.filterCutoff != null
          ? volume * (0.5 + event.effects.filterCutoff * 0.5)
          : volume;

      try {
        await sound.setPositionAsync(0);
        // shouldCorrectPitch MUST be false: the whole pitch mechanism is varying the
        // playback rate of a single beep. Pitch correction would time-stretch while
        // preserving pitch, flattening every note to the sample's native pitch.
        await sound.setRateAsync(playbackRate, false);
        await sound.setVolumeAsync(Math.min(1, finalVolume));
        await sound.playAsync();
      } catch {
        // ignore — transient error (e.g. sound retriggered while still playing)
      }
    };

    try {
      // Load the voice pool up front.
      for (let i = 0; i < VOICE_POOL_SIZE; i++) {
        if (cancelled) return;
        const sound = new Audio.Sound();
        await sound.loadAsync(samples.beep);
        pool.push(sound);
      }

      if (cancelled) return;

      // Notes carry a `start` (beats) and overlap across voices, so schedule each to fire
      // at its own offset from playback start rather than playing them back-to-back.
      // Playback ends once the last-finishing note's tail has elapsed.
      const ordered = [...events].sort((a, b) => a.start - b.start);
      const endOfLastMs =
        ordered.reduce((max, e) => Math.max(max, (e.start ?? 0) + (e.duration ?? 0.5)), 0) *
        beatDurationMs;

      let played = 0;

      await new Promise<void>((resolve) => {
        if (cancelled) {
          resolve();
          return;
        }

        // cancel() clears the timers and calls wake() to resolve this promise early.
        wake = resolve;

        for (const event of ordered) {
          const fireAt = Math.max(0, (event.start ?? 0) * beatDurationMs);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              void triggerNote(event);
              played += 1;
              options.onProgress?.(played, ordered.length);
            }, fireAt)
          );
        }

        // Resolve once the last note has had time to ring out (250 ms tail). Calling an
        // already-settled Promise resolve again (via cancel) is a safe no-op.
        timers.push(setTimeout(resolve, endOfLastMs + 250));
      });
    } finally {
      wake = null;
      clearTimers();
      // Stop + unload every pooled voice, isolating per-sound failures so one rejection
      // doesn't leak the remaining native Audio.Sound instances.
      for (const sound of pool) {
        try {
          await sound.stopAsync();
        } catch {
          // ignore — sound may already be stopped/unloaded
        }
        try {
          await sound.unloadAsync();
        } catch {
          // ignore — best-effort cleanup
        }
      }
    }
  })();

  return { cancel, done };
}

/**
 * Total composition length in seconds. Notes overlap (multi-voice) and are positioned by
 * `start`, so the length is the end of the last-finishing note — max(start + duration) —
 * not the sum of every note's duration (which over-counts overlapping voices). Matches the
 * web Tone engine's duration math.
 */
export function formatNoteEventsDuration(events: NoteEvent[], tempo = 90): number {
  if (events.length === 0) return 0;
  const beats = events.reduce(
    (max, event) => Math.max(max, (event.start ?? 0) + (event.duration ?? 0.5)),
    0
  );
  return beats * (60 / tempo);
}
