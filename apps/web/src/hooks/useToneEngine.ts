'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import type { NoteEvent, SoundPreset } from '@toposonics/types';

interface UseToneEngineOptions {
  noteEvents: NoteEvent[];
  tempo: number;
  preset: SoundPreset;
}

export function useToneEngine({ noteEvents, tempo, preset }: UseToneEngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const pannerRef = useRef<Tone.Panner | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

  // Initialize Tone.js audio context
  const initializeAudio = useCallback(async () => {
    if (synthRef.current) return; // Already initialized

    setIsLoading(true);

    try {
      await Tone.start();

      // Create synth
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

      // Create effects
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

      console.log('Tone.js initialized');
    } catch (error) {
      console.error('Failed to initialize Tone.js:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preset]);

  // Create Tone.Part from note events
  useEffect(() => {
    if (!synthRef.current || noteEvents.length === 0) return;

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
    }));

    const part = new Tone.Part((time, value) => {
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
    }, events);

    part.loop = false;
    partRef.current = part;

    // Set tempo
    Tone.Transport.bpm.value = tempo;

    return () => {
      part.dispose();
    };
  }, [noteEvents, tempo]);

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(Tone.Transport.seconds);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const play = useCallback(async () => {
    await initializeAudio();

    if (!partRef.current) {
      console.warn('No part to play');
      return;
    }

    Tone.Transport.start();
    partRef.current.start(0);
    setIsPlaying(true);

    // Auto-stop at the end
    const duration = noteEvents.reduce(
      (max, event) => Math.max(max, event.start + event.duration),
      0
    );

    setTimeout(() => {
      stop();
    }, (duration + 1) * 1000 * (60 / tempo));
  }, [initializeAudio, noteEvents, tempo]);

  const stop = useCallback(() => {
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
    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
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
