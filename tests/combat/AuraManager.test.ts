import { describe, it, expect } from "vitest";
import { RNG } from "@utils/RNG";
import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { refreshAuras } from "@combat/AuraManager";
import { defaultRulesetAbilities } from "@data/ruleset/defaultRuleset";
import type { EntityId } from "@entities/Entity";

function createTestGrid(): HexGrid {
  const grid = new HexGrid();
  for (let q = 0; q < 6; q++) {
    for (let r = 0; r < 6; r++) {
      grid.set(q, r, {
        q, r, elevation: 0, occupant: null,
        terrain: TerrainType.Grass, blocksLoS: false,
        movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0,
      });
    }
  }
  return grid;
}

function spawnUnit(
  world: World,
  grid: HexGrid,
  opts: { q: number; r: number; isEnemy?: boolean; abilityIds?: string[] },
): EntityId {
  const id = world.createEntity();
  world.addComponent(id, {
    type: "stats",
    hitpoints: 100,
    stamina: 100,
    mana: 20,
    resolve: 50,
    initiative: 100,
    meleeSkill: 50,
    rangedSkill: 30,
    dodge: 10,
    magicResist: 0,
    critChance: 5,
    critMultiplier: 1.5,
    movementPoints: 8,
    level: 1,
    experience: 0,
  });
  world.addComponent(id, {
    type: "health",
    current: 100,
    max: 100,
    injuries: [],
  });
  world.addComponent(id, {
    type: "position",
    q: opts.q,
    r: opts.r,
    elevation: 0,
    facing: 0,
  });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  if (opts.abilityIds?.length) {
    world.addComponent(id, { type: "abilities", abilityIds: opts.abilityIds });
  }
  if (opts.isEnemy) {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType: "aggressive",
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }
  grid.get(opts.q, opts.r)!.occupant = id;
  return id;
}

describe("AuraManager (R3)", () => {
  it("refreshAuras runs without throwing when no entities have auras", () => {
    const world = new World();
    const grid = createTestGrid();
    const sem = new StatusEffectManager(new RNG(42));
    expect(() => {
      refreshAuras(world, grid, sem, () => false);
    }).not.toThrow();
  });

  it("aura with debuff_vuln applies vulnerability to enemies in radius", () => {
    const auraAbility = defaultRulesetAbilities.find(
      (a) => a.type === "Aura" && a.effects[0]?.type === "debuff_vuln",
    );
    if (!auraAbility) {
      // Frailty Aura (or similar) must be in ruleset with debuff_vuln mapping
      return;
    }

    const world = new World();
    const grid = createTestGrid();
    const sem = new StatusEffectManager(new RNG(42));

    const caster = spawnUnit(world, grid, {
      q: 1,
      r: 1,
      isEnemy: false,
      abilityIds: [auraAbility.id],
    });
    const enemy = spawnUnit(world, grid, {
      q: 2,
      r: 1,
      isEnemy: true,
    });

    refreshAuras(world, grid, sem, (id) => world.getComponent(id, "aiBehavior") != null);

    const vulnBonus = sem.getVulnerabilityBonus(world, enemy);
    expect(vulnBonus).toBeGreaterThan(0);
    const effectParams = auraAbility.effects[0]?.params as { bonusDmg?: number };
    const expectedPct = (effectParams?.bonusDmg ?? 8) / 100;
    expect(vulnBonus).toBeCloseTo(expectedPct, 5);
  });
});
