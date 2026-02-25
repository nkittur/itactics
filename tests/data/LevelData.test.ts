import { describe, it, expect } from "vitest";
import { xpForNextLevel, cumulativeXPForLevel, canLevelUp, XP_TABLE, VETERAN_XP, MAX_REGULAR_LEVEL } from "@data/LevelData";

describe("LevelData", () => {
  describe("XP_TABLE", () => {
    it("has 10 entries (levels 1-10 → 2-11)", () => {
      expect(XP_TABLE.length).toBe(10);
    });

    it("first entry is 200 (level 1→2)", () => {
      expect(XP_TABLE[0]).toBe(200);
    });

    it("last entry is 3600 (level 10→11)", () => {
      expect(XP_TABLE[9]).toBe(3600);
    });
  });

  describe("xpForNextLevel", () => {
    it("level 1 needs 200 XP", () => {
      expect(xpForNextLevel(1)).toBe(200);
    });

    it("level 5 needs 1100 XP", () => {
      expect(xpForNextLevel(5)).toBe(1100);
    });

    it("level 10 needs 3600 XP", () => {
      expect(xpForNextLevel(10)).toBe(3600);
    });

    it("level 11 (veteran) needs 4500 XP", () => {
      expect(xpForNextLevel(11)).toBe(VETERAN_XP);
    });

    it("level 15 (veteran) needs 4500 XP", () => {
      expect(xpForNextLevel(15)).toBe(VETERAN_XP);
    });
  });

  describe("cumulativeXPForLevel", () => {
    it("level 1 requires 0 cumulative XP", () => {
      expect(cumulativeXPForLevel(1)).toBe(0);
    });

    it("level 2 requires 200 cumulative XP", () => {
      expect(cumulativeXPForLevel(2)).toBe(200);
    });

    it("level 3 requires 600 cumulative XP", () => {
      expect(cumulativeXPForLevel(3)).toBe(600);
    });

    it("level 11 requires 15100 cumulative XP", () => {
      expect(cumulativeXPForLevel(11)).toBe(15100);
    });
  });

  describe("canLevelUp", () => {
    it("level 1 with 200 XP can level up", () => {
      expect(canLevelUp(1, 200)).toBe(true);
    });

    it("level 1 with 199 XP cannot level up", () => {
      expect(canLevelUp(1, 199)).toBe(false);
    });

    it("level 1 with 0 XP cannot level up", () => {
      expect(canLevelUp(1, 0)).toBe(false);
    });

    it("level 10 with 15100 XP can level up", () => {
      expect(canLevelUp(10, 15100)).toBe(true);
    });

    it("level 10 with 15099 XP cannot level up", () => {
      expect(canLevelUp(10, 15099)).toBe(false);
    });
  });
});
