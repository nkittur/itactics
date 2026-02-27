export interface ShieldDef {
  readonly id: string;
  readonly name: string;
  readonly dodgeBonus: number;      // replaces meleeDefBonus + rangedDefBonus
  readonly armor: number;           // small flat armor bonus
  readonly staminaPenalty: number;
  readonly mpPenalty: number;
  readonly level: number;
}

const SHIELDS: ReadonlyMap<string, ShieldDef> = new Map([
  ["buckler", {
    id: "buckler", name: "Buckler",
    dodgeBonus: 10, armor: 1, staminaPenalty: 3, mpPenalty: 0, level: 1,
  }],
  ["wooden_shield", {
    id: "wooden_shield", name: "Wooden Shield",
    dodgeBonus: 15, armor: 2, staminaPenalty: 5, mpPenalty: 0, level: 2,
  }],
  ["heater_shield", {
    id: "heater_shield", name: "Heater Shield",
    dodgeBonus: 18, armor: 3, staminaPenalty: 7, mpPenalty: 1, level: 3,
  }],
  ["kite_shield", {
    id: "kite_shield", name: "Kite Shield",
    dodgeBonus: 20, armor: 4, staminaPenalty: 9, mpPenalty: 1, level: 4,
  }],
]);

export function getShield(id: string): ShieldDef | undefined {
  return SHIELDS.get(id);
}

export function getAllShields(): ReadonlyMap<string, ShieldDef> {
  return SHIELDS;
}
