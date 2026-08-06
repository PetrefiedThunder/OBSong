/**
 * Minimal one-shot demo playback for the landing-page tour.
 *
 * Mirrors LandingDemoPlayer's lazy-import pattern (no static tone import, no full
 * engine). Uses the module-level Tone Transport, so callers MUST call stop() when
 * the demo ends or the component unmounts.
 */
import type { NoteEvent } from '@toposonics/types';

type ToneTransport = {
  stop: () => void;
  start: () => void;
};
type ToneSynth = {
  dispose: () => void;
  toDestination: () => ToneSynth;
  triggerAttackRelease: (note: string, duration: number, time?: number, velocity?: number) => void;
};
type TonePart = {
  dispose: () => void;
  start: (time: number) => void;
  stop: () => void;
};
type ToneModule = {
  PolySynth: new (...args: unknown[]) => ToneSynth;
  Synth: new (...args: unknown[]) => unknown;
  Part: new <T>(callback: (time: number, value: T) => void, events: T[]) => TonePart;
  Transport: ToneTransport;
  start: () => Promise<void>;
};

let tonePromise: Promise<ToneModule> | null = null;

function loadTone() {
  tonePromise ??= Promise.all([
    import('tone/build/esm/instrument/PolySynth.js'),
    import('tone/build/esm/instrument/Synth.js'),
    import('tone/build/esm/event/Part.js'),
    import('tone/build/esm/core/Global.js'),
  ]).then(([polySynth, synth, part, global]) => {
    const context = global.getContext();

    return {
      PolySynth: polySynth.PolySynth as ToneModule['PolySynth'],
      Synth: synth.Synth as ToneModule['Synth'],
      Part: part.Part as ToneModule['Part'],
      Transport: context.transport as ToneTransport,
      start: global.start,
    };
  });
  return tonePromise;
}

export interface DemoPlaybackController {
  stop(): void;
}

/**
 * Resume the Web Audio context. Call this from inside a real user-gesture handler
 * (button onClick) so browsers with strict autoplay policies unlock audio before a
 * later, non-gesture code path (e.g. a tour step effect) tries to play.
 */
export function unlockAudio(): void {
  void loadTone()
    .then((tone) => tone.start())
    .catch(() => {
      // Best-effort: playback will retry the unlock itself.
    });
}

// Monotonic token identifying the playback that currently owns the shared Transport.
// A stale load or auto-stop timer must not stop a newer playback's Transport.
let activePlayback = 0;

/**
 * Play a NoteEvent phrase once and auto-stop after it ends (+1s tail).
 * NoteEvent start/duration are in beats and are converted with tempoBpm.
 *
 * Returns its controller SYNCHRONOUSLY: Tone loads in the background, and stop()
 * cancels cleanly whether or not setup has finished — a stop during async setup
 * prevents the pending playback from ever starting (and from stopping the shared
 * Transport out from under a newer playback).
 */
export function playDemoNotes(notes: NoteEvent[], tempoBpm: number): DemoPlaybackController {
  if (notes.length === 0) return { stop: () => {} };

  const token = ++activePlayback;
  let stopped = false;
  let cleanup: (() => void) | null = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cleanup?.();
    cleanup = null;
  };

  void (async () => {
    const tone = await loadTone();
    await tone.start();

    // Superseded (newer playback started) or stopped while Tone was loading: never start.
    if (stopped || token !== activePlayback) return;

    const synth = new tone.PolySynth(tone.Synth, {
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 1.0 },
    }).toDestination();

    const secondsPerBeat = 60 / Math.max(1, tempoBpm);
    const events = notes.map((note) => ({
      time: note.start * secondsPerBeat,
      note: note.note,
      duration: note.duration * secondsPerBeat,
      velocity: note.velocity ?? 0.7,
    }));

    const part = new tone.Part((time, event) => {
      synth.triggerAttackRelease(event.note, event.duration, time, event.velocity);
    }, events);

    part.start(0);
    tone.Transport.start();

    const totalSeconds =
      notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0) * secondsPerBeat + 1;
    const autoStopTimer = setTimeout(stop, totalSeconds * 1000);

    cleanup = () => {
      clearTimeout(autoStopTimer);
      part.stop();
      part.dispose();
      // Only the current owner may stop the shared Transport.
      if (token === activePlayback) {
        tone.Transport.stop();
      }
      synth.dispose();
    };

    // stop() may have raced in between the ownership check and cleanup assignment.
    if (stopped) {
      cleanup();
      cleanup = null;
    }
  })().catch((error) => {
    console.error('Demo playback failed:', error);
  });

  return { stop };
}
