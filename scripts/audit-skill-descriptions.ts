/**
 * Audit every skill: compare design-doc description vs actual effect mapping.
 * Outputs a TSV file with mismatch scores.
 */
import { DOC_CLASSES } from "../src/data/parsed/SkillTreeContent";
import { ABILITY_EFFECT_MAPPINGS } from "../src/data/parsed/AbilityEffectMappings";


// ── Effect type to human-readable behavior ──
const EFFECT_BEHAVIOR: Record<string, string> = {
  dmg_weapon: "weapon damage",
  dmg_execute: "execute damage (bonus vs low HP)",
  dmg_multihit: "multi-hit damage",
  dmg_spell: "spell/magic damage",
  dmg_reflect: "reflect incoming damage",
  dot_bleed: "bleed DoT",
  dot_burn: "burn DoT",
  dot_poison: "poison DoT",
  disp_push: "push target",
  disp_teleport: "teleport",
  disp_dash: "dash/charge to target",
  disp_pull: "pull target toward you",
  cc_stun: "stun",
  cc_root: "root (immobilize)",
  cc_daze: "daze (AP reduction)",
  cc_fear: "fear (flee)",
  cc_silence: "silence (no abilities)",
  cc_taunt: "taunt (forced targeting)",
  cc_charm: "charm (switch sides)",
  debuff_stat: "stat debuff",
  debuff_vuln: "vulnerability (bonus damage taken)",
  debuff_armor: "armor reduction",
  debuff_healReduce: "healing reduction",
  buff_stat: "stat buff",
  buff_dmgReduce: "damage reduction",
  buff_stealth: "stealth/invisibility",
  buff_shield: "absorb shield",
  stance_counter: "counter-attack stance",
  stance_overwatch: "overwatch stance",
  res_apRefund: "AP refund",
  heal_pctDmg: "lifesteal (% of damage)",
  heal_flat: "flat heal",
  heal_hot: "heal over time",
  lifesteal: "lifesteal",
  summon_unit: "summon a unit",
  zone_persist: "persistent zone",
  trap_place: "place trap",
  channel_dmg: "channeled damage",
  transform_state: "transform (stat boost)",
  cleanse: "remove debuffs",
  cooldown_reset: "reset cooldowns",
};

interface AuditRow {
  class: string;
  archetype: string;
  skill: string;
  tier: number;
  type: string;
  docDescription: string;
  hasMapping: boolean;
  mappedEffects: string;
  mappedBehavior: string;
  score: number;
  issue: string;
}

const rows: AuditRow[] = [];

for (const cls of DOC_CLASSES) {
  for (const arch of cls.archetypes) {
    for (const skill of arch.abilities) {
      const key = skill.name.toLowerCase();
      const mapping = ABILITY_EFFECT_MAPPINGS[key];

      let hasMapping = !!mapping;
      let mappedEffects = "";
      let mappedBehavior = "";
      let score = 0;
      let issue = "";

      if (!mapping) {
        // No mapping — falls through to random theme generation
        score = 2;
        mappedEffects = "(none — theme fallback)";
        mappedBehavior = "Random theme-generated ability";
        issue = "NOT MAPPED: Gets random theme ability that won't match design doc at all";
      } else {
        mappedEffects = mapping.effects.join(", ");
        mappedBehavior = mapping.effects.map(e => EFFECT_BEHAVIOR[e] ?? e).join(" + ");

        // Score the mapping quality
        const desc = skill.description.toLowerCase();
        const effects = mapping.effects;
        const overrides = mapping.effectParamOverrides ?? {};

        // Check for specific mismatches
        const issues: string[] = [];

        // ── Damage reduction described but mapped to buff_stat ──
        if ((desc.includes("damage reduction") || desc.includes("damage taken") || desc.includes("% physical") || desc.includes("% damage red"))
            && !effects.includes("buff_dmgReduce") && effects.includes("buff_stat")) {
          issues.push("Describes damage reduction but mapped to buff_stat (wrong effect type)");
        }

        // ── Dodge/evasion described but mapped to generic buff_stat ──
        if ((desc.includes("evasion") || desc.includes("evade") || desc.includes("dodge"))
            && effects.includes("buff_stat")) {
          const statOverride = overrides["buff_stat"]?.stat;
          if (statOverride !== "dodge") {
            issues.push(`Describes evasion but buff_stat targets '${statOverride ?? "random"}' not 'dodge'`);
          }
        }

        // ── Heal described but not mapped ──
        if ((desc.includes("heal") || desc.includes("restore") || desc.includes("regenerat"))
            && !effects.some(e => e.startsWith("heal_") || e === "lifesteal")) {
          issues.push("Describes healing but no heal effect mapped");
        }

        // ── Stun described but not mapped ──
        if (desc.includes("stun") && !effects.includes("cc_stun")) {
          issues.push("Describes stun but cc_stun not mapped");
        }

        // ── Root/immobilize described but not mapped ──
        if ((desc.includes("root") || desc.includes("immobil")) && !effects.includes("cc_root") && !effects.includes("debuff_stat")) {
          issues.push("Describes root/immobilize but cc_root not mapped");
        }

        // ── Summon described but not mapped ──
        if ((desc.includes("summon") || desc.includes("spawn") || desc.includes("construct") || desc.includes("minion"))
            && !effects.includes("summon_unit") && skill.type.toLowerCase() === "summon") {
          issues.push("Skill type is Summon but no summon_unit effect");
        }

        // ── Self-damage / HP cost described but not implemented ──
        if ((desc.includes("costs hp") || desc.includes("spend hp") || desc.includes("lose hp") || desc.includes("% hp cost")
            || desc.includes("at the cost of") || desc.includes("sacrifice"))) {
          issues.push("Describes HP self-cost but hpCost not implemented");
        }

        // ── Resource system (Ki, Combo, Resonance, Soul Essence) ──
        if (desc.includes("combo") || desc.includes("rhythm") || desc.includes("resonance") || desc.includes("soul essence") || desc.includes("ki ")) {
          issues.push("References custom resource system (not yet implemented)");
        }

        // ── Conditional/passive with custom triggers ──
        if ((desc.includes("on kill") || desc.includes("on hit") || desc.includes("when you") || desc.includes("after"))
            && skill.type.toLowerCase() === "passive" && !mapping) {
          issues.push("Complex passive trigger not representable as simple effect");
        }

        // ── Action rate / haste / speed (no equivalent) ──
        if (desc.includes("action rate") || desc.includes("haste") || desc.includes("speed")) {
          if (effects.includes("buff_stat") && overrides["buff_stat"]?.stat === "initiative") {
            issues.push("Haste/action rate approximated as initiative buff (imprecise)");
          }
        }

        // ── DoT tick speed manipulation ──
        if (desc.includes("dots tick") || desc.includes("dot tick") || desc.includes("tick faster")) {
          issues.push("DoT tick speed manipulation not implemented");
        }

        // ── Stacks (most stacking mechanics not implemented) ──
        if (desc.includes("stacks") || desc.includes("per stack") || desc.includes("stack")) {
          issues.push("Stacking mechanic referenced but not implemented in executor");
        }

        // ── AoE spread / chain ──
        if (desc.includes("spread") || desc.includes("chain to") || desc.includes("bounces")) {
          issues.push("Spread/chain mechanic not implemented");
        }

        // ── Per-DoT / per-debuff scaling ──
        if (desc.includes("per dot") || desc.includes("per debuff") || desc.includes("per curse") || desc.includes("per hex")) {
          issues.push("Per-stack/per-debuff scaling not implemented");
        }

        // ── Cooldown manipulation ──
        if (desc.includes("cooldown") && !effects.includes("cooldown_reset") && !desc.includes("turns cooldown")) {
          issues.push("Cooldown manipulation described but not mapped");
        }

        // ── Zero-value overrides that need custom system ──
        for (const [effectType, params] of Object.entries(overrides)) {
          for (const [paramKey, paramVal] of Object.entries(params)) {
            if (paramVal === 0 && paramKey !== "dmgPerTurn") {
              issues.push(`Override ${effectType}.${paramKey}=0 → needs custom system`);
            }
            if (paramVal === -1) {
              issues.push(`Override ${effectType}.${paramKey}=-1 (infinite duration) → needs custom handling`);
            }
          }
        }

        // ── Compute score ──
        if (issues.length === 0) {
          // Check if the mapping feels right
          const hasWeaponDmg = effects.includes("dmg_weapon") || effects.includes("dmg_spell") || effects.includes("dmg_execute") || effects.includes("dmg_multihit");
          const descHasDmg = desc.includes("damage") || desc.includes("strike") || desc.includes("attack") || desc.includes("hit") || desc.includes("bolt");

          if (skill.type.toLowerCase() === "passive" && !hasMapping) {
            score = 2;
          } else if (hasWeaponDmg && descHasDmg) {
            score = 9;
          } else if (!hasWeaponDmg && !descHasDmg) {
            score = 8;
          } else {
            score = 7;
          }
          issue = "OK";
        } else {
          // Score based on severity
          const hasCritical = issues.some(i =>
            i.includes("wrong effect type") ||
            i.includes("not implemented") ||
            i.includes("needs custom system") ||
            i.includes("infinite duration"));
          const hasMedium = issues.some(i =>
            i.includes("imprecise") ||
            i.includes("not mapped") ||
            i.includes("referenced but"));

          if (hasCritical && issues.length >= 2) score = 2;
          else if (hasCritical) score = 3;
          else if (hasMedium && issues.length >= 2) score = 4;
          else if (hasMedium) score = 5;
          else score = 6;

          issue = issues.join("; ");
        }
      }

      rows.push({
        class: cls.name,
        archetype: arch.name,
        skill: skill.name,
        tier: skill.tier,
        type: skill.type,
        docDescription: skill.description,
        hasMapping,
        mappedEffects,
        mappedBehavior,
        score,
        issue,
      });
    }
  }
}

// Sort by score ascending (worst first)
rows.sort((a, b) => a.score - b.score || a.class.localeCompare(b.class));

// Output
const header = "Score\tClass\tArchetype\tSkill\tTier\tType\tDesign Doc Description\tMapped?\tMapped Effects\tMapped Behavior\tIssue";
const lines = rows.map(r =>
  `${r.score}/10\t${r.class}\t${r.archetype}\t${r.skill}\tT${r.tier}\t${r.type}\t${r.docDescription}\t${r.hasMapping ? "YES" : "NO"}\t${r.mappedEffects}\t${r.mappedBehavior}\t${r.issue}`
);

const output = [header, ...lines].join("\n");

// Write to file
import { writeFileSync } from "fs";
writeFileSync("audit-skill-descriptions.tsv", output);

// Print summary
const total = rows.length;
const unmapped = rows.filter(r => !r.hasMapping).length;
const critical = rows.filter(r => r.score <= 3).length;
const warning = rows.filter(r => r.score >= 4 && r.score <= 6).length;
const ok = rows.filter(r => r.score >= 7).length;

console.log(`\n=== SKILL DESCRIPTION AUDIT ===`);
console.log(`Total skills:    ${total}`);
console.log(`Unmapped:        ${unmapped} (random theme fallback)`);
console.log(`Critical (1-3):  ${critical}`);
console.log(`Warning (4-6):   ${warning}`);
console.log(`OK (7-10):       ${ok}`);
console.log(`\nOutput: audit-skill-descriptions.tsv`);

// Print worst offenders
console.log(`\n--- WORST MISMATCHES (score ≤ 3) ---`);
for (const r of rows.filter(r => r.score <= 3).slice(0, 30)) {
  console.log(`[${r.score}/10] ${r.class} > ${r.archetype} > ${r.skill} (T${r.tier} ${r.type})`);
  console.log(`  Doc: "${r.docDescription}"`);
  console.log(`  Got: ${r.mappedBehavior}`);
  console.log(`  Fix: ${r.issue}`);
}
