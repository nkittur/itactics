import type { EffectType, TargetingType } from "../AbilityData";

export interface AbilityEffectMapping {
  effects: EffectType[];
  targeting: TargetingType;
  conditions: { creates: string[]; exploits: string[] };
  effectParamOverrides?: Record<string, Record<string, number | string>>;
}

/** LLM-mapped effect mappings keyed by ability name (lowercase). */
export const ABILITY_EFFECT_MAPPINGS: Record<string, AbilityEffectMapping> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // Chronoweaver — Accelerant
  // ═══════════════════════════════════════════════════════════════════════════

  "quicken": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["haste"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "blink step": {
    effects: ["disp_teleport"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { disp_teleport: { range: 4 } },
  },

  "shared haste": {
    effects: ["buff_stat"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["haste"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "flicker strike": {
    effects: ["disp_teleport", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { disp_teleport: { range: 6 } },
  },

  "overclock": {
    effects: ["buff_stat", "cc_stun"],
    targeting: "tgt_self",
    conditions: { creates: ["haste", "stun_self"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "temporal surge": {
    effects: ["buff_stat"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["haste"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "infinite loop": {
    effects: ["transform_state"],
    targeting: "tgt_self",
    conditions: { creates: ["infinite_loop"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 2, bonusPct: 100 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Chronoweaver — Entropy
  // ═══════════════════════════════════════════════════════════════════════════

  "rust touch": {
    effects: ["dmg_weapon", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["corrode"], exploits: [] },
    effectParamOverrides: { debuff_armor: { pct: 5, turns: 2 } },
  },

  "wither bolt": {
    effects: ["dmg_spell", "dot_poison"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["decay"], exploits: [] },
  },

  "sap vitality": {
    effects: ["debuff_healReduce"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["heal_reduction"], exploits: [] },
    effectParamOverrides: { debuff_healReduce: { pct: 30, turns: 3 } },
  },

  "dust to dust": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  },

  "entropic field": {
    effects: ["zone_persist"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["decay"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 3, turns: 2, dmgPerTurn: 0 } },
  },

  "crumble": {
    effects: ["debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_break"], exploits: [] },
    effectParamOverrides: { debuff_armor: { pct: 50, turns: 1 } },
  },

  "pandemic": {
    effects: ["dot_poison"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  },

  "heat death": {
    effects: ["channel_dmg", "dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["heat_death_mark"], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 3 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Chronoweaver — Paradox
  // ═══════════════════════════════════════════════════════════════════════════

  "rewind": {
    effects: ["heal_flat", "disp_teleport"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 0 }, disp_teleport: { range: 99 } },
  },

  "deja vu": {
    effects: ["cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["deja_vu"], exploits: [] },
  },

  "stutter": {
    effects: ["cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["stun"], exploits: [] },
  },

  "causal loop": {
    effects: ["dmg_reflect"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["causal_loop"], exploits: [] },
    effectParamOverrides: { dmg_reflect: { pct: 100, turns: 2 } },
  },

  "echo cast": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
  },

  "time bomb": {
    effects: ["zone_persist", "dmg_spell"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["time_bomb_marker"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 } },
  },

  "fork reality": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["clone"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 } },
  },

  "grandfather": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" } },
  },

  "closed timelike": {
    effects: ["heal_flat", "transform_state"],
    targeting: "tgt_self",
    conditions: { creates: ["time_rewind"], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 0 }, transform_state: { turns: 1, bonusPct: 0 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ironbloom Warden — Thornwall
  // ═══════════════════════════════════════════════════════════════════════════

  "barkskin": {
    effects: ["buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["barkskin"], exploits: [] },
  },

  "root stance": {
    effects: ["buff_dmgReduce", "debuff_stat", "cc_taunt"],
    targeting: "tgt_self",
    conditions: { creates: ["rooted_stance"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, cc_taunt: { turns: 2 } },
  },

  "splinter burst": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["barkskin"] },
  },

  "entangling wall": {
    effects: ["zone_persist", "debuff_stat"],
    targeting: "tgt_aoe_line",
    conditions: { creates: ["thorn_wall"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 1, turns: 3, dmgPerTurn: 0 }, debuff_stat: { stat: "movementPoints" } },
  },

  "world tree": {
    effects: ["buff_dmgReduce", "dmg_reflect", "transform_state"],
    targeting: "tgt_self",
    conditions: { creates: ["world_tree", "rooted_stance"], exploits: [] },
    effectParamOverrides: { dmg_reflect: { pct: 100, turns: 3 }, transform_state: { turns: 3, bonusPct: 80 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ironbloom Warden — Overgrowth
  // ═══════════════════════════════════════════════════════════════════════════

  "rejuvenate": {
    effects: ["heal_hot"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["rejuvenate_hot"], exploits: [] },
    effectParamOverrides: { heal_hot: { healPerTurn: 0, turns: 3 } },
  },

  "seedling": {
    effects: ["summon_unit", "heal_hot"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["seedling"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 }, heal_hot: { healPerTurn: 0, turns: 3 } },
  },

  "overgrowth": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["seedling"] },
  },

  "verdant tide": {
    effects: ["heal_hot"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["verdant_tide_hot"], exploits: [] },
    effectParamOverrides: { heal_hot: { healPerTurn: 0, turns: 3 } },
  },

  "bloom cascade": {
    effects: ["heal_flat"],
    targeting: "tgt_all_allies",
    conditions: { creates: [], exploits: ["seedling"] },
    effectParamOverrides: { heal_flat: { amount: 0 } },
  },

  "gaia's embrace": {
    effects: ["heal_hot", "debuff_stat", "summon_unit", "zone_persist"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["gaia_embrace", "seedling"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, summon_unit: { hp: 0, turns: 4, count: 1 }, zone_persist: { radius: 99, turns: 4, dmgPerTurn: 0 }, heal_hot: { healPerTurn: 0, turns: 4 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ironbloom Warden — Rot Herald
  // ═══════════════════════════════════════════════════════════════════════════

  "spore shot": {
    effects: ["dmg_weapon", "dot_poison"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["poison"], exploits: [] },
  },

  "fungal growth": {
    effects: ["summon_unit", "zone_persist"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["fungal_node"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: 0, count: 1 }, zone_persist: { radius: 2, turns: 0, dmgPerTurn: 0 } },
  },

  "decompose": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["dot_poison"] },
  },

  "plague garden": {
    effects: ["zone_persist", "debuff_healReduce", "summon_unit"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["fungal_node", "plague_zone", "heal_reduction"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 2, turns: 0, dmgPerTurn: 0 }, debuff_healReduce: { pct: 40, turns: 0 }, summon_unit: { hp: 0, turns: 0, count: 3 } },
  },

  "parasitic vine": {
    effects: ["channel_dmg", "lifesteal"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["parasitic_vine"], exploits: [] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 2 }, lifesteal: { pct: 100 } },
  },

  "cordyceps": {
    effects: ["debuff_stat", "summon_unit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["cordyceps_infection"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" }, summon_unit: { hp: 0, turns: 4, count: 1 } },
  },

  "the spreading": {
    effects: ["dmg_execute", "dot_poison"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["spreading_infection"], exploits: [] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Echo Dancer — Resonance
  // ═══════════════════════════════════════════════════════════════════════════

  "tuning strike": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["resonance"], exploits: [] },
  },

  "shatter point": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["resonance"] },
  },

  "crystal freq": {
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["crystal_freq"], exploits: ["resonance"] },
  },

  "sonic boom": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["resonance"], exploits: ["resonance"] },
  },

  "requiem": {
    effects: ["channel_dmg", "dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["requiem_mark"], exploits: [] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 3 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Echo Dancer — Silence
  // ═══════════════════════════════════════════════════════════════════════════

  "muffle": {
    effects: ["cc_silence"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["silence"], exploits: [] },
    effectParamOverrides: { cc_silence: { turns: 1 } },
  },

  "sound eater": {
    effects: ["buff_stealth"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth"], exploits: [] },
    effectParamOverrides: { buff_stealth: { turns: 2, breakOnAttack: 1 } },
  },

  "dead air": {
    effects: ["zone_persist", "cc_silence"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["silence_zone"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 }, cc_silence: { turns: 2 } },
  },

  "ambush": {
    effects: ["dmg_weapon", "cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["stun"], exploits: ["stealth"] },
  },

  "void frequency": {
    effects: ["cc_silence"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["cooldown_freeze"], exploits: [] },
    effectParamOverrides: { cc_silence: { turns: 2 } },
  },

  "ghost note": {
    effects: ["buff_stealth", "summon_unit", "cc_taunt"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth", "decoy"], exploits: [] },
    effectParamOverrides: { buff_stealth: { turns: 2, breakOnAttack: 1 }, summon_unit: { hp: 0, turns: 2, count: 1 }, cc_taunt: { turns: 2 } },
  },

  "total silence": {
    effects: ["cc_silence", "buff_stealth"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["silence", "stealth"], exploits: [] },
    effectParamOverrides: { cc_silence: { turns: 2 }, buff_stealth: { turns: 2, breakOnAttack: 1 } },
  },

  "the unheard": {
    effects: ["buff_stealth", "transform_state"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth", "untargetable"], exploits: [] },
    effectParamOverrides: { buff_stealth: { turns: 4, breakOnAttack: 0 }, transform_state: { turns: 4, bonusPct: 50 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Echo Dancer — Cacophony
  // ═══════════════════════════════════════════════════════════════════════════

  "screech": {
    effects: ["dmg_spell", "debuff_stat"],
    targeting: "tgt_aoe_cone",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "bass drop": {
    effects: ["dmg_spell", "disp_push"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: [], exploits: [] },
  },

  "tinnitus": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "wall of sound": {
    effects: ["zone_persist", "cc_stun"],
    targeting: "tgt_aoe_line",
    conditions: { creates: ["sound_wall"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 1, turns: 0, dmgPerTurn: 0 } },
  },

  "shockwave": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_line",
    conditions: { creates: [], exploits: [] },
  },

  "noise complaint": {
    effects: ["debuff_stat", "cc_charm"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" }, cc_charm: { turns: 2, chance: 30 } },
  },

  "brown note": {
    effects: ["cc_fear", "dot_burn"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["fear"], exploits: [] },
    effectParamOverrides: { cc_fear: { chance: 100, turns: 2 } },
  },

  "symphony of destruction": {
    effects: ["zone_persist", "debuff_stat", "buff_stat"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["disoriented", "symphony_zone"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 3, turns: 3, dmgPerTurn: 0 }, debuff_stat: { stat: "meleeSkill" }, buff_stat: { stat: "meleeSkill" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Bladesinger — Sword Dance
  // ═══════════════════════════════════════════════════════════════════════════

  "opening step": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rhythm"], exploits: [] },
  },

  "flowing cut": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rhythm"], exploits: ["rhythm"] },
  },

  "pivot slash": {
    effects: ["dmg_weapon"],
    targeting: "tgt_aoe_cone",
    conditions: { creates: ["rhythm"], exploits: [] },
  },

  "whirlwind step": {
    effects: ["disp_dash", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rhythm"], exploits: [] },
    effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 0 } },
  },

  "rising flourish": {
    effects: ["dmg_weapon", "cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rhythm", "airborne"], exploits: [] },
  },

  "crescendo strike": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["rhythm"] },
  },

  "blade waltz": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["blade_waltz"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "dervish protocol": {
    effects: ["dmg_weapon", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["dervish_protocol"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },

  "the endless dance": {
    effects: ["transform_state", "dmg_multihit"],
    targeting: "tgt_self",
    conditions: { creates: ["eternal_rhythm"], exploits: ["rhythm"] },
    effectParamOverrides: { transform_state: { turns: 4, bonusPct: 0 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Bladesinger — Spell Weave
  // ═══════════════════════════════════════════════════════════════════════════

  "arcane edge": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["blade_charge"], exploits: [] },
  },

  "spark slash": {
    effects: ["dmg_weapon", "dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["blade_charge"] },
  },

  "force bolt slash": {
    effects: ["dmg_spell", "disp_dash", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["blade_charge"], exploits: [] },
    effectParamOverrides: { disp_dash: { range: 4, damageOnArrival: 0 } },
  },

  "runic barrage": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["weave_resonance"], exploits: [] },
  },

  "phase cut": {
    effects: ["disp_teleport", "dmg_weapon", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["weave_resonance"] },
    effectParamOverrides: { disp_teleport: { range: 1 }, debuff_armor: { pct: 100, turns: 1 } },
  },

  "resonance overflow": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_line",
    conditions: { creates: [], exploits: ["weave_resonance"] },
  },

  "grand synthesis": {
    effects: ["dmg_weapon", "dmg_spell"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: ["weave_resonance"] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Bladesinger — War Chant
  // ═══════════════════════════════════════════════════════════════════════════

  "counterpoint": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["counterpoint"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "harmonic chorus": {
    effects: ["buff_stat"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["harmonic_chorus"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "discordant note": {
    effects: ["cc_silence"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["interrupt"], exploits: [] },
    effectParamOverrides: { cc_silence: { turns: 1 } },
  },

  "symphony of war": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["symphony_of_war"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "the eternal war song": {
    effects: ["buff_stat", "buff_dmgReduce", "transform_state"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["eternal_war_song"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" }, transform_state: { turns: 0, bonusPct: 0 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Blood Alchemist — Sacrifice
  // ═══════════════════════════════════════════════════════════════════════════

  "crimson bolt": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "hemorrhage wave": {
    effects: ["dmg_spell", "dot_bleed"],
    targeting: "tgt_aoe_cone",
    conditions: { creates: ["bleed"], exploits: [] },
  },

  "vital surge": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "critChance" } },
  },

  "sanguine pact": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "blood nova": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: [] },
  },

  "exsanguinate": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
  },

  "the final offering": {
    effects: ["dmg_spell", "heal_pctDmg"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: [] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Blood Alchemist — Hemomancy
  // ═══════════════════════════════════════════════════════════════════════════

  "clot": {
    effects: ["debuff_stat", "debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["clot"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  "hemorrhage": {
    effects: ["dot_bleed"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["bleed"], exploits: [] },
  },

  "blood lock": {
    effects: ["cc_root", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["root", "vulnerable"], exploits: [] },
  },

  "puppet string": {
    effects: ["disp_pull", "dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { disp_pull: { distance: 2 } },
  },

  "boil": {
    effects: ["dot_burn", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["burn"], exploits: [] },
    effectParamOverrides: { debuff_armor: { pct: 10, turns: 3 } },
  },

  "full puppet": {
    effects: ["cc_charm"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["controlled"], exploits: [] },
    effectParamOverrides: { cc_charm: { turns: 2, chance: 100 } },
  },

  "hemorrhagic burst": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["bleed"] },
  },

  "blood tether": {
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["tethered"], exploits: [] },
  },

  "vascular override": {
    effects: ["dot_bleed"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["bleed"], exploits: [] },
  },

  "sanguine dominion": {
    effects: ["debuff_stat", "debuff_stat", "cc_charm"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["controlled"], exploits: ["bleed"] },
    effectParamOverrides: {
      debuff_stat: { stat: "movementPoints" },
      cc_charm: { turns: 5, chance: 100 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Blood Alchemist — Transfusion
  // ═══════════════════════════════════════════════════════════════════════════

  "life draw": {
    effects: ["dmg_spell", "heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "clot seal": {
    effects: ["heal_flat"],
    targeting: "tgt_single_ally",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 5 } },
  },

  "sanguine transfusion": {
    effects: ["heal_flat"],
    targeting: "tgt_single_ally",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 25 } },
  },

  "hemorrhage harvest": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["bleed"] },
  },

  "vital lattice": {
    effects: ["buff_dmgReduce"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["lattice"], exploits: [] },
  },

  "soul leak": {
    effects: ["dmg_spell", "heal_pctDmg"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: [], exploits: [] },
  },

  "mass transfusion": {
    effects: ["heal_flat"],
    targeting: "tgt_all_allies",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 10 } },
  },

  "the eternal circuit": {
    effects: ["buff_dmgReduce", "heal_pctDmg", "dmg_reflect"],
    targeting: "tgt_all_allies",
    conditions: { creates: ["circuit"], exploits: [] },
    effectParamOverrides: { dmg_reflect: { pct: 100, turns: 6 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hexblade — Hungering Blade
  // ═══════════════════════════════════════════════════════════════════════════

  "hungry strike": {
    effects: ["dmg_weapon", "heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "drain strike": {
    effects: ["dmg_weapon", "heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "blade hunger": {
    effects: ["buff_stat", "lifesteal"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { lifesteal: { pct: 200 } },
  },

  "soul drink": {
    effects: ["dmg_weapon", "heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "hunger madness": {
    effects: ["dmg_multihit", "heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "feast mode": {
    effects: ["lifesteal"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { lifesteal: { pct: 100 } },
  },

  "the infinite hunger": {
    effects: ["buff_stat", "lifesteal", "dmg_weapon", "transform_state"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: {
      buff_stat: { stat: "meleeSkill" },
      lifesteal: { pct: 100 },
      transform_state: { turns: 4, bonusPct: 300 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hexblade — Curse Mark
  // ═══════════════════════════════════════════════════════════════════════════

  "hex: weakness": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_weakness"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "hex: slowmark": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_slowmark"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  "hex: vulnerability": {
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_vulnerability"], exploits: [] },
  },

  "hex: misfortune": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_misfortune"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "hex: ruin": {
    effects: ["debuff_stat", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_ruin"], exploits: [] },
  },

  "hex: unraveling": {
    effects: ["dot_poison"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_unraveling"], exploits: [] },
  },

  "curse explosion": {
    effects: ["dmg_spell", "cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["hex_weakness", "hex_slowmark", "hex_vulnerability", "hex_misfortune", "hex_ruin", "hex_unraveling"] },
  },

  "grand hex": {
    effects: ["dmg_spell", "debuff_stat", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_weakness", "hex_slowmark", "hex_vulnerability"], exploits: [] },
  },

  "absolute curse": {
    effects: ["debuff_stat", "debuff_vuln", "dot_poison", "cc_daze"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["hex_weakness", "hex_slowmark", "hex_vulnerability", "hex_misfortune", "hex_ruin", "hex_unraveling"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hexblade — Spectral Arsenal
  // ═══════════════════════════════════════════════════════════════════════════

  "spectral blade": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_blade"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
  },

  "phantom strike": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "arsenal expansion": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_blade"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 2 } },
  },

  "shield formation": {
    effects: ["buff_shield"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["spectral_blade"] },
    effectParamOverrides: { buff_shield: { amount: 3, turns: 2 } },
  },

  "spectral surge": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "ghost lance": {
    effects: ["dmg_spell", "summon_unit"],
    targeting: "tgt_aoe_line",
    conditions: { creates: ["spectral_lance"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
  },

  "haunted volley": {
    effects: ["dmg_multihit"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "blade tornado": {
    effects: ["zone_persist", "buff_dmgReduce"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: [], exploits: ["spectral_blade"] },
    effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 } },
  },

  "spectral clone": {
    effects: ["summon_unit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["spectral_clone"], exploits: ["spectral_blade"] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 } },
  },

  "the ghost armory": {
    effects: ["summon_unit", "dmg_spell", "transform_state"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["spectral_blade", "spectral_greatsword"], exploits: [] },
    effectParamOverrides: {
      summon_unit: { hp: 0, turns: 4, count: 10 },
      transform_state: { turns: 4, bonusPct: 300 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Necrosurgeon — Reanimator
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: Harvest Limb and Mass Harvest have empty effects and are skipped.

  "crude assembly": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
  },

  "specialist graft": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["harvested_part", "construct"] },
    effectParamOverrides: { buff_stat: { stat: "rangedSkill" } },
  },

  "head transplant": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["harvested_part", "construct"] },
  },

  "composite horror": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
  },

  "surgical upgrade": {
    effects: ["heal_flat", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["construct"] },
    effectParamOverrides: { heal_flat: { amount: 50 } },
  },

  "optimal configuration": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["construct", "harvested_part"] },
  },

  "masterwork abomination": {
    effects: ["summon_unit", "dmg_multihit"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Necrosurgeon — Fleshcraft
  // ═══════════════════════════════════════════════════════════════════════════

  "auxiliary limb": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["graft_limb"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "venom gland": {
    effects: ["dot_poison"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["poison", "graft_venom"], exploits: [] },
  },

  "full conversion": {
    effects: ["transform_state", "buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["undead_form"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 6, bonusPct: 0 } },
  },

  "the masterwork self": {
    effects: ["transform_state", "buff_dmgReduce", "heal_hot"],
    targeting: "tgt_self",
    conditions: { creates: ["flesh_construct_form"], exploits: [] },
    effectParamOverrides: {
      transform_state: { turns: -1, bonusPct: 0 },
      heal_hot: { healPerTurn: 2, turns: -1 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Necrosurgeon — Soul Harvest
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: Soul Snare has empty effects and is skipped.

  "essence bolt": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["soul_essence"] },
  },

  "spectral shell": {
    effects: ["buff_shield"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_shell"], exploits: ["soul_essence"] },
    effectParamOverrides: { buff_shield: { amount: 1, turns: -1 } },
  },

  "soul tap": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["soul_essence"], exploits: [] },
  },

  "essence infusion": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["soul_essence", "construct"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "soul detonation": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: ["soul_essence"] },
  },

  "spectral minion": {
    effects: ["summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_minion"], exploits: ["soul_essence"] },
    effectParamOverrides: { summon_unit: { hp: 0, turns: 6, count: 1 } },
  },

  "soul forge": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["soul_weapon"], exploits: ["soul_essence", "construct"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "soulstorm engine": {
    effects: ["dmg_multihit", "zone_persist"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: ["soul_essence"] },
    effectParamOverrides: { zone_persist: { radius: 3, turns: 3, dmgPerTurn: 0 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Berserker — Blood Fury
  // ═══════════════════════════════════════════════════════════════════════════

  "wound pride": {
    effects: ["dot_bleed", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["bleed", "frenzy"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "berserker's bargain": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["damage_buff"], exploits: ["low_hp"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "crimson surge": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["low_hp"] },
  },

  "martyr's blade": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["low_hp"] },
  },

  "hemorrhagic frenzy": {
    effects: ["dot_bleed", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["bleed", "hemorrhage_stacks"], exploits: ["low_hp", "bleed"] },
  },

  "crimson god": {
    effects: ["transform_state", "dmg_weapon", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["blood_fury_form", "blood_nova_on_kill"], exploits: ["low_hp"] },
    effectParamOverrides: { transform_state: { turns: 12, bonusPct: 100 }, buff_stat: { stat: "meleeSkill" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Berserker — Warpath
  // ═══════════════════════════════════════════════════════════════════════════

  "bull rush": {
    effects: ["disp_dash", "disp_push"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["displaced"], exploits: [] },
    effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 100 } },
  },

  "cleave": {
    effects: ["dmg_weapon"],
    targeting: "tgt_aoe_cone",
    conditions: { creates: [], exploits: [] },
  },

  "titan charge": {
    effects: ["disp_dash", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { disp_dash: { range: 4, damageOnArrival: 150 } },
  },

  "whirlwind": {
    effects: ["dmg_multihit"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: [], exploits: [] },
  },

  "warpath stride": {
    effects: ["buff_stat", "buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["warpath_stance"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },

  "chain charge": {
    effects: ["disp_dash", "dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 100 } },
  },

  "seismic slam": {
    effects: ["dmg_weapon", "cc_stun", "disp_push"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["stunned", "momentum"], exploits: [] },
  },

  "rampage": {
    effects: ["transform_state", "res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: ["rampage_state"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 10, bonusPct: 0 } },
  },

  "the living avalanche": {
    effects: ["transform_state", "dmg_weapon", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["avalanche_form", "aoe_on_move"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 15, bonusPct: 200 }, buff_stat: { stat: "movementPoints" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Berserker — Primal Howl
  // ═══════════════════════════════════════════════════════════════════════════

  "battle cry": {
    effects: ["cc_fear", "debuff_stat"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["feared", "intimidated"], exploits: ["low_morale"] },
    effectParamOverrides: { cc_fear: { chance: 60, turns: 2 }, debuff_stat: { stat: "meleeSkill" } },
  },

  "taunt": {
    effects: ["cc_taunt", "debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["taunted"], exploits: [] },
    effectParamOverrides: { cc_taunt: { turns: 4 }, debuff_stat: { stat: "meleeSkill" } },
  },

  "howl of terror": {
    effects: ["cc_fear", "cc_stun", "debuff_stat"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["feared", "stunned", "debuffed"], exploits: ["low_morale"] },
    effectParamOverrides: { cc_fear: { chance: 80, turns: 4 }, debuff_stat: { stat: "meleeSkill" } },
  },

  "crushing dominance": {
    effects: ["debuff_stat", "debuff_vuln", "cc_silence"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["dominated", "vulnerable"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" }, cc_silence: { turns: 10 } },
  },

  "mass rout": {
    effects: ["dmg_weapon", "cc_fear", "debuff_stat"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["feared", "debuffed"], exploits: [] },
    effectParamOverrides: { cc_fear: { chance: 60, turns: 3 }, debuff_stat: { stat: "meleeSkill" } },
  },

  "war god's roar": {
    effects: ["cc_fear", "buff_stat"],
    targeting: "tgt_all_enemies",
    conditions: { creates: ["feared", "ally_damage_buff"], exploits: [] },
    effectParamOverrides: { cc_fear: { chance: 100, turns: 2 }, buff_stat: { stat: "meleeSkill" } },
  },

  "apex predator": {
    effects: ["transform_state", "debuff_stat", "cc_silence", "cc_fear"],
    targeting: "tgt_all_enemies",
    conditions: { creates: ["apex_predator_form", "global_debuff", "ally_buff"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 15, bonusPct: 50 }, debuff_stat: { stat: "meleeSkill" }, cc_silence: { turns: 15 }, cc_fear: { chance: 100, turns: 3 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Monk — Iron Fist
  // ═══════════════════════════════════════════════════════════════════════════

  "jab": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["combo_point"], exploits: [] },
  },

  "cross": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["combo_points"], exploits: [] },
  },

  "iron stance": {
    effects: ["buff_stat", "debuff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["iron_stance"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" }, debuff_stat: { stat: "movementPoints" } },
  },

  "rising uppercut": {
    effects: ["dmg_weapon", "cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["combo_points", "airborne"], exploits: [] },
  },

  "body blow": {
    effects: ["dmg_weapon", "debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["weakened"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "hundred fists": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["combo_points"] },
  },

  "armor crack": {
    effects: ["dmg_weapon", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_broken"], exploits: ["combo_points"] },
    effectParamOverrides: { debuff_armor: { pct: 25, turns: 4 } },
  },

  "dragon's fist": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["combo_points"] },
  },

  "perfect form": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["perfect_form"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "thousand strike technique": {
    effects: ["dmg_multihit", "dmg_weapon"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["combo_points"] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Monk — Flowing Water
  // ═══════════════════════════════════════════════════════════════════════════

  "step aside": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["dodged"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "water stance": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["water_stance", "counter_charge_on_dodge"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "fluid step": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["evasion_chain"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "still water": {
    effects: ["buff_dmgReduce", "stance_counter"],
    targeting: "tgt_self",
    conditions: { creates: ["counter_charges", "damage_reduction"], exploits: [] },
  },

  "current strike": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["counter_charges"] },
  },

  "river's fury": {
    effects: ["stance_counter", "dmg_weapon"],
    targeting: "tgt_self",
    conditions: { creates: ["auto_counter", "counter_charges"], exploits: [] },
  },

  "ocean's wrath": {
    effects: ["transform_state", "dmg_reflect", "stance_counter"],
    targeting: "tgt_self",
    conditions: { creates: ["oceans_wrath_form", "auto_dodge", "auto_counter"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 4, bonusPct: 0 }, dmg_reflect: { pct: 100, turns: 4 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Monk — Inner Fire
  // ═══════════════════════════════════════════════════════════════════════════

  "ki bolt": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "focus": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["ki_restored", "ki_damage_buff"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "ki blast": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "inner flame": {
    effects: ["buff_stat", "dot_burn"],
    targeting: "tgt_self",
    conditions: { creates: ["inner_flame", "burn_on_hit"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "wave of force": {
    effects: ["dmg_spell", "disp_push"],
    targeting: "tgt_aoe_line",
    conditions: { creates: ["displaced"], exploits: [] },
  },

  "ki explosion": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: [], exploits: [] },
  },

  "focused beam": {
    effects: ["channel_dmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["escalating_damage"], exploits: [] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 80, turns: 2 } },
  },

  "spirit bomb": {
    effects: ["channel_dmg"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 2 } },
  },

  "inner supernova": {
    effects: ["dmg_spell", "disp_push"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["displaced"], exploits: [] },
  },

  "transcendent ki": {
    effects: ["transform_state", "dmg_spell", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["transcendent_form", "auto_chain", "free_cast", "periodic_spirit_bomb"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 5, bonusPct: 100 }, buff_stat: { stat: "meleeSkill" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ranger — Dead Eye
  // ═══════════════════════════════════════════════════════════════════════════

  "mark target": {
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["marked"], exploits: [] },
  },

  "flint nock": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "scope in": {
    effects: ["buff_stat", "debuff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["scoped_in"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "critChance" }, debuff_stat: { stat: "movementPoints" } },
  },

  "tungsten tip": {
    effects: ["dmg_weapon", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_pierced"], exploits: [] },
    effectParamOverrides: { debuff_armor: { pct: 30, turns: 1 } },
  },

  "killzone": {
    effects: ["zone_persist"],
    targeting: "tgt_aoe_radius2",
    conditions: { creates: ["killzone_area"], exploits: [] },
    effectParamOverrides: { zone_persist: { radius: 2, turns: 3, dmgPerTurn: 0 } },
  },

  "cold calculation": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["guaranteed_crit"], exploits: ["stationary"] },
    effectParamOverrides: { buff_stat: { stat: "critChance" } },
  },

  "sniper's patience": {
    effects: ["channel_dmg"],
    targeting: "tgt_aoe_line",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { channel_dmg: { dmgPerTurn: 350, turns: 1 } },
  },

  "ghost bullet": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "one shot, one soul": {
    effects: ["dmg_weapon", "dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["low_hp"] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ranger — Trapper
  // ═══════════════════════════════════════════════════════════════════════════

  "snare trap": {
    effects: ["trap_place", "cc_root"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rooted", "trap_placed"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 } },
  },

  "tripwire": {
    effects: ["trap_place", "debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["revealed", "trap_placed"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, debuff_stat: { stat: "dodge" } },
  },

  "bait pile": {
    effects: ["trap_place", "cc_taunt"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["lured", "trap_placed"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, cc_taunt: { turns: 1 } },
  },

  "spike pit": {
    effects: ["trap_place", "debuff_stat", "dot_bleed"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["slowed", "bleeding", "trap_placed"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, debuff_stat: { stat: "movementPoints" } },
  },

  "cluster mine": {
    effects: ["trap_place", "dmg_multihit"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["trap_placed"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 1, triggerDmg: 50 } },
  },

  "corrosive net": {
    effects: ["cc_root", "debuff_armor"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["ensnared", "armor_degrading"], exploits: [] },
    effectParamOverrides: { debuff_armor: { pct: 10, turns: 4 } },
  },

  "prepared ground": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: ["traps_reset"], exploits: [] },
  },

  "killbox setup": {
    effects: ["trap_place", "dmg_weapon", "cc_root"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["trap_placed", "killbox_zone"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 3, triggerDmg: 80 } },
  },

  "the long game": {
    effects: ["trap_place", "zone_persist", "cc_root"],
    targeting: "tgt_aoe_radius3",
    conditions: { creates: ["trap_field", "cascading_traps"], exploits: [] },
    effectParamOverrides: { trap_place: { count: 12, triggerDmg: 40 }, zone_persist: { radius: 3, turns: 8, dmgPerTurn: 30 } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ranger — Beastmaster Archer
  // ═══════════════════════════════════════════════════════════════════════════

  "bond strike": {
    effects: ["dmg_weapon", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["pet_coordinated"], exploits: [] },
  },

  "scout hawk": {
    effects: ["summon_unit"],
    targeting: "tgt_aoe_cone",
    conditions: { creates: ["scouted", "hawk_active"], exploits: [] },
    effectParamOverrides: { summon_unit: { hp: 15, turns: 3, count: 1 } },
  },

  "flanking fang": {
    effects: ["debuff_vuln", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["flanked", "distracted"], exploits: [] },
  },

  "heal companion": {
    effects: ["heal_flat"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["pet_healed"], exploits: [] },
    effectParamOverrides: { heal_flat: { amount: 40 } },
  },

  "arrow + claw": {
    effects: ["dmg_weapon", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["vulnerable_stacking"], exploits: [] },
  },

  "alpha call": {
    effects: ["buff_stat"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["alpha_buffed"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "scatter drive": {
    effects: ["dmg_weapon", "debuff_stat", "disp_pull"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["slowed", "herded"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, disp_pull: { distance: 2 } },
  },

  "primal pact": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["primal_pact", "pet_mirroring"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "wild volley": {
    effects: ["dmg_multihit", "cc_root"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["pinned"], exploits: [] },
  },

  "hunt as one": {
    effects: ["transform_state", "buff_stat", "summon_unit"],
    targeting: "tgt_self",
    conditions: { creates: ["hunt_as_one_form", "shared_hp_pool", "spectral_duplicates"], exploits: [] },
    effectParamOverrides: { transform_state: { turns: 4, bonusPct: 20 }, buff_stat: { stat: "movementPoints" }, summon_unit: { hp: 30, turns: 4, count: 1 } },
  },
};
