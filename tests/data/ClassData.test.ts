import { describe, it, expect } from "vitest";
import "@data/classes/DesignDocClasses";
import {
  getClassDef,
  canEquipWeapon,
  canEquipArmor,
  canEquipShield,
  getClassAPDiscount,
  getClassDamageBonus,
  getClassHitBonus,
  getClassArmorMPReduction,
} from "@data/ClassData";
import { getWeapon } from "@data/WeaponData";
import { getArmorDef } from "@data/ArmorData";
import { getShield } from "@data/ShieldData";

describe("canEquipWeapon", () => {
  it("berserker can equip melee weapons", () => {
    const berserker = getClassDef("berserker");
    expect(canEquipWeapon(berserker, getWeapon("arming_sword"))).toBe(true);
    expect(canEquipWeapon(berserker, getWeapon("hand_axe"))).toBe(true);
    expect(canEquipWeapon(berserker, getWeapon("spear"))).toBe(true);
  });

  it("ranger can equip bow", () => {
    const ranger = getClassDef("ranger");
    expect(canEquipWeapon(ranger, getWeapon("short_bow"))).toBe(true);
    expect(canEquipWeapon(ranger, getWeapon("hunting_bow"))).toBe(true);
  });

  it("monk can equip dagger and staff but not sword", () => {
    const monk = getClassDef("monk");
    expect(canEquipWeapon(monk, getWeapon("dagger"))).toBe(true);
    expect(canEquipWeapon(monk, getWeapon("oak_staff"))).toBe(true);
    expect(canEquipWeapon(monk, getWeapon("arming_sword"))).toBe(false);
  });

  it("chronoweaver can equip staff but not melee weapons", () => {
    const chrono = getClassDef("chronoweaver");
    expect(canEquipWeapon(chrono, getWeapon("oak_staff"))).toBe(true);
    expect(canEquipWeapon(chrono, getWeapon("arming_sword"))).toBe(false);
    expect(canEquipWeapon(chrono, getWeapon("hand_axe"))).toBe(false);
  });
});

describe("canEquipArmor", () => {
  it("monk can equip light armor only", () => {
    const monk = getClassDef("monk");
    expect(canEquipArmor(monk, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(monk, getArmorDef("leather_jerkin")!)).toBe(true);
    expect(canEquipArmor(monk, getArmorDef("mail_hauberk")!)).toBe(false);
  });

  it("ranger can equip up to medium armor", () => {
    const ranger = getClassDef("ranger");
    expect(canEquipArmor(ranger, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(ranger, getArmorDef("mail_hauberk")!)).toBe(true);
    expect(canEquipArmor(ranger, getArmorDef("coat_of_plates")!)).toBe(false);
  });

  it("berserker can equip all armor tiers", () => {
    const berserker = getClassDef("berserker");
    expect(canEquipArmor(berserker, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(berserker, getArmorDef("mail_hauberk")!)).toBe(true);
    expect(canEquipArmor(berserker, getArmorDef("coat_of_plates")!)).toBe(true);
  });
});

describe("canEquipShield", () => {
  it("monk cannot equip any shield", () => {
    const monk = getClassDef("monk");
    expect(canEquipShield(monk, getShield("buckler")!)).toBe(false);
    expect(canEquipShield(monk, getShield("wooden_shield")!)).toBe(false);
  });

  it("ironbloom_warden can equip all shields", () => {
    const warden = getClassDef("ironbloom_warden");
    expect(canEquipShield(warden, getShield("buckler")!)).toBe(true);
    expect(canEquipShield(warden, getShield("wooden_shield")!)).toBe(true);
    expect(canEquipShield(warden, getShield("heater_shield")!)).toBe(true);
  });
});

describe("class bonuses", () => {
  it("design-doc classes have no innate AP discounts", () => {
    const berserker = getClassDef("berserker");
    expect(getClassAPDiscount(berserker, getWeapon("hand_axe"), "melee")).toBe(0);
  });

  it("design-doc classes have no innate damage bonuses", () => {
    const berserker = getClassDef("berserker");
    expect(getClassDamageBonus(berserker, getWeapon("longsword"))).toBe(0);
  });

  it("design-doc classes have no innate hit bonuses", () => {
    const ranger = getClassDef("ranger");
    expect(getClassHitBonus(ranger, getWeapon("short_bow"))).toBe(0);
  });

  it("design-doc classes have no armor MP reduction", () => {
    const warden = getClassDef("ironbloom_warden");
    expect(getClassArmorMPReduction(warden)).toBe(0);
  });
});
