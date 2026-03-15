import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { GeneratedAbility, TriggerType, TriggerGrants, TriggerCondition } from "@data/AbilityData";
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

/** Result of onDamageTaken: passive results plus optional reflected damage to attacker. */
export interface OnDamageTakenResult {
  results: PassiveResult[];
  reflectDamage: number;
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
   * Returns results and grants to apply immediately to the entity.
   */
  onTurnStart(
    world: World,
    entityId: EntityId,
  ): { results: PassiveResult[]; grants: TriggerGrants } {
    const grants: TriggerGrants = {};
    const results = this.firePassivesWithGrants(world, entityId, "trg_turnStart", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        let amount = (triggered.params["amount"] as number) ?? 0;

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
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (amount > 0) return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} AP` };
      }
      if (triggered.type === "apply_status") {
        const statusId = (triggered.params["statusId"] as string) ?? "";
        if (statusId) return { abilityName: ability.name, abilityUid: ability.uid, effect: `Apply ${statusId}` };
      }
      if (triggered.type === "buff_stat") {
        const stat = (triggered.params["stat"] as string) ?? "";
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (stat && amount) return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${stat}` };
      }
      return null;
    }, grants);
    return { results, grants };
  }

  /**
   * Like firePassives but accumulates trigger resource grants (ap, hp, mana, stamina, mp) into the given object.
   * Call applyTriggeredGrants for each trigger before the handler so grants are instant.
   */
  private firePassivesWithGrants(
    world: World,
    entityId: EntityId,
    triggerType: TriggerType,
    handler: (ability: GeneratedAbility, trigger: GeneratedAbility["triggers"][0]) => PassiveResult | null,
    grants: TriggerGrants,
  ): PassiveResult[] {
    const passives = this.getPassiveAbilities(world, entityId);
    const results: PassiveResult[] = [];
    for (const ability of passives) {
      for (const trigger of ability.triggers) {
        if (trigger.type !== triggerType) continue;
        if (trigger.condition && !this.evaluateTriggerCondition(world, entityId, trigger.condition)) continue;
        if (trigger.triggeredEffect) {
          const te = trigger.triggeredEffect as { type: string; params: Record<string, number | string> };
          this.applyTriggeredGrants(te, entityId, world, grants);
          if (te.type === "apply_status") {
            const statusId = (te.params["statusId"] as string) ?? "";
            const turns = (te.params["turns"] as number) ?? 1;
            if (statusId) this.statusEffects.apply(world, entityId, statusId, turns);
          }
          if (te.type === "buff_stat" && triggerType === "trg_turnStart") {
            const stat = (te.params["stat"] as string) ?? "";
            const amount = (te.params["amount"] as number) ?? 0;
            const turns = (te.params["turns"] as number) ?? 1;
            if (stat && amount !== 0) {
              this.statusEffects.applyDynamic(world, entityId, {
                id: `buff_${stat}_turnStart`,
                name: "Turn-start buff",
                duration: turns,
                modifiers: { [stat]: amount },
                maxStacks: 1,
              });
            }
          }
        }
        const result = handler(ability, trigger);
        if (result) results.push(result);
      }
    }
    return results;
  }

  /** Accumulate triggered effect resource grants into the grants object (instant to pool). */
  private applyTriggeredGrants(
    triggered: { type: string; params: Record<string, number | string> },
    entityId: EntityId,
    world: World,
    grants: TriggerGrants,
  ): void {
    if (triggered.type === "res_apRefund") {
      const amount = (triggered.params["amount"] as number) ?? 0;
      if (amount > 0) grants.ap = (grants.ap ?? 0) + amount;
      return;
    }
    if (triggered.type === "heal_flat") {
      let amount = (triggered.params["amount"] as number) ?? 0;
      const pctMax = triggered.params["pctMax"] as number | undefined;
      if (pctMax != null && pctMax > 0) {
        const health = world.getComponent<HealthComponent>(entityId, "health");
        if (health) amount = Math.floor(health.max * (pctMax / 100));
      }
      if (amount > 0) grants.hp = (grants.hp ?? 0) + amount;
      return;
    }
    if (triggered.type === "res_mana") {
      const amount = (triggered.params["amount"] as number) ?? 0;
      if (amount > 0) grants.mana = (grants.mana ?? 0) + amount;
      return;
    }
    if (triggered.type === "res_stamina") {
      const amount = (triggered.params["amount"] as number) ?? 0;
      if (amount > 0) grants.stamina = (grants.stamina ?? 0) + amount;
      return;
    }
    if (triggered.type === "res_mp") {
      const amount = (triggered.params["amount"] as number) ?? 0;
      if (amount > 0) grants.mp = (grants.mp ?? 0) + amount;
      return;
    }
  }

  /**
   * Hook: called when a unit kills another unit.
   * Fires trg_onKill passives (e.g., Blood Rush: AP on kill, Triumph: heal on kill).
   * Returns results and grants to apply immediately to the killer.
   */
  onKill(
    world: World,
    killerId: EntityId,
    _killedId: EntityId,
  ): { results: PassiveResult[]; grants: TriggerGrants } {
    const grants: TriggerGrants = {};
    const results = this.firePassivesWithGrants(world, killerId, "trg_onKill", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "res_apRefund") {
        const amount = (triggered.params["amount"] as number) ?? 3;
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} AP` };
      }
      if (triggered.type === "heal_flat" || triggered.type === "res_mana" || triggered.type === "res_stamina" || triggered.type === "res_mp") {
        const desc = triggered.type === "heal_flat" ? `Heal ${triggered.params["amount"] ?? 0}` : `+${triggered.params["amount"] ?? 0} ${triggered.type.replace("res_", "")}`;
        return { abilityName: ability.name, abilityUid: ability.uid, effect: desc };
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

      if (triggered.type === "extend_status") {
        const statusId = (triggered.params["statusId"] as string) ?? "haste";
        const turns = (triggered.params["turns"] as number) ?? 1;
        const maxTurns = triggered.params["maxTurns"] as number | undefined;
        const extended = this.statusEffects.extendDuration(world, killerId, statusId, turns, maxTurns);
        if (extended) {
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `Extend ${statusId} +${turns}t` };
        }
      }

      return null;
    }, grants);

    return { results, grants };
  }

  /**
   * Hook: called when a debuff is applied to a target.
   * Fires trg_onHit passives on the applier (e.g., Opportunist's Eye: AP on debuff applied).
   * Returns results and grants to apply immediately to the applier.
   */
  onDebuffApplied(
    world: World,
    applierId: EntityId,
    _debuffId: string,
  ): { results: PassiveResult[]; grants: TriggerGrants } {
    const grants: TriggerGrants = {};
    const results = this.firePassivesWithGrants(world, applierId, "trg_onHit", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;
      if (triggered.type === "res_apRefund" || triggered.type === "heal_flat" || triggered.type === "res_mana" || triggered.type === "res_stamina" || triggered.type === "res_mp") {
        const amount = (triggered.params["amount"] as number) ?? (triggered.type === "res_apRefund" ? 2 : 0);
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${triggered.type === "res_apRefund" ? "AP" : triggered.type.replace("res_", "")}` };
      }
      return null;
    }, grants);
    return { results, grants };
  }

  /**
   * Hook: called when a unit dodges an attack (attacker missed).
   * Fires trg_onDodge passives (e.g., +dodge for 1 turn, +AP, +MP, heal, etc.).
   * Returns results and grants to apply immediately to the dodger (reaction pools or direct to components).
   */
  onDodge(
    world: World,
    dodgerId: EntityId,
    attackerId: EntityId,
  ): { results: PassiveResult[]; grants: TriggerGrants } {
    const grants: TriggerGrants = {};
    const results = this.firePassivesWithGrants(world, dodgerId, "trg_onDodge", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "dmg_to_attacker") {
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (amount > 0) {
          const health = world.getComponent<HealthComponent>(attackerId, "health");
          if (health) {
            health.current = Math.max(0, health.current - amount);
            return { abilityName: ability.name, abilityUid: ability.uid, effect: `Deal ${amount} to attacker` };
          }
        }
        return null;
      }

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        const amount = triggered.params["amount"] as number ?? 0;
        const turns = (triggered.params["turns"] as number) ?? 1;
        if (stat && amount !== 0) {
          this.statusEffects.applyDynamic(world, dodgerId, {
            id: `buff_${stat}_on_dodge`,
            name: ability.name,
            duration: turns,
            modifiers: { [stat]: amount },
            maxStacks: 1,
          });
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${stat}` };
        }
      }

      if (triggered.type === "res_apRefund" || triggered.type === "heal_flat" || triggered.type === "res_mana" || triggered.type === "res_stamina" || triggered.type === "res_mp") {
        const amount = (triggered.params["amount"] as number) ?? (triggered.type === "res_apRefund" ? 1 : 0);
        const label = triggered.type === "res_apRefund" ? "AP (dodger)" : triggered.type.replace("res_", "");
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `+${amount} ${label}` };
      }

      return null;
    }, grants);
    return { results, grants };
  }

  /**
   * Hook: called when a unit takes damage.
   * Fires trg_onTakeDamage passives (e.g., retaliation buffs, reflect, root attacker).
   * Returns passive results and total reflected damage to apply to the attacker.
   */
  onDamageTaken(
    world: World,
    victimId: EntityId,
    damage: number,
    attackerId: EntityId,
  ): OnDamageTakenResult {
    let reflectDamage = 0;
    const results = this.firePassives(world, victimId, "trg_onTakeDamage", (ability, trigger) => {
      const triggered = trigger.triggeredEffect;
      if (!triggered) return null;

      if (triggered.type === "buff_stat") {
        const stat = triggered.params["stat"] as string;
        const amount = (triggered.params["amount"] as number) ?? 0;
        if (stat && amount > 0) {
          this.statusEffects.applyDynamic(world, victimId, {
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
        this.statusEffects.applyDynamic(world, victimId, {
          id: "dmg_reduce_react",
          name: `${ability.name}`,
          duration: 1,
          modifiers: { _dmgReducePct: pct },
          maxStacks: 1,
        });
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `-${pct}% damage taken` };
      }

      if (triggered.type === "dmg_reflect") {
        const pct = (triggered.params["percent"] as number) ?? 10;
        reflectDamage += Math.floor(damage * (pct / 100));
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `Reflect ${pct}%` };
      }

      if (triggered.type === "cc_root") {
        const turns = (triggered.params["turns"] as number) ?? 1;
        this.statusEffects.apply(world, attackerId, "root", turns);
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `Root attacker ${turns}t` };
      }

      if (triggered.type === "cc_stun") {
        const turns = (triggered.params["turns"] as number) ?? 1;
        this.statusEffects.apply(world, attackerId, "stun", turns);
        return { abilityName: ability.name, abilityUid: ability.uid, effect: `Stun attacker ${turns}t` };
      }

      if (triggered.type === "apply_status_to_attacker") {
        const statusId = (triggered.params["statusId"] as string) ?? "";
        const turns = (triggered.params["turns"] as number) ?? 1;
        if (statusId) {
          this.statusEffects.apply(world, attackerId, statusId, turns, victimId);
          return { abilityName: ability.name, abilityUid: ability.uid, effect: `Apply ${statusId} to attacker` };
        }
      }

      return null;
    });
    return { results, reflectDamage };
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
        if (trigger.type !== triggerType) continue;
        if (trigger.condition && !this.evaluateTriggerCondition(world, entityId, trigger.condition)) continue;
        const result = handler(ability, trigger);
        if (result) results.push(result);
      }
    }

    return results;
  }

  /** Evaluate "while [condition]" so triggers only fire when condition is true. */
  private evaluateTriggerCondition(world: World, entityId: EntityId, condition: TriggerCondition): boolean {
    switch (condition.type) {
      case "has_status":
        return this.statusEffects.hasEffect(world, entityId, condition.statusId);
      case "below_hp_percent": {
        const health = world.getComponent<HealthComponent>(entityId, "health");
        if (!health || health.max <= 0) return false;
        return (health.current / health.max) * 100 < condition.percent;
      }
      case "above_hp_percent": {
        const health = world.getComponent<HealthComponent>(entityId, "health");
        if (!health || health.max <= 0) return false;
        return (health.current / health.max) * 100 >= condition.percent;
      }
      default:
        return true;
    }
  }
}
