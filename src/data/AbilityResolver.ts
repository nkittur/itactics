import type { GeneratedAbility } from "./AbilityData";
import { isGeneratedAbilityId } from "./AbilityData";

let abilityRegistry: Record<string, GeneratedAbility> = {};

export function setAbilityRegistry(registry: Record<string, GeneratedAbility>): void {
  abilityRegistry = registry;
}

export function getAbilityRegistry(): Record<string, GeneratedAbility> {
  return abilityRegistry;
}

/** Resolve a generated ability by its UID. Returns undefined for unknown IDs. */
export function resolveAbility(id: string): GeneratedAbility | undefined {
  if (!isGeneratedAbilityId(id)) return undefined;
  return abilityRegistry[id];
}

/** Register a generated ability in the runtime registry. */
export function registerAbility(ability: GeneratedAbility): void {
  abilityRegistry[ability.uid] = ability;
}
