import type { Component } from "../Component";

export interface FatigueComponent extends Component {
  readonly type: "fatigue";
  current: number;
  max: number;
  recoveryPerTurn: number;
}

export function createFatigue(params: {
  current?: number;
  max: number;
  recoveryPerTurn: number;
}): FatigueComponent {
  return {
    type: "fatigue",
    current: params.current ?? 0,
    max: params.max,
    recoveryPerTurn: params.recoveryPerTurn,
  };
}
