import type { Component } from "../Component";

/** Per-entity cooldown tracking for generated abilities. */
export interface AbilityCooldownsComponent extends Component {
  readonly type: "abilityCooldowns";
  /** Maps ability UID → remaining cooldown turns. */
  cooldowns: Record<string, number>;
}

export function createAbilityCooldowns(): AbilityCooldownsComponent {
  return {
    type: "abilityCooldowns",
    cooldowns: {},
  };
}

/** Reset all cooldowns for an entity. */
export function resetCooldowns(comp: AbilityCooldownsComponent): void {
  for (const key of Object.keys(comp.cooldowns)) {
    comp.cooldowns[key] = 0;
  }
}

/** Reduce all cooldowns by N turns (min 0). */
export function reduceCooldowns(comp: AbilityCooldownsComponent, amount: number): void {
  for (const key of Object.keys(comp.cooldowns)) {
    comp.cooldowns[key] = Math.max(0, (comp.cooldowns[key] ?? 0) - amount);
  }
}

/** Reset a single ability's cooldown. */
export function resetAbilityCooldown(comp: AbilityCooldownsComponent, abilityId: string): void {
  comp.cooldowns[abilityId] = 0;
}
