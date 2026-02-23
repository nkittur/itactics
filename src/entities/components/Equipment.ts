import type { Component } from "../Component";

export interface EquipmentComponent extends Component {
  readonly type: "equipment";
  mainHand: string | null;
  offHand: string | null;
  accessory: string | null;
  bag: string[];
}

export function createEquipment(params?: {
  mainHand?: string | null;
  offHand?: string | null;
  accessory?: string | null;
  bag?: string[];
}): EquipmentComponent {
  return {
    type: "equipment",
    mainHand: params?.mainHand ?? null,
    offHand: params?.offHand ?? null,
    accessory: params?.accessory ?? null,
    bag: params?.bag ?? [],
  };
}
