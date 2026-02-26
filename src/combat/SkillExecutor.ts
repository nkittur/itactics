import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { ActiveStancesComponent } from "@entities/components/ActiveStances";
import type { HealthComponent } from "@entities/components/Health";
import type { StatsComponent } from "@entities/components/Stats";
import type { PositionComponent } from "@entities/components/Position";
import { getWeapon, UNARMED } from "@data/WeaponData";
import { getShield } from "@data/ShieldData";
import { SPLIT_SHIELD, SPEARWALL, type SkillDef } from "@data/SkillData";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { RNG } from "@utils/RNG";
import { clamp } from "@utils/MathUtils";

/**
 * Handles special skill execution that goes beyond DamageCalculator's standard pipeline.
 */
export class SkillExecutor {
  constructor(
    private rng: RNG,
    private damageCalc: DamageCalculator,
  ) {}

  /**
   * Execute Split Shield: hit chance as normal, but damage is applied to shield durability.
   * If shield breaks, remove it from equipment.
   */
  executeSplitShield(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): AttackResult & { shieldDestroyed: boolean } {
    // Use standard skill attack for hit/damage roll
    const result = this.damageCalc.resolveSkillAttack(world, attackerId, defenderId, SPLIT_SHIELD);

    let shieldDestroyed = false;

    if (result.hit) {
      const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");
      if (defenderEquip?.offHand && defenderEquip.shieldDurability != null) {
        // Apply skill damage multiplier to shield durability
        const shieldDmg = Math.floor(result.damage * SPLIT_SHIELD.damageMultiplier);
        defenderEquip.shieldDurability = Math.max(0, defenderEquip.shieldDurability - shieldDmg);

        if (defenderEquip.shieldDurability <= 0) {
          // Shield destroyed
          defenderEquip.offHand = null;
          defenderEquip.shieldDurability = null;
          shieldDestroyed = true;
        }
      }
      // Split Shield still does reduced HP damage (already handled by damageMultiplier in resolveSkillAttack)
    }

    return { ...result, shieldDestroyed };
  }

  /**
   * Activate Spearwall stance: mark entity as having spearwall active.
   */
  activateSpearwall(world: World, entityId: EntityId): void {
    let stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    if (!stances) {
      world.addComponent(entityId, {
        type: "activeStances",
        stances: new Map(),
      });
      stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances")!;
    }
    stances.stances.set("spearwall", { skillId: "spearwall", turnsLeft: 1 });
  }

  /**
   * Check if entity has spearwall active.
   */
  hasSpearwall(world: World, entityId: EntityId): boolean {
    const stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    return stances?.stances.has("spearwall") ?? false;
  }

  /**
   * Trigger spearwall free attack when an enemy moves adjacent.
   * Returns the attack result or null if no spearwall.
   */
  triggerSpearwall(
    world: World,
    spearwallEntityId: EntityId,
    movingEntityId: EntityId,
  ): AttackResult | null {
    if (!this.hasSpearwall(world, spearwallEntityId)) return null;

    // Use the spearwall entity's weapon for a basic attack
    const result = this.damageCalc.resolveMelee(world, spearwallEntityId, movingEntityId);

    // Consume the spearwall stance
    const stances = world.getComponent<ActiveStancesComponent>(spearwallEntityId, "activeStances");
    if (stances) {
      stances.stances.delete("spearwall");
    }

    return result;
  }

  /**
   * Activate a generalized stance (counter, overwatch, etc.) from generated abilities.
   */
  activateStance(
    world: World,
    entityId: EntityId,
    stanceType: string,
    params: { skillId: string; turnsLeft?: number; maxCounters?: number },
  ): void {
    let stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    if (!stances) {
      world.addComponent(entityId, {
        type: "activeStances",
        stances: new Map(),
      });
      stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances")!;
    }
    stances.stances.set(stanceType, {
      skillId: params.skillId,
      turnsLeft: params.turnsLeft ?? 1,
    });
  }

  /** Check if entity has a specific stance active. */
  hasStance(world: World, entityId: EntityId, stanceType: string): boolean {
    const stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    return stances?.stances.has(stanceType) ?? false;
  }

  /** Get all active stance types for an entity. */
  getActiveStanceTypes(world: World, entityId: EntityId): string[] {
    const stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    if (!stances) return [];
    return [...stances.stances.keys()];
  }

  /**
   * Clear expired stances at the start of a unit's turn.
   */
  clearStances(world: World, entityId: EntityId): void {
    const stances = world.getComponent<ActiveStancesComponent>(entityId, "activeStances");
    if (!stances) return;

    for (const [key, entry] of stances.stances) {
      entry.turnsLeft--;
      if (entry.turnsLeft <= 0) {
        stances.stances.delete(key);
      }
    }
  }
}
