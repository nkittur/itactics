import { describe, it, expect } from "vitest";
import { RNG } from "@utils/RNG";

// We'll test the damage calculation logic directly
// Since DamageCalculator depends on World, we test the core math

describe("RNG", () => {
  it("produces deterministic results from same seed", () => {
    const rng1 = new RNG(42);
    const rng2 = new RNG(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    }
  });

  it("nextFloat returns values in [0, 1)", () => {
    const rng = new RNG(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextFloat();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("nextInt returns values in [min, max] inclusive", () => {
    const rng = new RNG(456);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });

  it("roll returns boolean", () => {
    const rng = new RNG(789);
    let trueCount = 0;
    let falseCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.roll(50)) {
        trueCount++;
      } else {
        falseCount++;
      }
    }
    // With 50% probability, both should be roughly 500 +/- 100
    expect(trueCount).toBeGreaterThan(350);
    expect(falseCount).toBeGreaterThan(350);
  });

  it("roll(0) always returns false", () => {
    const rng = new RNG(111);
    for (let i = 0; i < 100; i++) {
      expect(rng.roll(0)).toBe(false);
    }
  });

  it("roll(100) always returns true", () => {
    const rng = new RNG(222);
    for (let i = 0; i < 100; i++) {
      expect(rng.roll(100)).toBe(true);
    }
  });

  it("state save/restore produces same sequence", () => {
    const rng = new RNG(333);
    // Advance a bit
    for (let i = 0; i < 50; i++) rng.nextFloat();

    const state = rng.getState();
    const val1 = rng.nextFloat();
    const val2 = rng.nextFloat();

    rng.setState(state);
    expect(rng.nextFloat()).toBe(val1);
    expect(rng.nextFloat()).toBe(val2);
  });
});

describe("Damage Calculation Math", () => {
  it("hit chance clamps to 5-95", () => {
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    // Very high skill vs low defense
    expect(clamp(120, 5, 95)).toBe(95);
    // Very low skill vs high defense
    expect(clamp(-20, 5, 95)).toBe(5);
    // Normal range
    expect(clamp(65, 5, 95)).toBe(65);
  });

  it("armor absorbs damage correctly", () => {
    const baseDamage = 30;
    const armorDurability = 40;
    const armorDamageMult = 1.0; // 100% of damage hits armor
    const armorIgnorePct = 0.3; // 30% ignores armor

    const damageToArmor = Math.round(baseDamage * armorDamageMult * (1 - armorIgnorePct));
    const damageIgnoringArmor = Math.round(baseDamage * armorIgnorePct);

    const armorAfter = Math.max(0, armorDurability - damageToArmor);
    const overflow = Math.max(0, damageToArmor - armorDurability);

    // Total HP damage = ignored amount + any overflow
    const hpDamage = damageIgnoringArmor + overflow;

    expect(damageToArmor).toBe(21);
    expect(damageIgnoringArmor).toBe(9);
    expect(armorAfter).toBe(19);
    expect(overflow).toBe(0);
    expect(hpDamage).toBe(9);
  });

  it("damage overflows when armor breaks", () => {
    const baseDamage = 50;
    const armorDurability = 10;
    const armorDamageMult = 1.0;
    const armorIgnorePct = 0.3;

    const damageToArmor = Math.round(baseDamage * armorDamageMult * (1 - armorIgnorePct));
    const damageIgnoringArmor = Math.round(baseDamage * armorIgnorePct);
    const overflow = Math.max(0, damageToArmor - armorDurability);
    const hpDamage = damageIgnoringArmor + overflow;

    expect(damageToArmor).toBe(35);
    expect(overflow).toBe(25);
    expect(hpDamage).toBe(40); // 15 ignore + 25 overflow
  });
});
