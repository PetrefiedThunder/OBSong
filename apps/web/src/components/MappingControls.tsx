'use client';

import { useId } from 'react';
import type { KeyType, ScaleType, MappingMode, TopoPreset } from '@toposonics/types';
import { getAllPresets, getAllTopoPresets } from '@toposonics/core-audio';

interface MappingControlsProps {
  key: KeyType;
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

function handleRadioKeyDown<T extends string>(
  event: React.KeyboardEvent<HTMLButtonElement>,
  values: T[],
  selectedValue: T,
  onChange: (value: T) => void,
) {
  const selectedIndex = values.indexOf(selectedValue);
  let nextIndex = selectedIndex;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (selectedIndex + 1) % values.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (selectedIndex - 1 + values.length) % values.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = values.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  onChange(values[nextIndex]);
  const radioButtons = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [],
  );
  radioButtons[nextIndex]?.focus();
}

export function MappingControls({
  key,
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
  const musicalPresetId = useId();
  const mappingModeId = useId();
  const keyId = useId();
  const scaleId = useId();
  const soundPresetId = useId();
  const presets = getAllPresets();
  const topoPresets = getAllTopoPresets();
  const mappingModeValues = MAPPING_MODES.map((mode) => mode.value);

  return (
    <div className="space-y-6">
      {/* TopoSonics Preset */}
      <div>
        <label htmlFor={musicalPresetId} className="block text-sm font-medium mb-2">
          Musical Preset
        </label>
        <select
          id={musicalPresetId}
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
      <fieldset>
        <legend id={mappingModeId} className="block text-sm font-medium mb-2">
          Mapping Mode
        </legend>
        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-labelledby={mappingModeId}>
          {MAPPING_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={mappingMode === mode.value}
              tabIndex={mappingMode === mode.value ? 0 : -1}
              onClick={() => onMappingModeChange(mode.value)}
              onKeyDown={(event) =>
                handleRadioKeyDown(
                  event,
                  mappingModeValues,
                  mappingMode,
                  onMappingModeChange,
                )
              }
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
      </fieldset>

      {/* Musical Key */}
      <fieldset>
        <legend id={keyId} className="block text-sm font-medium mb-2">
          Key
        </legend>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-labelledby={keyId}>
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={key === k}
              tabIndex={key === k ? 0 : -1}
              onClick={() => onKeyChange(k)}
              onKeyDown={(event) => handleRadioKeyDown(event, KEYS, key, onKeyChange)}
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
      </fieldset>

      {/* Scale */}
      <div>
        <label htmlFor={scaleId} className="block text-sm font-medium mb-2">
          Scale
        </label>
        <select
          id={scaleId}
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
