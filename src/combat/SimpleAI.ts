import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import { hexDistance } from "@hex/HexMath";
import { findPath } from "@hex/HexPathfinding";

export type AIAction =
  | { type: "move"; path: Array<{ q: number; r: number }> }
  | { type: "attack"; targetId: EntityId }
  | { type: "wait" };

/**
 * Simple AI: move toward nearest enemy, attack if adjacent.
 *
 * @param world       The ECS world.
 * @param grid        The hex grid (for pathfinding and occupancy).
 * @param entityId    The AI-controlled entity taking its turn.
 * @param enemyIds    List of enemy entity IDs to target (i.e., player units).
 * @returns           The decided action: move along a path, attack a target, or wait.
 */
export function decideAIAction(
  world: World,
  grid: HexGrid,
  entityId: EntityId,
  enemyIds: EntityId[],
  moveBudget = 4,
): AIAction {
  const pos = world.getComponent<PositionComponent>(entityId, "position");
  if (!pos) return { type: "wait" };

  // Find the nearest enemy by hex distance
  let nearestId: EntityId | null = null;
  let nearestDist = Infinity;
  let nearestPos: PositionComponent | null = null;

  for (const enemyId of enemyIds) {
    const ePos = world.getComponent<PositionComponent>(enemyId, "position");
    if (!ePos) continue;

    const dist = hexDistance(
      { q: pos.q, r: pos.r },
      { q: ePos.q, r: ePos.r }
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestId = enemyId;
      nearestPos = ePos;
    }
  }

  if (!nearestId || !nearestPos) return { type: "wait" };

  // If adjacent (distance 1), attack
  if (nearestDist === 1) {
    return { type: "attack", targetId: nearestId };
  }

  // Otherwise, pathfind toward nearest enemy.
  // Budget of 4 movement cost (~2-3 hexes on normal terrain).
  // Temporarily clear the occupant on the goal hex so pathfinding can target it.
  // We pathfind to a neighbor of the enemy instead (first reachable adjacent hex).
  const goalNeighbors = getAdjacentPassableHexes(grid, nearestPos.q, nearestPos.r);

  let bestPath: Array<{ q: number; r: number }> | null = null;
  let bestCost = Infinity;

  for (const neighbor of goalNeighbors) {
    const result = findPath(
      grid,
      { q: pos.q, r: pos.r },
      { q: neighbor.q, r: neighbor.r },
      moveBudget,
    );
    if (result.found && result.cost < bestCost) {
      bestCost = result.cost;
      bestPath = result.path;
    }
  }

  if (bestPath && bestPath.length > 0) {
    return { type: "move", path: bestPath };
  }

  // No path found -- wait
  return { type: "wait" };
}

/**
 * Return adjacent hexes of (q, r) that exist on the grid, are passable,
 * and are not occupied.
 */
function getAdjacentPassableHexes(
  grid: HexGrid,
  q: number,
  r: number
): Array<{ q: number; r: number }> {
  const directions = [
    { q: +1, r: 0 },
    { q: +1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: +1 },
    { q: 0, r: +1 },
  ];

  const result: Array<{ q: number; r: number }> = [];
  for (const d of directions) {
    const nq = q + d.q;
    const nr = r + d.r;
    const tile = grid.get(nq, nr);
    if (
      tile &&
      tile.occupant === null &&
      tile.terrain !== "water" &&
      tile.terrain !== "mountains"
    ) {
      result.push({ q: nq, r: nr });
    }
  }
  return result;
}
