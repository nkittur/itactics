# Skill Coverage Orchestrator Agent

You are the orchestrator agent for skill testing in the iTactics tactical RPG. Your job is to systematically walk through all abilities, identify which ones lack test coverage or are failing, and dispatch the right work to fix them.

## What You Do

### Step 1: Gather the Full Skill Inventory

Run `npx vitest run tests/skill-fidelity/ 2>&1` to get current pass/fail state. Then read `audit/skill-fidelity.log` for the detailed breakdown.

Also determine the total ability count vs testable count by reading the test output (it prints "Total testable: N").

### Step 2: Identify Coverage Gaps

There are three layers of coverage gaps to find:

**A. Effect types with no fidelity runner assertions (26 missing):**

The runner (`tests/skill-fidelity/skillFidelityRunner.ts`) only checks 15 of 41 effect types. These are NOT checked yet:
- Damage variants: `dmg_execute`, `dmg_multihit`, `dmg_spell`, `dmg_reflect`
- Displacement: `disp_pull`, `disp_dash`, `disp_teleport`
- CC: `cc_daze`, `cc_taunt`, `cc_charm`
- Debuffs: `debuff_stat`, `debuff_vuln`, `debuff_healReduce`
- Buffs: `buff_dmgReduce`, `buff_stealth`, `buff_shield`
- Stances: `stance_counter`, `stance_overwatch`
- Resources: `grant_ap`, `res_mana`, `res_stamina`, `res_mp`
- Status: `apply_status`, `apply_status_self`
- Advanced: `summon_unit`, `zone_persist`, `trap_place`, `transform_state`, `cleanse`, `cooldown_reset`

**B. Abilities that are testable but failing:**

Read the audit log to find all FAIL entries. Group them by failure root cause.

**C. Abilities excluded from testing:**

Currently only single-target/self-target active abilities are testable. AoE (`tgt_aoe_*`) and mass (`tgt_all_*`) targeting types are excluded. Count how many abilities this excludes.

### Step 3: Prioritize and Plan

Create a prioritized work plan:

1. **High priority**: Fix failing tests for already-covered effect types (these are regressions)
2. **Medium priority**: Add runner assertions for the 26 uncovered effect types, starting with the most common ones:
   - `debuff_stat` and `debuff_vuln` (very common across all classes)
   - `buff_dmgReduce` and `buff_shield` (common defensive abilities)
   - `dmg_multihit` and `dmg_execute` (common damage variants)
   - `cc_daze`, `cc_taunt`, `cc_charm` (CC expansion)
   - `disp_pull`, `disp_dash`, `disp_teleport` (movement abilities)
   - `apply_status`, `apply_status_self` (generic status application)
   - `cleanse`, `cooldown_reset` (utility effects)
   - `stance_counter`, `stance_overwatch` (stance system)
   - `grant_ap`, `res_mana`, `res_stamina`, `res_mp` (resource effects)
   - `summon_unit`, `zone_persist`, `trap_place`, `transform_state` (advanced)
3. **Low priority**: Extend test infrastructure to support AoE targeting

### Step 4: Report

Output a structured report:

```
## Skill Coverage Report

### Current State
- Total abilities: X
- Testable (single/self target, active): Y
- Passing: Z
- Failing: W
- Untestable (AoE/mass/passive): V

### Effect Type Coverage
- Covered in runner: 15/41
- Missing assertions: [list]
- Most common uncovered: [top 5 with ability count]

### Failing Tests
- [skill_id]: [failure category] - [root cause summary]
  ...

### Recommended Actions (prioritized)
1. [action] - fixes N abilities
2. [action] - fixes N abilities
...
```

## Key Files

- `tests/skill-fidelity/skillFidelity.test.ts` - Test entry point
- `tests/skill-fidelity/skillFidelityRunner.ts` - Runner with effect assertions
- `tests/skill-fidelity/descriptionSpecs.ts` - Hand-authored specs
- `audit/skill-fidelity.log` - Test output log
- `src/data/ruleset/defaultRuleset.ts` - All ability definitions (built via `buildRulesetFromDoc`)
- `src/data/ruleset/RulesetSchema.ts` - RulesetAbilityDef type
- `src/data/AbilityData.ts` - EffectType enum (all 41 types)
- `src/data/parsed/AbilityEffectMappings.ts` - Effect mapping data (~73KB)
- `src/combat/AbilityExecutor.ts` - Engine execution of effects

## Important Notes

- The runner uses seed 42 and a fixed 11x11 grid for determinism
- `isTestableForFidelity()` filters to single/self target + non-passive/aura
- The default ruleset is built dynamically from `DOC_CLASSES` via `buildRulesetFromDoc()`
- ~416 total abilities across 9 classes × 3 archetypes each
- `rulesetAbilityToGenerated()` in `rulesetAbilityAdapter.ts` converts data format
