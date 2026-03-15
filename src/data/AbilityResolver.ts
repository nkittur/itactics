import type { GeneratedAbility } from "./AbilityData";
import { isGeneratedAbilityId } from "./AbilityData";
import { getAbility } from "./ruleset/RulesetLoader";
import { rulesetAbilityToGenerated } from "./ruleset/rulesetAbilityAdapter";

let abilityRegistry: Record<string, GeneratedAbility> = {};

export function setAbilityRegistry(registry: Record<string, GeneratedAbility>): void {
  abilityRegistry = registry;
}

export function getAbilityRegistry(): Record<string, GeneratedAbility> {
  return abilityRegistry;
}

/** Resolve a generated ability by its UID. Uses registry first; falls back to ruleset. */
export function resolveAbility(id: string): GeneratedAbility | undefined {
  if (abilityRegistry[id]) return abilityRegistry[id];
  const rulesetDef = getAbility(id);
  if (rulesetDef) return rulesetAbilityToGenerated(rulesetDef);
  return undefined;
}

/** Register a generated ability in the runtime registry. */
export function registerAbility(ability: GeneratedAbility): void {
  abilityRegistry[ability.uid] = ability;
}
