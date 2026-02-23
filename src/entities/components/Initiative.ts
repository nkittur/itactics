import type { Component } from "../Component";

export interface InitiativeComponent extends Component {
  readonly type: "initiative";
  base: number;
  effective: number;
}

export function createInitiative(params: {
  base: number;
  effective?: number;
}): InitiativeComponent {
  return {
    type: "initiative",
    base: params.base,
    effective: params.effective ?? params.base,
  };
}
