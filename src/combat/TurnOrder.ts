import type { EntityId } from "@entities/Entity";
import type { World } from "@entities/World";
import type { InitiativeComponent } from "@entities/components/Initiative";
import type { HealthComponent } from "@entities/components/Health";
import type { FatigueComponent } from "@entities/components/Fatigue";

export interface TurnEntry {
  entityId: EntityId;
  effectiveInitiative: number;
  hasActed: boolean;
  isWaiting: boolean;
}

export class TurnOrder {
  private entries: TurnEntry[] = [];
  private currentIndex = 0;
  private round = 1;

  /**
   * Calculate initiative for all living combatants and sort.
   * Queries all entities that have "initiative" and "health" components.
   * Effective initiative = base - currentFatigue (simplified for Phase 1).
   * Sorted descending by effective initiative.
   */
  calculateOrder(world: World): void {
    const combatants = world.query("initiative", "health");
    this.entries = [];

    for (const entityId of combatants) {
      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (!health || health.current <= 0) continue;

      const init = world.getComponent<InitiativeComponent>(entityId, "initiative");
      if (!init) continue;

      const fatigue = world.getComponent<FatigueComponent>(entityId, "fatigue");
      const fatiguePenalty = fatigue ? fatigue.current : 0;

      const effectiveInitiative = init.base - fatiguePenalty;

      // Update the stored effective value on the component
      init.effective = effectiveInitiative;

      this.entries.push({
        entityId,
        effectiveInitiative,
        hasActed: false,
        isWaiting: false,
      });
    }

    // Sort descending by effective initiative; ties broken by entityId for stability
    this.entries.sort((a, b) => {
      if (b.effectiveInitiative !== a.effectiveInitiative) {
        return b.effectiveInitiative - a.effectiveInitiative;
      }
      return a.entityId.localeCompare(b.entityId);
    });

    this.currentIndex = 0;
  }

  /** Get the current active entity. */
  current(): TurnEntry | null {
    if (this.entries.length === 0) return null;
    // Skip entries that have already acted
    while (this.currentIndex < this.entries.length) {
      const entry = this.entries[this.currentIndex];
      if (entry && !entry.hasActed) return entry;
      this.currentIndex++;
    }
    return null;
  }

  /**
   * Advance to the next unit. Returns true if a new round started.
   * Marks the current entry as having acted, then finds the next
   * non-acted entry. If all have acted (including waiters), starts
   * a new round.
   */
  advance(): boolean {
    const entry = this.entries[this.currentIndex];
    if (entry) {
      entry.hasActed = true;
    }

    this.currentIndex++;

    // Look for the next unacted entry
    while (this.currentIndex < this.entries.length) {
      const next = this.entries[this.currentIndex];
      if (next && !next.hasActed) return false;
      this.currentIndex++;
    }

    // All non-waiting entries acted. Now resolve waiters in reverse initiative order.
    const waiters = this.entries.filter((e) => e.isWaiting && !e.hasActed);
    if (waiters.length > 0) {
      // Waiters act in reverse initiative order (lowest first)
      waiters.sort((a, b) => a.effectiveInitiative - b.effectiveInitiative);

      // Rebuild the end of the entries array with waiters
      // Remove waiters from their current positions
      this.entries = this.entries.filter(
        (e) => !(e.isWaiting && !e.hasActed)
      );
      this.entries.push(...waiters);

      // Point currentIndex to the first waiter
      this.currentIndex = this.entries.length - waiters.length;
      return false;
    }

    // All entries (including waiters) have acted -- new round
    this.round++;
    this.currentIndex = 0;
    for (const e of this.entries) {
      e.hasActed = false;
      e.isWaiting = false;
    }
    return true;
  }

  /** Current unit waits -- moves to end of turn order. */
  wait(): void {
    const entry = this.entries[this.currentIndex];
    if (entry) {
      entry.isWaiting = true;
      entry.hasActed = false;
    }
    // Advance past this entry without marking as acted
    this.currentIndex++;
  }

  /** Remove a dead entity from the order. */
  remove(entityId: EntityId): void {
    const idx = this.entries.findIndex((e) => e.entityId === entityId);
    if (idx === -1) return;

    this.entries.splice(idx, 1);

    // Adjust currentIndex if the removed entry was before or at current
    if (idx < this.currentIndex) {
      this.currentIndex--;
    } else if (idx === this.currentIndex) {
      // Current was removed; currentIndex now points to the next entry
      // No adjustment needed since splice shifts everything down
    }

    // Clamp to valid range
    if (this.currentIndex >= this.entries.length) {
      this.currentIndex = this.entries.length;
    }
  }

  /** Get all entries for the turn order UI display. */
  getOrder(): readonly TurnEntry[] {
    return this.entries;
  }

  get currentRound(): number {
    return this.round;
  }
}
