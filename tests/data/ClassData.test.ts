import { describe, it, expect } from "vitest";
import "@data/classes/ClassRegistry";
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
  it("fighter can equip all melee weapons", () => {
    const fighter = getClassDef("fighter");
    expect(canEquipWeapon(fighter, getWeapon("arming_sword"))).toBe(true);
    expect(canEquipWeapon(fighter, getWeapon("hand_axe"))).toBe(true);
    expect(canEquipWeapon(fighter, getWeapon("spear"))).toBe(true);
    expect(canEquipWeapon(fighter, getWeapon("dagger"))).toBe(true);
    expect(canEquipWeapon(fighter, getWeapon("winged_mace"))).toBe(true);
    expect(canEquipWeapon(fighter, getWeapon("longsword"))).toBe(true);
  });

  it("fighter cannot equip bows", () => {
    const fighter = getClassDef("fighter");
    expect(canEquipWeapon(fighter, getWeapon("short_bow"))).toBe(false);
    expect(canEquipWeapon(fighter, getWeapon("hunting_bow"))).toBe(false);
  });

  it("knight can equip 1H sword and mace but not 2H", () => {
    const knight = getClassDef("knight");
    expect(canEquipWeapon(knight, getWeapon("arming_sword"))).toBe(true);
    expect(canEquipWeapon(knight, getWeapon("winged_mace"))).toBe(true);
    expect(canEquipWeapon(knight, getWeapon("longsword"))).toBe(false); // 2H
  });

  it("knight cannot equip axes or daggers", () => {
    const knight = getClassDef("knight");
    expect(canEquipWeapon(knight, getWeapon("hand_axe"))).toBe(false);
    expect(canEquipWeapon(knight, getWeapon("dagger"))).toBe(false);
  });

  it("rogue cannot equip axe or mace", () => {
    const rogue = getClassDef("rogue");
    expect(canEquipWeapon(rogue, getWeapon("hand_axe"))).toBe(false);
    expect(canEquipWeapon(rogue, getWeapon("winged_mace"))).toBe(false);
  });

  it("rogue can equip dagger, sword, cleaver", () => {
    const rogue = getClassDef("rogue");
    expect(canEquipWeapon(rogue, getWeapon("dagger"))).toBe(true);
    expect(canEquipWeapon(rogue, getWeapon("arming_sword"))).toBe(true);
    expect(canEquipWeapon(rogue, getWeapon("short_sword"))).toBe(true);
  });

  it("ranger can equip bow and dagger", () => {
    const ranger = getClassDef("ranger");
    expect(canEquipWeapon(ranger, getWeapon("short_bow"))).toBe(true);
    expect(canEquipWeapon(ranger, getWeapon("hunting_bow"))).toBe(true);
    expect(canEquipWeapon(ranger, getWeapon("dagger"))).toBe(true);
  });
});

describe("canEquipArmor", () => {
  it("rogue can equip light armor only", () => {
    const rogue = getClassDef("rogue");
    expect(canEquipArmor(rogue, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(rogue, getArmorDef("leather_jerkin")!)).toBe(true);
    expect(canEquipArmor(rogue, getArmorDef("mail_hauberk")!)).toBe(false);
    expect(canEquipArmor(rogue, getArmorDef("coat_of_plates")!)).toBe(false);
  });

  it("ranger can equip up to medium armor", () => {
    const ranger = getClassDef("ranger");
    expect(canEquipArmor(ranger, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(ranger, getArmorDef("mail_hauberk")!)).toBe(true);
    expect(canEquipArmor(ranger, getArmorDef("coat_of_plates")!)).toBe(false);
  });

  it("fighter can equip all armor tiers", () => {
    const fighter = getClassDef("fighter");
    expect(canEquipArmor(fighter, getArmorDef("linen_tunic")!)).toBe(true);
    expect(canEquipArmor(fighter, getArmorDef("mail_hauberk")!)).toBe(true);
    expect(canEquipArmor(fighter, getArmorDef("coat_of_plates")!)).toBe(true);
  });
});

describe("canEquipShield", () => {
  it("rogue can only equip buckler", () => {
    const rogue = getClassDef("rogue");
    expect(canEquipShield(rogue, getShield("buckler")!)).toBe(true);
    expect(canEquipShield(rogue, getShield("wooden_shield")!)).toBe(false);
    expect(canEquipShield(rogue, getShield("heater_shield")!)).toBe(false);
  });

  it("brute cannot equip any shield", () => {
    const brute = getClassDef("brute");
    expect(canEquipShield(brute, getShield("buckler")!)).toBe(false);
    expect(canEquipShield(brute, getShield("wooden_shield")!)).toBe(false);
  });

  it("fighter can equip all shields", () => {
    const fighter = getClassDef("fighter");
    expect(canEquipShield(fighter, getShield("buckler")!)).toBe(true);
    expect(canEquipShield(fighter, getShield("wooden_shield")!)).toBe(true);
    expect(canEquipShield(fighter, getShield("heater_shield")!)).toBe(true);
  });
});

describe("getClassAPDiscount", () => {
  it("rogue with dagger gets 1 AP discount", () => {
    const rogue = getClassDef("rogue");
    expect(getClassAPDiscount(rogue, getWeapon("dagger"), "melee")).toBe(1);
  });

  it("rogue with sword gets no AP discount", () => {
    const rogue = getClassDef("rogue");
    expect(getClassAPDiscount(rogue, getWeapon("arming_sword"), "melee")).toBe(0);
  });

  it("ranger with bow gets 1 AP discount (ranged qualifier)", () => {
    const ranger = getClassDef("ranger");
    expect(getClassAPDiscount(ranger, getWeapon("short_bow"), "ranged")).toBe(1);
  });

  it("fighter with dagger gets no AP discount", () => {
    const fighter = getClassDef("fighter");
    expect(getClassAPDiscount(fighter, getWeapon("dagger"), "melee")).toBe(0);
  });
});

describe("getClassDamageBonus", () => {
  it("brute with 2H weapon gets 15% bonus", () => {
    const brute = getClassDef("brute");
    expect(getClassDamageBonus(brute, getWeapon("longsword"))).toBe(15);
  });

  it("brute with 1H weapon gets no bonus", () => {
    const brute = getClassDef("brute");
    expect(getClassDamageBonus(brute, getWeapon("arming_sword"))).toBe(0);
  });

  it("fighter with 2H weapon gets no bonus", () => {
    const fighter = getClassDef("fighter");
    expect(getClassDamageBonus(fighter, getWeapon("longsword"))).toBe(0);
  });
});

describe("getClassHitBonus", () => {
  it("spearman with spear gets +5 hit bonus", () => {
    const spearman = getClassDef("spearman");
    expect(getClassHitBonus(spearman, getWeapon("spear"))).toBe(5);
  });

  it("spearman with sword gets no hit bonus", () => {
    const spearman = getClassDef("spearman");
    expect(getClassHitBonus(spearman, getWeapon("arming_sword"))).toBe(0);
  });

  it("fighter with spear gets no hit bonus", () => {
    const fighter = getClassDef("fighter");
    expect(getClassHitBonus(fighter, getWeapon("spear"))).toBe(0);
  });
});

describe("getClassArmorMPReduction", () => {
  it("knight gets 1 armor MP reduction", () => {
    const knight = getClassDef("knight");
    expect(getClassArmorMPReduction(knight)).toBe(1);
  });

  it("fighter gets 0 armor MP reduction", () => {
    const fighter = getClassDef("fighter");
    expect(getClassArmorMPReduction(fighter)).toBe(0);
  });
});
