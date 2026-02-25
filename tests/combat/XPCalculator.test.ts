import { describe, it, expect } from "vitest";
import { World } from "@entities/World";
import { calculateBattleXP } from "@combat/XPCalculator";

function createTestWorld(unitNames: string[]): { world: World; ids: string[] } {
  const world = new World();
  const ids: string[] = [];

  for (const name of unitNames) {
    const id = world.createEntity();
    world.addComponent(id, {
      type: "stats",
      hitpoints: 60,
      fatigue: 100,
      resolve: 50,
      initiative: 100,
      meleeSkill: 50,
      rangedSkill: 30,
      meleeDefense: 10,
      rangedDefense: 5,
      movementPoints: 8,
      level: 1,
      experience: 0,
    });
    world.addComponent(id, {
      type: "health",
      current: 60,
      max: 60,
      injuries: [],
    });
    world.addComponent(id, {
      type: "team",
      team: "player",
      name,
    });
    ids.push(id);
  }

  return { world, ids };
}

describe("XPCalculator", () => {
  it("awards pooled kill XP + survival bonus + victory bonus on win", () => {
    const { world, ids } = createTestWorld(["Alice", "Bob"]);
    const awards = calculateBattleXP(true, 4, ids, world);

    expect(awards).toHaveLength(2);
    // 4 kills * 50 / 2 survivors = 100 per unit
    // + 30 survival + 100 victory = 230 each
    for (const award of awards) {
      expect(award.xpGained).toBe(230);
      expect(award.newTotal).toBe(230);
    }
  });

  it("awards no victory bonus on defeat", () => {
    const { world, ids } = createTestWorld(["Alice"]);
    const awards = calculateBattleXP(false, 2, ids, world);

    expect(awards).toHaveLength(1);
    // 2 kills * 50 / 1 = 100 + 30 survival = 130
    expect(awards[0]!.xpGained).toBe(130);
  });

  it("returns empty array for no survivors", () => {
    const { world } = createTestWorld([]);
    const awards = calculateBattleXP(true, 3, [], world);
    expect(awards).toHaveLength(0);
  });

  it("marks units that can level up", () => {
    const { world, ids } = createTestWorld(["Alice"]);
    // Give Alice enough XP to be close to level up (needs 200 for level 2)
    const stats = world.getComponent<{ readonly type: "stats"; experience: number }>(ids[0]!, "stats")!;
    stats.experience = 100;

    // 2 kills * 50 / 1 = 100 + 30 + 100 = 230
    // Total: 100 + 230 = 330 >= 200 → level up
    const awards = calculateBattleXP(true, 2, ids, world);
    expect(awards[0]!.leveledUp).toBe(true);
    expect(awards[0]!.newTotal).toBe(330);
  });

  it("does not mark level up if not enough XP", () => {
    const { world, ids } = createTestWorld(["Alice"]);
    // 1 kill * 50 / 1 = 50 + 30 = 80 (defeat, no victory bonus)
    // Total: 80 < 200 → no level up
    const awards = calculateBattleXP(false, 1, ids, world);
    expect(awards[0]!.leveledUp).toBe(false);
    expect(awards[0]!.newTotal).toBe(80);
  });
});
