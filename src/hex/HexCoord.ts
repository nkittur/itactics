/** Axial coordinate -- the canonical storage format. */
export interface AxialCoord {
  readonly q: number;
  readonly r: number;
}

/** Cube coordinate -- used for algorithms. Always satisfies q + r + s === 0. */
export interface CubeCoord {
  readonly q: number;
  readonly r: number;
  readonly s: number;
}

/** Convert axial to cube. */
export function axialToCube(a: AxialCoord): CubeCoord {
  return { q: a.q, r: a.r, s: -a.q - a.r };
}

/** Convert cube to axial (drop s). */
export function cubeToAxial(c: CubeCoord): AxialCoord {
  return { q: c.q, r: c.r };
}

/**
 * Produce a stable string key for use in Map/Set.
 * Format: "q,r" -- compact, fast to parse.
 */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}
