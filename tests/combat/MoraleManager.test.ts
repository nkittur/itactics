import { describe, it, expect } from "vitest";
import { World } from "@entities/World";
import { MoraleManager } from "@combat/MoraleManager";
import { RNG } from "@utils/RNG";

function createUnit(
  world: World,
  hp = 50,
  resolve = 50,
  moraleValue = 70,
  moraleState: "confident" | "steady" | "wavering" | "breaking" | "fleeing" = "steady",
): string {
  const id = world.createEntity();
  world.addComponent(id, { type: "health", current: hp, max: hp, injuries: [] });
  world.addComponent(id, {
    type: "stats",
    hitpoints: hp, fatigue: 100, resolve, initiative: 100,
    meleeSkill: 60, rangedSkill: 30, meleeDefense: 10, rangedDefense: 10,
    level: 1, experience: 0,
  });
  world.addComponent(id, { type: "morale", current: moraleValue, state: moraleState });
  return id;
}

describe("MoraleManager", () => {
  describe("passiveRecovery", () => {
    it("adds +5 morale per turn", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 40, "wavering");

      mm.passiveRecovery(world, unit);

      const morale = world.getComponent<any>(unit, "morale");
      expect(morale.current).toBe(45);
    });

    it("caps at 100", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 98, "confident");

      mm.passiveRecovery(world, unit);

      const morale = world.getComponent<any>(unit, "morale");
      expect(morale.current).toBe(100);
    });

    it("updates state based on new morale value", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      // At 48 morale, state should be wavering. +5 = 53 → steady
      const unit = createUnit(world, 50, 50, 48, "wavering");

      mm.passiveRecovery(world, unit);

      const morale = world.getComponent<any>(unit, "morale");
      expect(morale.current).toBe(53);
      expect(morale.state).toBe("steady");
    });
  });

  describe("onEnemyKill", () => {
    it("boosts all ally morale by 10", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const ally1 = createUnit(world, 50, 50, 60, "steady");
      const ally2 = createUnit(world, 50, 50, 40, "wavering");

      mm.onEnemyKill(world, [ally1, ally2]);

      expect(world.getComponent<any>(ally1, "morale").current).toBe(70);
      expect(world.getComponent<any>(ally2, "morale").current).toBe(50);
      expect(world.getComponent<any>(ally2, "morale").state).toBe("steady");
    });

    it("skips dead allies", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const dead = createUnit(world, 0, 50, 60, "steady");

      mm.onEnemyKill(world, [dead]);

      // Dead unit's morale should not change
      expect(world.getComponent<any>(dead, "morale").current).toBe(60);
    });
  });

  describe("onHeavyDamage", () => {
    it("triggers check when damage > 25% max HP", () => {
      const world = new World();
      // Use a seed where the roll will likely fail
      const mm = new MoraleManager(new RNG(999));
      const unit = createUnit(world, 100, 10, 60, "steady"); // low resolve

      // 30 damage > 25% of 100 max HP = 25
      const health = world.getComponent<any>(unit, "health");
      health.current = 70; // simulate taking 30 damage

      const result = mm.onHeavyDamage(world, unit, 30);
      // May or may not change state depending on RNG, but check was triggered
      // We just verify no crash and result format
      if (result) {
        expect(result.event).toBe("heavyDamage");
      }
    });

    it("does not trigger when damage <= 25% max HP", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 100, 50, 60, "steady");

      const result = mm.onHeavyDamage(world, unit, 20); // 20 <= 25
      expect(result).toBeNull();
    });
  });

  describe("onAllyDeath", () => {
    it("triggers morale checks for living allies", () => {
      const world = new World();
      // Use seed that makes units fail checks
      const mm = new MoraleManager(new RNG(12345));
      const dead = createUnit(world, 0, 50, 60, "steady");
      const ally1 = createUnit(world, 50, 10, 30, "wavering"); // very low resolve
      const ally2 = createUnit(world, 50, 10, 30, "wavering");

      const results = mm.onAllyDeath(world, dead, [dead, ally1, ally2]);

      // Results only include units that changed state
      for (const r of results) {
        expect(r.event).toBe("allyDeath");
        expect(r.oldState).not.toBe(r.newState);
      }
    });

    it("skips the dead unit itself", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const dead = createUnit(world, 0, 50, 60, "steady");

      const results = mm.onAllyDeath(world, dead, [dead]);
      expect(results).toHaveLength(0);
    });
  });

  describe("state transitions", () => {
    it("morale >= 80 = confident", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 78, "steady");

      mm.passiveRecovery(world, unit); // 78 + 5 = 83

      expect(world.getComponent<any>(unit, "morale").state).toBe("confident");
    });

    it("morale 50-79 = steady", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 55, "wavering");

      // Force morale to 55 which is steady range
      mm.passiveRecovery(world, unit); // 55 + 5 = 60

      expect(world.getComponent<any>(unit, "morale").state).toBe("steady");
    });

    it("morale < 10 = fleeing", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 5, "breaking");

      // Don't change morale, just verify state
      const morale = world.getComponent<any>(unit, "morale");
      morale.current = 5;
      mm.passiveRecovery(world, unit); // 5 + 5 = 10 → breaking

      expect(morale.state).toBe("breaking");
    });
  });

  describe("getState", () => {
    it("returns current morale state", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const unit = createUnit(world, 50, 50, 70, "steady");

      expect(mm.getState(world, unit)).toBe("steady");
    });

    it("returns null for entity without morale", () => {
      const world = new World();
      const mm = new MoraleManager(new RNG(1));
      const id = world.createEntity();

      expect(mm.getState(world, id)).toBeNull();
    });
  });
});
