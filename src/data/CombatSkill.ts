import type { SkillDef } from "./SkillData";
import { skillAPCost, skillStaminaCost, skillRange } from "./SkillData";
import type { GeneratedAbility } from "./AbilityData";
import type { WeaponDef } from "./WeaponData";
import type { RulesetAbilityDef } from "./ruleset/RulesetSchema";
import { rulesetAbilityToGenerated } from "./ruleset/rulesetAbilityAdapter";

/**
 * Unified wrapper so static SkillDef, GeneratedAbility, or RulesetAbilityDef
 * present the same interface to ActionBar and CombatManager.
 */
export interface CombatSkill {
  id: string;
  name: string;
  description: string;
  apCost: number;
  staminaCost: number;
  manaCost: number;
  range: number;
  targetType: "enemy" | "hex" | "self";
  rangeType: "melee" | "ranged";
  isBasicAttack: boolean;
  isStance: boolean;
  isPassive: boolean;
  isGenerated: boolean;
  cooldown: number;
  turnEnding: boolean;
  /** Present if this wraps a static skill. */
  skillDef?: SkillDef;
  /** Present if this wraps a generated ability. */
  generatedAbility?: GeneratedAbility;
  /** Present if this wraps a ruleset ability. */
  rulesetAbility?: RulesetAbilityDef;
}

/** Get the executable GeneratedAbility for a CombatSkill (for AbilityExecutor). */
export function getExecutableAbility(skill: CombatSkill): GeneratedAbility | null {
  if (skill.generatedAbility) return skill.generatedAbility;
  if (skill.rulesetAbility) return rulesetAbilityToGenerated(skill.rulesetAbility);
  return null;
}

/** Wrap a static SkillDef into a CombatSkill. */
export function wrapSkillDef(skill: SkillDef, weapon: WeaponDef): CombatSkill {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    apCost: skillAPCost(skill, weapon),
    staminaCost: skillStaminaCost(skill, weapon),
    manaCost: weapon.manaCost,
    range: skillRange(skill, weapon),
    targetType: skill.targetType,
    rangeType: skill.rangeType,
    isBasicAttack: skill.isBasicAttack,
    isStance: skill.isStance,
    isPassive: false,
    isGenerated: false,
    cooldown: 0,
    turnEnding: false,
    skillDef: skill,
  };
}

/** Wrap a GeneratedAbility into a CombatSkill. */
export function wrapGeneratedAbility(ability: GeneratedAbility, _weapon: WeaponDef): CombatSkill {
  const targetType: "enemy" | "hex" | "self" =
    ability.targeting.type === "tgt_self" ? "self"
      : ability.targeting.type === "tgt_single_ally" ? "self"
        : "enemy";

  const isStance = ability.effects.some(
    e => e.type === "stance_counter" || e.type === "stance_overwatch",
  );

  return {
    id: ability.uid,
    name: ability.name,
    description: ability.description,
    apCost: ability.cost.ap,
    staminaCost: ability.cost.stamina,
    manaCost: ability.cost.mana,
    range: ability.targeting.params.range ?? 1,
    targetType,
    rangeType: "melee",
    isBasicAttack: false,
    isStance,
    isPassive: ability.isPassive,
    isGenerated: true,
    cooldown: ability.cost.cooldown,
    turnEnding: ability.cost.turnEnding,
    generatedAbility: ability,
  };
}

/** Wrap a RulesetAbilityDef into a CombatSkill. */
export function wrapRulesetAbility(def: RulesetAbilityDef, _weapon: WeaponDef): CombatSkill {
  const targetType: "enemy" | "hex" | "self" =
    def.targeting.type === "tgt_self" ? "self"
      : def.targeting.type === "tgt_single_ally" ? "self"
        : "enemy";

  const isStance = def.effects.some(
    e => e.type === "stance_counter" || e.type === "stance_overwatch",
  );

  const isPassive =
    def.type.toLowerCase().includes("passive") || def.type.toLowerCase() === "aura";

  const range = def.targeting.params.range ?? def.targeting.params.radius ?? 1;

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    apCost: def.cost.ap,
    staminaCost: def.cost.stamina,
    manaCost: def.cost.mana,
    range,
    targetType,
    rangeType: "melee",
    isBasicAttack: false,
    isStance,
    isPassive,
    isGenerated: false,
    cooldown: def.cost.cooldown,
    turnEnding: def.cost.turnEnding,
    rulesetAbility: def,
  };
}
