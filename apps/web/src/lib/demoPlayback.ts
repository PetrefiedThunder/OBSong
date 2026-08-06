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
 * Play a NoteEvent phrase once and auto-stop after it ends (+1s tail).
 * NoteEvent start/duration are in beats and are converted with tempoBpm.
 */
export async function playDemoNotes(
  notes: NoteEvent[],
  tempoBpm: number
): Promise<DemoPlaybackController> {
  if (notes.length === 0) return { stop: () => {} };

  const tone = await loadTone();
  await tone.start();

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

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(autoStopTimer);
    part.stop();
    part.dispose();
    tone.Transport.stop();
    synth.dispose();
  };

  const totalSeconds =
    notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0) * secondsPerBeat + 1;
  const autoStopTimer = setTimeout(stop, totalSeconds * 1000);

  return { stop };
}
