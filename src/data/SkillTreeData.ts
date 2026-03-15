/**
 * Skill tree types and constants.
 * Tree content comes from the ruleset; this file only defines the shape used by save/UI.
 */

// ── Types ──

export interface SkillTreeNode {
  nodeId: string;
  abilityUid: string;
  isActive: boolean;
  tier: 1 | 2 | 3 | 4 | 5;
  /** Column position within the tier for UI layout. */
  col: number;
  /** Node IDs that must be unlocked before this one. */
  prerequisites: string[];
  /** CP cost to unlock (or per stack). */
  cpCost: number;
  /** Has 2+ parents → gets a power bonus. */
  dualParent: boolean;
  /** Can be purchased multiple times. */
  stackable: boolean;
  /** Max times this node can be unlocked (1 for non-stackable). */
  maxStacks: number;
}

export interface SkillTree {
  nodes: SkillTreeNode[];
  edges: [string, string][];
}

// ── Constants (FFT-style: lower tier cheap, higher tier expensive) ──

export const CP_COST_BY_TIER: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 100,
  2: 200,
  3: 400,
  4: 600,
  5: 1000,
};

/** Minimum number of skills unlocked in the previous tier to unlock a skill in this tier. */
export const REQUIRED_PREV_TIER_UNLOCKS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
};
