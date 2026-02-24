import { describe, it, expect } from "vitest";
import { World } from "@entities/World";
import { StatusEffectManager } from "@combat/StatusEffectManager";
import { RNG } from "@utils/RNG";

function createUnit(world: World, hp = 50): string {
  const id = world.createEntity();
  world.addComponent(id, { type: "health", current: hp, max: hp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: hp, fatigue: 100, resolve: 50, initiative: 100,
    meleeSkill: 60, rangedSkill: 30, meleeDefense: 10, rangedDefense: 10,
    level: 1, experience: 0,
  });
  world.addComponent(id, { type: "statusEffects", effects: [] });
  return id;
}

describe("StatusEffectManager", () => {
  describe("apply", () => {
    it("adds a non-stacking effect", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun");
      expect(sem.hasEffect(world, unit, "stun")).toBe(true);
    });

    it("refreshes duration for non-stacking effect", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun", 1);
      sem.apply(world, unit, "stun", 3);

      expect(sem.getStacks(world, unit, "stun")).toBe(1);
      // Duration should be refreshed to 3
      const comp = world.getComponent<any>(unit, "statusEffects");
      expect(comp.effects[0].remainingTurns).toBe(3);
    });

    it("stacks bleed up to max", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      for (let i = 0; i < 7; i++) {
        sem.apply(world, unit, "bleed", 2);
      }

      // Max 5 stacks
      expect(sem.getStacks(world, unit, "bleed")).toBe(5);
    });
  });

  describe("tickTurnStart", () => {
    it("deals bleed damage per stack", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(42));
      const unit = createUnit(world, 100);

      sem.apply(world, unit, "bleed", 3);
      sem.apply(world, unit, "bleed", 3);

      const result = sem.tickTurnStart(world, unit);
      expect(result).not.toBeNull();
      // 2 stacks * 5-10 damage each = 10-20 total
      expect(result!.damage).toBeGreaterThanOrEqual(10);
      expect(result!.damage).toBeLessThanOrEqual(20);
      expect(result!.killed).toBe(false);

      const health = world.getComponent<any>(unit, "health");
      expect(health.current).toBe(100 - result!.damage);
    });

    it("can kill a unit with bleed", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(42));
      const unit = createUnit(world, 5); // low HP

      sem.apply(world, unit, "bleed", 3);

      const result = sem.tickTurnStart(world, unit);
      expect(result).not.toBeNull();
      expect(result!.killed).toBe(true);
    });

    it("decrements durations and removes expired effects", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun", 1);
      expect(sem.hasEffect(world, unit, "stun")).toBe(true);

      sem.tickTurnStart(world, unit);
      // After tick, stun (1 turn) should be removed
      expect(sem.hasEffect(world, unit, "stun")).toBe(false);
    });

    it("multi-turn effects persist after one tick", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "daze", 2);
      sem.tickTurnStart(world, unit);
      expect(sem.hasEffect(world, unit, "daze")).toBe(true);

      sem.tickTurnStart(world, unit);
      expect(sem.hasEffect(world, unit, "daze")).toBe(false);
    });
  });

  describe("getModifier", () => {
    it("stun gives large negative defense", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun");
      const mod = sem.getModifier(world, unit, "meleeDefense", 10);
      expect(mod).toBe(-999);
    });

    it("daze gives -25% of base stat", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "daze");
      const mod = sem.getModifier(world, unit, "meleeSkill", 60);
      expect(mod).toBe(-15); // floor(60 * 0.25)
    });

    it("daze doesn't affect unrelated stats", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "daze");
      const mod = sem.getModifier(world, unit, "rangedSkill", 30);
      expect(mod).toBe(0);
    });

    it("fleeing gives -30 to melee skill", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "fleeing");
      const mod = sem.getModifier(world, unit, "meleeSkill", 60);
      expect(mod).toBe(-30);
    });

    it("returns 0 with no effects", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      expect(sem.getModifier(world, unit, "meleeSkill", 60)).toBe(0);
    });
  });

  describe("removeEffect / clearAll", () => {
    it("removes a specific effect", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun");
      sem.apply(world, unit, "bleed", 2);

      sem.removeEffect(world, unit, "stun");
      expect(sem.hasEffect(world, unit, "stun")).toBe(false);
      expect(sem.hasEffect(world, unit, "bleed")).toBe(true);
    });

    it("clears all effects", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "stun");
      sem.apply(world, unit, "bleed", 2);

      sem.clearAll(world, unit);
      expect(sem.hasEffect(world, unit, "stun")).toBe(false);
      expect(sem.hasEffect(world, unit, "bleed")).toBe(false);
    });
  });

  describe("getActiveEffects", () => {
    it("returns deduplicated effect names with stack counts", () => {
      const world = new World();
      const sem = new StatusEffectManager(new RNG(1));
      const unit = createUnit(world);

      sem.apply(world, unit, "bleed", 2);
      sem.apply(world, unit, "bleed", 2);
      sem.apply(world, unit, "stun");

      const effects = sem.getActiveEffects(world, unit);
      expect(effects).toContain("Bleeding x2");
      expect(effects).toContain("Stunned");
      expect(effects).toHaveLength(2);
    });
  });
});
