export interface ShieldDef {
  readonly id: string;
  readonly name: string;
  readonly meleeDefBonus: number;
  readonly rangedDefBonus: number;
  readonly durability: number;
  readonly fatiguePenalty: number;
}

const SHIELDS: ReadonlyMap<string, ShieldDef> = new Map([
  ["buckler", {
    id: "buckler", name: "Buckler",
    meleeDefBonus: 10, rangedDefBonus: 10, durability: 48, fatiguePenalty: 8,
  }],
  ["wooden_shield", {
    id: "wooden_shield", name: "Wooden Shield",
    meleeDefBonus: 15, rangedDefBonus: 15, durability: 64, fatiguePenalty: 12,
  }],
  ["heater_shield", {
    id: "heater_shield", name: "Heater Shield",
    meleeDefBonus: 20, rangedDefBonus: 15, durability: 80, fatiguePenalty: 16,
  }],
]);

export function getShield(id: string): ShieldDef | undefined {
  return SHIELDS.get(id);
}

export function getAllShields(): ReadonlyMap<string, ShieldDef> {
  return SHIELDS;
}
