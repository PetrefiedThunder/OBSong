'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { NoteEvent } from '@toposonics/types';
import { noteNameToMidi } from '@toposonics/core-audio';

interface TimelineVisualizerProps {
  noteEvents: NoteEvent[];
  currentTime?: number;
  width?: number;
  height?: number;
}

export function TimelineVisualizer({
  noteEvents,
  currentTime = 0,
  width = 800,
  height = 300,
}: TimelineVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Offscreen canvas holding the static scene (grid + notes + labels). It only needs
  // to be repainted when the notes or dimensions change, not on every animation frame.
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const maxTimeRef = useRef(0);

  const padding = 40;

  // Blit the pre-rendered scene and draw only the moving playback cursor on top.
  const paintFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(scene, 0, 0);

    const maxTime = maxTimeRef.current;
    if (maxTime > 0 && currentTime > 0 && currentTime <= maxTime) {
      const graphWidth = width - padding * 2;
      const cursorX = padding + (currentTime / maxTime) * graphWidth;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, padding);
      ctx.lineTo(cursorX, height - padding);
      ctx.stroke();
    }
  }, [currentTime, width, height]);

  // Rebuild the static scene only when notes/dimensions change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const scene = document.createElement('canvas');
    scene.width = width;
    scene.height = height;
    const ctx = scene.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#14141a';
    ctx.fillRect(0, 0, width, height);

    if (noteEvents.length === 0) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generate a composition to see visualization', width / 2, height / 2);
      sceneRef.current = scene;
      maxTimeRef.current = 0;
      paintFrame();
      return;
    }

    // Calculate ranges
    const maxTime = Math.max(...noteEvents.map((e) => e.start + e.duration));
    const minMidi = Math.min(...noteEvents.map((e) => noteNameToMidi(e.note)));
    const maxMidi = Math.max(...noteEvents.map((e) => noteNameToMidi(e.note)));
    const midiRange = maxMidi - minMidi || 1;

    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw note events
    noteEvents.forEach((event) => {
      const midi = noteNameToMidi(event.note);
      const x = padding + (event.start / maxTime) * graphWidth;
      const y = height - padding - ((midi - minMidi) / midiRange) * graphHeight;
      const w = (event.duration / maxTime) * graphWidth;
      const h = 8;

      const alpha = 0.5 + event.velocity * 0.5;
      ctx.fillStyle = `rgba(14, 165, 233, ${alpha})`; // primary-600

      ctx.fillRect(x, y - h / 2, Math.max(w, 2), h);

      if (event.pan !== undefined && event.pan !== 0) {
        ctx.fillStyle = event.pan > 0 ? '#a855f7' : '#22c55e';
        ctx.beginPath();
        ctx.arc(x + w / 2, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw axes labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0s', padding, height - 10);
    ctx.fillText(`${maxTime.toFixed(1)}s`, width - padding, height - 10);
    ctx.textAlign = 'right';
    ctx.fillText('High', padding - 10, padding + 10);
    ctx.fillText('Low', padding - 10, height - padding);

    sceneRef.current = scene;
    maxTimeRef.current = maxTime;
    paintFrame();
  }, [noteEvents, width, height, paintFrame]);

  // Cheap per-frame update: just blit the scene and redraw the cursor.
  useEffect(() => {
    paintFrame();
  }, [paintFrame]);

  return (
    <div className="bg-surface-primary rounded-xl p-4">
      <div className="mb-2">
        <h3 className="font-medium">Timeline Visualizer</h3>
        <p className="text-xs text-gray-400">
          Pitch (low to high) vs Time. Color intensity = velocity. Green/Purple dots = panning.
        </p>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
