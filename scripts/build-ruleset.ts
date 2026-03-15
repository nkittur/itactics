/**
 * Builds the default ruleset from DOC_CLASSES and ABILITY_EFFECT_MAPPINGS.
 * Output: src/data/ruleset/defaultRuleset.ts
 *
 * Run: npx tsx scripts/build-ruleset.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { DOC_CLASSES } from "../src/data/parsed/SkillTreeContent";
import { ABILITY_EFFECT_MAPPINGS } from "../src/data/parsed/AbilityEffectMappings";
import type { EffectType } from "../src/data/AbilityData";
import type {
  Ruleset,
  RulesetClass,
  RulesetArchetype,
  RulesetAbilitySlot,
  RulesetAbilityDef,
  RulesetEffect,
  RulesetTargeting,
  RulesetAbilityCost,
} from "../src/data/ruleset/RulesetSchema";
import { getDefaultEffectParams, getTargetingParams } from "../src/data/ruleset/defaultEffectParams";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function abilityId(classId: string, archetypeId: string, abilityName: string): string {
  return `${classId}_${archetypeId}_${toId(abilityName)}`;
}

function slotId(tier: number, position: number): string {
  return `t${tier}_${position}`;
}

function isPassiveType(type: string): boolean {
  const lower = type.toLowerCase();
  return lower.includes("passive") || lower === "aura" || lower.includes("reactive");
}

function defaultCost(abilityType: string, tier: number): RulesetAbilityCost {
  if (isPassiveType(abilityType)) {
    return { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false };
  }
  const ap = tier <= 2 ? 2 : tier <= 3 ? 3 : 4;
  return {
    ap,
    stamina: 5,
    mana: 0,
    cooldown: 0,
    turnEnding: false,
  };
}

function buildAbilitiesAndSlots(
  docClasses: typeof DOC_CLASSES,
): { abilities: RulesetAbilityDef[]; classArchetypeSlots: Map<string, RulesetAbilitySlot[]> } {
  const abilities: RulesetAbilityDef[] = [];
  const classArchetypeSlots = new Map<string, RulesetAbilitySlot[]>();

  for (const docClass of docClasses) {
    for (let archIdx = 0; archIdx < docClass.archetypes.length; archIdx++) {
      const arch = docClass.archetypes[archIdx]!;
      const slots: RulesetAbilitySlot[] = [];
      const seenIds = new Set<string>();

      for (const docAbility of arch.abilities) {
        const id = abilityId(docClass.id, arch.id, docAbility.name);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const mapping = ABILITY_EFFECT_MAPPINGS[docAbility.name.toLowerCase()];
        let effects: RulesetEffect[];
        let targeting: RulesetTargeting;
        let notFullyImplemented = false;

        if (mapping) {
          const rawTargeting = mapping.targeting;
          targeting = {
            type: rawTargeting as RulesetTargeting["type"],
            params: getTargetingParams(rawTargeting),
          };
          effects = mapping.effects.map((effectType) => {
            const overrides = mapping.effectParamOverrides?.[effectType];
            const defaults = getDefaultEffectParams(effectType as EffectType, docAbility.tier);
            return {
              type: effectType as EffectType,
              params: { ...defaults, ...overrides },
            };
          });
        } else {
          notFullyImplemented = true;
          targeting = { type: "tgt_single_enemy", params: { range: 1 } };
          effects = [{ type: "dmg_weapon", params: { multiplier: 1 } }];
        }

        const cost = defaultCost(docAbility.type, docAbility.tier);

        const def: RulesetAbilityDef = {
          id,
          name: docAbility.name,
          type: docAbility.type as RulesetAbilityDef["type"],
          description: docAbility.description,
          targeting,
          effects,
          cost,
          notFullyImplemented: notFullyImplemented || undefined,
        };
        abilities.push(def);

        const prereqs: string[] =
          docAbility.tier > 1
            ? [slotId(docAbility.tier - 1, Math.min(docAbility.position, 2))]
            : [];
        slots.push({
          abilityId: id,
          tier: docAbility.tier as 1 | 2 | 3 | 4 | 5,
          position: docAbility.position,
          prerequisites: prereqs.length > 0 ? prereqs : undefined,
        });
      }

      classArchetypeSlots.set(`${docClass.id}:${arch.id}`, slots);
    }
  }

  return { abilities, classArchetypeSlots };
}

function buildRuleset(docClasses: typeof DOC_CLASSES): Ruleset {
  const { abilities, classArchetypeSlots } = buildAbilitiesAndSlots(docClasses);

  const abilityMap = new Map<string, RulesetAbilityDef>();
  for (const a of abilities) abilityMap.set(a.id, a);

  const classes: RulesetClass[] = docClasses.map((docClass) => ({
    id: docClass.id,
    name: docClass.name,
    subtitle: docClass.subtitle,
    fantasy: docClass.fantasy,
    archetypes: docClass.archetypes.map((arch) => {
      const slots = classArchetypeSlots.get(`${docClass.id}:${arch.id}`) ?? [];
      return {
        id: arch.id,
        name: arch.name,
        mechanic: arch.mechanic,
        identity: arch.identity,
        abilitySlots: slots,
      };
    }) as [RulesetArchetype, RulesetArchetype, RulesetArchetype],
  }));

  return {
    id: "default",
    name: "Skill Trees (default)",
    classes,
    abilities: Array.from(abilityMap.values()),
  };
}

// Run
const ruleset = buildRuleset(DOC_CLASSES);

// Serialize to TypeScript module (compact to avoid huge files)
const abilitiesJson = JSON.stringify(
  ruleset.abilities,
  null,
  0,
);
const classesJson = JSON.stringify(
  ruleset.classes,
  null,
  0,
);

const tsContent = `// AUTO-GENERATED by scripts/build-ruleset.ts — DO NOT EDIT
// Source: DOC_CLASSES + ABILITY_EFFECT_MAPPINGS

import type { Ruleset, RulesetClass, RulesetAbilityDef } from "./RulesetSchema";

export const defaultRulesetAbilities: RulesetAbilityDef[] = ${abilitiesJson};

export const defaultRulesetClasses: RulesetClass[] = ${classesJson};

export const defaultRuleset: Ruleset = {
  id: "default",
  name: "Skill Trees (default)",
  classes: defaultRulesetClasses,
  abilities: defaultRulesetAbilities,
};
`;

const outPath = path.resolve(__dirname, "../src/data/ruleset/defaultRuleset.ts");
fs.writeFileSync(outPath, tsContent, "utf-8");
console.log(`Wrote ${outPath}: ${ruleset.classes.length} classes, ${ruleset.abilities.length} abilities`);
