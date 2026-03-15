/**
 * Loads and exposes the current ruleset (classes + abilities).
 * One ruleset active at a time; switch via setRuleset(id) for multiverse support.
 */

import type { Ruleset, RulesetClass, RulesetArchetype, RulesetAbilityDef, RulesetAbilitySlot } from "./RulesetSchema";
import { defaultRuleset } from "./defaultRuleset";
import type { SkillTree, SkillTreeNode } from "../SkillTreeData";
import { CP_COST_BY_TIER } from "../SkillTreeData";

let currentRuleset: Ruleset = defaultRuleset;
const abilityById = new Map<string, RulesetAbilityDef>();

function indexAbilities(ruleset: Ruleset): void {
  abilityById.clear();
  for (const a of ruleset.abilities) {
    abilityById.set(a.id, a);
  }
}

indexAbilities(currentRuleset);

function slotNodeId(slot: RulesetAbilitySlot): string {
  return `t${slot.tier}_${slot.position}`;
}

export function getCurrentRuleset(): Ruleset {
  return currentRuleset;
}

export function setRuleset(ruleset: Ruleset): void {
  currentRuleset = ruleset;
  indexAbilities(ruleset);
}

export function setRulesetById(id: string): boolean {
  if (id === "default") {
    setRuleset(defaultRuleset);
    return true;
  }
  return false;
}

export function getClasses(): RulesetClass[] {
  return currentRuleset.classes;
}

/** Class IDs allowed for play (skill trees we've fixed). Use for roster, recruits, and skill UI. */
export const PLAYABLE_CLASS_IDS = [
  "chronoweaver",
  "ironbloom_warden",
  "echo_dancer",
  "ashwright",
  "voidcaller",
] as const;

export function getPlayableClasses(): RulesetClass[] {
  const set = new Set(PLAYABLE_CLASS_IDS);
  return currentRuleset.classes.filter((c) => set.has(c.id as (typeof PLAYABLE_CLASS_IDS)[number]));
}

export function getClass(id: string): RulesetClass | undefined {
  return currentRuleset.classes.find((c) => c.id === id);
}

export function getAbility(id: string): RulesetAbilityDef | undefined {
  return abilityById.get(id);
}

export function getArchetypeAbilitySlots(classId: string, archetypeId: string): RulesetAbilitySlot[] {
  const cls = getClass(classId);
  const arch = cls?.archetypes.find((a) => a.id === archetypeId);
  return arch?.abilitySlots ?? [];
}

export function getArchetype(classId: string, archetypeId: string): RulesetArchetype | undefined {
  const cls = getClass(classId);
  return cls?.archetypes.find((a) => a.id === archetypeId);
}

/** Build a SkillTree (for save/UI compatibility) from a ruleset class archetype. */
export function buildSkillTreeFromArchetype(classId: string, archetypeId: string): SkillTree | null {
  const slots = getArchetypeAbilitySlots(classId, archetypeId);
  if (slots.length === 0) return null;

  const nodes: SkillTreeNode[] = slots.map((slot) => ({
    nodeId: slotNodeId(slot),
    abilityUid: slot.abilityId,
    isActive: true,
    tier: slot.tier,
    col: slot.position,
    prerequisites: slot.prerequisites ?? [],
    cpCost: CP_COST_BY_TIER[slot.tier],
    dualParent: (slot.prerequisites?.length ?? 0) >= 2,
    stackable: false,
    maxStacks: 1,
  }));

  const edges: [string, string][] = [];
  for (const slot of slots) {
    const nodeId = slotNodeId(slot);
    for (const prereq of slot.prerequisites ?? []) {
      edges.push([prereq, nodeId]);
    }
  }

  return { nodes, edges };
}
