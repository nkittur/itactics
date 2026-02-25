import type { Component } from "../Component";
import type { StatKey } from "@data/TalentData";

export interface TalentStarsComponent extends Component {
  readonly type: "talentStars";
  stars: Record<StatKey, number>;
}

export function createTalentStars(stars: Record<StatKey, number>): TalentStarsComponent {
  return {
    type: "talentStars",
    stars: { ...stars },
  };
}
