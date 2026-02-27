import type { Component } from "../Component";

export interface ManaComponent extends Component {
  readonly type: "mana";
  current: number;
  max: number;
  recoveryPerTurn: number;
}

export function createMana(params: {
  current?: number;
  max: number;
  recoveryPerTurn: number;
}): ManaComponent {
  return {
    type: "mana",
    current: params.current ?? params.max,
    max: params.max,
    recoveryPerTurn: params.recoveryPerTurn,
  };
}
