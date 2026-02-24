import { describe, it, expect } from "vitest";
import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";
import { decideTacticalAction, type TacticalAction } from "@combat/TacticalAI";

function makeTile(q: number, r: number, terrain = TerrainType.Grass, elevation = 0): HexTile {
  return {
    q, r, terrain, elevation,
    occupant: null,
    blocksLoS: false,
    movementCost: 1,
    defenseBonusMelee: terrain === TerrainType.Hills ? 5 : 0,
    defenseBonusRanged: 0,
  };
}

function createGrid(width = 10, height = 8): HexGrid {
  const grid = new HexGrid();
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      grid.set(q, r, makeTile(q, r));
    }
  }
  return grid;
}

function spawnUnit(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  isEnemy: boolean,
  hp = 50,
  maxHp = 50,
  aiType = "aggressive",
): string {
  const id = world.createEntity();
  world.addComponent(id, { type: "position", q, r, elevation: grid.get(q, r)?.elevation ?? 0, facing: 0 });
  world.addComponent(id, { type: "health", current: hp, max: maxHp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: maxHp, fatigue: 100, resolve: 50, initiative: 100,
    meleeSkill: 60, rangedSkill: 30, meleeDefense: 10, rangedDefense: 10,
    level: 1, experience: 0,
  });
  world.addComponent(id, {
    type: "equipment",
    mainHand: "arming_sword", offHand: null, accessory: null, bag: [],
  });
  world.addComponent(id, {
    type: "fatigue", current: 0, max: 100, recoveryPerTurn: 15,
  });
  if (isEnemy) {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType, aggroRadius: 10, preferredRange: 1, fleeThreshold: 10,
    });
  }
  const tile = grid.get(q, r);
  if (tile) tile.occupant = id;
  return id;
}

describe("TacticalAI", () => {
  it("attacks adjacent enemy", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 5, 3, true);
    const player = spawnUnit(world, grid, 4, 3, false);

    const action = decideTacticalAction(world, grid, enemy, [player]);
    expect(action.type).toBe("attack");
    if (action.type === "attack") {
      expect(action.targetId).toBe(player);
    }
  });

  it("moves toward distant enemy when not adjacent", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 8, 3, true);
    const player = spawnUnit(world, grid, 2, 3, false);

    const action = decideTacticalAction(world, grid, enemy, [player]);
    // Should move closer
    expect(action.type === "move" || action.type === "moveAndAttack").toBe(true);
  });

  it("prefers wounded target over healthy one", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 5, 3, true);
    const healthyPlayer = spawnUnit(world, grid, 4, 3, false, 50, 50);
    const woundedPlayer = spawnUnit(world, grid, 5, 4, false, 10, 50); // 20% HP

    const action = decideTacticalAction(world, grid, enemy, [healthyPlayer, woundedPlayer]);

    // AI should prefer the wounded target
    if (action.type === "attack") {
      expect(action.targetId).toBe(woundedPlayer);
    } else if (action.type === "moveAndAttack") {
      expect(action.targetId).toBe(woundedPlayer);
    }
  });

  it("recovers when fatigue is high and no adjacent enemies", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 8, 3, true);
    const player = spawnUnit(world, grid, 1, 3, false); // far away

    // Set high fatigue
    const fatigue = world.getComponent<any>(enemy, "fatigue");
    fatigue.current = 80; // > 70% of 100

    const action = decideTacticalAction(world, grid, enemy, [player]);
    expect(action.type).toBe("recover");
  });

  it("does NOT recover when enemy is adjacent despite high fatigue", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 5, 3, true);
    const player = spawnUnit(world, grid, 4, 3, false);

    const fatigue = world.getComponent<any>(enemy, "fatigue");
    fatigue.current = 80;

    const action = decideTacticalAction(world, grid, enemy, [player]);
    // Should attack, not recover
    expect(action.type).toBe("attack");
  });

  it("waits when no enemies exist", () => {
    const world = new World();
    const grid = createGrid();
    spawnUnit(world, grid, 5, 3, true);

    const action = decideTacticalAction(world, grid, "e0", []);
    expect(action.type).toBe("wait");
  });

  it("returns valid action type", () => {
    const world = new World();
    const grid = createGrid();
    const enemy = spawnUnit(world, grid, 5, 3, true);
    const player = spawnUnit(world, grid, 3, 3, false);

    const action = decideTacticalAction(world, grid, enemy, [player]);
    const validTypes = ["move", "attack", "moveAndAttack", "recover", "wait"];
    expect(validTypes).toContain(action.type);
  });

  it("moveAndAttack has valid path", () => {
    const world = new World();
    const grid = createGrid();
    // Place enemy 3 hexes away — should move+attack
    const enemy = spawnUnit(world, grid, 7, 3, true);
    const player = spawnUnit(world, grid, 4, 3, false);

    const action = decideTacticalAction(world, grid, enemy, [player]);

    if (action.type === "moveAndAttack") {
      expect(action.path.length).toBeGreaterThan(0);
      expect(action.targetId).toBe(player);
    }
  });
});
