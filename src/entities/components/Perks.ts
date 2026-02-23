import type { Component } from "../Component";

export interface PerksComponent extends Component {
  readonly type: "perks";
  unlocked: string[];
  availablePoints: number;
}

export function createPerks(params?: {
  unlocked?: string[];
  availablePoints?: number;
}): PerksComponent {
  return {
    type: "perks",
    unlocked: params?.unlocked ?? [],
    availablePoints: params?.availablePoints ?? 0,
  };
}
