import type { GeneratedAbility, EffectPrimitive, ModifierPrimitive, TriggerPrimitive } from "./AbilityData";

function fmtEffect(e: EffectPrimitive): string {
  const p = e.params;
  switch (e.type) {
    case "dmg_weapon":     return `dmg_wpn(${Math.round((p["multiplier"] as number) * 100)}%)`;
    case "dmg_execute":    return `execute(${Math.round((p["multiplier"] as number) * 100)}%,<${p["hpThreshold"]}%hp)`;
    case "dmg_multihit":   return `multi(${p["hits"]}x${Math.round((p["multPerHit"] as number) * 100)}%)`;
    case "dmg_spell":      return `spell(${Math.round((p["multiplier"] as number) * 100)}%)`;
    case "dot_bleed":      return `bleed(${p["dmgPerTurn"]}/t,${p["turns"]}t)`;
    case "dot_burn":       return `burn(${p["dmgPerTurn"]}/t,${p["turns"]}t)`;
    case "dot_poison":     return `poison(${p["dmgPerTurn"]}/t,${p["turns"]}t)`;
    case "disp_push":      return `push(${p["distance"]})`;
    case "cc_stun":        return `stun(${p["chance"]}%)`;
    case "cc_root":        return `root(${p["turns"]}t)`;
    case "cc_daze":        return `daze(-${p["apLoss"]}ap)`;
    case "debuff_stat":    return `debuff(${p["stat"]}-${p["amount"]},${p["turns"]}t)`;
    case "debuff_vuln":    return `vuln(+${p["bonusDmg"]}%)`;
    case "buff_stat":      return `buff(${p["stat"]}+${p["amount"]})`;
    case "buff_dmgReduce": return `dmgRed(${p["percent"]}%)`;
    case "stance_counter": return "counter";
    case "stance_overwatch": return "overwatch";
    case "res_apRefund":   return `apRef(${p["amount"]})`;
    case "heal_pctDmg":    return `heal(${p["pct"]}%dmg)`;
    default: return e.type;
  }
}

function fmtModifier(m: ModifierPrimitive): string {
  const p = m.params;
  switch (m.type) {
    case "mod_accuracy":     return `acc(${p["bonus"] ?? "?"})`;
    case "mod_armorIgnore":  return `ignArmor(${p["percent"] ?? "?"}%)`;
    case "mod_armorDmg":     return `armorDmg(${p["bonus"] ?? "?"})`;
    case "mod_headTarget":   return "headshot";
    case "mod_requireState": return `req(${p["state"] ?? "?"})`;
    case "mod_turnEnding":   return "turnEnd";
    default: return m.type;
  }
}

function fmtTrigger(t: TriggerPrimitive): string {
  const base = t.type.replace("trg_", "");
  const eff = t.triggeredEffect ? ` → ${fmtEffect(t.triggeredEffect)}` : "";
  return `${base}${eff}`;
}

export function formatAbilityEffects(ability: GeneratedAbility): string {
  const parts: string[] = [];

  if (ability.isPassive) parts.push("[P]");

  for (const e of ability.effects) parts.push(fmtEffect(e));
  for (const m of ability.modifiers) parts.push(fmtModifier(m));
  for (const t of ability.triggers) parts.push(fmtTrigger(t));

  parts.push(ability.targeting.type.replace("tgt_", ""));

  const cost: string[] = [`AP:${ability.cost.ap}`];
  if (ability.cost.stamina > 0) cost.push(`STA:${ability.cost.stamina}`);
  if (ability.cost.mana > 0) cost.push(`MP:${ability.cost.mana}`);
  if (ability.cost.cooldown > 0) cost.push(`CD:${ability.cost.cooldown}`);
  if (ability.cost.turnEnding) cost.push("TE");
  parts.push(cost.join(","));

  return parts.join(" | ");
}
