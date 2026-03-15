import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { World } from "@entities/World";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { PassiveResolver } from "@combat/PassiveResolver";
import { registerAbility, getAbilityRegistry, setAbilityRegistry } from "@data/AbilityResolver";
import type { GeneratedAbility } from "@data/AbilityData";
import type { EntityId } from "@entities/Entity";
import { RNG } from "@utils/RNG";

function spawnUnit(world: World, hp = 100, abilityIds?: string[]): EntityId {
  const id = world.createEntity();
  world.addComponent(id, {
    type: "stats",
    hitpoints: hp,
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
  world.addComponent(id, { type: "health", current: hp, max: hp, injuries: [] });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  if (abilityIds?.length) {
    world.addComponent(id, { type: "abilities", abilityIds });
  }
  return id;
}

describe("Phase 5a: DoT tick rate multiplier", () => {
  const rng = new RNG(42);
  let world: World;
  let statusEffects: StatusEffectManager;

  beforeEach(() => {
    world = new World();
    statusEffects = new StatusEffectManager(rng);
  });

  it("getDotTickRateMult returns 1 when source has no modifier", () => {
    const sourceId = spawnUnit(world);
    expect(statusEffects.getDotTickRateMult(world, sourceId)).toBe(1);
    expect(statusEffects.getDotTickRateMult(world, null)).toBe(1);
  });

  it("getDotTickRateMult returns 1.25 when source has accelerate_rot", () => {
    const sourceId = spawnUnit(world);
    statusEffects.apply(world, sourceId, "accelerate_rot", 5);
    expect(statusEffects.getDotTickRateMult(world, sourceId)).toBe(1.25);
  });

  it("DoT on target ticks 25% higher when applier has accelerate_rot", () => {
    const applierId = spawnUnit(world);
    const targetId = spawnUnit(world, 100);
    statusEffects.apply(world, applierId, "accelerate_rot", 5);

    statusEffects.applyDynamic(world, targetId, {
      id: "bleed",
      name: "Bleeding",
      duration: 2,
      modifiers: {},
      maxStacks: 5,
      dmgPerTurn: 8,
      sourceId: applierId,
    });

    const healthBefore = world.getComponent(targetId, "health") as { current: number };
    const before = healthBefore.current;

    statusEffects.tickTurnStart(world, targetId);

    const healthAfter = world.getComponent(targetId, "health") as { current: number };
    const after = healthAfter.current;
    const damageDealt = before - after;

    // Base 8 * 1.25 = 10 per tick
    expect(damageDealt).toBe(10);
  });

  it("DoT without sourceId uses tick rate 1 (no multiplier)", () => {
    const targetId = spawnUnit(world, 100);
    statusEffects.applyDynamic(world, targetId, {
      id: "bleed",
      name: "Bleeding",
      duration: 2,
      modifiers: {},
      maxStacks: 5,
      dmgPerTurn: 8,
      // no sourceId
    });

    const before = (world.getComponent(targetId, "health") as { current: number }).current;
    statusEffects.tickTurnStart(world, targetId);
    const after = (world.getComponent(targetId, "health") as { current: number }).current;
    expect(before - after).toBe(8);
  });
});

describe("Phase 5b: Extend buff on kill", () => {
  const rng = new RNG(42);
  let world: World;
  let statusEffects: StatusEffectManager;
  let passiveResolver: PassiveResolver;
  let originalRegistry: Record<string, GeneratedAbility>;

  const EXTEND_HASTE_UID = "ga_test_extend_haste";

  beforeEach(() => {
    world = new World();
    statusEffects = new StatusEffectManager(rng);
    passiveResolver = new PassiveResolver(statusEffects);
    originalRegistry = { ...getAbilityRegistry() };
  });

  afterEach(() => {
    setAbilityRegistry(originalRegistry);
  });

  it("extendDuration adds turns to existing status", () => {
    const entityId = spawnUnit(world);
    statusEffects.apply(world, entityId, "haste", 2);

    const comp = world.getComponent(entityId, "statusEffects") as { effects: { id: string; remainingTurns: number }[] };
    const hasteEffect = comp.effects.find(e => e.id === "haste");
    expect(hasteEffect?.remainingTurns).toBe(2);

    const extended = statusEffects.extendDuration(world, entityId, "haste", 1);
    expect(extended).toBe(true);
    const hasteAfter = comp.effects.find(e => e.id === "haste");
    expect(hasteAfter?.remainingTurns).toBe(3);
  });

  it("extendDuration returns false when entity does not have status", () => {
    const entityId = spawnUnit(world);
    const extended = statusEffects.extendDuration(world, entityId, "haste", 1);
    expect(extended).toBe(false);
  });

  it("onKill with extend_status extends haste on killer", () => {
    const killerId = spawnUnit(world);
    const killedId = spawnUnit(world);
    statusEffects.apply(world, killerId, "haste", 2);

    const passive: GeneratedAbility = {
      uid: EXTEND_HASTE_UID,
      name: "Cascade",
      description: "Kills during haste extend haste by 1 turn.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_onKill",
          params: {},
          powerAdd: 0,
          triggeredEffect: {
            type: "extend_status",
            params: { statusId: "haste", turns: 1 },
            power: 0,
          },
        },
      ],
      cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
      powerBudget: 0,
      isPassive: true,
    };
    registerAbility(passive);
    world.addComponent(killerId, { type: "abilities", abilityIds: [EXTEND_HASTE_UID] });

    const compBefore = world.getComponent(killerId, "statusEffects") as { effects: { id: string; remainingTurns: number }[] };
    expect(compBefore.effects.find(e => e.id === "haste")?.remainingTurns).toBe(2);

    const { results } = passiveResolver.onKill(world, killerId, killedId);
    expect(results.some(r => r.effect.includes("Extend") && r.effect.includes("haste"))).toBe(true);

    const compAfter = world.getComponent(killerId, "statusEffects") as { effects: { id: string; remainingTurns: number }[] };
    expect(compAfter.effects.find(e => e.id === "haste")?.remainingTurns).toBe(3);
  });
});

describe("Phase 5: apply_status (turn start)", () => {
  const APPLY_STATUS_UID = "ga_test_apply_status";
  const rng = new RNG(42);
  let world: World;
  let statusEffects: StatusEffectManager;
  let passiveResolver: PassiveResolver;
  let originalRegistry: ReturnType<typeof getAbilityRegistry>;

  beforeEach(() => {
    world = new World();
    statusEffects = new StatusEffectManager(rng);
    passiveResolver = new PassiveResolver(statusEffects);
    originalRegistry = { ...getAbilityRegistry() };
  });

  afterEach(() => {
    setAbilityRegistry(originalRegistry);
  });

  it("onTurnStart with apply_status applies status to self", () => {
    const entityId = spawnUnit(world, 100, [APPLY_STATUS_UID]);
    const passive: GeneratedAbility = {
      uid: APPLY_STATUS_UID,
      name: "Accelerate Rot",
      description: "Your DoTs tick 25% faster.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_turnStart",
          params: {},
          powerAdd: 0,
          triggeredEffect: { type: "apply_status", params: { statusId: "accelerate_rot", turns: 1 }, power: 0 },
        },
      ],
      cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
      powerBudget: 0,
      isPassive: true,
    };
    registerAbility(passive);

    const compBefore = world.getComponent(entityId, "statusEffects") as { effects: { id: string }[] };
    expect(compBefore.effects.some(e => e.id === "accelerate_rot")).toBe(false);

    const { results } = passiveResolver.onTurnStart(world, entityId);
    expect(results.some(r => r.effect.includes("accelerate_rot"))).toBe(true);

    const compAfter = world.getComponent(entityId, "statusEffects") as { effects: { id: string }[] };
    expect(compAfter.effects.some(e => e.id === "accelerate_rot")).toBe(true);
  });
});

describe("Trigger condition (while [X])", () => {
  const BLUR_UID = "ga_test_blur";
  const rng = new RNG(42);
  let world: World;
  let statusEffects: StatusEffectManager;
  let passiveResolver: PassiveResolver;
  let originalRegistry: ReturnType<typeof getAbilityRegistry>;

  beforeEach(() => {
    world = new World();
    statusEffects = new StatusEffectManager(rng);
    passiveResolver = new PassiveResolver(statusEffects);
    originalRegistry = { ...getAbilityRegistry() };
  });

  afterEach(() => {
    setAbilityRegistry(originalRegistry);
  });

  it("turnStart with condition has_status: only fires when entity has that status", () => {
    const passive: GeneratedAbility = {
      uid: BLUR_UID,
      name: "Blur",
      description: "While hasted, gain 20% evasion.",
      targeting: { type: "tgt_self", params: {}, powerMult: 1 },
      effects: [],
      modifiers: [],
      triggers: [
        {
          type: "trg_turnStart",
          params: {},
          powerAdd: 0,
          triggeredEffect: { type: "buff_stat", params: { stat: "dodge", amount: 20, turns: 1 }, power: 0 },
          condition: { type: "has_status", statusId: "haste" },
        },
      ],
      cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
      powerBudget: 0,
      isPassive: true,
    };
    registerAbility(passive);

    const entityId = spawnUnit(world, 100, [BLUR_UID]);

    const { results: resultsNoHaste } = passiveResolver.onTurnStart(world, entityId);
    expect(resultsNoHaste.length).toBe(0);
    const compNoHaste = world.getComponent(entityId, "statusEffects") as { effects: { id: string }[] };
    expect(compNoHaste.effects.some(e => e.id === "buff_dodge_turnStart")).toBe(false);

    statusEffects.apply(world, entityId, "haste", 2);

    const { results: resultsWithHaste } = passiveResolver.onTurnStart(world, entityId);
    expect(resultsWithHaste.length).toBe(1);
    expect(resultsWithHaste[0].effect).toContain("20");
    expect(resultsWithHaste[0].effect).toContain("dodge");
    const compWithHaste = world.getComponent(entityId, "statusEffects") as { effects: { id: string }[] };
    expect(compWithHaste.effects.some(e => e.id === "buff_dodge_turnStart")).toBe(true);
  });
});
