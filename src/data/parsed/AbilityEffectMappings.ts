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
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },

  "shared haste": {
    effects: ["buff_stat"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["haste"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "flicker strike": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "overclock": {
    effects: ["buff_stat", "cc_stun"],
    targeting: "tgt_self",
    conditions: { creates: ["haste", "stun_self"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "temporal surge": {
    effects: ["buff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["haste"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  "infinite loop": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["infinite_loop"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "initiative" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Chronoweaver — Entropy
  // ═══════════════════════════════════════════════════════════════════════════

  "rust touch": {
    effects: ["dmg_weapon", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["corrode"], exploits: [] },
  },

  "wither bolt": {
    effects: ["dmg_spell", "dot_poison"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["decay"], exploits: [] },
  },

  "sap vitality": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["heal_reduction"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" } },
  },

  "dust to dust": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  },

  "entropic field": {
    effects: ["dot_poison"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["decay"], exploits: [] },
  },

  "crumble": {
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_break"], exploits: [] },
  },

  "pandemic": {
    effects: ["dot_poison"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  },

  "heat death": {
    effects: ["dmg_spell", "dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["heat_death_mark"], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Chronoweaver — Paradox
  // ═══════════════════════════════════════════════════════════════════════════

  "rewind": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
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
    effects: ["debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["causal_loop"], exploits: [] },
  },

  "echo cast": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
  },

  "time bomb": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["time_bomb_marker"], exploits: [] },
  },

  "fork reality": {
    effects: ["dmg_multihit"],
    targeting: "tgt_self",
    conditions: { creates: ["clone"], exploits: [] },
  },

  "grandfather": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" } },
  },

  "closed timelike": {
    effects: ["heal_pctDmg", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["time_rewind"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
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
    effects: ["buff_dmgReduce", "debuff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["rooted_stance"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  "splinter burst": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["barkskin"] },
  },

  "entangling wall": {
    effects: ["dmg_spell", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["thorn_wall"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  "world tree": {
    effects: ["buff_dmgReduce", "stance_counter"],
    targeting: "tgt_self",
    conditions: { creates: ["world_tree", "rooted_stance"], exploits: [] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ironbloom Warden — Overgrowth
  // ═══════════════════════════════════════════════════════════════════════════

  "rejuvenate": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["rejuvenate_hot"], exploits: [] },
  },

  "seedling": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["seedling"], exploits: [] },
  },

  "overgrowth": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["seedling"] },
  },

  "verdant tide": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["verdant_tide_hot"], exploits: [] },
  },

  "bloom cascade": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["seedling"] },
  },

  "gaia's embrace": {
    effects: ["heal_pctDmg", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["gaia_embrace", "seedling"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
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
    effects: ["dot_poison"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["fungal_node"], exploits: [] },
  },

  "decompose": {
    effects: ["dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["dot_poison"] },
  },

  "plague garden": {
    effects: ["dot_poison", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["fungal_node", "plague_zone", "heal_reduction"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" } },
  },

  "parasitic vine": {
    effects: ["dot_poison", "heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["parasitic_vine"], exploits: [] },
  },

  "cordyceps": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["cordyceps_infection"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "resolve" } },
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
    effects: ["dmg_spell", "dmg_execute"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["requiem_mark"], exploits: [] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Echo Dancer — Silence
  // ═══════════════════════════════════════════════════════════════════════════

  "muffle": {
    effects: ["cc_daze"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["silence"], exploits: [] },
  },

  "sound eater": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "dead air": {
    effects: ["cc_daze"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["silence_zone"], exploits: [] },
  },

  "ambush": {
    effects: ["dmg_weapon", "cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["stun"], exploits: ["stealth"] },
  },

  "void frequency": {
    effects: ["cc_daze"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["cooldown_freeze"], exploits: [] },
  },

  "ghost note": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth", "decoy"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "total silence": {
    effects: ["cc_daze", "buff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["silence", "stealth"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  "the unheard": {
    effects: ["buff_stat", "buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["stealth", "untargetable"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Echo Dancer — Cacophony
  // ═══════════════════════════════════════════════════════════════════════════

  "screech": {
    effects: ["dmg_spell", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "bass drop": {
    effects: ["dmg_spell", "disp_push"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "tinnitus": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "wall of sound": {
    effects: ["dmg_spell", "cc_stun"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["sound_wall"], exploits: [] },
  },

  "shockwave": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "noise complaint": {
    effects: ["debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["disoriented"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "brown note": {
    effects: ["cc_root", "dot_burn"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["fear"], exploits: [] },
  },

  "symphony of destruction": {
    effects: ["dmg_spell", "debuff_stat", "buff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["disoriented", "symphony_zone"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" }, buff_stat: { stat: "meleeSkill" } },
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
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["rhythm"], exploits: [] },
  },

  "whirlwind step": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rhythm"], exploits: [] },
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
    effects: ["buff_stat", "dmg_multihit"],
    targeting: "tgt_self",
    conditions: { creates: ["eternal_rhythm"], exploits: ["rhythm"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
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
    effects: ["dmg_spell", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["blade_charge"], exploits: [] },
  },

  "runic barrage": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["weave_resonance"], exploits: [] },
  },

  "phase cut": {
    effects: ["dmg_weapon", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["weave_resonance"] },
  },

  "resonance overflow": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["weave_resonance"] },
  },

  "grand synthesis": {
    effects: ["dmg_weapon", "dmg_spell"],
    targeting: "tgt_aoe_adjacent",
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
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["harmonic_chorus"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "discordant note": {
    effects: ["cc_daze"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["interrupt"], exploits: [] },
  },

  "symphony of war": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["symphony_of_war"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "the eternal war song": {
    effects: ["buff_stat", "buff_dmgReduce"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["eternal_war_song"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
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
    targeting: "tgt_aoe_adjacent",
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
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "exsanguinate": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
  },

  "the final offering": {
    effects: ["dmg_spell", "heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
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
    effects: ["disp_push", "dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "boil": {
    effects: ["dot_burn", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["burn", "vulnerable"], exploits: [] },
  },

  "full puppet": {
    effects: ["cc_stun"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["controlled"], exploits: [] },
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
    effects: ["debuff_stat", "debuff_stat", "cc_daze"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["controlled"], exploits: ["bleed"] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
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
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_ally",
    conditions: { creates: [], exploits: [] },
  },

  "sanguine transfusion": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_ally",
    conditions: { creates: [], exploits: [] },
  },

  "hemorrhage harvest": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["bleed"] },
  },

  "vital lattice": {
    effects: ["buff_dmgReduce"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["lattice"], exploits: [] },
  },

  "soul leak": {
    effects: ["dmg_spell", "heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "mass transfusion": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "the eternal circuit": {
    effects: ["buff_dmgReduce", "heal_pctDmg"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["circuit"], exploits: [] },
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
    effects: ["buff_stat", "heal_pctDmg"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
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
    effects: ["buff_stat", "heal_pctDmg"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
  },

  "the infinite hunger": {
    effects: ["buff_stat", "heal_pctDmg", "dmg_weapon"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
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
    effects: ["dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_blade"], exploits: [] },
  },

  "phantom strike": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "arsenal expansion": {
    effects: ["dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_blade"], exploits: [] },
  },

  "shield formation": {
    effects: ["buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "spectral surge": {
    effects: ["dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "ghost lance": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["spectral_lance"], exploits: [] },
  },

  "haunted volley": {
    effects: ["dmg_multihit"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "blade tornado": {
    effects: ["dmg_spell", "buff_dmgReduce"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["spectral_blade"] },
  },

  "spectral clone": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["spectral_clone"], exploits: ["spectral_blade"] },
  },

  "the ghost armory": {
    effects: ["dmg_multihit", "dmg_spell", "buff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["spectral_blade", "spectral_greatsword"], exploits: [] },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Necrosurgeon — Reanimator
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: Harvest Limb and Mass Harvest have empty effects and are skipped.

  "crude assembly": {
    effects: ["dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
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
    effects: ["dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
  },

  "surgical upgrade": {
    effects: ["heal_pctDmg", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["construct"] },
  },

  "optimal configuration": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: [], exploits: ["construct", "harvested_part"] },
  },

  "masterwork abomination": {
    effects: ["dmg_spell", "dmg_multihit"],
    targeting: "tgt_self",
    conditions: { creates: ["construct"], exploits: ["harvested_part"] },
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
    effects: ["buff_dmgReduce", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["undead_form"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
  },

  "the masterwork self": {
    effects: ["buff_dmgReduce", "heal_pctDmg", "buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["flesh_construct_form"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "resolve" } },
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
    effects: ["buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_shell"], exploits: ["soul_essence"] },
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
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["soul_essence"] },
  },

  "spectral minion": {
    effects: ["dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["spectral_minion"], exploits: ["soul_essence"] },
  },

  "soul forge": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["soul_weapon"], exploits: ["soul_essence", "construct"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "soulstorm engine": {
    effects: ["dmg_multihit", "dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: ["soul_essence"] },
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
    effects: ["dmg_weapon", "buff_stat", "dmg_weapon"],
    targeting: "tgt_self",
    conditions: { creates: ["blood_fury_form", "blood_nova_on_kill"], exploits: ["low_hp"] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Berserker — Warpath
  // ═══════════════════════════════════════════════════════════════════════════

  "bull rush": {
    effects: ["dmg_weapon", "disp_push"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["displaced"], exploits: [] },
  },

  "cleave": {
    effects: ["dmg_weapon"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "titan charge": {
    effects: ["dmg_weapon", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "whirlwind": {
    effects: ["dmg_multihit"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "warpath stride": {
    effects: ["buff_stat", "buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["warpath_stance"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },

  "chain charge": {
    effects: ["dmg_weapon", "dmg_multihit"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
  },

  "seismic slam": {
    effects: ["dmg_weapon", "cc_stun", "disp_push"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["stunned", "momentum"], exploits: [] },
  },

  "rampage": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: ["rampage_state"], exploits: [] },
  },

  "the living avalanche": {
    effects: ["dmg_weapon", "buff_stat", "buff_dmgReduce"],
    targeting: "tgt_self",
    conditions: { creates: ["avalanche_form", "aoe_on_move"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Berserker — Primal Howl
  // ═══════════════════════════════════════════════════════════════════════════

  "battle cry": {
    effects: ["cc_daze", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["feared", "intimidated"], exploits: ["low_morale"] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "taunt": {
    effects: ["cc_daze", "debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["taunted"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "howl of terror": {
    effects: ["cc_stun", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["feared", "stunned", "debuffed"], exploits: ["low_morale"] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "crushing dominance": {
    effects: ["debuff_stat", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["dominated", "vulnerable"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "mass rout": {
    effects: ["dmg_weapon", "cc_daze", "debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["feared", "debuffed"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
  },

  "war god's roar": {
    effects: ["cc_stun", "buff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["feared", "ally_damage_buff"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
  },

  "apex predator": {
    effects: ["debuff_stat", "buff_stat", "cc_daze"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["apex_predator_form", "global_debuff", "ally_buff"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
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
    effects: ["dmg_weapon", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_broken"], exploits: ["combo_points"] },
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
    effects: ["buff_stat", "stance_counter", "dmg_weapon"],
    targeting: "tgt_self",
    conditions: { creates: ["oceans_wrath_form", "auto_dodge", "auto_counter"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "dodge" } },
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
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["displaced"], exploits: [] },
  },

  "ki explosion": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "focused beam": {
    effects: ["dmg_spell"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["escalating_damage"], exploits: [] },
  },

  "spirit bomb": {
    effects: ["dmg_spell"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: [], exploits: [] },
  },

  "inner supernova": {
    effects: ["dmg_spell", "disp_push"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["displaced"], exploits: [] },
  },

  "transcendent ki": {
    effects: ["dmg_spell", "buff_stat", "dmg_spell"],
    targeting: "tgt_self",
    conditions: { creates: ["transcendent_form", "auto_chain", "free_cast", "periodic_spirit_bomb"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "meleeSkill" } },
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
    effects: ["dmg_weapon", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["armor_pierced"], exploits: [] },
  },

  "killzone": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["killzone_area"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "rangedSkill" } },
  },

  "cold calculation": {
    effects: ["buff_stat"],
    targeting: "tgt_self",
    conditions: { creates: ["guaranteed_crit"], exploits: ["stationary"] },
    effectParamOverrides: { buff_stat: { stat: "critChance" } },
  },

  "sniper's patience": {
    effects: ["dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: [], exploits: [] },
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
    effects: ["cc_root"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["rooted", "trap_placed"], exploits: [] },
  },

  "tripwire": {
    effects: ["debuff_stat"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["revealed", "trap_placed"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "dodge" } },
  },

  "bait pile": {
    effects: ["cc_daze"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["lured", "trap_placed"], exploits: [] },
  },

  "spike pit": {
    effects: ["debuff_stat", "dot_bleed"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["slowed", "bleeding", "trap_placed"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
  },

  "cluster mine": {
    effects: ["dmg_multihit"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["trap_placed"], exploits: [] },
  },

  "corrosive net": {
    effects: ["cc_root", "debuff_vuln"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["ensnared", "armor_degrading"], exploits: [] },
  },

  "prepared ground": {
    effects: ["res_apRefund"],
    targeting: "tgt_self",
    conditions: { creates: ["traps_reset"], exploits: [] },
  },

  "killbox setup": {
    effects: ["dmg_weapon", "cc_root"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["trap_placed", "killbox_zone"], exploits: [] },
  },

  "the long game": {
    effects: ["dmg_multihit", "cc_root"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["trap_field", "cascading_traps"], exploits: [] },
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
    effects: ["debuff_stat"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["scouted", "hawk_active"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "dodge" } },
  },

  "flanking fang": {
    effects: ["debuff_vuln", "dmg_weapon"],
    targeting: "tgt_single_enemy",
    conditions: { creates: ["flanked", "distracted"], exploits: [] },
  },

  "heal companion": {
    effects: ["heal_pctDmg"],
    targeting: "tgt_single_ally",
    conditions: { creates: ["pet_healed"], exploits: [] },
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
    effects: ["dmg_weapon", "debuff_stat", "disp_push"],
    targeting: "tgt_aoe_adjacent",
    conditions: { creates: ["slowed", "herded"], exploits: [] },
    effectParamOverrides: { debuff_stat: { stat: "movementPoints" } },
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
    effects: ["buff_stat", "dmg_weapon", "dmg_weapon"],
    targeting: "tgt_self",
    conditions: { creates: ["hunt_as_one_form", "shared_hp_pool", "spectral_duplicates"], exploits: [] },
    effectParamOverrides: { buff_stat: { stat: "movementPoints" } },
  },
};
