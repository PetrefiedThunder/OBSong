'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import type { NoteEvent, SoundPreset, VoiceType } from '@toposonics/types';
import { getAudioGraphSignature, getAudioTopology } from './useToneEngine.utils';

interface UseToneEngineOptions {
  noteEvents: NoteEvent[];
  tempo: number;
  preset: SoundPreset;
}

interface VoiceSynth {
  synth: Tone.PolySynth;
  reverb: Tone.Reverb;
  filter?: Tone.Filter;
  panner?: Tone.Panner;
}

export function useToneEngine({ noteEvents, tempo, preset }: UseToneEngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Legacy single-synth refs (for backward compatibility)
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const pannerRef = useRef<Tone.Panner | null>(null);

  // Multi-voice synth refs
  const voiceSynthsRef = useRef<Map<VoiceType, VoiceSynth>>(new Map());

  const partRef = useRef<Tone.Part | null>(null);
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
    if (stopSchedulerIdRef.current !== null) {
      Tone.Transport.clear(stopSchedulerIdRef.current);
      stopSchedulerIdRef.current = null;
    }

    if (partRef.current) {
      partRef.current.stop();
    }

    Tone.Transport.stop();
    Tone.Transport.position = 0;
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

      const synth = new Tone.PolySynth(Tone.Synth, synthConfig);
      const reverb = new Tone.Reverb(reverbConfig);
      await reverb.generate();

      let filter: Tone.Filter | undefined;
      let panner: Tone.Panner | undefined;

      if (voice === 'melody') {
        filter = new Tone.Filter({
          type: 'lowpass',
          frequency: 3000,
          Q: 1,
        });
        panner = new Tone.Panner(0);
        synth.chain(filter, panner, reverb, Tone.Destination);
      } else {
        synth.connect(reverb);
        reverb.toDestination();
      }

      voiceSynthsRef.current.set(voice, { synth, reverb, filter, panner });
    }
  }, [preset]);

  const createSingleVoiceGraph = useCallback(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: preset.oscillatorType,
      },
      envelope: preset.synthesis?.envelope || {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.6,
        release: 0.8,
      },
    });

    const reverb = new Tone.Reverb({
      decay: preset.synthesis?.effects?.reverb?.decay || 2,
      wet: 0,
    });

    const filter = new Tone.Filter({
      type: preset.synthesis?.filter?.type || 'lowpass',
      frequency: preset.synthesis?.filter?.frequency || 2000,
      Q: preset.synthesis?.filter?.resonance || 1,
    });

    const panner = new Tone.Panner(0);

    synth.chain(filter, panner, reverb, Tone.Destination);

    synthRef.current = synth;
    reverbRef.current = reverb;
    filterRef.current = filter;
    pannerRef.current = panner;
  }, [preset]);

  const ensureAudioGraph = useCallback(async () => {
    await Tone.start();

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
        createSingleVoiceGraph();
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
      time: event.start,
      note: event.note,
      duration: event.duration,
      velocity: event.velocity,
      pan: event.pan || 0,
      reverbSend: event.effects?.reverbSend || 0.2,
      voice: event.trackId as VoiceType | undefined,
    }));

    const part = new Tone.Part((time, value) => {
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
    Tone.Transport.bpm.value = tempo;

    return part;
  }, [disposePart, isMultiVoice, noteEvents, tempo]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return;

    let frameId: number;

    const updateTime = () => {
      setCurrentTime(Tone.Transport.seconds);
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
        Tone.Transport.clear(stopSchedulerIdRef.current);
        stopSchedulerIdRef.current = null;
      }

      Tone.Transport.stop();
      Tone.Transport.position = 0;
      setCurrentTime(0);

      part.start(0);
      Tone.Transport.start();
      setIsPlaying(true);

      const durationBeats = noteEvents.reduce(
        (max, event) => Math.max(max, event.start + event.duration),
        0
      );
      const durationSeconds = (durationBeats + 1) * (60 / tempo);

      stopSchedulerIdRef.current = Tone.Transport.scheduleOnce(() => {
        stop();
      }, `+${durationSeconds}`);
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
