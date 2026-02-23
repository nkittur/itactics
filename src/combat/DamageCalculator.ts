import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { ArmorComponent } from "@entities/components/Armor";
import { RNG } from "@utils/RNG";
import { clamp } from "@utils/MathUtils";

export interface AttackResult {
  hit: boolean;
  hitChance: number;
  damage: number;
  armorDamage: number;
  hpDamage: number;
  targetKilled: boolean;
  headHit: boolean;
}

/**
 * Phase 1 simplified damage calculator.
 *
 * Hit chance: attacker.meleeSkill - defender.meleeDefense, clamped to [5, 95].
 * Damage: random 20-35 base. 70% goes to armor, 30% bypasses armor.
 * Head hit: 25% chance (attacks head armor instead of body armor).
 */
export class DamageCalculator {
  constructor(private rng: RNG) {}

  /** Resolve a melee attack between attacker and defender. */
  resolveMelee(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId
  ): AttackResult {
    // 1. Get stats components for both
    const attackerStats = world.getComponent<StatsComponent>(
      attackerId,
      "stats"
    );
    const defenderStats = world.getComponent<StatsComponent>(
      defenderId,
      "stats"
    );
    const defenderHealth = world.getComponent<HealthComponent>(
      defenderId,
      "health"
    );
    const defenderArmor = world.getComponent<ArmorComponent>(
      defenderId,
      "armor"
    );

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return {
        hit: false,
        hitChance: 0,
        damage: 0,
        armorDamage: 0,
        hpDamage: 0,
        targetKilled: false,
        headHit: false,
      };
    }

    // 2. Calculate hit chance: attacker.meleeSkill - defender.meleeDefense
    //    Clamped to [5, 95] per combat mechanics doc
    const hitChance = clamp(
      attackerStats.meleeSkill - defenderStats.meleeDefense,
      5,
      95
    );

    // 3. Roll to hit (1-100, hit if roll <= hitChance)
    const roll = this.rng.nextInt(1, 100);
    if (roll > hitChance) {
      return {
        hit: false,
        hitChance,
        damage: 0,
        armorDamage: 0,
        hpDamage: 0,
        targetKilled: false,
        headHit: false,
      };
    }

    // 4. Roll damage: random between 20 and 35 (Phase 1 placeholder)
    const baseDamage = this.rng.nextInt(20, 35);

    // 5. Head hit: 25% chance
    const headHit = this.rng.roll(25);

    // 6. Phase 1 simplified armor: 70% of damage goes to armor, 30% bypasses
    const damageToArmor = Math.floor(baseDamage * 0.7);
    const damageBypassingArmor = baseDamage - damageToArmor;

    let armorDamage = 0;
    let hpDamage = damageBypassingArmor;

    if (defenderArmor) {
      const armorSlot = headHit ? defenderArmor.head : defenderArmor.body;
      if (armorSlot && armorSlot.currentDurability > 0) {
        // Armor absorbs damage up to its remaining durability
        const absorbed = Math.min(damageToArmor, armorSlot.currentDurability);
        armorSlot.currentDurability -= absorbed;
        armorDamage = absorbed;

        // Any damage to armor beyond its durability spills over to HP
        const spillover = damageToArmor - absorbed;
        hpDamage += spillover;
      } else {
        // No armor on this slot -- all damage goes to HP
        hpDamage += damageToArmor;
      }
    } else {
      // No armor component at all -- full damage to HP
      hpDamage += damageToArmor;
    }

    // 7. Apply HP damage
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);

    // 8. Check if target died
    const targetKilled = defenderHealth.current <= 0;

    return {
      hit: true,
      hitChance,
      damage: baseDamage,
      armorDamage,
      hpDamage,
      targetKilled,
      headHit,
    };
  }
}
