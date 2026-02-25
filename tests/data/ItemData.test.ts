import { describe, it, expect } from "vitest";
import { getConsumable, getItemName } from "@data/ItemData";

describe("getConsumable", () => {
  it("returns health_potion definition", () => {
    const potion = getConsumable("health_potion");
    expect(potion).toBeDefined();
    expect(potion!.name).toBe("Health Potion");
    expect(potion!.apCost).toBe(4);
    expect(potion!.effect).toEqual({ type: "heal", amount: 25 });
  });

  it("returns undefined for unknown consumable", () => {
    expect(getConsumable("nonexistent")).toBeUndefined();
  });
});

describe("getItemName", () => {
  it("returns consumable name", () => {
    expect(getItemName("health_potion")).toBe("Health Potion");
  });

  it("returns weapon name", () => {
    expect(getItemName("arming_sword")).toBe("Arming Sword");
  });

  it("returns shield name", () => {
    expect(getItemName("buckler")).toBe("Buckler");
  });

  it("returns raw id for unknown item", () => {
    expect(getItemName("unknown_item")).toBe("unknown_item");
  });
});
