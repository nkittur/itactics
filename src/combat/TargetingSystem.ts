import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { HexGrid, HexTile } from "@hex/HexGrid";
import type { AxialCoord } from "@hex/HexCoord";
import { hexDistance, hexNeighbors, hexRing, hexSpiral, HEX_DIRECTIONS, hexDirection } from "@hex/HexMath";
import { hexLineDraw, hasLineOfSight } from "@hex/HexLineOfSight";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";

// ── Targeting Definitions ──

/** How the player selects a target. */
export type TargetMode =
  | "point"       // Select a hex
  | "entity"      // Select an entity
  | "self"        // Caster only
  | "direction"   // Select a direction (6 hex directions)
  | "zone"        // Select an area placement
  | "global";     // No selection needed, hits everything

/** Shape of the affected area. */
export type TargetShape =
  | "single"      // One hex/entity
  | "circle"      // Filled circle of radius R
  | "ring"        // Ring at exactly radius R
  | "cone"        // 60°/120°/180° cone in a direction
  | "line"        // Straight line from caster
  | "beam"        // Line that stops at first entity
  | "wall"        // Line perpendicular to caster direction
  | "cross"       // + shape
  | "x_cross"     // X shape (diagonals)
  | "chain"       // Bounces between targets
  | "homing"      // Seeks nearest valid target
  | "custom";     // Custom hex pattern

/** Faction filtering. */
export type FactionFilter = "enemy" | "ally" | "all" | "self";

/** Target count mode. */
export type CountMode =
  | "all"         // Hit everything in shape
  | "fixed"       // Hit exactly N targets
  | "random"      // Hit up to N random targets from shape
  | "chain";      // Hit N via chain bouncing

/** Full targeting definition for an ability. */
export interface TargetingDef {
  mode: TargetMode;
  shape: TargetShape;
  /** Range from caster (min, max). 0 = self only. */
  minRange: number;
  maxRange: number;
  /** Radius of the shape (for circle, ring, cone, etc.). */
  radius: number;
  /** Cone angle in degrees (60, 120, 180). Only used for cone shape. */
  coneAngle?: number;
  /** Line/beam width (1 = single hex wide). */
  lineWidth?: number;
  /** Whether LoS is required from caster to target hex. */
  requiresLoS: boolean;
  /** Whether the ability can target/pass through walls. */
  throughWalls: boolean;
  /** Faction filter. */
  faction: FactionFilter;
  /** Additional filters. */
  filters: TargetFilter[];
  /** Count mode and limit. */
  countMode: CountMode;
  countLimit: number;
  /** For chain: max bounce range between targets. */
  chainRange?: number;
  /** For chain: damage decay per bounce (0.8 = 20% less each bounce). */
  chainDecay?: number;
  /** Custom hex pattern (offsets from center). Only for shape "custom". */
  customPattern?: AxialCoord[];
  /** Whether to include the caster's hex. */
  includeCaster: boolean;
}

/** A filter condition for valid targets. */
export interface TargetFilter {
  type: TargetFilterType;
  params: Record<string, any>;
}

export type TargetFilterType =
  | "alive"           // Must be alive
  | "dead"            // Must be dead
  | "has_status"      // Must have specific status effect
  | "no_status"       // Must NOT have specific status effect
  | "hp_below"        // HP below X%
  | "hp_above"        // HP above X%
  | "entity_type"     // Specific entity type (summon, player, etc.)
  | "has_resource"    // Has specific resource
  | "resource_above"  // Resource above X%
  | "resource_below"  // Resource below X%
  | "is_summon"       // Is a summoned entity
  | "not_summon"      // Is NOT a summoned entity
  | "has_tag"         // Has a specific tag
  | "closest"         // Only the closest N entities
  | "furthest";       // Only the furthest N entities

/** Result of targeting resolution. */
export interface TargetingResult {
  /** All affected hexes. */
  hexes: AxialCoord[];
  /** All affected entity IDs (filtered, counted). */
  entities: EntityId[];
  /** The origin point for the targeting. */
  origin: AxialCoord;
  /** The direction (if directional). */
  direction?: AxialCoord;
}

// ── Default Targeting Presets ──

export function singleEnemyTarget(range: number): TargetingDef {
  return {
    mode: "entity", shape: "single",
    minRange: 1, maxRange: range, radius: 0,
    requiresLoS: true, throughWalls: false,
    faction: "enemy", filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 1,
    includeCaster: false,
  };
}

export function singleAllyTarget(range: number): TargetingDef {
  return {
    mode: "entity", shape: "single",
    minRange: 1, maxRange: range, radius: 0,
    requiresLoS: true, throughWalls: false,
    faction: "ally", filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 1,
    includeCaster: false,
  };
}

export function selfTarget(): TargetingDef {
  return {
    mode: "self", shape: "single",
    minRange: 0, maxRange: 0, radius: 0,
    requiresLoS: false, throughWalls: false,
    faction: "self", filters: [],
    countMode: "all", countLimit: 1,
    includeCaster: true,
  };
}

export function circleAoE(range: number, radius: number, faction: FactionFilter = "enemy"): TargetingDef {
  return {
    mode: "point", shape: "circle",
    minRange: 0, maxRange: range, radius,
    requiresLoS: true, throughWalls: false,
    faction, filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 99,
    includeCaster: false,
  };
}

export function coneTarget(range: number, angle: number, faction: FactionFilter = "enemy"): TargetingDef {
  return {
    mode: "direction", shape: "cone",
    minRange: 1, maxRange: range, radius: range,
    coneAngle: angle,
    requiresLoS: false, throughWalls: false,
    faction, filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 99,
    includeCaster: false,
  };
}

export function lineTarget(range: number, width = 1, faction: FactionFilter = "enemy"): TargetingDef {
  return {
    mode: "direction", shape: "line",
    minRange: 1, maxRange: range, radius: 0,
    lineWidth: width,
    requiresLoS: false, throughWalls: false,
    faction, filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 99,
    includeCaster: false,
  };
}

export function chainTarget(range: number, bounces: number, bounceRange: number, decay = 0.8): TargetingDef {
  return {
    mode: "entity", shape: "chain",
    minRange: 1, maxRange: range, radius: 0,
    requiresLoS: true, throughWalls: false,
    faction: "enemy", filters: [{ type: "alive", params: {} }],
    countMode: "chain", countLimit: bounces,
    chainRange: bounceRange, chainDecay: decay,
    includeCaster: false,
  };
}

export function globalTarget(faction: FactionFilter = "enemy"): TargetingDef {
  return {
    mode: "global", shape: "single",
    minRange: 0, maxRange: 999, radius: 0,
    requiresLoS: false, throughWalls: true,
    faction, filters: [{ type: "alive", params: {} }],
    countMode: "all", countLimit: 999,
    includeCaster: false,
  };
}

// ── Targeting Resolution Engine ──

/**
 * Resolves a targeting definition into a list of affected hexes and entities.
 */
export class TargetingResolver {
  constructor(private grid: HexGrid) {}

  /**
   * Resolve targeting from a caster position to a target hex/direction.
   * @param casterPos The caster's position.
   * @param targetHex The selected target hex (or direction for directional).
   * @param def The targeting definition.
   * @param world ECS world for entity queries.
   * @param casterId The caster's entity ID.
   * @returns TargetingResult with affected hexes and entities.
   */
  resolve(
    casterPos: AxialCoord,
    targetHex: AxialCoord,
    def: TargetingDef,
    world: World,
    casterId: EntityId,
  ): TargetingResult {
    // 1. Compute affected hexes based on shape
    let hexes = this.computeShape(casterPos, targetHex, def);

    // 2. Filter hexes by range and LoS
    hexes = hexes.filter(h => {
      const dist = hexDistance(casterPos, h);
      if (dist < def.minRange || dist > def.maxRange) return false;
      if (def.requiresLoS && !hasLineOfSight(this.grid, casterPos, h)) return false;
      if (!def.throughWalls && !this.grid.has(h.q, h.r)) return false;
      return true;
    });

    // 3. Remove caster hex if not included
    if (!def.includeCaster) {
      hexes = hexes.filter(h => h.q !== casterPos.q || h.r !== casterPos.r);
    }

    // 4. Gather entities on affected hexes
    let entities = this.gatherEntities(hexes, world);

    // 5. Apply faction filter
    entities = this.filterFaction(entities, casterId, def.faction, world);

    // 6. Apply additional filters
    entities = this.applyFilters(entities, def.filters, world, casterPos);

    // 7. Apply count mode
    entities = this.applyCount(entities, def, world, casterPos, targetHex);

    const dir = hexDirection(casterPos, targetHex);
    return {
      hexes,
      entities,
      origin: casterPos,
      direction: dir ? { q: dir.dq, r: dir.dr } : undefined,
    };
  }

  /** Get valid target hexes the player can select for an ability. */
  getValidTargetHexes(
    casterPos: AxialCoord,
    def: TargetingDef,
    world: World,
    casterId: EntityId,
  ): AxialCoord[] {
    if (def.mode === "self") return [casterPos];
    if (def.mode === "global") return [casterPos]; // Global doesn't need selection

    const candidates: AxialCoord[] = [];
    // Check all hexes in range
    for (const hex of hexSpiral(casterPos, def.maxRange)) {
      const dist = hexDistance(casterPos, hex);
      if (dist < def.minRange) continue;
      if (!this.grid.has(hex.q, hex.r)) continue;
      if (def.requiresLoS && !hasLineOfSight(this.grid, casterPos, hex)) continue;

      if (def.mode === "entity") {
        // Must have a valid entity on this hex
        const tile = this.grid.get(hex.q, hex.r);
        if (tile?.occupant) {
          const entities = this.filterFaction([tile.occupant], casterId, def.faction, world);
          if (entities.length > 0) candidates.push(hex);
        }
      } else {
        candidates.push(hex);
      }
    }
    return candidates;
  }

  /** Preview which hexes would be affected if targeting a specific hex. */
  previewAffectedHexes(
    casterPos: AxialCoord,
    targetHex: AxialCoord,
    def: TargetingDef,
  ): AxialCoord[] {
    return this.computeShape(casterPos, targetHex, def);
  }

  // ── Shape Computation ──

  private computeShape(origin: AxialCoord, target: AxialCoord, def: TargetingDef): AxialCoord[] {
    switch (def.shape) {
      case "single":
        return def.mode === "self" ? [origin] : [target];

      case "circle":
        return hexSpiral(target, def.radius);

      case "ring":
        return hexRing(target, def.radius);

      case "cone":
        return this.computeCone(origin, target, def.radius, def.coneAngle ?? 60);

      case "line":
        return this.computeLine(origin, target, def.maxRange, def.lineWidth ?? 1);

      case "beam":
        return this.computeBeam(origin, target, def.maxRange);

      case "wall":
        return this.computeWall(origin, target, def.radius);

      case "cross":
        return this.computeCross(target, def.radius);

      case "x_cross":
        return this.computeXCross(target, def.radius);

      case "chain":
        return [target]; // Chain resolves in count phase

      case "homing":
        return [target]; // Homing resolves to nearest valid

      case "custom":
        return (def.customPattern ?? []).map(p => ({ q: target.q + p.q, r: target.r + p.r }));

      default:
        return [target];
    }
  }

  private computeCone(origin: AxialCoord, target: AxialCoord, radius: number, angleDeg: number): AxialCoord[] {
    const results: AxialCoord[] = [];
    const dir = hexDirection(origin, target);
    if (!dir) return results;

    // Get all hexes in radius
    const candidates = hexSpiral(origin, radius);
    const angleRad = (angleDeg / 2) * (Math.PI / 180);

    // Direction vector (approximate)
    const dirAngle = Math.atan2(dir.dr + dir.dq * 0.5, dir.dq * Math.sqrt(3) / 2);

    for (const hex of candidates) {
      if (hex.q === origin.q && hex.r === origin.r) continue;
      const dx = hex.q - origin.q;
      const dr = hex.r - origin.r;
      const hexAngle = Math.atan2(dr + dx * 0.5, dx * Math.sqrt(3) / 2);
      let angleDiff = Math.abs(hexAngle - dirAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff <= angleRad) {
        results.push(hex);
      }
    }
    return results;
  }

  private computeLine(origin: AxialCoord, target: AxialCoord, maxRange: number, width: number): AxialCoord[] {
    const dir = hexDirection(origin, target);
    if (!dir) return [];

    const results: AxialCoord[] = [];
    // Walk in direction
    for (let i = 1; i <= maxRange; i++) {
      const hex: AxialCoord = { q: origin.q + dir.dq * i, r: origin.r + dir.dr * i };
      results.push(hex);

      // Width > 1: add perpendicular hexes
      if (width > 1) {
        for (const neighbor of hexNeighbors(hex.q, hex.r)) {
          const ndist = hexDistance(origin, neighbor);
          if (ndist >= 1 && ndist <= maxRange) {
            // Check if neighbor is roughly perpendicular
            const ndir = hexDirection(origin, neighbor);
            if (ndir && (ndir.dq !== dir.dq || ndir.dr !== dir.dr)) {
              const sameLineCheck = Math.abs((neighbor.q - origin.q) * dir.dr - (neighbor.r - origin.r) * dir.dq);
              if (sameLineCheck <= 1) {
                results.push(neighbor);
              }
            }
          }
        }
      }
    }
    return results;
  }

  private computeBeam(origin: AxialCoord, target: AxialCoord, maxRange: number): AxialCoord[] {
    const line = hexLineDraw(origin, target);
    const results: AxialCoord[] = [];
    for (let i = 1; i < line.length && i <= maxRange; i++) {
      const hex = line[i]!;
      results.push(hex);
      // Stop at first occupied hex (beam stops at first entity)
      const tile = this.grid.get(hex.q, hex.r);
      if (tile?.occupant) break;
    }
    return results;
  }

  private computeWall(origin: AxialCoord, target: AxialCoord, length: number): AxialCoord[] {
    const dir = hexDirection(origin, target);
    if (!dir) return [target];

    // Wall is perpendicular to the direction
    // Find perpendicular directions
    const dirIdx = HEX_DIRECTIONS.findIndex(d => d.q === dir.dq && d.r === dir.dr);
    if (dirIdx < 0) return [target];

    const perpIdx1 = (dirIdx + 2) % 6;
    const perpIdx2 = (dirIdx + 4) % 6;
    const perp1 = HEX_DIRECTIONS[perpIdx1]!;
    const perp2 = HEX_DIRECTIONS[perpIdx2]!;

    const results: AxialCoord[] = [target];
    const halfLen = Math.floor(length / 2);
    for (let i = 1; i <= halfLen; i++) {
      results.push({ q: target.q + perp1.q * i, r: target.r + perp1.r * i });
      results.push({ q: target.q + perp2.q * i, r: target.r + perp2.r * i });
    }
    return results;
  }

  private computeCross(center: AxialCoord, radius: number): AxialCoord[] {
    const results: AxialCoord[] = [center];
    // Use 3 pairs of opposite directions for +
    for (const dirPair of [[0, 3], [1, 4], [2, 5]]) {
      for (const dirIdx of dirPair) {
        const d = HEX_DIRECTIONS[dirIdx]!;
        for (let i = 1; i <= radius; i++) {
          results.push({ q: center.q + d.q * i, r: center.r + d.r * i });
        }
      }
      break; // Only first axis pair for standard cross. Remove break for full 6-arm star.
    }
    // Add the perpendicular axis
    const d1 = HEX_DIRECTIONS[2]!;
    const d2 = HEX_DIRECTIONS[5]!;
    for (let i = 1; i <= radius; i++) {
      results.push({ q: center.q + d1.q * i, r: center.r + d1.r * i });
      results.push({ q: center.q + d2.q * i, r: center.r + d2.r * i });
    }
    return results;
  }

  private computeXCross(center: AxialCoord, radius: number): AxialCoord[] {
    const results: AxialCoord[] = [center];
    // Use alternating directions for X pattern
    for (const dirIdx of [1, 2, 4, 5]) {
      const d = HEX_DIRECTIONS[dirIdx]!;
      for (let i = 1; i <= radius; i++) {
        results.push({ q: center.q + d.q * i, r: center.r + d.r * i });
      }
    }
    return results;
  }

  // ── Entity Gathering ──

  private gatherEntities(hexes: AxialCoord[], world: World): EntityId[] {
    const entities: EntityId[] = [];
    const seen = new Set<string>();
    for (const hex of hexes) {
      const tile = this.grid.get(hex.q, hex.r);
      if (tile?.occupant && !seen.has(tile.occupant)) {
        seen.add(tile.occupant);
        entities.push(tile.occupant);
      }
    }
    return entities;
  }

  // ── Faction Filtering ──

  private filterFaction(
    entities: EntityId[],
    casterId: EntityId,
    faction: FactionFilter,
    world: World,
  ): EntityId[] {
    if (faction === "all") return entities;
    if (faction === "self") return entities.filter(e => e === casterId);

    const casterIsAI = world.getComponent(casterId, "aiBehavior") !== undefined;

    return entities.filter(e => {
      if (e === casterId) return faction === "ally";
      const isAI = world.getComponent(e, "aiBehavior") !== undefined;
      const sameTeam = isAI === casterIsAI;
      return faction === "ally" ? sameTeam : !sameTeam;
    });
  }

  // ── Additional Filters ──

  private applyFilters(
    entities: EntityId[],
    filters: TargetFilter[],
    world: World,
    casterPos: AxialCoord,
  ): EntityId[] {
    for (const filter of filters) {
      entities = entities.filter(e => this.checkFilter(e, filter, world, casterPos));
    }
    return entities;
  }

  private checkFilter(entityId: EntityId, filter: TargetFilter, world: World, casterPos: AxialCoord): boolean {
    switch (filter.type) {
      case "alive": {
        const h = world.getComponent<HealthComponent>(entityId, "health");
        return h != null && h.current > 0;
      }
      case "dead": {
        const h = world.getComponent<HealthComponent>(entityId, "health");
        return h != null && h.current <= 0;
      }
      case "has_status": {
        const comp = world.getComponent<any>(entityId, "statusEffects");
        return comp?.effects.some((e: any) => e.id === filter.params.effectId) ?? false;
      }
      case "no_status": {
        const comp = world.getComponent<any>(entityId, "statusEffects");
        return !comp?.effects.some((e: any) => e.id === filter.params.effectId);
      }
      case "hp_below": {
        const h = world.getComponent<HealthComponent>(entityId, "health");
        if (!h) return false;
        return (h.current / h.max) < (filter.params.percent / 100);
      }
      case "hp_above": {
        const h = world.getComponent<HealthComponent>(entityId, "health");
        if (!h) return false;
        return (h.current / h.max) > (filter.params.percent / 100);
      }
      case "is_summon":
        return world.getComponent(entityId, "summon") !== undefined;
      case "not_summon":
        return world.getComponent(entityId, "summon") === undefined;
      case "entity_type":
        return world.getComponent(entityId, filter.params.type as string) !== undefined;
      case "has_resource": {
        const res = world.getComponent<any>(entityId, "resources");
        return res?.pools[filter.params.resourceId] !== undefined;
      }
      default:
        return true;
    }
  }

  // ── Count Application ──

  private applyCount(
    entities: EntityId[],
    def: TargetingDef,
    world: World,
    casterPos: AxialCoord,
    targetHex: AxialCoord,
  ): EntityId[] {
    if (def.countMode === "all") return entities;

    if (def.countMode === "fixed") {
      return entities.slice(0, def.countLimit);
    }

    if (def.countMode === "random") {
      // Fisher-Yates shuffle then take N
      const shuffled = [...entities];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      return shuffled.slice(0, def.countLimit);
    }

    if (def.countMode === "chain") {
      return this.resolveChain(entities, def, world, casterPos, targetHex);
    }

    return entities;
  }

  private resolveChain(
    _entities: EntityId[],
    def: TargetingDef,
    world: World,
    casterPos: AxialCoord,
    firstTarget: AxialCoord,
  ): EntityId[] {
    const chainRange = def.chainRange ?? 3;
    const maxBounces = def.countLimit;
    const result: EntityId[] = [];
    const visited = new Set<string>();

    // Start with first target
    const firstTile = this.grid.get(firstTarget.q, firstTarget.r);
    if (!firstTile?.occupant) return result;

    let currentPos = firstTarget;
    let currentEntity = firstTile.occupant;
    result.push(currentEntity);
    visited.add(currentEntity);

    for (let bounce = 1; bounce < maxBounces; bounce++) {
      // Find nearest unvisited enemy in chain range
      let nearest: { entity: EntityId; pos: AxialCoord; dist: number } | null = null;

      for (const hex of hexSpiral(currentPos, chainRange)) {
        const tile = this.grid.get(hex.q, hex.r);
        if (!tile?.occupant || visited.has(tile.occupant)) continue;

        const dist = hexDistance(currentPos, hex);
        if (dist === 0 || dist > chainRange) continue;

        // Check faction
        const casterIsAI = world.getComponent(result[0]!, "aiBehavior") !== undefined;
        const targetIsAI = world.getComponent(tile.occupant, "aiBehavior") !== undefined;
        if (casterIsAI === targetIsAI) continue; // Same team

        const health = world.getComponent<HealthComponent>(tile.occupant, "health");
        if (!health || health.current <= 0) continue;

        if (!nearest || dist < nearest.dist) {
          nearest = { entity: tile.occupant, pos: hex, dist };
        }
      }

      if (!nearest) break;
      result.push(nearest.entity);
      visited.add(nearest.entity);
      currentPos = nearest.pos;
      currentEntity = nearest.entity;
    }

    return result;
  }
}
