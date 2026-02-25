export type ArmorTier = "light" | "medium" | "heavy";

export interface ArmorDef {
  readonly id: string;
  readonly name: string;
  readonly slot: "body" | "head";
  readonly tier: ArmorTier;
  readonly durability: number;
  readonly fatiguePenalty: number;
  readonly initiativePenalty: number;
  readonly mpPenalty: number;
}

const ARMORS: ReadonlyMap<string, ArmorDef> = new Map([
  // ── Body ──
  ["linen_tunic", {
    id: "linen_tunic", name: "Linen Tunic", slot: "body", tier: "light",
    durability: 3, fatiguePenalty: 0, initiativePenalty: 1, mpPenalty: 0,
  }],
  ["leather_jerkin", {
    id: "leather_jerkin", name: "Leather Jerkin", slot: "body", tier: "light",
    durability: 10, fatiguePenalty: 6, initiativePenalty: 5, mpPenalty: 0,
  }],
  ["mail_hauberk", {
    id: "mail_hauberk", name: "Mail Hauberk", slot: "body", tier: "medium",
    durability: 30, fatiguePenalty: 18, initiativePenalty: 14, mpPenalty: 1,
  }],
  ["coat_of_plates", {
    id: "coat_of_plates", name: "Coat of Plates", slot: "body", tier: "heavy",
    durability: 50, fatiguePenalty: 28, initiativePenalty: 19, mpPenalty: 2,
  }],

  // ── Head ──
  ["hood", {
    id: "hood", name: "Hood", slot: "head", tier: "light",
    durability: 5, fatiguePenalty: 1, initiativePenalty: 1, mpPenalty: 0,
  }],
  ["leather_cap", {
    id: "leather_cap", name: "Leather Cap", slot: "head", tier: "light",
    durability: 8, fatiguePenalty: 2, initiativePenalty: 2, mpPenalty: 0,
  }],
  ["mail_coif", {
    id: "mail_coif", name: "Mail Coif", slot: "head", tier: "medium",
    durability: 15, fatiguePenalty: 5, initiativePenalty: 5, mpPenalty: 0,
  }],
  ["nasal_helm", {
    id: "nasal_helm", name: "Nasal Helm", slot: "head", tier: "heavy",
    durability: 20, fatiguePenalty: 6, initiativePenalty: 7, mpPenalty: 0,
  }],
]);

export function getArmorDef(id: string): ArmorDef | undefined {
  return ARMORS.get(id);
}

export function getAllArmors(): ReadonlyMap<string, ArmorDef> {
  return ARMORS;
}
