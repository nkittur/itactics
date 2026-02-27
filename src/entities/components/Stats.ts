import type { Component } from "../Component";

export interface StatsComponent extends Component {
  readonly type: "stats";
  hitpoints: number;
  stamina: number;
  mana: number;
  resolve: number;
  initiative: number;
  meleeSkill: number;
  rangedSkill: number;
  dodge: number;
  magicResist: number;
  critChance: number;
  critMultiplier: number;
  movementPoints: number;
  level: number;
  experience: number;
  bonusDamage: number;
  bonusArmor: number;
}

export function createStats(params: {
  hitpoints: number;
  stamina: number;
  mana?: number;
  resolve: number;
  initiative: number;
  meleeSkill: number;
  rangedSkill: number;
  dodge: number;
  magicResist?: number;
  critChance?: number;
  critMultiplier?: number;
  movementPoints?: number;
  level?: number;
  experience?: number;
  bonusDamage?: number;
  bonusArmor?: number;
}): StatsComponent {
  return {
    type: "stats",
    hitpoints: params.hitpoints,
    stamina: params.stamina,
    mana: params.mana ?? 20,
    resolve: params.resolve,
    initiative: params.initiative,
    meleeSkill: params.meleeSkill,
    rangedSkill: params.rangedSkill,
    dodge: params.dodge,
    magicResist: params.magicResist ?? 0,
    critChance: params.critChance ?? 5,
    critMultiplier: params.critMultiplier ?? 1.5,
    movementPoints: params.movementPoints ?? 8,
    level: params.level ?? 1,
    experience: params.experience ?? 0,
    bonusDamage: params.bonusDamage ?? 0,
    bonusArmor: params.bonusArmor ?? 0,
  };
}
