import { describe, it, expect } from "vitest";
import { calculateGoldReward, getItemPrice, getStoreInventory } from "@data/StoreData";

describe("StoreData", () => {
  describe("calculateGoldReward", () => {
    it("tutorial (3 kills, index 0) gives 250 gold", () => {
      expect(calculateGoldReward(3, 0)).toBe(250);
    });

    it("hill assault (5 kills, index 1) gives 375 gold", () => {
      expect(calculateGoldReward(5, 1)).toBe(375);
    });

    it("surrounded (8 kills, index 2) gives 550 gold", () => {
      expect(calculateGoldReward(8, 2)).toBe(550);
    });

    it("0 kills still gives victory + scenario bonus", () => {
      expect(calculateGoldReward(0, 0)).toBe(100);
    });
  });

  describe("getItemPrice", () => {
    it("returns correct price for known weapons", () => {
      expect(getItemPrice("arming_sword")).toBe(150);
      expect(getItemPrice("dagger")).toBe(50);
      expect(getItemPrice("longsword")).toBe(250);
    });

    it("returns correct price for armor", () => {
      expect(getItemPrice("mail_hauberk")).toBe(200);
      expect(getItemPrice("nasal_helm")).toBe(180);
    });

    it("returns correct price for shields", () => {
      expect(getItemPrice("heater_shield")).toBe(160);
      expect(getItemPrice("buckler")).toBe(60);
    });

    it("returns correct price for consumables", () => {
      expect(getItemPrice("health_potion")).toBe(40);
    });

    it("returns 0 for unknown items", () => {
      expect(getItemPrice("nonexistent")).toBe(0);
    });
  });

  describe("getStoreInventory", () => {
    it("returns items for all categories", () => {
      const inv = getStoreInventory();
      const categories = new Set(inv.map((i) => i.category));
      expect(categories.has("weapon")).toBe(true);
      expect(categories.has("shield")).toBe(true);
      expect(categories.has("body_armor")).toBe(true);
      expect(categories.has("head_armor")).toBe(true);
      expect(categories.has("consumable")).toBe(true);
    });

    it("every item has a price > 0", () => {
      const inv = getStoreInventory();
      for (const item of inv) {
        expect(item.price).toBeGreaterThan(0);
      }
    });

    it("includes expected number of items", () => {
      const inv = getStoreInventory();
      // 10 weapons + 3 shields + 4 body + 4 head + 1 consumable = 22
      expect(inv.length).toBe(22);
    });
  });
});
