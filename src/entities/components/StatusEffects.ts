import type { Component } from "../Component";

export interface StatusEffect {
  id: string;
  name: string;
  remainingTurns: number;
  modifiers: Record<string, number>;
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
