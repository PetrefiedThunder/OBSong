'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { NoteEvent, ScenePack } from '@toposonics/types';

interface LandingDemoPlayerProps {
  demoNotes: NoteEvent[];
  scenePack: ScenePack;
  onClose: () => void;
}

export function LandingDemoPlayer({
  demoNotes,
  scenePack,
  onClose,
}: LandingDemoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

  useEffect(() => {
    // Initialize synth
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.5,
        release: 1.0,
      },
    }).toDestination();

    synthRef.current = synth;

    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
      synth.dispose();
    };
  }, []);

  const handlePlay = async () => {
    if (!synthRef.current || demoNotes.length === 0) return;

    await Tone.start();

    // Stop any existing playback
    if (partRef.current) {
      partRef.current.stop();
      partRef.current.dispose();
    }

    // Create part from note events
    const events = demoNotes.map((note) => ({
      time: note.start,
      note: note.note,
      duration: note.duration,
      velocity: note.velocity || 0.7,
    }));

    const part = new Tone.Part((time, event) => {
      synthRef.current?.triggerAttackRelease(
        event.note,
        event.duration,
        time,
        event.velocity
      );
    }, events);

    part.start(0);
    partRef.current = part;

    setIsPlaying(true);
    Tone.Transport.start();

    // Calculate total duration and stop after
    const maxTime =
      Math.max(...demoNotes.map((n) => n.start + n.duration)) + 1;
    setTimeout(() => {
      Tone.Transport.stop();
      setIsPlaying(false);
    }, maxTime * 1000);
  };

  const handleStop = () => {
    if (partRef.current) {
      partRef.current.stop();
    }
    Tone.Transport.stop();
    setIsPlaying(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-elevated rounded-xl p-8 max-w-md w-full space-y-6 border border-gray-700"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: scenePack.uiThemeHints?.accentColor || '#A855F7',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{scenePack.name}</h2>
            <p className="text-gray-400 text-sm">{scenePack.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors text-white"
                style={{
                  backgroundColor: scenePack.uiThemeHints?.accentColor || '#A855F7',
                }}
              >
                ▶ Play Demo
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors bg-gray-600 hover:bg-gray-700 text-white"
              >
                ⏹ Stop
              </button>
            )}
            <a
              href={`/studio?scene=${scenePack.id}`}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors border-2 text-center"
              style={{
                borderColor: scenePack.uiThemeHints?.accentColor || '#A855F7',
                color: scenePack.uiThemeHints?.accentColor || '#A855F7',
              }}
            >
              Open in Studio →
            </a>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Best For</h4>
              <div className="flex flex-wrap gap-1">
                {scenePack.recommendedSubjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-surface-elevated"
                    style={{
                      color: scenePack.uiThemeHints?.accentColor || '#A855F7',
                    }}
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Lighting</h4>
              <p className="text-sm text-gray-300">{scenePack.recommendedLighting}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
