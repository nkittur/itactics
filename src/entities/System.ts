import type { World } from "./World";

export interface System {
  readonly name: string;
  /** Called once per update tick. `dt` is in seconds. */
  update(world: World, dt: number): void;
}
