import { describe, it, expect } from "vitest";
import { RNG } from "@utils/RNG";
import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import { DamageCalculator, type AttackResult } from "@combat/DamageCalculator";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import type { EntityId } from "@entities/Entity";

// ── RNG tests (kept from Phase 1) ──

describe("RNG", () => {
  it("produces deterministic results from same seed", () => {
    const rng1 = new RNG(42);
    const rng2 = new RNG(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    }
  });

  it("nextFloat returns values in [0, 1)", () => {
    const rng = new RNG(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextFloat();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("nextInt returns values in [min, max] inclusive", () => {
    const rng = new RNG(456);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });

  it("roll returns boolean", () => {
    const rng = new RNG(789);
    let trueCount = 0;
    let falseCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.roll(50)) {
        trueCount++;
      } else {
        falseCount++;
      }
    }
    // With 50% probability, both should be roughly 500 +/- 100
    expect(trueCount).toBeGreaterThan(350);
    expect(falseCount).toBeGreaterThan(350);
  });

  it("roll(0) always returns false", () => {
    const rng = new RNG(111);
    for (let i = 0; i < 100; i++) {
      expect(rng.roll(0)).toBe(false);
    }
  });

  it("roll(100) always returns true", () => {
    const rng = new RNG(222);
    for (let i = 0; i < 100; i++) {
      expect(rng.roll(100)).toBe(true);
    }
  });

  it("state save/restore produces same sequence", () => {
    const rng = new RNG(333);
    // Advance a bit
    for (let i = 0; i < 50; i++) rng.nextFloat();

    const state = rng.getState();
    const val1 = rng.nextFloat();
    const val2 = rng.nextFloat();

    rng.setState(state);
    expect(rng.nextFloat()).toBe(val1);
    expect(rng.nextFloat()).toBe(val2);
  });
});

// ── Pure math tests (kept from Phase 1) ──

describe("Damage Calculation Math", () => {
  it("hit chance clamps to 5-95", () => {
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    expect(clamp(120, 5, 95)).toBe(95);
    expect(clamp(-20, 5, 95)).toBe(5);
    expect(clamp(65, 5, 95)).toBe(65);
  });

  it("flat armor reduction below soft cap", () => {
    // Armor <= SOFT_CAP (10): reduction = armor
    const SOFT_CAP = 10;
    const DIMINISH_RATE = 0.5;

    // 5 armor → reduces 5 damage
    const armor5 = Math.min(5, SOFT_CAP) + Math.max(0, 5 - SOFT_CAP) * DIMINISH_RATE;
    expect(armor5).toBe(5);

    // 10 armor → reduces 10 damage (at soft cap)
    const armor10 = Math.min(10, SOFT_CAP) + Math.max(0, 10 - SOFT_CAP) * DIMINISH_RATE;
    expect(armor10).toBe(10);
  });

  it("armor reduction diminishes above soft cap", () => {
    const SOFT_CAP = 10;
    const DIMINISH_RATE = 0.5;

    // 15 armor → 10 + (15-10)*0.5 = 12.5
    const armor15 = Math.min(15, SOFT_CAP) + Math.max(0, 15 - SOFT_CAP) * DIMINISH_RATE;
    expect(armor15).toBe(12.5);

    // 20 armor → 10 + (20-10)*0.5 = 15
    const armor20 = Math.min(20, SOFT_CAP) + Math.max(0, 20 - SOFT_CAP) * DIMINISH_RATE;
    expect(armor20).toBe(15);

    // 30 armor → 10 + (30-10)*0.5 = 20
    const armor30 = Math.min(30, SOFT_CAP) + Math.max(0, 30 - SOFT_CAP) * DIMINISH_RATE;
    expect(armor30).toBe(20);
  });

  it("minimum 1 HP damage after armor reduction", () => {
    // Even if armor > raw damage, min 1 HP damage
    const rawDamage = 5;
    const reduction = 10; // armor absorbs more than raw
    const hpDamage = Math.max(1, rawDamage - reduction);
    expect(hpDamage).toBe(1);
  });
});

// ── Weapon-based DamageCalculator integration tests ──

/** Create a minimal hex grid for testing. */
function createTestGrid(): HexGrid {
  const grid = new HexGrid();
  for (let q = 0; q < 5; q++) {
    for (let r = 0; r < 5; r++) {
      grid.set(q, r, {
        q, r, elevation: 0, occupant: null,
        terrain: TerrainType.Grass, blocksLoS: false,
        movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0,
      });
    }
  }
  return grid;
}

/** Spawn a test entity with stats, health, equipment, armor, and optional position. */
function spawnTestUnit(
  world: World,
  opts: {
    melee?: number;
    defense?: number;
    hp?: number;
    weapon?: string | null;
    shield?: string | null;
    bodyArmor?: number;
    headArmor?: number;
    q?: number;
    r?: number;
    elevation?: number;
    isEnemy?: boolean;
  },
): EntityId {
  const id = world.createEntity();

  world.addComponent(id, {
    type: "stats",
    hitpoints: opts.hp ?? 100,
    stamina: 100,
    mana: 20,
    resolve: 50,
    initiative: 100,
    meleeSkill: opts.melee ?? 70,
    rangedSkill: 30,
    dodge: opts.defense ?? 10,
    magicResist: 0,
    critChance: 5,
    critMultiplier: 1.5,
    movementPoints: 8,
    level: 1,
    experience: 0,
  });

  world.addComponent(id, {
    type: "health",
    current: opts.hp ?? 100,
    max: opts.hp ?? 100,
    injuries: [],
  });

  world.addComponent(id, {
    type: "equipment",
    mainHand: opts.weapon ?? null,
    offHand: opts.shield ?? null,
    accessory: null,
    bag: [],
  });

  world.addComponent(id, {
    type: "armor",
    head: opts.headArmor != null
      ? { id: "test_head", armor: opts.headArmor, magicResist: 0 }
      : null,
    body: opts.bodyArmor != null
      ? { id: "test_body", armor: opts.bodyArmor, magicResist: 0 }
      : null,
  });

  if (opts.q != null && opts.r != null) {
    world.addComponent(id, {
      type: "position",
      q: opts.q,
      r: opts.r,
      elevation: opts.elevation ?? 0,
      facing: 0,
    });
  }

  if (opts.isEnemy) {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType: "aggressive" as const,
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }

  // Required for status-effect dodge modifier tests
  world.addComponent(id, { type: "statusEffects", effects: [] });

  return id;
}

describe("DamageCalculator (weapon-based)", () => {
  it("uses weapon damage range", () => {
    const world = new World();
    const grid = createTestGrid();

    // Arming sword: 4-6 damage (crits can push to floor(6*1.5)=9)
    const attacker = spawnTestUnit(world, { melee: 95, weapon: "arming_sword" });
    const defender = spawnTestUnit(world, { defense: 0, hp: 200, bodyArmor: 0 });

    const results: AttackResult[] = [];
    for (let seed = 1; seed <= 100; seed++) {
      // Reset defender health
      const health = world.getComponent<{ type: "health"; current: number; max: number }>(defender, "health")!;
      health.current = 200;

      const calc = new DamageCalculator(new RNG(seed), grid);
      const result = calc.resolveMelee(world, attacker, defender);
      if (result.hit) results.push(result);
    }

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      if (r.critical) {
        // Crit: damage = floor(raw * 1.5), max = floor(6*1.5) = 9
        expect(r.damage).toBeGreaterThanOrEqual(Math.floor(4 * 1.5));
        expect(r.damage).toBeLessThanOrEqual(Math.floor(6 * 1.5));
      } else {
        expect(r.damage).toBeGreaterThanOrEqual(4);
        expect(r.damage).toBeLessThanOrEqual(6);
      }
      expect(r.weaponId).toBe("arming_sword");
    }
  });

  it("falls back to UNARMED when no weapon equipped", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 95, weapon: null });
    const defender = spawnTestUnit(world, { defense: 0, hp: 200 });

    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, attacker, defender);

    if (result.hit) {
      // UNARMED: 1-2 damage
      expect(result.damage).toBeGreaterThanOrEqual(1);
      expect(result.damage).toBeLessThanOrEqual(2);
      expect(result.weaponId).toBe("unarmed");
    }
  });

  it("armor reduces HP damage", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 95, weapon: "arming_sword" });
    const defender = spawnTestUnit(world, { defense: 0, hp: 200, bodyArmor: 5 });

    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, attacker, defender);

    if (result.hit) {
      // With 5 body armor, reduction = 5 (below soft cap)
      expect(result.armorReduction).toBeGreaterThan(0);
      expect(result.hpDamage).toBeLessThan(result.damage);
      expect(result.hpDamage).toBeGreaterThanOrEqual(1);
    }
  });

  it("shield defense bonus reduces hit chance", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword" });
    // Heater shield: +20 melee def bonus
    const withShield = spawnTestUnit(world, { defense: 10, shield: "heater_shield", hp: 200 });
    const noShield = spawnTestUnit(world, { defense: 10, hp: 200 });

    // Run many trials and compare hit rates
    let hitsWithShield = 0;
    let hitsNoShield = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      // Reset health
      const hw = world.getComponent<{ type: "health"; current: number; max: number }>(withShield, "health")!;
      hw.current = 200;
      const hn = world.getComponent<{ type: "health"; current: number; max: number }>(noShield, "health")!;
      hn.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid);
      if (calc1.resolveMelee(world, attacker, withShield).hit) hitsWithShield++;

      const calc2 = new DamageCalculator(new RNG(seed), grid);
      if (calc2.resolveMelee(world, attacker, noShield).hit) hitsNoShield++;
    }

    // With shield should have significantly fewer hits
    expect(hitsWithShield).toBeLessThan(hitsNoShield);
    // The difference should be substantial (shield adds 20 defense)
    const hitRateWithShield = hitsWithShield / trials;
    const hitRateNoShield = hitsNoShield / trials;
    expect(hitRateNoShield - hitRateWithShield).toBeGreaterThan(0.1);
  });

  it("weapon hit chance bonus affects hit rate", () => {
    const world = new World();
    const grid = createTestGrid();

    // Spear: +20 hit bonus vs arming sword: +5 hit bonus
    const spearman = spawnTestUnit(world, { melee: 50, weapon: "spear" });
    const swordsman = spawnTestUnit(world, { melee: 50, weapon: "arming_sword" });
    const target = spawnTestUnit(world, { defense: 30, hp: 200 });

    let spearHits = 0;
    let swordHits = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const health = world.getComponent<{ type: "health"; current: number; max: number }>(target, "health")!;
      health.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid);
      if (calc1.resolveMelee(world, spearman, target).hit) spearHits++;

      health.current = 200;
      const calc2 = new DamageCalculator(new RNG(seed), grid);
      if (calc2.resolveMelee(world, swordsman, target).hit) swordHits++;
    }

    // Spear should hit more often (+20 vs +5)
    expect(spearHits).toBeGreaterThan(swordHits);
  });

  it("critical hits apply multiplied damage", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 95, weapon: "arming_sword" });

    // Run many attacks, collect crits and non-crits
    const critDamages: { raw: number; hp: number }[] = [];
    const normalDamages: { raw: number; hp: number }[] = [];

    for (let seed = 1; seed <= 500; seed++) {
      // No armor so damage pipeline is simple: all damage goes to HP
      const defender = spawnTestUnit(world, { defense: 0, hp: 200 });

      const calc = new DamageCalculator(new RNG(seed), grid);
      const result = calc.resolveMelee(world, attacker, defender);
      if (!result.hit) continue;

      if (result.critical) {
        critDamages.push({ raw: result.damage, hp: result.hpDamage });
      } else {
        normalDamages.push({ raw: result.damage, hp: result.hpDamage });
      }

      world.destroyEntity(defender);
    }

    // Should have some crits (base 5% chance)
    expect(critDamages.length).toBeGreaterThan(0);
    expect(normalDamages.length).toBeGreaterThan(0);

    // Normal hits (no armor): HP damage = raw damage
    for (const d of normalDamages) {
      expect(d.hp).toBe(d.raw);
    }

    // Crits should deal more than the normal damage range
    // (damage field already includes the crit multiplier)
    const avgCrit = critDamages.reduce((s, d) => s + d.hp, 0) / critDamages.length;
    const avgNormal = normalDamages.reduce((s, d) => s + d.hp, 0) / normalDamages.length;
    expect(avgCrit).toBeGreaterThan(avgNormal);
  });

  it("no armor means full damage to HP", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 95, weapon: "arming_sword" });
    const defender = spawnTestUnit(world, { defense: 0, hp: 200 }); // no armor at all

    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, attacker, defender);

    if (result.hit && !result.critical) {
      // No armor → no reduction → all raw damage goes to HP
      expect(result.hpDamage).toBe(result.damage);
      expect(result.armorReduction).toBe(0);
    }
  });

  it("returns miss result for non-existent components", () => {
    const world = new World();
    const grid = createTestGrid();
    const noStats = world.createEntity();
    const defender = spawnTestUnit(world, {});

    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, noStats, defender);
    expect(result.hit).toBe(false);
    expect(result.hitChance).toBe(0);
  });
});

// ── R1: Evasion / dodge in hit resolution ──

describe("DamageCalculator (evasion / dodge)", () => {
  it("defender dodge stat reduces hit chance (preview)", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 70, weapon: "arming_sword" });
    const lowDodge = spawnTestUnit(world, { defense: 10, hp: 200 });
    const highDodge = spawnTestUnit(world, { defense: 50, hp: 200 });

    const calc = new DamageCalculator(new RNG(42), grid);

    const previewLow = calc.previewMelee(world, attacker, lowDodge);
    const previewHigh = calc.previewMelee(world, attacker, highDodge);

    // Hit chance = meleeSkill + weaponBonus - dodge (arming_sword +5)
    // Low: 70 + 5 - 10 = 65
    // High: 70 + 5 - 50 = 25 (clamped to 5-95)
    expect(previewLow.hitChance).toBe(65);
    expect(previewHigh.hitChance).toBe(25);
    expect(previewHigh.hitChance).toBeLessThan(previewLow.hitChance);
  });

  it("defender dodge stat reduces hit rate over many resolveMelee trials", () => {
    const world = new World();
    const grid = createTestGrid();

    const attacker = spawnTestUnit(world, { melee: 60, weapon: "arming_sword" });
    const lowDodge = spawnTestUnit(world, { defense: 10, hp: 200 });
    const highDodge = spawnTestUnit(world, { defense: 45, hp: 200 });

    let hitsLow = 0;
    let hitsHigh = 0;
    const trials = 2000;

    for (let seed = 1; seed <= trials; seed++) {
      const healthLow = world.getComponent<{ current: number; max: number }>(lowDodge, "health")!;
      const healthHigh = world.getComponent<{ current: number; max: number }>(highDodge, "health")!;
      healthLow.current = 200;
      healthHigh.current = 200;

      const calc = new DamageCalculator(new RNG(seed), grid);
      if (calc.resolveMelee(world, attacker, lowDodge).hit) hitsLow++;
      if (calc.resolveMelee(world, attacker, highDodge).hit) hitsHigh++;
    }

    expect(hitsHigh).toBeLessThan(hitsLow);
    const rateLow = hitsLow / trials;
    const rateHigh = hitsHigh / trials;
    expect(rateLow - rateHigh).toBeGreaterThan(0.15);
  });

  it("dodge buff from status effect reduces hit chance (preview)", () => {
    const world = new World();
    const grid = createTestGrid();
    const rng = new RNG(42);
    const sem = new StatusEffectManager(rng);
    const calc = new DamageCalculator(rng, grid);
    calc.setStatusEffectManager(sem);

    const attacker = spawnTestUnit(world, { melee: 70, weapon: "arming_sword" });
    const defender = spawnTestUnit(world, { defense: 10, hp: 200 });

    const previewBefore = calc.previewMelee(world, attacker, defender);
    expect(previewBefore.hitChance).toBe(65);

    sem.applyDynamic(world, defender, {
      id: "buff_dodge",
      name: "Evasion",
      duration: 2,
      modifiers: { dodge: 20 },
    });

    const previewAfter = calc.previewMelee(world, attacker, defender);
    // 70 + 5 - (10 + 20) = 45
    expect(previewAfter.hitChance).toBe(45);
    expect(previewAfter.hitChance).toBeLessThan(previewBefore.hitChance);
  });

  it("dodge buff from status effect reduces hit rate in resolveMelee", () => {
    const world = new World();
    const grid = createTestGrid();
    const sem = new StatusEffectManager(new RNG(999));

    const attacker = spawnTestUnit(world, { melee: 60, weapon: "arming_sword" });
    const noBuff = spawnTestUnit(world, { defense: 15, hp: 200 });
    const withBuff = spawnTestUnit(world, { defense: 15, hp: 200 });
    sem.applyDynamic(world, withBuff, {
      id: "buff_dodge",
      name: "Evasion",
      duration: 99,
      modifiers: { dodge: 25 },
    });

    let hitsNoBuff = 0;
    let hitsWithBuff = 0;
    const trials = 2000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world.getComponent<{ current: number; max: number }>(noBuff, "health")!;
      const h2 = world.getComponent<{ current: number; max: number }>(withBuff, "health")!;
      h1.current = 200;
      h2.current = 200;

      const calc = new DamageCalculator(new RNG(seed), grid);
      calc.setStatusEffectManager(sem);
      if (calc.resolveMelee(world, attacker, noBuff).hit) hitsNoBuff++;
      if (calc.resolveMelee(world, attacker, withBuff).hit) hitsWithBuff++;
    }

    expect(hitsWithBuff).toBeLessThan(hitsNoBuff);
  });
});

// ── Terrain, Elevation, and Surrounding modifier tests ──

describe("DamageCalculator (terrain/elevation/surrounding)", () => {
  it("elevation advantage increases hit rate", () => {
    // Scenario 1: attacker on elev 1, defender on elev 0 → +10 bonus
    const world1 = new World();
    const grid1 = createTestGrid();
    grid1.get(1, 1)!.elevation = 1;

    const attacker1 = spawnTestUnit(world1, { melee: 50, weapon: "arming_sword", q: 1, r: 1, elevation: 1 });
    const defender1 = spawnTestUnit(world1, { defense: 30, hp: 200, q: 2, r: 1 });

    // Scenario 2: both at elev 0 → no bonus
    const world2 = new World();
    const grid2 = createTestGrid();

    const attacker2 = spawnTestUnit(world2, { melee: 50, weapon: "arming_sword", q: 1, r: 1 });
    const defender2 = spawnTestUnit(world2, { defense: 30, hp: 200, q: 2, r: 1 });

    let hitsHigh = 0;
    let hitsSame = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world1.getComponent<{ type: "health"; current: number; max: number }>(defender1, "health")!;
      h1.current = 200;
      const h2 = world2.getComponent<{ type: "health"; current: number; max: number }>(defender2, "health")!;
      h2.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid1);
      if (calc1.resolveMelee(world1, attacker1, defender1).hit) hitsHigh++;

      const calc2 = new DamageCalculator(new RNG(seed), grid2);
      if (calc2.resolveMelee(world2, attacker2, defender2).hit) hitsSame++;
    }

    // Elevation advantage (+10) should produce more hits
    expect(hitsHigh).toBeGreaterThan(hitsSame);
    const diff = (hitsHigh - hitsSame) / trials;
    expect(diff).toBeGreaterThan(0.05);
  });

  it("elevation disadvantage decreases hit rate", () => {
    // Scenario 1: attacker at elev 0, defender at elev 1 → -10 penalty
    const world1 = new World();
    const grid1 = createTestGrid();
    grid1.get(2, 1)!.elevation = 1;

    const attacker1 = spawnTestUnit(world1, { melee: 50, weapon: "arming_sword", q: 1, r: 1 });
    const defenderHigh = spawnTestUnit(world1, { defense: 30, hp: 200, q: 2, r: 1, elevation: 1 });

    // Scenario 2: both at elev 0 → no penalty
    const world2 = new World();
    const grid2 = createTestGrid();

    const attacker2 = spawnTestUnit(world2, { melee: 50, weapon: "arming_sword", q: 1, r: 1 });
    const defenderSame = spawnTestUnit(world2, { defense: 30, hp: 200, q: 2, r: 1 });

    let hitsUphill = 0;
    let hitsSame = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world1.getComponent<{ type: "health"; current: number; max: number }>(defenderHigh, "health")!;
      h1.current = 200;
      const h2 = world2.getComponent<{ type: "health"; current: number; max: number }>(defenderSame, "health")!;
      h2.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid1);
      if (calc1.resolveMelee(world1, attacker1, defenderHigh).hit) hitsUphill++;

      const calc2 = new DamageCalculator(new RNG(seed), grid2);
      if (calc2.resolveMelee(world2, attacker2, defenderSame).hit) hitsSame++;
    }

    // Attacking uphill (-10) should produce fewer hits
    expect(hitsUphill).toBeLessThan(hitsSame);
  });

  it("terrain defense bonus reduces hit rate", () => {
    const world = new World();
    const grid = createTestGrid();

    // Set tile (2,1) to hills with +5 melee defense bonus
    const hillTile = grid.get(2, 1)!;
    hillTile.terrain = TerrainType.Hills;
    hillTile.defenseBonusMelee = 5;

    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword", q: 1, r: 1 });
    const defenderOnHills = spawnTestUnit(world, { defense: 30, hp: 200, q: 2, r: 1 });
    const defenderOnGrass = spawnTestUnit(world, { defense: 30, hp: 200, q: 0, r: 1 });

    let hitsHills = 0;
    let hitsGrass = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world.getComponent<{ type: "health"; current: number; max: number }>(defenderOnHills, "health")!;
      h1.current = 200;
      const h2 = world.getComponent<{ type: "health"; current: number; max: number }>(defenderOnGrass, "health")!;
      h2.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid);
      if (calc1.resolveMelee(world, attacker, defenderOnHills).hit) hitsHills++;

      const calc2 = new DamageCalculator(new RNG(seed), grid);
      if (calc2.resolveMelee(world, attacker, defenderOnGrass).hit) hitsGrass++;
    }

    // Defender on hills should be hit less often
    expect(hitsHills).toBeLessThan(hitsGrass);
  });

  it("surrounding bonus increases hit rate", () => {
    const world = new World();
    const grid = createTestGrid();

    // Place an enemy defender at (2,2)
    const defender = spawnTestUnit(world, { defense: 30, hp: 200, q: 2, r: 2, isEnemy: true });
    grid.get(2, 2)!.occupant = defender;

    // Player attacker at (2,1) — adjacent to defender
    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword", q: 2, r: 1 });
    grid.get(2, 1)!.occupant = attacker;

    // Ally at (3,2) — also adjacent to defender (provides surrounding bonus)
    const ally = spawnTestUnit(world, { melee: 50, hp: 100, q: 3, r: 2 });
    grid.get(3, 2)!.occupant = ally;

    // Another scenario without the ally
    const world2 = new World();
    const grid2 = createTestGrid();

    const defender2 = spawnTestUnit(world2, { defense: 30, hp: 200, q: 2, r: 2, isEnemy: true });
    grid2.get(2, 2)!.occupant = defender2;
    const attacker2 = spawnTestUnit(world2, { melee: 50, weapon: "arming_sword", q: 2, r: 1 });
    grid2.get(2, 1)!.occupant = attacker2;

    let hitsSurrounded = 0;
    let hitsAlone = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world.getComponent<{ type: "health"; current: number; max: number }>(defender, "health")!;
      h1.current = 200;
      const h2 = world2.getComponent<{ type: "health"; current: number; max: number }>(defender2, "health")!;
      h2.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid);
      if (calc1.resolveMelee(world, attacker, defender).hit) hitsSurrounded++;

      const calc2 = new DamageCalculator(new RNG(seed), grid2);
      if (calc2.resolveMelee(world2, attacker2, defender2).hit) hitsAlone++;
    }

    // With 2 allies adjacent (attacker + ally), bonus = (2-1)*5 = +5
    // Should produce more hits
    expect(hitsSurrounded).toBeGreaterThan(hitsAlone);
  });

  it("surrounding bonus scales with ally count", () => {
    // 3 allies adjacent = (3-1)*5 = +10 bonus
    const world = new World();
    const grid = createTestGrid();

    const defender = spawnTestUnit(world, { defense: 30, hp: 200, q: 2, r: 2, isEnemy: true });
    grid.get(2, 2)!.occupant = defender;

    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword", q: 2, r: 1 });
    grid.get(2, 1)!.occupant = attacker;

    const ally1 = spawnTestUnit(world, { melee: 50, hp: 100, q: 3, r: 2 });
    grid.get(3, 2)!.occupant = ally1;

    const ally2 = spawnTestUnit(world, { melee: 50, hp: 100, q: 1, r: 2 });
    grid.get(1, 2)!.occupant = ally2;

    // Scenario with only 1 ally (2 total adjacent = +5)
    const world2 = new World();
    const grid2 = createTestGrid();

    const defender2 = spawnTestUnit(world2, { defense: 30, hp: 200, q: 2, r: 2, isEnemy: true });
    grid2.get(2, 2)!.occupant = defender2;
    const attacker2 = spawnTestUnit(world2, { melee: 50, weapon: "arming_sword", q: 2, r: 1 });
    grid2.get(2, 1)!.occupant = attacker2;
    const singleAlly = spawnTestUnit(world2, { melee: 50, hp: 100, q: 3, r: 2 });
    grid2.get(3, 2)!.occupant = singleAlly;

    let hits3allies = 0;
    let hits2allies = 0;
    const trials = 5000;

    for (let seed = 1; seed <= trials; seed++) {
      const h1 = world.getComponent<{ type: "health"; current: number; max: number }>(defender, "health")!;
      h1.current = 200;
      const h2 = world2.getComponent<{ type: "health"; current: number; max: number }>(defender2, "health")!;
      h2.current = 200;

      const calc1 = new DamageCalculator(new RNG(seed), grid);
      if (calc1.resolveMelee(world, attacker, defender).hit) hits3allies++;

      const calc2 = new DamageCalculator(new RNG(seed), grid2);
      if (calc2.resolveMelee(world2, attacker2, defender2).hit) hits2allies++;
    }

    // 3 allies (+10) should hit more than 2 allies (+5)
    expect(hits3allies).toBeGreaterThan(hits2allies);
  });

  it("all modifiers stack correctly", () => {
    const world = new World();
    const grid = createTestGrid();

    // Setup: attacker on elevation 1, defender on hills (def+5) at elevation 0,
    // plus an ally adjacent to defender
    const tile11 = grid.get(1, 1)!;
    tile11.elevation = 1;
    const tile21 = grid.get(2, 1)!;
    tile21.defenseBonusMelee = 5;

    const defender = spawnTestUnit(world, { defense: 30, hp: 200, q: 2, r: 1, isEnemy: true });
    grid.get(2, 1)!.occupant = defender;

    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword", q: 1, r: 1, elevation: 1 });
    grid.get(1, 1)!.occupant = attacker;

    const ally = spawnTestUnit(world, { melee: 50, hp: 100, q: 3, r: 1 });
    grid.get(3, 1)!.occupant = ally;

    // Expected hit chance:
    // base: 50 (melee) + 5 (sword bonus) - 30 (defense) = 25
    // terrain: -5 (hills)
    // elevation: +10 (1 level advantage)
    // surrounding: +5 (2 allies adjacent - 1 = 1, * 5)
    // total: 25 - 5 + 10 + 5 = 35

    // Verify via a deterministic trial
    // Use a seed that produces a roll in a diagnostic range
    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, attacker, defender);
    // The hitChance field should reflect all modifiers
    expect(result.hitChance).toBe(35);
  });

  it("dead allies do not count for surrounding bonus", () => {
    const world = new World();
    const grid = createTestGrid();

    const defender = spawnTestUnit(world, { defense: 30, hp: 200, q: 2, r: 2, isEnemy: true });
    grid.get(2, 2)!.occupant = defender;

    const attacker = spawnTestUnit(world, { melee: 50, weapon: "arming_sword", q: 2, r: 1 });
    grid.get(2, 1)!.occupant = attacker;

    // Dead ally adjacent to defender
    const deadAlly = spawnTestUnit(world, { melee: 50, hp: 0, q: 3, r: 2 });
    const deadHealth = world.getComponent<{ type: "health"; current: number; max: number }>(deadAlly, "health")!;
    deadHealth.current = 0;
    grid.get(3, 2)!.occupant = deadAlly;

    // Hit chance should NOT include surrounding bonus from dead ally
    // base: 50 + 5 - 30 = 25, no surrounding bonus
    const calc = new DamageCalculator(new RNG(42), grid);
    const result = calc.resolveMelee(world, attacker, defender);
    expect(result.hitChance).toBe(25);
  });
});
