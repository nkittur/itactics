import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { GeneratedAbility, TriggerType } from "@data/AbilityData";
import { resolveAbility } from "@data/AbilityResolver";
import type { AbilitiesComponent } from "@entities/components/Abilities";
import type { HealthComponent } from "@entities/components/Health";
import type { StatsComponent } from "@entities/components/Stats";
import type { StatusEffectManager } from "./StatusEffectManager";
import type { ActionPointManager } from "./ActionPointManager";

/** Result of a passive trigger firing. */
export interface PassiveResult {
  abilityName: string;
  abilityUid: string;
  effect: string; // human-readable description, e.g. "+3 AP"
}

/**
 * Resolves passive abilities at the appropriate hook points in combat.
 * Passive abilities have `isPassive: true` and fire based on their trigger type.
 */
export class PassiveResolver {
  constructor(
    private statusEffects: StatusEffectManager,
  ) {}

  /**
   * Hook: called at the start of a unit's turn.
   * Fires trg_turnStart passives (e.g., regen, stance buffs).
   */
  onTurnStart(
    world: World,
    entityId: EntityId,
  ): PassiveResult[] {
    return this.firePassives(world, entityId, "trg_turnStart", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        let amount = (triggered.params["amount"] as number) ?? 0;

        // Stat-scaling passives: compute bonus damage from a source stat
        const scalingStat = triggered.params["scalingStat"] as string | undefined;
        const scalingPct = triggered.params["scalingPct"] as number | undefined;
        if (scalingStat && scalingPct && stat === "bonusDamage") {
          const stats = world.getComponent<StatsComponent>(entityId, "stats");
          if (stats) {
            const statValue = (stats as unknown as Record<string, number>)[scalingStat] ?? 0;
            amount = Math.floor(statValue * scalingPct / 100);
          }
        }

        if (stat && amount > 0) {
          this.statusEffects.applyDynamic(world, entityId, {
            id: `buff_${stat}`,
            name: `${ability.name}`,
            duration: 1,
            modifiers: { [stat]: amount },
            maxStacks: 1,
          });
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${stat}` };
        }
      }

      if (triggered.type === "res_apRefund") {
        // Turn-start AP refund would be unusual but handle it
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (amount > 0) {
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} AP` };
        }
      }

      return null;
    });
  }

  /**
   * Hook: called when a unit kills another unit.
   * Fires trg_onKill passives (e.g., Blood Rush: AP on kill, Triumph: heal on kill).
   * Returns the AP to refund (caller applies it).
   */
  onKill(
    world: World,
    killerId: EntityId,
    _killedId: EntityId,
  ): { results: PassiveResult[]; apRefund: number } {
    let apRefund = 0;
    const results = this.firePassives(world, killerId, "trg_onKill", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "res_apRefund") {
        const amount = (triggered.params["amount"] as number) ?? 3;
        apRefund += amount;
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} AP` };
      }

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (stat && amount > 0) {
          this.statusEffects.applyDynamic(world, killerId, {
            id: `buff_${stat}_onKill`,
            name: `${ability.name}`,
            duration: 2,
            modifiers: { [stat]: amount },
            maxStacks: 1,
          });
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${stat}` };
        }
      }

      return null;
    });

    return { results, apRefund };
  }

  /**
   * Hook: called when a debuff is applied to a target.
   * Fires trg_onHit passives on the applier (e.g., Opportunist's Eye: AP on debuff applied).
   */
  onDebuffApplied(
    world: World,
    applierId: EntityId,
    _debuffId: string,
  ): { results: PassiveResult[]; apRefund: number } {
    let apRefund = 0;
    const results = this.firePassives(world, applierId, "trg_onHit", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "res_apRefund") {
        const amount = (triggered.params["amount"] as number) ?? 2;
        apRefund += amount;
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} AP` };
      }

      return null;
    });

    return { results, apRefund };
  }

  /**
   * Hook: called when a unit takes damage.
   * Fires trg_onTakeDamage passives (e.g., retaliation buffs).
   */
  onDamageTaken(
    world: World,
    entityId: EntityId,
    _damage: number,
    _attackerId: EntityId,
  ): PassiveResult[] {
    return this.firePassives(world, entityId, "trg_onTakeDamage", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (stat && amount > 0) {
          this.statusEffects.applyDynamic(world, entityId, {
            id: `buff_${stat}_react`,
            name: `${ability.name}`,
            duration: 1,
            modifiers: { [stat]: amount },
            maxStacks: 1,
          });
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${stat}` };
        }
      }

      if (triggered.type === "buff_dmgReduce") {
        const pct = (triggered.params["percent"] as number) ?? 20;
        this.statusEffects.applyDynamic(world, entityId, {
          id: "dmg_reduce_react",
          name: `${ability.name}`,
          duration: 1,
          modifiers: { _dmgReducePct: pct },
          maxStacks: 1,
        });
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `-${pct}% damage taken` };
      }

      return null;
    });
  }

  /**
   * Get a damage multiplier from passives that check target state.
   * Fires trg_belowHP passives (e.g., Smell Blood: +dmg vs low HP).
   * Returns a multiplier (1.0 = no change, 1.15 = +15% damage).
   */
  getDamageModifier(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): number {
    let multiplier = 1.0;

    const passives = this.getPassiveAbilities(world, attackerId);
    for (const ability of passives) {
      for (const trigger of ability.triggers) {
        if (trigger.type === "trg_belowHP") {
          const threshold = (trigger.params["hpPercent"] ?? 50) / 100;
          const defenderHealth = world.getComponent<HealthComponent>(defenderId, "health");
          if (defenderHealth && defenderHealth.current / defenderHealth.max <= threshold) {
            const bonus = (trigger.triggeredEffect?.params["bonusPercent"] as number) ?? 10;
            multiplier *= (1 + bonus / 100);
          }
        }
      }
    }

    return multiplier;
  }

  // ── Private helpers ──

  /** Get all passive abilities for an entity. */
  private getPassiveAbilities(world: World, entityId: EntityId): GeneratedAbility[] {
    const comp = world.getComponent<AbilitiesComponent>(entityId, "abilities");
    if (!comp) return [];

    const passives: GeneratedAbility[] = [];
    for (const uid of comp.abilityIds) {
      const ability = resolveAbility(uid);
      if (ability?.isPassive) {
        passives.push(ability);
      }
    }
    return passives;
  }

  /**
   * Fire all passives matching a trigger type, calling the handler for each.
   * Returns all non-null results.
   */
  private firePassives(
    world: World,
    entityId: EntityId,
    triggerType: TriggerType,
    handler: (ability: GeneratedAbility, trigger: GeneratedAbility["triggers"][0]) => PassiveResult | null,
  ): PassiveResult[] {
    const passives = this.getPassiveAbilities(world, entityId);
    const results: PassiveResult[] = [];

    for (const ability of passives) {
      for (const trigger of ability.triggers) {
        if (trigger.type === triggerType) {
          const result = handler(ability, trigger);
          if (result) results.push(result);
        }
      }
    }

    return results;
  }
}
