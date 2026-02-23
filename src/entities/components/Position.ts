import type { Component } from "../Component";

export interface PositionComponent extends Component {
  readonly type: "position";
  q: number;
  r: number;
  elevation: number;
  facing: number;
}

export function createPosition(params: {
  q: number;
  r: number;
  elevation?: number;
  facing?: number;
}): PositionComponent {
  return {
    type: "position",
    q: params.q,
    r: params.r,
    elevation: params.elevation ?? 0,
    facing: params.facing ?? 0,
  };
}
