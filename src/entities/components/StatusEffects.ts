import type { Component } from "../Component";
import type { EntityId } from "../Entity";

export interface StatusEffect {
  id: string;
  name: string;
  remainingTurns: number;
  modifiers: Record<string, number>;
  /** Entity who applied this effect (for DoT tick rate from source). */
  sourceId?: EntityId;
}

export interface StatusEffectsComponent extends Component {
  readonly type: "statusEffects";
  effects: StatusEffect[];
}

export function createStatusEffects(params?: {
  effects?: StatusEffect[];
}): StatusEffectsComponent {
  return {
    type: "statusEffects",
    effects: params?.effects ?? [],
  };
}
