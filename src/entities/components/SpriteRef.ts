import type { Component } from "../Component";

export interface SpriteRefComponent extends Component {
  readonly type: "spriteRef";
  atlasKey: string;
  framePrefix: string;
  currentFrame: number;
  tint: string | null;
}

export function createSpriteRef(params: {
  atlasKey: string;
  framePrefix: string;
  currentFrame?: number;
  tint?: string | null;
}): SpriteRefComponent {
  return {
    type: "spriteRef",
    atlasKey: params.atlasKey,
    framePrefix: params.framePrefix,
    currentFrame: params.currentFrame ?? 0,
    tint: params.tint ?? null,
  };
}
