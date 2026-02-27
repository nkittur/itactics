export type ArmorWeight = "light" | "medium" | "heavy";

export interface ArmorDef {
  readonly id: string;
  readonly name: string;
  readonly slot: "body" | "head";
  readonly weight: ArmorWeight;
  readonly armor: number;          // flat physical damage reduction
  readonly magicResist: number;    // flat magical damage reduction
  readonly staminaPenalty: number;
  readonly initiativePenalty: number;
  readonly mpPenalty: number;
  readonly level: number;          // item level
}

const ARMORS: ReadonlyMap<string, ArmorDef> = new Map([
  // ── Body (Light) ──
  ["cloth_tunic", {
    id: "cloth_tunic", name: "Cloth Tunic", slot: "body", weight: "light",
    armor: 1, magicResist: 0, staminaPenalty: 0, initiativePenalty: 0, mpPenalty: 0, level: 1,
  }],
  ["linen_tunic", {
    id: "linen_tunic", name: "Linen Tunic", slot: "body", weight: "light",
    armor: 1, magicResist: 0, staminaPenalty: 0, initiativePenalty: 1, mpPenalty: 0, level: 1,
  }],
  ["leather_jerkin", {
    id: "leather_jerkin", name: "Leather Jerkin", slot: "body", weight: "light",
    armor: 3, magicResist: 0, staminaPenalty: 1, initiativePenalty: 2, mpPenalty: 0, level: 2,
  }],

  // ── Body (Medium) ──
  ["chain_mail", {
    id: "chain_mail", name: "Chain Mail", slot: "body", weight: "medium",
    armor: 5, magicResist: 0, staminaPenalty: 3, initiativePenalty: 4, mpPenalty: 0, level: 3,
  }],
  ["mail_hauberk", {
    id: "mail_hauberk", name: "Mail Hauberk", slot: "body", weight: "medium",
    armor: 6, magicResist: 0, staminaPenalty: 3, initiativePenalty: 5, mpPenalty: 1, level: 3,
  }],
  ["scale_armor", {
    id: "scale_armor", name: "Scale Armor", slot: "body", weight: "medium",
    armor: 7, magicResist: 0, staminaPenalty: 4, initiativePenalty: 6, mpPenalty: 1, level: 4,
  }],

  // ── Body (Heavy) ──
  ["coat_of_plates", {
    id: "coat_of_plates", name: "Coat of Plates", slot: "body", weight: "heavy",
    armor: 9, magicResist: 0, staminaPenalty: 5, initiativePenalty: 7, mpPenalty: 2, level: 5,
  }],
  ["plate_armor", {
    id: "plate_armor", name: "Plate Armor", slot: "body", weight: "heavy",
    armor: 10, magicResist: 0, staminaPenalty: 6, initiativePenalty: 8, mpPenalty: 2, level: 5,
  }],

  // ── Head (Light) ──
  ["hood", {
    id: "hood", name: "Hood", slot: "head", weight: "light",
    armor: 0, magicResist: 0, staminaPenalty: 0, initiativePenalty: 0, mpPenalty: 0, level: 1,
  }],
  ["leather_cap", {
    id: "leather_cap", name: "Leather Cap", slot: "head", weight: "light",
    armor: 1, magicResist: 0, staminaPenalty: 0, initiativePenalty: 1, mpPenalty: 0, level: 2,
  }],

  // ── Head (Medium) ──
  ["mail_coif", {
    id: "mail_coif", name: "Mail Coif", slot: "head", weight: "medium",
    armor: 2, magicResist: 0, staminaPenalty: 1, initiativePenalty: 2, mpPenalty: 0, level: 3,
  }],

  // ── Head (Heavy) ──
  ["nasal_helm", {
    id: "nasal_helm", name: "Nasal Helm", slot: "head", weight: "heavy",
    armor: 3, magicResist: 0, staminaPenalty: 2, initiativePenalty: 3, mpPenalty: 0, level: 4,
  }],
  ["great_helm", {
    id: "great_helm", name: "Great Helm", slot: "head", weight: "heavy",
    armor: 4, magicResist: 0, staminaPenalty: 2, initiativePenalty: 4, mpPenalty: 0, level: 5,
  }],
]);

export function getArmorDef(id: string): ArmorDef | undefined {
  return ARMORS.get(id);
}

export function getAllArmors(): ReadonlyMap<string, ArmorDef> {
  return ARMORS;
}
