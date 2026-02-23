import { describe, it, expect } from "vitest";
import { hexLineDraw, hasLineOfSight } from "@hex/HexLineOfSight";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";
import { hexDistance } from "@hex/HexMath";

function makeTile(q: number, r: number, blocksLoS = false, elevation = 0): HexTile {
  return {
    q,
    r,
    elevation,
    terrain: TerrainType.Grass,
    occupant: null,
    blocksLoS,
    movementCost: 1,
    defenseBonusMelee: 0,
    defenseBonusRanged: 0,
  };
}

function makeGrid(width: number, height: number): HexGrid {
  const grid = new HexGrid();
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      grid.set(q, r, makeTile(q, r));
    }
  }
  return grid;
}

describe("hexLineDraw", () => {
  it("returns single hex for same start and end", () => {
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 0, r: 0 });
    expect(line).toHaveLength(1);
    expect(line[0]).toEqual({ q: 0, r: 0 });
  });

  it("returns correct number of hexes", () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: 0 };
    const line = hexLineDraw(a, b);
    expect(line).toHaveLength(hexDistance(a, b) + 1);
  });

  it("starts at source and ends at target", () => {
    const a = { q: 1, r: 1 };
    const b = { q: 4, r: 2 };
    const line = hexLineDraw(a, b);
    expect(line[0]).toEqual(a);
    expect(line[line.length - 1]).toEqual(b);
  });

  it("consecutive hexes are adjacent", () => {
    const line = hexLineDraw({ q: 0, r: 0 }, { q: 3, r: 3 });
    for (let i = 1; i < line.length; i++) {
      const dist = hexDistance(line[i - 1]!, line[i]!);
      expect(dist).toBe(1);
    }
  });
});

describe("hasLineOfSight", () => {
  it("clear line on open terrain", () => {
    const grid = makeGrid(10, 10);
    expect(hasLineOfSight(grid, { q: 0, r: 0 }, { q: 5, r: 0 })).toBe(true);
  });

  it("blocked by LoS-blocking tile", () => {
    const grid = makeGrid(10, 10);
    // Place a blocking tile in the middle
    grid.set(2, 0, makeTile(2, 0, true));

    expect(hasLineOfSight(grid, { q: 0, r: 0 }, { q: 4, r: 0 })).toBe(false);
  });

  it("blocking tile at source or target does not block", () => {
    const grid = makeGrid(10, 10);
    // Source and target are blocking but should not affect their own LoS
    grid.set(0, 0, makeTile(0, 0, true));
    grid.set(3, 0, makeTile(3, 0, true));

    expect(hasLineOfSight(grid, { q: 0, r: 0 }, { q: 3, r: 0 })).toBe(true);
  });

  it("adjacent hexes always have LoS", () => {
    const grid = makeGrid(10, 10);
    expect(hasLineOfSight(grid, { q: 2, r: 2 }, { q: 3, r: 2 })).toBe(true);
  });

  it("elevation allows seeing over lower blockers", () => {
    const grid = makeGrid(10, 10);
    // Blocker at elevation 0
    grid.set(2, 0, makeTile(2, 0, true, 0));
    // Source and target at elevation 1
    grid.set(0, 0, makeTile(0, 0, false, 1));
    grid.set(4, 0, makeTile(4, 0, false, 1));

    // High ground should see over low blockers
    expect(hasLineOfSight(grid, { q: 0, r: 0 }, { q: 4, r: 0 })).toBe(true);
  });
});
