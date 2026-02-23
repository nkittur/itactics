import type { Component } from "../Component";

export interface StatsComponent extends Component {
  readonly type: "stats";
  hitpoints: number;
  fatigue: number;
  resolve: number;
  initiative: number;
  meleeSkill: number;
  rangedSkill: number;
  meleeDefense: number;
  rangedDefense: number;
  level: number;
  experience: number;
}

export function createStats(params: {
  hitpoints: number;
  fatigue: number;
  resolve: number;
  initiative: number;
  meleeSkill: number;
  rangedSkill: number;
  meleeDefense: number;
  rangedDefense: number;
  level?: number;
  experience?: number;
}): StatsComponent {
  return {
    type: "stats",
    hitpoints: params.hitpoints,
    fatigue: params.fatigue,
    resolve: params.resolve,
    initiative: params.initiative,
    meleeSkill: params.meleeSkill,
    rangedSkill: params.rangedSkill,
    meleeDefense: params.meleeDefense,
    rangedDefense: params.rangedDefense,
    level: params.level ?? 1,
    experience: params.experience ?? 0,
  };
}
