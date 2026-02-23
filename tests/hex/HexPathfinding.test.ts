import { describe, it, expect } from "vitest";
import { findPath, reachableHexes } from "@hex/HexPathfinding";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";

function makeTile(q: number, r: number, terrain = TerrainType.Grass, elevation = 0): HexTile {
  return {
    q,
    r,
    elevation,
    terrain,
    occupant: null,
    blocksLoS: false,
    movementCost: terrain === TerrainType.Forest ? 2 : terrain === TerrainType.Swamp ? 3 : 1,
    defenseBonusMelee: 0,
    defenseBonusRanged: 0,
  };
}

function makeGrid(width: number, height: number, terrain = TerrainType.Grass): HexGrid {
  const grid = new HexGrid();
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      grid.set(q, r, makeTile(q, r, terrain));
    }
  }
  return grid;
}

describe("findPath", () => {
  it("finds a straight path on open terrain", () => {
    const grid = makeGrid(10, 10);
    const result = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(result.found).toBe(true);
    expect(result.cost).toBe(3);
    expect(result.path).toHaveLength(3);
    expect(result.path[result.path.length - 1]).toEqual({ q: 3, r: 0 });
  });

  it("returns not found when goal is off grid", () => {
    const grid = makeGrid(5, 5);
    const result = findPath(grid, { q: 0, r: 0 }, { q: 10, r: 10 });
    expect(result.found).toBe(false);
  });

  it("paths around obstacles", () => {
    const grid = makeGrid(5, 5);
    // Block the direct path with water
    grid.set(1, 0, makeTile(1, 0, TerrainType.Water));
    grid.set(2, 0, makeTile(2, 0, TerrainType.Water));

    const result = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(result.found).toBe(true);
    expect(result.cost).toBeGreaterThan(3); // longer path around
  });

  it("respects maxCost budget", () => {
    const grid = makeGrid(10, 10);
    const result = findPath(grid, { q: 0, r: 0 }, { q: 8, r: 0 }, 3);
    expect(result.found).toBe(false); // too far for budget
  });

  it("accounts for terrain movement cost", () => {
    const grid = makeGrid(5, 5);
    // Forest costs 2
    grid.set(1, 0, makeTile(1, 0, TerrainType.Forest));
    grid.set(2, 0, makeTile(2, 0, TerrainType.Forest));

    const result = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(result.found).toBe(true);
    // Path goes through forest (cost 2 each) or around them
    // Either way, cost should be > 3 (the straight-line grass distance)
    expect(result.cost).toBeGreaterThan(3);
  });

  it("avoids occupied tiles", () => {
    const grid = makeGrid(5, 5);
    const blockedTile = grid.get(1, 0)!;
    blockedTile.occupant = "enemy1";

    const result = findPath(grid, { q: 0, r: 0 }, { q: 2, r: 0 });
    expect(result.found).toBe(true);
    // Should go around the occupied tile
    const pathKeys = result.path.map((p) => `${p.q},${p.r}`);
    expect(pathKeys).not.toContain("1,0");
  });
});

describe("reachableHexes", () => {
  it("returns start hex at cost 0", () => {
    const grid = makeGrid(5, 5);
    const reachable = reachableHexes(grid, { q: 2, r: 2 }, 2);
    expect(reachable.get("2,2")).toBe(0);
  });

  it("returns correct number of hexes for budget 1", () => {
    const grid = makeGrid(5, 5);
    const reachable = reachableHexes(grid, { q: 2, r: 2 }, 1);
    // Center + up to 6 neighbors (some might be off-grid but 2,2 is well inside)
    expect(reachable.size).toBe(7); // center + 6 neighbors
  });

  it("respects terrain costs", () => {
    const grid = makeGrid(5, 5);
    // Surround center with forest (cost 2)
    grid.set(3, 2, makeTile(3, 2, TerrainType.Forest));
    grid.set(2, 3, makeTile(2, 3, TerrainType.Forest));

    const reachable = reachableHexes(grid, { q: 2, r: 2 }, 1);
    // Forest tiles cost 2, so they shouldn't be reachable with budget 1
    expect(reachable.has("3,2")).toBe(false);
    expect(reachable.has("2,3")).toBe(false);
  });

  it("does not include impassable tiles", () => {
    const grid = makeGrid(5, 5);
    grid.set(3, 2, makeTile(3, 2, TerrainType.Water));

    const reachable = reachableHexes(grid, { q: 2, r: 2 }, 5);
    expect(reachable.has("3,2")).toBe(false);
  });
});
