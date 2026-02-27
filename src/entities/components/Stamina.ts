import type { Component } from "../Component";

export interface StaminaComponent extends Component {
  readonly type: "stamina";
  current: number;
  max: number;
  recoveryPerTurn: number;
}

export function createStamina(params: {
  current?: number;
  max: number;
  recoveryPerTurn: number;
}): StaminaComponent {
  return {
    type: "stamina",
    current: params.current ?? 0,
    max: params.max,
    recoveryPerTurn: params.recoveryPerTurn,
  };
}
