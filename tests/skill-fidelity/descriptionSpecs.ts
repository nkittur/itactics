/**
 * Description-derived specs: expected outcomes derived by reading each ability's
 * canonical description (from skill_trees.txt / DOC_CLASSES), not from the mapping.
 * Keys are ruleset ability ids. Each spec is hand-authored so tests verify that
 * the engine produces what the description says.
 */

export interface DescriptionSpec {
  /** Exact description text from the design doc (for reference and audit). */
  description: string;
  /** Expected outcomes when the ability is used, derived from reading the description. */
  expect: {
    /** At least one attack hit (weapon or spell). */
    attackHit?: boolean;
    /** Target has this status effect. */
    statusOnTarget?: {
      id: string;
      durationTurns?: number;
      dmgPerTurn?: number;
      /** For armor break: expected approximate % or modifier. */
      armorReductionPct?: number;
    };
    /** Self (attacker) has this status. */
    statusOnSelf?: {
      id: string;
      durationTurns?: number;
      stat?: string;
      amount?: number;
    };
    /** After one turn tick, target takes this much damage from DoT (total). */
    dotTickDamage?: number;
    /** After one turn tick, target heals this much from HoT. */
    hotTickHeal?: number;
    /** Target has heal-reduction debuff (e.g. "heals 30% less"). */
    healReducePct?: number;
    /** Target was displaced (pushed/pulled) at least this many hexes. */
    pushedHexes?: number;
    /** Self or target heals by at least this much (flat heal). */
    healAtLeast?: number;
    /** AP refunded to caster. */
    apRefunded?: number;
    /** Target is stunned (or similar CC). */
    targetStunned?: boolean;
  };
}

/**
 * Specs keyed by ruleset ability id.
 * Each entry: read the description, then write what must be true after use.
 */
export const DESCRIPTION_SPECS: Record<string, DescriptionSpec> = {
  // ── Chronoweaver / Entropy ──
  "chronoweaver_chronoweaver_entropy_rust_touch": {
    description: "Melee hit applies Corrode: -5% armor for 2 turns, stacks 3x",
    expect: {
      attackHit: true,
      statusOnTarget: { id: "armor_break", durationTurns: 2, armorReductionPct: 5 },
    },
  },
  "chronoweaver_chronoweaver_entropy_wither_bolt": {
    description: "Ranged bolt dealing low damage + Decay (DoT, 2 turns)",
    expect: {
      attackHit: true,
      statusOnTarget: { id: "poison", durationTurns: 2 },
      dotTickDamage: 3,
    },
  },
  "chronoweaver_chronoweaver_entropy_sap_vitality": {
    description: "Target heals 30% less for 3 turns",
    expect: {
      statusOnTarget: { id: "heal_reduce" },
      healReducePct: 30,
    },
  },
  "chronoweaver_chronoweaver_entropy_crumble": {
    description: "Destroy 50% of target's remaining armor (6 turns cooldown)",
    expect: {
      statusOnTarget: { id: "armor_break", armorReductionPct: 50 },
    },
  },

  // ── Chronoweaver / Accelerant ──
  "chronoweaver_chronoweaver_accelerant_quicken": {
    description: "Haste self for 2 turns, +30% action rate",
    expect: {
      statusOnSelf: { id: "buff_initiative", durationTurns: 2, stat: "initiative", amount: 15 },
    },
  },
  "chronoweaver_chronoweaver_accelerant_overclock": {
    description: "Double action rate for 1 turn, then 1 turn self-stun",
    expect: {
      // grant_ap + cc_stun delayed to end_of_turn (stun applied after turn)
      statusOnTarget: { id: "stun", delayed: true },
    },
  },

  // ── Chronoweaver / Paradox ──
  "chronoweaver_chronoweaver_paradox_rewind": {
    description: "Restore self to HP/position from 1 turn ago, 5 turns cooldown",
    expect: {
      healAtLeast: 0,
    },
  },
  "chronoweaver_chronoweaver_paradox_stutter": {
    description: "Freeze target in time for 1 turn (stun)",
    expect: {
      targetStunned: true,
    },
  },
  "chronoweaver_chronoweaver_paradox_echo_cast": {
    description: "Repeat your last-used skill at 60% power, no cost",
    expect: {
      apRefunded: 2,
    },
  },

  // ── Ironbloom Warden / Bloomheart ──
  "ironbloom_warden_ironbloom_warden_bloomheart_rejuvenate": {
    description: "HoT on self or ally, heals over 3 turns",
    expect: {
      statusOnTarget: { id: "regen" },
      hotTickHeal: 8,
    },
  },
};
