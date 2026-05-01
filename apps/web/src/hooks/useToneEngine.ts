'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NoteEvent, SoundPreset, VoiceType } from '@toposonics/types';
import {
  beatsToSeconds,
  getAudioGraphSignature,
  getAudioTopology,
  getNoteEventsDurationBeats,
} from './useToneEngine.utils';

type ToneTransport = {
  clear: (id: number) => void;
  stop: () => void;
  start: () => void;
  scheduleOnce: (callback: () => void, time: number | string) => number;
  position: number | string;
  seconds: number;
  bpm: { value: number };
};
type ToneModule = {
  PolySynth: new (...args: unknown[]) => ToneSynth;
  Synth: new (...args: unknown[]) => unknown;
  Reverb: new (...args: unknown[]) => ToneReverb;
  Filter: new (...args: unknown[]) => ToneFilter;
  Panner: new (...args: unknown[]) => TonePanner;
  Part: new <T>(callback: (time: number, value: T) => void, events: T[]) => TonePart;
  Destination: unknown;
  Transport: ToneTransport;
  start: () => Promise<void>;
};
type ToneNode = {
  dispose: () => void;
};
type ToneSynth = ToneNode & {
  connect: (node: unknown) => void;
  chain: (...nodes: unknown[]) => void;
  triggerAttackRelease: (
    note: string,
    duration: number,
    time?: number,
    velocity?: number
  ) => void;
};
type ToneReverb = ToneNode & {
  wet: { setValueAtTime: (value: number, time: number) => void };
  generate: () => Promise<unknown>;
  toDestination: () => void;
};
type ToneFilter = ToneNode;
type TonePanner = ToneNode & {
  pan: { setValueAtTime: (value: number, time: number) => void };
};
type TonePart = ToneNode & {
  loop: boolean | number;
  start: (time: number) => void;
  stop: () => void;
};

let tonePromise: Promise<ToneModule> | null = null;

function loadTone() {
  tonePromise ??= Promise.all([
    import('tone/build/esm/instrument/PolySynth.js'),
    import('tone/build/esm/instrument/Synth.js'),
    import('tone/build/esm/effect/Reverb.js'),
    import('tone/build/esm/component/filter/Filter.js'),
    import('tone/build/esm/component/channel/Panner.js'),
    import('tone/build/esm/event/Part.js'),
    import('tone/build/esm/core/Global.js'),
  ]).then(([polySynth, synth, reverb, filter, panner, part, global]) => {
    const context = global.getContext();

    return {
      PolySynth: polySynth.PolySynth as ToneModule['PolySynth'],
      Synth: synth.Synth as ToneModule['Synth'],
      Reverb: reverb.Reverb as ToneModule['Reverb'],
      Filter: filter.Filter as ToneModule['Filter'],
      Panner: panner.Panner as ToneModule['Panner'],
      Part: part.Part as ToneModule['Part'],
      Destination: context.destination,
      Transport: context.transport as ToneTransport,
      start: global.start,
    };
  });
  return tonePromise;
}

interface UseToneEngineOptions {
  noteEvents: NoteEvent[];
  tempo: number;
  preset: SoundPreset;
}

interface VoiceSynth {
  synth: ToneSynth;
  reverb: ToneReverb;
  filter?: ToneFilter;
  panner?: TonePanner;
}

export function useToneEngine({ noteEvents, tempo, preset }: UseToneEngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Legacy single-synth refs (for backward compatibility)
  const toneRef = useRef<ToneModule | null>(null);
  const synthRef = useRef<ToneSynth | null>(null);
  const reverbRef = useRef<ToneReverb | null>(null);
  const filterRef = useRef<ToneFilter | null>(null);
  const pannerRef = useRef<TonePanner | null>(null);

  // Multi-voice synth refs
  const voiceSynthsRef = useRef<Map<VoiceType, VoiceSynth>>(new Map());

  const partRef = useRef<TonePart | null>(null);
  const stopSchedulerIdRef = useRef<number | null>(null);
  const graphSignatureRef = useRef<string | null>(null);

  // Detect if we're in multi-voice mode
  const isMultiVoice = getAudioTopology(noteEvents) === 'multi';
  const graphSignature = getAudioGraphSignature(noteEvents, preset);

  const disposePart = useCallback(() => {
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
  }, []);

  const disposeAudioGraph = useCallback(() => {
    disposePart();

    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
    if (reverbRef.current) {
      reverbRef.current.dispose();
      reverbRef.current = null;
    }
    if (filterRef.current) {
      filterRef.current.dispose();
      filterRef.current = null;
    }
    if (pannerRef.current) {
      pannerRef.current.dispose();
      pannerRef.current = null;
    }

    for (const voiceSynth of voiceSynthsRef.current.values()) {
      voiceSynth.synth.dispose();
      voiceSynth.reverb.dispose();
      voiceSynth.filter?.dispose();
      voiceSynth.panner?.dispose();
    }
    voiceSynthsRef.current.clear();

    graphSignatureRef.current = null;
  }, [disposePart]);

  const stop = useCallback(() => {
    const tone = toneRef.current;

    if (tone && stopSchedulerIdRef.current !== null) {
      tone.Transport.clear(stopSchedulerIdRef.current);
      stopSchedulerIdRef.current = null;
    }

    if (partRef.current) {
      partRef.current.stop();
    }

    if (tone) {
      tone.Transport.stop();
      tone.Transport.position = 0;
    }

    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const createMultiVoiceGraph = useCallback(async () => {
    const voices: VoiceType[] = ['bass', 'melody', 'pad'];

    for (const voice of voices) {
      let synthConfig;
      let reverbConfig;

      switch (voice) {
        case 'bass':
          synthConfig = {
            oscillator: { type: 'triangle' as const },
            envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 1.0 },
          };
          reverbConfig = { decay: 1.5, wet: 0.15 };
          break;

        case 'melody':
          synthConfig = {
            oscillator: { type: preset.oscillatorType },
            envelope: preset.synthesis?.envelope || {
              attack: 0.01,
              decay: 0.1,
              sustain: 0.3,
              release: 0.5,
            },
          };
          reverbConfig = { decay: 2.5, wet: 0.3 };
          break;

        case 'pad':
          synthConfig = {
            oscillator: { type: 'sine' as const },
            envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 2.0 },
          };
          reverbConfig = { decay: 4.0, wet: 0.5 };
          break;

        default:
          synthConfig = {
            oscillator: { type: preset.oscillatorType },
            envelope: preset.synthesis?.envelope || {
              attack: 0.1,
              decay: 0.2,
              sustain: 0.6,
              release: 0.8,
            },
          };
          reverbConfig = { decay: 2, wet: 0.2 };
      }

      const tone = toneRef.current ?? (await loadTone());
      toneRef.current = tone;

      const synth = new tone.PolySynth(tone.Synth, synthConfig) as ToneSynth;
      const reverb = new tone.Reverb(reverbConfig) as ToneReverb;
      await reverb.generate();

      let filter: ToneFilter | undefined;
      let panner: TonePanner | undefined;

      if (voice === 'melody') {
        filter = new tone.Filter({
          type: 'lowpass',
          frequency: 3000,
          Q: 1,
        }) as ToneFilter;
        panner = new tone.Panner(0) as TonePanner;
        synth.chain(filter, panner, reverb, tone.Destination);
      } else {
        synth.connect(reverb);
        reverb.toDestination();
      }

      voiceSynthsRef.current.set(voice, { synth, reverb, filter, panner });
    }
  }, [preset]);

  const createSingleVoiceGraph = useCallback(async () => {
    const tone = toneRef.current ?? (await loadTone());
    toneRef.current = tone;

    const synth = new tone.PolySynth(tone.Synth, {
      oscillator: {
        type: preset.oscillatorType,
      },
      envelope: preset.synthesis?.envelope || {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.6,
        release: 0.8,
      },
    }) as ToneSynth;

    const reverb = new tone.Reverb({
      decay: preset.synthesis?.effects?.reverb?.decay || 2,
      wet: 0,
    }) as ToneReverb;

    const filter = new tone.Filter({
      type: preset.synthesis?.filter?.type || 'lowpass',
      frequency: preset.synthesis?.filter?.frequency || 2000,
      Q: preset.synthesis?.filter?.resonance || 1,
    }) as ToneFilter;

    const panner = new tone.Panner(0) as TonePanner;

    synth.chain(filter, panner, reverb, tone.Destination);

    synthRef.current = synth;
    reverbRef.current = reverb;
    filterRef.current = filter;
    pannerRef.current = panner;
  }, [preset]);

  const ensureAudioGraph = useCallback(async () => {
    const tone = await loadTone();
    toneRef.current = tone;

    await tone.start();

    if (graphSignatureRef.current === graphSignature) {
      return;
    }

    setIsLoading(true);
    stop();
    disposeAudioGraph();

    try {
      if (isMultiVoice) {
        await createMultiVoiceGraph();
      } else {
        await createSingleVoiceGraph();
      }

      graphSignatureRef.current = graphSignature;
    } catch (error) {
      disposeAudioGraph();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    createMultiVoiceGraph,
    createSingleVoiceGraph,
    disposeAudioGraph,
    graphSignature,
    isMultiVoice,
    stop,
  ]);

  const buildPart = useCallback(() => {
    disposePart();

    if (!noteEvents.length) {
      return null;
    }

    const events = noteEvents.map((event) => ({
      time: beatsToSeconds(event.start, tempo),
      note: event.note,
      duration: beatsToSeconds(event.duration, tempo),
      velocity: event.velocity,
      pan: event.pan || 0,
      reverbSend: event.effects?.reverbSend || 0.2,
      voice: event.trackId as VoiceType | undefined,
    }));

    const tone = toneRef.current;
    if (!tone) {
      return null;
    }

    const part = new tone.Part((time, value) => {
      if (isMultiVoice && value.voice) {
        const voiceSynth = voiceSynthsRef.current.get(value.voice);
        if (!voiceSynth) return;

        voiceSynth.reverb.wet.setValueAtTime(value.reverbSend, time);

        if (value.voice === 'melody' && voiceSynth.panner) {
          voiceSynth.panner.pan.setValueAtTime(value.pan, time);
        }

        voiceSynth.synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
        return;
      }

      if (!synthRef.current || !reverbRef.current || !pannerRef.current) {
        return;
      }

      pannerRef.current.pan.setValueAtTime(value.pan, time);
      reverbRef.current.wet.setValueAtTime(value.reverbSend, time);
      synthRef.current.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, events);

    part.loop = false;
    partRef.current = part;
    tone.Transport.bpm.value = tempo;

    return part;
  }, [disposePart, isMultiVoice, noteEvents, tempo]);

  useEffect(() => {
    if (toneRef.current) {
      toneRef.current.Transport.bpm.value = tempo;
    }
  }, [tempo]);

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return;

    let frameId: number;

    const updateTime = () => {
      if (toneRef.current) {
        setCurrentTime(toneRef.current.Transport.seconds);
      }
      frameId = requestAnimationFrame(updateTime);
    };

    frameId = requestAnimationFrame(updateTime);

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  const play = useCallback(async () => {
    if (!noteEvents.length) {
      console.warn('No note events to play');
      return;
    }

    try {
      await ensureAudioGraph();
      const part = buildPart();

      if (!part) {
        console.warn('No part to play');
        return;
      }

      if (stopSchedulerIdRef.current !== null) {
        toneRef.current?.Transport.clear(stopSchedulerIdRef.current);
        stopSchedulerIdRef.current = null;
      }

      if (!toneRef.current) {
        return;
      }

      toneRef.current.Transport.stop();
      toneRef.current.Transport.position = 0;
      setCurrentTime(0);

      part.start(0);
      toneRef.current.Transport.start();
      setIsPlaying(true);

      const durationSeconds = beatsToSeconds(getNoteEventsDurationBeats(noteEvents), tempo);

      stopSchedulerIdRef.current = toneRef.current.Transport.scheduleOnce(() => {
        stop();
      }, durationSeconds);
    } catch (error) {
      console.error('Failed to play composition:', error);
      stop();
    }
  }, [buildPart, ensureAudioGraph, noteEvents, stop, tempo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      disposeAudioGraph();
    };
  }, [disposeAudioGraph, stop]);

  return {
    play,
    stop,
    isPlaying,
    isLoading,
    currentTime,
  };
}
