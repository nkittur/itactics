import { resolveAbility } from "./AbilityResolver";
import type { RosterMember } from "@save/SaveManager";

export interface SynergyPair {
  setupAbilityId: string;
  payoffAbilityId: string;
  /** The shared condition tag (e.g., "bleeding", "stunned"). */
  condition: string;
  /** Human-readable description. */
  description: string;
}

/**
 * Detect synergies within a single unit's abilities.
 * Matches `creates` tags of one ability against `exploits` tags of another.
 */
export function detectUnitSynergies(abilityIds: string[]): SynergyPair[] {
  const pairs: SynergyPair[] = [];
  const abilities = abilityIds.map(id => ({ id, ability: resolveAbility(id) })).filter(a => a.ability);

  for (const a of abilities) {
    for (const b of abilities) {
      if (a.id === b.id) continue;
      const creates = a.ability!.synergyTags.creates;
      const exploits = b.ability!.synergyTags.exploits;
      for (const condition of creates) {
        if (exploits.includes(condition)) {
          pairs.push({
            setupAbilityId: a.id,
            payoffAbilityId: b.id,
            condition,
            description: `${a.ability!.name} creates ${condition} → ${b.ability!.name} exploits it`,
          });
        }
      }
    }
  }

  return pairs;
}

/**
 * Detect synergies across a roster (between different units).
 * Returns pairs where one unit's ability creates a condition another unit exploits.
 */
export function detectTeamSynergies(roster: RosterMember[]): SynergyPair[] {
  const pairs: SynergyPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < roster.length; i++) {
    const aIds = roster[i]!.abilities ?? [];
    for (let j = 0; j < roster.length; j++) {
      if (i === j) continue;
      const bIds = roster[j]!.abilities ?? [];

      for (const aId of aIds) {
        const a = resolveAbility(aId);
        if (!a) continue;
        for (const bId of bIds) {
          const b = resolveAbility(bId);
          if (!b) continue;

          for (const condition of a.synergyTags.creates) {
            if (b.synergyTags.exploits.includes(condition)) {
              const key = `${aId}→${bId}:${condition}`;
              if (seen.has(key)) continue;
              seen.add(key);
              pairs.push({
                setupAbilityId: aId,
                payoffAbilityId: bId,
                condition,
                description: `${a.name} creates ${condition} → ${b.name} exploits it`,
              });
            }
          }
        }
      }
    }
  }

  return pairs;
}
