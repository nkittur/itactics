import { describe, it, expect } from "vitest";
import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";
import {
  getZoCThreats,
  getZoCAttacksForMove,
  isInEnemyZoC,
  getZoCDangerHexes,
} from "@combat/ZoneOfControl";

function makeTile(q: number, r: number): HexTile {
  return {
    q,
    r,
    terrain: TerrainType.Grass,
    elevation: 0,
    occupant: null,
    blocksLoS: false,
    movementCost: 1,
    defenseBonusMelee: 0,
    defenseBonusRanged: 0,
  };
}

function createGrid(): HexGrid {
  const grid = new HexGrid();
  for (let q = 0; q < 10; q++) {
    for (let r = 0; r < 10; r++) {
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
): string {
  const id = world.createEntity();
  world.addComponent(id, { type: "position", q, r, elevation: 0, facing: 0 });
  world.addComponent(id, { type: "health", current: hp, max: hp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: hp,
    stamina: 100,
    mana: 20,
    resolve: 50,
    initiative: 100,
    meleeSkill: 60,
    rangedSkill: 30,
    dodge: 10,
    magicResist: 0,
    level: 1,
    experience: 0,
  });
  if (isEnemy) {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType: "aggressive",
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }
  const tile = grid.get(q, r);
  if (tile) tile.occupant = id;
  return id;
}

describe("getZoCThreats", () => {
  it("returns adjacent enemies", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    const enemy = spawnUnit(world, grid, 4, 3, true);

    const threats = getZoCThreats(world, grid, 3, 3, player);
    expect(threats).toContain(enemy);
    expect(threats).toHaveLength(1);
  });

  it("does not include allies", () => {
    const world = new World();
    const grid = createGrid();
    const player1 = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, false); // ally

    const threats = getZoCThreats(world, grid, 3, 3, player1);
    expect(threats).toHaveLength(0);
  });

  it("does not include dead enemies", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true, 0); // dead enemy

    const threats = getZoCThreats(world, grid, 3, 3, player);
    expect(threats).toHaveLength(0);
  });

  it("does not include non-adjacent enemies", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 5, 3, true); // 2 hexes away

    const threats = getZoCThreats(world, grid, 3, 3, player);
    expect(threats).toHaveLength(0);
  });

  it("returns multiple adjacent enemies", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true);
    spawnUnit(world, grid, 3, 4, true);

    const threats = getZoCThreats(world, grid, 3, 3, player);
    expect(threats).toHaveLength(2);
  });
});

describe("getZoCAttacksForMove", () => {
  it("triggers free attack when leaving enemy ZoC", () => {
    const world = new World();
    const grid = createGrid();

    // Player at (3,3), enemy at (4,3)
    // Moving from (3,3) to (2,3) leaves enemy's ZoC
    const player = spawnUnit(world, grid, 3, 3, false);
    const enemy = spawnUnit(world, grid, 4, 3, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3, [{ q: 2, r: 3 }],
    );

    expect(attackers).toContain(enemy);
    expect(attackers).toHaveLength(1);
  });

  it("does NOT trigger when entering ZoC (staying adjacent)", () => {
    const world = new World();
    const grid = createGrid();

    // Player at (2,3), enemy at (4,3)
    // Moving from (2,3) to (3,3) enters enemy ZoC — no free attack
    const player = spawnUnit(world, grid, 2, 3, false);
    spawnUnit(world, grid, 4, 3, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 2, 3, [{ q: 3, r: 3 }],
    );

    expect(attackers).toHaveLength(0);
  });

  it("does NOT trigger when moving within ZoC (staying adjacent)", () => {
    const world = new World();
    const grid = createGrid();

    // Player at (3,3), enemy at (4,3)
    // Moving to (3,2) — still adjacent to enemy at (4,3)
    // hex neighbors of (3,2): (4,2), (4,1), (3,1), (2,2), (2,3), (3,3)
    // hex neighbors of (4,3): (5,3), (5,2), (4,2), (3,3), (3,4), (4,4)
    // (3,2) neighbors include (4,2); (4,3) neighbors include (4,2)? No.
    // Let me think about this more carefully.
    // Neighbor of (4,3) in axial coords:
    //   (+1,0)=(5,3), (+1,-1)=(5,2), (0,-1)=(4,2), (-1,0)=(3,3), (-1,+1)=(3,4), (0,+1)=(4,4)
    // So neighbors of (4,3) = {(5,3), (5,2), (4,2), (3,3), (3,4), (4,4)}
    // Is (3,2) a neighbor of (4,3)? No.
    // So moving from (3,3) to (3,2) DOES leave (4,3)'s ZoC.
    // Let's pick a move that stays adjacent instead.
    // Moving from (3,3) to (3,4) — (3,4) IS a neighbor of (4,3). So stays in ZoC.
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3, [{ q: 3, r: 4 }],
    );

    expect(attackers).toHaveLength(0);
  });

  it("each enemy attacks only once per movement", () => {
    const world = new World();
    const grid = createGrid();

    // Player at (3,3), enemy at (4,3)
    // Path: (3,3) -> (2,3) -> (3,3) -> (2,3)
    // Leaving ZoC at step 1, re-entering at step 2, leaving again at step 3
    // Enemy should only attack once
    const player = spawnUnit(world, grid, 3, 3, false);
    // Need to clear occupants for the path
    grid.get(3, 3)!.occupant = null; // will be set by spawnUnit, clear for path
    grid.get(3, 3)!.occupant = player;
    spawnUnit(world, grid, 4, 3, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3,
      [{ q: 2, r: 3 }, { q: 3, r: 3 }, { q: 2, r: 3 }],
    );

    expect(attackers).toHaveLength(1); // only one free attack per enemy
  });

  it("multiple enemies each get one free attack", () => {
    const world = new World();
    const grid = createGrid();

    // Player at (3,3), enemies at (4,3) and (3,4)
    // Moving to (2,2) leaves both enemies' ZoC
    const player = spawnUnit(world, grid, 3, 3, false);
    const enemy1 = spawnUnit(world, grid, 4, 3, true);
    const enemy2 = spawnUnit(world, grid, 3, 4, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3, [{ q: 2, r: 2 }],
    );

    expect(attackers).toHaveLength(2);
    expect(attackers).toContain(enemy1);
    expect(attackers).toContain(enemy2);
  });

  it("dead enemies don't get free attacks", () => {
    const world = new World();
    const grid = createGrid();

    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true, 0); // dead

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3, [{ q: 2, r: 3 }],
    );

    expect(attackers).toHaveLength(0);
  });

  it("empty path returns no attackers", () => {
    const world = new World();
    const grid = createGrid();

    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true);

    const attackers = getZoCAttacksForMove(
      world, grid, player, 3, 3, [],
    );

    expect(attackers).toHaveLength(0);
  });
});

describe("isInEnemyZoC", () => {
  it("returns true when adjacent to enemy", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true);

    expect(isInEnemyZoC(world, grid, 3, 3, player)).toBe(true);
  });

  it("returns false when no adjacent enemies", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 6, 6, true); // far away

    expect(isInEnemyZoC(world, grid, 3, 3, player)).toBe(false);
  });
});

describe("getZoCDangerHexes", () => {
  it("marks hexes that leave enemy ZoC", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 4, 3, true);

    const danger = getZoCDangerHexes(world, grid, player, 3, 3);

    // Moving to hexes that are NOT adjacent to (4,3) should be danger
    // Neighbors of (4,3): (5,3), (5,2), (4,2), (3,3), (3,4), (4,4)
    // Neighbors of (3,3): (4,3), (4,2), (3,2), (2,3), (2,4), (3,4)
    // Passable neighbors of (3,3) that are NOT neighbors of (4,3):
    //   (3,2) - not in {5,3,5,2,4,2,3,3,3,4,4,4} → DANGER
    //   (2,3) - not in {5,3,5,2,4,2,3,3,3,4,4,4} → DANGER
    //   (2,4) - not in {5,3,5,2,4,2,3,3,3,4,4,4} → DANGER
    // Safe moves (still adjacent to enemy): (4,2), (3,4)
    // (4,3) is occupied by enemy, not passable
    expect(danger.has("3,2")).toBe(true);
    expect(danger.has("2,3")).toBe(true);
    expect(danger.has("2,4")).toBe(true);
    // Hexes still adjacent to enemy should NOT be danger
    expect(danger.has("4,2")).toBe(false);
    expect(danger.has("3,4")).toBe(false);
  });

  it("returns empty when not in enemy ZoC", () => {
    const world = new World();
    const grid = createGrid();
    const player = spawnUnit(world, grid, 3, 3, false);
    spawnUnit(world, grid, 7, 7, true); // far away

    const danger = getZoCDangerHexes(world, grid, player, 3, 3);
    expect(danger.size).toBe(0);
  });
});
