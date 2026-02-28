import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { HexGrid } from "@hex/HexGrid";
import type { AxialCoord } from "@hex/HexCoord";
import { hexKey } from "@hex/HexCoord";
import { hexSpiral, hexDistance } from "@hex/HexMath";
import type { EventBus } from "@core/EventBus";

// ── Zone Definitions ──

/** Interaction between two zone types. */
export interface ZoneInteraction {
  withZoneType: string;
  resultZoneType: string;
  removeBoth: boolean;
}

/**
 * Data-driven zone definition.
 * Zones are persistent battlefield modifications that affect entities within them.
 */
export interface ZoneDef {
  /** Unique type identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Description. */
  description: string;

  // ── Shape ──
  /** Default radius when created. */
  radius: number;
  /** Whether the zone expands by 1 each turn. */
  expanding: boolean;
  /** Max radius if expanding. */
  maxRadius: number;

  // ── Duration ──
  /** Duration in turns. 0 = permanent. */
  duration: number;

  // ── Movement ──
  /** Movement cost modifier (1.0 = normal, 2.0 = double, 0.5 = half). */
  movementCostMult: number;
  /** Whether the zone blocks movement entirely. */
  blocksMovement: boolean;
  /** Whether the zone blocks line of sight. */
  blocksLoS: boolean;

  // ── Effects ──
  /** Effect applied when an entity enters the zone. */
  onEnterEffect: ZoneEffect | null;
  /** Effect applied when an entity exits the zone. */
  onExitEffect: ZoneEffect | null;
  /** Effect applied each turn to entities standing in the zone. */
  onStandEffect: ZoneEffect | null;

  // ── Faction ──
  /** Which faction is affected. "all" = everyone. */
  affectedFaction: "ally" | "enemy" | "all";
  /** The creator's faction determines ally/enemy. */
  creatorFaction: "player" | "ai" | null;

  // ── Interactions ──
  /** How this zone interacts with other zone types. */
  interactions: ZoneInteraction[];

  // ── Visual ──
  /** Color for rendering. */
  color: string;
  /** Opacity for rendering. */
  opacity: number;
}

/** An effect that a zone applies to entities. */
export interface ZoneEffect {
  /** Damage per application. */
  damage: number;
  /** Damage type. */
  damageType: string;
  /** Healing per application. */
  heal: number;
  /** Status effect to apply. */
  statusEffect: string | null;
  /** Status effect duration. */
  statusDuration: number;
  /** Stat modifiers while in zone. */
  statModifiers: Record<string, number>;
  /** Resource to modify. */
  resourceModify: { resourceId: string; amount: number } | null;
  /** Push direction (1 = away from center, -1 = toward center, 0 = none). */
  pushDirection: number;
  /** Push distance in hexes. */
  pushDistance: number;
}

// ── Zone Instance (Runtime) ──

export interface ZoneInstance {
  id: string;
  defId: string;
  creatorId: EntityId | null;
  center: AxialCoord;
  currentRadius: number;
  remainingTurns: number;
  /** Set of hex keys currently covered by this zone. */
  hexes: Set<string>;
  /** Entities currently inside this zone. */
  occupants: Set<EntityId>;
  /** Original tile states for restoration. */
  originalTiles: Map<string, { movementCost: number; blocksLoS: boolean }>;
}

// ── Zone Registry ──

const zoneDefs = new Map<string, ZoneDef>();

export function registerZoneDef(def: ZoneDef): void {
  zoneDefs.set(def.id, def);
}

export function getZoneDef(id: string): ZoneDef | undefined {
  return zoneDefs.get(id);
}

let nextZoneId = 0;

// ── Built-in Zone Types ──

const BUILTIN_ZONES: ZoneDef[] = [
  {
    id: "fire_field", name: "Fire Field", description: "Burning ground that damages entities each turn.",
    radius: 1, expanding: false, maxRadius: 1, duration: 3,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: { damage: 5, damageType: "fire", heal: 0, statusEffect: "burn", statusDuration: 2, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    onExitEffect: null,
    onStandEffect: { damage: 8, damageType: "fire", heal: 0, statusEffect: null, statusDuration: 0, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [{ withZoneType: "ice_field", resultZoneType: "steam_cloud", removeBoth: true }],
    color: "#ff4400", opacity: 0.4,
  },
  {
    id: "ice_field", name: "Ice Field", description: "Frozen ground that slows movement.",
    radius: 1, expanding: false, maxRadius: 1, duration: 4,
    movementCostMult: 2.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: { damage: 0, damageType: "ice", heal: 0, statusEffect: "chill", statusDuration: 2, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    onExitEffect: null,
    onStandEffect: null,
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [{ withZoneType: "fire_field", resultZoneType: "steam_cloud", removeBoth: true }],
    color: "#44aaff", opacity: 0.4,
  },
  {
    id: "steam_cloud", name: "Steam Cloud", description: "Obscuring steam that blocks line of sight.",
    radius: 2, expanding: false, maxRadius: 2, duration: 2,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: true,
    onEnterEffect: null, onExitEffect: null, onStandEffect: null,
    affectedFaction: "all", creatorFaction: null,
    interactions: [], color: "#cccccc", opacity: 0.6,
  },
  {
    id: "healing_zone", name: "Healing Circle", description: "Restores health to allies each turn.",
    radius: 1, expanding: false, maxRadius: 1, duration: 3,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: null, onExitEffect: null,
    onStandEffect: { damage: 0, damageType: "heal", heal: 12, statusEffect: null, statusDuration: 0, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "ally", creatorFaction: null,
    interactions: [], color: "#44ff44", opacity: 0.3,
  },
  {
    id: "poison_cloud", name: "Poison Cloud", description: "Toxic cloud that poisons entities.",
    radius: 1, expanding: true, maxRadius: 3, duration: 4,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: { damage: 3, damageType: "poison", heal: 0, statusEffect: "poison", statusDuration: 2, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    onExitEffect: null,
    onStandEffect: { damage: 5, damageType: "poison", heal: 0, statusEffect: null, statusDuration: 0, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [], color: "#44aa44", opacity: 0.5,
  },
  {
    id: "wall_of_stone", name: "Stone Wall", description: "Impassable stone barrier.",
    radius: 0, expanding: false, maxRadius: 0, duration: 5,
    movementCostMult: 999, blocksMovement: true, blocksLoS: true,
    onEnterEffect: null, onExitEffect: null, onStandEffect: null,
    affectedFaction: "all", creatorFaction: null,
    interactions: [], color: "#888888", opacity: 0.9,
  },
  {
    id: "gravity_well_zone", name: "Gravity Well", description: "Pulls entities toward center.",
    radius: 2, expanding: false, maxRadius: 2, duration: 3,
    movementCostMult: 1.5, blocksMovement: false, blocksLoS: false,
    onEnterEffect: null, onExitEffect: null,
    onStandEffect: { damage: 0, damageType: "gravity", heal: 0, statusEffect: null, statusDuration: 0, statModifiers: { movementPoints: -2 }, resourceModify: null, pushDirection: -1, pushDistance: 1 },
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [], color: "#660099", opacity: 0.4,
  },
  {
    id: "lightning_field", name: "Lightning Field", description: "Electrified area that damages and chains.",
    radius: 1, expanding: false, maxRadius: 1, duration: 3,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: { damage: 10, damageType: "lightning", heal: 0, statusEffect: "electrified", statusDuration: 1, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    onExitEffect: null,
    onStandEffect: { damage: 6, damageType: "lightning", heal: 0, statusEffect: null, statusDuration: 0, statModifiers: {}, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [{ withZoneType: "ice_field", resultZoneType: "charged_ice", removeBoth: false }],
    color: "#ffff00", opacity: 0.4,
  },
  {
    id: "dark_zone", name: "Darkness", description: "Area of magical darkness.",
    radius: 2, expanding: false, maxRadius: 2, duration: 3,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: true,
    onEnterEffect: null, onExitEffect: null,
    onStandEffect: { damage: 0, damageType: "dark", heal: 0, statusEffect: null, statusDuration: 0, statModifiers: { meleeSkill: -10, rangedSkill: -15 }, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "enemy", creatorFaction: null,
    interactions: [], color: "#220033", opacity: 0.7,
  },
  {
    id: "sanctified_ground", name: "Sanctified Ground", description: "Holy ground that buffs allies.",
    radius: 1, expanding: false, maxRadius: 1, duration: 4,
    movementCostMult: 1.0, blocksMovement: false, blocksLoS: false,
    onEnterEffect: null, onExitEffect: null,
    onStandEffect: { damage: 0, damageType: "holy", heal: 5, statusEffect: null, statusDuration: 0, statModifiers: { dodge: 5, meleeSkill: 5 }, resourceModify: null, pushDirection: 0, pushDistance: 0 },
    affectedFaction: "ally", creatorFaction: null,
    interactions: [{ withZoneType: "dark_zone", resultZoneType: "twilight_zone", removeBoth: true }],
    color: "#ffffaa", opacity: 0.3,
  },
];

for (const def of BUILTIN_ZONES) {
  registerZoneDef(def);
}

/**
 * Manages dynamic battlefield zones.
 * Zones are persistent areas that affect movement, LoS, and apply effects to entities.
 */
export class ZoneManager {
  private zones = new Map<string, ZoneInstance>();
  /** Reverse index: hex key → zone ids containing that hex. */
  private hexZoneIndex = new Map<string, Set<string>>();

  constructor(
    private grid: HexGrid,
    private eventBus: EventBus,
  ) {
    // Listen for movement events to track zone enter/exit
    this.eventBus.on("movement:move", (ev) => {
      this.handleMovement(ev.entityId, { q: ev.fromQ, r: ev.fromR }, { q: ev.toQ, r: ev.toR });
    });
  }

  /**
   * Create a new zone on the battlefield.
   */
  createZone(
    defId: string,
    center: AxialCoord,
    creatorId: EntityId | null,
    radiusOverride?: number,
    durationOverride?: number,
  ): string | null {
    const def = getZoneDef(defId);
    if (!def) return null;

    const id = `zone_${nextZoneId++}`;
    const radius = radiusOverride ?? def.radius;
    const duration = durationOverride ?? def.duration;

    // Check for interactions with existing zones at this location
    const existingZoneIds = this.getZonesAtHex(center);
    for (const existingId of existingZoneIds) {
      const existing = this.zones.get(existingId);
      if (!existing) continue;
      const existingDef = getZoneDef(existing.defId);
      if (!existingDef) continue;

      for (const interaction of def.interactions) {
        if (interaction.withZoneType === existing.defId) {
          if (interaction.removeBoth) {
            this.removeZone(existingId);
          }
          // Create result zone instead
          return this.createZone(interaction.resultZoneType, center, creatorId, radius, duration);
        }
      }
    }

    const hexes = new Set<string>();
    const originalTiles = new Map<string, { movementCost: number; blocksLoS: boolean }>();

    // Populate hexes
    for (const hex of hexSpiral(center, radius)) {
      if (!this.grid.has(hex.q, hex.r)) continue;
      const key = hexKey(hex.q, hex.r);
      hexes.add(key);

      // Save original tile state
      const tile = this.grid.get(hex.q, hex.r);
      if (tile) {
        originalTiles.set(key, {
          movementCost: tile.movementCost,
          blocksLoS: tile.blocksLoS,
        });

        // Apply zone modifications to tile
        if (def.movementCostMult !== 1.0) {
          tile.movementCost *= def.movementCostMult;
        }
        if (def.blocksLoS) tile.blocksLoS = true;
      }

      // Update hex-zone index
      let zoneSet = this.hexZoneIndex.get(key);
      if (!zoneSet) {
        zoneSet = new Set();
        this.hexZoneIndex.set(key, zoneSet);
      }
      zoneSet.add(id);
    }

    const zone: ZoneInstance = {
      id,
      defId,
      creatorId,
      center,
      currentRadius: radius,
      remainingTurns: duration,
      hexes,
      occupants: new Set(),
      originalTiles,
    };

    this.zones.set(id, zone);

    // Check for entities already in the zone
    for (const key of hexes) {
      const [qStr, rStr] = key.split(",");
      const tile = this.grid.get(Number(qStr), Number(rStr));
      if (tile?.occupant) {
        zone.occupants.add(tile.occupant);
      }
    }

    this.eventBus.emit("zone:created", {
      zoneId: id,
      creatorId,
      q: center.q,
      r: center.r,
      radius,
    });

    return id;
  }

  /** Remove a zone and restore tile state. */
  removeZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    // Restore original tile states
    for (const [key, original] of zone.originalTiles) {
      const [qStr, rStr] = key.split(",");
      const tile = this.grid.get(Number(qStr), Number(rStr));
      if (tile) {
        tile.movementCost = original.movementCost;
        tile.blocksLoS = original.blocksLoS;
      }
    }

    // Remove from hex-zone index
    for (const key of zone.hexes) {
      const zoneSet = this.hexZoneIndex.get(key);
      if (zoneSet) {
        zoneSet.delete(zoneId);
        if (zoneSet.size === 0) this.hexZoneIndex.delete(key);
      }
    }

    this.zones.delete(zoneId);
    this.eventBus.emit("zone:expired", { zoneId });
  }

  /**
   * Tick all zones at turn start.
   * Applies standing effects, handles duration/expansion, removes expired zones.
   */
  tickTurn(world: World): void {
    const toRemove: string[] = [];

    for (const [zoneId, zone] of this.zones) {
      const def = getZoneDef(zone.defId);
      if (!def) continue;

      // Apply standing effects to occupants
      if (def.onStandEffect) {
        for (const entityId of zone.occupants) {
          // Check faction filter
          if (this.shouldAffect(entityId, def, world)) {
            // Effects are emitted as events; the combat system processes them
            // For now, track that standing damage should apply
            this.applyZoneEffect(world, entityId, def.onStandEffect, zone.creatorId);
          }
        }
      }

      // Handle expansion
      if (def.expanding && zone.currentRadius < def.maxRadius) {
        zone.currentRadius++;
        this.expandZone(zone, def);
      }

      // Decrement duration
      if (zone.remainingTurns > 0) {
        zone.remainingTurns--;
        if (zone.remainingTurns <= 0) {
          toRemove.push(zoneId);
        }
      }
    }

    for (const id of toRemove) {
      this.removeZone(id);
    }
  }

  /** Handle entity movement through zones. */
  private handleMovement(entityId: EntityId, from: AxialCoord, to: AxialCoord): void {
    const fromKey = hexKey(from.q, from.r);
    const toKey = hexKey(to.q, to.r);

    // Check zones we're leaving
    const fromZones = this.hexZoneIndex.get(fromKey);
    const toZones = this.hexZoneIndex.get(toKey);

    if (fromZones) {
      for (const zoneId of fromZones) {
        if (!toZones?.has(zoneId)) {
          // Leaving this zone
          const zone = this.zones.get(zoneId);
          if (zone) {
            zone.occupants.delete(entityId);
            this.eventBus.emit("zone:exit", { entityId, zoneId, q: from.q, r: from.r });
          }
        }
      }
    }

    if (toZones) {
      for (const zoneId of toZones) {
        if (!fromZones?.has(zoneId)) {
          // Entering this zone
          const zone = this.zones.get(zoneId);
          if (zone) {
            zone.occupants.add(entityId);
            this.eventBus.emit("zone:enter", { entityId, zoneId, q: to.q, r: to.r });

            // Apply on-enter effect
            const def = getZoneDef(zone.defId);
            if (def?.onEnterEffect) {
              this.applyZoneEffect(null as any, entityId, def.onEnterEffect, zone.creatorId);
            }
          }
        }
      }
    }
  }

  private expandZone(zone: ZoneInstance, def: ZoneDef): void {
    for (const hex of hexSpiral(zone.center, zone.currentRadius)) {
      const key = hexKey(hex.q, hex.r);
      if (zone.hexes.has(key)) continue;
      if (!this.grid.has(hex.q, hex.r)) continue;

      zone.hexes.add(key);

      const tile = this.grid.get(hex.q, hex.r);
      if (tile) {
        zone.originalTiles.set(key, {
          movementCost: tile.movementCost,
          blocksLoS: tile.blocksLoS,
        });
        if (def.movementCostMult !== 1.0) tile.movementCost *= def.movementCostMult;
        if (def.blocksLoS) tile.blocksLoS = true;

        if (tile.occupant) zone.occupants.add(tile.occupant);
      }

      let zoneSet = this.hexZoneIndex.get(key);
      if (!zoneSet) {
        zoneSet = new Set();
        this.hexZoneIndex.set(key, zoneSet);
      }
      zoneSet.add(zone.id);
    }
  }

  private shouldAffect(entityId: EntityId, def: ZoneDef, world: World): boolean {
    if (def.affectedFaction === "all") return true;
    const isAI = world.getComponent(entityId, "aiBehavior") !== undefined;
    if (def.creatorFaction === "player") {
      return def.affectedFaction === "ally" ? !isAI : isAI;
    } else if (def.creatorFaction === "ai") {
      return def.affectedFaction === "ally" ? isAI : !isAI;
    }
    return true;
  }

  private applyZoneEffect(world: World, entityId: EntityId, effect: ZoneEffect, creatorId: EntityId | null): void {
    // Zone effects are tracked; the combat manager applies them
    // This emits events that the status effect manager and damage pipeline can consume
    if (effect.damage > 0) {
      this.eventBus.emit("damage:dealt", {
        attackerId: creatorId ?? entityId,
        defenderId: entityId,
        damage: effect.damage,
        damageType: effect.damageType,
        critical: false,
        overkill: false,
        source: "zone",
      });
    }
    if (effect.heal > 0) {
      this.eventBus.emit("heal", {
        sourceId: creatorId,
        targetId: entityId,
        amount: effect.heal,
        overheal: 0,
      });
    }
  }

  // ── Queries ──

  getZonesAtHex(hex: AxialCoord): string[] {
    const key = hexKey(hex.q, hex.r);
    const set = this.hexZoneIndex.get(key);
    return set ? [...set] : [];
  }

  getZone(zoneId: string): ZoneInstance | undefined {
    return this.zones.get(zoneId);
  }

  getAllZones(): ZoneInstance[] {
    return [...this.zones.values()];
  }

  getMovementCostModifier(hex: AxialCoord): number {
    const zoneIds = this.getZonesAtHex(hex);
    let mult = 1.0;
    for (const id of zoneIds) {
      const zone = this.zones.get(id);
      if (!zone) continue;
      const def = getZoneDef(zone.defId);
      if (def) mult *= def.movementCostMult;
    }
    return mult;
  }

  isBlocked(hex: AxialCoord): boolean {
    const zoneIds = this.getZonesAtHex(hex);
    for (const id of zoneIds) {
      const zone = this.zones.get(id);
      if (!zone) continue;
      const def = getZoneDef(zone.defId);
      if (def?.blocksMovement) return true;
    }
    return false;
  }
}
