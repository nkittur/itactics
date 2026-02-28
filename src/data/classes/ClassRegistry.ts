import { registerClassDef, type ClassDef, type ArchetypeDef, type SkillTreeTier } from "../ClassDefinition";

// ── Helper to build minimal skill tree tiers ──

function tier(t: number, lvl: number, nodes: { id: string; prereqs?: string[] }[]): SkillTreeTier {
  return {
    tier: t,
    levelRequired: lvl,
    nodes: nodes.map((n, i) => ({ abilityId: n.id, position: i, prerequisites: n.prereqs ?? [] })),
  };
}

function arch(id: string, name: string, desc: string, playstyle: string, tags: string[], synergies: string[], tiers: SkillTreeTier[]): ArchetypeDef {
  return { id, name, description: desc, playstyle, tags, synergies, skillTree: tiers };
}

// ══════════════════════════════════════════════════════════════════
// 1. FIGHTER — Versatile melee generalist
// ══════════════════════════════════════════════════════════════════

const FIGHTER: ClassDef = {
  id: "fighter", name: "Fighter",
  description: "A versatile warrior trained in many weapons and fighting styles.",
  role: "Versatile melee DPS", category: "martial",
  tags: ["melee", "versatile", "dps"],
  baseStats: { hitpoints: 110, stamina: 100, mana: 20, resolve: 50, initiative: 40, meleeSkill: 55, rangedSkill: 30, dodge: 25, magicResist: 5, critChance: 5, critMultiplier: 1.5, movementPoints: 8 },
  statGrowth: { hitpoints: 8, stamina: 5, meleeSkill: 3, dodge: 1, critChance: 0.3 },
  resources: [{ resourceId: "stamina", maxOverride: 100 }],
  weaponFamilies: ["dagger", "sword", "cleaver", "axe", "mace", "flail", "spear", "polearm", "throwing"],
  shieldAccess: "all", maxArmorWeight: "heavy", baseMP: 8,
  innatePassives: [],
  archetypes: [
    arch("fighter_weapon_master", "Weapon Master", "A disciplined fighter who excels with any weapon.", "Adapts fighting style to equipped weapon for bonus effects.", ["melee", "versatile"], ["fighter_vanguard"],
      [tier(1, 1, [{ id: "fig_precision_strike" }, { id: "fig_defensive_stance" }, { id: "fig_weapon_training" }]),
       tier(2, 3, [{ id: "fig_riposte", prereqs: ["fig_defensive_stance"] }, { id: "fig_power_attack", prereqs: ["fig_precision_strike"] }]),
       tier(3, 5, [{ id: "fig_combo_chain", prereqs: ["fig_power_attack"] }, { id: "fig_parry_master", prereqs: ["fig_riposte"] }]),
       tier(4, 8, [{ id: "fig_whirlwind", prereqs: ["fig_combo_chain"] }]),
       tier(5, 10, [{ id: "fig_blade_storm", prereqs: ["fig_whirlwind", "fig_parry_master"] }])]),
    arch("fighter_vanguard", "Vanguard", "A frontline warrior who leads the charge.", "Charges into battle, disrupting enemy formations.", ["melee", "mobile", "tank"], ["fighter_weapon_master"],
      [tier(1, 1, [{ id: "fig_shield_bash" }, { id: "fig_charge" }, { id: "fig_iron_will" }]),
       tier(2, 3, [{ id: "fig_shield_wall", prereqs: ["fig_shield_bash"] }, { id: "fig_bull_rush", prereqs: ["fig_charge"] }]),
       tier(3, 5, [{ id: "fig_rallying_cry", prereqs: ["fig_iron_will"] }, { id: "fig_unstoppable", prereqs: ["fig_bull_rush"] }]),
       tier(4, 8, [{ id: "fig_hold_the_line", prereqs: ["fig_shield_wall"] }]),
       tier(5, 10, [{ id: "fig_last_stand", prereqs: ["fig_hold_the_line", "fig_rallying_cry"] }])]),
    arch("fighter_duelist", "Duelist", "A precise swordsman who exploits openings.", "Singles out enemies for devastating one-on-one combat.", ["melee", "single_target", "dps"], ["fighter_weapon_master"],
      [tier(1, 1, [{ id: "fig_feint" }, { id: "fig_lunge" }, { id: "fig_footwork" }]),
       tier(2, 3, [{ id: "fig_exploit_opening", prereqs: ["fig_feint"] }, { id: "fig_disarm", prereqs: ["fig_lunge"] }]),
       tier(3, 5, [{ id: "fig_deadly_riposte", prereqs: ["fig_exploit_opening"] }, { id: "fig_evasive_stance", prereqs: ["fig_footwork"] }]),
       tier(4, 8, [{ id: "fig_marked_for_death", prereqs: ["fig_deadly_riposte"] }]),
       tier(5, 10, [{ id: "fig_death_blow", prereqs: ["fig_marked_for_death", "fig_disarm"] }])]),
  ],
  themeColor: "#aa8844", icon: "class_fighter",
};

// ══════════════════════════════════════════════════════════════════
// 2. KNIGHT — Heavy tank
// ══════════════════════════════════════════════════════════════════

const KNIGHT: ClassDef = {
  id: "knight", name: "Knight",
  description: "An armored champion who protects allies and controls the battlefield.",
  role: "Tank / Protector", category: "martial",
  tags: ["melee", "tank", "support"],
  baseStats: { hitpoints: 130, stamina: 100, mana: 20, resolve: 60, initiative: 30, meleeSkill: 45, rangedSkill: 15, dodge: 10, magicResist: 10, critChance: 3, critMultiplier: 1.3, movementPoints: 7 },
  statGrowth: { hitpoints: 10, resolve: 3, meleeSkill: 2, magicResist: 1 },
  resources: [{ resourceId: "stamina", maxOverride: 100 }, { resourceId: "resolve_points", maxOverride: 5 }],
  weaponFamilies: ["sword", "mace"], maxWeaponHands: 1,
  shieldAccess: "all", maxArmorWeight: "heavy", baseMP: 7,
  innatePassives: [{ type: "armor_proficiency", params: { armorMPReduction: 1 } }],
  archetypes: [
    arch("knight_bulwark", "Bulwark", "An immovable wall of steel.", "Absorbs damage for allies, gains Resolve when hit.", ["tank", "shield"], ["knight_crusader"],
      [tier(1, 1, [{ id: "kni_shield_block" }, { id: "kni_taunt" }, { id: "kni_iron_skin" }]),
       tier(2, 3, [{ id: "kni_shield_slam", prereqs: ["kni_shield_block"] }, { id: "kni_guardian_aura", prereqs: ["kni_taunt"] }]),
       tier(3, 5, [{ id: "kni_fortress", prereqs: ["kni_iron_skin"] }, { id: "kni_bodyguard", prereqs: ["kni_guardian_aura"] }]),
       tier(4, 8, [{ id: "kni_unbreakable", prereqs: ["kni_fortress"] }]),
       tier(5, 10, [{ id: "kni_immortal_bastion", prereqs: ["kni_unbreakable", "kni_bodyguard"] }])]),
    arch("knight_crusader", "Crusader", "A holy warrior who smites evil.", "Deals bonus damage to undead/corrupted, heals on kills.", ["melee", "holy", "dps"], ["knight_bulwark"],
      [tier(1, 1, [{ id: "kni_holy_strike" }, { id: "kni_smite" }, { id: "kni_divine_shield" }]),
       tier(2, 3, [{ id: "kni_righteous_fury", prereqs: ["kni_holy_strike"] }, { id: "kni_consecrate", prereqs: ["kni_smite"] }]),
       tier(3, 5, [{ id: "kni_zealous_charge", prereqs: ["kni_righteous_fury"] }, { id: "kni_purify", prereqs: ["kni_divine_shield"] }]),
       tier(4, 8, [{ id: "kni_judgment", prereqs: ["kni_zealous_charge"] }]),
       tier(5, 10, [{ id: "kni_divine_wrath", prereqs: ["kni_judgment", "kni_consecrate"] }])]),
    arch("knight_warlord", "Warlord", "A commanding presence who inspires allies.", "Boosts nearby allies, punishes enemies who ignore him.", ["tank", "support", "aura"], ["knight_bulwark"],
      [tier(1, 1, [{ id: "kni_commanding_shout" }, { id: "kni_inspire" }, { id: "kni_heavy_swing" }]),
       tier(2, 3, [{ id: "kni_battle_standard", prereqs: ["kni_commanding_shout"] }, { id: "kni_war_cry", prereqs: ["kni_inspire"] }]),
       tier(3, 5, [{ id: "kni_tactical_advance", prereqs: ["kni_battle_standard"] }, { id: "kni_punish", prereqs: ["kni_heavy_swing"] }]),
       tier(4, 8, [{ id: "kni_aura_of_courage", prereqs: ["kni_tactical_advance"] }]),
       tier(5, 10, [{ id: "kni_kings_decree", prereqs: ["kni_aura_of_courage", "kni_punish"] }])]),
  ],
  themeColor: "#ccccdd", icon: "class_knight",
};

// ══════════════════════════════════════════════════════════════════
// 3. ROGUE — Burst melee DPS
// ══════════════════════════════════════════════════════════════════

const ROGUE: ClassDef = {
  id: "rogue", name: "Rogue",
  description: "A cunning fighter who strikes from the shadows using combo attacks.",
  role: "Burst melee DPS", category: "martial",
  tags: ["melee", "stealth", "dps", "combo"],
  baseStats: { hitpoints: 85, stamina: 100, mana: 20, resolve: 35, initiative: 55, meleeSkill: 50, rangedSkill: 35, dodge: 40, magicResist: 5, critChance: 10, critMultiplier: 1.8, movementPoints: 10 },
  statGrowth: { hitpoints: 5, dodge: 2, meleeSkill: 3, critChance: 0.5 },
  resources: [{ resourceId: "combo_points", maxOverride: 5 }, { resourceId: "momentum", maxOverride: 10 }],
  weaponFamilies: ["dagger", "sword", "cleaver", "throwing"],
  shieldAccess: "buckler", maxArmorWeight: "light", baseMP: 10,
  innatePassives: [{ type: "weapon_proficiency", params: { family: "dagger", apDiscount: 1 } }],
  archetypes: [
    arch("rogue_shadow", "Shadowblade", "A stealthy assassin who strikes unseen.", "Builds combo points to unleash devastating finishers.", ["stealth", "combo", "dps"], ["rogue_cutthroat"],
      [tier(1, 1, [{ id: "rog_backstab" }, { id: "rog_shadow_step" }, { id: "rog_combo_passive" }]),
       tier(2, 3, [{ id: "rog_eviscerate", prereqs: ["rog_backstab"] }, { id: "rog_vanish", prereqs: ["rog_shadow_step"] }]),
       tier(3, 5, [{ id: "rog_shadow_dance", prereqs: ["rog_vanish"] }, { id: "rog_kidney_shot", prereqs: ["rog_eviscerate"] }]),
       tier(4, 8, [{ id: "rog_death_mark", prereqs: ["rog_kidney_shot"] }]),
       tier(5, 10, [{ id: "rog_shadow_assassination", prereqs: ["rog_death_mark", "rog_shadow_dance"] }])]),
    arch("rogue_cutthroat", "Cutthroat", "A dirty fighter who exploits weaknesses.", "Applies bleeds, poisons, and debuffs to weaken foes.", ["debuff", "dot", "melee"], ["rogue_shadow"],
      [tier(1, 1, [{ id: "rog_cheap_shot" }, { id: "rog_poison_blade" }, { id: "rog_dirty_tricks" }]),
       tier(2, 3, [{ id: "rog_hemorrhage", prereqs: ["rog_cheap_shot"] }, { id: "rog_crippling_poison", prereqs: ["rog_poison_blade"] }]),
       tier(3, 5, [{ id: "rog_rupture", prereqs: ["rog_hemorrhage"] }, { id: "rog_nerve_strike", prereqs: ["rog_crippling_poison"] }]),
       tier(4, 8, [{ id: "rog_expose_weakness", prereqs: ["rog_rupture"] }]),
       tier(5, 10, [{ id: "rog_death_by_cuts", prereqs: ["rog_expose_weakness", "rog_nerve_strike"] }])]),
    arch("rogue_acrobat", "Acrobat", "A nimble fighter who dances around enemies.", "Extreme mobility, dodges attacks and repositions constantly.", ["mobile", "dodge", "melee"], ["rogue_shadow"],
      [tier(1, 1, [{ id: "rog_tumble" }, { id: "rog_quick_slash" }, { id: "rog_evasion" }]),
       tier(2, 3, [{ id: "rog_spring_attack", prereqs: ["rog_tumble"] }, { id: "rog_blade_flurry", prereqs: ["rog_quick_slash"] }]),
       tier(3, 5, [{ id: "rog_uncatchable", prereqs: ["rog_evasion"] }, { id: "rog_ricochet", prereqs: ["rog_spring_attack"] }]),
       tier(4, 8, [{ id: "rog_whirling_blades", prereqs: ["rog_blade_flurry"] }]),
       tier(5, 10, [{ id: "rog_phantom_step", prereqs: ["rog_whirling_blades", "rog_uncatchable"] }])]),
  ],
  themeColor: "#446644", icon: "class_rogue",
};

// ══════════════════════════════════════════════════════════════════
// 4. RANGER — Ranged DPS
// ══════════════════════════════════════════════════════════════════

const RANGER: ClassDef = {
  id: "ranger", name: "Ranger",
  description: "A skilled marksman who fights from a distance with precision shots.",
  role: "Ranged DPS", category: "martial",
  tags: ["ranged", "dps", "mobile"],
  baseStats: { hitpoints: 90, stamina: 100, mana: 20, resolve: 40, initiative: 50, meleeSkill: 35, rangedSkill: 60, dodge: 30, magicResist: 5, critChance: 8, critMultiplier: 1.6, movementPoints: 9 },
  statGrowth: { hitpoints: 6, rangedSkill: 3, dodge: 1, critChance: 0.4 },
  resources: [{ resourceId: "focus", maxOverride: 100 }, { resourceId: "ammo", maxOverride: 6 }],
  weaponFamilies: ["bow", "crossbow", "throwing", "dagger", "sword"],
  shieldAccess: "buckler", maxArmorWeight: "medium", baseMP: 9,
  innatePassives: [{ type: "weapon_proficiency", params: { qualifier: "ranged", apDiscount: 1 } }],
  archetypes: [
    arch("ranger_sharpshooter", "Sharpshooter", "A precise marksman who never misses.", "Builds Focus for guaranteed critical hits.", ["ranged", "crit", "dps"], ["ranger_survivalist"],
      [tier(1, 1, [{ id: "rng_aimed_shot" }, { id: "rng_quick_shot" }, { id: "rng_steady_aim" }]),
       tier(2, 3, [{ id: "rng_piercing_shot", prereqs: ["rng_aimed_shot"] }, { id: "rng_double_tap", prereqs: ["rng_quick_shot"] }]),
       tier(3, 5, [{ id: "rng_headshot", prereqs: ["rng_piercing_shot"] }, { id: "rng_rapid_fire", prereqs: ["rng_double_tap"] }]),
       tier(4, 8, [{ id: "rng_killshot", prereqs: ["rng_headshot"] }]),
       tier(5, 10, [{ id: "rng_perfect_shot", prereqs: ["rng_killshot", "rng_rapid_fire"] }])]),
    arch("ranger_survivalist", "Survivalist", "A rugged hunter who uses traps and terrain.", "Controls space with traps, gains advantage in terrain.", ["ranged", "trap", "control"], ["ranger_sharpshooter"],
      [tier(1, 1, [{ id: "rng_bear_trap" }, { id: "rng_camouflage" }, { id: "rng_tracking" }]),
       tier(2, 3, [{ id: "rng_snare_shot", prereqs: ["rng_bear_trap"] }, { id: "rng_ambush", prereqs: ["rng_camouflage"] }]),
       tier(3, 5, [{ id: "rng_explosive_trap", prereqs: ["rng_snare_shot"] }, { id: "rng_natures_ally", prereqs: ["rng_tracking"] }]),
       tier(4, 8, [{ id: "rng_minefield", prereqs: ["rng_explosive_trap"] }]),
       tier(5, 10, [{ id: "rng_apex_predator", prereqs: ["rng_minefield", "rng_ambush"] }])]),
    arch("ranger_beastmaster", "Beastmaster", "A ranger who fights alongside animal companions.", "Summons animal allies to flank and harass enemies.", ["ranged", "summon", "support"], ["ranger_sharpshooter"],
      [tier(1, 1, [{ id: "rng_call_hawk" }, { id: "rng_companion_bond" }, { id: "rng_wild_shot" }]),
       tier(2, 3, [{ id: "rng_call_wolf", prereqs: ["rng_call_hawk"] }, { id: "rng_pack_tactics", prereqs: ["rng_companion_bond"] }]),
       tier(3, 5, [{ id: "rng_coordinated_strike", prereqs: ["rng_pack_tactics"] }, { id: "rng_call_bear", prereqs: ["rng_call_wolf"] }]),
       tier(4, 8, [{ id: "rng_alpha_command", prereqs: ["rng_coordinated_strike"] }]),
       tier(5, 10, [{ id: "rng_stampede", prereqs: ["rng_alpha_command", "rng_call_bear"] }])]),
  ],
  themeColor: "#448844", icon: "class_ranger",
};

// ══════════════════════════════════════════════════════════════════
// 5. SPEARMAN — Reach / control
// ══════════════════════════════════════════════════════════════════

const SPEARMAN: ClassDef = {
  id: "spearman", name: "Spearman",
  description: "A disciplined warrior who controls space with reach weapons.",
  role: "Reach / Zone Control", category: "martial",
  tags: ["melee", "reach", "control"],
  baseStats: { hitpoints: 105, stamina: 100, mana: 20, resolve: 50, initiative: 38, meleeSkill: 50, rangedSkill: 20, dodge: 20, magicResist: 5, critChance: 5, critMultiplier: 1.5, movementPoints: 8 },
  statGrowth: { hitpoints: 7, meleeSkill: 3, dodge: 1 },
  resources: [{ resourceId: "stamina", maxOverride: 100 }],
  weaponFamilies: ["spear", "polearm", "sword", "dagger"],
  shieldAccess: "all", maxArmorWeight: "heavy", baseMP: 8,
  innatePassives: [{ type: "stat_bonus", params: { stat: "hit", qualifier: "spear", value: 5 } }],
  archetypes: [
    arch("spear_phalanx", "Phalanx", "Fights in formation, wall of spears.", "Locks down zones with spearwall reactions.", ["reach", "tank", "control"], ["spear_lancer"],
      [tier(1, 1, [{ id: "spr_spearwall" }, { id: "spr_brace" }, { id: "spr_formation" }]),
       tier(2, 3, [{ id: "spr_impale", prereqs: ["spr_spearwall"] }, { id: "spr_shield_formation", prereqs: ["spr_brace"] }]),
       tier(3, 5, [{ id: "spr_phalanx_advance", prereqs: ["spr_formation"] }, { id: "spr_pinning_strike", prereqs: ["spr_impale"] }]),
       tier(4, 8, [{ id: "spr_wall_of_spears", prereqs: ["spr_shield_formation"] }]),
       tier(5, 10, [{ id: "spr_unbreakable_line", prereqs: ["spr_wall_of_spears", "spr_phalanx_advance"] }])]),
    arch("spear_lancer", "Lancer", "Charges with devastating momentum.", "Mobile spear attacks that deal more damage with movement.", ["melee", "mobile", "dps"], ["spear_phalanx"],
      [tier(1, 1, [{ id: "spr_thrust" }, { id: "spr_lunge" }, { id: "spr_momentum_passive" }]),
       tier(2, 3, [{ id: "spr_lance_charge", prereqs: ["spr_lunge"] }, { id: "spr_sweep", prereqs: ["spr_thrust"] }]),
       tier(3, 5, [{ id: "spr_jousting_blow", prereqs: ["spr_lance_charge"] }, { id: "spr_whirlwind_spear", prereqs: ["spr_sweep"] }]),
       tier(4, 8, [{ id: "spr_devastating_charge", prereqs: ["spr_jousting_blow"] }]),
       tier(5, 10, [{ id: "spr_dragon_lance", prereqs: ["spr_devastating_charge", "spr_whirlwind_spear"] }])]),
    arch("spear_sentinel", "Sentinel", "Protects allies with reactive strikes.", "Punishes enemies who move near protected allies.", ["reach", "support", "reactive"], ["spear_phalanx"],
      [tier(1, 1, [{ id: "spr_overwatch" }, { id: "spr_guard" }, { id: "spr_vigilance" }]),
       tier(2, 3, [{ id: "spr_intercept", prereqs: ["spr_guard"] }, { id: "spr_reactive_thrust", prereqs: ["spr_overwatch"] }]),
       tier(3, 5, [{ id: "spr_zone_denial", prereqs: ["spr_reactive_thrust"] }, { id: "spr_covering_strike", prereqs: ["spr_intercept"] }]),
       tier(4, 8, [{ id: "spr_guardian_stance", prereqs: ["spr_zone_denial"] }]),
       tier(5, 10, [{ id: "spr_eternal_vigil", prereqs: ["spr_guardian_stance", "spr_covering_strike"] }])]),
  ],
  themeColor: "#887744", icon: "class_spearman",
};

// ══════════════════════════════════════════════════════════════════
// 6. BRUTE — Heavy hitter
// ══════════════════════════════════════════════════════════════════

const BRUTE: ClassDef = {
  id: "brute", name: "Brute",
  description: "A ferocious warrior who overwhelms enemies with raw power.",
  role: "Heavy melee DPS", category: "martial",
  tags: ["melee", "dps", "heavy"],
  baseStats: { hitpoints: 120, stamina: 100, mana: 10, resolve: 45, initiative: 35, meleeSkill: 50, rangedSkill: 25, dodge: 15, magicResist: 5, critChance: 8, critMultiplier: 1.7, movementPoints: 9 },
  statGrowth: { hitpoints: 9, meleeSkill: 3, critChance: 0.3, stamina: 3 },
  resources: [{ resourceId: "rage", maxOverride: 100 }],
  weaponFamilies: ["sword", "axe", "mace", "cleaver", "flail", "throwing", "dagger"],
  shieldAccess: "none", maxArmorWeight: "medium", baseMP: 9,
  innatePassives: [{ type: "damage_type_bonus", params: { qualifier: "2H", bonusPercent: 15 } }],
  archetypes: [
    arch("brute_ravager", "Ravager", "A whirlwind of destruction.", "Builds Rage from dealing damage, spends it on devastating attacks.", ["melee", "aoe", "rage"], ["brute_juggernaut"],
      [tier(1, 1, [{ id: "brt_cleave" }, { id: "brt_bloodlust" }, { id: "brt_rage_passive" }]),
       tier(2, 3, [{ id: "brt_rampage", prereqs: ["brt_cleave"] }, { id: "brt_frenzy", prereqs: ["brt_bloodlust"] }]),
       tier(3, 5, [{ id: "brt_execute", prereqs: ["brt_rampage"] }, { id: "brt_blood_frenzy", prereqs: ["brt_frenzy"] }]),
       tier(4, 8, [{ id: "brt_massacre", prereqs: ["brt_execute"] }]),
       tier(5, 10, [{ id: "brt_unstoppable_rage", prereqs: ["brt_massacre", "brt_blood_frenzy"] }])]),
    arch("brute_juggernaut", "Juggernaut", "An unstoppable force.", "Ignores CC, pushes through enemies, deals collision damage.", ["melee", "tank", "cc_immune"], ["brute_ravager"],
      [tier(1, 1, [{ id: "brt_shoulder_charge" }, { id: "brt_thick_skin" }, { id: "brt_intimidate" }]),
       tier(2, 3, [{ id: "brt_trample", prereqs: ["brt_shoulder_charge"] }, { id: "brt_iron_jaw", prereqs: ["brt_thick_skin"] }]),
       tier(3, 5, [{ id: "brt_earthquake_slam", prereqs: ["brt_trample"] }, { id: "brt_fearless", prereqs: ["brt_intimidate"] }]),
       tier(4, 8, [{ id: "brt_colossus", prereqs: ["brt_earthquake_slam"] }]),
       tier(5, 10, [{ id: "brt_world_breaker", prereqs: ["brt_colossus", "brt_fearless"] }])]),
    arch("brute_pit_fighter", "Pit Fighter", "A savage who fights dirtier as HP drops.", "Gains damage and crit the lower HP gets.", ["melee", "risk_reward", "dps"], ["brute_ravager"],
      [tier(1, 1, [{ id: "brt_headbutt" }, { id: "brt_adrenaline" }, { id: "brt_pain_threshold" }]),
       tier(2, 3, [{ id: "brt_savage_blow", prereqs: ["brt_headbutt"] }, { id: "brt_second_wind", prereqs: ["brt_adrenaline"] }]),
       tier(3, 5, [{ id: "brt_desperate_strike", prereqs: ["brt_savage_blow"] }, { id: "brt_undying_fury", prereqs: ["brt_pain_threshold"] }]),
       tier(4, 8, [{ id: "brt_death_wish", prereqs: ["brt_desperate_strike"] }]),
       tier(5, 10, [{ id: "brt_last_breath", prereqs: ["brt_death_wish", "brt_undying_fury"] }])]),
  ],
  themeColor: "#884422", icon: "class_brute",
};

// ══════════════════════════════════════════════════════════════════
// 7. OCCULTIST — Dark magic DPS
// ══════════════════════════════════════════════════════════════════

const OCCULTIST: ClassDef = {
  id: "occultist", name: "Occultist",
  description: "A dark sorcerer who wields forbidden magic at a cost.",
  role: "Ranged magical DPS", category: "magical",
  tags: ["ranged", "magic", "dark", "dps"],
  baseStats: { hitpoints: 75, stamina: 60, mana: 120, resolve: 35, initiative: 40, meleeSkill: 25, rangedSkill: 55, dodge: 20, magicResist: 15, critChance: 6, critMultiplier: 1.6, movementPoints: 9 },
  statGrowth: { hitpoints: 4, mana: 8, rangedSkill: 3, magicResist: 1, critChance: 0.4 },
  resources: [{ resourceId: "mana", maxOverride: 120 }, { resourceId: "corruption", maxOverride: 100 }],
  weaponFamilies: ["wand", "staff", "dagger"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 9,
  innatePassives: [{ type: "damage_type_bonus", params: { damageType: "magical", bonusPercent: 15 } }],
  archetypes: [
    arch("occ_void_caller", "Void Caller", "Channels the void between worlds.", "Deals massive AoE dark damage, builds Corruption.", ["dark", "aoe", "dps"], ["occ_blood_mage"],
      [tier(1, 1, [{ id: "occ_void_bolt" }, { id: "occ_dark_pact" }, { id: "occ_corruption_passive" }]),
       tier(2, 3, [{ id: "occ_void_rift", prereqs: ["occ_void_bolt"] }, { id: "occ_shadow_drain", prereqs: ["occ_dark_pact"] }]),
       tier(3, 5, [{ id: "occ_nether_storm", prereqs: ["occ_void_rift"] }, { id: "occ_dark_bargain", prereqs: ["occ_shadow_drain"] }]),
       tier(4, 8, [{ id: "occ_oblivion", prereqs: ["occ_nether_storm"] }]),
       tier(5, 10, [{ id: "occ_apocalypse", prereqs: ["occ_oblivion", "occ_dark_bargain"] }])]),
    arch("occ_blood_mage", "Blood Mage", "Uses HP as a magical resource.", "Sacrifices health for powerful spells.", ["dark", "self_damage", "dps"], ["occ_void_caller"],
      [tier(1, 1, [{ id: "occ_blood_bolt" }, { id: "occ_life_tap" }, { id: "occ_blood_shield" }]),
       tier(2, 3, [{ id: "occ_hemorrhage", prereqs: ["occ_blood_bolt"] }, { id: "occ_sanguine_power", prereqs: ["occ_life_tap"] }]),
       tier(3, 5, [{ id: "occ_blood_nova", prereqs: ["occ_hemorrhage"] }, { id: "occ_crimson_pact", prereqs: ["occ_sanguine_power"] }]),
       tier(4, 8, [{ id: "occ_exsanguinate", prereqs: ["occ_blood_nova"] }]),
       tier(5, 10, [{ id: "occ_river_of_blood", prereqs: ["occ_exsanguinate", "occ_crimson_pact"] }])]),
    arch("occ_hexer", "Hexer", "Curses enemies with debilitating hexes.", "Stacks debuffs that synergize with each other.", ["dark", "debuff", "control"], ["occ_void_caller"],
      [tier(1, 1, [{ id: "occ_hex_of_weakness" }, { id: "occ_curse_bolt" }, { id: "occ_evil_eye" }]),
       tier(2, 3, [{ id: "occ_hex_of_agony", prereqs: ["occ_hex_of_weakness"] }, { id: "occ_doom", prereqs: ["occ_curse_bolt"] }]),
       tier(3, 5, [{ id: "occ_hex_chain", prereqs: ["occ_hex_of_agony"] }, { id: "occ_voodoo", prereqs: ["occ_evil_eye"] }]),
       tier(4, 8, [{ id: "occ_mass_curse", prereqs: ["occ_hex_chain"] }]),
       tier(5, 10, [{ id: "occ_damnation", prereqs: ["occ_mass_curse", "occ_voodoo"] }])]),
  ],
  themeColor: "#442266", icon: "class_occultist",
};

// ══════════════════════════════════════════════════════════════════
// 8. PRIEST — Healer / support
// ══════════════════════════════════════════════════════════════════

const PRIEST: ClassDef = {
  id: "priest", name: "Priest",
  description: "A devout healer who channels divine light to protect and restore.",
  role: "Healer / Support", category: "magical",
  tags: ["support", "heal", "holy"],
  baseStats: { hitpoints: 85, stamina: 80, mana: 100, resolve: 55, initiative: 35, meleeSkill: 30, rangedSkill: 45, dodge: 15, magicResist: 20, critChance: 3, critMultiplier: 1.3, movementPoints: 8 },
  statGrowth: { hitpoints: 5, mana: 6, resolve: 2, magicResist: 2 },
  resources: [{ resourceId: "mana", maxOverride: 100 }, { resourceId: "faith", maxOverride: 100 }],
  weaponFamilies: ["staff", "mace", "wand"],
  shieldAccess: "buckler", maxArmorWeight: "medium", baseMP: 8,
  innatePassives: [{ type: "weapon_proficiency", params: { family: "staff", apDiscount: 1 } }],
  archetypes: [
    arch("priest_healer", "Divine Healer", "Channels pure healing light.", "Heals allies, builds Faith for powerful miracles.", ["heal", "support", "holy"], ["priest_smiter"],
      [tier(1, 1, [{ id: "pri_heal" }, { id: "pri_bless" }, { id: "pri_faith_passive" }]),
       tier(2, 3, [{ id: "pri_greater_heal", prereqs: ["pri_heal"] }, { id: "pri_shield_of_faith", prereqs: ["pri_bless"] }]),
       tier(3, 5, [{ id: "pri_mass_heal", prereqs: ["pri_greater_heal"] }, { id: "pri_divine_grace", prereqs: ["pri_shield_of_faith"] }]),
       tier(4, 8, [{ id: "pri_resurrection", prereqs: ["pri_mass_heal"] }]),
       tier(5, 10, [{ id: "pri_miracle", prereqs: ["pri_resurrection", "pri_divine_grace"] }])]),
    arch("priest_smiter", "Smiter", "Channels righteous fury against the wicked.", "Offensive priest who deals holy damage.", ["holy", "dps", "ranged"], ["priest_healer"],
      [tier(1, 1, [{ id: "pri_smite" }, { id: "pri_holy_fire" }, { id: "pri_zealot_passive" }]),
       tier(2, 3, [{ id: "pri_divine_wrath", prereqs: ["pri_smite"] }, { id: "pri_pillar_of_light", prereqs: ["pri_holy_fire"] }]),
       tier(3, 5, [{ id: "pri_holy_lance", prereqs: ["pri_divine_wrath"] }, { id: "pri_consecrated_ground", prereqs: ["pri_pillar_of_light"] }]),
       tier(4, 8, [{ id: "pri_judgment", prereqs: ["pri_holy_lance"] }]),
       tier(5, 10, [{ id: "pri_divine_storm", prereqs: ["pri_judgment", "pri_consecrated_ground"] }])]),
    arch("priest_warden", "Warden of Light", "Shields allies with holy barriers.", "Creates protective zones and absorb shields.", ["shield", "zone", "support"], ["priest_healer"],
      [tier(1, 1, [{ id: "pri_ward" }, { id: "pri_sanctuary" }, { id: "pri_fortitude" }]),
       tier(2, 3, [{ id: "pri_holy_shield", prereqs: ["pri_ward"] }, { id: "pri_hallowed_ground", prereqs: ["pri_sanctuary"] }]),
       tier(3, 5, [{ id: "pri_aegis", prereqs: ["pri_holy_shield"] }, { id: "pri_purification", prereqs: ["pri_hallowed_ground"] }]),
       tier(4, 8, [{ id: "pri_divine_barrier", prereqs: ["pri_aegis"] }]),
       tier(5, 10, [{ id: "pri_impenetrable_light", prereqs: ["pri_divine_barrier", "pri_purification"] }])]),
  ],
  themeColor: "#eeeeaa", icon: "class_priest",
};

// ══════════════════════════════════════════════════════════════════
// 9. PYROMANCER — Fire AoE DPS
// ══════════════════════════════════════════════════════════════════

const PYROMANCER: ClassDef = {
  id: "pyromancer", name: "Pyromancer",
  description: "A master of destructive fire magic who trades defense for overwhelming offensive power.",
  role: "Ranged DPS / AoE specialist", category: "magical",
  tags: ["fire", "aoe", "dps", "ranged"],
  baseStats: { hitpoints: 80, stamina: 40, mana: 120, resolve: 40, initiative: 35, meleeSkill: 20, rangedSkill: 65, dodge: 20, magicResist: 15, critChance: 8, critMultiplier: 1.5, movementPoints: 6 },
  statGrowth: { hitpoints: 4, mana: 8, rangedSkill: 3, magicResist: 1, critChance: 0.5 },
  resources: [{ resourceId: "mana", maxOverride: 120 }, { resourceId: "heat", maxOverride: 100 }],
  weaponFamilies: ["staff", "wand"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 6,
  innatePassives: [
    { type: "damage_type_bonus", params: { damageType: "fire", bonusPercent: 15 } },
    { type: "resistance", params: { damageType: "fire", resistPercent: 25 } },
  ],
  archetypes: [
    arch("pyro_flame_dancer", "Flame Dancer", "An agile pyromaniac who weaves through combat.", "Mobile fire DPS that builds Heat to unlock powerful finishers.", ["fire", "mobile", "dps"], ["pyro_inferno_lord"],
      [tier(1, 1, [{ id: "pyro_fire_bolt" }, { id: "pyro_flame_step" }, { id: "pyro_heat_passive" }]),
       tier(2, 3, [{ id: "pyro_fire_trail", prereqs: ["pyro_flame_step"] }, { id: "pyro_scorch", prereqs: ["pyro_fire_bolt"] }]),
       tier(3, 5, [{ id: "pyro_heat_wave", prereqs: ["pyro_scorch"] }, { id: "pyro_fire_dance", prereqs: ["pyro_fire_trail"] }]),
       tier(4, 8, [{ id: "pyro_immolate", prereqs: ["pyro_heat_wave"] }]),
       tier(5, 10, [{ id: "pyro_phoenix_rush", prereqs: ["pyro_immolate", "pyro_fire_dance"] }])]),
    arch("pyro_inferno_lord", "Inferno Lord", "A devastating AoE caster who creates massive fire zones.", "Stationary zone controller that dominates with persistent fire.", ["fire", "aoe", "zone"], ["pyro_flame_dancer"],
      [tier(1, 1, [{ id: "pyro_fireball" }, { id: "pyro_fire_field" }, { id: "pyro_burn_mastery" }]),
       tier(2, 3, [{ id: "pyro_flame_wall", prereqs: ["pyro_fire_field"] }, { id: "pyro_ember_rain", prereqs: ["pyro_fireball"] }]),
       tier(3, 5, [{ id: "pyro_conflagration", prereqs: ["pyro_flame_wall"] }, { id: "pyro_fire_storm", prereqs: ["pyro_ember_rain"] }]),
       tier(4, 8, [{ id: "pyro_volcanic_eruption", prereqs: ["pyro_conflagration"] }]),
       tier(5, 10, [{ id: "pyro_world_burn", prereqs: ["pyro_volcanic_eruption", "pyro_fire_storm"] }])]),
    arch("pyro_ash_phoenix", "Ash Phoenix", "A resilient fire mage who channels self-destruction and rebirth.", "Risk-reward caster that uses HP as a resource and can revive.", ["fire", "risk_reward", "self_damage"], ["pyro_flame_dancer"],
      [tier(1, 1, [{ id: "pyro_ash_bolt" }, { id: "pyro_ember_shield" }, { id: "pyro_phoenix_passive" }]),
       tier(2, 3, [{ id: "pyro_self_immolate", prereqs: ["pyro_ash_bolt"] }, { id: "pyro_ash_form", prereqs: ["pyro_ember_shield"] }]),
       tier(3, 5, [{ id: "pyro_burning_sacrifice", prereqs: ["pyro_self_immolate"] }, { id: "pyro_phoenix_stance", prereqs: ["pyro_ash_form"] }]),
       tier(4, 8, [{ id: "pyro_death_fire", prereqs: ["pyro_burning_sacrifice"] }]),
       tier(5, 10, [{ id: "pyro_phoenix_rebirth", prereqs: ["pyro_death_fire", "pyro_phoenix_stance"] }])]),
  ],
  themeColor: "#ff4400", icon: "class_pyromancer",
};

// ══════════════════════════════════════════════════════════════════
// 10. NECROMANCER — Summon / DoT
// ══════════════════════════════════════════════════════════════════

const NECROMANCER: ClassDef = {
  id: "necromancer", name: "Necromancer",
  description: "A dark mage who commands the dead and drains life from the living.",
  role: "Summoner / DoT DPS", category: "magical",
  tags: ["dark", "summon", "dot", "ranged"],
  baseStats: { hitpoints: 70, stamina: 50, mana: 110, resolve: 30, initiative: 35, meleeSkill: 20, rangedSkill: 55, dodge: 15, magicResist: 15, critChance: 5, critMultiplier: 1.4, movementPoints: 7 },
  statGrowth: { hitpoints: 4, mana: 8, rangedSkill: 3, magicResist: 1 },
  resources: [{ resourceId: "mana", maxOverride: 110 }, { resourceId: "souls", maxOverride: 20 }],
  weaponFamilies: ["staff", "wand", "dagger"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 7,
  innatePassives: [{ type: "damage_type_bonus", params: { damageType: "magical", bonusPercent: 10 } }],
  archetypes: [
    arch("nec_reanimator", "Reanimator", "Raises the dead to fight.", "Summons undead minions from corpses.", ["summon", "dark", "control"], ["nec_soul_reaper"],
      [tier(1, 1, [{ id: "nec_raise_skeleton" }, { id: "nec_dark_bolt" }, { id: "nec_soul_harvest" }]),
       tier(2, 3, [{ id: "nec_raise_zombie", prereqs: ["nec_raise_skeleton"] }, { id: "nec_corpse_explosion", prereqs: ["nec_dark_bolt"] }]),
       tier(3, 5, [{ id: "nec_skeletal_army", prereqs: ["nec_raise_zombie"] }, { id: "nec_death_aura", prereqs: ["nec_soul_harvest"] }]),
       tier(4, 8, [{ id: "nec_bone_golem", prereqs: ["nec_skeletal_army"] }]),
       tier(5, 10, [{ id: "nec_army_of_darkness", prereqs: ["nec_bone_golem", "nec_death_aura"] }])]),
    arch("nec_soul_reaper", "Soul Reaper", "Harvests souls for dark rituals.", "Drains life and collects Souls to power devastating spells.", ["dark", "drain", "dps"], ["nec_reanimator"],
      [tier(1, 1, [{ id: "nec_soul_drain" }, { id: "nec_wither" }, { id: "nec_reap_passive" }]),
       tier(2, 3, [{ id: "nec_life_siphon", prereqs: ["nec_soul_drain"] }, { id: "nec_blight", prereqs: ["nec_wither"] }]),
       tier(3, 5, [{ id: "nec_soul_rend", prereqs: ["nec_life_siphon"] }, { id: "nec_plague", prereqs: ["nec_blight"] }]),
       tier(4, 8, [{ id: "nec_death_sentence", prereqs: ["nec_soul_rend"] }]),
       tier(5, 10, [{ id: "nec_grim_harvest", prereqs: ["nec_death_sentence", "nec_plague"] }])]),
    arch("nec_lich", "Lich Aspirant", "Seeks immortality through dark arts.", "Transforms into a lich form with immense power.", ["dark", "transformation", "dps"], ["nec_reanimator"],
      [tier(1, 1, [{ id: "nec_bone_armor" }, { id: "nec_phylactery" }, { id: "nec_dark_knowledge" }]),
       tier(2, 3, [{ id: "nec_necrotic_shield", prereqs: ["nec_bone_armor"] }, { id: "nec_soul_cage", prereqs: ["nec_phylactery"] }]),
       tier(3, 5, [{ id: "nec_death_magic", prereqs: ["nec_dark_knowledge"] }, { id: "nec_undying", prereqs: ["nec_necrotic_shield"] }]),
       tier(4, 8, [{ id: "nec_lich_form", prereqs: ["nec_death_magic"] }]),
       tier(5, 10, [{ id: "nec_master_of_death", prereqs: ["nec_lich_form", "nec_soul_cage"] }])]),
  ],
  themeColor: "#226644", icon: "class_necromancer",
};

// ══════════════════════════════════════════════════════════════════
// 11. SHADOW KNIGHT — Melee/magic hybrid
// ══════════════════════════════════════════════════════════════════

const SHADOW_KNIGHT: ClassDef = {
  id: "shadow_knight", name: "Shadow Knight",
  description: "A dark warrior who infuses melee attacks with shadow magic.",
  role: "Melee / Magic hybrid", category: "hybrid",
  tags: ["melee", "magic", "dark", "hybrid"],
  baseStats: { hitpoints: 100, stamina: 80, mana: 80, resolve: 45, initiative: 40, meleeSkill: 50, rangedSkill: 40, dodge: 25, magicResist: 10, critChance: 7, critMultiplier: 1.6, movementPoints: 8 },
  statGrowth: { hitpoints: 7, mana: 5, meleeSkill: 2, rangedSkill: 2, magicResist: 1 },
  resources: [{ resourceId: "mana", maxOverride: 80 }, { resourceId: "shadow", maxOverride: 100 }],
  weaponFamilies: ["sword", "dagger"],
  shieldAccess: "buckler", maxArmorWeight: "medium", baseMP: 8,
  innatePassives: [{ type: "damage_type_bonus", params: { qualifier: "2H", bonusPercent: 10 } }],
  archetypes: [
    arch("sk_void_blade", "Void Blade", "Channels darkness through melee strikes.", "Shadow-empowered melee attacks that build Shadow.", ["melee", "shadow", "dps"], ["sk_nightstalker"],
      [tier(1, 1, [{ id: "sk_shadow_strike" }, { id: "sk_dark_blade" }, { id: "sk_shadow_passive" }]),
       tier(2, 3, [{ id: "sk_void_slash", prereqs: ["sk_shadow_strike"] }, { id: "sk_shadow_armor", prereqs: ["sk_dark_blade"] }]),
       tier(3, 5, [{ id: "sk_dark_execution", prereqs: ["sk_void_slash"] }, { id: "sk_shadow_cloak", prereqs: ["sk_shadow_armor"] }]),
       tier(4, 8, [{ id: "sk_void_rift", prereqs: ["sk_dark_execution"] }]),
       tier(5, 10, [{ id: "sk_abyssal_annihilation", prereqs: ["sk_void_rift", "sk_shadow_cloak"] }])]),
    arch("sk_nightstalker", "Nightstalker", "Teleports through shadows.", "Extreme mobility using shadow teleportation.", ["mobile", "shadow", "melee"], ["sk_void_blade"],
      [tier(1, 1, [{ id: "sk_shadow_step" }, { id: "sk_dark_rush" }, { id: "sk_night_vision" }]),
       tier(2, 3, [{ id: "sk_blink_strike", prereqs: ["sk_shadow_step"] }, { id: "sk_phantom_dash", prereqs: ["sk_dark_rush"] }]),
       tier(3, 5, [{ id: "sk_shadow_dance", prereqs: ["sk_blink_strike"] }, { id: "sk_dark_pursuit", prereqs: ["sk_phantom_dash"] }]),
       tier(4, 8, [{ id: "sk_dimension_cut", prereqs: ["sk_shadow_dance"] }]),
       tier(5, 10, [{ id: "sk_void_walker", prereqs: ["sk_dimension_cut", "sk_dark_pursuit"] }])]),
    arch("sk_death_knight", "Death Knight", "An armored shadow warrior.", "Heavy armor shadow knight who drains life.", ["tank", "shadow", "drain"], ["sk_void_blade"],
      [tier(1, 1, [{ id: "sk_death_strike" }, { id: "sk_dark_plate" }, { id: "sk_soul_leech" }]),
       tier(2, 3, [{ id: "sk_necrotic_blade", prereqs: ["sk_death_strike"] }, { id: "sk_bone_shield", prereqs: ["sk_dark_plate"] }]),
       tier(3, 5, [{ id: "sk_death_grip", prereqs: ["sk_necrotic_blade"] }, { id: "sk_unholy_aura", prereqs: ["sk_soul_leech"] }]),
       tier(4, 8, [{ id: "sk_army_of_one", prereqs: ["sk_death_grip"] }]),
       tier(5, 10, [{ id: "sk_horseman_of_death", prereqs: ["sk_army_of_one", "sk_unholy_aura"] }])]),
  ],
  themeColor: "#332244", icon: "class_shadow_knight",
};

// ══════════════════════════════════════════════════════════════════
// 12. MONK — Mobile melee
// ══════════════════════════════════════════════════════════════════

const MONK: ClassDef = {
  id: "monk", name: "Monk",
  description: "A martial artist who harnesses inner energy for devastating unarmed strikes.",
  role: "Mobile melee DPS", category: "martial",
  tags: ["melee", "mobile", "martial_arts"],
  baseStats: { hitpoints: 90, stamina: 80, mana: 30, resolve: 55, initiative: 55, meleeSkill: 55, rangedSkill: 20, dodge: 40, magicResist: 15, critChance: 8, critMultiplier: 1.6, movementPoints: 11 },
  statGrowth: { hitpoints: 6, dodge: 2, meleeSkill: 3, critChance: 0.4 },
  resources: [{ resourceId: "chi", maxOverride: 10 }, { resourceId: "focus", maxOverride: 100 }],
  weaponFamilies: ["dagger", "staff"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 11,
  innatePassives: [{ type: "stat_bonus", params: { stat: "hit", qualifier: "dagger", value: 10 } }],
  archetypes: [
    arch("monk_wind_fist", "Wind Fist", "Strikes with blinding speed.", "Rapid attacks that build Chi for powerful finishers.", ["melee", "speed", "combo"], ["monk_iron_body"],
      [tier(1, 1, [{ id: "mnk_flurry" }, { id: "mnk_wind_step" }, { id: "mnk_chi_passive" }]),
       tier(2, 3, [{ id: "mnk_palm_strike", prereqs: ["mnk_flurry"] }, { id: "mnk_swift_kick", prereqs: ["mnk_wind_step"] }]),
       tier(3, 5, [{ id: "mnk_hundred_fists", prereqs: ["mnk_palm_strike"] }, { id: "mnk_flying_kick", prereqs: ["mnk_swift_kick"] }]),
       tier(4, 8, [{ id: "mnk_dragon_punch", prereqs: ["mnk_hundred_fists"] }]),
       tier(5, 10, [{ id: "mnk_fist_of_the_north", prereqs: ["mnk_dragon_punch", "mnk_flying_kick"] }])]),
    arch("monk_iron_body", "Iron Body", "Hardens the body to withstand any blow.", "Defensive monk who becomes harder to kill each turn.", ["tank", "martial", "passive"], ["monk_wind_fist"],
      [tier(1, 1, [{ id: "mnk_iron_palm" }, { id: "mnk_stone_stance" }, { id: "mnk_inner_peace" }]),
       tier(2, 3, [{ id: "mnk_diamond_body", prereqs: ["mnk_stone_stance"] }, { id: "mnk_counter_strike", prereqs: ["mnk_iron_palm"] }]),
       tier(3, 5, [{ id: "mnk_iron_skin", prereqs: ["mnk_diamond_body"] }, { id: "mnk_redirect_force", prereqs: ["mnk_counter_strike"] }]),
       tier(4, 8, [{ id: "mnk_unbreakable", prereqs: ["mnk_iron_skin"] }]),
       tier(5, 10, [{ id: "mnk_one_with_stone", prereqs: ["mnk_unbreakable", "mnk_redirect_force"] }])]),
    arch("monk_zen_master", "Zen Master", "Channels spiritual energy.", "Healing and support through chi manipulation.", ["support", "heal", "chi"], ["monk_wind_fist"],
      [tier(1, 1, [{ id: "mnk_meditation" }, { id: "mnk_chi_wave" }, { id: "mnk_tranquility" }]),
       tier(2, 3, [{ id: "mnk_healing_touch", prereqs: ["mnk_chi_wave"] }, { id: "mnk_spirit_bond", prereqs: ["mnk_meditation"] }]),
       tier(3, 5, [{ id: "mnk_chi_burst", prereqs: ["mnk_healing_touch"] }, { id: "mnk_zen_aura", prereqs: ["mnk_spirit_bond"] }]),
       tier(4, 8, [{ id: "mnk_enlightenment", prereqs: ["mnk_chi_burst"] }]),
       tier(5, 10, [{ id: "mnk_nirvana", prereqs: ["mnk_enlightenment", "mnk_zen_aura"] }])]),
  ],
  themeColor: "#44aaaa", icon: "class_monk",
};

// ══════════════════════════════════════════════════════════════════
// 13. BARD — Buff / debuff support
// ══════════════════════════════════════════════════════════════════

const BARD: ClassDef = {
  id: "bard", name: "Bard",
  description: "A charismatic performer who empowers allies and demoralizes foes through song.",
  role: "Buffer / Debuffer", category: "support",
  tags: ["support", "buff", "debuff", "aura"],
  baseStats: { hitpoints: 80, stamina: 80, mana: 90, resolve: 50, initiative: 45, meleeSkill: 35, rangedSkill: 40, dodge: 30, magicResist: 10, critChance: 5, critMultiplier: 1.4, movementPoints: 9 },
  statGrowth: { hitpoints: 5, mana: 5, resolve: 2, dodge: 1 },
  resources: [{ resourceId: "mana", maxOverride: 90 }, { resourceId: "inspiration", maxOverride: 100 }],
  weaponFamilies: ["dagger", "sword", "wand"],
  shieldAccess: "buckler", maxArmorWeight: "light", baseMP: 9,
  innatePassives: [],
  archetypes: [
    arch("bard_war_chanter", "War Chanter", "Inspires allies with battle hymns.", "Aura buffs that boost nearby ally stats.", ["buff", "aura", "support"], ["bard_dirge_singer"],
      [tier(1, 1, [{ id: "brd_inspiring_melody" }, { id: "brd_war_cry" }, { id: "brd_rhythm_passive" }]),
       tier(2, 3, [{ id: "brd_battle_hymn", prereqs: ["brd_inspiring_melody"] }, { id: "brd_anthem_of_valor", prereqs: ["brd_war_cry"] }]),
       tier(3, 5, [{ id: "brd_crescendo", prereqs: ["brd_battle_hymn"] }, { id: "brd_rallying_song", prereqs: ["brd_anthem_of_valor"] }]),
       tier(4, 8, [{ id: "brd_heroic_ballad", prereqs: ["brd_crescendo"] }]),
       tier(5, 10, [{ id: "brd_symphony_of_war", prereqs: ["brd_heroic_ballad", "brd_rallying_song"] }])]),
    arch("bard_dirge_singer", "Dirge Singer", "Demoralizes enemies with haunting melodies.", "Debuff songs that weaken enemy groups.", ["debuff", "aura", "control"], ["bard_war_chanter"],
      [tier(1, 1, [{ id: "brd_discordant_note" }, { id: "brd_lullaby" }, { id: "brd_dissonance" }]),
       tier(2, 3, [{ id: "brd_song_of_sorrow", prereqs: ["brd_discordant_note"] }, { id: "brd_charm", prereqs: ["brd_lullaby"] }]),
       tier(3, 5, [{ id: "brd_dirge_of_doom", prereqs: ["brd_song_of_sorrow"] }, { id: "brd_cacophony", prereqs: ["brd_dissonance"] }]),
       tier(4, 8, [{ id: "brd_mass_confusion", prereqs: ["brd_dirge_of_doom"] }]),
       tier(5, 10, [{ id: "brd_song_of_oblivion", prereqs: ["brd_mass_confusion", "brd_charm"] }])]),
    arch("bard_blade_dancer", "Blade Dancer", "A performing warrior who fights with flair.", "Melee bard who gains Inspiration from flashy attacks.", ["melee", "dps", "mobile"], ["bard_war_chanter"],
      [tier(1, 1, [{ id: "brd_flourish" }, { id: "brd_quick_step" }, { id: "brd_showmanship" }]),
       tier(2, 3, [{ id: "brd_dashing_strike", prereqs: ["brd_flourish"] }, { id: "brd_distracting_dance", prereqs: ["brd_quick_step"] }]),
       tier(3, 5, [{ id: "brd_whirling_performance", prereqs: ["brd_dashing_strike"] }, { id: "brd_encore", prereqs: ["brd_showmanship"] }]),
       tier(4, 8, [{ id: "brd_grand_finale", prereqs: ["brd_whirling_performance"] }]),
       tier(5, 10, [{ id: "brd_standing_ovation", prereqs: ["brd_grand_finale", "brd_encore"] }])]),
  ],
  themeColor: "#cc66cc", icon: "class_bard",
};

// ══════════════════════════════════════════════════════════════════
// 14. BERSERKER — Self-damage risk/reward
// ══════════════════════════════════════════════════════════════════

const BERSERKER: ClassDef = {
  id: "berserker", name: "Berserker",
  description: "A frenzied warrior who grows stronger as they bleed.",
  role: "Risk / Reward melee DPS", category: "martial",
  tags: ["melee", "risk_reward", "self_damage", "dps"],
  baseStats: { hitpoints: 130, stamina: 80, mana: 10, resolve: 30, initiative: 45, meleeSkill: 55, rangedSkill: 20, dodge: 15, magicResist: 5, critChance: 10, critMultiplier: 1.8, movementPoints: 9 },
  statGrowth: { hitpoints: 10, meleeSkill: 3, critChance: 0.5 },
  resources: [{ resourceId: "rage", maxOverride: 100 }, { resourceId: "blood", maxOverride: 100 }],
  weaponFamilies: ["axe", "sword", "mace", "cleaver", "flail"],
  shieldAccess: "none", maxArmorWeight: "medium", baseMP: 9,
  innatePassives: [{ type: "damage_type_bonus", params: { qualifier: "2H", bonusPercent: 20 } }],
  archetypes: [
    arch("ber_blood_frenzy", "Blood Frenzy", "Grows stronger as HP drops.", "Damage and crit scale inversely with HP.", ["melee", "self_damage", "dps"], ["ber_deathseeker"],
      [tier(1, 1, [{ id: "ber_reckless_swing" }, { id: "ber_blood_rage" }, { id: "ber_pain_fuel" }]),
       tier(2, 3, [{ id: "ber_blood_strike", prereqs: ["ber_reckless_swing"] }, { id: "ber_self_wound", prereqs: ["ber_blood_rage"] }]),
       tier(3, 5, [{ id: "ber_berserk", prereqs: ["ber_blood_strike"] }, { id: "ber_crimson_fury", prereqs: ["ber_self_wound"] }]),
       tier(4, 8, [{ id: "ber_blood_bath", prereqs: ["ber_berserk"] }]),
       tier(5, 10, [{ id: "ber_avatar_of_carnage", prereqs: ["ber_blood_bath", "ber_crimson_fury"] }])]),
    arch("ber_deathseeker", "Deathseeker", "Seeks glorious death in battle.", "Gets massive bonuses near death, can survive lethal damage.", ["melee", "risk_reward", "unkillable"], ["ber_blood_frenzy"],
      [tier(1, 1, [{ id: "ber_defiant_roar" }, { id: "ber_spite" }, { id: "ber_death_wish" }]),
       tier(2, 3, [{ id: "ber_undying", prereqs: ["ber_defiant_roar"] }, { id: "ber_rage_beyond_death", prereqs: ["ber_spite"] }]),
       tier(3, 5, [{ id: "ber_death_pact", prereqs: ["ber_undying"] }, { id: "ber_final_stand", prereqs: ["ber_death_wish"] }]),
       tier(4, 8, [{ id: "ber_cheat_death", prereqs: ["ber_death_pact"] }]),
       tier(5, 10, [{ id: "ber_immortal_rage", prereqs: ["ber_cheat_death", "ber_final_stand"] }])]),
    arch("ber_warchief", "Warchief", "Inspires frenzy in nearby allies.", "Spreads rage buffs to the party.", ["melee", "support", "aura"], ["ber_blood_frenzy"],
      [tier(1, 1, [{ id: "ber_war_shout" }, { id: "ber_bloodlust_aura" }, { id: "ber_tribal_fury" }]),
       tier(2, 3, [{ id: "ber_inspiring_rage", prereqs: ["ber_war_shout"] }, { id: "ber_frenzy_pulse", prereqs: ["ber_bloodlust_aura"] }]),
       tier(3, 5, [{ id: "ber_mass_frenzy", prereqs: ["ber_inspiring_rage"] }, { id: "ber_blood_bond", prereqs: ["ber_tribal_fury"] }]),
       tier(4, 8, [{ id: "ber_rage_totem", prereqs: ["ber_mass_frenzy"] }]),
       tier(5, 10, [{ id: "ber_waaagh", prereqs: ["ber_rage_totem", "ber_blood_bond"] }])]),
  ],
  themeColor: "#880000", icon: "class_berserker",
};

// ══════════════════════════════════════════════════════════════════
// 15. PALADIN — Tank / healer hybrid
// ══════════════════════════════════════════════════════════════════

const PALADIN: ClassDef = {
  id: "paladin", name: "Paladin",
  description: "A holy warrior who protects allies with divine shields and healing.",
  role: "Tank / Healer hybrid", category: "hybrid",
  tags: ["melee", "tank", "heal", "holy"],
  baseStats: { hitpoints: 115, stamina: 90, mana: 80, resolve: 60, initiative: 30, meleeSkill: 45, rangedSkill: 30, dodge: 15, magicResist: 20, critChance: 4, critMultiplier: 1.4, movementPoints: 7 },
  statGrowth: { hitpoints: 8, mana: 5, resolve: 2, magicResist: 2 },
  resources: [{ resourceId: "mana", maxOverride: 80 }, { resourceId: "faith", maxOverride: 100 }],
  weaponFamilies: ["sword", "mace"],
  shieldAccess: "all", maxArmorWeight: "heavy", baseMP: 7,
  innatePassives: [{ type: "armor_proficiency", params: { armorMPReduction: 1 } }],
  archetypes: [
    arch("pal_protector", "Protector", "Shields allies with holy barriers.", "Absorbs damage for allies, heals with Faith.", ["tank", "shield", "heal"], ["pal_avenger"],
      [tier(1, 1, [{ id: "pal_holy_shield" }, { id: "pal_lay_on_hands" }, { id: "pal_faith_passive" }]),
       tier(2, 3, [{ id: "pal_divine_protection", prereqs: ["pal_holy_shield"] }, { id: "pal_beacon_of_light", prereqs: ["pal_lay_on_hands"] }]),
       tier(3, 5, [{ id: "pal_aura_of_devotion", prereqs: ["pal_divine_protection"] }, { id: "pal_cleansing_light", prereqs: ["pal_beacon_of_light"] }]),
       tier(4, 8, [{ id: "pal_guardian_angel", prereqs: ["pal_aura_of_devotion"] }]),
       tier(5, 10, [{ id: "pal_divine_intervention", prereqs: ["pal_guardian_angel", "pal_cleansing_light"] }])]),
    arch("pal_avenger", "Avenger", "Punishes those who harm the innocent.", "Retribution damage, gains power when allies are hurt.", ["melee", "holy", "dps"], ["pal_protector"],
      [tier(1, 1, [{ id: "pal_righteous_strike" }, { id: "pal_judgment" }, { id: "pal_retribution" }]),
       tier(2, 3, [{ id: "pal_holy_wrath", prereqs: ["pal_righteous_strike"] }, { id: "pal_seal_of_vengeance", prereqs: ["pal_judgment"] }]),
       tier(3, 5, [{ id: "pal_avengers_shield", prereqs: ["pal_holy_wrath"] }, { id: "pal_divine_fury", prereqs: ["pal_seal_of_vengeance"] }]),
       tier(4, 8, [{ id: "pal_hammer_of_justice", prereqs: ["pal_avengers_shield"] }]),
       tier(5, 10, [{ id: "pal_hand_of_god", prereqs: ["pal_hammer_of_justice", "pal_divine_fury"] }])]),
    arch("pal_templar", "Templar", "A holy zone controller.", "Creates consecrated zones that heal allies and harm undead.", ["holy", "zone", "control"], ["pal_protector"],
      [tier(1, 1, [{ id: "pal_consecrate" }, { id: "pal_holy_ground" }, { id: "pal_sanctify" }]),
       tier(2, 3, [{ id: "pal_hallowed_circle", prereqs: ["pal_consecrate"] }, { id: "pal_seal_of_light", prereqs: ["pal_holy_ground"] }]),
       tier(3, 5, [{ id: "pal_divine_zone", prereqs: ["pal_hallowed_circle"] }, { id: "pal_purifying_flame", prereqs: ["pal_seal_of_light"] }]),
       tier(4, 8, [{ id: "pal_sanctuary", prereqs: ["pal_divine_zone"] }]),
       tier(5, 10, [{ id: "pal_heaven_on_earth", prereqs: ["pal_sanctuary", "pal_purifying_flame"] }])]),
  ],
  themeColor: "#ddcc44", icon: "class_paladin",
};

// ══════════════════════════════════════════════════════════════════
// 16. ELEMENTALIST — Multi-element mage
// ══════════════════════════════════════════════════════════════════

const ELEMENTALIST: ClassDef = {
  id: "elementalist", name: "Elementalist",
  description: "A master of all elements who shifts between fire, ice, and lightning.",
  role: "Versatile ranged DPS", category: "magical",
  tags: ["ranged", "magic", "versatile", "elemental"],
  baseStats: { hitpoints: 78, stamina: 50, mana: 130, resolve: 40, initiative: 38, meleeSkill: 20, rangedSkill: 60, dodge: 20, magicResist: 15, critChance: 6, critMultiplier: 1.5, movementPoints: 8 },
  statGrowth: { hitpoints: 4, mana: 10, rangedSkill: 3, magicResist: 1 },
  resources: [{ resourceId: "mana", maxOverride: 130 }, { resourceId: "harmony", maxOverride: 100 }],
  weaponFamilies: ["staff", "wand"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 8,
  innatePassives: [{ type: "damage_type_bonus", params: { damageType: "magical", bonusPercent: 15 } }],
  archetypes: [
    arch("ele_fire", "Flame Weaver", "Specializes in destructive fire.", "High damage, applies burn, excels at AoE.", ["fire", "aoe", "dps"], ["ele_ice"],
      [tier(1, 1, [{ id: "ele_flame_bolt" }, { id: "ele_ignite" }, { id: "ele_fire_mastery" }]),
       tier(2, 3, [{ id: "ele_meteor_shard", prereqs: ["ele_flame_bolt"] }, { id: "ele_fire_wall", prereqs: ["ele_ignite"] }]),
       tier(3, 5, [{ id: "ele_inferno", prereqs: ["ele_meteor_shard"] }, { id: "ele_pyroclasm", prereqs: ["ele_fire_wall"] }]),
       tier(4, 8, [{ id: "ele_firestorm", prereqs: ["ele_inferno"] }]),
       tier(5, 10, [{ id: "ele_cataclysm", prereqs: ["ele_firestorm", "ele_pyroclasm"] }])]),
    arch("ele_ice", "Frost Weaver", "Controls the battlefield with ice.", "Slows, freezes, and creates ice terrain.", ["ice", "control", "zone"], ["ele_fire"],
      [tier(1, 1, [{ id: "ele_frost_bolt" }, { id: "ele_chill" }, { id: "ele_ice_mastery" }]),
       tier(2, 3, [{ id: "ele_ice_lance", prereqs: ["ele_frost_bolt"] }, { id: "ele_frost_nova", prereqs: ["ele_chill"] }]),
       tier(3, 5, [{ id: "ele_blizzard", prereqs: ["ele_ice_lance"] }, { id: "ele_ice_wall", prereqs: ["ele_frost_nova"] }]),
       tier(4, 8, [{ id: "ele_absolute_zero", prereqs: ["ele_blizzard"] }]),
       tier(5, 10, [{ id: "ele_glacier", prereqs: ["ele_absolute_zero", "ele_ice_wall"] }])]),
    arch("ele_storm", "Storm Weaver", "Harnesses lightning and wind.", "Chain lightning, stuns, fast cast times.", ["lightning", "chain", "dps"], ["ele_fire"],
      [tier(1, 1, [{ id: "ele_spark" }, { id: "ele_gust" }, { id: "ele_storm_mastery" }]),
       tier(2, 3, [{ id: "ele_chain_lightning", prereqs: ["ele_spark"] }, { id: "ele_wind_wall", prereqs: ["ele_gust"] }]),
       tier(3, 5, [{ id: "ele_thunderbolt", prereqs: ["ele_chain_lightning"] }, { id: "ele_tornado", prereqs: ["ele_wind_wall"] }]),
       tier(4, 8, [{ id: "ele_storm_call", prereqs: ["ele_thunderbolt"] }]),
       tier(5, 10, [{ id: "ele_tempest", prereqs: ["ele_storm_call", "ele_tornado"] }])]),
  ],
  themeColor: "#4466dd", icon: "class_elementalist",
};

// ══════════════════════════════════════════════════════════════════
// 17. ASSASSIN — Single-target burst
// ══════════════════════════════════════════════════════════════════

const ASSASSIN: ClassDef = {
  id: "assassin", name: "Assassin",
  description: "A lethal killer who eliminates high-value targets with precision strikes.",
  role: "Single-target burst DPS", category: "martial",
  tags: ["melee", "stealth", "burst", "dps"],
  baseStats: { hitpoints: 75, stamina: 80, mana: 20, resolve: 30, initiative: 60, meleeSkill: 55, rangedSkill: 35, dodge: 45, magicResist: 5, critChance: 15, critMultiplier: 2.0, movementPoints: 10 },
  statGrowth: { hitpoints: 4, dodge: 2, meleeSkill: 3, critChance: 0.5 },
  resources: [{ resourceId: "combo_points", maxOverride: 5 }, { resourceId: "shadow", maxOverride: 100 }],
  weaponFamilies: ["dagger", "sword", "throwing"],
  shieldAccess: "none", maxArmorWeight: "light", baseMP: 10,
  innatePassives: [{ type: "weapon_proficiency", params: { family: "dagger", apDiscount: 1 } }],
  archetypes: [
    arch("asn_deathblade", "Deathblade", "A precise killer who targets vital points.", "Massive single-target damage from stealth.", ["stealth", "burst", "crit"], ["asn_shadow_arts"],
      [tier(1, 1, [{ id: "asn_ambush" }, { id: "asn_vital_strike" }, { id: "asn_lethal_passive" }]),
       tier(2, 3, [{ id: "asn_assassinate", prereqs: ["asn_ambush"] }, { id: "asn_cold_blood", prereqs: ["asn_vital_strike"] }]),
       tier(3, 5, [{ id: "asn_execution", prereqs: ["asn_assassinate"] }, { id: "asn_death_mark", prereqs: ["asn_cold_blood"] }]),
       tier(4, 8, [{ id: "asn_one_hit_kill", prereqs: ["asn_execution"] }]),
       tier(5, 10, [{ id: "asn_reaper", prereqs: ["asn_one_hit_kill", "asn_death_mark"] }])]),
    arch("asn_shadow_arts", "Shadow Arts", "Masters the art of invisibility.", "Extended stealth, multiple stealth attacks per ambush.", ["stealth", "mobile", "utility"], ["asn_deathblade"],
      [tier(1, 1, [{ id: "asn_stealth" }, { id: "asn_smoke_bomb" }, { id: "asn_shadow_passive" }]),
       tier(2, 3, [{ id: "asn_shadow_walk", prereqs: ["asn_stealth"] }, { id: "asn_blind", prereqs: ["asn_smoke_bomb"] }]),
       tier(3, 5, [{ id: "asn_shadow_clone", prereqs: ["asn_shadow_walk"] }, { id: "asn_vanishing_act", prereqs: ["asn_blind"] }]),
       tier(4, 8, [{ id: "asn_shadow_mastery", prereqs: ["asn_shadow_clone"] }]),
       tier(5, 10, [{ id: "asn_phantom_assassin", prereqs: ["asn_shadow_mastery", "asn_vanishing_act"] }])]),
    arch("asn_poisoner", "Poisoner", "Applies deadly toxins to weapons.", "Stacking poisons that deal increasing damage.", ["dot", "debuff", "poison"], ["asn_deathblade"],
      [tier(1, 1, [{ id: "asn_envenom" }, { id: "asn_toxic_blade" }, { id: "asn_poison_lore" }]),
       tier(2, 3, [{ id: "asn_paralytic_poison", prereqs: ["asn_envenom"] }, { id: "asn_viper_strike", prereqs: ["asn_toxic_blade"] }]),
       tier(3, 5, [{ id: "asn_neurotoxin", prereqs: ["asn_paralytic_poison"] }, { id: "asn_venomous_wounds", prereqs: ["asn_viper_strike"] }]),
       tier(4, 8, [{ id: "asn_plague_strike", prereqs: ["asn_neurotoxin"] }]),
       tier(5, 10, [{ id: "asn_death_blossom", prereqs: ["asn_plague_strike", "asn_venomous_wounds"] }])]),
  ],
  themeColor: "#333344", icon: "class_assassin",
};

// ══════════════════════════════════════════════════════════════════
// 18. WARDEN — Defensive support
// ══════════════════════════════════════════════════════════════════

const WARDEN: ClassDef = {
  id: "warden", name: "Warden",
  description: "A stalwart defender who protects the weak and controls the battlefield.",
  role: "Defensive support / Off-tank", category: "martial",
  tags: ["melee", "tank", "support", "control"],
  baseStats: { hitpoints: 120, stamina: 100, mana: 30, resolve: 55, initiative: 35, meleeSkill: 45, rangedSkill: 25, dodge: 20, magicResist: 10, critChance: 4, critMultiplier: 1.3, movementPoints: 8 },
  statGrowth: { hitpoints: 9, resolve: 2, meleeSkill: 2, magicResist: 1 },
  resources: [{ resourceId: "stamina", maxOverride: 100 }, { resourceId: "resolve_points", maxOverride: 5 }],
  weaponFamilies: ["sword", "mace", "spear", "polearm"],
  shieldAccess: "all", maxArmorWeight: "heavy", baseMP: 8,
  innatePassives: [{ type: "armor_proficiency", params: { armorMPReduction: 1 } }],
  archetypes: [
    arch("war_sentinel", "Sentinel", "Watches over allies from the front.", "Intercepts attacks aimed at allies, counter-attacks.", ["tank", "reactive", "support"], ["war_earthshaker"],
      [tier(1, 1, [{ id: "war_intercept" }, { id: "war_vigilant_stance" }, { id: "war_guardian_passive" }]),
       tier(2, 3, [{ id: "war_cover_ally", prereqs: ["war_intercept"] }, { id: "war_riposte", prereqs: ["war_vigilant_stance"] }]),
       tier(3, 5, [{ id: "war_stalwart_defense", prereqs: ["war_cover_ally"] }, { id: "war_retribution", prereqs: ["war_riposte"] }]),
       tier(4, 8, [{ id: "war_unassailable", prereqs: ["war_stalwart_defense"] }]),
       tier(5, 10, [{ id: "war_eternal_guardian", prereqs: ["war_unassailable", "war_retribution"] }])]),
    arch("war_earthshaker", "Earthshaker", "Commands the earth to disrupt enemies.", "AoE knockdowns, terrain modification.", ["melee", "aoe", "control"], ["war_sentinel"],
      [tier(1, 1, [{ id: "war_ground_slam" }, { id: "war_tremor" }, { id: "war_stone_skin" }]),
       tier(2, 3, [{ id: "war_fissure", prereqs: ["war_ground_slam"] }, { id: "war_rock_wall", prereqs: ["war_tremor"] }]),
       tier(3, 5, [{ id: "war_earthquake", prereqs: ["war_fissure"] }, { id: "war_stone_prison", prereqs: ["war_rock_wall"] }]),
       tier(4, 8, [{ id: "war_tectonic_shift", prereqs: ["war_earthquake"] }]),
       tier(5, 10, [{ id: "war_world_shaker", prereqs: ["war_tectonic_shift", "war_stone_prison"] }])]),
    arch("war_iron_curtain", "Iron Curtain", "Creates defensive formations.", "Zone-based defense that slows and weakens attackers.", ["tank", "zone", "aura"], ["war_sentinel"],
      [tier(1, 1, [{ id: "war_shield_wall" }, { id: "war_fortify" }, { id: "war_endurance" }]),
       tier(2, 3, [{ id: "war_iron_aura", prereqs: ["war_shield_wall"] }, { id: "war_stand_firm", prereqs: ["war_fortify"] }]),
       tier(3, 5, [{ id: "war_bulwark_zone", prereqs: ["war_iron_aura"] }, { id: "war_inspire_defense", prereqs: ["war_endurance"] }]),
       tier(4, 8, [{ id: "war_absolute_defense", prereqs: ["war_bulwark_zone"] }]),
       tier(5, 10, [{ id: "war_impregnable_fortress", prereqs: ["war_absolute_defense", "war_inspire_defense"] }])]),
  ],
  themeColor: "#888888", icon: "class_warden",
};

// ══════════════════════════════════════════════════════════════════
// Register all classes
// ══════════════════════════════════════════════════════════════════

const ALL_CLASSES: ClassDef[] = [
  FIGHTER, KNIGHT, ROGUE, RANGER, SPEARMAN, BRUTE, OCCULTIST, PRIEST,
  PYROMANCER, NECROMANCER, SHADOW_KNIGHT, MONK, BARD, BERSERKER, PALADIN, ELEMENTALIST,
  ASSASSIN, WARDEN,
];

for (const cls of ALL_CLASSES) {
  registerClassDef(cls);
}
