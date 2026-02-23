/**
 * Clamp a value to the range [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation from `a` to `b` by factor `t`.
 * When t=0 returns a, when t=1 returns b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
