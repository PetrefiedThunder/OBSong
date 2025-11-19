# @toposonics/core-audio

Audio mapping utilities for converting image features to musical events.

## Purpose

This package transforms `ImageAnalysisResult` objects (from `@toposonics/core-image`) into arrays of `NoteEvent` objects that can be rendered by any audio engine.

## Features

- **Multiple mapping modes**: LINEAR_LANDSCAPE, DEPTH_RIDGE (partial)
- **Musical scales**: Major, Minor, Pentatonic, Blues, Modal scales
- **All 12 keys**: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- **Effect mapping**: Panning, reverb, filter cutoff based on image features
- **Built-in presets**: 6 sound presets optimized for different image types

## Installation

```bash
pnpm add @toposonics/core-audio
```

## Usage

### Basic Linear Landscape Mapping

```typescript
import { mapLinearLandscape, getScaleNotes } from '@toposonics/core-audio';
import type { ImageAnalysisResult } from '@toposonics/types';

const analysis: ImageAnalysisResult = {
  width: 800,
  height: 600,
  brightnessProfile: [/* ... */],
  depthProfile: [/* ... */],
};

const noteEvents = mapLinearLandscape(analysis, {
  key: 'C',
  scale: 'C_MAJOR',
  maxNotes: 64,
  noteDurationBeats: 0.5,
  enablePanning: true,
  enableVelocityVariation: true,
});

console.log(noteEvents);
// [
//   { note: 'C4', start: 0, duration: 0.5, velocity: 0.7, pan: -1, ... },
//   { note: 'E4', start: 0.5, duration: 0.5, velocity: 0.8, pan: -0.9, ... },
//   ...
// ]
```

### Working with Scales

```typescript
import { getScaleNotes, brightnessToScaleIndex } from '@toposonics/core-audio';

// Get notes in C Major scale across 3 octaves
const notes = getScaleNotes('C', 'C_MAJOR', 3, 3);
// ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', ...]

// Map a brightness value to a scale degree
const brightness = 180; // 0-255
const scaleIndex = brightnessToScaleIndex(brightness, notes.length);
const note = notes[scaleIndex]; // e.g., 'G4'
```

### Using Sound Presets

```typescript
import { SOUND_PRESETS, getPresetById } from '@toposonics/core-audio';

// Get all presets
console.log(SOUND_PRESETS);
// [
//   { id: 'sine-soft', name: 'Soft Sine', oscillatorType: 'sine', ... },
//   { id: 'triangle-warm', name: 'Warm Triangle', ... },
//   ...
// ]

// Get a specific preset
const preset = getPresetById('sawtooth-rich');
console.log(preset.synthesis.envelope);
// { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.6 }
```

### Depth-Ridge Mapping (Advanced)

```typescript
import { mapDepthRidge } from '@toposonics/core-audio';

// Requires ridgeStrength in analysis result
const noteEvents = mapDepthRidge(analysis, {
  key: 'A',
  scale: 'A_MINOR_PENTATONIC',
  maxNotes: 48,
  noteDurationBeats: 0.75,
  ridgeThreshold: 0.5, // Only create notes at strong ridges
  depthToReverb: true, // Map depth to reverb amount
});
```

## API Reference

### Mapping Functions

#### `mapLinearLandscape(analysis, options)`

Maps brightness horizontally to pitch over time.

**Options:**
- `key`: KeyType - Root note
- `scale`: ScaleType - Scale to use
- `maxNotes?`: number - Maximum notes to generate (default: 64)
- `noteDurationBeats?`: number - Duration per note (default: 0.5)
- `enablePanning?`: boolean - Apply stereo panning (default: true)
- `enableVelocityVariation?`: boolean - Vary velocity by brightness (default: true)

**Returns:** `NoteEvent[]`

#### `mapDepthRidge(analysis, options)`

Maps image features with ridge detection (partially implemented).

**Additional Options:**
- `ridgeThreshold?`: number - Minimum ridge strength (0-1, default: 0.5)
- `depthToReverb?`: boolean - Map depth to reverb (default: true)

### Scale Functions

- `getScaleNotes(key, scale, octaves?, startOctave?)` - Generate scale note array
- `brightnessToScaleIndex(brightness, scaleLength)` - Map 0-255 to scale index
- `noteNameToMidi(noteName)` - Convert "C4" to MIDI number
- `midiToNoteName(midiNumber)` - Convert MIDI number to "C4"
- `noteToFrequency(noteName)` - Get frequency in Hz

### Preset Functions

- `getAllPresets()` - Get all sound presets
- `getPresetById(id)` - Get specific preset
- `getDefaultPreset()` - Get default preset

### Utility Functions

- `quantizeNotes(notes, gridSize)` - Snap timings to grid
- `scaleVelocity(notes, scale)` - Multiply all velocities
- `transposeNotes(notes, semitones)` - Transpose all notes (TODO)

## Supported Scales

- `C_MAJOR` - Major scale (happy, bright)
- `C_MINOR` / `A_MINOR` - Natural minor (somber, serious)
- `C_PENTATONIC` - Major pentatonic (simple, folk)
- `A_MINOR_PENTATONIC` - Minor pentatonic (blues, rock)
- `C_BLUES` - Blues scale (expressive, soulful)
- `D_DORIAN` - Dorian mode (jazzy, sophisticated)
- `E_PHRYGIAN` - Phrygian mode (exotic, Spanish)

## Supported Keys

All 12 chromatic notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B

## Built-in Presets

1. **Soft Sine** - Gentle, pure tone for landscapes
2. **Warm Triangle** - Mellow with subtle harmonics
3. **Bright Square** - Digital sound for urban scenes
4. **Rich Sawtooth** - Harmonic richness for mountains
5. **Ambient Pad** - Long, sustained textures
6. **Plucked** - Short, rhythmic notes

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## Future Enhancements

- Complete DEPTH_RIDGE implementation
- Harmonic layering (chords)
- Rhythmic variation
- Polyphonic textures
- MIDI export
- Custom scale definitions
