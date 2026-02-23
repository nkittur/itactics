import type { Component } from "../Component";

export interface BackgroundComponent extends Component {
  readonly type: "background";
  id: string;
  traits: string[];
}

export function createBackground(params: {
  id: string;
  traits?: string[];
}): BackgroundComponent {
  return {
    type: "background",
    id: params.id,
    traits: params.traits ?? [],
  };
}
