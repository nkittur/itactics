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
