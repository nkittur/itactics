import type { Component } from "../Component";

export interface CharacterClassComponent extends Component {
  readonly type: "characterClass";
  classId: string;
}
