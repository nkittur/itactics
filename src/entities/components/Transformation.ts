import type { Component } from "../Component";

/**
 * Defines a transformation (temporary form change).
 */
export interface TransformationDef {
  /** Unique identifier. */
  id: string;
  /** Display name of the form. */
  name: string;
  /** Description. */
  description: string;

  /** Stat overrides (replaces base stat). */
  statOverrides: Record<string, number>;
  /** Stat modifiers (adds to base stat). */
  statModifiers: Record<string, number>;

  /** Abilities that replace the entity's normal abilities. Empty = keep original. */
  abilityReplacements: string[];
  /** Abilities added on top of existing ones. */
  abilityAdditions: string[];

  /** Resource changes when entering form. */
  resourceChanges: Record<string, number>;
  /** Resources available only in this form. */
  formResources: string[];

  /** Movement overrides. */
  movementOverride: number | null;
  /** Whether this form grants flight. */
  flying: boolean;
  /** Whether this form grants phasing (through walls/entities). */
  phased: boolean;
  /** Size modifier (1 = normal, 2 = large). */
  size: number;

  /** Status immunities in this form. */
  immunities: string[];

  /** Duration in turns. 0 = permanent (toggle). */
  duration: number;

  /** Effects applied when transformation ends. */
  onEndEffects: string[];
  /** Effects applied when transformation begins. */
  onStartEffects: string[];

  /** For summon merges: stat contribution from consumed summon. */
  mergeStatRatio: number; // 0-1: how much of summon's stats to add
}

/** Component tracking active transformation on an entity. */
export interface TransformationComponent extends Component {
  readonly type: "transformation";
  /** Current active transformation id. Null if not transformed. */
  activeFormId: string | null;
  /** Remaining duration. */
  remainingTurns: number;
  /** Snapshot of entity state before transformation (for restore). */
  snapshot: EntitySnapshot | null;
  /** Whether this is a stance (lightweight toggle) vs full transformation. */
  isStance: boolean;
}

/** Snapshot of entity state for restoration after transformation. */
export interface EntitySnapshot {
  stats: Record<string, any>;
  abilityIds: string[];
  resources: Record<string, any>;
  health: { current: number; max: number };
}

export function createTransformation(): TransformationComponent {
  return {
    type: "transformation",
    activeFormId: null,
    remainingTurns: 0,
    snapshot: null,
    isStance: false,
  };
}

// ── Transformation Definition Registry ──

const transformDefs = new Map<string, TransformationDef>();

export function registerTransformationDef(def: TransformationDef): void {
  transformDefs.set(def.id, def);
}

export function getTransformationDef(id: string): TransformationDef | undefined {
  return transformDefs.get(id);
}
