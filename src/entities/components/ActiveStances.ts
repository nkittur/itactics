import type { Component } from "../Component";

export interface StanceEntry {
  skillId: string;
  turnsLeft: number;
}

export interface ActiveStancesComponent extends Component {
  readonly type: "activeStances";
  stances: Map<string, StanceEntry>;
}

export function createActiveStances(): ActiveStancesComponent {
  return {
    type: "activeStances",
    stances: new Map(),
  };
}
