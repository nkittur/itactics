import { describe, it, expect } from "vitest";
import { hexDistance, hexNeighbors, hexRing, hexSpiral, HEX_DIRECTIONS } from "@hex/HexMath";
import type { AxialCoord } from "@hex/HexCoord";

describe("hexDistance", () => {
  it("returns 0 for same hex", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });

  it("returns 1 for adjacent hexes", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
  });

  it("returns correct distance for far hexes", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 2 })).toBe(4);
    expect(hexDistance({ q: -2, r: 3 }, { q: 2, r: -1 })).toBe(4);
  });

  it("is symmetric", () => {
    const a: AxialCoord = { q: 3, r: -2 };
    const b: AxialCoord = { q: -1, r: 4 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });
});

describe("hexNeighbors", () => {
  it("returns exactly 6 neighbors", () => {
    const neighbors = hexNeighbors(0, 0);
    expect(neighbors).toHaveLength(6);
  });

  it("all neighbors are distance 1 from center", () => {
    const center: AxialCoord = { q: 3, r: 2 };
    const neighbors = hexNeighbors(center.q, center.r);
    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }
  });

  it("contains expected directions", () => {
    const neighbors = hexNeighbors(0, 0);
    const keys = neighbors.map((n) => `${n.q},${n.r}`);
    expect(keys).toContain("1,0"); // east
    expect(keys).toContain("-1,0"); // west
    expect(keys).toContain("0,1"); // southeast
    expect(keys).toContain("0,-1"); // northwest
  });
});

describe("hexRing", () => {
  it("radius 0 returns only center", () => {
    const ring = hexRing({ q: 0, r: 0 }, 0);
    expect(ring).toHaveLength(1);
    expect(ring[0]).toEqual({ q: 0, r: 0 });
  });

  it("radius 1 returns 6 hexes", () => {
    const ring = hexRing({ q: 0, r: 0 }, 1);
    expect(ring).toHaveLength(6);
    for (const hex of ring) {
      expect(hexDistance({ q: 0, r: 0 }, hex)).toBe(1);
    }
  });

  it("radius 2 returns 12 hexes", () => {
    const ring = hexRing({ q: 0, r: 0 }, 2);
    expect(ring).toHaveLength(12);
    for (const hex of ring) {
      expect(hexDistance({ q: 0, r: 0 }, hex)).toBe(2);
    }
  });

  it("ring N has 6*N hexes", () => {
    for (let r = 1; r <= 5; r++) {
      const ring = hexRing({ q: 0, r: 0 }, r);
      expect(ring).toHaveLength(6 * r);
    }
  });
});

describe("hexSpiral", () => {
  it("radius 0 returns 1 hex", () => {
    const spiral = hexSpiral({ q: 0, r: 0 }, 0);
    expect(spiral).toHaveLength(1);
  });

  it("radius 1 returns 7 hexes (center + 6)", () => {
    const spiral = hexSpiral({ q: 0, r: 0 }, 1);
    expect(spiral).toHaveLength(7);
  });

  it("radius 2 returns 19 hexes (1 + 6 + 12)", () => {
    const spiral = hexSpiral({ q: 0, r: 0 }, 2);
    expect(spiral).toHaveLength(19);
  });

  it("all hexes within range", () => {
    const center: AxialCoord = { q: 0, r: 0 };
    const spiral = hexSpiral(center, 3);
    for (const hex of spiral) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(3);
    }
  });
});

describe("HEX_DIRECTIONS", () => {
  it("has 6 directions", () => {
    expect(HEX_DIRECTIONS).toHaveLength(6);
  });

  it("each direction is distance 1 from origin", () => {
    for (const dir of HEX_DIRECTIONS) {
      expect(hexDistance({ q: 0, r: 0 }, dir)).toBe(1);
    }
  });
});
