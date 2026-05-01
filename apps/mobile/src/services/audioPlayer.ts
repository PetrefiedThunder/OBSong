import { Audio } from 'expo-av';
import { noteToFrequency } from '@toposonics/core-audio';
import type { NoteEvent } from '@toposonics/types';

const BASE_FREQUENCY = 440;

export interface PlaybackOptions {
  tempo?: number;
  onProgress?: (current: number, total: number) => void;
}

type SoundTrackId = 'bass' | 'melody' | 'pad' | 'default';

function getSoundSource(trackId?: string) {
  switch (trackId) {
    case 'bass':
    case 'melody':
    case 'pad':
      return require('../../assets/audio/beep.wav');
    default:
      return require('../../assets/audio/beep.wav');
  }
}

type TimerId = ReturnType<typeof setTimeout>;

interface PlaybackController {
  cancelled: boolean;
  timers: TimerId[];
  activeSounds: Set<Audio.Sound>;
}

let activePlayback: PlaybackController | null = null;

export function getNoteEventsDurationBeats(events: NoteEvent[]): number {
  return events.reduce(
    (durationBeats, event) =>
      Math.max(durationBeats, event.start + (event.duration ?? 0.5)),
    0
  );
}

function beatsToMilliseconds(beats: number, tempo: number): number {
  return Math.max(0, beats) * (60 / Math.max(1, tempo)) * 1000;
}

async function unloadSound(sound: Audio.Sound): Promise<void> {
  try {
    await sound.stopAsync();
  } catch {
    // The sample may already have ended; unloading is the important cleanup.
  }

  try {
    await sound.unloadAsync();
  } catch {
    // Avoid surfacing cleanup failures after playback was cancelled.
  }
}

async function cancelPlayback(controller: PlaybackController | null): Promise<void> {
  if (!controller) return;

  controller.cancelled = true;
  controller.timers.forEach(clearTimeout);
  controller.timers = [];

  await Promise.all(Array.from(controller.activeSounds, unloadSound));
  controller.activeSounds.clear();
}

export async function stopNoteEvents(): Promise<void> {
  const controller = activePlayback;
  activePlayback = null;
  await cancelPlayback(controller);
}

export async function playNoteEvents(
  events: NoteEvent[],
  options: PlaybackOptions = {}
): Promise<void> {
  await stopNoteEvents();

  if (events.length === 0) return;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
  });

  const tempo = options.tempo ?? 90;
  const controller: PlaybackController = {
    cancelled: false,
    timers: [],
    activeSounds: new Set(),
  };
  activePlayback = controller;

  try {
    const scheduledEvents = [...events].sort((a, b) => a.start - b.start);
    const totalDurationMs = beatsToMilliseconds(getNoteEventsDurationBeats(events), tempo);
    let startedEvents = 0;

    await new Promise<void>((resolve) => {
      const finishTimer = setTimeout(resolve, totalDurationMs);
      controller.timers.push(finishTimer);

      scheduledEvents.forEach((event) => {
        const startTimer = setTimeout(() => {
          void playScheduledEvent(event, tempo, controller).then((played) => {
            if (!played || controller.cancelled) return;

            startedEvents += 1;
            options.onProgress?.(startedEvents, events.length);
          });
        }, beatsToMilliseconds(event.start, tempo));

        controller.timers.push(startTimer);
      });
    });
  } finally {
    if (activePlayback === controller) {
      activePlayback = null;
    }

    await cancelPlayback(controller);
  }
}

async function playScheduledEvent(
  event: NoteEvent,
  tempo: number,
  controller: PlaybackController
): Promise<boolean> {
  if (controller.cancelled) return false;

  const trackId = event.trackId as SoundTrackId | undefined;
  const soundSource = getSoundSource(trackId);
  const sound = new Audio.Sound();
  controller.activeSounds.add(sound);

  try {
    await sound.loadAsync(soundSource);
    if (controller.cancelled) return false;

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

    const stopTimer = setTimeout(() => {
      controller.activeSounds.delete(sound);
      void unloadSound(sound);
    }, beatsToMilliseconds(event.duration ?? 0.5, tempo));
    controller.timers.push(stopTimer);

    return true;
  } catch {
    controller.activeSounds.delete(sound);
    await unloadSound(sound);
    return false;
  }
}

export function formatNoteEventsDuration(events: NoteEvent[], tempo = 90): number {
  return getNoteEventsDurationBeats(events) * (60 / Math.max(1, tempo));
}
