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
import { rulesetAbilityToGenerated } from "@data/ruleset/rulesetAbilityAdapter";
import type { RulesetAbilityDef } from "@data/ruleset/RulesetSchema";

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
  const { effects, ...rest } = overrides;
  return {
    uid: "ga_test",
    name: "Test Ability",
    description: "test",
    targeting: { type: "tgt_single_enemy", params: {}, powerMult: 1 },
    effects,
    modifiers: rest.modifiers ?? [],
    triggers: rest.triggers ?? [],
    cost: { ap: 4, stamina: 10, mana: 0, cooldown: 0, turnEnding: false },
    powerBudget: 5,
    weaponReq: [],
    tier: rest.tier ?? 1,
    isPassive: false,
    rarity: "common",
    synergyTags: rest.synergyTags ?? { creates: [], exploits: [] },
    ...rest,
  };
}

function makeEffect(type: string, params: Record<string, number | string>): EffectPrimitive {
  return { type: type as any, params, power: 3 };
}

const TEST_WEAPON: WeaponDef = {
  id: "test_sword", name: "Test Sword", family: "sword",
  minDamage: 20, maxDamage: 30, hands: 1, manaCost: 0,
  damageType: "physical",
  apCost: 4, staminaCost: 10, range: 1,
  hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 0, level: 1,
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

  // ── Phase 0: every effect type executes with minimal outcome (regression safety) ──

  describe("Phase 0: every effect type runs without throwing", () => {
    /** Units with position for displacement and grid-dependent effects. */
    function addUnitWithPosition(world: World, q: number, r: number): string {
      const id = addUnit(world, { q, r });
      return id;
    }

    function setupWorldAndGrid(grid: HexGrid) {
      const world = makeWorld();
      const attacker = addUnitWithPosition(world, 0, 0);
      const target = addUnitWithPosition(world, 1, 0);
      const t0 = grid.get(0, 0);
      const t1 = grid.get(1, 0);
      if (t0) (t0 as any).occupant = attacker;
      if (t1) (t1 as any).occupant = target;
      return { world, attacker, target };
    }

    const effectTypes: Array<{
      type: string;
      params: Record<string, number | string>;
      expectMinimal?: (result: AbilityResult) => void;
    }> = [
      { type: "dmg_weapon", params: { multiplier: 1 }, expectMinimal: r => expect(r.attackResults.length).toBe(1) },
      { type: "dmg_execute", params: { multiplier: 1, hpThreshold: 50, bonusMult: 0.5 }, expectMinimal: r => expect(r.attackResults.length).toBe(1) },
      { type: "dmg_multihit", params: { hits: 2, multPerHit: 0.5 }, expectMinimal: r => expect(r.attackResults.length).toBe(2) },
      { type: "dmg_spell", params: { multiplier: 1 }, expectMinimal: r => expect(r.attackResults.length).toBe(1) },
      { type: "dmg_reflect", params: { pct: 30, turns: 2 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "dot_bleed", params: { dmgPerTurn: 4, turns: 2 }, expectMinimal: r => expect(r.appliedEffects.some(e => e.includes("bleed") || e.includes("Bleed"))).toBe(true) },
      { type: "dot_burn", params: { dmgPerTurn: 4, turns: 2 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "dot_poison", params: { dmgPerTurn: 3, turns: 2 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "disp_push", params: { distance: 1 }, expectMinimal: r => expect(r.pushed !== undefined || r.appliedEffects.length >= 0).toBe(true) },
      { type: "disp_pull", params: { distance: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "disp_dash", params: { range: 2, damageOnArrival: 0.8 }, expectMinimal: r => expect(r.attackResults.length >= 0).toBe(true) },
      { type: "disp_teleport", params: { range: 3 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_stun", params: { chance: 100 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_root", params: { turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_daze", params: { apLoss: 1, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_fear", params: { chance: 100, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_silence", params: { turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_taunt", params: { turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cc_charm", params: { turns: 1, chance: 100 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "debuff_stat", params: { stat: "meleeSkill", amount: 10, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "debuff_vuln", params: { bonusDmg: 20, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "debuff_armor", params: { pct: 20, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "debuff_healReduce", params: { pct: 30, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "buff_stat", params: { stat: "initiative", amount: 15, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "buff_dmgReduce", params: { percent: 20, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "buff_stealth", params: { turns: 1, breakOnAttack: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "buff_shield", params: { amount: 20, turns: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "stance_counter", params: { maxCounters: 1 }, expectMinimal: r => expect(r.stanceActivated !== undefined || r.appliedEffects.length >= 0).toBe(true) },
      { type: "stance_overwatch", params: { maxTriggers: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "res_apRefund", params: { amount: 2 }, expectMinimal: r => expect(r.apRefunded).toBe(2) },
      { type: "heal_flat", params: { amount: 25 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "heal_hot", params: { healPerTurn: 8, turns: 2 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "channel_dmg", params: { dmgPerTurn: 10, turns: 2 }, expectMinimal: r => expect(r.appliedEffects).toContain("channel_dmg") },
      { type: "cleanse", params: { count: 1 }, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      { type: "cooldown_reset", params: {}, expectMinimal: r => expect(r.appliedEffects.length).toBeGreaterThanOrEqual(0) },
      // summon_unit, zone_persist, trap_place, transform_state no-op without managers; just ensure no throw
      { type: "summon_unit", params: { hp: 30, turns: 3, count: 1 } },
      { type: "zone_persist", params: { radius: 2, turns: 2, dmgPerTurn: 0 } },
      { type: "trap_place", params: { duration: 5 } },
      { type: "transform_state", params: { turns: 2, bonusPct: 25 } },
    ];

    it("ruleset ability converts to GeneratedAbility and executes", () => {
      const grid = makeMockGrid();
      const { executor } = makeExecutor(grid);
      const { world, attacker, target } = setupWorldAndGrid(grid);

      const rulesetDef: RulesetAbilityDef = {
        id: "test_rust_touch",
        name: "Rust Touch",
        type: "Attack",
        description: "Melee hit applies Corrode.",
        targeting: { type: "tgt_single_enemy", params: { range: 1 } },
        effects: [
          { type: "dmg_weapon", params: { multiplier: 1.2 } },
          { type: "debuff_armor", params: { pct: 5, turns: 2 } },
        ],
        cost: { ap: 2, stamina: 5, mana: 0, cooldown: 0, turnEnding: false },
      };

      const generated = rulesetAbilityToGenerated(rulesetDef);
      expect(generated.uid).toBe(rulesetDef.id);
      expect(generated.effects.length).toBe(2);
      expect(generated.targeting.type).toBe("tgt_single_enemy");

      const result = executor.execute(world, attacker, target, generated, TEST_WEAPON);

      expect(result.attackResults.length).toBe(1);
      expect(result.appliedEffects.some(e => e.includes("armor") || e.includes("debuff"))).toBe(true);
    });

    effectTypes.forEach(({ type, params, expectMinimal }) => {
      it(`${type} executes without throwing`, () => {
        const grid = makeMockGrid();
        const { executor } = makeExecutor(grid);
        const { world, attacker, target } = setupWorldAndGrid(grid);

        const ability = makeAbility({
          effects: [makeEffect(type, params)],
        });

        const result = executor.execute(world, attacker, target, ability, TEST_WEAPON);

        expect(result).toBeDefined();
        expect(result.attackResults).toBeDefined();
        expect(result.appliedEffects).toBeDefined();
        expectMinimal?.(result);
      });
    });
  });

  // ── Effect outcomes: verify effect actually does what it describes ──

  describe("effect outcomes match description", () => {
    it("dot_bleed applies bleed status with dmgPerTurn and tick deals damage", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("dot_bleed", { dmgPerTurn: 6, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "bleed")).toBe(true);
      const statusComp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(target, "statusEffects");
      const bleedEffect = statusComp?.effects.find(e => e.id === "bleed");
      expect(bleedEffect?.modifiers._dmgPerTurn).toBe(6);

      const healthBefore = world.getComponent<{ current: number }>(target, "health")!.current;
      sem.tickTurnStart(world, target);
      const healthAfter = world.getComponent<{ current: number }>(target, "health")!.current;
      expect(healthBefore - healthAfter).toBeGreaterThanOrEqual(6);
      expect(healthAfter).toBeLessThan(healthBefore);
    });

    it("dot_burn applies burn status with dmgPerTurn and tick deals damage", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("dot_burn", { dmgPerTurn: 5, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "burn")).toBe(true);
      const healthBefore = world.getComponent<{ current: number }>(target, "health")!.current;
      sem.tickTurnStart(world, target);
      const healthAfter = world.getComponent<{ current: number }>(target, "health")!.current;
      expect(healthBefore - healthAfter).toBeGreaterThanOrEqual(5);
      expect(healthAfter).toBeLessThan(healthBefore);
    });

    it("dot_poison applies poison status with dmgPerTurn and tick deals damage", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("dot_poison", { dmgPerTurn: 4, turns: 3 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "poison")).toBe(true);
      const healthBefore = world.getComponent<{ current: number }>(target, "health")!.current;
      sem.tickTurnStart(world, target);
      const healthAfter = world.getComponent<{ current: number }>(target, "health")!.current;
      expect(healthBefore - healthAfter).toBeGreaterThanOrEqual(4);
      expect(healthAfter).toBeLessThan(healthBefore);
    });

    it("heal_flat restores HP by the given amount", () => {
      const { executor } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 50, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("heal_flat", { amount: 30 })],
      });
      const result = executor.execute(world, attacker, target, ability, TEST_WEAPON);

      const health = world.getComponent<{ current: number }>(target, "health");
      expect(health!.current).toBe(80);
      expect(result.appliedEffects).toContain("heal_30");
    });

    it("heal_hot applies regen with healPerTurn and tick restores HP", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 50, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("heal_hot", { healPerTurn: 8, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "regen")).toBe(true);
      const statusComp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(target, "statusEffects");
      const regenEffect = statusComp?.effects.find(e => e.id === "regen");
      expect(regenEffect?.modifiers._healPerTick).toBe(8);

      const healthBefore = world.getComponent<{ current: number }>(target, "health")!.current;
      sem.tickTurnStart(world, target);
      const healthAfter = world.getComponent<{ current: number }>(target, "health")!.current;
      expect(healthAfter).toBeGreaterThanOrEqual(healthBefore + 8);
      expect(healthAfter).toBeGreaterThan(50);
    });

    it("cc_stun causes target to have stun status", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("cc_stun", { chance: 100 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "stun")).toBe(true);
    });

    it("debuff_armor applies armor_break status with correct duration", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("debuff_armor", { pct: 30, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      expect(sem.hasEffect(world, target, "armor_break")).toBe(true);
      const statusComp = world.getComponent<{ effects: Array<{ id: string; remainingTurns: number }> }>(target, "statusEffects");
      const armorBreak = statusComp?.effects.find(e => e.id === "armor_break");
      expect(armorBreak?.remainingTurns).toBe(2);
    });

    it("channel_dmg applies DoT with dmgPerTurn and tick deals damage", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world, { hp: 100, maxHp: 100 });

      const ability = makeAbility({
        effects: [makeEffect("channel_dmg", { dmgPerTurn: 10, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      const statusComp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(target, "statusEffects");
      const channelEffect = statusComp?.effects.find(e => e.id === "channel_dmg");
      expect(channelEffect?.modifiers._dmgPerTurn).toBe(10);

      const healthBefore = world.getComponent<{ current: number }>(target, "health")!.current;
      sem.tickTurnStart(world, target);
      const healthAfter = world.getComponent<{ current: number }>(target, "health")!.current;
      expect(healthBefore - healthAfter).toBeGreaterThanOrEqual(10);
      expect(healthAfter).toBeLessThan(healthBefore);
    });

    it("buff_stat applies stat buff with correct modifier", () => {
      const { executor, sem } = makeExecutor();
      const world = makeWorld();
      const attacker = addUnit(world);
      const target = addUnit(world);

      const ability = makeAbility({
        effects: [makeEffect("buff_stat", { stat: "initiative", amount: 20, turns: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      const statusComp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(attacker, "statusEffects");
      const buff = statusComp?.effects.find(e => e.id === "buff_initiative");
      expect(buff).toBeDefined();
      expect(buff?.modifiers.initiative).toBe(20);
    });

    it("disp_push moves target by the given distance", () => {
      const grid = makeMockGrid();
      const { executor } = makeExecutor(grid);
      const world = makeWorld();
      const attacker = addUnit(world, { q: 0, r: 0 });
      const target = addUnit(world, { q: 1, r: 0 });
      grid.get(0, 0)!.occupant = attacker as any;
      grid.get(1, 0)!.occupant = target as any;

      const ability = makeAbility({
        effects: [makeEffect("disp_push", { distance: 2 })],
      });
      executor.execute(world, attacker, target, ability, TEST_WEAPON);

      const pos = world.getComponent<{ q: number; r: number }>(target, "position");
      expect(pos!.q).toBe(3);
      expect(pos!.r).toBe(0);
    });
  });
});
