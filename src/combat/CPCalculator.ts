import type { EntityId } from "@entities/Entity";

// ── CP award constants ──

export const CP_PER_ACTION = 10;
export const CP_PER_KILL = 20;
export const CP_VICTORY_BONUS = 30;

// ── Types ──

export interface CPAward {
  entityId: EntityId;
  name: string;
  cpEarned: number;
  actions: number;
  kills: number;
}

export interface BattleActionTracker {
  stats: Map<EntityId, { actions: number; kills: number }>;
}

// ── Tracker functions ──

export function createActionTracker(): BattleActionTracker {
  return { stats: new Map() };
}

export function trackAction(tracker: BattleActionTracker, entityId: EntityId): void {
  const entry = tracker.stats.get(entityId) ?? { actions: 0, kills: 0 };
  entry.actions++;
  tracker.stats.set(entityId, entry);
}

export function trackKill(tracker: BattleActionTracker, entityId: EntityId): void {
  const entry = tracker.stats.get(entityId) ?? { actions: 0, kills: 0 };
  entry.kills++;
  tracker.stats.set(entityId, entry);
}

// ── CP calculation ──

/**
 * Calculate CP earned by each surviving player unit after a battle.
 */
export function calculateBattleCP(
  victory: boolean,
  tracker: BattleActionTracker,
  survivors: { entityId: EntityId; name: string }[],
): CPAward[] {
  const awards: CPAward[] = [];

  for (const { entityId, name } of survivors) {
    const entry = tracker.stats.get(entityId) ?? { actions: 0, kills: 0 };
    let cp = entry.actions * CP_PER_ACTION + entry.kills * CP_PER_KILL;
    if (victory) cp += CP_VICTORY_BONUS;

    awards.push({
      entityId,
      name,
      cpEarned: cp,
      actions: entry.actions,
      kills: entry.kills,
    });
  }

  return awards;
}
