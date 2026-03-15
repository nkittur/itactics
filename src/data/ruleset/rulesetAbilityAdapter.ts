/**
 * Converts a RulesetAbilityDef to GeneratedAbility so AbilityExecutor can run it unchanged.
 */

import type { GeneratedAbility, EffectPrimitive, TargetingPrimitive, AbilityCost, TriggerPrimitive } from "../AbilityData";
import type { RulesetAbilityDef } from "./RulesetSchema";

export function rulesetAbilityToGenerated(def: RulesetAbilityDef): GeneratedAbility {
  const targeting: TargetingPrimitive = {
    type: def.targeting.type,
    params: { ...def.targeting.params },
    powerMult: 1,
  };

  const effects: EffectPrimitive[] = def.effects.map((e) => ({
    type: e.type,
    params: { ...e.params },
    power: 0,
  }));

  const cost: AbilityCost = {
    ap: def.cost.ap,
    stamina: def.cost.stamina,
    mana: def.cost.mana,
    cooldown: def.cost.cooldown,
    turnEnding: def.cost.turnEnding,
    hpCost: def.cost.hpCost,
  };

  const isPassive =
    def.type.toLowerCase().includes("passive") ||
    def.type.toLowerCase() === "aura" ||
    def.type.toLowerCase() === "reactive";

  const triggers: TriggerPrimitive[] = def.trigger
    ? [{
        type: def.trigger.type,
        params: {},
        powerAdd: 0,
        triggeredEffect: {
          type: def.trigger.triggeredEffect.type,
          params: { ...def.trigger.triggeredEffect.params },
          power: 0,
        },
        ...(def.trigger.condition && { condition: def.trigger.condition }),
      }]
    : [];

  return {
    uid: def.id,
    name: def.name,
    description: def.description,
    targeting,
    effects,
    modifiers: [],
    triggers,
    cost,
    powerBudget: 0,
    weaponReq: def.weaponReq ?? [],
    tier: 1,
    isPassive,
    rarity: "common",
    synergyTags: { creates: [], exploits: [] },
    ...(def.returnToStoredPositionAfterExecute && { returnToStoredPositionAfterExecute: true }),
  };
}
