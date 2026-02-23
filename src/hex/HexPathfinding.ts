import type { AxialCoord } from "./HexCoord";
import { hexKey } from "./HexCoord";
import { hexDistance, hexNeighbors } from "./HexMath";
import type { HexGrid, HexTile } from "./HexGrid";
import { PriorityQueue } from "../utils/PriorityQueue";

interface PathNode {
  q: number;
  r: number;
  g: number; // cost from start
  f: number; // g + heuristic
  parent: PathNode | null;
}

export interface PathResult {
  /** Ordered list of hexes from start (exclusive) to goal (inclusive). */
  path: AxialCoord[];
  /** Total movement cost. */
  cost: number;
  /** True if the goal was reachable. */
  found: boolean;
}

/**
 * Calculate the movement cost to enter `target` from `source`.
 * Returns Infinity if the tile is impassable.
 */
export function stepCost(grid: HexGrid, source: HexTile, target: HexTile): number {
  // Impassable tiles
  if (target.terrain === "water" || target.terrain === "mountains") return Infinity;
  // Occupied by another entity
  if (target.occupant !== null) return Infinity;

  let cost = target.movementCost; // base terrain cost

  // Elevation change cost: going up costs +1 per level, going down is free
  const elevDiff = target.elevation - source.elevation;
  if (elevDiff > 0) {
    cost += elevDiff; // climbing penalty
  }

  return cost;
}

/**
 * A* pathfinding from `start` to `goal`.
 * `maxCost` limits the search to a movement budget (e.g., the unit's AP).
 */
export function findPath(
  grid: HexGrid,
  start: AxialCoord,
  goal: AxialCoord,
  maxCost = Infinity
): PathResult {
  const openSet = new PriorityQueue<PathNode>((a, b) => a.f - b.f);
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const startKey = hexKey(start.q, start.r);
  const goalKey = hexKey(goal.q, goal.r);

  const startNode: PathNode = {
    q: start.q,
    r: start.r,
    g: 0,
    f: hexDistance(start, goal),
    parent: null,
  };
  openSet.push(startNode);
  gScores.set(startKey, 0);

  while (!openSet.isEmpty()) {
    const current = openSet.pop()!;
    const currentKey = hexKey(current.q, current.r);

    if (currentKey === goalKey) {
      // Reconstruct path
      const path: AxialCoord[] = [];
      let node: PathNode | null = current;
      while (node !== null && !(node.q === start.q && node.r === start.r)) {
        path.unshift({ q: node.q, r: node.r });
        node = node.parent;
      }
      return { path, cost: current.g, found: true };
    }

    closedSet.add(currentKey);
    const currentTile = grid.get(current.q, current.r);
    if (!currentTile) continue;

    for (const neighbor of hexNeighbors(current.q, current.r)) {
      const nKey = hexKey(neighbor.q, neighbor.r);
      if (closedSet.has(nKey)) continue;

      const neighborTile = grid.get(neighbor.q, neighbor.r);
      if (!neighborTile) continue;

      const cost = stepCost(grid, currentTile, neighborTile);
      if (cost === Infinity) continue;

      const tentativeG = current.g + cost;
      if (tentativeG > maxCost) continue;

      const prevG = gScores.get(nKey) ?? Infinity;
      if (tentativeG >= prevG) continue;

      gScores.set(nKey, tentativeG);

      const neighborNode: PathNode = {
        q: neighbor.q,
        r: neighbor.r,
        g: tentativeG,
        f: tentativeG + hexDistance(neighbor, goal),
        parent: current,
      };
      openSet.push(neighborNode);
    }
  }

  return { path: [], cost: 0, found: false };
}

/**
 * Return all hexes reachable within `budget` movement cost.
 * Used to highlight the movement range overlay.
 * Uses Dijkstra flood-fill with a proper priority queue.
 */
export function reachableHexes(
  grid: HexGrid,
  start: AxialCoord,
  budget: number
): Map<string, number> {
  const visited = new Map<string, number>(); // key -> cost to reach
  const frontier = new PriorityQueue<{ q: number; r: number; cost: number }>(
    (a, b) => a.cost - b.cost
  );

  visited.set(hexKey(start.q, start.r), 0);
  frontier.push({ q: start.q, r: start.r, cost: 0 });

  while (!frontier.isEmpty()) {
    const current = frontier.pop()!;
    const currentTile = grid.get(current.q, current.r);
    if (!currentTile) continue;

    for (const neighbor of hexNeighbors(current.q, current.r)) {
      const nKey = hexKey(neighbor.q, neighbor.r);
      const neighborTile = grid.get(neighbor.q, neighbor.r);
      if (!neighborTile) continue;

      const cost = stepCost(grid, currentTile, neighborTile);
      if (cost === Infinity) continue;

      const totalCost = current.cost + cost;
      if (totalCost > budget) continue;

      const prevCost = visited.get(nKey) ?? Infinity;
      if (totalCost >= prevCost) continue;

      visited.set(nKey, totalCost);
      frontier.push({ q: neighbor.q, r: neighbor.r, cost: totalCost });
    }
  }

  return visited;
}
