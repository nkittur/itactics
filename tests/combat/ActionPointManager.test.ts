import { describe, it, expect } from "vitest";
import {
  ActionPointManager,
  MAX_AP,
  tileAPCost,
  tileFatigueCost,
  pathAPCost,
  pathStaminaCost,
} from "@combat/ActionPointManager";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";

function makeTile(overrides: Partial<HexTile> & { q: number; r: number }): HexTile {
  return {
    terrain: TerrainType.Grass,
    elevation: 0,
    occupant: null,
    blocksLoS: false,
    movementCost: 1,
    defenseBonusMelee: 0,
    defenseBonusRanged: 0,
    ...overrides,
  };
}

function createTestGrid(): HexGrid {
  const grid = new HexGrid();
  for (let q = 0; q < 10; q++) {
    for (let r = 0; r < 10; r++) {
      grid.set(q, r, makeTile({ q, r }));
    }
  }
  return grid;
}

describe("ActionPointManager", () => {
  it("starts with MAX_AP", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    expect(apm.remaining).toBe(MAX_AP);
    expect(apm.remaining).toBe(9);
  });

  it("spend reduces remaining AP", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    expect(apm.spend(4)).toBe(true);
    expect(apm.remaining).toBe(5);
  });

  it("canAfford returns false when insufficient AP", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    expect(apm.canAfford(10)).toBe(false);
    expect(apm.canAfford(9)).toBe(true);
  });

  it("spend returns false when insufficient AP", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    apm.spend(7);
    expect(apm.spend(3)).toBe(false);
    expect(apm.remaining).toBe(2); // unchanged
  });

  it("resetForTurn restores full AP", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    apm.spend(5);
    apm.resetForTurn();
    expect(apm.remaining).toBe(MAX_AP);
  });

  it("spend with negative value refunds AP (undo)", () => {
    const apm = new ActionPointManager();
    apm.resetForTurn();
    apm.spend(4);
    expect(apm.remaining).toBe(5);
    apm.spend(-4); // refund
    expect(apm.remaining).toBe(9);
  });
});

describe("tileAPCost", () => {
  const grid = createTestGrid();

  it("flat terrain costs 2 AP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass });
    expect(tileAPCost(grid, from, to)).toBe(2);
  });

  it("road costs 2 AP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Road });
    expect(tileAPCost(grid, from, to)).toBe(2);
  });

  it("forest costs 3 AP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Forest });
    expect(tileAPCost(grid, from, to)).toBe(3);
  });

  it("swamp costs 4 AP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Swamp });
    expect(tileAPCost(grid, from, to)).toBe(4);
  });

  it("uphill adds +1 AP per level", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 1 });
    expect(tileAPCost(grid, from, to)).toBe(3); // 2 base + 1 uphill
  });

  it("downhill doesn't add extra AP", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 1 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 0 });
    expect(tileAPCost(grid, from, to)).toBe(2);
  });

  it("water is impassable", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Water });
    expect(tileAPCost(grid, from, to)).toBe(Infinity);
  });

  it("occupied tile is impassable", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, occupant: "e0" });
    expect(tileAPCost(grid, from, to)).toBe(Infinity);
  });
});

describe("tileFatigueCost", () => {
  const grid = createTestGrid();

  it("flat terrain costs 4 fatigue", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass });
    expect(tileFatigueCost(grid, from, to)).toBe(4);
  });

  it("forest costs 6 fatigue", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Forest });
    expect(tileFatigueCost(grid, from, to)).toBe(6);
  });

  it("swamp costs 8 fatigue", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Swamp });
    expect(tileFatigueCost(grid, from, to)).toBe(8);
  });

  it("uphill adds +2 fatigue per level", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 1 });
    expect(tileFatigueCost(grid, from, to)).toBe(6); // 4 base + 2 uphill
  });

  it("downhill saves fatigue (min 2)", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 1 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 0 });
    expect(tileFatigueCost(grid, from, to)).toBe(3); // 4 base - 1 downhill
  });
});

describe("pathAPCost / pathStaminaCost", () => {
  it("calculates total AP for a multi-step path", () => {
    const grid = createTestGrid();
    // Path: (0,0) → (1,0) → (2,0) — all grass
    const path = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
    expect(pathAPCost(grid, path, 0, 0)).toBe(4); // 2 + 2
  });

  it("calculates total fatigue for a multi-step path", () => {
    const grid = createTestGrid();
    const path = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
    expect(pathStaminaCost(grid, path, 0, 0)).toBe(8); // 4 + 4
  });

  it("accounts for terrain variation in path", () => {
    const grid = createTestGrid();
    // Make middle tile a forest
    grid.set(1, 0, makeTile({ q: 1, r: 0, terrain: TerrainType.Forest }));
    const path = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
    expect(pathAPCost(grid, path, 0, 0)).toBe(5); // 3 (forest) + 2 (grass)
    expect(pathStaminaCost(grid, path, 0, 0)).toBe(10); // 6 (forest) + 4 (grass)
  });
});
