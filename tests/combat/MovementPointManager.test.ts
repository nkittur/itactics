import { describe, it, expect } from "vitest";
import {
  MovementPointManager,
  DEFAULT_MP,
  tileMPCost,
  pathMPCost,
  getEffectiveMP,
} from "@combat/MovementPointManager";
import { getZoCBreakCost } from "@combat/ZoneOfControl";
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

describe("MovementPointManager", () => {
  it("starts with 0 MP before reset", () => {
    const mpm = new MovementPointManager();
    expect(mpm.remaining).toBe(0);
  });

  it("resetForTurn sets MP to specified max", () => {
    const mpm = new MovementPointManager();
    mpm.resetForTurn(10);
    expect(mpm.remaining).toBe(10);
    expect(mpm.maximum).toBe(10);
  });

  it("spend reduces remaining MP", () => {
    const mpm = new MovementPointManager();
    mpm.resetForTurn(DEFAULT_MP);
    expect(mpm.spend(3)).toBe(true);
    expect(mpm.remaining).toBe(5);
  });

  it("canAfford returns false when insufficient MP", () => {
    const mpm = new MovementPointManager();
    mpm.resetForTurn(DEFAULT_MP);
    expect(mpm.canAfford(9)).toBe(false);
    expect(mpm.canAfford(8)).toBe(true);
  });

  it("spend returns false when insufficient MP", () => {
    const mpm = new MovementPointManager();
    mpm.resetForTurn(DEFAULT_MP);
    mpm.spend(6);
    expect(mpm.spend(3)).toBe(false);
    expect(mpm.remaining).toBe(2); // unchanged
  });

  it("spend with negative value refunds MP (undo)", () => {
    const mpm = new MovementPointManager();
    mpm.resetForTurn(DEFAULT_MP);
    mpm.spend(4);
    expect(mpm.remaining).toBe(4);
    mpm.spend(-4);
    expect(mpm.remaining).toBe(8);
  });

  it("DEFAULT_MP is 8", () => {
    expect(DEFAULT_MP).toBe(8);
  });
});

describe("tileMPCost", () => {
  const grid = createTestGrid();

  it("flat terrain costs 2 MP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass });
    expect(tileMPCost(grid, from, to)).toBe(2);
  });

  it("road costs 2 MP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Road });
    expect(tileMPCost(grid, from, to)).toBe(2);
  });

  it("forest costs 3 MP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Forest });
    expect(tileMPCost(grid, from, to)).toBe(3);
  });

  it("swamp costs 4 MP", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Swamp });
    expect(tileMPCost(grid, from, to)).toBe(4);
  });

  it("uphill adds +1 MP per level", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 1 });
    expect(tileMPCost(grid, from, to)).toBe(3);
  });

  it("downhill doesn't add extra MP", () => {
    const from = makeTile({ q: 0, r: 0, elevation: 1 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Grass, elevation: 0 });
    expect(tileMPCost(grid, from, to)).toBe(2);
  });

  it("water is impassable", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, terrain: TerrainType.Water });
    expect(tileMPCost(grid, from, to)).toBe(Infinity);
  });

  it("occupied tile is impassable", () => {
    const from = makeTile({ q: 0, r: 0 });
    const to = makeTile({ q: 1, r: 0, occupant: "e0" });
    expect(tileMPCost(grid, from, to)).toBe(Infinity);
  });
});

describe("pathMPCost", () => {
  it("calculates total MP for a multi-step path", () => {
    const grid = createTestGrid();
    const path = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
    expect(pathMPCost(grid, path, 0, 0)).toBe(4);
  });

  it("accounts for terrain variation in path", () => {
    const grid = createTestGrid();
    grid.set(1, 0, makeTile({ q: 1, r: 0, terrain: TerrainType.Forest }));
    const path = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
    expect(pathMPCost(grid, path, 0, 0)).toBe(5);
  });
});

describe("getZoCBreakCost", () => {
  it("costs 4 MP when unit has >= 4 MP", () => {
    expect(getZoCBreakCost(8)).toBe(4);
    expect(getZoCBreakCost(4)).toBe(4);
  });

  it("costs all MP when unit has 3 or fewer", () => {
    expect(getZoCBreakCost(3)).toBe(3);
    expect(getZoCBreakCost(2)).toBe(2);
    expect(getZoCBreakCost(1)).toBe(1);
  });

  it("costs 0 when unit has 0 MP", () => {
    expect(getZoCBreakCost(0)).toBe(0);
  });
});

describe("getEffectiveMP", () => {
  it("returns base MP with no equipment", () => {
    expect(getEffectiveMP(8)).toBe(8);
  });

  it("reduces MP for mail_hauberk (mpPenalty 1)", () => {
    expect(getEffectiveMP(8, "mail_hauberk")).toBe(7);
  });

  it("reduces MP for coat_of_plates (mpPenalty 2)", () => {
    expect(getEffectiveMP(8, "coat_of_plates")).toBe(6);
  });

  it("reduces MP for heater_shield (mpPenalty 1)", () => {
    expect(getEffectiveMP(8, undefined, undefined, "heater_shield")).toBe(7);
  });

  it("stacks penalties from armor + shield", () => {
    // coat_of_plates (2) + heater_shield (1) = 3 penalty
    expect(getEffectiveMP(8, "coat_of_plates", undefined, "heater_shield")).toBe(5);
  });

  it("minimum MP is 2", () => {
    // coat_of_plates (2) + heater_shield (1) on base 3 = 0, but min 2
    expect(getEffectiveMP(3, "coat_of_plates", undefined, "heater_shield")).toBe(2);
  });

  it("no penalty for light equipment", () => {
    expect(getEffectiveMP(8, "leather_jerkin", "leather_cap", "buckler")).toBe(8);
  });
});
