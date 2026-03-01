import type {
  GeneratedAbility,
  EffectPrimitive,
  TargetingPrimitive,
  ModifierPrimitive,
  TriggerPrimitive,
  AbilityCost,
  EffectType,
  TargetingType,
  Rarity,
} from "./AbilityData";
import { generateAbilityUID } from "./AbilityData";
import { registerAbility } from "./AbilityResolver";
import type { Theme, ThemeProgressionSlot } from "./ThemeData";
import { generatePassiveFromActives } from "./PassiveGenerator";

// ── Power costs per effect type ──

const EFFECT_POWER: Record<EffectType, number> = {
  // Damage
  dmg_weapon: 4,
  dmg_execute: 7,
  dmg_multihit: 6,
  dmg_spell: 5,
  dmg_reflect: 4,
  // DoTs
  dot_bleed: 3,
  dot_burn: 3,
  dot_poison: 3,
  // Displacement
  disp_push: 3,
  disp_teleport: 3,
  disp_dash: 4,
  disp_pull: 3,
  // CC
  cc_stun: 5,
  cc_root: 4,
  cc_daze: 3,
  cc_fear: 5,
  cc_silence: 4,
  cc_taunt: 3,
  cc_charm: 7,
  // Debuffs
  debuff_stat: 3,
  debuff_vuln: 4,
  debuff_armor: 4,
  debuff_healReduce: 3,
  // Buffs
  buff_stat: 3,
  buff_dmgReduce: 4,
  buff_stealth: 5,
  buff_shield: 4,
  // Stances
  stance_counter: 5,
  stance_overwatch: 4,
  // Resource
  res_apRefund: 3,
  // Healing
  heal_pctDmg: 4,
  heal_flat: 3,
  heal_hot: 3,
  lifesteal: 5,
  // Summon / zone / trap
  summon_unit: 6,
  zone_persist: 5,
  trap_place: 4,
  // Channel / transform
  channel_dmg: 5,
  transform_state: 7,
  // Utility
  cleanse: 3,
  cooldown_reset: 5,
};

// ── Targeting power multipliers ──

const TARGETING_MULT: Record<TargetingType, number> = {
  tgt_single_enemy: 1.0,
  tgt_single_ally: 1.0,
  tgt_self: 0.8,
  tgt_aoe_adjacent: 1.5,
  tgt_aoe_cone: 1.4,
  tgt_aoe_line: 1.3,
  tgt_aoe_radius2: 1.8,
  tgt_aoe_radius3: 2.2,
  tgt_all_allies: 1.6,
  tgt_all_enemies: 2.5,
};

// ── Default effect params per type ──

function defaultEffectParams(type: EffectType, tier: 1 | 2 | 3, rng: () => number): Record<string, number | string> {
  // Snap to nearest multiple of `step`, with minimum `min`
  const snap = (base: number, step: number, min: number) => {
    const raw = base + (rng() * 2 - 1) * step;
    return Math.max(min, Math.round(raw / step) * step);
  };

  switch (type) {
    case "dmg_weapon":
      return { multiplier: snap(tier === 1 ? 120 : tier === 2 ? 140 : 160, 20, 120) / 100 };
    case "dmg_execute":
      return {
        multiplier: snap(tier === 1 ? 120 : tier === 2 ? 140 : 160, 20, 120) / 100,
        hpThreshold: tier >= 3 ? 30 : 20,
        bonusMult: snap(tier === 1 ? 40 : tier === 2 ? 60 : 80, 20, 20) / 100,
      };
    case "dmg_multihit": {
      const mhOptions = tier >= 3
        ? [{ hits: 3, mult: 60 }, { hits: 4, mult: 40 }, { hits: 5, mult: 30 }]
        : tier >= 2
        ? [{ hits: 2, mult: 60 }, { hits: 3, mult: 40 }, { hits: 4, mult: 30 }]
        : [{ hits: 2, mult: 60 }, { hits: 3, mult: 40 }];
      const mhPick = mhOptions[Math.floor(rng() * mhOptions.length)]!;
      return { hits: mhPick.hits, multPerHit: snap(mhPick.mult, 20, 20) / 100 };
    }
    case "dmg_spell":
      return { multiplier: snap(tier === 1 ? 120 : tier === 2 ? 140 : 180, 20, 120) / 100 };
    case "dot_bleed":
      return { dmgPerTurn: snap(tier === 1 ? 4 : 6, 2, 2), turns: tier >= 3 ? 3 : 2 };
    case "dot_burn":
      return { dmgPerTurn: snap(tier === 1 ? 4 : 6, 2, 2), turns: tier >= 3 ? 3 : 2 };
    case "dot_poison":
      return { dmgPerTurn: snap(tier === 1 ? 2 : 4, 2, 2), turns: tier >= 3 ? 4 : 3, statReduce: snap(5, 5, 5) };
    case "disp_push":
      return { distance: tier >= 3 ? 2 : 1 };
    case "cc_stun":
      return { chance: tier === 1 ? 75 : 85 };
    case "cc_root":
      return { turns: tier >= 3 ? 2 : 1 };
    case "cc_daze":
      return { apLoss: tier >= 3 ? 2 : 1, turns: tier >= 3 ? 2 : 1 };
    case "debuff_stat": {
      const stats = ["dodge", "meleeSkill", "rangedSkill", "initiative", "resolve", "movementPoints", "magicResist", "critChance"];
      return { stat: stats[Math.floor(rng() * stats.length)]!, amount: snap(tier === 1 ? 10 : 15, 5, 5), turns: 2 };
    }
    case "debuff_vuln":
      return { bonusDmg: snap(20, 10, 10), turns: 2 };
    case "buff_stat": {
      const bStats = ["dodge", "meleeSkill", "rangedSkill", "initiative", "resolve", "movementPoints", "magicResist", "critChance"];
      return { stat: bStats[Math.floor(rng() * bStats.length)]!, amount: snap(tier === 1 ? 10 : 15, 5, 5), turns: 2 };
    }
    case "buff_dmgReduce":
      return { percent: snap(20, 10, 10), turns: 1 };
    case "stance_counter":
      return { maxCounters: tier >= 3 ? 99 : 3 };
    case "stance_overwatch":
      return { maxTriggers: tier >= 3 ? 5 : 3 };
    case "res_apRefund":
      return { amount: snap(3, 1, 2) };
    case "heal_pctDmg":
      return { pct: 30 };
    case "heal_flat":
      return { amount: snap(tier === 1 ? 15 : tier === 2 ? 25 : 40, 5, 10) };
    case "heal_hot":
      return { healPerTurn: snap(tier === 1 ? 6 : 10, 2, 4), turns: tier >= 3 ? 3 : 2 };
    case "lifesteal":
      return { pct: snap(tier === 1 ? 30 : tier === 2 ? 50 : 75, 10, 20) };
    case "dmg_reflect":
      return { pct: snap(tier === 1 ? 30 : tier === 2 ? 50 : 75, 10, 20), turns: tier >= 3 ? 3 : 2 };
    case "disp_teleport":
      return { range: tier >= 3 ? 4 : tier >= 2 ? 3 : 2 };
    case "disp_dash":
      return { range: tier >= 3 ? 4 : 3, damageOnArrival: snap(tier === 1 ? 80 : 120, 20, 60) / 100 };
    case "disp_pull":
      return { distance: tier >= 3 ? 3 : 2 };
    case "cc_fear":
      return { chance: tier === 1 ? 70 : 85, turns: tier >= 3 ? 2 : 1 };
    case "cc_silence":
      return { turns: tier >= 3 ? 2 : 1 };
    case "cc_taunt":
      return { turns: tier >= 3 ? 3 : 2 };
    case "cc_charm":
      return { turns: 1, chance: tier === 1 ? 50 : 70 };
    case "debuff_armor":
      return { pct: snap(tier === 1 ? 30 : tier === 2 ? 50 : 75, 10, 20), turns: tier >= 3 ? 3 : 2 };
    case "debuff_healReduce":
      return { pct: snap(tier === 1 ? 30 : 50, 10, 20), turns: 2 };
    case "buff_stealth":
      return { turns: tier >= 3 ? 3 : 2, breakOnAttack: 1 };
    case "buff_shield":
      return { amount: snap(tier === 1 ? 15 : tier === 2 ? 25 : 40, 5, 10), turns: 2 };
    case "summon_unit":
      return { hp: snap(tier === 1 ? 20 : tier === 2 ? 35 : 50, 5, 15), turns: tier >= 3 ? 4 : 3, count: 1 };
    case "zone_persist":
      return { radius: tier >= 3 ? 2 : 1, turns: tier >= 3 ? 4 : 3, dmgPerTurn: snap(tier === 1 ? 3 : 5, 1, 2) };
    case "trap_place":
      return { count: tier >= 3 ? 2 : 1, triggerDmg: snap(tier === 1 ? 10 : 20, 5, 5) };
    case "channel_dmg":
      return { dmgPerTurn: snap(tier === 1 ? 8 : tier === 2 ? 12 : 18, 2, 6), turns: tier >= 3 ? 3 : 2 };
    case "transform_state":
      return { turns: tier >= 3 ? 5 : 3, bonusPct: snap(tier === 1 ? 20 : 40, 10, 10) };
    case "cleanse":
      return { count: tier >= 3 ? 999 : tier + 1 };
    case "cooldown_reset":
      return tier >= 3 ? {} : { reduceBy: tier };
  }
}

// ── Naming tables ──

const NAME_PREFIXES: Record<string, string[]> = {
  dot_bleed: ["Lacerating", "Bleeding", "Rending", "Gashing"],
  dot_burn: ["Blazing", "Scorching", "Burning", "Searing"],
  dot_poison: ["Toxic", "Venomous", "Festering", "Noxious"],
  cc_stun: ["Concussive", "Crushing", "Shattering", "Staggering"],
  cc_root: ["Binding", "Pinning", "Locking", "Anchoring"],
  cc_daze: ["Crippling", "Blinding", "Disorienting", "Jarring"],
  cc_fear: ["Terrifying", "Dreadful", "Horrifying", "Nightmarish"],
  cc_silence: ["Silencing", "Muting", "Hushing", "Suppressing"],
  cc_taunt: ["Provoking", "Taunting", "Goading", "Challenging"],
  cc_charm: ["Beguiling", "Mesmerizing", "Enthralling", "Dominating"],
  debuff_stat: ["Enfeebling", "Weakening", "Draining", "Sapping"],
  debuff_vuln: ["Exposing", "Piercing", "Rending", "Sundering"],
  debuff_armor: ["Corroding", "Shattering", "Crumbling", "Eroding"],
  debuff_healReduce: ["Festering", "Withering", "Decaying", "Blighting"],
  buff_stat: ["Rallying", "Inspiring", "Empowering", "Fortifying"],
  buff_dmgReduce: ["Warding", "Shielding", "Guarding", "Steeling"],
  buff_stealth: ["Shadow", "Phantom", "Ghost", "Unseen"],
  buff_shield: ["Warding", "Barrier", "Aegis", "Bulwark"],
  disp_push: ["Battering", "Shoving", "Thundering", "Driving"],
  disp_teleport: ["Blinking", "Warping", "Phasing", "Shifting"],
  disp_dash: ["Charging", "Rushing", "Lunging", "Leaping"],
  disp_pull: ["Grasping", "Hauling", "Dragging", "Reeling"],
  dmg_spell: ["Arcane", "Mystic", "Eldritch", "Ethereal"],
  dmg_reflect: ["Thorned", "Mirrored", "Retaliating", "Rebounding"],
  lifesteal: ["Vampiric", "Draining", "Siphoning", "Leeching"],
  heal_flat: ["Mending", "Restoring", "Soothing", "Curative"],
  heal_hot: ["Regenerating", "Renewing", "Nurturing", "Verdant"],
  summon_unit: ["Conjured", "Summoned", "Spectral", "Manifested"],
  zone_persist: ["Lingering", "Persistent", "Enduring", "Permeating"],
  trap_place: ["Hidden", "Concealed", "Lurking", "Devious"],
  channel_dmg: ["Focused", "Channeled", "Sustained", "Concentrated"],
  transform_state: ["Ascendant", "Transcendent", "Awakened", "Unleashed"],
  cleanse: ["Purifying", "Cleansing", "Purging", "Absolvant"],
  cooldown_reset: ["Refreshing", "Renewing", "Invigorating", "Resetting"],
};

const NAME_VERBS: Record<string, string[]> = {
  dmg_weapon: [
    "Strike", "Slash", "Blow", "Cut", "Assault",
    "Cleave", "Chop", "Swing", "Hack", "Rend", "Attack",
  ],
  dmg_execute: [
    "Execution", "Reaping", "Toll", "Harvest", "Finishing Blow",
    "Culling", "Headsman's Cut", "Coup", "Death Blow",
  ],
  dmg_multihit: ["Flurry", "Barrage", "Onslaught", "Frenzy", "Rapid Strikes", "Whirlwind"],
  dmg_spell: ["Bolt", "Blast", "Surge", "Nova", "Torrent", "Pulse"],
  dmg_reflect: ["Thorns", "Mirror Guard", "Retribution", "Reprisal"],
  heal_flat: ["Mend", "Restore", "Patch", "Salve"],
  heal_hot: ["Rejuvenation", "Renewal", "Regrowth", "Bloom"],
  lifesteal: ["Drain", "Siphon", "Leech", "Feast"],
  cc_fear: ["Terror", "Dread", "Howl", "Panic"],
  cc_silence: ["Silence", "Hush", "Muffle", "Suppress"],
  cc_taunt: ["Taunt", "Challenge", "Provoke", "Goad"],
  cc_charm: ["Domination", "Puppetry", "Mesmerism", "Enthrall"],
  debuff_armor: ["Shatter Armor", "Corrode", "Crumble", "Rust"],
  debuff_healReduce: ["Blight", "Wither", "Decay", "Necrosis"],
  buff_stealth: ["Vanish", "Fade", "Shadow Step", "Cloak"],
  buff_shield: ["Shield", "Barrier", "Ward", "Aegis"],
  disp_teleport: ["Blink", "Phase", "Warp", "Shift"],
  disp_dash: ["Charge", "Rush", "Lunge", "Leap"],
  disp_pull: ["Grasp", "Hook", "Reel", "Yank"],
  summon_unit: ["Summon", "Conjure", "Manifest", "Call Forth"],
  zone_persist: ["Field", "Zone", "Domain", "Territory"],
  trap_place: ["Trap", "Snare", "Mine", "Ambush"],
  channel_dmg: ["Focus", "Channel", "Beam", "Torrent"],
  transform_state: ["Transformation", "Ascension", "Awakening", "Metamorphosis"],
  stance_counter: ["Counter-stance", "Riposte Guard", "Ready Stance", "Retaliating Guard"],
  stance_overwatch: ["Overwatch", "Sentinel Guard", "Watchful Stance", "Vigilant Watch"],
  res_apRefund: ["Rush", "Surge", "Momentum", "Quick Step"],
  cleanse: ["Purify", "Cleanse", "Purge", "Absolve"],
  cooldown_reset: ["Refresh", "Recharge", "Reset", "Invigorate"],
};

const NAME_SUFFIXES: Record<string, string[]> = {
  tgt_aoe_adjacent: ["of Havoc", "of Devastation", "of Ruin"],
  tgt_aoe_cone: ["of Havoc", "of Devastation", "of Ruin"],
  tgt_aoe_line: ["of Havoc", "of Devastation", "of Ruin"],
  tgt_aoe_radius2: ["of Havoc", "of Devastation", "of Ruin"],
  tgt_aoe_radius3: ["of Cataclysm", "of Annihilation", "of Oblivion"],
  tgt_all_allies: ["of Valor", "of Unity", "of Resolve"],
  tgt_all_enemies: ["of Doom", "of Reckoning", "of Judgment"],
  tgt_self: ["of Will", "of Resilience", "of Focus"],
};

// Theme-specific verb overrides for dmg_weapon (replaces generic verbs)
const THEME_VERBS: Record<string, string[]> = {
  bleeder: ["Laceration", "Gash", "Rend", "Carve", "Bleed Cut", "Bloodletting"],
  crusher: ["Crush", "Smash", "Pummel", "Shatter", "Bludgeon", "Demolish"],
  reaper: ["Reap", "Cleave", "Decimate", "Fell", "Mow Down", "Harvest"],
  executioner: ["Sever", "Behead", "Finish", "Cull", "Dispatch", "Terminate"],
  skirmisher: ["Jab", "Lunge", "Thrust", "Feint", "Side-step Cut", "Glancing Blow"],
  sentinel: ["Ward", "Repel", "Brace", "Hold Ground", "Spear Thrust", "Stand Fast"],
  opportunist: ["Exploit", "Capitalize", "Press", "Punish", "Take Advantage", "Seize"],
  pyromaniac: ["Immolate", "Ignite", "Scorch", "Combust", "Sear", "Incinerate"],
  venomancer: ["Envenom", "Toxify", "Blight", "Corrode", "Taint", "Infect"],
  warden: ["Bind", "Anchor", "Lockdown", "Fortify", "Entrench", "Detain"],
  arcanist: ["Arcane Bolt", "Surge", "Channel", "Blast", "Invoke", "Discharge"],
  hexcurser: ["Hex", "Curse", "Bane", "Afflict", "Wither", "Doom"],
};

// ── Passive names ──

const PASSIVE_NAMES: Record<string, string[]> = {
  bleeder: ["Blood Scent", "Crimson Instinct", "Gore Tracker"],
  crusher: ["Iron Will", "Unrelenting Force", "Hammer Resolve"],
  skirmisher: ["Fleet Footwork", "Hit and Run", "Nimble Step"],
  opportunist: ["Opportunist's Eye", "Keen Observer", "Weakness Seeker"],
  executioner: ["Smell Blood", "Death Sense", "Killing Instinct"],
  sentinel: ["Hold the Line", "Stalwart Guard", "Immovable"],
  reaper: ["Blood Rush", "Death's Momentum", "Harvest Energy"],
  pyromaniac: ["Pyromaniac's Focus", "Flame Mastery", "Burning Resolve"],
  venomancer: ["Toxic Instinct", "Venom Sense", "Poison Mastery"],
  warden: ["Warden's Resolve", "Unyielding Anchor", "Root Mastery"],
  arcanist: ["Arcane Insight", "Spell Attunement", "Mana Focus"],
  hexcurser: ["Curse Mastery", "Dark Insight", "Hex Focus"],
};

// ── Power budget + cost derivation ──

function calculatePowerBudget(
  effects: EffectPrimitive[],
  targeting: TargetingPrimitive,
  modifiers: ModifierPrimitive[],
  triggers: TriggerPrimitive[],
): number {
  const effectPower = effects.reduce((sum, e) => sum + e.power, 0);
  const modPower = modifiers.reduce((sum, m) => sum + m.powerAdd, 0);
  const trgPower = triggers.reduce((sum, t) => sum + t.powerAdd, 0);
  return Math.round(effectPower * targeting.powerMult + modPower + trgPower);
}

/** Magical effect types that cost mana instead of stamina. */
const MAGICAL_EFFECTS = new Set([
  "dmg_spell", "dot_burn", "dot_poison", "heal_pctDmg",
  "heal_flat", "heal_hot", "lifesteal", "cc_charm", "cc_silence",
  "channel_dmg", "zone_persist", "summon_unit", "transform_state",
]);

/** Check if an ability's effects are primarily magical. */
function isMagicalAbility(effects: EffectPrimitive[]): boolean {
  return effects.some(e => MAGICAL_EFFECTS.has(e.type));
}

function deriveCost(power: number, tier: 1 | 2 | 3, rng: () => number, magical = false): AbilityCost {
  const varyRange = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  let resourceCost: number;
  let ap: number;
  let cooldown = 0;
  let turnEnding = false;

  if (power <= 8) {
    ap = 3; resourceCost = varyRange(8, 12);
  } else if (power <= 14) {
    ap = 4; resourceCost = varyRange(12, 18);
  } else if (power <= 20) {
    ap = 5; resourceCost = varyRange(18, 25);
  } else if (power <= 28) {
    ap = 6; resourceCost = varyRange(22, 30); cooldown = 2;
  } else if (power <= 35) {
    ap = 6; resourceCost = varyRange(25, 35); cooldown = 3;
  } else {
    ap = tier >= 3 ? 8 : 7; resourceCost = varyRange(30, 40);
    cooldown = rng() < 0.5 ? 3 : 4; turnEnding = true;
  }

  // Magical abilities use mana instead of stamina (mana pools are smaller, so scale down)
  if (magical) {
    const manaCost = Math.max(2, Math.round(resourceCost * 0.4));
    return { ap, stamina: 0, mana: manaCost, cooldown, turnEnding };
  }
  return { ap, stamina: resourceCost, mana: 0, cooldown, turnEnding };
}

// ── Name generation ──

function generateAbilityName(
  effects: EffectPrimitive[],
  targeting: TargetingPrimitive,
  isPassive: boolean,
  themeId: string,
  rng: () => number,
): string {
  if (isPassive) {
    const names = PASSIVE_NAMES[themeId] ?? ["Passive Skill"];
    return names[Math.floor(rng() * names.length)]!;
  }

  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  // Find main verb — prefer theme-specific verbs for dmg_weapon and dmg_spell
  const primaryEffect = effects[0];
  let verbs: string[];
  let usedThemeVerb = false;
  if ((primaryEffect?.type === "dmg_weapon" || primaryEffect?.type === "dmg_spell") && THEME_VERBS[themeId]) {
    // 60% chance to use theme verb, 40% generic
    if (rng() < 0.6) {
      verbs = THEME_VERBS[themeId]!;
      usedThemeVerb = true;
    } else {
      verbs = NAME_VERBS[primaryEffect.type] ?? ["Attack"];
    }
  } else {
    verbs = primaryEffect ? (NAME_VERBS[primaryEffect.type] ?? ["Attack"]) : ["Attack"];
  }
  const verb = pick(verbs);

  // Find a prefix from secondary effects — skip if using theme verb to avoid double-theming
  let prefix = "";
  if (!usedThemeVerb) {
    for (const e of effects) {
      const prefixes = NAME_PREFIXES[e.type];
      if (prefixes) {
        prefix = pick(prefixes);
        break;
      }
    }
  }

  // Optional suffix from targeting
  let suffix = "";
  const suffixes = NAME_SUFFIXES[targeting.type];
  if (suffixes && rng() < 0.4) {
    suffix = " " + pick(suffixes);
  }

  if (prefix) {
    return `${prefix} ${verb}${suffix}`;
  }
  return `${verb}${suffix}`;
}

// ── Description generation ──

function generateDescription(ability: GeneratedAbility): string {
  if (ability.isPassive) {
    return generatePassiveDescription(ability);
  }

  const parts: string[] = [];

  for (const effect of ability.effects) {
    switch (effect.type) {
      case "dmg_weapon": {
        const mult = Math.round((effect.params["multiplier"] as number) * 100);
        parts.push(`Deal ${mult}% weapon damage`);
        break;
      }
      case "dmg_execute": {
        const mult = Math.round((effect.params["multiplier"] as number) * 100);
        const thresh = effect.params["hpThreshold"] as number;
        parts.push(`Deal ${mult}% weapon damage. Execute targets below ${thresh}% HP`);
        break;
      }
      case "dmg_multihit": {
        const hits = effect.params["hits"] as number;
        const per = Math.round((effect.params["multPerHit"] as number) * 100);
        parts.push(`Strike ${hits} times at ${per}% damage each`);
        break;
      }
      case "dmg_spell": {
        const mult = Math.round((effect.params["multiplier"] as number) * 100);
        parts.push(`Deal ${mult}% spell damage`);
        break;
      }
      case "dot_bleed": {
        const dmg = effect.params["dmgPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Apply Bleed (${dmg} dmg/turn, ${turns} turns)`);
        break;
      }
      case "dot_burn": {
        const dmg = effect.params["dmgPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Apply Burn (${dmg} dmg/turn, ${turns} turns)`);
        break;
      }
      case "dot_poison": {
        const dmg = effect.params["dmgPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Apply Poison (${dmg} dmg/turn, ${turns} turns)`);
        break;
      }
      case "disp_push": {
        const dist = effect.params["distance"] as number;
        parts.push(`Push target ${dist} tile${dist > 1 ? "s" : ""}`);
        break;
      }
      case "cc_stun": {
        const chance = effect.params["chance"] as number;
        parts.push(`${chance}% chance to Stun`);
        break;
      }
      case "cc_root": {
        const turns = effect.params["turns"] as number;
        parts.push(`Root target for ${turns} turn${turns > 1 ? "s" : ""}`);
        break;
      }
      case "cc_daze": {
        const loss = effect.params["apLoss"] as number;
        parts.push(`Daze target (-${loss} AP next turn)`);
        break;
      }
      case "debuff_stat": {
        const stat = effect.params["stat"] as string;
        const amt = effect.params["amount"] as number;
        const turns = effect.params["turns"] as number;
        const statName = stat.replace(/([A-Z])/g, " $1").trim();
        parts.push(`Reduce ${statName} by ${amt} for ${turns} turns`);
        break;
      }
      case "debuff_vuln": {
        const bonus = effect.params["bonusDmg"] as number;
        parts.push(`Apply Vulnerable (+${bonus}% damage taken)`);
        break;
      }
      case "buff_stat": {
        const stat = effect.params["stat"] as string;
        const amt = effect.params["amount"] as number;
        const statName = stat.replace(/([A-Z])/g, " $1").trim();
        parts.push(`+${amt} ${statName}`);
        break;
      }
      case "buff_dmgReduce": {
        const pct = effect.params["percent"] as number;
        parts.push(`Reduce damage taken by ${pct}%`);
        break;
      }
      case "stance_counter":
        parts.push("Enter counter-stance: counter-attack incoming melee");
        break;
      case "stance_overwatch":
        parts.push("Enter overwatch: attack enemies entering adjacent hexes");
        break;
      case "res_apRefund": {
        const amt = effect.params["amount"] as number;
        parts.push(`Refund ${amt} AP`);
        break;
      }
      case "heal_pctDmg": {
        const pct = effect.params["pct"] as number;
        parts.push(`Heal ${pct}% of damage dealt`);
        break;
      }
      case "heal_flat": {
        const amt = effect.params["amount"] as number;
        parts.push(`Heal ${amt} HP`);
        break;
      }
      case "heal_hot": {
        const hpt = effect.params["healPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Regenerate ${hpt} HP/turn for ${turns} turns`);
        break;
      }
      case "lifesteal": {
        const pct = effect.params["pct"] as number;
        parts.push(`Lifesteal: heal ${pct}% of damage dealt`);
        break;
      }
      case "dmg_reflect": {
        const pct = effect.params["pct"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Reflect ${pct}% of incoming damage for ${turns} turns`);
        break;
      }
      case "disp_teleport": {
        const range = effect.params["range"] as number;
        parts.push(`Teleport up to ${range} hexes`);
        break;
      }
      case "disp_dash": {
        const range = effect.params["range"] as number;
        parts.push(`Dash ${range} hexes toward target`);
        break;
      }
      case "disp_pull": {
        const dist = effect.params["distance"] as number;
        parts.push(`Pull target ${dist} hex${dist > 1 ? "es" : ""} toward you`);
        break;
      }
      case "cc_fear": {
        const chance = effect.params["chance"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`${chance}% chance to Fear (flee for ${turns} turn${turns > 1 ? "s" : ""})`);
        break;
      }
      case "cc_silence": {
        const turns = effect.params["turns"] as number;
        parts.push(`Silence target for ${turns} turn${turns > 1 ? "s" : ""} (no abilities)`);
        break;
      }
      case "cc_taunt": {
        const turns = effect.params["turns"] as number;
        parts.push(`Taunt target for ${turns} turn${turns > 1 ? "s" : ""} (forced to attack you)`);
        break;
      }
      case "cc_charm": {
        const turns = effect.params["turns"] as number;
        parts.push(`Charm target for ${turns} turn${turns > 1 ? "s" : ""} (fights for you)`);
        break;
      }
      case "debuff_armor": {
        const pct = effect.params["pct"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Destroy ${pct}% of target's armor for ${turns} turns`);
        break;
      }
      case "debuff_healReduce": {
        const pct = effect.params["pct"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Reduce healing received by ${pct}% for ${turns} turns`);
        break;
      }
      case "buff_stealth": {
        const turns = effect.params["turns"] as number;
        parts.push(`Enter Stealth for ${turns} turns (untargetable, breaks on attack)`);
        break;
      }
      case "buff_shield": {
        const amt = effect.params["amount"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Gain ${amt} HP shield for ${turns} turns`);
        break;
      }
      case "summon_unit": {
        const hp = effect.params["hp"] as number;
        const turns = effect.params["turns"] as number;
        const count = effect.params["count"] as number;
        parts.push(`Summon ${count > 1 ? count + " units" : "a unit"} (${hp} HP, ${turns} turns)`);
        break;
      }
      case "zone_persist": {
        const radius = effect.params["radius"] as number;
        const turns = effect.params["turns"] as number;
        const dmg = effect.params["dmgPerTurn"] as number;
        parts.push(`Create zone (${radius}-hex radius, ${dmg} dmg/turn, ${turns} turns)`);
        break;
      }
      case "trap_place": {
        const count = effect.params["count"] as number;
        const dmg = effect.params["triggerDmg"] as number;
        parts.push(`Place ${count > 1 ? count + " traps" : "a trap"} (${dmg} damage on trigger)`);
        break;
      }
      case "channel_dmg": {
        const dmg = effect.params["dmgPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Channel: deal ${dmg} damage/turn for ${turns} turns`);
        break;
      }
      case "transform_state": {
        const turns = effect.params["turns"] as number;
        const bonus = effect.params["bonusPct"] as number;
        parts.push(`Transform: +${bonus}% all stats for ${turns} turns`);
        break;
      }
      case "cleanse": {
        const count = effect.params["count"] as number;
        parts.push(count >= 999 ? "Remove all debuffs" : `Remove up to ${count} debuffs`);
        break;
      }
      case "cooldown_reset": {
        const reduceBy = effect.params["reduceBy"] as number | undefined;
        parts.push(reduceBy ? `Reduce all cooldowns by ${reduceBy}` : "Reset all cooldowns");
        break;
      }
    }
  }

  // Add synergy exploit info
  if (ability.synergyTags.exploits.length > 0) {
    parts.push(`Bonus vs ${ability.synergyTags.exploits.join(", ")} targets`);
  }

  return parts.join(". ") + ".";
}

function generatePassiveDescription(ability: GeneratedAbility): string {
  const parts: string[] = [];

  for (const trigger of ability.triggers) {
    switch (trigger.type) {
      case "trg_onKill": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "res_apRefund") {
          parts.push(`On kill: refund ${eff.params["amount"]} AP`);
        } else if (eff?.type === "buff_stat") {
          parts.push(`On kill: +${eff.params["amount"]} ${eff.params["stat"]}`);
        }
        break;
      }
      case "trg_belowHP": {
        const pct = trigger.params["hpPercent"] ?? 50;
        const eff = trigger.triggeredEffect;
        const bonus = eff?.params["bonusPercent"] ?? 10;
        parts.push(`+${bonus}% damage vs targets below ${pct}% HP`);
        break;
      }
      case "trg_turnStart": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "buff_stat") {
          parts.push(`Start of turn: +${eff.params["amount"]} ${eff.params["stat"]}`);
        }
        break;
      }
      case "trg_onTakeDamage": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "buff_stat") {
          parts.push(`When hit: +${eff.params["amount"]} ${eff.params["stat"]} for 1 turn`);
        }
        break;
      }
      case "trg_onHit": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "res_apRefund") {
          parts.push(`When applying debuff: refund ${eff.params["amount"]} AP`);
        } else if (eff?.type === "dmg_weapon" && eff.params["bonusPercent"]) {
          parts.push(`On hit: +${eff.params["bonusPercent"]}% bonus damage vs DoT targets`);
        } else if (eff?.type === "buff_stat") {
          parts.push(`On hit: +${eff.params["amount"]} ${eff.params["stat"]} (stacks)`);
        }
        break;
      }
    }
  }

  // Add static effect descriptions for passives with non-triggered effects
  for (const effect of ability.effects) {
    if (effect.type === "buff_stat") {
      const stat = effect.params["stat"] as string;
      const amt = effect.params["amount"] as number;
      const statName = stat.replace(/([A-Z])/g, " $1").trim();
      parts.push(`+${amt} ${statName} while active`);
    }
  }

  if (parts.length === 0) return "Passive ability.";
  return "Passive: " + parts.join(". ") + ".";
}

// ── Rarity system ──

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

// Cumulative thresholds: common 60%, uncommon 33%, rare 6%, epic 0.8%, legendary 0.1%
const RARITY_CDF: [number, Rarity][] = [
  [0.60, "common"],
  [0.93, "uncommon"],
  [0.99, "rare"],
  [0.998, "epic"],
  [1.0, "legendary"],
];

const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.1,
  rare: 1.25,
  epic: 1.5,
  legendary: 1.75,
};

export function rollRarity(rng: () => number): Rarity {
  const roll = rng();
  for (const [threshold, rarity] of RARITY_CDF) {
    if (roll < threshold) return rarity;
  }
  return "common";
}

/** Scale numeric params on an ability by its rarity multiplier. */
export function applyRarityScaling(ability: GeneratedAbility): void {
  const mult = RARITY_MULT[ability.rarity];
  if (mult === 1.0) return;

  for (const effect of ability.effects) {
    scaleParams(effect.params, mult);
  }
  for (const mod of ability.modifiers) {
    scaleParams(mod.params, mult);
  }
  for (const trigger of ability.triggers) {
    if (trigger.triggeredEffect) {
      scaleParams(trigger.triggeredEffect.params, mult);
    }
  }
}

function scaleParams(params: Record<string, number | string>, mult: number): void {
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (typeof val !== "number") continue;
    // Skip non-scaling fields
    if (key === "turns" || key === "hits" || key === "distance" || key === "maxCounters" || key === "maxTriggers") continue;
    // Multipliers (0-2 range): snap to 0.2
    if (key === "multiplier" || key === "multPerHit" || key === "bonusMult") {
      params[key] = Math.round(val * mult * 5) / 5; // snap to 0.2
    }
    // Percentages and stat amounts: snap to 5
    else if (key === "amount" || key === "bonusDmg" || key === "bonusPercent" || key === "percent" || key === "pct" || key === "chance") {
      params[key] = Math.max(5, Math.round(val * mult / 5) * 5);
    }
    // Integer values (dmgPerTurn, apLoss, statReduce, hpThreshold, hpPercent): snap to nearest int
    else {
      params[key] = Math.max(1, Math.round(val * mult));
    }
  }
}

/** Add a bonus effect for epic-rarity active abilities. */
function addEpicBonus(ability: GeneratedAbility, rng: () => number): void {
  if (ability.isPassive) return;

  const hasDmg = ability.effects.some(e =>
    e.type === "dmg_weapon" || e.type === "dmg_execute" || e.type === "dmg_multihit" || e.type === "dmg_spell");
  const hasCC = ability.effects.some(e =>
    e.type === "cc_stun" || e.type === "cc_root" || e.type === "cc_daze");
  const hasDoT = ability.effects.some(e =>
    e.type === "dot_bleed" || e.type === "dot_burn" || e.type === "dot_poison");

  // Build candidate pool
  type Bonus = { label: string; apply: () => void };
  const pool: Bonus[] = [];

  if (hasDmg) {
    pool.push({
      label: "Armor Piercing",
      apply: () => ability.modifiers.push({ type: "mod_armorIgnore", params: { pct: 0.5 }, powerAdd: 2 }),
    });
    pool.push({
      label: "Expose Weakness",
      apply: () => ability.effects.push({ type: "debuff_vuln", params: { bonusDmg: 25, turns: 2 }, power: EFFECT_POWER.debuff_vuln }),
    });
  }
  if (!hasCC) {
    pool.push({
      label: "Concussive",
      apply: () => ability.effects.push({ type: "cc_daze", params: { chance: 80, apLoss: 1, turns: 1 }, power: EFFECT_POWER.cc_daze }),
    });
  }
  if (!hasDoT) {
    pool.push({
      label: "Bloodletting",
      apply: () => ability.effects.push({ type: "dot_bleed", params: { dmgPerTurn: 4, turns: 3 }, power: EFFECT_POWER.dot_bleed }),
    });
  }
  // Fallback always available
  const stats = ["dodge", "meleeSkill", "rangedSkill", "initiative", "resolve"];
  pool.push({
    label: "Battle Focus",
    apply: () => ability.effects.push({ type: "buff_stat", params: { stat: stats[Math.floor(rng() * stats.length)]!, amount: 15, turns: 2 }, power: EFFECT_POWER.buff_stat }),
  });

  const chosen = pool[Math.floor(rng() * pool.length)]!;
  chosen.apply();
}

/** Add a powerful bonus effect for legendary-rarity active abilities. */
function addLegendaryBonus(ability: GeneratedAbility, rng: () => number): void {
  if (ability.isPassive) return;

  type Bonus = { label: string; apply: () => void };
  const pool: Bonus[] = [];

  pool.push({
    label: "Sunder",
    apply: () => ability.modifiers.push({ type: "mod_armorIgnore", params: { pct: 1.0 }, powerAdd: 3 }),
  });
  pool.push({
    label: "Doom Mark",
    apply: () => ability.effects.push({ type: "debuff_vuln", params: { bonusDmg: 50, turns: 3 }, power: EFFECT_POWER.debuff_vuln + 2 }),
  });
  pool.push({
    label: "Vampiric",
    apply: () => ability.effects.push({ type: "heal_pctDmg", params: { pct: 30 }, power: EFFECT_POWER.heal_pctDmg }),
  });
  pool.push({
    label: "Overwhelming",
    apply: () => ability.effects.push({ type: "cc_stun", params: { chance: 100 }, power: EFFECT_POWER.cc_stun + 1 }),
  });
  // Devastating: double main damage multiplier
  const mainDmg = ability.effects.find(e =>
    e.type === "dmg_weapon" || e.type === "dmg_execute" || e.type === "dmg_spell");
  if (mainDmg && typeof mainDmg.params["multiplier"] === "number") {
    pool.push({
      label: "Devastating",
      apply: () => { mainDmg.params["multiplier"] = (mainDmg.params["multiplier"] as number) * 2; },
    });
  }

  const chosen = pool[Math.floor(rng() * pool.length)]!;
  chosen.apply();
}

// ── Main generation functions ──

/**
 * Generate a single ability for a given theme progression slot.
 */
export function generateAbility(
  slot: ThemeProgressionSlot,
  tier: 1 | 2 | 3,
  themeId: string,
  weaponReq: string[],
  rng: () => number,
): GeneratedAbility {
  const isPassive = slot.isPassive ?? false;

  // Build effects from the slot's effect pool, applying param overrides if present
  const effects: EffectPrimitive[] = slot.effects.map(type => {
    const params = defaultEffectParams(type, tier, rng);
    // Apply per-effect param overrides (e.g. force a specific stat for debuff_stat)
    const overrides = slot.effectParamOverrides?.[type];
    if (overrides) {
      for (const [key, val] of Object.entries(overrides)) {
        params[key] = val;
      }
    }
    return { type, params, power: EFFECT_POWER[type] };
  });

  // Build targeting
  const targetingType: TargetingType = slot.targetingConstraint ?? (
    isPassive ? "tgt_self" : "tgt_single_enemy"
  );
  const targeting: TargetingPrimitive = {
    type: targetingType,
    params: targetingType === "tgt_aoe_adjacent" ? { radius: 1 }
      : targetingType === "tgt_aoe_cone" ? { radius: 2, angle: 120 }
      : targetingType === "tgt_aoe_line" ? { length: 3 }
      : targetingType === "tgt_aoe_radius2" ? { radius: 2 }
      : targetingType === "tgt_aoe_radius3" ? { radius: 3 }
      : {},
    powerMult: TARGETING_MULT[targetingType],
  };

  // Build modifiers from exploit conditions
  const modifiers: ModifierPrimitive[] = [];
  if (slot.conditions.exploits.length > 0) {
    modifiers.push({
      type: "mod_requireState",
      params: {
        condition: slot.conditions.exploits[0]!,
        bonusPercent: tier === 1 ? 20 : tier === 2 ? 30 : 50,
      },
      powerAdd: 2,
    });
  }

  // Build triggers for passives
  const triggers: TriggerPrimitive[] = [];
  if (isPassive) {
    const triggerEffect = buildPassiveTriggerEffect(themeId, tier, rng);
    if (triggerEffect) {
      triggers.push(triggerEffect);
    }
  }

  // Calculate power
  const power = calculatePowerBudget(effects, targeting, modifiers, triggers);

  // Derive cost
  const magical = isMagicalAbility(effects);
  const cost = isPassive
    ? { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false }
    : deriveCost(power, tier, rng, magical);

  // Generate name and description
  const uid = generateAbilityUID();
  const name = generateAbilityName(effects, targeting, isPassive, themeId, rng);

  const rarity = rollRarity(rng);

  const ability: GeneratedAbility = {
    uid,
    name,
    description: "", // Will be set after construction
    targeting,
    effects,
    modifiers,
    triggers,
    cost,
    powerBudget: power,
    weaponReq,
    tier,
    isPassive,
    rarity,
    synergyTags: {
      creates: [...slot.conditions.creates],
      exploits: [...slot.conditions.exploits],
    },
  };

  // Apply rarity scaling and bonuses
  applyRarityScaling(ability);
  if (rarity === "epic") addEpicBonus(ability, rng);
  if (rarity === "legendary") addLegendaryBonus(ability, rng);

  // Recalculate power and cost after rarity adjustments
  if (rarity !== "common") {
    ability.powerBudget = calculatePowerBudget(ability.effects, ability.targeting, ability.modifiers, ability.triggers);
    if (!isPassive) {
      ability.cost = deriveCost(ability.powerBudget, tier, rng, isMagicalAbility(ability.effects));
    }
  }

  // Execute abilities inherently create low_hp condition
  const hasExecute = ability.effects.some(e => e.type === "dmg_execute");
  if (hasExecute && !ability.synergyTags.creates.includes("low_hp")) {
    ability.synergyTags.creates.push("low_hp");
  }

  // Burn abilities inherently create burning condition
  const hasBurn = ability.effects.some(e => e.type === "dot_burn");
  if (hasBurn && !ability.synergyTags.creates.includes("burning")) {
    ability.synergyTags.creates.push("burning");
  }

  // Poison abilities inherently create poisoned condition
  const hasPoison = ability.effects.some(e => e.type === "dot_poison");
  if (hasPoison && !ability.synergyTags.creates.includes("poisoned")) {
    ability.synergyTags.creates.push("poisoned");
  }

  ability.description = generateDescription(ability);
  return ability;
}

/** Build trigger + triggered effect for passive abilities based on theme. */
function buildPassiveTriggerEffect(
  themeId: string,
  tier: 1 | 2 | 3,
  rng: () => number,
): TriggerPrimitive | null {
  switch (themeId) {
    case "reaper":
      // Blood Rush: on kill, refund AP
      return {
        type: "trg_onKill",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount: 3 },
          power: 3,
        },
      };

    case "executioner":
      // Smell Blood: +dmg vs low HP
      return {
        type: "trg_belowHP",
        params: { hpPercent: 50 },
        powerAdd: 4,
        triggeredEffect: {
          type: "dmg_weapon",
          params: { bonusPercent: 20 },
          power: 3,
        },
      };

    case "opportunist":
      // Opportunist's Eye: AP on debuff applied
      return {
        type: "trg_onHit",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount: 2 },
          power: 2,
        },
      };

    case "sentinel":
      // Hold the Line: +defense in stance
      return {
        type: "trg_turnStart",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "buff_stat",
          params: {
            stat: "dodge",
            amount: 10,
          },
          power: 3,
        },
      };

    case "pyromaniac":
      // Flame Mastery: +dmg vs burning targets
      return {
        type: "trg_belowHP",
        params: { hpPercent: 100 },
        powerAdd: 4,
        triggeredEffect: {
          type: "dmg_weapon",
          params: { bonusPercent: 20 },
          power: 3,
        },
      };

    case "venomancer":
      // Venom Sense: +dmg vs poisoned targets
      return {
        type: "trg_belowHP",
        params: { hpPercent: 100 },
        powerAdd: 4,
        triggeredEffect: {
          type: "dmg_weapon",
          params: { bonusPercent: 20 },
          power: 3,
        },
      };

    case "warden":
      // Warden's Resolve: damage reduction when hit
      return {
        type: "trg_onTakeDamage",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "buff_dmgReduce",
          params: { percent: 20 },
          power: 3,
        },
      };

    case "arcanist":
      // Spell Attunement: +dmg vs vulnerable targets
      return {
        type: "trg_belowHP",
        params: { hpPercent: 100 },
        powerAdd: 4,
        triggeredEffect: {
          type: "dmg_weapon",
          params: { bonusPercent: 20 },
          power: 3,
        },
      };

    case "hexcurser":
      // Dark Insight: AP refund when applying debuffs
      return {
        type: "trg_onHit",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount: 2 },
          power: 2,
        },
      };

    default:
      // Generic turn-start buff
      return {
        type: "trg_turnStart",
        params: {},
        powerAdd: 2,
        triggeredEffect: {
          type: "buff_stat",
          params: {
            stat: "meleeSkill",
            amount: 10,
          },
          power: 2,
        },
      };
  }
}

/**
 * Generate all 4 recruit skills for a theme.
 * Returns array of 4 GeneratedAbility objects (T1-T4), registered in the ability registry.
 *
 * Slot layout: T1 active, T2 passive (generated from T1), T3 active, T4 active/capstone.
 * The T2 passive is generated by PassiveGenerator based on the T1 active to ensure synergy.
 */
export function generateRecruitSkills(
  theme: Theme,
  rng: () => number,
): GeneratedAbility[] {
  const abilities: GeneratedAbility[] = [];

  // T1: first active
  const t1Slot = theme.progression[0]!;
  const t1 = generateAbility(t1Slot, 1, theme.id, theme.weaponAffinity, rng);
  registerAbility(t1);
  abilities.push(t1);

  // T2: passive generated from T1 active (synergistic)
  const t2Slot = theme.progression[1]!;
  if (t2Slot.isPassive) {
    const passive = generatePassiveFromActives([t1], "standard", rng, true);
    abilities.push(passive);
  } else {
    const t2 = generateAbility(t2Slot, 1, theme.id, theme.weaponAffinity, rng);
    registerAbility(t2);
    abilities.push(t2);
  }

  // T3: active
  const t3Slot = theme.progression[2]!;
  const t3 = generateAbility(t3Slot, 2, theme.id, theme.weaponAffinity, rng);
  registerAbility(t3);
  abilities.push(t3);

  // T4: capstone active
  const t4Slot = theme.progression[3]!;
  const t4 = generateAbility(t4Slot, 3, theme.id, theme.weaponAffinity, rng);
  registerAbility(t4);
  abilities.push(t4);

  return abilities;
}
