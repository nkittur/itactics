import type { RosterMember } from "@save/SaveManager";
import { getStoreInventory, type StoreItem, type StoreCategory } from "@data/StoreData";
import { getWeapon, UNARMED } from "@data/WeaponData";
import { getShield } from "@data/ShieldData";
import { getArmorDef } from "@data/ArmorData";
import { getItemName } from "@data/ItemData";
import { getClassDef, canEquipWeapon, canEquipShield, canEquipArmor, type CharacterClass } from "@data/ClassData";

const MAX_BAG = 2;

const CATEGORY_LABELS: Record<StoreCategory, string> = {
  weapon: "Weapons",
  shield: "Shields",
  body_armor: "Body Armor",
  head_armor: "Head Armor",
  consumable: "Consumables",
};

const CATEGORY_ORDER: StoreCategory[] = [
  "weapon", "shield", "body_armor", "head_armor", "consumable",
];

type ViewState =
  | { mode: "browse" }
  | { mode: "buy-assign"; item: StoreItem }
  | { mode: "equip-assign"; stashIndex: number; itemId: string; category: StoreCategory };

export class StoreScreen {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  onContinue: (() => void) | null = null;

  private gold = 0;
  private roster: RosterMember[] = [];
  private stash: string[] = [];
  private inventory: StoreItem[] = [];
  private view: ViewState = { mode: "browse" };
  private expandedCategories = new Set<StoreCategory>(["weapon"]);
  private expandedEquipCategories = new Set<string>(["equipped", "stash"]);

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "store-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.panel = document.createElement("div");
    this.panel.className = "store-panel";
    this.container.appendChild(this.panel);
  }

  show(gold: number, roster: RosterMember[], stash: string[]): void {
    this.gold = gold;
    this.roster = roster.map((r) => structuredClone(r));
    this.stash = [...stash];
    this.inventory = getStoreInventory();
    this.view = { mode: "browse" };
    this.container.style.display = "flex";
    this.render();
  }

  hide(): void {
    this.container.style.display = "none";
  }

  getGold(): number { return this.gold; }
  getRoster(): RosterMember[] { return this.roster; }
  getStash(): string[] { return this.stash; }

  // ── Rendering ──

  private render(): void {
    this.panel.innerHTML = "";

    if (this.view.mode === "browse") {
      this.renderBrowse();
    } else if (this.view.mode === "buy-assign") {
      this.renderAssign(this.view.item, "buy");
    } else if (this.view.mode === "equip-assign") {
      this.renderEquipAssign(this.view.stashIndex, this.view.itemId, this.view.category);
    }
  }

  private renderBrowse(): void {
    // Header
    const header = el("div", "store-header");
    header.appendChild(el("span", "store-title", "Store"));
    header.appendChild(el("span", "store-gold", `${this.gold}g`));
    this.panel.appendChild(header);

    // Buy section
    const buyLabel = el("div", "store-section-label", "Buy");
    this.panel.appendChild(buyLabel);

    for (const cat of CATEGORY_ORDER) {
      const items = this.inventory.filter((i) => i.category === cat);
      if (items.length === 0) continue;

      const section = el("div", "store-category");
      const isOpen = this.expandedCategories.has(cat);

      // Category header
      const catHeader = el("div", "store-category-header");
      const arrow = el("span", isOpen ? "store-category-arrow open" : "store-category-arrow", "\u25B6");
      catHeader.appendChild(arrow);
      catHeader.appendChild(el("span", undefined, ` ${CATEGORY_LABELS[cat]}`));
      catHeader.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        if (this.expandedCategories.has(cat)) this.expandedCategories.delete(cat);
        else this.expandedCategories.add(cat);
        this.render();
      });
      section.appendChild(catHeader);

      if (isOpen) {
        for (const item of items) {
          const row = el("div", "store-item-row");
          row.appendChild(el("span", "store-item-name", getItemName(item.itemId)));

          const canAfford = this.gold >= item.price;
          const priceSpan = el("span",
            canAfford ? "store-item-price" : "store-item-price cant-afford",
            `${item.price}g`);
          row.appendChild(priceSpan);

          const buyBtn = document.createElement("button");
          buyBtn.className = "store-buy-btn";
          buyBtn.textContent = "Buy";
          buyBtn.disabled = !canAfford;
          buyBtn.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            this.view = { mode: "buy-assign", item };
            this.render();
          });
          row.appendChild(buyBtn);
          section.appendChild(row);
        }
      }
      this.panel.appendChild(section);
    }

    // Equip section (stash items)
    if (this.stash.length > 0) {
      const equipLabel = el("div", "store-section-label", "Stash");
      equipLabel.style.marginTop = "10px";
      this.panel.appendChild(equipLabel);

      for (let i = 0; i < this.stash.length; i++) {
        const itemId = this.stash[i]!;
        const cat = categorizeItem(itemId);
        const row = el("div", "store-item-row");
        row.appendChild(el("span", "store-item-name", getItemName(itemId)));

        const equipBtn = document.createElement("button");
        equipBtn.className = "store-buy-btn";
        equipBtn.textContent = "Equip";
        equipBtn.addEventListener("pointerup", ((idx: number, id: string, c: StoreCategory) => (e: Event) => {
          e.stopPropagation();
          this.view = { mode: "equip-assign", stashIndex: idx, itemId: id, category: c };
          this.render();
        })(i, itemId, cat));
        row.appendChild(equipBtn);
        this.panel.appendChild(row);
      }
    }

    // Continue button
    const btn = document.createElement("button");
    btn.className = "store-continue-btn";
    btn.textContent = "Continue to Next Battle";
    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.onContinue?.();
    });
    this.panel.appendChild(btn);
  }

  private renderAssign(item: StoreItem, _source: "buy"): void {
    // Header with back + gold
    const header = el("div", "store-header");
    const backBtn = document.createElement("button");
    backBtn.className = "store-back-btn";
    backBtn.textContent = "\u2190 Back";
    backBtn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.view = { mode: "browse" };
      this.render();
    });
    header.appendChild(backBtn);
    header.appendChild(el("span", "store-gold", `${this.gold}g`));
    this.panel.appendChild(header);

    // Item details
    this.panel.appendChild(el("div", "store-detail-name", getItemName(item.itemId)));
    this.panel.appendChild(el("div", "store-detail-stats", this.formatItemStats(item)));
    this.panel.appendChild(el("div", "store-detail-price", `${item.price}g`));

    // Unit selection
    this.panel.appendChild(el("div", "store-assign-label", "Buy and equip to:"));
    this.renderUnitRows(item.itemId, item.category, (rosterIdx) => {
      this.gold -= item.price;
      this.equipOnUnit(rosterIdx, item.itemId, item.category);
      this.view = { mode: "browse" };
      this.render();
    });

    // Or buy to stash
    const stashBtn = document.createElement("button");
    stashBtn.className = "store-buy-btn";
    stashBtn.style.marginTop = "8px";
    stashBtn.style.width = "100%";
    stashBtn.textContent = "Buy to Stash";
    stashBtn.disabled = this.gold < item.price;
    stashBtn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.gold -= item.price;
      this.stash.push(item.itemId);
      this.view = { mode: "browse" };
      this.render();
    });
    this.panel.appendChild(stashBtn);
  }

  private renderEquipAssign(stashIndex: number, itemId: string, category: StoreCategory): void {
    const header = el("div", "store-header");
    const backBtn = document.createElement("button");
    backBtn.className = "store-back-btn";
    backBtn.textContent = "\u2190 Back";
    backBtn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.view = { mode: "browse" };
      this.render();
    });
    header.appendChild(backBtn);
    header.appendChild(el("span", "store-gold", `${this.gold}g`));
    this.panel.appendChild(header);

    this.panel.appendChild(el("div", "store-detail-name", getItemName(itemId)));
    this.panel.appendChild(el("div", "store-detail-stats", this.formatItemStatsById(itemId, category)));
    this.panel.appendChild(el("div", "store-assign-label", "Equip to:"));

    this.renderUnitRows(itemId, category, (rosterIdx) => {
      // Remove from stash
      this.stash.splice(stashIndex, 1);
      this.equipOnUnit(rosterIdx, itemId, category);
      this.view = { mode: "browse" };
      this.render();
    });
  }

  private renderUnitRows(itemId: string, category: StoreCategory, onSelect: (idx: number) => void): void {
    for (let i = 0; i < this.roster.length; i++) {
      const member = this.roster[i]!;
      const { canEquip, reason } = this.checkCanEquip(member, itemId, category);
      const currentItem = this.getCurrentSlotItem(member, category);

      const row = el("div", canEquip ? "store-unit-row" : "store-unit-row disabled");

      const info = el("div", "store-unit-info");
      info.appendChild(el("div", "store-unit-name", member.name));
      if (currentItem) {
        info.appendChild(el("div", "store-unit-current", `has: ${getItemName(currentItem)}`));
      }
      row.appendChild(info);

      if (canEquip) {
        const eqBtn = el("span", "store-unit-equip", "Equip");
        row.appendChild(eqBtn);
        row.addEventListener("pointerup", ((idx: number) => (e: Event) => {
          e.stopPropagation();
          onSelect(idx);
        })(i));
      } else {
        row.appendChild(el("span", "store-unit-cant", reason ?? ""));
      }

      this.panel.appendChild(row);
    }
  }

  // ── Equip logic ──

  private equipOnUnit(rosterIdx: number, itemId: string, category: StoreCategory): void {
    const member = this.roster[rosterIdx]!;

    switch (category) {
      case "weapon": {
        // Return old weapon to stash
        if (member.equipment.mainHand) {
          this.stash.push(member.equipment.mainHand);
        }
        member.equipment.mainHand = itemId;
        // 2H weapon: clear shield
        const wep = getWeapon(itemId);
        if (wep.hands === 2 && member.equipment.offHand) {
          this.stash.push(member.equipment.offHand);
          member.equipment.offHand = null;
          member.equipment.shieldDurability = null;
        }
        break;
      }
      case "shield": {
        // Return old shield to stash
        if (member.equipment.offHand) {
          this.stash.push(member.equipment.offHand);
        }
        const shield = getShield(itemId);
        member.equipment.offHand = itemId;
        member.equipment.shieldDurability = shield?.durability ?? 0;
        break;
      }
      case "body_armor": {
        if (member.armor.body) {
          this.stash.push(member.armor.body.id);
        }
        const armor = getArmorDef(itemId);
        if (armor) {
          member.armor.body = {
            id: itemId,
            currentDurability: armor.durability,
            maxDurability: armor.durability,
          };
        }
        break;
      }
      case "head_armor": {
        if (member.armor.head) {
          this.stash.push(member.armor.head.id);
        }
        const armor = getArmorDef(itemId);
        if (armor) {
          member.armor.head = {
            id: itemId,
            currentDurability: armor.durability,
            maxDurability: armor.durability,
          };
        }
        break;
      }
      case "consumable": {
        member.equipment.bag.push(itemId);
        break;
      }
    }
  }

  private checkCanEquip(
    member: RosterMember,
    itemId: string,
    category: StoreCategory,
  ): { canEquip: boolean; reason?: string } {
    const classDef = member.classId ? getClassDef(member.classId as CharacterClass) : null;

    switch (category) {
      case "weapon": {
        const wep = getWeapon(itemId);
        if (wep === UNARMED) return { canEquip: false, reason: "Unknown" };
        if (classDef && !canEquipWeapon(classDef, wep)) {
          return { canEquip: false, reason: "Class" };
        }
        return { canEquip: true };
      }
      case "shield": {
        const shield = getShield(itemId);
        if (!shield) return { canEquip: false, reason: "Unknown" };
        if (classDef && !canEquipShield(classDef, shield)) {
          return { canEquip: false, reason: "Class" };
        }
        // Can't equip shield if wielding 2H weapon
        if (member.equipment.mainHand) {
          const wep = getWeapon(member.equipment.mainHand);
          if (wep.hands === 2) return { canEquip: false, reason: "2H weapon" };
        }
        return { canEquip: true };
      }
      case "body_armor":
      case "head_armor": {
        const armor = getArmorDef(itemId);
        if (!armor) return { canEquip: false, reason: "Unknown" };
        if (classDef && !canEquipArmor(classDef, armor)) {
          return { canEquip: false, reason: "Class" };
        }
        return { canEquip: true };
      }
      case "consumable": {
        if (member.equipment.bag.length >= MAX_BAG) {
          return { canEquip: false, reason: "Bag full" };
        }
        return { canEquip: true };
      }
    }
  }

  private getCurrentSlotItem(member: RosterMember, category: StoreCategory): string | null {
    switch (category) {
      case "weapon": return member.equipment.mainHand;
      case "shield": return member.equipment.offHand;
      case "body_armor": return member.armor.body?.id ?? null;
      case "head_armor": return member.armor.head?.id ?? null;
      case "consumable": return null;
    }
  }

  // ── Item stat formatting ──

  private formatItemStats(item: StoreItem): string {
    return this.formatItemStatsById(item.itemId, item.category);
  }

  private formatItemStatsById(itemId: string, category: StoreCategory): string {
    switch (category) {
      case "weapon": {
        const w = getWeapon(itemId);
        if (w === UNARMED) return "";
        const parts = [`Dmg: ${w.minDamage}-${w.maxDamage}`, `AP: ${w.apCost}`];
        if (w.hitChanceBonus !== 0) parts.push(`Hit: ${w.hitChanceBonus > 0 ? "+" : ""}${w.hitChanceBonus}`);
        if (w.range > 1) parts.push(`Range: ${w.range}`);
        if (w.hands === 2) parts.push("2H");
        return parts.join("  ");
      }
      case "shield": {
        const s = getShield(itemId);
        if (!s) return "";
        return `Def: +${s.meleeDefBonus}/${s.rangedDefBonus}  Dur: ${s.durability}`;
      }
      case "body_armor":
      case "head_armor": {
        const a = getArmorDef(itemId);
        if (!a) return "";
        return `Dur: ${a.durability}  Tier: ${a.tier}`;
      }
      case "consumable":
        return "Restores 25 HP";
    }
  }
}

function categorizeItem(itemId: string): StoreCategory {
  const weapon = getWeapon(itemId);
  if (weapon !== UNARMED) return "weapon";
  if (getShield(itemId)) return "shield";
  const armor = getArmorDef(itemId);
  if (armor) return armor.slot === "body" ? "body_armor" : "head_armor";
  return "consumable";
}

function el(tag: string, className?: string, text?: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
