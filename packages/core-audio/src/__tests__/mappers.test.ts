import { mapLinearLandscape, transposeNotes, mapDepthRidge, mapImageToMultiVoiceComposition } from '../mappers';
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
});
