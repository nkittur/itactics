import type { Component } from "../Component";

/** Display modes for resource bars in the UI. */
export type ResourceDisplayMode = "bar" | "counter" | "pips" | "hidden";

/** Behavior when resource decays (reaches 0 or max). */
export type DecayBehavior = "none" | "toward_zero" | "toward_max";

/** How a resource behaves when it reaches certain thresholds. */
export interface ResourceThreshold {
  /** Value at which this threshold triggers. */
  value: number;
  /** Whether this triggers when going above or below. */
  direction: "above" | "below";
  /** Effect to apply when threshold is crossed. */
  effectId?: string;
  /** Event tag emitted when crossed. */
  eventTag?: string;
}

/**
 * Definition for a generic resource type.
 * All class-specific resources (Voltage, Combo Points, Souls, Heat, etc.)
 * are instances of this definition.
 */
export interface ResourceDef {
  /** Unique identifier (e.g., "voltage", "combo_points", "souls", "heat"). */
  id: string;
  /** Display name. */
  name: string;
  /** Minimum value (usually 0, can be negative for some resources). */
  min: number;
  /** Maximum value. Can be modified by stats/effects. */
  max: number;
  /** Starting value when combat begins. */
  startValue: number;
  /** Amount decayed per turn toward min/max. 0 = no decay. */
  decayRate: number;
  /** Direction of decay. */
  decayBehavior: DecayBehavior;
  /** Turns after last modification before decay begins. 0 = immediate. */
  decayDelay: number;
  /** Amount regenerated per turn. 0 = no regen. */
  regenRate: number;
  /** How to display this resource in the UI. */
  displayMode: ResourceDisplayMode;
  /** Color for UI rendering (hex string). */
  color: string;
  /** Thresholds that trigger events or effects. */
  thresholds: ResourceThreshold[];
  /** Tags for categorization (e.g., "offensive", "defensive", "utility"). */
  tags: string[];
}

/** Runtime state of a single resource on an entity. */
export interface ResourceState {
  /** Reference to the resource definition id. */
  defId: string;
  /** Current value. */
  current: number;
  /** Effective max (base max + modifiers). */
  effectiveMax: number;
  /** Effective min (base min + modifiers). */
  effectiveMin: number;
  /** Turns since last modification (for decay delay). */
  turnsSinceModified: number;
}

/**
 * ECS component holding all resources for an entity.
 * Replaces hardcoded Stamina/Mana with a generic resource pool.
 */
export interface ResourcesComponent extends Component {
  readonly type: "resources";
  /** Map of resource def id → runtime state. */
  pools: Record<string, ResourceState>;
}

export function createResources(
  defs: ResourceDef[],
): ResourcesComponent {
  const pools: Record<string, ResourceState> = {};
  for (const def of defs) {
    pools[def.id] = {
      defId: def.id,
      current: def.startValue,
      effectiveMax: def.max,
      effectiveMin: def.min,
      turnsSinceModified: 0,
    };
  }
  return { type: "resources", pools };
}

// ── Resource Definition Registry ──

const resourceDefs = new Map<string, ResourceDef>();

export function registerResourceDef(def: ResourceDef): void {
  resourceDefs.set(def.id, def);
}

export function getResourceDef(id: string): ResourceDef | undefined {
  return resourceDefs.get(id);
}

export function getAllResourceDefs(): ResourceDef[] {
  return [...resourceDefs.values()];
}

// ── Built-in resource definitions (legacy compatibility + common types) ──

export const BUILTIN_RESOURCES: ResourceDef[] = [
  {
    id: "stamina",
    name: "Stamina",
    min: 0, max: 100, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 15, displayMode: "bar", color: "#e8c431",
    thresholds: [], tags: ["physical"],
  },
  {
    id: "mana",
    name: "Mana",
    min: 0, max: 100, startValue: 100,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 10, displayMode: "bar", color: "#4488ff",
    thresholds: [], tags: ["magical"],
  },
  {
    id: "voltage",
    name: "Voltage",
    min: 0, max: 100, startValue: 0,
    decayRate: 5, decayBehavior: "toward_zero", decayDelay: 1,
    regenRate: 0, displayMode: "bar", color: "#ffee00",
    thresholds: [
      { value: 100, direction: "above", eventTag: "overcharge" },
      { value: 75, direction: "above", eventTag: "high_voltage" },
    ],
    tags: ["offensive", "build_spend"],
  },
  {
    id: "combo_points",
    name: "Combo Points",
    min: 0, max: 5, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#ff4444",
    thresholds: [
      { value: 5, direction: "above", eventTag: "max_combo" },
    ],
    tags: ["offensive", "build_spend"],
  },
  {
    id: "souls",
    name: "Souls",
    min: 0, max: 20, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "counter", color: "#9944ff",
    thresholds: [], tags: ["dark", "build_spend"],
  },
  {
    id: "heat",
    name: "Heat",
    min: 0, max: 100, startValue: 0,
    decayRate: 10, decayBehavior: "toward_zero", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#ff6600",
    thresholds: [
      { value: 100, direction: "above", effectId: "overheat", eventTag: "overheat" },
      { value: 80, direction: "above", eventTag: "high_heat" },
    ],
    tags: ["offensive", "risk_reward"],
  },
  {
    id: "focus",
    name: "Focus",
    min: 0, max: 100, startValue: 50,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 5, displayMode: "bar", color: "#00ccff",
    thresholds: [], tags: ["utility"],
  },
  {
    id: "rage",
    name: "Rage",
    min: 0, max: 100, startValue: 0,
    decayRate: 5, decayBehavior: "toward_zero", decayDelay: 1,
    regenRate: 0, displayMode: "bar", color: "#cc0000",
    thresholds: [
      { value: 100, direction: "above", eventTag: "berserk" },
    ],
    tags: ["offensive", "build_spend"],
  },
  {
    id: "faith",
    name: "Faith",
    min: 0, max: 100, startValue: 50,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#ffffcc",
    thresholds: [
      { value: 100, direction: "above", eventTag: "divine_favor" },
      { value: 0, direction: "below", eventTag: "faithless" },
    ],
    tags: ["holy", "dual_axis"],
  },
  {
    id: "shadow",
    name: "Shadow",
    min: 0, max: 100, startValue: 0,
    decayRate: 3, decayBehavior: "toward_zero", decayDelay: 2,
    regenRate: 0, displayMode: "bar", color: "#442266",
    thresholds: [], tags: ["stealth", "build_spend"],
  },
  {
    id: "momentum",
    name: "Momentum",
    min: 0, max: 10, startValue: 0,
    decayRate: 1, decayBehavior: "toward_zero", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#44ff44",
    thresholds: [], tags: ["offensive", "build_spend"],
  },
  {
    id: "blood",
    name: "Blood",
    min: 0, max: 100, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#880000",
    thresholds: [], tags: ["dark", "hp_cost"],
  },
  {
    id: "harmony",
    name: "Harmony",
    min: -100, max: 100, startValue: 0,
    decayRate: 5, decayBehavior: "toward_zero", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#88cc88",
    thresholds: [
      { value: 100, direction: "above", eventTag: "perfect_harmony" },
      { value: -100, direction: "below", eventTag: "dissonance" },
    ],
    tags: ["utility", "dual_axis"],
  },
  {
    id: "ammo",
    name: "Ammo",
    min: 0, max: 6, startValue: 6,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#ccaa44",
    thresholds: [
      { value: 0, direction: "below", eventTag: "empty" },
    ],
    tags: ["ranged", "spend"],
  },
  {
    id: "inspiration",
    name: "Inspiration",
    min: 0, max: 100, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#ffaaff",
    thresholds: [], tags: ["support", "build_spend"],
  },
  {
    id: "corruption",
    name: "Corruption",
    min: 0, max: 100, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#440066",
    thresholds: [
      { value: 100, direction: "above", effectId: "fully_corrupted", eventTag: "fully_corrupted" },
    ],
    tags: ["dark", "risk_reward"],
  },
  {
    id: "chi",
    name: "Chi",
    min: 0, max: 10, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 1, displayMode: "pips", color: "#44ccaa",
    thresholds: [], tags: ["martial", "build_spend"],
  },
  {
    id: "pressure",
    name: "Pressure",
    min: 0, max: 100, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "bar", color: "#ff8844",
    thresholds: [
      { value: 100, direction: "above", effectId: "pressure_burst", eventTag: "burst" },
    ],
    tags: ["offensive", "build_spend"],
  },
  {
    id: "resolve_points",
    name: "Resolve",
    min: 0, max: 5, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#cccccc",
    thresholds: [], tags: ["defensive", "build_spend"],
  },
  {
    id: "echo",
    name: "Echo",
    min: 0, max: 100, startValue: 0,
    decayRate: 10, decayBehavior: "toward_zero", decayDelay: 1,
    regenRate: 0, displayMode: "bar", color: "#aaddff",
    thresholds: [], tags: ["time", "build_spend"],
  },
  // Phase 3: Class-specific resources
  {
    id: "ki",
    name: "Ki",
    min: 0, max: 10, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#44ddcc",
    thresholds: [], tags: ["martial", "build_spend"],
  },
  {
    id: "resonance",
    name: "Resonance",
    min: 0, max: 100, startValue: 0,
    decayRate: 5, decayBehavior: "toward_zero", decayDelay: 1,
    regenRate: 0, displayMode: "bar", color: "#cc88ff",
    thresholds: [
      { value: 100, direction: "above", eventTag: "shatter_ready" },
    ],
    tags: ["sonic", "build_spend"],
  },
  {
    id: "rhythm",
    name: "Rhythm",
    min: 0, max: 5, startValue: 0,
    decayRate: 1, decayBehavior: "toward_zero", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#ff88cc",
    thresholds: [
      { value: 5, direction: "above", eventTag: "perfect_rhythm" },
    ],
    tags: ["martial", "build_spend"],
  },
  {
    id: "soul_essence",
    name: "Soul Essence",
    min: 0, max: 10, startValue: 0,
    decayRate: 0, decayBehavior: "none", decayDelay: 0,
    regenRate: 0, displayMode: "pips", color: "#aa44ff",
    thresholds: [], tags: ["dark", "build_spend"],
  },
];

// Register built-in resources
for (const def of BUILTIN_RESOURCES) {
  registerResourceDef(def);
}
