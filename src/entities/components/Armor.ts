import type { Component } from "../Component";

export interface ArmorSlot {
  id: string;
  armor: number;
  magicResist: number;
}

export interface ArmorComponent extends Component {
  readonly type: "armor";
  head: ArmorSlot | null;
  body: ArmorSlot | null;
}

export function createArmor(params: {
  head?: ArmorSlot | null;
  body?: ArmorSlot | null;
}): ArmorComponent {
  return {
    type: "armor",
    head: params.head ?? null,
    body: params.body ?? null,
  };
}
