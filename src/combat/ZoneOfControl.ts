import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import type { StatusEffectsComponent } from "@entities/components/StatusEffects";
import { hexNeighbors } from "@hex/HexMath";

/**
 * Zone of Control (ZoC) system — Battle Brothers style.
 *
 * Rules:
 * - Every living, non-stunned enemy exerts ZoC on all adjacent hexes.
 * - Leaving a hex adjacent to an enemy (i.e., moving OUT of their ZoC) triggers
 *   a free attack from that enemy.
 * - Entering ZoC does NOT trigger a free attack.
 * - Each enemy gets at most one free attack per movement action.
 * - Free attacks cost 0 AP / 0 stamina.
 * - Stunned or dead enemies do not exert ZoC.
 */

/**
 * Get all living, non-stunned enemies adjacent to (q, r).
 * "Enemy" = entity on opposite team from `team`.
 * Team is determined by presence/absence of "aiBehavior" component.
 *
 * @param movingEntityId  The entity whose perspective we check from (determines team).
 */
export function getZoCThreats(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  movingEntityId: EntityId,
): EntityId[] {
  const threats: EntityId[] = [];
  const moverIsAI = world.getComponent(movingEntityId, "aiBehavior") !== undefined;

  for (const n of hexNeighbors(q, r)) {
    const tile = grid.get(n.q, n.r);
    if (!tile?.occupant) continue;
    if (tile.occupant === movingEntityId) continue;

    // Must be on opposite team
    const occupantIsAI = world.getComponent(tile.occupant, "aiBehavior") !== undefined;
    if (occupantIsAI === moverIsAI) continue;

    // Must be alive
    const health = world.getComponent<HealthComponent>(tile.occupant, "health");
    if (!health || health.current <= 0) continue;

    // Stunned enemies don't exert ZoC
    const statusEffects = world.getComponent<StatusEffectsComponent>(tile.occupant, "statusEffects");
    if (statusEffects?.effects.some((e) => e.id === "stun")) continue;

    threats.push(tile.occupant);
  }

  return threats;
}

/**
 * Determine which enemies get free attacks when an entity moves along a path.
 *
 * For each step in the path, we check the hex the entity is LEAVING.
 * If the entity is adjacent to an enemy at that hex but NOT adjacent to
 * the same enemy at the next hex, that enemy gets a free attack.
 *
 * Each enemy only attacks once per movement, even if the path leaves
 * their ZoC multiple times.
 *
 * @param startQ  The entity's starting q coordinate.
 * @param startR  The entity's starting r coordinate.
 * @param path    The movement path (does NOT include the starting position).
 * @returns       Array of enemy entity IDs that get free attacks, in order.
 */
export function getZoCAttacksForMove(
  world: World,
  grid: HexGrid,
  movingEntityId: EntityId,
  startQ: number,
  startR: number,
  path: Array<{ q: number; r: number }>,
): EntityId[] {
  if (path.length === 0) return [];

  const attackers: EntityId[] = [];
  const alreadyAttacked = new Set<EntityId>();

  // Build full path including start
  const fullPath = [{ q: startQ, r: startR }, ...path];

  for (let i = 0; i < fullPath.length - 1; i++) {
    const current = fullPath[i]!;
    const next = fullPath[i + 1]!;

    // Get enemies adjacent to the current hex
    const threats = getZoCThreats(world, grid, current.q, current.r, movingEntityId);

    for (const enemyId of threats) {
      if (alreadyAttacked.has(enemyId)) continue;

      // Check if this enemy is still adjacent at the next hex
      const enemyPos = world.getComponent<PositionComponent>(enemyId, "position");
      if (!enemyPos) continue;

      const stillAdjacent = hexNeighbors(next.q, next.r).some(
        (n) => n.q === enemyPos.q && n.r === enemyPos.r,
      );

      if (!stillAdjacent) {
        // Moving out of this enemy's ZoC — they get a free attack
        attackers.push(enemyId);
        alreadyAttacked.add(enemyId);
      }
    }
  }

  return attackers;
}

/**
 * MP cost to break free from enemy Zone of Control.
 * Costs 4 MP, or all remaining MP if the unit has 3 or fewer.
 */
export function getZoCBreakCost(currentMP: number): number {
  if (currentMP <= 0) return 0;
  if (currentMP <= 3) return currentMP;
  return 4;
}

/**
 * Check if a specific hex is in any enemy's zone of control.
 */
export function isInEnemyZoC(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  movingEntityId: EntityId,
): boolean {
  return getZoCThreats(world, grid, q, r, movingEntityId).length > 0;
}

/**
 * For a given movement range (reachable hexes), annotate which hexes
 * would trigger ZoC free attacks if moved to.
 *
 * Returns a Set of hex keys ("q,r") that trigger at least one free attack.
 * This is used for the danger overlay.
 */
export function getZoCDangerHexes(
  world: World,
  grid: HexGrid,
  movingEntityId: EntityId,
  startQ: number,
  startR: number,
): Set<string> {
  const dangerHexes = new Set<string>();

  // If the unit is currently in enemy ZoC, ANY move triggers free attacks
  const currentThreats = getZoCThreats(world, grid, startQ, startR, movingEntityId);
  if (currentThreats.length > 0) {
    // Moving out of any adjacent hex triggers ZoC from current threats
    // Mark all reachable hexes as potentially dangerous
    // (More precisely, hexes that are not still adjacent to all current threats)
    for (const n of hexNeighbors(startQ, startR)) {
      const tile = grid.get(n.q, n.r);
      if (!tile || tile.occupant) continue;

      // Check if moving here would leave any current threat's ZoC
      for (const threatId of currentThreats) {
        const threatPos = world.getComponent<PositionComponent>(threatId, "position");
        if (!threatPos) continue;

        const stillAdj = hexNeighbors(n.q, n.r).some(
          (h) => h.q === threatPos.q && h.r === threatPos.r,
        );
        if (!stillAdj) {
          dangerHexes.add(`${n.q},${n.r}`);
          break;
        }
      }
    }
  }

  return dangerHexes;
}
