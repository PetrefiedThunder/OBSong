import { mapLinearLandscape, transposeNotes, mapDepthRidge, mapImageToMultiVoiceComposition, mapHorizonToBass, mapRidgesToMelody, mapTextureToPad } from '../mappers';
import { noteNameToMidi, getScaleNotes } from '../scales';
import { TOPO_PRESETS } from '../topoPresets';
import type { ImageAnalysisResult, LinearLandscapeOptions, NoteEvent, DepthRidgeOptions, MultiVoiceOptions } from '@toposonics/types';

describe('mapLinearLandscape', () => {
  it('should generate a sequence of notes based on brightness', () => {
    const analysis: ImageAnalysisResult = {
      width: 100,
      height: 100,
      brightnessProfile: [0, 64, 128, 192, 255],
      depthProfile: [0, 0.25, 0.5, 0.75, 1],
      ridgeStrength: [],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: LinearLandscapeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      maxNotes: 5,
    };

    const noteEvents = mapLinearLandscape(analysis, options);

    // Check if the correct number of notes are generated
    expect(noteEvents).toHaveLength(5);

    // Check the properties of the first note
    const firstNote = noteEvents[0];
    expect(firstNote.note).toBe('C3'); // Darkest pixel, lowest note
    expect(firstNote.velocity).toBeCloseTo(0.3); // Lowest velocity
    expect(firstNote.pan).toBe(-1); // Farthest left
    expect(firstNote.effects?.reverbSend).toBeCloseTo(0.7); // Farthest away, most reverb
  });

  it('should return an empty array for an empty brightness profile', () => {
    const analysis: ImageAnalysisResult = {
      width: 100,
      height: 100,
      brightnessProfile: [],
      depthProfile: [],
      ridgeStrength: [],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: LinearLandscapeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
    };

    const noteEvents = mapLinearLandscape(analysis, options);
    expect(noteEvents).toEqual([]);
  });

  it('should respect the maxNotes option', () => {
    const analysis: ImageAnalysisResult = {
      width: 100,
      height: 100,
      brightnessProfile: [0, 64, 128, 192, 255, 0, 64, 128, 192, 255],
      depthProfile: [],
      ridgeStrength: [],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: LinearLandscapeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      maxNotes: 5,
    };

    const noteEvents = mapLinearLandscape(analysis, options);
    expect(noteEvents).toHaveLength(5);
  });

  it('should center pan for a single sampled note', () => {
    const analysis: ImageAnalysisResult = {
      width: 1,
      height: 100,
      brightnessProfile: [128],
      depthProfile: [],
      ridgeStrength: [],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: LinearLandscapeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
    };

    const noteEvents = mapLinearLandscape(analysis, options);
    expect(noteEvents).toHaveLength(1);
    expect(noteEvents[0].pan).toBe(0);
  });
});

describe('transposeNotes', () => {
  const baseEvents: NoteEvent[] = [
    { note: 'C4', start: 0, duration: 1, velocity: 0.8 },
    { note: 'E4', start: 1, duration: 1, velocity: 0.8 },
    { note: 'G4', start: 2, duration: 1, velocity: 0.8 },
  ];

  it('should transpose notes up by a given number of semitones', () => {
    const transposed = transposeNotes(baseEvents, 2);
    expect(transposed.map((n) => n.note)).toEqual(['D4', 'F#4', 'A4']);
  });

  it('should transpose notes down by a given number of semitones', () => {
    const transposed = transposeNotes(baseEvents, -2);
    expect(transposed.map((n) => n.note)).toEqual(['A#3', 'D4', 'F4']);
  });

  it('should handle octave changes correctly', () => {
    const transposed = transposeNotes([{ note: 'B4', start: 0, duration: 1, velocity: 1 }], 1);
    expect(transposed[0].note).toBe('C5');
  });
});

describe('mapDepthRidge', () => {
  it('should use depth to control reverb', () => {
    const analysis: ImageAnalysisResult = {
      width: 100,
      height: 100,
      brightnessProfile: [128, 128],
      depthProfile: [0, 1], // Far and near
      ridgeStrength: [0.6, 0.6], // Strong enough to trigger notes
      horizonProfile: [],
      textureProfile: [],
    };

    const options: DepthRidgeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      ridgeThreshold: 0.5,
      depthToReverb: true,
    };

    const noteEvents = mapDepthRidge(analysis, options);

    expect(noteEvents).toHaveLength(2);

    // Far note should have more reverb
    expect(noteEvents[0].effects?.reverbSend).toBeCloseTo(0.7);

    // Near note should have less reverb
    expect(noteEvents[1].effects?.reverbSend).toBeCloseTo(0.2);
  });

  it('should vary rhythm based on ridge spacing', () => {
    const analysis: ImageAnalysisResult = {
      width: 100,
      height: 100,
      brightnessProfile: [128, 128, 128, 128, 128],
      depthProfile: [],
      ridgeStrength: [0.6, 0.2, 0.7, 0.8, 0.3],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: DepthRidgeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      ridgeThreshold: 0.5,
    };

    const noteEvents = mapDepthRidge(analysis, options);

    expect(noteEvents).toHaveLength(3);

    // Check the start times of the notes. The expected values are
    // computed based on the rhythm generation logic in mappers.ts.
    const startTimes = noteEvents.map(n => n.start);
    expect(startTimes[0]).toBe(0);
    expect(startTimes[1]).toBeCloseTo(1.725, 3);
    expect(startTimes[2]).toBeCloseTo(2.525, 3);
  });

  it('should center pan when only one ridge note is generated', () => {
    const analysis: ImageAnalysisResult = {
      width: 1,
      height: 100,
      brightnessProfile: [128],
      depthProfile: [],
      ridgeStrength: [0.8],
      horizonProfile: [],
      textureProfile: [],
    };

    const options: DepthRidgeOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      ridgeThreshold: 0.5,
    };

    const noteEvents = mapDepthRidge(analysis, options);
    expect(noteEvents).toHaveLength(1);
    expect(noteEvents[0].pan).toBe(0);
  });
});

describe('mapImageToMultiVoiceComposition', () => {
  const baseAnalysis: ImageAnalysisResult = {
    width: 10,
    height: 10,
    brightnessProfile: [100, 150],
    ridgeStrength: [0.1, 0.8],
    horizonProfile: [0.2, 0.3],
    textureProfile: [0.9, 0.4],
  };

  it('should combine notes from all enabled voices', () => {
    const options: MultiVoiceOptions = {
      key: 'C',
      scale: 'C_MAJOR',
    };

    const noteEvents = mapImageToMultiVoiceComposition(baseAnalysis, options);

    // Check that notes from all three voices are present
    const trackIds = new Set(noteEvents.map((n) => n.trackId));
    expect(trackIds).toContain('bass');
    expect(trackIds).toContain('melody');
    expect(trackIds).toContain('pad');

    // Check that notes are sorted by start time
    for (let i = 1; i < noteEvents.length; i++) {
      expect(noteEvents[i].start).toBeGreaterThanOrEqual(noteEvents[i - 1].start);
    }
  });

  it('should only include enabled voices', () => {
    const options: MultiVoiceOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      enableBass: true,
      enableMelody: false,
      enablePad: true,
    };

    const noteEvents = mapImageToMultiVoiceComposition(baseAnalysis, options);
    const trackIds = new Set(noteEvents.map((n) => n.trackId));

    expect(trackIds).toContain('bass');
    expect(trackIds).not.toContain('melody');
    expect(trackIds).toContain('pad');
  });

  it('should avoid NaN pan in single-point melody mapping', () => {
    const singlePointAnalysis: ImageAnalysisResult = {
      width: 1,
      height: 10,
      brightnessProfile: [150],
      ridgeStrength: [0.9],
      horizonProfile: [0.2],
      textureProfile: [0.4],
    };
    const options: MultiVoiceOptions = {
      key: 'C',
      scale: 'C_MAJOR',
      enableBass: false,
      enableMelody: true,
      enablePad: false,
    };

    const noteEvents = mapImageToMultiVoiceComposition(singlePointAnalysis, options);
    expect(noteEvents).toHaveLength(1);
    expect(Number.isNaN(noteEvents[0].pan)).toBe(false);
    expect(noteEvents[0].pan).toBe(0);
  });
});

describe('mapHorizonToBass', () => {
  it('produces notes for a sub-C2 preset range (A1-E2) in key A', () => {
    // Previously getScaleNotes hardcoded startOctave=2, so this range filtered to nothing.
    const notes = mapHorizonToBass([0.1, 0.5, 0.9], 'A', 'C_MAJOR', {
      minNote: 'A1',
      maxNote: 'E2',
    });
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      const midi = noteNameToMidi(note.note);
      expect(midi).toBeGreaterThanOrEqual(noteNameToMidi('A1'));
      expect(midi).toBeLessThanOrEqual(noteNameToMidi('E2'));
    }
  });

  it('reaches scale degrees below the key root (key B, C2-C3) instead of a monotone bassline', () => {
    // Previously getScaleNotesForRange started at the key root's octave, so a B root with
    // a C2-C3 range collapsed to the single pitch B2.
    const horizon = Array.from({ length: 16 }, (_, i) => i / 15);
    const notes = mapHorizonToBass(horizon, 'B', 'C_MAJOR', {
      minNote: 'C2',
      maxNote: 'C3',
    });
    expect(notes.length).toBeGreaterThan(0);
    const distinctPitches = new Set(notes.map((n) => n.note));
    expect(distinctPitches.size).toBeGreaterThan(1);
    for (const note of notes) {
      const midi = noteNameToMidi(note.note);
      expect(midi).toBeGreaterThanOrEqual(noteNameToMidi('C2'));
      expect(midi).toBeLessThanOrEqual(noteNameToMidi('C3'));
    }
  });

  it('keeps the default C-root output unchanged (existing-behavior guard)', () => {
    // minNote (C2) IS the key root here, so the extra octave-below headroom must be fully
    // trimmed by filterScaleToRange: same note set, output starting at C2, all in range.
    const notes = mapHorizonToBass([0, 0.5, 1], 'C', 'C_MAJOR', {});
    expect(notes.map((n) => n.note)).toEqual(['C2', 'G2', 'C3']);
  });

  it.each(['foggy-forest', 'industrial-grid'])(
    'produces a non-empty, in-range bass voice for the %s preset (#109)',
    (presetId) => {
      // These presets use sub-C2 bass ranges (A1-E2 and A#1-F2) with non-C roots; the old
      // hardcoded startOctave=2 filtered every candidate out and the bass voice silently
      // disappeared.
      const preset = TOPO_PRESETS.find((p) => p.id === presetId)!;
      expect(preset).toBeDefined();

      const horizon = Array.from({ length: 32 }, (_, i) => i / 31);
      const notes = mapHorizonToBass(horizon, preset.defaultKey, preset.defaultScale, {
        minNote: preset.voices.bass.minNote,
        maxNote: preset.voices.bass.maxNote,
      });

      expect(notes.length).toBeGreaterThan(0);
      const minMidi = noteNameToMidi(preset.voices.bass.minNote);
      const maxMidi = noteNameToMidi(preset.voices.bass.maxNote);
      for (const note of notes) {
        const midi = noteNameToMidi(note.note);
        expect(midi).toBeGreaterThanOrEqual(minMidi);
        expect(midi).toBeLessThanOrEqual(maxMidi);
      }
    }
  );
});

describe('mapRidgesToMelody', () => {
  it('reaches in-range notes below the key root (key G, minNote D3 as in Ocean Horizon)', () => {
    // The Ocean Horizon preset maps melody to D3-G5 in key G; previously the scale notes
    // started at G3, so the in-range degrees D3/E3/F#3 could never be emitted.
    const columns = 32;
    const brightness = Array.from({ length: columns }, (_, i) =>
      Math.round((i / (columns - 1)) * 255)
    );
    const ridges = Array.from({ length: columns }, () => 0.9); // Strong ridge every column

    const notes = mapRidgesToMelody(brightness, ridges, 'G', 'G_MAJOR', {
      minNote: 'D3',
      maxNote: 'G5',
    });

    expect(notes.length).toBeGreaterThan(0);
    const midis = notes.map((n) => noteNameToMidi(n.note));
    for (const midi of midis) {
      expect(midi).toBeGreaterThanOrEqual(noteNameToMidi('D3'));
      expect(midi).toBeLessThanOrEqual(noteNameToMidi('G5'));
    }
    // The darkest columns must now reach below G3 (i.e. D3/E3/F#3 are playable).
    expect(Math.min(...midis)).toBeLessThan(noteNameToMidi('G3'));
  });
});

describe('preset threading and determinism', () => {
  // A richer, fully deterministic fixture with enough columns to exercise every voice.
  const richAnalysis: ImageAnalysisResult = {
    width: 32,
    height: 32,
    brightnessProfile: Array.from({ length: 32 }, (_, i) => (i * 37) % 256),
    ridgeStrength: Array.from({ length: 32 }, (_, i) => ((i * 29) % 100) / 100),
    horizonProfile: Array.from({ length: 32 }, (_, i) => ((i * 13) % 100) / 100),
    textureProfile: Array.from({ length: 32 }, (_, i) => ((i * 17) % 100) / 100),
  };

  const baseOptions: MultiVoiceOptions = { key: 'D', scale: 'D_MAJOR' };

  it('is deterministic: the same input twice produces deep-equal output', () => {
    const preset = TOPO_PRESETS.find((p) => p.id === 'majestic-mountains');
    expect(preset).toBeDefined();

    const first = mapImageToMultiVoiceComposition(richAnalysis, baseOptions, preset);
    const second = mapImageToMultiVoiceComposition(richAnalysis, baseOptions, preset);
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);

    // No-preset path must be deterministic too.
    const third = mapImageToMultiVoiceComposition(richAnalysis, baseOptions);
    const fourth = mapImageToMultiVoiceComposition(richAnalysis, baseOptions);
    expect(fourth).toEqual(third);
  });

  it('mapTextureToPad uses a deterministic chord-index pan (no randomness)', () => {
    const texture = richAnalysis.textureProfile!;
    const first = mapTextureToPad(texture, 'C', 'C_MAJOR', {});
    const second = mapTextureToPad(texture, 'C', 'C_MAJOR', {});
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);

    // Pan stays within the default stereoSpread (0.4) window.
    for (const note of first) {
      expect(Math.abs(note.pan ?? 0)).toBeLessThanOrEqual(0.2);
    }
  });

  it('mapTextureToPad normalizes pathological segment counts without hanging', () => {
    const texture = richAnalysis.textureProfile!;
    // Non-finite falls back to the default (6); the result matches an unset segments option.
    const infinite = mapTextureToPad(texture, 'C', 'C_MAJOR', { segments: Infinity });
    const defaulted = mapTextureToPad(texture, 'C', 'C_MAJOR', {});
    expect(infinite).toEqual(defaulted);

    // Zero / negative / fractional are clamped to a valid positive integer and still return.
    for (const segments of [0, -5, 3.7]) {
      const notes = mapTextureToPad(texture, 'C', 'C_MAJOR', { segments });
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
    }
  });

  it('two different TOPO_PRESETS produce different multi-voice output', () => {
    const mountains = TOPO_PRESETS.find((p) => p.id === 'majestic-mountains');
    const industrial = TOPO_PRESETS.find((p) => p.id === 'industrial-grid');
    expect(mountains).toBeDefined();
    expect(industrial).toBeDefined();

    const a = mapImageToMultiVoiceComposition(richAnalysis, baseOptions, mountains);
    const b = mapImageToMultiVoiceComposition(richAnalysis, baseOptions, industrial);

    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a).not.toEqual(b);
  });

  it('keeps pad notes within the preset pad range', () => {
    const preset = TOPO_PRESETS.find((p) => p.id === 'majestic-mountains')!;
    const notes = mapImageToMultiVoiceComposition(richAnalysis, baseOptions, preset);
    const padNotes = notes.filter((n) => n.trackId === 'pad');

    expect(padNotes.length).toBeGreaterThan(0);
    const minMidi = noteNameToMidi(preset.voices.pad.minNote);
    const maxMidi = noteNameToMidi(preset.voices.pad.maxNote);
    for (const note of padNotes) {
      const midi = noteNameToMidi(note.note);
      expect(midi).toBeGreaterThanOrEqual(minMidi);
      expect(midi).toBeLessThanOrEqual(maxMidi);
    }
  });

  it('keeps caller-supplied options over preset values', () => {
    const preset = TOPO_PRESETS.find((p) => p.id === 'majestic-mountains')!;
    const notes = mapImageToMultiVoiceComposition(
      richAnalysis,
      { ...baseOptions, padOptions: { minNote: 'C4', maxNote: 'C5' } },
      preset
    );
    const padNotes = notes.filter((n) => n.trackId === 'pad');

    expect(padNotes.length).toBeGreaterThan(0);
    for (const note of padNotes) {
      const midi = noteNameToMidi(note.note);
      expect(midi).toBeGreaterThanOrEqual(noteNameToMidi('C4'));
      expect(midi).toBeLessThanOrEqual(noteNameToMidi('C5'));
    }
  });

  it('produces identical no-preset output regardless of the new optional fields', () => {
    // Explicitly passing the documented defaults must match passing nothing.
    const texture = richAnalysis.textureProfile!;
    const implicit = mapTextureToPad(texture, 'C', 'C_MAJOR', {});
    const explicit = mapTextureToPad(texture, 'C', 'C_MAJOR', {
      minNote: 'C3',
      maxNote: 'C5',
      segments: 6,
      noteDuration: 6,
      velocityMin: 0.4,
      velocityMax: 0.7,
      reverbSend: 0.5,
      filterBrightness: 0.5,
      stereoSpread: 0.4,
    });
    expect(explicit).toEqual(implicit);
  });
});

describe('new scales', () => {
  it('generates correct harmonic minor notes (A_HARMONIC_MINOR)', () => {
    expect(getScaleNotes('A', 'A_HARMONIC_MINOR', 1, 3)).toEqual([
      'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4',
    ]);
  });

  it('generates correct lydian notes (C_LYDIAN)', () => {
    expect(getScaleNotes('C', 'C_LYDIAN', 1, 4)).toEqual([
      'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4',
    ]);
  });

  it('generates correct whole tone notes (C_WHOLE_TONE)', () => {
    expect(getScaleNotes('C', 'C_WHOLE_TONE', 1, 4)).toEqual([
      'C4', 'D4', 'E4', 'F#4', 'G#4', 'A#4',
    ]);
    // Whole tone transposes cleanly to other keys as well.
    expect(getScaleNotes('G', 'C_WHOLE_TONE', 1, 3)).toEqual([
      'G3', 'A3', 'B3', 'C#4', 'D#4', 'F4',
    ]);
  });
});

describe('noteNameToMidi', () => {
  it('rejects non-existent accidentals like E# and B#', () => {
    expect(() => noteNameToMidi('E#4')).toThrow();
    expect(() => noteNameToMidi('B#3')).toThrow();
  });

  it('round-trips negative octaves (C-1 => MIDI 0)', () => {
    expect(noteNameToMidi('C-1')).toBe(0);
  });
});
