'use client';

import { useId } from 'react';
import type { KeyType, ScaleType, MappingMode, TopoPreset } from '@toposonics/types';
import { getAllPresets, getAllTopoPresets } from '@toposonics/core-audio';

interface MappingControlsProps {
  musicalKey: KeyType;
  scale: ScaleType;
  mappingMode: MappingMode;
  presetId: string;
  selectedTopoPreset: TopoPreset | null;
  onKeyChange: (key: KeyType) => void;
  onScaleChange: (scale: ScaleType) => void;
  onMappingModeChange: (mode: MappingMode) => void;
  onPresetChange: (presetId: string) => void;
  onTopoPresetChange: (preset: TopoPreset | null) => void;
}

const KEYS: KeyType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// One option per distinct scale *quality*. The root note is chosen separately via `key`,
// so the legacy root-prefixed ScaleType values that share an interval pattern (e.g.
// C_MAJOR/D_MAJOR/G_MAJOR) collapse to a single canonical entry here.
const SCALES: { value: ScaleType; label: string }[] = [
  { value: 'C_MAJOR', label: 'Major' },
  { value: 'C_MINOR', label: 'Natural Minor' },
  { value: 'A_HARMONIC_MINOR', label: 'Harmonic Minor' },
  { value: 'C_PENTATONIC', label: 'Pentatonic Major' },
  { value: 'A_MINOR_PENTATONIC', label: 'Pentatonic Minor' },
  { value: 'C_BLUES', label: 'Blues' },
  { value: 'D_DORIAN', label: 'Dorian' },
  { value: 'C_MIXOLYDIAN', label: 'Mixolydian' },
  { value: 'E_PHRYGIAN', label: 'Phrygian' },
  { value: 'C_LYDIAN', label: 'Lydian' },
  { value: 'C_WHOLE_TONE', label: 'Whole Tone' },
];

// Scene packs may set a root-prefixed alias whose interval pattern matches a canonical
// option above. Normalize those to the canonical value so the <select> never renders blank
// (an unmatched value shows no selection). Unlisted values map to themselves.
const SCALE_ALIASES: Partial<Record<ScaleType, ScaleType>> = {
  D_MAJOR: 'C_MAJOR',
  G_MAJOR: 'C_MAJOR',
  E_MINOR: 'C_MINOR',
  A_MINOR: 'C_MINOR',
  A_SHARP_MINOR: 'C_MINOR',
  A_DORIAN: 'D_DORIAN',
};

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
  musicalKey,
  scale,
  mappingMode,
  presetId,
  selectedTopoPreset,
  onKeyChange,
  onScaleChange,
  onMappingModeChange,
  onPresetChange,
  onTopoPresetChange,
}: MappingControlsProps) {
  const presets = getAllPresets();
  const topoPresets = getAllTopoPresets();
  const topoPresetId = useId();
  const mappingModeId = useId();
  const keyGroupId = useId();
  const scaleId = useId();
  const soundPresetId = useId();

  return (
    <div className="space-y-6">
      {/* TopoSonics Preset */}
      <div>
        <label htmlFor={topoPresetId} className="block text-sm font-medium mb-2">
          Musical Preset
        </label>
        <select
          id={topoPresetId}
          value={selectedTopoPreset?.id || ''}
          onChange={(e) => {
            const preset = e.target.value
              ? topoPresets.find((p) => p.id === e.target.value) || null
              : null;
            onTopoPresetChange(preset);
          }}
          className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Custom (No Preset)</option>
          {topoPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        {selectedTopoPreset && (
          <p className="text-xs text-gray-400 mt-2">{selectedTopoPreset.description}</p>
        )}
      </div>

      {/* Mapping Mode */}
      <div>
        <span id={mappingModeId} className="block text-sm font-medium mb-2">
          Mapping Mode
        </span>
        <div className="grid grid-cols-1 gap-2" role="group" aria-labelledby={mappingModeId}>
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
        <span id={keyGroupId} className="block text-sm font-medium mb-2">
          Key
        </span>
        <div className="grid grid-cols-6 gap-2" role="group" aria-labelledby={keyGroupId}>
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => onKeyChange(k)}
              className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                musicalKey === k
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
        <label htmlFor={scaleId} className="block text-sm font-medium mb-2">
          Scale
        </label>
        <select
          id={scaleId}
          value={SCALE_ALIASES[scale] ?? scale}
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
        <label htmlFor={soundPresetId} className="block text-sm font-medium mb-2">
          Sound Preset
        </label>
        <select
          id={soundPresetId}
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
