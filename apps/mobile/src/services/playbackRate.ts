/**
 * Pure playback-rate math for the expo-av beep voice. Kept in its own module (no expo-av
 * or asset imports) so it can be unit-tested in a plain node environment.
 */

export const BASE_FREQUENCY = 440;

/**
 * Convert a note frequency into an expo-av playback rate for the 440 Hz beep sample.
 *
 * expo-av only honors rates in roughly [0.5, 2.5], i.e. 220-1100 Hz. A flat clamp maps
 * every note outside that window to the boundary rate, collapsing e.g. all of C2-G#3 to
 * a single monotone pitch. Instead the ratio is octave-folded into the window first —
 * halving/doubling preserves pitch class — so every out-of-range note lands in a playable
 * octave and stays distinct from its neighbors. The clamp remains only as a safety net.
 */
export function computePlaybackRate(frequency: number, base: number = BASE_FREQUENCY): number {
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(base) || base <= 0) {
    return 1;
  }

  // The ratio itself can still underflow to 0 or overflow to Infinity with finite positive
  // inputs (e.g. MIN_VALUE / MAX_VALUE); either would make the folding loops spin forever.
  const ratio = frequency / base;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }

  let rate = ratio;
  while (rate < 0.5) rate *= 2;
  while (rate > 2.5) rate /= 2;

  return Math.max(0.5, Math.min(2.5, rate));
}
