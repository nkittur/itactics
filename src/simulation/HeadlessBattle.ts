/**
 * Headless battle runner — executes a full tactical battle using AI on both sides.
 * No rendering, no DOM, no animation. Suitable for batch simulation.
 */

import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";
import { CombatManager } from "@combat/CombatManager";
import type { EntityId } from "@entities/Entity";
import type { HealthComponent } from "@entities/components/Health";
import type { AIType } from "@entities/components/AIBehavior";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import { getClassDef } from "@data/ClassData";
import { resolveArmor } from "@data/ItemResolver";
import { createAbilities } from "@entities/components/Abilities";
import { createAbilityCooldowns } from "@entities/components/AbilityCooldowns";
import { createMana } from "@entities/components/Mana";
import type { ScenarioDef, ScenarioUnit } from "@data/ScenarioData";
import type { BattleActionTracker } from "@combat/CPCalculator";
import { hexNeighbors } from "@hex/HexMath";
import type { BalanceParams } from "./CampaignSimulator";
import { DEFAULT_PARAMS } from "./CampaignSimulator";

// ── Types ──

export interface HeadlessBattleResult {
  victory: boolean;
  turnsElapsed: number;
  playerSurvivors: { entityId: EntityId; name: string; hpRemaining: number }[];
  playerDeaths: number;
  enemyKills: number;
  actionTracker: BattleActionTracker;
}

// ── Terrain configs (same as DemoBattle) ──

const TERRAIN_CONFIGS: Record<TerrainType, Omit<HexTile, "q" | "r" | "elevation" | "occupant">> = {
  [TerrainType.Grass]: { terrain: TerrainType.Grass, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Forest]: { terrain: TerrainType.Forest, blocksLoS: true, movementCost: 2, defenseBonusMelee: 0, defenseBonusRanged: 10 },
  [TerrainType.Swamp]: { terrain: TerrainType.Swamp, blocksLoS: false, movementCost: 3, defenseBonusMelee: -10, defenseBonusRanged: 0 },
  [TerrainType.Hills]: { terrain: TerrainType.Hills, blocksLoS: false, movementCost: 2, defenseBonusMelee: 5, defenseBonusRanged: 5 },
  [TerrainType.Mountains]: { terrain: TerrainType.Mountains, blocksLoS: true, movementCost: Infinity, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Sand]: { terrain: TerrainType.Sand, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Snow]: { terrain: TerrainType.Snow, blocksLoS: false, movementCost: 2, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Water]: { terrain: TerrainType.Water, blocksLoS: false, movementCost: Infinity, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Road]: { terrain: TerrainType.Road, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
};

// ── Grid helpers ──

function createGridFromScenario(scenario: ScenarioDef): HexGrid {
  const grid = new HexGrid();
  for (let r = 0; r < scenario.gridHeight; r++) {
    for (let q = 0; q < scenario.gridWidth; q++) {
      const config = TERRAIN_CONFIGS[TerrainType.Grass]!;
      grid.set(q, r, { q, r, elevation: 0, occupant: null, ...config });
    }
  }
  for (const tile of scenario.tiles) {
    const config = TERRAIN_CONFIGS[tile.terrain]!;
    grid.set(tile.q, tile.r, {
      q: tile.q, r: tile.r,
      elevation: tile.elevation,
      occupant: null,
      ...config,
    });
  }
  return grid;
}

function findFreeHex(grid: HexGrid, q: number, r: number): { q: number; r: number } {
  const tile = grid.get(q, r);
  if (tile && tile.occupant === null && tile.movementCost < Infinity) return { q, r };
  for (const n of hexNeighbors(q, r)) {
    const nt = grid.get(n.q, n.r);
    if (nt && nt.occupant === null && nt.movementCost < Infinity) return { q: n.q, r: n.r };
  }
  return { q, r };
}

// ── Entity spawning ──

function spawnUnit(
  world: World,
  grid: HexGrid,
  unit: ScenarioUnit,
  params?: BalanceParams,
): EntityId {
  const pos = findFreeHex(grid, unit.q, unit.r);
  const id = world.createEntity();

  world.addComponent(id, {
    type: "position" as const,
    q: pos.q, r: pos.r,
    elevation: grid.get(pos.q, pos.r)?.elevation ?? 0,
    facing: 0,
  });

  // Class-driven base stats
  let classDef: import("@data/ClassDefinition").ClassDef | undefined;
  try { if (unit.classId) classDef = getClassDef(unit.classId); } catch { /* unknown class */ }
  const base = classDef?.baseStats;
  const baseMP = unit.stats.mp ?? (base?.movementPoints ?? 8);
  const unitLevel = unit.stats.level ?? 1;
  const p = params ?? DEFAULT_PARAMS;
  const bonusDamage = Math.floor((unitLevel - 1) * p.bonusDamagePerLevel);
  const bonusArmor = Math.floor((unitLevel - 1) * p.bonusArmorPerLevel);
  world.addComponent(id, {
    type: "stats" as const,
    hitpoints: unit.stats.hp,
    stamina: base?.stamina ?? unit.stats.stamina ?? 100,
    mana: base?.mana ?? unit.stats.mana ?? 20,
    resolve: base?.resolve ?? 50,
    initiative: unit.stats.initiative,
    meleeSkill: unit.stats.melee,
    rangedSkill: base?.rangedSkill ?? unit.stats.rangedSkill ?? 30,
    dodge: unit.stats.defense,
    magicResist: base?.magicResist ?? unit.stats.magicResist ?? 0,
    critChance: base?.critChance ?? 5,
    critMultiplier: base?.critMultiplier ?? 1.5,
    movementPoints: baseMP,
    level: unitLevel,
    experience: 0,
    bonusDamage,
    bonusArmor,
  });

  world.addComponent(id, {
    type: "health" as const,
    current: unit.stats.hp,
    max: unit.stats.hp,
    injuries: [],
  });

  const bodyDef = unit.bodyArmor ? resolveArmor(unit.bodyArmor) : undefined;
  const headDef = unit.headArmor ? resolveArmor(unit.headArmor) : undefined;
  world.addComponent(id, {
    type: "armor" as const,
    head: headDef
      ? { id: headDef.id, armor: headDef.armor, magicResist: headDef.magicResist }
      : null,
    body: bodyDef
      ? { id: bodyDef.id, armor: bodyDef.armor, magicResist: bodyDef.magicResist }
      : null,
  });

  world.addComponent(id, {
    type: "equipment" as const,
    mainHand: unit.weapon ?? null,
    offHand: unit.shield ?? null,
    accessory: null,
    bag: unit.bag ?? [],
  });

  const maxStamina = unit.stats.stamina ?? 100;
  world.addComponent(id, {
    type: "stamina" as const,
    current: 0,
    max: maxStamina,
    recoveryPerTurn: 15,
  });

  const maxMana = unit.stats.mana ?? 20;
  world.addComponent(id, createMana({ max: maxMana, recoveryPerTurn: 5 }));

  world.addComponent(id, {
    type: "initiative" as const,
    base: unit.stats.initiative,
    effective: unit.stats.initiative,
  });

  world.addComponent(id, {
    type: "morale" as const,
    current: 70,
    state: "steady" as const,
  });

  world.addComponent(id, {
    type: "statusEffects" as const,
    effects: [],
  });

  world.addComponent(id, {
    type: "spriteRef" as const,
    atlasKey: unit.sprite ?? (unit.team === "player" ? "soldier" : "orc"),
    framePrefix: "idle",
    currentFrame: 0,
    tint: null,
  });

  world.addComponent(id, {
    type: "team" as const,
    team: unit.team,
    name: unit.name,
  });

  if (unit.classId) {
    world.addComponent(id, {
      type: "characterClass" as const,
      classId: unit.classId,
    } as CharacterClassComponent);
  }

  if (unit.team === "enemy") {
    world.addComponent(id, {
      type: "aiBehavior" as const,
      aiType: (unit.aiType ?? "aggressive") as AIType,
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }

  const tile = grid.get(pos.q, pos.r);
  if (tile) tile.occupant = id;

  return id;
}

// ── Main battle runner ──

const MAX_TURNS = 500;

/**
 * Run a complete battle headlessly using AI for both sides.
 * @param scenario The scenario definition (units, grid, terrain)
 * @param rosterAbilities Map of player unit index → unlocked ability UIDs
 * @param seed RNG seed for deterministic combat
 */
export function runHeadlessBattle(
  scenario: ScenarioDef,
  rosterAbilities?: Map<number, string[]>,
  seed?: number,
  params?: BalanceParams,
): HeadlessBattleResult {
  const world = new World();
  const grid = createGridFromScenario(scenario);

  // Spawn all units
  const playerIds: EntityId[] = [];
  const enemyIds: EntityId[] = [];

  for (const unit of scenario.units) {
    const id = spawnUnit(world, grid, unit, params);
    if (unit.team === "player") {
      playerIds.push(id);
    } else {
      enemyIds.push(id);
    }
  }

  // Attach ability components to player units
  if (rosterAbilities) {
    for (let i = 0; i < playerIds.length; i++) {
      const abilities = rosterAbilities.get(i);
      if (abilities && abilities.length > 0) {
        world.addComponent(playerIds[i]!, createAbilities(abilities));
        world.addComponent(playerIds[i]!, createAbilityCooldowns());
      }
    }
  }

  // Create combat manager (headless — no rendering callbacks)
  const combat = new CombatManager(world, grid, seed);

  let victory = false;
  let battleEnded = false;

  combat.onBattleEnd = (v: boolean) => {
    victory = v;
    battleEnded = true;
  };

  // Start combat
  combat.start();

  // Drive the battle loop
  let turns = 0;
  while (!battleEnded && turns < MAX_TURNS) {
    if (combat.phase === "playerTurn") {
      combat.runPlayerTurnAsAI();
    }
    combat.continueAfterAnimation();
    turns++;
  }

  // Gather results
  const survivors: HeadlessBattleResult["playerSurvivors"] = [];
  for (const pid of playerIds) {
    const health = world.getComponent<HealthComponent>(pid, "health");
    const team = world.getComponent<{ type: "team"; team: string; name: string }>(pid, "team");
    if (health && health.current > 0) {
      survivors.push({
        entityId: pid,
        name: team?.name ?? "Unknown",
        hpRemaining: health.current,
      });
    }
  }

  return {
    victory,
    turnsElapsed: turns,
    playerSurvivors: survivors,
    playerDeaths: playerIds.length - survivors.length,
    enemyKills: combat.killCount,
    actionTracker: combat.actionTracker,
  };
}
