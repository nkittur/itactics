import type { RosterMember, SaveData } from "@save/SaveManager";
import { saveGame } from "@save/SaveManager";
import { getStoreInventory, getItemPrice, type StoreItem, type StoreCategory } from "@data/StoreData";
import { getWeapon, UNARMED } from "@data/WeaponData";
import { getShield } from "@data/ShieldData";
import { getArmorDef } from "@data/ArmorData";
import { getItemName } from "@data/ItemData";
import { getClassDef, canEquipWeapon, canEquipShield, canEquipArmor, type CharacterClass } from "@data/ClassData";
import type { ContractDef } from "@data/ContractData";
import { generateContracts } from "@data/ContractData";
import type { RecruitDef } from "@data/RecruitData";
import { generateRecruits, getPartyLevel } from "@data/RecruitData";

type Tab = "roster" | "shop" | "recruit" | "contracts";
const MAX_BAG = 2;

const CATEGORY_ORDER: StoreCategory[] = ["weapon", "shield", "body_armor", "head_armor", "consumable"];
const CATEGORY_LABELS: Record<StoreCategory, string> = {
  weapon: "Weapons", shield: "Shields", body_armor: "Body Armor",
  head_armor: "Head Armor", consumable: "Consumables",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#44bb44", normal: "#cccc44", hard: "#dd7722", deadly: "#dd3333",
};

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

let rngCounter = Date.now();
function simpleRng(): number {
  rngCounter = (rngCounter * 1664525 + 1013904223) >>> 0;
  return (rngCounter >>> 0) / 4294967296;
}

export class ManagementScreen {
  private root: HTMLDivElement;
  private saveData: SaveData;
  private activeTab: Tab = "contracts";
  private expandedUnit: number | null = null;
  private equipTarget: { rosterIdx: number; stashIdx: number; itemId: string; category: StoreCategory } | null = null;

  constructor(saveData: SaveData) {
    this.saveData = saveData;
    this.root = document.createElement("div");
    this.root.className = "mgmt-screen";
    document.body.appendChild(this.root);

    // Generate contracts/recruits if not cached
    const partyLevel = getPartyLevel(this.saveData.roster);
    if (!this.saveData.availableContracts || this.saveData.availableContracts.length === 0) {
      this.saveData.availableContracts = generateContracts(partyLevel, this.saveData.roster.length, simpleRng);
    }
    if (!this.saveData.availableRecruits || this.saveData.availableRecruits.length === 0) {
      this.saveData.availableRecruits = generateRecruits(partyLevel, simpleRng);
    }

    this.render();
  }

  private async save(): Promise<void> {
    await saveGame(this.saveData);
  }

  private render(): void {
    this.root.innerHTML = "";

    // Header
    const header = el("div", "mgmt-header");
    header.appendChild(el("span", "mgmt-title", "iTactics"));
    header.appendChild(el("span", "mgmt-gold", `Gold: ${this.saveData.gold}`));
    this.root.appendChild(header);

    // Tabs
    const tabs = el("div", "mgmt-tabs");
    for (const tab of ["roster", "shop", "recruit", "contracts"] as Tab[]) {
      const btn = el("button", `mgmt-tab-btn${this.activeTab === tab ? " mgmt-tab-active" : ""}`, tab.charAt(0).toUpperCase() + tab.slice(1));
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.activeTab = tab;
        this.equipTarget = null;
        this.render();
      });
      tabs.appendChild(btn);
    }
    this.root.appendChild(tabs);

    // Content
    const content = el("div", "mgmt-content");
    switch (this.activeTab) {
      case "roster": this.renderRoster(content); break;
      case "shop": this.renderShop(content); break;
      case "recruit": this.renderRecruit(content); break;
      case "contracts": this.renderContracts(content); break;
    }
    this.root.appendChild(content);

    // Delete save button at bottom
    const footer = el("div", "mgmt-footer");
    const delBtn = el("button", "mgmt-delete-btn", "Delete Save");
    delBtn.addEventListener("pointerup", async (e) => {
      e.stopPropagation();
      if (confirm("Delete your save and start over?")) {
        const { deleteSave } = await import("@save/SaveManager");
        await deleteSave();
        location.reload();
      }
    });
    footer.appendChild(delBtn);
    this.root.appendChild(footer);
  }

  // ── Roster Tab ──

  private renderRoster(content: HTMLElement): void {
    if (this.saveData.roster.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "No mercenaries in your roster."));
      return;
    }

    for (let i = 0; i < this.saveData.roster.length; i++) {
      const m = this.saveData.roster[i]!;
      const card = el("div", "mgmt-unit-card");

      // Summary row
      const summary = el("div", "mgmt-unit-summary");
      const className = m.classId ? getClassDef(m.classId as CharacterClass).name : "Unknown";
      summary.appendChild(el("span", "mgmt-unit-name", m.name));
      summary.appendChild(el("span", "mgmt-unit-class", `${className} Lv${m.level}`));
      summary.appendChild(el("span", "mgmt-unit-hp", `HP: ${m.stats.hitpoints}`));

      const weaponName = m.equipment.mainHand ? getWeapon(m.equipment.mainHand).name : "Unarmed";
      summary.appendChild(el("span", "mgmt-unit-weapon", weaponName));

      summary.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.expandedUnit = this.expandedUnit === i ? null : i;
        this.render();
      });
      card.appendChild(summary);

      // Expanded detail
      if (this.expandedUnit === i) {
        const detail = el("div", "mgmt-unit-detail");

        // Stats
        const stats = el("div", "mgmt-unit-stats");
        stats.innerHTML = `
          <div>Melee: ${m.stats.meleeSkill} | Defense: ${m.stats.meleeDefense}</div>
          <div>HP: ${m.stats.hitpoints} | Init: ${m.stats.initiative} | MP: ${m.stats.movementPoints}</div>
          <div>Fatigue: ${m.stats.fatigue} | Resolve: ${m.stats.resolve}</div>
        `;
        detail.appendChild(stats);

        // Equipment
        const equip = el("div", "mgmt-unit-equip");
        equip.appendChild(el("div", "mgmt-equip-label", "Equipment:"));

        this.renderEquipSlot(equip, i, "Weapon", m.equipment.mainHand, "weapon");
        this.renderEquipSlot(equip, i, "Shield", m.equipment.offHand, "shield");
        this.renderEquipSlot(equip, i, "Body", m.armor.body?.id ?? null, "body_armor");
        this.renderEquipSlot(equip, i, "Head", m.armor.head?.id ?? null, "head_armor");

        if (m.equipment.bag.length > 0) {
          equip.appendChild(el("div", "mgmt-equip-slot", `Bag: ${m.equipment.bag.map(getItemName).join(", ")}`));
        }

        detail.appendChild(equip);

        // Stash items that can be equipped
        if (this.saveData.stash.length > 0) {
          const stashLabel = el("div", "mgmt-equip-label", "Equip from stash:");
          detail.appendChild(stashLabel);
          const stashList = el("div", "mgmt-stash-list");
          for (let si = 0; si < this.saveData.stash.length; si++) {
            const itemId = this.saveData.stash[si]!;
            const cat = this.categorizeItem(itemId);
            if (!cat) continue;
            if (!this.canEquipOnUnit(m, itemId, cat)) continue;

            const row = el("div", "mgmt-stash-item");
            row.appendChild(el("span", "", getItemName(itemId)));
            const eBtn = el("button", "mgmt-equip-btn", "Equip");
            const capturedSi = si;
            eBtn.addEventListener("pointerup", (e) => {
              e.stopPropagation();
              this.equipOnUnit(i, capturedSi, itemId, cat);
            });
            row.appendChild(eBtn);
            stashList.appendChild(row);
          }
          if (stashList.children.length === 0) {
            stashList.appendChild(el("div", "mgmt-empty-text", "No compatible items in stash"));
          }
          detail.appendChild(stashList);
        }

        card.appendChild(detail);
      }

      content.appendChild(card);
    }
  }

  private renderEquipSlot(parent: HTMLElement, rosterIdx: number, label: string, itemId: string | null, _category: StoreCategory): void {
    const name = itemId ? getItemName(itemId) : "None";
    const slot = el("div", "mgmt-equip-slot");
    slot.textContent = `${label}: ${name}`;

    // Unequip button
    if (itemId) {
      const unBtn = el("button", "mgmt-unequip-btn", "X");
      unBtn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.unequipSlot(rosterIdx, _category);
      });
      slot.appendChild(unBtn);
    }

    parent.appendChild(slot);
  }

  private unequipSlot(rosterIdx: number, category: StoreCategory): void {
    const m = this.saveData.roster[rosterIdx]!;
    switch (category) {
      case "weapon":
        if (m.equipment.mainHand) {
          this.saveData.stash.push(m.equipment.mainHand);
          m.equipment.mainHand = null;
        }
        break;
      case "shield":
        if (m.equipment.offHand) {
          this.saveData.stash.push(m.equipment.offHand);
          m.equipment.offHand = null;
          m.equipment.shieldDurability = null;
        }
        break;
      case "body_armor":
        if (m.armor.body) {
          this.saveData.stash.push(m.armor.body.id);
          m.armor.body = null;
        }
        break;
      case "head_armor":
        if (m.armor.head) {
          this.saveData.stash.push(m.armor.head.id);
          m.armor.head = null;
        }
        break;
    }
    void this.save();
    this.render();
  }

  private equipOnUnit(rosterIdx: number, stashIdx: number, itemId: string, category: StoreCategory): void {
    const m = this.saveData.roster[rosterIdx]!;

    switch (category) {
      case "weapon": {
        if (m.equipment.mainHand) this.saveData.stash.push(m.equipment.mainHand);
        m.equipment.mainHand = itemId;
        const wep = getWeapon(itemId);
        if (wep.hands === 2 && m.equipment.offHand) {
          this.saveData.stash.push(m.equipment.offHand);
          m.equipment.offHand = null;
          m.equipment.shieldDurability = null;
        }
        break;
      }
      case "shield": {
        if (m.equipment.offHand) this.saveData.stash.push(m.equipment.offHand);
        const shield = getShield(itemId);
        m.equipment.offHand = itemId;
        m.equipment.shieldDurability = shield?.durability ?? 0;
        break;
      }
      case "body_armor": {
        if (m.armor.body) this.saveData.stash.push(m.armor.body.id);
        const armorDef = getArmorDef(itemId);
        m.armor.body = armorDef
          ? { id: itemId, currentDurability: armorDef.durability, maxDurability: armorDef.durability }
          : null;
        break;
      }
      case "head_armor": {
        if (m.armor.head) this.saveData.stash.push(m.armor.head.id);
        const armorDef = getArmorDef(itemId);
        m.armor.head = armorDef
          ? { id: itemId, currentDurability: armorDef.durability, maxDurability: armorDef.durability }
          : null;
        break;
      }
      case "consumable": {
        if (m.equipment.bag.length >= MAX_BAG) return;
        m.equipment.bag.push(itemId);
        break;
      }
    }

    // Remove from stash
    this.saveData.stash.splice(stashIdx, 1);
    void this.save();
    this.render();
  }

  private canEquipOnUnit(m: RosterMember, itemId: string, category: StoreCategory): boolean {
    if (!m.classId) return false;
    const classDef = getClassDef(m.classId as CharacterClass);
    switch (category) {
      case "weapon": return canEquipWeapon(classDef, getWeapon(itemId));
      case "shield": {
        if (m.equipment.mainHand) {
          const wep = getWeapon(m.equipment.mainHand);
          if (wep.hands === 2) return false;
        }
        const shield = getShield(itemId);
        return shield ? canEquipShield(classDef, shield) : false;
      }
      case "body_armor": {
        const armor = getArmorDef(itemId);
        return armor && armor.slot === "body" ? canEquipArmor(classDef, armor) : false;
      }
      case "head_armor": {
        const armor = getArmorDef(itemId);
        return armor && armor.slot === "head" ? canEquipArmor(classDef, armor) : false;
      }
      case "consumable": return m.equipment.bag.length < MAX_BAG;
    }
  }

  private categorizeItem(itemId: string): StoreCategory | null {
    if (getWeapon(itemId) !== UNARMED || itemId === "unarmed") {
      return itemId === "unarmed" ? null : "weapon";
    }
    if (getShield(itemId)) return "shield";
    const armor = getArmorDef(itemId);
    if (armor) return armor.slot === "body" ? "body_armor" : "head_armor";
    if (itemId === "health_potion") return "consumable";
    return null;
  }

  // ── Shop Tab ──

  private renderShop(content: HTMLElement): void {
    const inventory = getStoreInventory();

    for (const cat of CATEGORY_ORDER) {
      const items = inventory.filter(i => i.category === cat);
      if (items.length === 0) continue;

      content.appendChild(el("div", "mgmt-section-label", CATEGORY_LABELS[cat]));

      for (const item of items) {
        const row = el("div", "mgmt-shop-item");
        row.appendChild(el("span", "mgmt-item-name", getItemName(item.itemId)));
        row.appendChild(el("span", "mgmt-item-price", `${item.price}g`));

        const buyBtn = el("button", "mgmt-buy-btn", "Buy");
        if (this.saveData.gold < item.price) {
          buyBtn.classList.add("disabled");
        } else {
          buyBtn.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            this.buyItem(item);
          });
        }
        row.appendChild(buyBtn);
        content.appendChild(row);
      }
    }

    // Show stash
    if (this.saveData.stash.length > 0) {
      content.appendChild(el("div", "mgmt-section-label", `Stash (${this.saveData.stash.length})`));
      for (const itemId of this.saveData.stash) {
        const row = el("div", "mgmt-stash-row");
        row.appendChild(el("span", "", getItemName(itemId)));
        const sellPrice = Math.floor(getItemPrice(itemId) / 2);
        if (sellPrice > 0) {
          const sellBtn = el("button", "mgmt-sell-btn", `Sell ${sellPrice}g`);
          sellBtn.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            this.sellItem(itemId);
          });
          row.appendChild(sellBtn);
        }
        content.appendChild(row);
      }
    }
  }

  private buyItem(item: StoreItem): void {
    if (this.saveData.gold < item.price) return;
    this.saveData.gold -= item.price;
    this.saveData.stash.push(item.itemId);
    void this.save();
    this.render();
  }

  private sellItem(itemId: string): void {
    const idx = this.saveData.stash.indexOf(itemId);
    if (idx === -1) return;
    const sellPrice = Math.floor(getItemPrice(itemId) / 2);
    this.saveData.gold += sellPrice;
    this.saveData.stash.splice(idx, 1);
    void this.save();
    this.render();
  }

  // ── Recruit Tab ──

  private renderRecruit(content: HTMLElement): void {
    const recruits = this.saveData.availableRecruits ?? [];
    if (recruits.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "No recruits available."));
      return;
    }

    for (let i = 0; i < recruits.length; i++) {
      const r = recruits[i]!;
      const card = el("div", "recruit-card");

      const header = el("div", "recruit-header");
      const className = getClassDef(r.classId).name;
      header.appendChild(el("span", "recruit-name", r.name));
      header.appendChild(el("span", "recruit-class", `${className} Lv${r.level}`));
      header.appendChild(el("span", "recruit-cost", `${r.cost}g`));
      card.appendChild(header);

      const stats = el("div", "recruit-stats");
      stats.textContent = `HP:${r.stats.hitpoints} Mel:${r.stats.meleeSkill} Def:${r.stats.meleeDefense} Init:${r.stats.initiative}`;
      card.appendChild(stats);

      const hireBtn = el("button", "mgmt-hire-btn", "Hire");
      if (this.saveData.gold < r.cost) {
        hireBtn.classList.add("disabled");
      } else {
        const capturedI = i;
        hireBtn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.hireRecruit(capturedI);
        });
      }
      card.appendChild(hireBtn);
      content.appendChild(card);
    }
  }

  private hireRecruit(index: number): void {
    const recruits = this.saveData.availableRecruits;
    if (!recruits) return;
    const r = recruits[index];
    if (!r || this.saveData.gold < r.cost) return;

    this.saveData.gold -= r.cost;

    // Convert RecruitDef to RosterMember
    const member: RosterMember = {
      name: r.name,
      classId: r.classId,
      level: r.level,
      experience: 0,
      stats: { ...r.stats },
      maxHp: r.maxHp,
      talentStars: { ...r.talentStars },
      perks: { unlocked: [], availablePoints: 0 },
      equipment: { ...r.equipment, bag: [...r.equipment.bag] },
      armor: {
        body: r.armor.body ? { ...r.armor.body } : null,
        head: r.armor.head ? { ...r.armor.head } : null,
      },
      spriteType: r.sprite,
    };

    this.saveData.roster.push(member);
    recruits.splice(index, 1);
    void this.save();
    this.render();
  }

  // ── Contracts Tab ──

  private renderContracts(content: HTMLElement): void {
    const contracts = this.saveData.availableContracts ?? [];
    if (contracts.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "No contracts available."));
      return;
    }

    if (this.saveData.roster.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "Hire some mercenaries first!"));
      return;
    }

    for (const c of contracts) {
      const card = el("div", "contract-card");
      card.style.borderLeftColor = DIFFICULTY_COLORS[c.difficulty] ?? "#999";

      const header = el("div", "contract-header");
      header.appendChild(el("span", "contract-name", c.name));
      const badge = el("span", "contract-difficulty", c.difficulty.toUpperCase());
      badge.style.color = DIFFICULTY_COLORS[c.difficulty] ?? "#999";
      header.appendChild(badge);
      card.appendChild(header);

      const details = el("div", "contract-details");
      details.innerHTML = `
        <div>Enemies: ${c.enemyCount} (Lv${c.enemyLevel})</div>
        <div>Reward: <strong>${c.reward}g</strong></div>
      `;
      card.appendChild(details);

      const acceptBtn = el("button", "mgmt-accept-btn", "Accept Contract");
      acceptBtn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.acceptContract(c);
      });
      card.appendChild(acceptBtn);
      content.appendChild(card);
    }
  }

  private async acceptContract(contract: ContractDef): Promise<void> {
    this.saveData.pendingContract = contract;
    await this.save();
    location.reload();
  }

  dispose(): void {
    this.root.remove();
  }
}
