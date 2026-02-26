import type { RosterMember, SaveData } from "@save/SaveManager";
import { saveGame, pruneItemRegistry } from "@save/SaveManager";
import { getItemPrice, type StoreCategory } from "@data/StoreData";
import { UNARMED } from "@data/WeaponData";
import { getClassDef, canEquipWeapon, canEquipShield, canEquipArmor, type CharacterClass } from "@data/ClassData";
import type { ContractDef } from "@data/ContractData";
import { generateContracts } from "@data/ContractData";
import type { RecruitDef } from "@data/RecruitData";
import { generateRecruits, getPartyLevel } from "@data/RecruitData";
import { resolveWeapon, resolveShield, resolveArmor, resolveItemName, setItemRegistry } from "@data/ItemResolver";
import { isGeneratedItemId } from "@data/GeneratedItemData";
import { generateShopInventory, shopRefreshCost, qualityColor } from "@data/ItemGenerator";
import { resolveAbility, getAbilityRegistry } from "@data/AbilityResolver";
import { THEMES } from "@data/ThemeData";
import { detectUnitSynergies, detectTeamSynergies } from "@data/SynergyDetector";
import { ALL_STAT_KEYS, statDisplayName, type StatKey } from "@data/TalentData";

type Tab = "roster" | "shop" | "recruit" | "contracts";
const MAX_BAG = 2;

interface DetailUnit {
  name: string;
  classId: string;
  level: number;
  stats: RosterMember["stats"];
  maxHp: number;
  talentStars: Record<StatKey, number>;
  spriteType: string;
  abilities: { uid: string; unlockLevel: number }[];
  skillTheme: string;
  equipment: RosterMember["equipment"];
  armor: RosterMember["armor"];
  isRecruit: boolean;
  cost?: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#44bb44", normal: "#cccc44", hard: "#dd7722", deadly: "#dd3333",
};

const TIER_COLORS: Record<number, string> = { 1: "#ccc", 2: "#4c4", 3: "#48d" };

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
  private detailUnit: { type: "roster"; index: number } | { type: "recruit"; index: number } | null = null;
  private detailTab: "stats" | "skills" | "equipment" = "stats";

  constructor(saveData: SaveData) {
    this.saveData = saveData;
    this.root = document.createElement("div");
    this.root.className = "mgmt-screen";
    document.body.appendChild(this.root);

    // Initialize item registry
    if (!this.saveData.itemRegistry) this.saveData.itemRegistry = {};
    setItemRegistry(this.saveData.itemRegistry);

    // Generate contracts/recruits if not cached
    const partyLevel = getPartyLevel(this.saveData.roster);
    if (!this.saveData.availableContracts || this.saveData.availableContracts.length === 0) {
      this.saveData.availableContracts = generateContracts(partyLevel, this.saveData.roster.length, simpleRng);
    }
    if (!this.saveData.availableRecruits || this.saveData.availableRecruits.length === 0) {
      this.saveData.availableRecruits = generateRecruits(partyLevel, simpleRng);
      // Sync ability registry to save data after recruit generation
      this.saveData.abilityRegistry = getAbilityRegistry();
    }

    // Generate shop if not cached
    if (!this.saveData.shopState) {
      this.saveData.shopState = {
        inventory: generateShopInventory(partyLevel, this.saveData.itemRegistry, simpleRng),
        refreshCount: 0,
        generatedAtLevel: partyLevel,
      };
      void this.save();
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
        this.detailUnit = null;
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

    // Detail overlay (on top of everything)
    if (this.detailUnit) {
      this.root.appendChild(this.renderUnitDetail());
    }
  }

  // ── Shared: Sprite + Detail Unit ──

  private renderSpritePortrait(spriteType: string, size: number): HTMLElement {
    const sprite = el("div");
    sprite.style.width = `${size}px`;
    sprite.style.height = `${size}px`;
    sprite.style.imageRendering = "pixelated";
    sprite.style.backgroundSize = "600% 100%";
    sprite.style.backgroundPosition = "0 0";
    sprite.style.borderRadius = size > 64 ? "6px" : "4px";
    sprite.style.backgroundColor = "#141428";
    sprite.style.backgroundImage = `url(sprites/${spriteType}/Idle.png)`;
    return sprite;
  }

  private getDetailUnit(): DetailUnit | null {
    if (!this.detailUnit) return null;

    if (this.detailUnit.type === "roster") {
      const m = this.saveData.roster[this.detailUnit.index];
      if (!m) return null;
      const abilities: DetailUnit["abilities"] = [];
      if (m.abilities) {
        for (const uid of m.abilities) {
          const unlockLevel = m.abilityUnlockLevels?.[uid] ?? 5;
          abilities.push({ uid, unlockLevel });
        }
      }
      return {
        name: m.name,
        classId: m.classId ?? "fighter",
        level: m.level,
        stats: m.stats,
        maxHp: m.maxHp,
        talentStars: m.talentStars,
        spriteType: m.spriteType ?? "soldier",
        abilities,
        skillTheme: m.skillTheme ?? "",
        equipment: m.equipment,
        armor: m.armor,
        isRecruit: false,
      };
    } else {
      const r = (this.saveData.availableRecruits ?? [])[this.detailUnit.index];
      if (!r) return null;
      return {
        name: r.name,
        classId: r.classId,
        level: r.level,
        stats: r.stats,
        maxHp: r.maxHp,
        talentStars: r.talentStars,
        spriteType: r.sprite,
        abilities: r.uniqueSkills.map(sk => ({ uid: sk.uid, unlockLevel: sk.unlockLevel })),
        skillTheme: r.skillTheme,
        equipment: r.equipment,
        armor: r.armor,
        isRecruit: true,
        cost: r.cost,
      };
    }
  }

  private renderUnitGrid(type: "roster" | "recruit"): HTMLElement {
    const grid = el("div", "unit-grid");
    const items = type === "roster" ? this.saveData.roster : (this.saveData.availableRecruits ?? []);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const card = el("div", "unit-grid-card");

      // Sprite
      const spriteType = type === "roster"
        ? (item as RosterMember).spriteType ?? "soldier"
        : (item as RecruitDef).sprite;
      card.appendChild(this.renderSpritePortrait(spriteType, 64));

      // Name
      card.appendChild(el("div", "unit-grid-name", item.name));

      // Class + Level
      const classId = type === "roster"
        ? (item as RosterMember).classId ?? "fighter"
        : (item as RecruitDef).classId;
      const className = getClassDef(classId as CharacterClass).name;
      card.appendChild(el("div", "unit-grid-class", `${className} Lv${item.level}`));

      // Cost badge (recruit only)
      if (type === "recruit") {
        card.appendChild(el("div", "unit-grid-cost", `${(item as RecruitDef).cost}g`));
      }

      const capturedI = i;
      card.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.detailUnit = { type, index: capturedI };
        this.detailTab = "stats";
        this.render();
      });

      grid.appendChild(card);
    }

    return grid;
  }

  // ── Detail Overlay ──

  private renderUnitDetail(): HTMLElement {
    const unit = this.getDetailUnit()!;
    const overlay = el("div", "unit-detail-overlay");

    // Header
    const header = el("div", "detail-header");
    const backBtn = el("button", "detail-back-btn", "\u2190");
    backBtn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.detailUnit = null;
      this.render();
    });
    header.appendChild(backBtn);

    header.appendChild(this.renderSpritePortrait(unit.spriteType, 80));

    const info = el("div", "detail-info");
    info.appendChild(el("div", "detail-name", unit.name));
    const className = getClassDef(unit.classId as CharacterClass).name;
    info.appendChild(el("div", "detail-class", `${className} Lv${unit.level}`));
    if (unit.skillTheme) {
      const themeName = THEMES[unit.skillTheme]?.name ?? unit.skillTheme;
      info.appendChild(el("span", "detail-theme-badge", themeName));
    }
    header.appendChild(info);
    overlay.appendChild(header);

    // Sub-tabs
    const tabBar = el("div", "detail-tabs");
    for (const tab of ["stats", "skills", "equipment"] as const) {
      const btn = el("button", `detail-tab-btn${this.detailTab === tab ? " active" : ""}`, tab.charAt(0).toUpperCase() + tab.slice(1));
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.detailTab = tab;
        this.render();
      });
      tabBar.appendChild(btn);
    }
    overlay.appendChild(tabBar);

    // Tab content
    const content = el("div", "detail-content");
    switch (this.detailTab) {
      case "stats": content.appendChild(this.renderStatsTab(unit)); break;
      case "skills": content.appendChild(this.renderSkillsTab(unit)); break;
      case "equipment": content.appendChild(this.renderEquipmentTab(unit)); break;
    }
    overlay.appendChild(content);

    // Footer (recruit only)
    if (unit.isRecruit && unit.cost !== undefined) {
      const footer = el("div", "detail-footer");
      const hireBtn = el("button", "detail-hire-btn", `Hire (${unit.cost}g)`);
      if (this.saveData.gold < unit.cost) {
        hireBtn.classList.add("disabled");
      } else {
        hireBtn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.hireRecruit(this.detailUnit!.index);
        });
      }
      footer.appendChild(hireBtn);
      overlay.appendChild(footer);
    }

    return overlay;
  }

  private renderStatsTab(unit: DetailUnit): HTMLElement {
    const container = el("div");

    const grid = el("div", "stat-grid");
    for (const key of ALL_STAT_KEYS) {
      const row = el("div", "stat-row");
      row.appendChild(el("span", "stat-name", statDisplayName(key)));

      const valueArea = el("span");
      const valSpan = el("span", "stat-value", `${unit.stats[key]}`);
      valueArea.appendChild(valSpan);

      const stars = unit.talentStars[key] ?? 0;
      if (stars > 0) {
        const starSpan = el("span", "stat-stars", "\u2605".repeat(stars));
        valueArea.appendChild(starSpan);
      }
      row.appendChild(valueArea);
      grid.appendChild(row);
    }
    container.appendChild(grid);

    // Extra stats
    const extras = el("div", "stat-extra");
    extras.textContent = `Max HP: ${unit.maxHp}  |  Movement: ${unit.stats.movementPoints}`;
    container.appendChild(extras);

    return container;
  }

  private renderSkillsTab(unit: DetailUnit): HTMLElement {
    const container = el("div");

    if (unit.abilities.length === 0) {
      container.appendChild(el("div", "mgmt-empty", "No abilities."));
      return container;
    }

    for (const ab of unit.abilities) {
      const ability = resolveAbility(ab.uid);
      if (!ability) continue;

      const unlocked = unit.level >= ab.unlockLevel;
      const card = el("div", `skill-card${unlocked ? "" : " locked"}`);
      card.style.borderLeftColor = TIER_COLORS[ability.tier] ?? "#ccc";

      const header = el("div", "skill-header");
      const nameSpan = el("span", "skill-name", ability.name);
      nameSpan.style.color = unlocked ? (TIER_COLORS[ability.tier] ?? "#ccc") : "#666";
      header.appendChild(nameSpan);

      if (ability.isPassive) {
        header.appendChild(el("span", "skill-passive-badge", "Passive"));
      }
      if (!unlocked) {
        header.appendChild(el("span", "skill-unlock-badge", `Unlocks Lv.${ab.unlockLevel}`));
      }
      card.appendChild(header);

      if (unlocked) {
        card.appendChild(el("div", "skill-desc", ability.description));
        const costParts: string[] = [];
        costParts.push(`${ability.cost.ap} AP`);
        costParts.push(`${ability.cost.fatigue} Fatigue`);
        if (ability.cost.cooldown > 0) costParts.push(`${ability.cost.cooldown}T CD`);
        if (ability.cost.turnEnding) costParts.push("Turn Ending");
        card.appendChild(el("div", "skill-cost-info", costParts.join(" | ")));
      }

      container.appendChild(card);
    }

    // Unit synergies
    const abilityIds = unit.abilities.map(a => a.uid);
    const synergies = detectUnitSynergies(abilityIds);
    if (synergies.length > 0) {
      container.appendChild(el("div", "mgmt-equip-label", "Synergies:"));
      for (const syn of synergies) {
        container.appendChild(el("div", "mgmt-synergy-row", `\u2194 ${syn.description}`));
      }
    }

    return container;
  }

  private renderEquipmentTab(unit: DetailUnit): HTMLElement {
    const container = el("div");
    const isRoster = !unit.isRecruit;
    const rosterIdx = isRoster && this.detailUnit ? this.detailUnit.index : -1;

    // Equipment slots
    const slots: { label: string; itemId: string | null; category: StoreCategory }[] = [
      { label: "Weapon", itemId: unit.equipment.mainHand, category: "weapon" },
      { label: "Shield", itemId: unit.equipment.offHand, category: "shield" },
      { label: "Body Armor", itemId: unit.armor.body?.id ?? null, category: "body_armor" },
      { label: "Head Armor", itemId: unit.armor.head?.id ?? null, category: "head_armor" },
    ];

    for (const slot of slots) {
      const card = el("div", "equip-slot-card");
      const left = el("div");
      left.appendChild(el("div", "equip-slot-label", slot.label));
      if (slot.itemId) {
        left.appendChild(el("div", "equip-slot-name", resolveItemName(slot.itemId)));
      } else {
        left.appendChild(el("div", "equip-slot-empty", "Empty"));
      }
      card.appendChild(left);

      if (isRoster && slot.itemId) {
        const unBtn = el("button", "mgmt-unequip-btn", "X");
        const cat = slot.category;
        unBtn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.unequipSlot(rosterIdx, cat);
        });
        card.appendChild(unBtn);
      }

      container.appendChild(card);
    }

    // Bag
    if (unit.equipment.bag.length > 0) {
      const bagCard = el("div", "equip-slot-card");
      const left = el("div");
      left.appendChild(el("div", "equip-slot-label", "Bag"));
      left.appendChild(el("div", "equip-slot-name", unit.equipment.bag.map(resolveItemName).join(", ")));
      bagCard.appendChild(left);
      container.appendChild(bagCard);
    }

    // Equip from stash (roster only)
    if (isRoster && this.saveData.stash.length > 0) {
      const m = this.saveData.roster[rosterIdx];
      if (m) {
        const section = el("div", "equip-stash-section");
        section.appendChild(el("div", "mgmt-equip-label", "Equip from stash:"));
        let hasItems = false;
        for (let si = 0; si < this.saveData.stash.length; si++) {
          const itemId = this.saveData.stash[si]!;
          const cat = this.categorizeItem(itemId);
          if (!cat) continue;
          if (!this.canEquipOnUnit(m, itemId, cat)) continue;

          hasItems = true;
          const row = el("div", "equip-stash-item");
          row.appendChild(el("span", "", resolveItemName(itemId)));
          const eBtn = el("button", "mgmt-equip-btn", "Equip");
          const capturedSi = si;
          eBtn.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            this.equipOnUnit(rosterIdx, capturedSi, itemId, cat);
          });
          row.appendChild(eBtn);
          section.appendChild(row);
        }
        if (!hasItems) {
          section.appendChild(el("div", "mgmt-empty-text", "No compatible items in stash"));
        }
        container.appendChild(section);
      }
    }

    return container;
  }

  // ── Roster Tab ──

  private renderRoster(content: HTMLElement): void {
    if (this.saveData.roster.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "No mercenaries in your roster."));
      return;
    }

    // Team synergies
    const teamSynergies = detectTeamSynergies(this.saveData.roster);
    if (teamSynergies.length > 0) {
      const synSection = el("div", "mgmt-team-synergies");
      synSection.appendChild(el("div", "mgmt-equip-label", `Team Synergies (${teamSynergies.length}):`));
      for (const syn of teamSynergies.slice(0, 5)) {
        synSection.appendChild(el("div", "mgmt-synergy-row", `\u2194 ${syn.description}`));
      }
      if (teamSynergies.length > 5) {
        synSection.appendChild(el("div", "mgmt-synergy-row", `...and ${teamSynergies.length - 5} more`));
      }
      content.appendChild(synSection);
    }

    content.appendChild(this.renderUnitGrid("roster"));
  }

  // ── Recruit Tab ──

  private renderRecruit(content: HTMLElement): void {
    const recruits = this.saveData.availableRecruits ?? [];
    if (recruits.length === 0) {
      content.appendChild(el("div", "mgmt-empty", "No recruits available."));
      return;
    }

    content.appendChild(this.renderUnitGrid("recruit"));
  }

  private hireRecruit(index: number): void {
    const recruits = this.saveData.availableRecruits;
    if (!recruits) return;
    const r = recruits[index];
    if (!r || this.saveData.gold < r.cost) return;

    this.saveData.gold -= r.cost;

    // Convert RecruitDef to RosterMember
    const unlockLevels: Record<string, number> = {};
    for (const sk of r.uniqueSkills) {
      unlockLevels[sk.uid] = sk.unlockLevel;
    }
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
      skillTheme: r.skillTheme,
      abilities: r.uniqueSkills.map(sk => sk.uid),
      abilityUnlockLevels: unlockLevels,
    };

    this.saveData.roster.push(member);
    recruits.splice(index, 1);
    this.detailUnit = null;
    void this.save();
    this.render();
  }

  // ── Equipment Logic ──

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
        const wep = resolveWeapon(itemId);
        if (wep.hands === 2 && m.equipment.offHand) {
          this.saveData.stash.push(m.equipment.offHand);
          m.equipment.offHand = null;
          m.equipment.shieldDurability = null;
        }
        break;
      }
      case "shield": {
        if (m.equipment.offHand) this.saveData.stash.push(m.equipment.offHand);
        const shield = resolveShield(itemId);
        m.equipment.offHand = itemId;
        m.equipment.shieldDurability = shield?.durability ?? 0;
        break;
      }
      case "body_armor": {
        if (m.armor.body) this.saveData.stash.push(m.armor.body.id);
        const armorDef = resolveArmor(itemId);
        m.armor.body = armorDef
          ? { id: itemId, currentDurability: armorDef.durability, maxDurability: armorDef.durability }
          : null;
        break;
      }
      case "head_armor": {
        if (m.armor.head) this.saveData.stash.push(m.armor.head.id);
        const armorDef = resolveArmor(itemId);
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
      case "weapon": return canEquipWeapon(classDef, resolveWeapon(itemId));
      case "shield": {
        if (m.equipment.mainHand) {
          const wep = resolveWeapon(m.equipment.mainHand);
          if (wep.hands === 2) return false;
        }
        const shield = resolveShield(itemId);
        return shield ? canEquipShield(classDef, shield) : false;
      }
      case "body_armor": {
        const armor = resolveArmor(itemId);
        return armor && armor.slot === "body" ? canEquipArmor(classDef, armor) : false;
      }
      case "head_armor": {
        const armor = resolveArmor(itemId);
        return armor && armor.slot === "head" ? canEquipArmor(classDef, armor) : false;
      }
      case "consumable": return m.equipment.bag.length < MAX_BAG;
    }
  }

  private categorizeItem(itemId: string): StoreCategory | null {
    if (isGeneratedItemId(itemId)) {
      const gen = this.saveData.itemRegistry?.[itemId];
      return gen ? gen.slotType : null;
    }
    if (resolveWeapon(itemId) !== UNARMED || itemId === "unarmed") {
      return itemId === "unarmed" ? null : "weapon";
    }
    if (resolveShield(itemId)) return "shield";
    const armor = resolveArmor(itemId);
    if (armor) return armor.slot === "body" ? "body_armor" : "head_armor";
    if (itemId === "health_potion") return "consumable";
    return null;
  }

  // ── Shop Tab ──

  private expandedShopItem: string | null = null;

  private renderShop(content: HTMLElement): void {
    const shopState = this.saveData.shopState;
    if (!shopState) return;

    const registry = this.saveData.itemRegistry ?? {};
    const partyLevel = getPartyLevel(this.saveData.roster);

    // Refresh button
    const refreshCost = shopRefreshCost(partyLevel, shopState.refreshCount);
    const refreshRow = el("div", "mgmt-shop-refresh");
    const refreshBtn = el("button", "mgmt-refresh-btn", `Refresh (${refreshCost}g)`);
    if (this.saveData.gold < refreshCost) {
      refreshBtn.classList.add("disabled");
    } else {
      refreshBtn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.refreshShop();
      });
    }
    refreshRow.appendChild(refreshBtn);
    content.appendChild(refreshRow);

    // Shop items
    content.appendChild(el("div", "mgmt-section-label", "For Sale"));
    for (const uid of shopState.inventory) {
      const gen = registry[uid];
      if (!gen) continue;

      const row = el("div", "mgmt-shop-item");

      const nameSpan = el("span", "mgmt-item-name", gen.name);
      nameSpan.style.color = qualityColor(gen.itemLevel);
      row.appendChild(nameSpan);

      row.appendChild(el("span", "mgmt-item-price", `${gen.buyPrice}g`));

      const buyBtn = el("button", "mgmt-buy-btn", "Buy");
      if (this.saveData.gold < gen.buyPrice) {
        buyBtn.classList.add("disabled");
      } else {
        buyBtn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.buyGeneratedItem(uid);
        });
      }
      row.appendChild(buyBtn);

      // Tap item name to expand detail
      nameSpan.style.cursor = "pointer";
      nameSpan.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.expandedShopItem = this.expandedShopItem === uid ? null : uid;
        this.render();
      });

      content.appendChild(row);

      // Detail view
      if (this.expandedShopItem === uid) {
        content.appendChild(this.renderItemDetail(gen));
      }
    }

    // Show stash
    if (this.saveData.stash.length > 0) {
      content.appendChild(el("div", "mgmt-section-label", `Stash (${this.saveData.stash.length})`));
      for (const itemId of this.saveData.stash) {
        const row = el("div", "mgmt-stash-row");
        const stashName = el("span", "", resolveItemName(itemId));
        if (isGeneratedItemId(itemId)) {
          const gen = registry[itemId];
          if (gen) stashName.style.color = qualityColor(gen.itemLevel);
        }
        row.appendChild(stashName);
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

  private renderItemDetail(gen: import("@data/GeneratedItemData").GeneratedItem): HTMLElement {
    const detail = el("div", "mgmt-item-detail");

    const slotLabel = gen.slotType.replace("_", " ");
    detail.appendChild(el("div", "mgmt-detail-slot", `Type: ${slotLabel}`));

    // Show stats with comparison to base
    if (gen.slotType === "weapon") {
      const base = resolveWeapon(gen.baseId);
      const resolved = resolveWeapon(gen.uid);
      this.addStatLine(detail, "Damage", `${resolved.minDamage}-${resolved.maxDamage}`,
        base.minDamage !== resolved.minDamage || base.maxDamage !== resolved.maxDamage ? "better" : "same",
        `(${base.minDamage}-${base.maxDamage})`);
      this.addStatLine(detail, "Hit Bonus", `${resolved.hitChanceBonus}`, resolved.hitChanceBonus > base.hitChanceBonus ? "better" : resolved.hitChanceBonus < base.hitChanceBonus ? "worse" : "same", `(${base.hitChanceBonus})`);
      this.addStatLine(detail, "AP Cost", `${resolved.apCost}`, resolved.apCost < base.apCost ? "better" : resolved.apCost > base.apCost ? "worse" : "same", `(${base.apCost})`);
      this.addStatLine(detail, "Fatigue", `${resolved.fatigueCost}`, resolved.fatigueCost < base.fatigueCost ? "better" : resolved.fatigueCost > base.fatigueCost ? "worse" : "same", `(${base.fatigueCost})`);
      this.addStatLine(detail, "Armor Ignore", `${Math.round(resolved.armorIgnorePct * 100)}%`, resolved.armorIgnorePct > base.armorIgnorePct ? "better" : "same", `(${Math.round(base.armorIgnorePct * 100)}%)`);
      this.addStatLine(detail, "Armor Dmg", `${Math.round(resolved.armorDamageMult * 100)}%`, resolved.armorDamageMult > base.armorDamageMult ? "better" : "same", `(${Math.round(base.armorDamageMult * 100)}%)`);
    } else if (gen.slotType === "shield") {
      const base = resolveShield(gen.baseId);
      const resolved = resolveShield(gen.uid);
      if (base && resolved) {
        this.addStatLine(detail, "Melee Def", `+${resolved.meleeDefBonus}`, resolved.meleeDefBonus > base.meleeDefBonus ? "better" : "same", `(+${base.meleeDefBonus})`);
        this.addStatLine(detail, "Ranged Def", `+${resolved.rangedDefBonus}`, resolved.rangedDefBonus > base.rangedDefBonus ? "better" : "same", `(+${base.rangedDefBonus})`);
        this.addStatLine(detail, "Durability", `${resolved.durability}`, resolved.durability > base.durability ? "better" : "same", `(${base.durability})`);
      }
    } else if (gen.slotType === "body_armor" || gen.slotType === "head_armor") {
      const base = resolveArmor(gen.baseId);
      const resolved = resolveArmor(gen.uid);
      if (base && resolved) {
        this.addStatLine(detail, "Durability", `${resolved.durability}`, resolved.durability > base.durability ? "better" : "same", `(${base.durability})`);
        this.addStatLine(detail, "Fatigue Pen.", `${resolved.fatiguePenalty}`, resolved.fatiguePenalty < base.fatiguePenalty ? "better" : resolved.fatiguePenalty > base.fatiguePenalty ? "worse" : "same", `(${base.fatiguePenalty})`);
        this.addStatLine(detail, "Init Pen.", `${resolved.initiativePenalty}`, resolved.initiativePenalty < base.initiativePenalty ? "better" : resolved.initiativePenalty > base.initiativePenalty ? "worse" : "same", `(${base.initiativePenalty})`);
      }
    }

    // Show modifiers
    if (gen.modifiers.length > 0) {
      detail.appendChild(el("div", "mgmt-detail-mods-label", "Modifiers:"));
      for (const mod of gen.modifiers) {
        const modEl = el("div", "mgmt-detail-mod", mod.label);
        modEl.style.color = "#44cc44";
        detail.appendChild(modEl);
      }
    }

    return detail;
  }

  private addStatLine(parent: HTMLElement, label: string, value: string, comparison: "better" | "worse" | "same", baseValue: string): void {
    const line = el("div", "mgmt-detail-stat");
    line.appendChild(el("span", "mgmt-stat-label", `${label}: `));

    const valSpan = el("span", "mgmt-stat-value", value);
    if (comparison === "better") {
      valSpan.style.color = "#44cc44";
      valSpan.textContent = `${value} \u25B2`;
    } else if (comparison === "worse") {
      valSpan.style.color = "#dd4444";
      valSpan.textContent = `${value} \u25BC`;
    }
    line.appendChild(valSpan);

    if (comparison !== "same") {
      const baseSpan = el("span", "mgmt-stat-base", ` ${baseValue}`);
      baseSpan.style.color = "#888";
      line.appendChild(baseSpan);
    }

    parent.appendChild(line);
  }

  private buyGeneratedItem(uid: string): void {
    const gen = this.saveData.itemRegistry?.[uid];
    if (!gen || this.saveData.gold < gen.buyPrice) return;

    this.saveData.gold -= gen.buyPrice;
    this.saveData.stash.push(uid);

    // Remove from shop inventory
    const shopState = this.saveData.shopState;
    if (shopState) {
      const idx = shopState.inventory.indexOf(uid);
      if (idx !== -1) shopState.inventory.splice(idx, 1);
    }

    void this.save();
    this.render();
  }

  private refreshShop(): void {
    const partyLevel = getPartyLevel(this.saveData.roster);
    const shopState = this.saveData.shopState;
    if (!shopState) return;

    const cost = shopRefreshCost(partyLevel, shopState.refreshCount);
    if (this.saveData.gold < cost) return;

    this.saveData.gold -= cost;
    const registry = this.saveData.itemRegistry ?? {};

    // Remove old shop items from registry (if not in stash/equipment)
    shopState.inventory = generateShopInventory(partyLevel, registry, simpleRng);
    shopState.refreshCount++;
    shopState.generatedAtLevel = partyLevel;

    pruneItemRegistry(this.saveData);
    void this.save();
    this.render();
  }

  private sellItem(itemId: string): void {
    const idx = this.saveData.stash.indexOf(itemId);
    if (idx === -1) return;
    const sellPrice = Math.floor(getItemPrice(itemId) / 2);
    this.saveData.gold += sellPrice;
    this.saveData.stash.splice(idx, 1);
    pruneItemRegistry(this.saveData);
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
