'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import type { NoteEvent, SoundPreset, VoiceType } from '@toposonics/types';

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

  // Detect if we're in multi-voice mode
  const isMultiVoice = noteEvents.some(event =>
    event.trackId && ['bass', 'melody', 'pad', 'fx'].includes(event.trackId)
  );

  // Initialize Tone.js audio context
  const initializeAudio = useCallback(async () => {
    if (synthRef.current || voiceSynthsRef.current.size > 0) return; // Already initialized

    setIsLoading(true);

    try {
      await Tone.start();

      if (isMultiVoice) {
        // Multi-voice mode: create separate synths for each voice
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
              reverbConfig = { decay: 1.5, wet: 0.15 }; // Minimal reverb for bass
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
              reverbConfig = { decay: 2.5, wet: 0.3 }; // Moderate reverb
              break;

            case 'pad':
              synthConfig = {
                oscillator: { type: 'sine' as const },
                envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 2.0 },
              };
              reverbConfig = { decay: 4.0, wet: 0.5 }; // Heavy reverb for pads
              break;

            default:
              synthConfig = {
                oscillator: { type: preset.oscillatorType },
                envelope: preset.synthesis?.envelope || {
                  attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.8,
                },
              };
              reverbConfig = { decay: 2, wet: 0.2 };
          }

          const synth = new Tone.PolySynth(Tone.Synth, synthConfig);
          const reverb = new Tone.Reverb(reverbConfig);
          await reverb.generate(); // Pre-generate reverb impulse

          let filter: Tone.Filter | undefined;
          let panner: Tone.Panner | undefined;

          if (voice === 'melody') {
            // Add filter and panner for melody
            filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 3000,
              Q: 1,
            });
            panner = new Tone.Panner(0);
            synth.chain(filter, panner, reverb, Tone.Destination);
          } else {
            // Bass and pad: just reverb
            synth.connect(reverb);
            reverb.toDestination();
          }

          voiceSynthsRef.current.set(voice, { synth, reverb, filter, panner });
        }

        console.log('Multi-voice Tone.js initialized');
      } else {
        // Legacy single-synth mode
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

        // Connect audio chain
        synth.chain(filter, panner, reverb, Tone.Destination);

        synthRef.current = synth;
        reverbRef.current = reverb;
        filterRef.current = filter;
        pannerRef.current = panner;

        console.log('Single-synth Tone.js initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Tone.js:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preset, isMultiVoice]);

  // Create Tone.Part from note events
  useEffect(() => {
    if ((!synthRef.current && voiceSynthsRef.current.size === 0) || noteEvents.length === 0) return;

    // Dispose of previous part
    if (partRef.current) {
      partRef.current.dispose();
    }

    // Convert NoteEvents to Tone.js Part format
    const events = noteEvents.map((event) => ({
      time: event.start,
      note: event.note,
      duration: event.duration,
      velocity: event.velocity,
      pan: event.pan || 0,
      reverbSend: event.effects?.reverbSend || 0.2,
      filterCutoff: event.effects?.filterCutoff || 0.5,
      voice: event.trackId as VoiceType | undefined,
    }));

    const part = new Tone.Part((time, value) => {
      if (isMultiVoice && value.voice) {
        // Multi-voice mode: route to appropriate synth
        const voiceSynth = voiceSynthsRef.current.get(value.voice);
        if (!voiceSynth) return;

        // Set per-note reverb if specified
        if (value.reverbSend !== undefined) {
          voiceSynth.reverb.wet.setValueAtTime(value.reverbSend, time);
        }

        // Set panning for melody
        if (value.voice === 'melody' && voiceSynth.panner) {
          voiceSynth.panner.pan.setValueAtTime(value.pan, time);
        }

        // Trigger note
        voiceSynth.synth.triggerAttackRelease(
          value.note,
          value.duration,
          time,
          value.velocity
        );
      } else {
        // Legacy single-synth mode
        if (!synthRef.current || !reverbRef.current || !pannerRef.current) return;

        // Set panning
        pannerRef.current.pan.setValueAtTime(value.pan, time);

        // Set reverb send
        reverbRef.current.wet.setValueAtTime(value.reverbSend, time);

        // Trigger note
        synthRef.current.triggerAttackRelease(
          value.note,
          value.duration,
          time,
          value.velocity
        );
      }
    }, events);

    part.loop = false;
    partRef.current = part;

    // Set tempo
    Tone.Transport.bpm.value = tempo;

    return () => {
      part.dispose();
    };
  }, [noteEvents, tempo, isMultiVoice]);

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
    await initializeAudio();

    if (!partRef.current) {
      console.warn('No part to play');
      return;
    }

    // Reset transport so the scanline starts from the left edge
    Tone.Transport.position = 0;
    setCurrentTime(0);

    // Start playback
    Tone.Transport.start();
    partRef.current.start(0);
    setIsPlaying(true);

    // Auto-stop at the end using the transport clock for accuracy
    const duration = noteEvents.reduce(
      (max, event) => Math.max(max, event.start + event.duration),
      0
    );

    const durationSeconds = (duration + 1) * (60 / tempo);

    if (stopSchedulerIdRef.current !== null) {
      Tone.Transport.clear(stopSchedulerIdRef.current);
    }

    stopSchedulerIdRef.current = Tone.Transport.scheduleOnce(() => {
      stop();
    }, `+${durationSeconds}`);
  }, [initializeAudio, noteEvents, stop, tempo]);

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

  // Cleanup on unmount
  useEffect(() => {
    const voiceSynths = voiceSynthsRef.current;

    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }

      // Clean up legacy synth
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (filterRef.current) {
        filterRef.current.dispose();
      }
      if (pannerRef.current) {
        pannerRef.current.dispose();
      }

      // Clean up multi-voice synths
      for (const voiceSynth of voiceSynths.values()) {
        voiceSynth.synth.dispose();
        voiceSynth.reverb.dispose();
        voiceSynth.filter?.dispose();
        voiceSynth.panner?.dispose();
      }
      voiceSynths.clear();
    };
  }, []);

  return {
    play,
    stop,
    isPlaying,
    isLoading,
    currentTime,
  };
}
