import { describe, expect, it } from 'vitest';
import { computePlaybackRate } from '../playbackRate';

/** Standard 12-TET frequency for a MIDI note number (A4 = 69 = 440 Hz). */
const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

describe('computePlaybackRate', () => {
  it('maps A4 (440 Hz) to a playback rate of 1', () => {
    expect(computePlaybackRate(440)).toBeCloseTo(1, 10);
  });

  it('maps all 12 semitones of octave 2 to distinct in-range rates', () => {
    // The old flat clamp collapsed everything below 220 Hz to rate 0.5, so C2..B2 were
    // all the same pitch. Octave folding must keep each pitch class distinct.
    const rates = [];
    for (let midi = 36; midi <= 47; midi++) {
      rates.push(computePlaybackRate(midiToFrequency(midi)));
    }
    for (const rate of rates) {
      expect(rate).toBeGreaterThanOrEqual(0.5);
      expect(rate).toBeLessThanOrEqual(2.5);
    }
    expect(new Set(rates).size).toBe(12);
  });

  it('preserves pitch class by octave-folding (C2 and C3 share a rate)', () => {
    expect(computePlaybackRate(65.41)).toBeCloseTo(computePlaybackRate(130.81), 3);
  });

  it('stays within [0.5, 2.5] for MIDI 24 through 96', () => {
    for (let midi = 24; midi <= 96; midi++) {
      const rate = computePlaybackRate(midiToFrequency(midi));
      expect(rate).toBeGreaterThanOrEqual(0.5);
      expect(rate).toBeLessThanOrEqual(2.5);
    }
  });

  it('returns 1 for non-finite or non-positive input', () => {
    expect(computePlaybackRate(0)).toBe(1);
    expect(computePlaybackRate(-440)).toBe(1);
    expect(computePlaybackRate(Number.NaN)).toBe(1);
    expect(computePlaybackRate(Number.POSITIVE_INFINITY)).toBe(1);
    expect(computePlaybackRate(440, 0)).toBe(1);
    expect(computePlaybackRate(440, Number.NaN)).toBe(1);
  });
});
