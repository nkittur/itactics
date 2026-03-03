/**
 * Tests for AbilityExecutor — verifies that generated ability params
 * are correctly read and applied during execution.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { World } from "@entities/World";
import { AbilityExecutor, type AbilityResult } from "@combat/AbilityExecutor";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { RNG } from "@utils/RNG";
import type { GeneratedAbility, EffectPrimitive, TargetingPrimitive } from "@data/AbilityData";
import type { SkillDef } from "@data/SkillData";
import { BASIC_ATTACK } from "@data/SkillData";
import type { WeaponDef } from "@data/WeaponData";
import { UNARMED } from "@data/WeaponData";
import type { HexGrid, HexTile } from "@hex/HexGrid";

// ── Helpers ──

function makeWorld(): World {
  return new World();
}

function addUnit(world: World, opts: {
  hp?: number; maxHp?: number; q?: number; r?: number;
  meleeSkill?: number; dodge?: number;
} = {}): string {
  const id = world.createEntity();
  const hp = opts.hp ?? 100;
  const maxHp = opts.maxHp ?? hp;
  world.addComponent(id, { type: "health", current: hp, max: maxHp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: maxHp, stamina: 100, mana: 20, resolve: 50, initiative: 100,
    meleeSkill: opts.meleeSkill ?? 60, rangedSkill: 30, dodge: opts.dodge ?? 10,
    magicResist: 0, level: 1, experience: 0,
    movementPoints: 8,
  });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  if (opts.q != null && opts.r != null) {
    world.addComponent(id, { type: "position", q: opts.q, r: opts.r, elevation: 0 });
  }
  return id;
}

function makeAbility(overrides: Partial<GeneratedAbility> & { effects: EffectPrimitive[] }): GeneratedAbility {
  return {
    uid: "ga_test",
    name: "Test Ability",
    description: "test",
    targeting: { type: "tgt_single_enemy", params: {}, powerMult: 1 },
    effects: overrides.effects,
    modifiers: overrides.modifiers ?? [],
    triggers: overrides.triggers ?? [],
    cost: { ap: 4, stamina: 10, mana: 0, cooldown: 0, turnEnding: false },
    powerBudget: 5,
    weaponReq: [],
    tier: overrides.tier ?? 1,
    isPassive: false,
    rarity: "common",
    synergyTags: overrides.synergyTags ?? { creates: [], exploits: [] },
    ...overrides,
  };
}

function makeEffect(type: string, params: Record<string, number | string>): EffectPrimitive {
  return { type: type as any, params, power: 3 };
}

const TEST_WEAPON: WeaponDef = {
  id: "test_sword", name: "Test Sword", family: "sword",
  minDamage: 20, maxDamage: 30, hands: 1, manaCost: 0,
  damageType: "physical",
};

/** Create a mock grid that returns tiles for any position. */
function makeMockGrid(): HexGrid {
  const tiles = new Map<string, HexTile>();
  const key = (q: number, r: number) => `${q},${r}`;

  const getTile = (q: number, r: number): HexTile => {
    const k = key(q, r);
    if (!tiles.has(k)) {
      tiles.set(k, {
        q, r, elevation: 0, terrain: "grass",
        movementCost: 1, occupant: null, fogOfWar: "visible",
      } as any);
    }
    return tiles.get(k)!;
  };

  return {
    get: getTile,
    width: 20, height: 20,
    allTiles: () => [],
  } as any;
}

/** Create a mock DamageCalculator that captures the damageMultiplier. */
function makeMockDamageCalc() {
  const captured: { damageMultiplier: number }[] = [];
  return {
    captured,
    resolveSkillAttack: vi.fn((_world: any, _atk: any, _def: any, skill: SkillDef) => {
      captured.push({ damageMultiplier: skill.damageMultiplier });
      return {
        hit: true, targetKilled: false, hpDamage: Math.round(25 * skill.damageMultiplier),
        armorDamage: 0, fatigueDamage: 0, appliedEffects: [],
        roll: 50, hitChance: 75,
      };
    }),
    previewMelee: vi.fn(() => ({ hitChance: 75 })),
  };
}

function makeMockSkillExecutor() {
  return {
    activateStance: vi.fn(),
  };
}

function makeExecutor(grid?: HexGrid, damageCalc?: any) {
  const rng = new RNG(42);
  const sem = new StatusEffectManager(rng);
  const dc = damageCalc ?? makeMockDamageCalc();
  const se = makeMockSkillExecutor();
  const g = grid ?? makeMockGrid();
  const executor = new AbilityExecutor(rng, dc as any, sem, se as any, g);
  return { executor, sem, dc, rng, grid: g };
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe("AbilityExecutor", () => {

  // ── #11: multiplier param ──

  describe("dmg_weapon reads multiplier param", () => {
    it("uses generated multiplier value, not fallback 1.0", () => {
      const { executor, dc } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.4 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(dc.captured.length).toBe(1);
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.4, 2);
    });
  });

  describe("dmg_spell reads multiplier param", () => {
    it("uses generated multiplier value", () => {
      const { executor, dc } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("dmg_spell", { multiplier: 1.8 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(dc.captured.length).toBe(1);
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.8, 2);
    });
  });

  // ── #12: execute threshold ──

  describe("dmg_execute threshold", () => {
    it("does NOT trigger execute bonus at full HP with threshold 30", () => {
      const { executor, dc } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("dmg_execute", { multiplier: 1.6, hpThreshold: 30, bonusMult: 0.8 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // At full HP (100%), 1.0 > 0.3 threshold, so no execute bonus
      // Should use base multiplier 1.6 only
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.6, 2);
    });

    it("triggers execute bonus when target is below threshold", () => {
      const { executor, dc } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 20, maxHp: 100 }); // 20% HP

      const ability = makeAbility({
        effects: [makeEffect("dmg_execute", { multiplier: 1.6, hpThreshold: 30, bonusMult: 0.8 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // At 20% HP, below 30% threshold: 1.6 + 0.8 * (1 - 0.2) = 1.6 + 0.64 = 2.24
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(2.24, 2);
    });
  });

  // ── #13: exploit bonus to execute/multihit ──

  describe("exploit bonus applied to dmg_execute", () => {
    it("adds exploit bonus to execute damage", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      // Give target a bleed so "bleeding" exploit triggers (+0.15)
      sem.applyDynamic(world, target, {
        id: "bleed", name: "Bleeding", duration: 3,
        modifiers: {}, dmgPerTurn: 5,
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_execute", { multiplier: 1.6, hpThreshold: 30, bonusMult: 0.8 })],
        synergyTags: { creates: [], exploits: ["bleeding"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // At full HP, no execute bonus. Base = 1.6 * (1 + 0.15) = 1.84
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.84, 2);
    });
  });

  describe("exploit bonus applied to dmg_multihit", () => {
    it("adds exploit bonus to each hit", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      sem.apply(world, target, "stun"); // +0.2 exploit bonus

      const ability = makeAbility({
        effects: [makeEffect("dmg_multihit", { hits: 3, multPerHit: 0.4 })],
        synergyTags: { creates: [], exploits: ["stunned"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // Each hit: 0.4 * (1 + 0.2) = 0.48
      expect(dc.captured.length).toBe(3);
      for (const c of dc.captured) {
        expect(c.damageMultiplier).toBeCloseTo(0.48, 2);
      }
    });
  });

  // ── #14: res_apRefund ──

  describe("res_apRefund", () => {
    it("sets apRefunded on result", () => {
      const { executor } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("res_apRefund", { amount: 3 })],
      });

      const result = executor.execute(world, attacker, target, ability, TEST_WEAPON);
      expect(result.apRefunded).toBe(3);
      expect(result.appliedEffects).toContain("ap_refund_3");
    });
  });

  // ── #15: disp_push distance ──

  describe("disp_push uses distance param", () => {
    it("pushes 2 hexes when distance=2", () => {
      const grid = makeMockGrid();
      const { executor } = makeExecutor(grid);
      const world = makeWorld();

      // Place attacker at (0,0), target at (1,0) — direction is +q
      const attacker = addUnit(world, { q: 0, r: 0 });
      const target = addUnit(world, { q: 1, r: 0 });

      // Set up occupants on grid
      grid.get(0, 0)!.occupant = attacker;
      grid.get(1, 0)!.occupant = target;

      const ability = makeAbility({
        effects: [makeEffect("disp_push", { distance: 2 })],
      });

      const result = executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // Target should end at (3,0) — pushed 2 hexes in +q direction
      const pos = world.getComponent<any>(target, "position");
      expect(pos.q).toBe(3);
      expect(pos.r).toBe(0);
    });

    it("stops early on collision", () => {
      const grid = makeMockGrid();
      const { executor } = makeExecutor(grid);
      const world = makeWorld();

      const attacker = addUnit(world, { q: 0, r: 0 });
      const target = addUnit(world, { q: 1, r: 0 });
      const blocker = addUnit(world, { q: 2, r: 0 });

      grid.get(0, 0)!.occupant = attacker;
      grid.get(1, 0)!.occupant = target;
      grid.get(2, 0)!.occupant = blocker;

      const ability = makeAbility({
        effects: [makeEffect("disp_push", { distance: 3 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      // Target stays at (1,0) — blocked by blocker at (2,0), takes collision damage
      const pos = world.getComponent<any>(target, "position");
      expect(pos.q).toBe(1);
      expect(pos.r).toBe(0);

      // Both should take 5 collision damage
      const targetHp = world.getComponent<any>(target, "health");
      const blockerHp = world.getComponent<any>(blocker, "health");
      expect(targetHp.current).toBe(95);
      expect(blockerHp.current).toBe(95);
    });
  });

  // ── #16: cc_daze uses apLoss ──

  describe("cc_daze uses apLoss param", () => {
    it("applies daze with _apLoss modifier", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("cc_daze", { apLoss: 2, turns: 2 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "daze")).toBe(true);
      const statusComp = world.getComponent<any>(target, "statusEffects");
      const dazeEffect = statusComp.effects.find((e: any) => e.id === "daze");
      expect(dazeEffect.modifiers._apLoss).toBe(2);
      expect(dazeEffect.remainingTurns).toBe(2);
    });
  });

  // ── #17: exploit conditions ──

  describe("calculateExploitBonus covers all conditions", () => {
    it("gives bonus for poisoned targets", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      sem.applyDynamic(world, target, {
        id: "poison", name: "Poisoned", duration: 3, modifiers: {}, dmgPerTurn: 4,
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.0 })],
        synergyTags: { creates: [], exploits: ["poisoned"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);
      // 1.0 * (1 + 0.15) = 1.15
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.15, 2);
    });

    it("gives bonus for rooted targets", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      sem.applyDynamic(world, target, {
        id: "root", name: "Rooted", duration: 2, modifiers: { movementPoints: -999 },
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.0 })],
        synergyTags: { creates: [], exploits: ["rooted"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.15, 2);
    });

    it("gives bonus for dazed targets", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      sem.applyDynamic(world, target, {
        id: "daze", name: "Dazed", duration: 2, modifiers: { _apLoss: 1 },
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.0 })],
        synergyTags: { creates: [], exploits: ["dazed"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);
      // dazed = +0.1
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.1, 2);
    });

    it("gives bonus for vulnerable targets", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      sem.applyDynamic(world, target, {
        id: "vulnerable", name: "Vulnerable", duration: 2, modifiers: { _bonusDmg: 20 },
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.0 })],
        synergyTags: { creates: [], exploits: ["vulnerable"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.15, 2);
    });

    it("stacks multiple exploit conditions", () => {
      const { executor, dc, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 20, maxHp: 100 }); // low_hp

      sem.applyDynamic(world, target, {
        id: "bleed", name: "Bleeding", duration: 3, modifiers: {}, dmgPerTurn: 5,
      });

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.0 })],
        synergyTags: { creates: [], exploits: ["bleeding", "low_hp"] },
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);
      // bleeding +0.15, low_hp +0.2 = 1.0 * (1 + 0.35) = 1.35
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.35, 2);
    });
  });

  // ── #18: disp_pull distance ──

  describe("disp_pull uses distance param", () => {
    it("pulls target 2 hexes toward caster", () => {
      const grid = makeMockGrid();
      const { executor } = makeExecutor(grid);
      const world = makeWorld();

      const attacker = addUnit(world, { q: 0, r: 0 });
      const target = addUnit(world, { q: 3, r: 0 });

      grid.get(0, 0)!.occupant = attacker;
      grid.get(3, 0)!.occupant = target;

      const ability = makeAbility({
        effects: [makeEffect("disp_pull", { distance: 2 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      const pos = world.getComponent<any>(target, "position");
      expect(pos.q).toBe(1);
      expect(pos.r).toBe(0);
    });
  });

  // ── #18: disp_dash reads damageOnArrival ──

  describe("disp_dash reads damageOnArrival param", () => {
    it("uses generated damage multiplier, not fallback 0.8", () => {
      const grid = makeMockGrid();
      const { executor, dc } = makeExecutor(grid);
      const world = makeWorld();

      const attacker = addUnit(world, { q: 0, r: 0 });
      const target = addUnit(world, { q: 2, r: 0 });

      grid.get(0, 0)!.occupant = attacker;
      grid.get(2, 0)!.occupant = target;

      const ability = makeAbility({
        effects: [makeEffect("disp_dash", { range: 3, damageOnArrival: 1.2 })],
      });

      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(dc.captured.length).toBe(1);
      expect(dc.captured[0]!.damageMultiplier).toBeCloseTo(1.2, 2);
    });
  });

  // ── Preview accuracy ──

  describe("preview", () => {
    it("uses multiplier for dmg_weapon preview", () => {
      const { executor } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("dmg_weapon", { multiplier: 1.4 })],
      });

      const preview = executor.preview(world, attacker, target, ability, TEST_WEAPON);
      // min: 20 * 1.4 = 28, max: 30 * 1.4 = 42
      expect(preview.estimatedDamage[0]).toBe(28);
      expect(preview.estimatedDamage[1]).toBe(42);
    });

    it("uses multPerHit for dmg_multihit preview", () => {
      const { executor } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("dmg_multihit", { hits: 3, multPerHit: 0.4 })],
      });

      const preview = executor.preview(world, attacker, target, ability, TEST_WEAPON);
      // min: 20 * 0.4 * 3 = 24, max: 30 * 0.4 * 3 = 36
      expect(preview.estimatedDamage[0]).toBe(24);
      expect(preview.estimatedDamage[1]).toBe(36);
    });
  });
});
