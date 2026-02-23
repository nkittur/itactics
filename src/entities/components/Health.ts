import type { Component } from "../Component";

export interface HealthComponent extends Component {
  readonly type: "health";
  current: number;
  max: number;
  injuries: string[];
}

export function createHealth(params: {
  current: number;
  max: number;
  injuries?: string[];
}): HealthComponent {
  return {
    type: "health",
    current: params.current,
    max: params.max,
    injuries: params.injuries ?? [],
  };
}
