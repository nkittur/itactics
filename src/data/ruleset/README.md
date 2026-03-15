# Ruleset schema

A **ruleset** is the data that defines one universe: which classes exist and which abilities they have. The combat engine is shared; only the data (classes, abilities) changes per ruleset.

## Schema

- **Ruleset** — `id`, optional `name`, `classes[]`, `abilities[]`.
- **RulesetClass** — `id`, `name`, `subtitle`, `fantasy`, `archetypes` (exactly 3).
- **RulesetArchetype** — `id`, `name`, `mechanic`, `identity`, `abilitySlots[]`.
- **RulesetAbilitySlot** — `abilityId`, `tier` (1–5), `position`, optional `prerequisites[]` (node ids).
- **RulesetAbilityDef** — `id`, `name`, `type`, `description`, `targeting`, `effects[]`, `cost`, optional `notFullyImplemented`, optional `weaponReq[]`.
- **RulesetEffect** — `type` (engine EffectType), `params` (key-value).
- **RulesetTargeting** — `type` (e.g. tgt_single_enemy, tgt_self), `params` (e.g. range).
- **RulesetAbilityCost** — `ap`, `stamina`, `mana`, `cooldown`, `turnEnding`, optional `hpCost`.

## Effect types (engine)

Effect `type` must be one of the engine’s EffectTypes (see AbilityData.ts):  
dmg_weapon, dmg_execute, dmg_multihit, dmg_spell, dmg_reflect, dot_bleed, dot_burn, dot_poison, disp_push, disp_teleport, disp_dash, disp_pull, cc_stun, cc_root, cc_daze, cc_fear, cc_silence, cc_taunt, cc_charm, debuff_stat, debuff_vuln, debuff_armor, debuff_healReduce, buff_stat, buff_dmgReduce, buff_stealth, buff_shield, stance_counter, stance_overwatch, res_apRefund, heal_pctDmg, heal_flat, heal_hot, lifesteal, summon_unit, zone_persist, trap_place, channel_dmg, transform_state, cleanse, cooldown_reset.

Abilities that need mechanics not yet implemented can set `notFullyImplemented: true` and provide the closest supported effects (or a no-op); the engine will run what it supports.

## File layout (optional)

Rulesets can be loaded from:

- **JSON**: `data/rulesets/<rulesetId>/classes.json`, `abilities.json`, and optional `ruleset.json` (id, name).
- **TypeScript**: A module that exports a `Ruleset` object (e.g. default ruleset baked in from parsed skill_trees).

The loader (RulesetLoader) resolves class by id, ability by id, and “archetype slot → ability def” for trees.
