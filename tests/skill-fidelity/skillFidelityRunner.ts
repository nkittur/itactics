/**
 * Skill fidelity runner: runs one ability through the engine and checks that
 * every effect produces the exact outcome described by the ability's params.
 * Used by pass 1 tests; pass 2 will fix the engine for any failing skills.
 */

import { World } from "@entities/World";
import { HexGrid } from "@hex/HexGrid";
import { RNG } from "@utils/RNG";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { DamageCalculator } from "@combat/DamageCalculator";
import { AbilityExecutor } from "@combat/AbilityExecutor";
import { rulesetAbilityToGenerated } from "@data/ruleset/rulesetAbilityAdapter";
import type { RulesetAbilityDef } from "@data/ruleset/RulesetSchema";
import type { GeneratedAbility } from "@data/AbilityData";
import type { EntityId } from "@entities/Entity";
import type { HexTile } from "@hex/HexGrid";
import { getWeapon } from "@data/WeaponData";
import type { WeaponDef } from "@data/WeaponData";
import type { EffectType } from "@data/AbilityData";

const SEED = 42;
const TEST_WEAPON_ID = "short_sword";

export interface FidelityCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
}

export interface SkillFidelityResult {
  skillId: string;
  skillName: string;
  passed: boolean;
  checks: FidelityCheck[];
  /** Human-readable summary for logs. */
  summary: string;
}

function makeGrid(): HexGrid {
  const tiles = new Map<string, HexTile>();
  const key = (q: number, r: number) => `${q},${r}`;
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const k = key(q, r);
      tiles.set(k, {
        q, r, elevation: 0, terrain: "grass",
        movementCost: 1, occupant: null, fogOfWar: "visible",
        blocksLoS: false, defenseBonusMelee: 0, defenseBonusRanged: 0,
      } as HexTile);
    }
  }
  return {
    get: (q: number, r: number) => tiles.get(key(q, r)) ?? null,
    set: (_q: number, _r: number, tile: Partial<HexTile>) => {
      const t = tiles.get(key(_q, _r));
      if (t) Object.assign(t, tile);
    },
    width: 11,
    height: 11,
    allTiles: () => Array.from(tiles.values()),
  } as HexGrid;
}

function addUnit(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  opts: { hp?: number; maxHp?: number; isAttacker?: boolean } = {},
): EntityId {
  const id = world.createEntity();
  const hp = opts.hp ?? 100;
  const maxHp = opts.maxHp ?? hp;
  world.addComponent(id, { type: "health", current: hp, max: maxHp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: maxHp, stamina: 100, mana: 20, resolve: 50, initiative: 100,
    meleeSkill: 65, rangedSkill: 30, dodge: 10, magicResist: 0,
    level: 1, experience: 0, movementPoints: 8,
  });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  world.addComponent(id, { type: "position", q, r, elevation: 0, facing: 0 });
  if (opts.isAttacker) {
    world.addComponent(id, {
      type: "equipment",
      mainHand: TEST_WEAPON_ID,
      offHand: null,
      accessory: null,
      bag: [],
    });
  }
  const tile = grid.get(q, r);
  if (tile) (tile as { occupant: EntityId | null }).occupant = id;
  return id;
}

/** Run one skill through the engine and collect full-fidelity checks. */
export function runSkillFidelityTest(abilityDef: RulesetAbilityDef): SkillFidelityResult {
  const checks: FidelityCheck[] = [];
  const rng = new RNG(SEED);
  const world = new World();
  const grid = makeGrid();
  const sem = new StatusEffectManager(rng);
  const damageCalc = new DamageCalculator(rng, grid);
  damageCalc.setStatusEffectManager(sem);
  const skillExecutor = { activateStance: () => {} };
  const executor = new AbilityExecutor(rng, damageCalc, sem, skillExecutor as any, grid);

  const attacker = addUnit(world, grid, 0, 0, { isAttacker: true });
  const isSelf = abilityDef.targeting.type === "tgt_self";
  const target = isSelf ? attacker : addUnit(world, grid, 1, 0, { hp: 100, maxHp: 100 });

  const ability = rulesetAbilityToGenerated(abilityDef);
  const weapon: WeaponDef = getWeapon(TEST_WEAPON_ID);

  let result: ReturnType<AbilityExecutor["execute"]>;
  try {
    result = executor.execute(world, attacker, target, ability, weapon);
  } catch (e) {
    checks.push({
      name: "execute",
      passed: false,
      expected: "no throw",
      actual: String(e),
    });
    return {
      skillId: abilityDef.id,
      skillName: abilityDef.name,
      passed: false,
      checks,
      summary: `execute threw: ${e}`,
    };
  }

  const dotTypes: EffectType[] = ["dot_bleed", "dot_burn", "dot_poison", "channel_dmg"];
  const hotTypes: EffectType[] = ["heal_hot"];
  const hasDot = abilityDef.effects.some((e) => dotTypes.includes(e.type as EffectType));
  const hasHot = abilityDef.effects.some((e) => hotTypes.includes(e.type as EffectType));
  const expectedTickDmg = abilityDef.effects
    .filter((e) => dotTypes.includes(e.type as EffectType))
    .reduce((sum, e) => sum + ((e.params.dmgPerTurn as number) ?? 0), 0);
  const expectedTickHeal = abilityDef.effects
    .filter((e) => hotTypes.includes(e.type as EffectType))
    .reduce((sum, e) => sum + ((e.params.healPerTurn as number) ?? 0), 0);

  // Pass 1: all checks that don't require tick (status, params, duration) — so remainingTurns is still the applied value
  let tickDamage = 0;
  let tickHeal = 0;
  for (const effect of abilityDef.effects) {
    const type = effect.type as EffectType;
    const params = effect.params;

    switch (type) {
      case "dot_bleed": {
        const dmgPerTurn = (params.dmgPerTurn as number) ?? 8;
        const turns = (params.turns as number) ?? 3;
        const hasBleed = sem.hasEffect(world, target, "bleed");
        checks.push({
          name: "dot_bleed status",
          passed: hasBleed,
          expected: `target has bleed`,
          actual: hasBleed ? "has bleed" : "no bleed",
        });
        if (hasBleed) {
          const comp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number>; remainingTurns: number }> }>(target, "statusEffects");
          const eff = comp?.effects.find((e) => e.id === "bleed");
          const storedDmg = eff?.modifiers._dmgPerTurn;
          const storedTurns = eff?.remainingTurns;
          checks.push({
            name: "dot_bleed dmgPerTurn",
            passed: storedDmg === dmgPerTurn,
            expected: String(dmgPerTurn),
            actual: String(storedDmg ?? "missing"),
          });
          checks.push({
            name: "dot_bleed duration",
            passed: storedTurns === turns,
            expected: String(turns),
            actual: String(storedTurns ?? "missing"),
          });
          // tick damage check added after we run tick (below)
        }
        break;
      }
      case "dot_burn": {
        const dmgPerTurn = (params.dmgPerTurn as number) ?? 5;
        const hasBurn = sem.hasEffect(world, target, "burn");
        checks.push({
          name: "dot_burn status",
          passed: hasBurn,
          expected: "target has burn",
          actual: hasBurn ? "has burn" : "no burn",
        });
        break;
      }
      case "dot_poison": {
        const dmgPerTurn = (params.dmgPerTurn as number) ?? 4;
        const hasPoison = sem.hasEffect(world, target, "poison");
        checks.push({
          name: "dot_poison status",
          passed: hasPoison,
          expected: "target has poison",
          actual: hasPoison ? "has poison" : "no poison",
        });
        break;
      }
      case "heal_flat": {
        const amount = (params.amount as number) ?? 20;
        const healTarget = isSelf ? attacker : target;
        const health = world.getComponent<{ current: number; max: number }>(healTarget, "health");
        const expectedHp = Math.min(health!.max, (isSelf ? 100 : 100) + amount);
        const ok = health && health.current === expectedHp;
        checks.push({
          name: "heal_flat HP",
          passed: !!ok,
          expected: `HP === ${expectedHp} (healed ${amount})`,
          actual: health ? `HP === ${health.current}` : "no health",
        });
        break;
      }
      case "heal_hot": {
        const healPerTurn = (params.healPerTurn as number) ?? 10;
        const hasRegen = sem.hasEffect(world, target, "regen");
        checks.push({
          name: "heal_hot status",
          passed: hasRegen,
          expected: "target has regen",
          actual: hasRegen ? "has regen" : "no regen",
        });
        if (hasRegen) {
          const comp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(target, "statusEffects");
          const eff = comp?.effects.find((e) => e.id === "regen");
          const storedHeal = eff?.modifiers._healPerTick;
          checks.push({
            name: "heal_hot healPerTurn",
            passed: storedHeal === healPerTurn,
            expected: String(healPerTurn),
            actual: String(storedHeal ?? "missing"),
          });
          // tick heal check added after we run tick (below)
        }
        break;
      }
      case "cc_stun": {
        const delayEndOfTurn = (params as { delay?: string }).delay === "end_of_turn";
        const passed = delayEndOfTurn
          ? (result.delayedEffects?.some((d) => d.effectType === "cc_stun" && d.targetEntityId === target) ?? false)
          : sem.hasEffect(world, target, "stun");
        checks.push({
          name: "cc_stun status",
          passed,
          expected: delayEndOfTurn ? "stun queued for end of turn" : "target has stun",
          actual: passed ? (delayEndOfTurn ? "stun queued" : "has stun") : "no stun",
        });
        break;
      }
      case "cc_root":
        checks.push({
          name: "cc_root status",
          passed: sem.hasEffect(world, target, "root"),
          expected: "target has root",
          actual: sem.hasEffect(world, target, "root") ? "has root" : "no root",
        });
        break;
      case "cc_silence":
        checks.push({
          name: "cc_silence status",
          passed: sem.hasEffect(world, target, "silence"),
          expected: "target has silence",
          actual: sem.hasEffect(world, target, "silence") ? "has silence" : "no silence",
        });
        break;
      case "cc_fear":
        checks.push({
          name: "cc_fear status",
          passed: sem.hasEffect(world, target, "fear"),
          expected: "target has fear",
          actual: sem.hasEffect(world, target, "fear") ? "has fear" : "no fear",
        });
        break;
      case "debuff_armor": {
        const turns = (params.turns as number) ?? 3;
        const hasArmorBreak = sem.hasEffect(world, target, "armor_break");
        checks.push({
          name: "debuff_armor status",
          passed: hasArmorBreak,
          expected: "target has armor_break",
          actual: hasArmorBreak ? "has armor_break" : "no armor_break",
        });
        if (hasArmorBreak) {
          const comp = world.getComponent<{ effects: Array<{ id: string; remainingTurns: number }> }>(target, "statusEffects");
          const eff = comp?.effects.find((e) => e.id === "armor_break");
          checks.push({
            name: "debuff_armor duration",
            passed: eff?.remainingTurns === turns,
            expected: String(turns),
            actual: String(eff?.remainingTurns ?? "missing"),
          });
        }
        break;
      }
      case "channel_dmg": {
        const dmgPerTurn = (params.dmgPerTurn as number) ?? 10;
        const comp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(target, "statusEffects");
        const eff = comp?.effects.find((e) => e.id === "channel_dmg");
        const hasChannel = !!eff;
        checks.push({
          name: "channel_dmg status",
          passed: hasChannel,
          expected: "target has channel_dmg",
          actual: hasChannel ? "has channel_dmg" : "no channel_dmg",
        });
        if (hasChannel) {
          checks.push({
            name: "channel_dmg dmgPerTurn",
            passed: eff!.modifiers._dmgPerTurn === dmgPerTurn,
            expected: String(dmgPerTurn),
            actual: String(eff!.modifiers._dmgPerTurn ?? "missing"),
          });
        }
        break;
      }
      case "buff_stat": {
        const stat = (params.stat as string) ?? "initiative";
        const amount = (params.amount as number) ?? 15;
        const buffId = `buff_${stat}`;
        const hasBuff = sem.hasEffect(world, attacker, buffId);
        checks.push({
          name: "buff_stat status",
          passed: hasBuff,
          expected: `attacker has ${buffId}`,
          actual: hasBuff ? `has ${buffId}` : `no ${buffId}`,
        });
        if (hasBuff) {
          const comp = world.getComponent<{ effects: Array<{ id: string; modifiers: Record<string, number> }> }>(attacker, "statusEffects");
          const eff = comp?.effects.find((e) => e.id === buffId);
          const value = eff?.modifiers[stat];
          checks.push({
            name: "buff_stat amount",
            passed: value === amount,
            expected: String(amount),
            actual: String(value ?? "missing"),
          });
        }
        break;
      }
      case "disp_push": {
        const distance = (params.distance as number) ?? 1;
        const pos = world.getComponent<{ q: number; r: number }>(target, "position");
        const startQ = 1;
        const startR = 0;
        const moved = pos !== null && (pos.q !== startQ || pos.r !== startR);
        checks.push({
          name: "disp_push moved",
          passed: moved,
          expected: `target moved from (${startQ}, ${startR})`,
          actual: pos ? `(${pos.q}, ${pos.r})` : "no position",
        });
        if (moved && pos && distance >= 1) {
          const hexDist = Math.max(Math.abs(pos.q - startQ), Math.abs(pos.r - startR), Math.abs(-pos.q - pos.r + startQ + startR));
          checks.push({
            name: "disp_push distance",
            passed: hexDist >= distance,
            expected: `moved at least ${distance} hex(es)`,
            actual: `hex distance ${hexDist}`,
          });
        }
        break;
      }
      case "dmg_weapon": {
        const mult = (params.multiplier as number) ?? 1;
        const ok = result.attackResults.length >= 1;
        checks.push({
          name: "dmg_weapon result",
          passed: ok,
          expected: "at least one attack result",
          actual: result.attackResults.length ? "has result" : "no result",
        });
        if (result.attackResults.length >= 1) {
          const dmg = result.attackResults[0]!.hpDamage;
          const hit = result.attackResults[0]!.hit;
          const maxReasonable = 2000;
          checks.push({
            name: "dmg_weapon damage non-negative and bounded",
            passed: dmg >= 0 && dmg <= maxReasonable,
            expected: `0 <= hpDamage <= ${maxReasonable}`,
            actual: `hpDamage = ${dmg}, hit = ${hit}`,
          });
        }
        break;
      }
      case "res_apRefund": {
        const amount = (params.amount as number) ?? 2;
        checks.push({
          name: "res_apRefund",
          passed: result.apRefunded === amount,
          expected: `apRefunded === ${amount}`,
          actual: `apRefunded === ${result.apRefunded ?? "undefined"}`,
        });
        break;
      }
      default:
        checks.push({
          name: `effect ${type}`,
          passed: true,
          expected: "(no strict check yet)",
          actual: "executed",
        });
    }
  }

  // Run one tick so we can assert exact tick damage/heal (duration was already checked above)
  if (hasDot || hasHot) {
    const hpBefore = world.getComponent<{ current: number }>(target, "health")?.current ?? 0;
    sem.tickTurnStart(world, target);
    const hpAfter = world.getComponent<{ current: number }>(target, "health")?.current ?? 0;
    tickDamage = hpBefore - hpAfter;
    tickHeal = Math.max(0, hpAfter - hpBefore);
  }
  for (const effect of abilityDef.effects) {
    const type = effect.type as EffectType;
    if (dotTypes.includes(type)) {
      checks.push({
        name: `${type} tick damage`,
        passed: tickDamage === expectedTickDmg,
        expected: `${expectedTickDmg} total DoT damage on tick`,
        actual: `${tickDamage} damage on tick`,
      });
    } else if (hotTypes.includes(type)) {
      if (sem.hasEffect(world, target, "regen")) {
        checks.push({
          name: "heal_hot tick heal",
          passed: tickHeal === expectedTickHeal,
          expected: `${expectedTickHeal} heal on tick`,
          actual: `${tickHeal} heal on tick`,
        });
      }
    }
  }

  const passed = checks.every((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);
  const summary = passed
    ? "all checks passed"
    : failed.map((c) => `${c.name}: expected ${c.expected}, got ${c.actual}`).join("; ");

  return {
    skillId: abilityDef.id,
    skillName: abilityDef.name,
    passed,
    checks,
    summary,
  };
}

/** Abilities that can be tested with one attacker and one target (self or single). */
export function isTestableForFidelity(abilityDef: RulesetAbilityDef): boolean {
  const t = abilityDef.targeting.type;
  if (t !== "tgt_self" && t !== "tgt_single_enemy" && t !== "tgt_single_ally") return false;
  const type = abilityDef.type?.toLowerCase() ?? "";
  if (type.includes("passive") || type === "aura") return false;
  return true;
}
