'use client';

import { Button } from '@toposonics/ui';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (tempo: number) => void;
  disabled?: boolean;
}

export function PlaybackControls({
  isPlaying,
  isLoading,
  tempo,
  onPlay,
  onStop,
  onTempoChange,
  disabled = false,
}: PlaybackControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={onPlay}
          disabled={disabled || isPlaying || isLoading}
          loading={isLoading}
          fullWidth
        >
          {isPlaying ? '▶ Playing...' : '▶ Play'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onStop}
          disabled={!isPlaying}
        >
          ⏹ Stop
        </Button>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium">Tempo</label>
          <span className="text-sm text-gray-400">{tempo} BPM</span>
        </div>
        <input
          type="range"
          min="60"
          max="180"
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
      </div>
    </div>
  );
}
