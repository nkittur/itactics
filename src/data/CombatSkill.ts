import type { SkillDef } from "./SkillData";
import { skillAPCost, skillStaminaCost, skillRange } from "./SkillData";
import type { GeneratedAbility } from "./AbilityData";
import type { WeaponDef } from "./WeaponData";

/**
 * Unified wrapper so both static SkillDef and GeneratedAbility present
 * the same interface to ActionBar and CombatManager.
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
