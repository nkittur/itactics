/**
 * Seeded pseudo-random number generator using the Mulberry32 algorithm.
 * Deterministic: the same seed always produces the same sequence.
 * Suitable for game logic where reproducibility matters (replays, save/load).
 */
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0; // ensure integer
  }

  /**
   * Generate the next random float in [0, 1).
   * Mulberry32: fast, small state, good statistical properties.
   */
  nextFloat(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer in [min, max] (inclusive on both ends).
   */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  /**
   * Roll against a percentage threshold.
   * Returns true if the random value is less than the given percentage (0-100).
   */
  roll(percentage: number): boolean {
    return this.nextFloat() * 100 < percentage;
  }

  /** Return the current internal state for serialization. */
  getState(): number {
    return this.state;
  }

  /** Restore a previously saved state. */
  setState(state: number): void {
    this.state = state | 0;
  }
}
