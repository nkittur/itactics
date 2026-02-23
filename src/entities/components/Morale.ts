import type { Component } from "../Component";

export type MoraleState = "confident" | "steady" | "wavering" | "breaking" | "fleeing";

export interface MoraleComponent extends Component {
  readonly type: "morale";
  current: number;
  state: MoraleState;
}

export function createMorale(params: {
  current: number;
  state?: MoraleState;
}): MoraleComponent {
  return {
    type: "morale",
    current: params.current,
    state: params.state ?? "steady",
  };
}
