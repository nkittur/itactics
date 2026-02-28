import type { GeneratedAbility } from "./AbilityData";
import { generateAbilityUID } from "./AbilityData";
import { registerAbility } from "./AbilityResolver";
import type { Theme, ThemeProgressionSlot, FunctionalBucket } from "./ThemeData";
import { THEMES, EFFECT_TO_BUCKET, ALL_BUCKETS } from "./ThemeData";
import { generatePassiveSuite, type PowerLevel } from "./PassiveGenerator";
import { generateAbility, rollRarity } from "./AbilityGenerator";

// Re-export for convenience
export type { PowerLevel };

// ── Types ──

export interface SkillTreeNode {
  nodeId: string;
  abilityUid: string;
  isActive: boolean;
  tier: 1 | 2 | 3 | 4;
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

// ── Constants ──

export const CP_COST_BY_TIER: Record<1 | 2 | 3 | 4, number> = {
  1: 100,
  2: 150,
  3: 200,
  4: 250,
};

const TIER_NODE_COUNTS: Record<1 | 2 | 3 | 4, [number, number]> = {
  1: [2, 3],
  2: [2, 3],
  3: [3, 4],
  4: [2, 3],
};

// ── Helpers ──

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Topology generation ──

interface TopologyNode {
  nodeId: string;
  tier: 1 | 2 | 3 | 4;
  col: number;
  isActive: boolean;
  prerequisites: string[];
  dualParent: boolean;
  stackable: boolean;
  maxStacks: number;
}

/**
 * Generate a random tree topology (no abilities attached yet).
 * Ensures valid branching, ~1/3 active + 2/3 passive, stackable passives.
 */
export function generateRandomTopology(rng: () => number): {
  nodes: TopologyNode[];
  edges: [string, string][];
} {
  // 1. Roll node counts per tier
  const counts: Record<1 | 2 | 3 | 4, number> = {
    1: randInt(TIER_NODE_COUNTS[1][0], TIER_NODE_COUNTS[1][1], rng),
    2: randInt(TIER_NODE_COUNTS[2][0], TIER_NODE_COUNTS[2][1], rng),
    3: randInt(TIER_NODE_COUNTS[3][0], TIER_NODE_COUNTS[3][1], rng),
    4: randInt(TIER_NODE_COUNTS[4][0], TIER_NODE_COUNTS[4][1], rng),
  };

  const total = counts[1] + counts[2] + counts[3] + counts[4];
  const activeCount = Math.ceil(total / 3);

  // 2. Create all nodes with tier assignment
  const allNodes: TopologyNode[] = [];
  for (const tier of [1, 2, 3, 4] as const) {
    for (let col = 0; col < counts[tier]; col++) {
      allNodes.push({
        nodeId: `t${tier}_${col}`,
        tier,
        col,
        isActive: false, // assigned below
        prerequisites: [],
        dualParent: false,
        stackable: false,
        maxStacks: 1,
      });
    }
  }

  // 3. Assign active/passive: ~1/3 active, 2/3 passive
  // Tier 1 must have at least 1 active
  const tier1Nodes = allNodes.filter(n => n.tier === 1);
  const otherNodes = allNodes.filter(n => n.tier !== 1);

  // Ensure first tier 1 node is active
  tier1Nodes[0]!.isActive = true;
  let activeRemaining = activeCount - 1;

  // Randomly assign remaining actives
  const candidates = [...tier1Nodes.slice(1), ...otherNodes];
  const shuffled = shuffle(candidates, rng);
  for (let i = 0; i < activeRemaining && i < shuffled.length; i++) {
    shuffled[i]!.isActive = true;
  }

  // 4. Wire edges: each non-root node connects to 1-2 nearby parents from tier above
  const nodesByTier: Record<number, TopologyNode[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const n of allNodes) nodesByTier[n.tier]!.push(n);

  const edges: [string, string][] = [];

  // Helper: find parents within ±1 column of a child's normalized position
  function nearbyParents(parents: TopologyNode[], childCol: number, childCount: number, parentCount: number): TopologyNode[] {
    // Map child col to parent column space (handles different tier widths)
    const childPos = parentCount <= 1 ? 0 : (childCol / Math.max(1, childCount - 1)) * (parentCount - 1);
    return parents
      .map(p => ({ p, dist: Math.abs(p.col - childPos) }))
      .sort((a, b) => a.dist - b.dist)
      .filter(x => x.dist <= 1.5) // within ~1 column
      .map(x => x.p);
  }

  for (const tier of [2, 3, 4] as const) {
    const parentTier = (tier - 1) as 1 | 2 | 3;
    const parents = nodesByTier[parentTier]!;
    const children = nodesByTier[tier]!;

    // Track which parents have at least one child
    const parentHasChild = new Set<string>();

    for (const child of children) {
      // 1 or 2 parents, preferring nearby columns
      const numParents = rng() < 0.3 ? 2 : 1;
      let nearby = nearbyParents(parents, child.col, children.length, parents.length);
      // Fallback: if no nearby parents, use all (shouldn't happen with normal counts)
      if (nearby.length === 0) nearby = [...parents];
      const shuffledNearby = shuffle(nearby, rng);
      const chosen = shuffledNearby.slice(0, Math.min(numParents, shuffledNearby.length));

      for (const p of chosen) {
        child.prerequisites.push(p.nodeId);
        edges.push([p.nodeId, child.nodeId]);
        parentHasChild.add(p.nodeId);
      }

      child.dualParent = child.prerequisites.length >= 2;
    }

    // Ensure every parent in non-leaf tiers has at least 1 child (prefer nearby)
    if (tier <= 4) {
      for (const parent of parents) {
        if (!parentHasChild.has(parent.nodeId)) {
          // Pick the closest child that doesn't already have this parent
          const sorted = [...children]
            .map(c => ({ c, dist: Math.abs(c.col / Math.max(1, children.length - 1) * (parents.length - 1) - parent.col) }))
            .sort((a, b) => a.dist - b.dist);
          const child = sorted.find(x => !x.c.prerequisites.includes(parent.nodeId))?.c ?? pick(children, rng);
          if (!child.prerequisites.includes(parent.nodeId)) {
            child.prerequisites.push(parent.nodeId);
            edges.push([parent.nodeId, child.nodeId]);
            child.dualParent = child.prerequisites.length >= 2;
          }
          parentHasChild.add(parent.nodeId);
        }
      }
    }

    // Barycentric reordering: sort children by average parent column to minimize crossings
    const barycenter = new Map<string, number>();
    for (const child of children) {
      const parentCols = child.prerequisites
        .map(pid => parents.find(p => p.nodeId === pid))
        .filter(Boolean)
        .map(p => p!.col);
      if (parentCols.length > 0) {
        barycenter.set(child.nodeId, parentCols.reduce((a, b) => a + b, 0) / parentCols.length);
      } else {
        barycenter.set(child.nodeId, child.col);
      }
    }
    children.sort((a, b) => barycenter.get(a.nodeId)! - barycenter.get(b.nodeId)!);
    // Reassign columns after sorting
    for (let i = 0; i < children.length; i++) {
      children[i]!.col = i;
    }
  }

  // 5. Mark 20-40% of passives as stackable (varied per tree)
  const passiveNodes = allNodes.filter(n => !n.isActive);
  const stackPct = 0.2 + rng() * 0.2; // 20-40%
  const stackableCount = Math.max(1, Math.round(passiveNodes.length * stackPct));
  const shuffledPassives = shuffle(passiveNodes, rng);
  for (let i = 0; i < stackableCount && i < shuffledPassives.length; i++) {
    shuffledPassives[i]!.stackable = true;
    shuffledPassives[i]!.maxStacks = randInt(2, 3, rng);
  }

  return { nodes: allNodes, edges };
}

// ── Power level mapping ──

function passivePowerForTier(tier: 1 | 2 | 3 | 4, dualParent: boolean): PowerLevel {
  if (dualParent) {
    // Dual-parent gets an upgrade
    switch (tier) {
      case 1: return "minor";
      case 2: return "standard";
      case 3: return "major";
      case 4: return "major"; // already max
    }
  }
  switch (tier) {
    case 1: return "minor";
    case 2: return "minor";
    case 3: return "standard";
    case 4: return "major";
  }
}

function activeTierForTreeTier(tier: 1 | 2 | 3 | 4, dualParent: boolean): 1 | 2 | 3 {
  if (dualParent) {
    switch (tier) {
      case 1: return 1;
      case 2: return 2;
      case 3: return 3;
      case 4: return 3; // max
    }
  }
  switch (tier) {
    case 1: return 1;
    case 2: return 1;
    case 3: return 2;
    case 4: return 3;
  }
}

// ── Bucket classification ──

/** Classify a slot's effects into the set of functional buckets they cover. */
function classifySlotBuckets(slot: ThemeProgressionSlot): Set<FunctionalBucket> {
  const buckets = new Set<FunctionalBucket>();
  for (const effect of slot.effects) {
    const bucket = EFFECT_TO_BUCKET[effect];
    if (bucket) buckets.add(bucket);
  }
  return buckets;
}

/** Score a progression slot against the theme's bucket profile with decay. */
function scoreSlot(
  slot: ThemeProgressionSlot,
  profile: Record<FunctionalBucket, number>,
  bucketCounts: Map<FunctionalBucket, number>,
): number {
  const buckets = classifySlotBuckets(slot);
  let score = 0;
  for (const bucket of buckets) {
    const count = bucketCounts.get(bucket) ?? 0;
    score += profile[bucket] * Math.pow(0.5, count);
  }
  // Minimum score so no slot is completely impossible
  return Math.max(score, 0.1);
}

// ── Full tree generation ──

/**
 * Generate a complete skill tree for a unit with primary + optional secondary theme.
 * Uses bucket-aware slot selection to ensure diverse ability spread.
 */
export function generateSkillTree(
  primaryTheme: Theme,
  secondaryTheme: Theme | null,
  rng: () => number,
): SkillTree {
  const { nodes: topology, edges } = generateRandomTopology(rng);

  // Separate active and passive nodes
  const activeNodes = topology.filter(n => n.isActive);
  const passiveNodes = topology.filter(n => !n.isActive);

  // Designate ~1/3 of active nodes as "secondary" (at least 1 if secondary exists)
  const secondaryCount = secondaryTheme
    ? Math.max(1, Math.round(activeNodes.length * (0.3 + rng() * 0.1)))
    : 0;
  // Shuffle to randomly assign which nodes are secondary
  const shuffledActiveIndices = shuffle(
    activeNodes.map((_, i) => i),
    rng,
  );
  const secondaryIndices = new Set(shuffledActiveIndices.slice(0, secondaryCount));

  // Track bucket counts across ALL actives for diversity
  const bucketCounts = new Map<FunctionalBucket, number>();

  const actives: GeneratedAbility[] = [];
  for (let i = 0; i < activeNodes.length; i++) {
    const node = activeNodes[i]!;
    const tier = activeTierForTreeTier(node.tier, node.dualParent);

    // Determine source theme for this node
    const useTheme = (secondaryTheme && secondaryIndices.has(i))
      ? secondaryTheme
      : primaryTheme;

    // Weapon req: intersection of primary + secondary for secondary nodes
    let weaponReq = primaryTheme.weaponAffinity;
    if (useTheme !== primaryTheme) {
      const shared = useTheme.weaponAffinity.filter(w => primaryTheme.weaponAffinity.includes(w));
      weaponReq = shared.length > 0 ? shared : primaryTheme.weaponAffinity;
    }

    // Score each of the source theme's 4 progression slots using bucket profile + decay
    const slotScores: number[] = useTheme.progression.map(slot =>
      scoreSlot(slot, useTheme.bucketProfile, bucketCounts),
    );

    // Pick slot by weighted random from scores
    const totalScore = slotScores.reduce((s, v) => s + v, 0);
    let roll = rng() * totalScore;
    let slotIndex = 0;
    for (let si = 0; si < slotScores.length; si++) {
      roll -= slotScores[si]!;
      if (roll <= 0) { slotIndex = si; break; }
    }

    const slot = useTheme.progression[slotIndex]!;
    const ability = generateAbility(
      { ...slot, isPassive: false },
      tier,
      useTheme.id,
      weaponReq,
      rng,
    );
    registerAbility(ability);
    actives.push(ability);

    // Update bucket counts
    const usedBuckets = classifySlotBuckets(slot);
    for (const bucket of usedBuckets) {
      bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    }
  }

  // Generate passives using PassiveGenerator (unchanged — synergy-focused)
  const passivePowerLevels: PowerLevel[] = passiveNodes.map(n =>
    passivePowerForTier(n.tier, n.dualParent),
  );
  const passiveRarities = passiveNodes.map(() => rollRarity(rng));
  const passives = generatePassiveSuite(actives, passivePowerLevels, rng, true, passiveRarities);

  // Deduplicate names within the tree — use adjective variants before "II" suffix
  const DEDUP_ADJECTIVES = [
    "Greater", "Lesser", "Improved", "Swift", "Brutal", "Fierce", "Savage", "Keen",
  ];
  const usedNames = new Set<string>();
  const allAbilities = [...actives, ...passives];
  for (const ability of allAbilities) {
    if (usedNames.has(ability.name)) {
      let deduped = false;
      // Try adjective prefix first
      for (let i = 0; i < DEDUP_ADJECTIVES.length; i++) {
        const idx = Math.floor(rng() * DEDUP_ADJECTIVES.length);
        const newName = `${DEDUP_ADJECTIVES[idx]} ${ability.name}`;
        if (!usedNames.has(newName)) {
          ability.name = newName;
          deduped = true;
          break;
        }
      }
      // Fallback to numeric suffix
      if (!deduped) {
        for (const suffix of ["II", "III", "IV"]) {
          const newName = `${ability.name} ${suffix}`;
          if (!usedNames.has(newName)) {
            ability.name = newName;
            break;
          }
        }
      }
    }
    usedNames.add(ability.name);
  }

  // Wire abilities onto nodes
  const nodes: SkillTreeNode[] = [];
  let activeIdx = 0;
  let passiveIdx = 0;

  for (const topo of topology) {
    const abilityUid = topo.isActive
      ? actives[activeIdx++]!.uid
      : passives[passiveIdx++]!.uid;

    nodes.push({
      nodeId: topo.nodeId,
      abilityUid,
      isActive: topo.isActive,
      tier: topo.tier,
      col: topo.col,
      prerequisites: topo.prerequisites,
      cpCost: CP_COST_BY_TIER[topo.tier],
      dualParent: topo.dualParent,
      stackable: topo.stackable,
      maxStacks: topo.maxStacks,
    });
  }

  return { nodes, edges };
}
