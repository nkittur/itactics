import type { Component } from "../Component";

/** Ability IDs (ga_ UIDs) this entity has available in combat. */
export interface AbilitiesComponent extends Component {
  readonly type: "abilities";
  abilityIds: string[];
}

export function createAbilities(abilityIds?: string[]): AbilitiesComponent {
  return {
    type: "abilities",
    abilityIds: abilityIds ?? [],
  };
}
