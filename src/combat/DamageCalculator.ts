import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { ArmorComponent } from "@entities/components/Armor";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { PositionComponent } from "@entities/components/Position";
import { getWeapon, UNARMED, type WeaponDef } from "@data/WeaponData";
import { getShield, type ShieldDef } from "@data/ShieldData";
import { hexNeighbors } from "@hex/HexMath";
import { RNG } from "@utils/RNG";
import { clamp } from "@utils/MathUtils";

export interface AttackResult {
  hit: boolean;
  hitChance: number;
  /** Raw damage rolled from weapon. */
  damage: number;
  /** Damage dealt to armor durability. */
  armorDamage: number;
  /** Damage dealt to HP. */
  hpDamage: number;
  targetKilled: boolean;
  headHit: boolean;
  /** Weapon used for this attack. */
  weaponId: string;
}

/**
 * Weapon-based damage calculator.
 *
 * Damage pipeline (from planning/03-weapons-and-equipment.md):
 * 1. Roll hit chance (meleeSkill + weaponBonus - meleeDefense - shieldBonus)
 * 2. Roll raw damage between weapon min-max
 * 3. Armor durability damage = floor(raw * armorDamageMult)
 * 4. Armor ignore HP damage = floor(raw * armorIgnorePct)
 * 5. HP damage = armorIgnoreHp + overflow (if armor breaks)
 * 6. Head hit: 1.5x HP damage
 */
export class DamageCalculator {
  constructor(
    private rng: RNG,
    private grid: HexGrid,
  ) {}

  /** Resolve a melee attack between attacker and defender. */
  resolveMelee(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): AttackResult {
    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const defenderHealth = world.getComponent<HealthComponent>(defenderId, "health");
    const defenderArmor = world.getComponent<ArmorComponent>(defenderId, "armor");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return miss(0, "unarmed");
    }

    // Look up weapon and shield from data registries
    const weapon: WeaponDef = attackerEquip?.mainHand
      ? getWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand)
      : undefined;

    // ── 1. Hit chance ──
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.meleeDefBonus ?? 0;

    // Terrain defense bonus (defender's tile)
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;

    // Elevation modifier: +10 per level advantage
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;

    // Surrounding bonus: +5 per ally adjacent to defender beyond the first
    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId)
      : 0;

    const hitChance = clamp(
      attackerStats.meleeSkill + weapon.hitChanceBonus
        - defenderStats.meleeDefense - shieldBonus
        - terrainDefBonus
        + elevationMod
        + surroundBonus,
      5,
      95,
    );

    const roll = this.rng.nextInt(1, 100);
    if (roll > hitChance) {
      return miss(hitChance, weapon.id);
    }

    // ── 2. Roll raw damage ──
    const rawDamage = this.rng.nextInt(weapon.minDamage, weapon.maxDamage);

    // ── 3. Head hit (25% chance) ──
    const headHit = this.rng.roll(25);

    // ── 4-5. Damage resolution ──
    const armorIgnoreHp = Math.floor(rawDamage * weapon.armorIgnorePct);
    const armorDurabilityDmg = Math.floor(rawDamage * weapon.armorDamageMult);

    const armorSlot = defenderArmor
      ? (headHit ? defenderArmor.head : defenderArmor.body)
      : null;

    let armorDamageDealt = 0;
    let hpDamage: number;

    if (armorSlot && armorSlot.currentDurability > 0) {
      // Armor absorbs durability damage
      const absorbed = Math.min(armorDurabilityDmg, armorSlot.currentDurability);
      armorSlot.currentDurability -= absorbed;
      armorDamageDealt = absorbed;
      // Overflow when armor breaks goes to HP
      const overflow = armorDurabilityDmg - absorbed;
      hpDamage = armorIgnoreHp + overflow;
    } else {
      // No armor on this slot — all damage goes to HP
      hpDamage = rawDamage;
    }

    // ── 6. Head hit multiplier ──
    if (headHit) {
      hpDamage = Math.floor(hpDamage * 1.5);
    }

    // ── 7. Apply HP damage ──
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);
    const targetKilled = defenderHealth.current <= 0;

    return {
      hit: true,
      hitChance,
      damage: rawDamage,
      armorDamage: armorDamageDealt,
      hpDamage,
      targetKilled,
      headHit,
      weaponId: weapon.id,
    };
  }
  /**
   * Count surrounding bonus: +5 per ally of the attacker adjacent to the defender,
   * beyond the first (the attacker themselves).
   * Two entities are on the same team if they both have aiBehavior or both lack it.
   */
  private countSurroundBonus(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): number {
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");
    if (!defenderPos) return 0;

    const attackerIsAI = world.getComponent(attackerId, "aiBehavior") !== undefined;

    let allyCount = 0;
    for (const n of hexNeighbors(defenderPos.q, defenderPos.r)) {
      const tile = this.grid.get(n.q, n.r);
      if (!tile?.occupant || tile.occupant === defenderId) continue;

      const occupantIsAI = world.getComponent(tile.occupant, "aiBehavior") !== undefined;
      if (occupantIsAI === attackerIsAI) {
        // Same team as attacker — counts as surrounding ally
        const health = world.getComponent<HealthComponent>(tile.occupant, "health");
        if (health && health.current > 0) {
          allyCount++;
        }
      }
    }

    // Bonus starts at 2+ allies adjacent (the attacker is one of them)
    return Math.max(0, allyCount - 1) * 5;
  }
}

function miss(hitChance: number, weaponId: string): AttackResult {
  return {
    hit: false,
    hitChance,
    damage: 0,
    armorDamage: 0,
    hpDamage: 0,
    targetKilled: false,
    headHit: false,
    weaponId,
  };
}
