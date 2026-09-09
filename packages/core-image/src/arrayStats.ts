/**
 * Loop-based min/max over numeric arrays.
 *
 * These replace `Math.max(...arr)` / `Math.min(...arr)`, which throw
 * `RangeError: Maximum call stack size exceeded` once the array holds more than
 * ~125k elements — i.e. any real-size image (a 640x480 frame has 307,200 pixels).
 *
 * Empty input returns the identity (−Infinity for max, +Infinity for min); callers
 * that already special-case an all-zero/empty result stay correct because mapping over
 * an empty array yields an empty array.
 */
export function arrayMax(values: ArrayLike<number>): number {
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

export function arrayMin(values: ArrayLike<number>): number {
  let min = Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}
