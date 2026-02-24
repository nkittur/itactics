export interface ArmorDef {
  readonly id: string;
  readonly name: string;
  readonly slot: "body" | "head";
  readonly durability: number;
  readonly fatiguePenalty: number;
  readonly initiativePenalty: number;
}

const ARMORS: ReadonlyMap<string, ArmorDef> = new Map([
  // ── Body ──
  ["linen_tunic", {
    id: "linen_tunic", name: "Linen Tunic", slot: "body",
    durability: 10, fatiguePenalty: 0, initiativePenalty: 1,
  }],
  ["leather_jerkin", {
    id: "leather_jerkin", name: "Leather Jerkin", slot: "body",
    durability: 40, fatiguePenalty: 6, initiativePenalty: 5,
  }],
  ["mail_hauberk", {
    id: "mail_hauberk", name: "Mail Hauberk", slot: "body",
    durability: 120, fatiguePenalty: 18, initiativePenalty: 14,
  }],
  ["coat_of_plates", {
    id: "coat_of_plates", name: "Coat of Plates", slot: "body",
    durability: 200, fatiguePenalty: 28, initiativePenalty: 19,
  }],

  // ── Head ──
  ["hood", {
    id: "hood", name: "Hood", slot: "head",
    durability: 20, fatiguePenalty: 1, initiativePenalty: 1,
  }],
  ["leather_cap", {
    id: "leather_cap", name: "Leather Cap", slot: "head",
    durability: 30, fatiguePenalty: 2, initiativePenalty: 2,
  }],
  ["mail_coif", {
    id: "mail_coif", name: "Mail Coif", slot: "head",
    durability: 60, fatiguePenalty: 5, initiativePenalty: 5,
  }],
  ["nasal_helm", {
    id: "nasal_helm", name: "Nasal Helm", slot: "head",
    durability: 80, fatiguePenalty: 6, initiativePenalty: 7,
  }],
]);

export function getArmorDef(id: string): ArmorDef | undefined {
  return ARMORS.get(id);
}

export function getAllArmors(): ReadonlyMap<string, ArmorDef> {
  return ARMORS;
}
