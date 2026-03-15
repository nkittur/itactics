import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RNG } from "@utils/RNG";
import { World } from "@entities/World";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { PassiveResolver } from "@combat/PassiveResolver";
import { registerAbility, getAbilityRegistry, setAbilityRegistry } from "@data/AbilityResolver";
import type { GeneratedAbility } from "@data/AbilityData";
import type { EntityId } from "@entities/Entity";

const TEST_PASSIVE_UID = "ga_test_on_dodge";

function spawnUnit(
  world: World,
  opts: { dodge?: number; hp?: number; abilityIds?: string[] },
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
    dodge: opts.dodge ?? 10,
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
  world.addComponent(id, {
    type: "equipment",
    mainHand: "arming_sword",
    offHand: null,
    accessory: null,
    bag: [],
  });
  world.addComponent(id, { type: "armor", head: null, body: null });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  if (opts.abilityIds?.length) {
    world.addComponent(id, { type: "abilities", abilityIds: opts.abilityIds });
  }
  return id;
}

describe("On-dodge (R2)", () => {
  let originalRegistry: Record<string, GeneratedAbility>;

  beforeEach(() => {
    originalRegistry = { ...getAbilityRegistry() };
    const passive: GeneratedAbility = {
      uid: TEST_PASSIVE_UID,
      name: "Test On Dodge",
      description: "When you dodge, gain +20 dodge for 1 turn.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_onDodge",
          params: {},
          powerAdd: 0,
          triggeredEffect: {
            type: "buff_stat",
            params: { stat: "dodge", amount: 20, turns: 1 },
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
  });

  afterEach(() => {
    setAbilityRegistry(originalRegistry);
  });

  it("PassiveResolver.onDodge applies buff_stat to dodger", () => {
    const world = new World();
    const rng = new RNG(42);
    const sem = new StatusEffectManager(rng);
    const resolver = new PassiveResolver(sem);

    const dodger = spawnUnit(world, { dodge: 10, abilityIds: [TEST_PASSIVE_UID] });
    const attacker = spawnUnit(world, {});

    const { results } = resolver.onDodge(world, dodger, attacker);
    expect(results.length).toBe(1);
    expect(results[0].effect).toContain("20");
    expect(results[0].effect).toContain("dodge");

    const comp = world.getComponent<{ effects: { id: string; modifiers: Record<string, number> }[] }>(dodger, "statusEffects");
    expect(comp).toBeDefined();
    const buff = comp!.effects.find((e) => e.id === "buff_dodge_on_dodge");
    expect(buff).toBeDefined();
    expect(buff!.modifiers.dodge).toBe(20);
  });

  it("onDodge returns passive result and applies buff so DamageCalculator sees higher effective dodge", () => {
    const world = new World();
    const rng = new RNG(42);
    const sem = new StatusEffectManager(rng);
    const resolver = new PassiveResolver(sem);

    const dodger = spawnUnit(world, { dodge: 10, abilityIds: [TEST_PASSIVE_UID] });
    const attacker = spawnUnit(world, {});

    resolver.onDodge(world, dodger, attacker);

    const dodgeMod = sem.getModifier(world, dodger, "dodge", 10);
    expect(dodgeMod).toBe(20);
  });

  it("onDodge with res_apRefund returns apRefund for the dodger", () => {
    const apPassiveUid = "ga_test_on_dodge_ap";
    const apPassive: GeneratedAbility = {
      uid: apPassiveUid,
      name: "Dodge Refund",
      description: "When you dodge, gain 1 AP (applied at start of your next turn).",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_onDodge",
          params: {},
          powerAdd: 0,
          triggeredEffect: { type: "res_apRefund", params: { amount: 1 }, power: 0 },
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
    registerAbility(apPassive);

    const world = new World();
    const rng = new RNG(42);
    const sem = new StatusEffectManager(rng);
    const resolver = new PassiveResolver(sem);
    const dodger = spawnUnit(world, { abilityIds: [apPassiveUid] });
    const attacker = spawnUnit(world, {});

    const { results, grants } = resolver.onDodge(world, dodger, attacker);
    expect(grants.ap).toBe(1);
    expect(results.some((r) => r.effect.includes("AP"))).toBe(true);
  });
});
