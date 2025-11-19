'use client';

import type { KeyType, ScaleType, MappingMode } from '@toposonics/types';
import { getAllPresets } from '@toposonics/core-audio';

interface MappingControlsProps {
  key: KeyType;
  scale: ScaleType;
  mappingMode: MappingMode;
  presetId: string;
  onKeyChange: (key: KeyType) => void;
  onScaleChange: (scale: ScaleType) => void;
  onMappingModeChange: (mode: MappingMode) => void;
  onPresetChange: (presetId: string) => void;
}

const KEYS: KeyType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALES: { value: ScaleType; label: string }[] = [
  { value: 'C_MAJOR', label: 'Major' },
  { value: 'C_MINOR', label: 'Natural Minor' },
  { value: 'C_PENTATONIC', label: 'Pentatonic Major' },
  { value: 'A_MINOR_PENTATONIC', label: 'Pentatonic Minor' },
  { value: 'C_BLUES', label: 'Blues' },
  { value: 'D_DORIAN', label: 'Dorian' },
  { value: 'E_PHRYGIAN', label: 'Phrygian' },
];

const MAPPING_MODES: { value: MappingMode; label: string; description: string }[] = [
  {
    value: 'LINEAR_LANDSCAPE',
    label: 'Linear Landscape',
    description: 'Maps brightness directly to pitch across time',
  },
  {
    value: 'DEPTH_RIDGE',
    label: 'Depth Ridge',
    description: 'Uses ridge detection and depth (experimental)',
  },
  {
    value: 'MULTI_VOICE',
    label: 'Multi-Voice',
    description: 'Polyphonic composition with bass, melody, and pad layers',
  },
];

export function MappingControls({
  key,
  scale,
  mappingMode,
  presetId,
  onKeyChange,
  onScaleChange,
  onMappingModeChange,
  onPresetChange,
}: MappingControlsProps) {
  const presets = getAllPresets();

  return (
    <div className="space-y-6">
      {/* Mapping Mode */}
      <div>
        <label className="block text-sm font-medium mb-2">Mapping Mode</label>
        <div className="grid grid-cols-1 gap-2">
          {MAPPING_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onMappingModeChange(mode.value)}
              className={`p-3 rounded-lg text-left transition-colors ${
                mappingMode === mode.value
                  ? 'bg-primary-600 border-2 border-primary-500'
                  : 'bg-surface-secondary border-2 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="font-medium">{mode.label}</div>
              <div className="text-xs text-gray-400 mt-1">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Musical Key */}
      <div>
        <label className="block text-sm font-medium mb-2">Key</label>
        <div className="grid grid-cols-6 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => onKeyChange(k)}
              className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                key === k
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-secondary text-gray-300 hover:bg-surface-elevated'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div>
        <label className="block text-sm font-medium mb-2">Scale</label>
        <select
          value={scale}
          onChange={(e) => onScaleChange(e.target.value as ScaleType)}
          className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {SCALES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sound Preset */}
      <div>
        <label className="block text-sm font-medium mb-2">Sound Preset</label>
        <select
          value={presetId}
          onChange={(e) => onPresetChange(e.target.value)}
          className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          {presets.find((p) => p.id === presetId)?.description}
        </p>
      </div>
    </div>
  );
}
