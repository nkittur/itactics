import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import type { FatigueComponent } from "@entities/components/Fatigue";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { AIBehaviorComponent, AIType } from "@entities/components/AIBehavior";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { reachableHexes, findPath } from "@hex/HexPathfinding";
import { tileMPCost, getEffectiveMP, DEFAULT_MP } from "./MovementPointManager";
import type { StatsComponent } from "@entities/components/Stats";
import { getZoCAttacksForMove } from "./ZoneOfControl";
import { UNARMED } from "@data/WeaponData";
import { resolveWeapon } from "@data/ItemResolver";
import { getSkillsForWeapon, skillAPCost, skillRange, BASIC_ATTACK, type SkillDef } from "@data/SkillData";
import type { ArmorComponent } from "@entities/components/Armor";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import { getClassDef, getClassAPDiscount, getClassArmorMPReduction } from "@data/ClassData";

export type TacticalAction =
  | { type: "moveAndAttack"; path: Array<{ q: number; r: number }>; targetId: EntityId; skill?: SkillDef }
  | { type: "move"; path: Array<{ q: number; r: number }> }
  | { type: "attack"; targetId: EntityId; skill?: SkillDef }
  | { type: "activateStance"; skill: SkillDef }
  | { type: "recover" }
  | { type: "wait" };

/** Weights for scoring, keyed by AI type. */
interface ScoreWeights {
  threat: number;
  attack: number;
  surround: number;
  terrain: number;
  zocPenalty: number;
  woundedTarget: number;
}

const WEIGHTS: Record<AIType, ScoreWeights> = {
  aggressive: {
    threat: -5,
    attack: 30,
    surround: 15,
    terrain: 5,
    zocPenalty: -20,
    woundedTarget: 20,
  },
  defensive: {
    threat: -15,
    attack: 20,
    surround: 10,
    terrain: 15,
    zocPenalty: -30,
    woundedTarget: 10,
  },
  ranged: {
    threat: -20,
    attack: 25,
    surround: 5,
    terrain: 10,
    zocPenalty: -40,
    woundedTarget: 15,
  },
  support: {
    threat: -15,
    attack: 10,
    surround: 5,
    terrain: 10,
    zocPenalty: -25,
    woundedTarget: 5,
  },
  beast: {
    threat: -3,
    attack: 35,
    surround: 20,
    terrain: 2,
    zocPenalty: -10,
    woundedTarget: 25,
  },
  boss: {
    threat: -2,
    attack: 30,
    surround: 15,
    terrain: 5,
    zocPenalty: -10,
    woundedTarget: 15,
  },
};

/**
 * Tactical AI: position-scoring system that evaluates all reachable hexes
 * and picks the best action sequence (move, attack, or both).
 */
export function decideTacticalAction(
  world: World,
  grid: HexGrid,
  entityId: EntityId,
  enemyIds: EntityId[],
): TacticalAction {
  const pos = world.getComponent<PositionComponent>(entityId, "position");
  if (!pos) return { type: "wait" };
  if (enemyIds.length === 0) return { type: "wait" };

  const aiBehavior = world.getComponent<AIBehaviorComponent>(entityId, "aiBehavior");
  const aiType: AIType = aiBehavior?.aiType ?? "aggressive";
  const weights = WEIGHTS[aiType];

  const equip = world.getComponent<EquipmentComponent>(entityId, "equipment");
  const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
  const weaponId = equip?.mainHand ?? "unarmed";

  // Class passives
  const cc = world.getComponent<CharacterClassComponent>(entityId, "characterClass");
  const classDef = cc ? getClassDef(cc.classId) : undefined;
  const armorMPReduction = classDef ? getClassArmorMPReduction(classDef) : 0;

  // Get available skills for this weapon
  const skills = getSkillsForWeapon(weaponId);
  const basicSkill = skills.find(s => s.isBasicAttack) ?? BASIC_ATTACK;
  const apDiscount = classDef ? getClassAPDiscount(classDef, weapon, basicSkill.rangeType) : 0;
  const basicAPCost = Math.max(1, skillAPCost(basicSkill, weapon) - apDiscount);
  const basicRange = skillRange(basicSkill, weapon);

  // Check if we should recover (fatigue > 70% of max)
  const fatigue = world.getComponent<FatigueComponent>(entityId, "fatigue");
  if (fatigue && fatigue.current > fatigue.max * 0.7) {
    const adjacentEnemy = findAdjacentTarget(world, pos, enemyIds, basicRange);
    if (!adjacentEnemy) {
      return { type: "recover" };
    }
  }

  // Movement budget: full MP (separate from AP, no need to reserve)
  const stats = world.getComponent<StatsComponent>(entityId, "stats");
  const armor = world.getComponent<ArmorComponent>(entityId, "armor");
  const unitMP = getEffectiveMP(
    stats?.movementPoints ?? DEFAULT_MP,
    armor?.body?.id,
    armor?.head?.id,
    equip?.offHand ?? undefined,
    armorMPReduction,
  );

  // Get all reachable hexes
  const reachable = reachableHexes(grid, { q: pos.q, r: pos.r }, unitMP, tileMPCost);

  let bestScore = -Infinity;
  let bestAction: TacticalAction = { type: "wait" };

  // Evaluate each skill from current position
  for (const skill of skills) {
    if (skill.isStance) {
      // Stance: use defensively when enemies are approaching
      if (aiType === "defensive" && skill.id === "spearwall") {
        let nearbyEnemies = 0;
        for (const eid of enemyIds) {
          const ep = world.getComponent<PositionComponent>(eid, "position");
          if (ep && hexDistance(pos, ep) <= 3) nearbyEnemies++;
        }
        if (nearbyEnemies > 0) {
          const stanceScore = nearbyEnemies * 10;
          if (stanceScore > bestScore) {
            bestScore = stanceScore;
            bestAction = { type: "activateStance", skill };
          }
        }
      }
      continue;
    }
    if (skill.targetType !== "enemy") continue;

    const range = skillRange(skill, weapon);
    const currentTarget = findAdjacentTarget(world, pos, enemyIds, range);
    if (!currentTarget) continue;

    const score = scoreSkillTarget(world, currentTarget, skill, weights);
    if (score > bestScore) {
      bestScore = score;
      bestAction = { type: "attack", targetId: currentTarget, skill: skill.isBasicAttack ? undefined : skill };
    }
  }

  // Score each reachable hex
  for (const [key] of reachable) {
    const [hq, hr] = key.split(",").map(Number);
    if (hq === undefined || hr === undefined) continue;
    if (hq === pos.q && hr === pos.r) continue; // already scored staying

    const tile = grid.get(hq, hr);
    if (!tile || (tile.occupant && tile.occupant !== entityId)) continue;

    // Find path to this hex
    const pathResult = findPath(grid, { q: pos.q, r: pos.r }, { q: hq, r: hr }, unitMP, tileMPCost);
    if (!pathResult.found || pathResult.path.length === 0) continue;

    // ZoC penalty
    const zocAttackers = getZoCAttacksForMove(world, grid, entityId, pos.q, pos.r, pathResult.path);
    const zocScore = zocAttackers.length * weights.zocPenalty;

    // Threat score: how many enemies can attack us at this hex?
    let threatCount = 0;
    for (const eid of enemyIds) {
      const ep = world.getComponent<PositionComponent>(eid, "position");
      if (ep && hexDistance({ q: hq, r: hr }, { q: ep.q, r: ep.r }) <= 1) {
        threatCount++;
      }
    }
    const threatScore = threatCount * weights.threat;

    // Terrain score
    const terrainScore = (tile.defenseBonusMelee + tile.elevation * 5) * (weights.terrain / 10);

    // Can we attack from this hex with any skill?
    let bestSkillAction: { target: EntityId; skill?: SkillDef; score: number } | null = null;
    const hexPos = { q: hq, r: hr, elevation: tile.elevation, facing: 0 } as PositionComponent;
    for (const skill of skills) {
      if (skill.isStance || skill.targetType !== "enemy") continue;
      const range = skillRange(skill, weapon);
      const target = findAdjacentTarget(world, hexPos, enemyIds, range);
      if (!target) continue;
      const score = scoreSkillTarget(world, target, skill, weights);
      if (!bestSkillAction || score > bestSkillAction.score) {
        bestSkillAction = { target, skill: skill.isBasicAttack ? undefined : skill, score };
      }
    }

    if (bestSkillAction) {
      const totalScore = bestSkillAction.score + threatScore + terrainScore + zocScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = {
          type: "moveAndAttack",
          path: pathResult.path,
          targetId: bestSkillAction.target,
          skill: bestSkillAction.skill,
        };
      }
    } else {
      // No attack — score as pure movement toward nearest enemy
      let minDistToEnemy = Infinity;
      for (const eid of enemyIds) {
        const ep = world.getComponent<PositionComponent>(eid, "position");
        if (ep) {
          const d = hexDistance({ q: hq, r: hr }, { q: ep.q, r: ep.r });
          if (d < minDistToEnemy) minDistToEnemy = d;
        }
      }

      // Closer to enemy = better (for aggressive), plus terrain bonus
      const approachScore = Math.max(0, 10 - minDistToEnemy) * 3;
      const totalScore = approachScore + threatScore + terrainScore + zocScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { type: "move", path: pathResult.path };
      }
    }
  }

  return bestAction;
}

/** Score an attack target based on how valuable it is to attack them. */
function scoreAttackTarget(
  world: World,
  targetId: EntityId,
  weights: ScoreWeights,
): number {
  let score = weights.attack; // base attack value

  const health = world.getComponent<HealthComponent>(targetId, "health");
  if (health) {
    const hpPct = health.current / health.max;
    if (hpPct < 0.5) score += weights.woundedTarget;
    else if (hpPct < 0.75) score += weights.woundedTarget * 0.5;
    if (health.current < 30) score += 15;
  }

  return score;
}

/**
 * Score using a specific skill against a target.
 * Adds bonuses for contextually appropriate skill usage.
 */
function scoreSkillTarget(
  world: World,
  targetId: EntityId,
  skill: SkillDef,
  weights: ScoreWeights,
): number {
  let score = scoreAttackTarget(world, targetId, weights);

  // Skill-specific bonuses
  if (skill.id === "stun") {
    // Stun is valuable against high-threat targets
    const health = world.getComponent<HealthComponent>(targetId, "health");
    if (health && health.current > health.max * 0.5) {
      score += 10; // Stun healthy enemies to neutralize them
    }
  } else if (skill.id === "split_shield") {
    // Only valuable if target has a shield
    const equip = world.getComponent<EquipmentComponent>(targetId, "equipment");
    if (equip?.offHand && equip.shieldDurability != null && equip.shieldDurability > 0) {
      score += 15; // High priority to remove shield
    } else {
      score -= 50; // Useless without shield
    }
  } else if (skill.id === "puncture") {
    // Valuable against heavily armored targets
    const armor = world.getComponent<ArmorComponent>(targetId, "armor");
    const hasArmor = (armor?.body && armor.body.currentDurability > 30) ||
                     (armor?.head && armor.head.currentDurability > 20);
    if (hasArmor) {
      score += 12;
    }
  }

  return score;
}

/** Find the best adjacent enemy to attack. Prefers wounded/killable targets. */
function findAdjacentTarget(
  world: World,
  pos: PositionComponent,
  enemyIds: EntityId[],
  weaponRange: number,
): EntityId | null {
  let bestTarget: EntityId | null = null;
  let bestHpPct = Infinity;

  for (const eid of enemyIds) {
    const ep = world.getComponent<PositionComponent>(eid, "position");
    if (!ep) continue;

    const dist = hexDistance({ q: pos.q, r: pos.r }, { q: ep.q, r: ep.r });
    if (dist > weaponRange) continue;

    const health = world.getComponent<HealthComponent>(eid, "health");
    if (!health || health.current <= 0) continue;

    const hpPct = health.current / health.max;
    if (hpPct < bestHpPct) {
      bestHpPct = hpPct;
      bestTarget = eid;
    }
  }

  return bestTarget;
}
