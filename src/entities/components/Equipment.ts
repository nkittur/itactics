import type { Component } from "../Component";

export interface EquipmentComponent extends Component {
  readonly type: "equipment";
  mainHand: string | null;
  offHand: string | null;
  /** Current shield durability (null if no shield). */
  shieldDurability: number | null;
  accessory: string | null;
  bag: string[];
}

export function createEquipment(params?: {
  mainHand?: string | null;
  offHand?: string | null;
  shieldDurability?: number | null;
  accessory?: string | null;
  bag?: string[];
}): EquipmentComponent {
  return {
    type: "equipment",
    mainHand: params?.mainHand ?? null,
    offHand: params?.offHand ?? null,
    shieldDurability: params?.shieldDurability ?? null,
    accessory: params?.accessory ?? null,
    bag: params?.bag ?? [],
  };
}
