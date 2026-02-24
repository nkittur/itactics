import type { Component } from "../Component";
import type { CharacterClass } from "@data/ClassData";

export interface CharacterClassComponent extends Component {
  readonly type: "characterClass";
  classId: CharacterClass;
}
