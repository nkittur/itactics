export type ItemSlotType = "weapon" | "shield" | "body_armor" | "head_armor" | "consumable";

export interface ItemModifier {
  stat: string;
  delta: number;
  label: string;
}

export interface GeneratedItem {
  uid: string;
  baseId: string;
  slotType: ItemSlotType;
  name: string;
  itemLevel: number;
  modifiers: ItemModifier[];
  buyPrice: number;
}

let uidCounter = 0;

export function generateUID(): string {
  const ts = Date.now().toString(36);
  const cnt = (uidCounter++).toString(36);
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `gi_${ts}${cnt}${rnd}`;
}

export function isGeneratedItemId(id: string): boolean {
  return id.startsWith("gi_");
}
