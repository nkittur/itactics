import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { World } from "@entities/World";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { PassiveResolver } from "@combat/PassiveResolver";
import { registerAbility, getAbilityRegistry, setAbilityRegistry } from "@data/AbilityResolver";
import type { GeneratedAbility } from "@data/AbilityData";
import type { EntityId } from "@entities/Entity";
import { RNG } from "@utils/RNG";

const REACTIVE_ROOT_UID = "ga_test_reactive_root";
const REACTIVE_REFLECT_UID = "ga_test_reactive_reflect";

function spawnUnit(
  world: World,
  opts: { hp?: number; abilityIds?: string[] },
): EntityId {
  const id = world.createEntity();
  world.addComponent(id, {
    type: "stats",
    hitpoints: opts.hp ?? 100,
    stamina: 100,
    mana: 20,
    resolve: 50,
    initiative: 100,
    meleeSkill: 50,
    rangedSkill: 30,
    dodge: 10,
    magicResist: 0,
    critChance: 5,
    critMultiplier: 1.5,
    movementPoints: 8,
    level: 1,
    experience: 0,
  });
  world.addComponent(id, {
    type: "health",
    current: opts.hp ?? 100,
    max: opts.hp ?? 100,
    injuries: [],
  });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  if (opts.abilityIds?.length) {
    world.addComponent(id, { type: "abilities", abilityIds: opts.abilityIds });
  }
  return id;
}

describe("On-take-damage reactive (Phase 4)", () => {
  let originalRegistry: Record<string, GeneratedAbility>;

  beforeEach(() => {
    originalRegistry = { ...getAbilityRegistry() };
  });

  afterEach(() => {
    setAbilityRegistry(originalRegistry);
  });

  it("trg_onTakeDamage with cc_root roots the attacker", () => {
    const passive: GeneratedAbility = {
      uid: REACTIVE_ROOT_UID,
      name: "Briar Lash",
      description: "When you take damage, root attacker for 1 turn.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_onTakeDamage",
          params: {},
          powerAdd: 0,
          triggeredEffect: {
            type: "cc_root",
            params: { turns: 1 },
            power: 0,
          },
        },
      ],
      cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
      powerBudget: 0,
      weaponReq: [],
      tier: 1,
      isPassive: true,
      rarity: "common",
      synergyTags: { creates: [], exploits: [] },
    };
    registerAbility(passive);

    const world = new World();
    const sem = new StatusEffectManager(new RNG(42));
    const resolver = new PassiveResolver(sem);

    const victim = spawnUnit(world, { hp: 100, abilityIds: [REACTIVE_ROOT_UID] });
    const attacker = spawnUnit(world, { hp: 100 });

    const result = resolver.onDamageTaken(world, victim, 20, attacker);
    expect(result.results.length).toBe(1);
    expect(result.results[0].effect).toContain("Root");
    expect(sem.hasEffect(world, attacker, "root")).toBe(true);
  });

  it("trg_onTakeDamage with dmg_reflect returns reflectDamage amount", () => {
    const passive: GeneratedAbility = {
      uid: REACTIVE_REFLECT_UID,
      name: "Thorns",
      description: "Reflect 10% of damage taken back to attacker.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_onTakeDamage",
          params: {},
          powerAdd: 0,
          triggeredEffect: {
            type: "dmg_reflect",
            params: { percent: 10 },
            power: 0,
          },
        },
      ],
      cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
      powerBudget: 0,
      weaponReq: [],
      tier: 1,
      isPassive: true,
      rarity: "common",
      synergyTags: { creates: [], exploits: [] },
    };
    registerAbility(passive);

    const world = new World();
    const sem = new StatusEffectManager(new RNG(42));
    const resolver = new PassiveResolver(sem);

    const victim = spawnUnit(world, { hp: 100, abilityIds: [REACTIVE_REFLECT_UID] });
    const attacker = spawnUnit(world, { hp: 100 });

    const result = resolver.onDamageTaken(world, victim, 50, attacker);
    expect(result.reflectDamage).toBe(5);
    expect(result.results.some((r) => r.effect.includes("Reflect"))).toBe(true);
  });
});
