/**
 * Default ruleset built from skill_trees.txt (DOC_CLASSES + ABILITY_EFFECT_MAPPINGS).
 * Built at module load; no separate script required.
 */

import { DOC_CLASSES } from "../parsed/SkillTreeContent";
import { buildRulesetFromDoc } from "./buildRulesetFromDoc";

export const defaultRuleset = buildRulesetFromDoc(DOC_CLASSES);

export const defaultRulesetClasses = defaultRuleset.classes;
export const defaultRulesetAbilities = defaultRuleset.abilities;
