/**
 * Applies persistent, caster-centered aura effects each turn.
 * R3: Auras (e.g. "enemies within 3 hexes take 8% more damage").
 */

import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { StatusEffectManager } from "./StatusEffectManager";
import { getAbility } from "@data/ruleset/RulesetLoader";
import type { RulesetAbilityDef, RulesetEffect } from "@data/ruleset/RulesetSchema";
import { hexSpiral, hexDistance } from "@hex/HexMath";
import type { HealthComponent } from "@entities/components/Health";
import type { PositionComponent } from "@entities/components/Position";
import type { AbilitiesComponent } from "@entities/components/Abilities";

/** Per (casterId, abilityId) we track which entity ids had the aura applied last refresh. */
const auraApplied = new Map<string, EntityId[]>();

function auraKey(casterId: EntityId, abilityId: string): string {
  return `${casterId}_${abilityId}`;
}

function radiusFromTargeting(type: string): number {
  if (type === "tgt_aoe_radius3") return 3;
  if (type === "tgt_aoe_radius2") return 2;
  return 2;
}

/** Whether the aura effect targets enemies (true) or allies (false) from caster's perspective. */
function auraTargetsEnemies(effects: RulesetEffect[]): boolean {
  const first = effects[0];
  if (!first) return true;
  const t = first.type as string;
  if (t.startsWith("debuff_")) return true;
  if (t.startsWith("buff_")) return false;
  return true;
}

/** Apply a single aura effect from def to targetId. Returns true if applied. */
function applyAuraEffect(
  world: World,
  statusEffects: StatusEffectManager,
  def: RulesetAbilityDef,
  casterId: EntityId,
  targetId: EntityId,
): void {
  const effect = def.effects[0];
  if (!effect) return;

  const statusId = `aura_${def.id}_${casterId}`.replace(/\s+/g, "_");
  const duration = 1;

  switch (effect.type) {
    case "debuff_vuln": {
      const bonusDmg = (effect.params.bonusDmg as number) ?? (effect.params.percent as number) ?? 8;
      statusEffects.applyDynamic(world, targetId, {
        id: statusId,
        name: def.name,
        duration,
        modifiers: { _bonusDmgPct: bonusDmg },
      });
      break;
    }
    case "buff_stat": {
      const stat = (effect.params.stat as string) ?? "meleeSkill";
      const amount = (effect.params.amount as number) ?? 10;
      statusEffects.applyDynamic(world, targetId, {
        id: statusId,
        name: def.name,
        duration,
        modifiers: { [stat]: amount },
      });
      break;
    }
    default:
      // Only debuff_vuln and buff_stat supported for auras in this pass
      break;
  }
}

/**
 * Refresh all auras: remove previous applications, then re-apply to entities currently in range.
 * Call at start of each turn (e.g. from CombatManager.beginCurrentTurn).
 */
export function refreshAuras(
  world: World,
  grid: HexGrid,
  statusEffects: StatusEffectManager,
  isEnemyEntity: (entityId: EntityId) => boolean,
): void {
  const candidates = world.query("position", "health", "abilities");
  if (candidates.length === 0) return;

  for (const casterId of candidates) {
    const health = world.getComponent<HealthComponent>(casterId, "health");
    if (!health || health.current <= 0) continue;

    const pos = world.getComponent<PositionComponent>(casterId, "position");
    if (!pos) continue;

    const abilities = world.getComponent<AbilitiesComponent>(casterId, "abilities");
    if (!abilities) continue;

    const casterIsEnemy = isEnemyEntity(casterId);

    for (const abilityId of abilities.abilityIds) {
      const def = getAbility(abilityId);
      if (!def || def.type !== "Aura") continue;

      const radius = radiusFromTargeting(def.targeting.type);
      const targetsEnemies = auraTargetsEnemies(def.effects);
      const center = { q: pos.q, r: pos.r };

      const key = auraKey(casterId, abilityId);
      const previous = auraApplied.get(key) ?? [];
      const statusId = `aura_${def.id}_${casterId}`.replace(/\s+/g, "_");

      for (const entityId of previous) {
        statusEffects.removeEffect(world, entityId, statusId, "replaced");
      }

      const inRange: EntityId[] = [];
      for (const { q, r } of hexSpiral(center, radius)) {
        if (hexDistance(center, { q, r }) > radius) continue;
        const tile = grid.get(q, r);
        const occupant = tile?.occupant;
        if (!occupant || occupant === casterId) continue;

        const targetHealth = world.getComponent<HealthComponent>(occupant, "health");
        if (!targetHealth || targetHealth.current <= 0) continue;

        const targetIsEnemy = isEnemyEntity(occupant);
        if (targetsEnemies && targetIsEnemy === casterIsEnemy) continue; // skip allies when targeting enemies
        if (!targetsEnemies && targetIsEnemy !== casterIsEnemy) continue; // skip enemies when targeting allies

        inRange.push(occupant);
        applyAuraEffect(world, statusEffects, def, casterId, occupant);
      }

      auraApplied.set(key, inRange);
    }
  }
}

