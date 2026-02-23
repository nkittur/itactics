import type { Component } from "../Component";

export type AIType = "aggressive" | "defensive" | "ranged" | "support" | "beast" | "boss";

export interface AIBehaviorComponent extends Component {
  readonly type: "aiBehavior";
  aiType: AIType;
  aggroRadius: number;
  preferredRange: number;
  fleeThreshold: number;
}

export function createAIBehavior(params: {
  aiType: AIType;
  aggroRadius: number;
  preferredRange: number;
  fleeThreshold: number;
}): AIBehaviorComponent {
  return {
    type: "aiBehavior",
    aiType: params.aiType,
    aggroRadius: params.aggroRadius,
    preferredRange: params.preferredRange,
    fleeThreshold: params.fleeThreshold,
  };
}
