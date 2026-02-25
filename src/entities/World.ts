import type { EntityId } from "./Entity";
import type { Component } from "./Component";
import type { System } from "./System";

export class World {
  private entities = new Set<EntityId>();
  private components = new Map<string, Map<EntityId, Component>>();
  // componentType -> (entityId -> component)
  private systems: System[] = [];
  private nextId = 0;

  createEntity(): EntityId {
    const id = `e${this.nextId++}`;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.components.values()) {
      store.delete(id);
    }
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    let store = this.components.get(component.type);
    if (!store) {
      store = new Map();
      this.components.set(component.type, store);
    }
    store.set(entityId, component);
  }

  getComponent<T extends Component>(entityId: EntityId, type: string): T | undefined {
    return this.components.get(type)?.get(entityId) as T | undefined;
  }

  /** Query all entities that have ALL the specified component types. */
  query(...types: string[]): EntityId[] {
    const result: EntityId[] = [];
    for (const id of this.entities) {
      const hasAll = types.every((t) => this.components.get(t)?.has(id));
      if (hasAll) result.push(id);
    }
    return result;
  }

  registerSystem(system: System): void {
    this.systems.push(system);
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }

  /** Serialize all entities and components for saving. */
  serialize(): object {
    const data: Record<string, Record<string, Component>> = {};
    for (const id of this.entities) {
      data[id] = {};
      for (const [type, store] of this.components) {
        const comp = store.get(id);
        if (comp) data[id][type] = comp;
      }
    }
    return { entities: data, nextId: this.nextId };
  }

  /** Restore world state from a serialized snapshot. Clears existing state. */
  deserialize(snapshot: { entities: Record<string, Record<string, Component>>; nextId: number }): void {
    this.entities.clear();
    this.components.clear();
    this.nextId = snapshot.nextId;

    for (const [entityId, comps] of Object.entries(snapshot.entities)) {
      this.entities.add(entityId as EntityId);
      for (const [type, comp] of Object.entries(comps)) {
        let store = this.components.get(type);
        if (!store) {
          store = new Map();
          this.components.set(type, store);
        }
        store.set(entityId as EntityId, comp as Component);
      }
    }
  }
}
