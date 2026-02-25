import { describe, it, expect } from "vitest";
import {
  generateTalentStars,
  rollStatIncrease,
  getStatRollRange,
  ALL_STAT_KEYS,
  statDisplayName,
} from "@data/TalentData";

describe("TalentData", () => {
  describe("getStatRollRange", () => {
    it("0-star standard stat: +1 to +3", () => {
      expect(getStatRollRange("meleeSkill", 0)).toEqual([1, 3]);
    });

    it("3-star standard stat: +4 to +6", () => {
      expect(getStatRollRange("meleeDefense", 3)).toEqual([4, 6]);
    });

    it("0-star HP (high range): +2 to +4", () => {
      expect(getStatRollRange("hitpoints", 0)).toEqual([2, 4]);
    });

    it("3-star fatigue (high range): +5 to +7", () => {
      expect(getStatRollRange("fatigue", 3)).toEqual([5, 7]);
    });

    it("2-star initiative: +3 to +5", () => {
      expect(getStatRollRange("initiative", 2)).toEqual([3, 5]);
    });
  });

  describe("rollStatIncrease", () => {
    it("returns a value within the roll range", () => {
      for (let i = 0; i < 50; i++) {
        const roll = rollStatIncrease("meleeSkill", 1, Math.random);
        expect(roll).toBeGreaterThanOrEqual(2);
        expect(roll).toBeLessThanOrEqual(4);
      }
    });

    it("returns a value within HP range", () => {
      for (let i = 0; i < 50; i++) {
        const roll = rollStatIncrease("hitpoints", 2, Math.random);
        expect(roll).toBeGreaterThanOrEqual(4);
        expect(roll).toBeLessThanOrEqual(6);
      }
    });

    it("uses the provided rng function", () => {
      // rng returning 0 should give min value
      expect(rollStatIncrease("meleeSkill", 0, () => 0)).toBe(1);
      // rng returning 0.99 should give max value
      expect(rollStatIncrease("meleeSkill", 0, () => 0.99)).toBe(3);
    });
  });

  describe("generateTalentStars", () => {
    it("generates stars for all 8 stats", () => {
      const stars = generateTalentStars(Math.random);
      expect(Object.keys(stars).length).toBe(8);
      for (const key of ALL_STAT_KEYS) {
        expect(stars[key]).toBeGreaterThanOrEqual(0);
        expect(stars[key]).toBeLessThanOrEqual(3);
      }
    });

    it("total stars is between 6 and 8", () => {
      for (let i = 0; i < 20; i++) {
        const stars = generateTalentStars(Math.random);
        const total = Object.values(stars).reduce((a, b) => a + b, 0);
        expect(total).toBeGreaterThanOrEqual(6);
        expect(total).toBeLessThanOrEqual(8);
      }
    });

    it("no stat exceeds 3 stars", () => {
      for (let i = 0; i < 20; i++) {
        const stars = generateTalentStars(Math.random);
        for (const key of ALL_STAT_KEYS) {
          expect(stars[key]).toBeLessThanOrEqual(3);
        }
      }
    });
  });

  describe("statDisplayName", () => {
    it("returns correct display names", () => {
      expect(statDisplayName("hitpoints")).toBe("HP");
      expect(statDisplayName("meleeSkill")).toBe("Melee Skill");
      expect(statDisplayName("rangedDefense")).toBe("Ranged Def");
    });
  });
});
