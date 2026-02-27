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
import { generateShopInventory, shopRefreshCost, qualityColor, qualityLabel } from "@data/ItemGenerator";
import { resolveAbility, getAbilityRegistry, setAbilityRegistry } from "@data/AbilityResolver";
import { THEMES } from "@data/ThemeData";
import { detectUnitSynergies, detectTeamSynergies } from "@data/SynergyDetector";
import { ALL_STAT_KEYS, statDisplayName, type StatKey } from "@data/TalentData";
import type { SkillTree, SkillTreeNode } from "@data/SkillTreeData";

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
  skillTree?: SkillTree;
  unlockedNodes: Set<string>;
  nodeStacks: Record<string, number>;
  classPoints: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#44bb44", normal: "#cccc44", hard: "#dd7722", deadly: "#dd3333",
};

const TIER_COLORS: Record<number, string> = { 1: "#ccc", 2: "#4c4", 3: "#48d" };

const RARITY_COLORS: Record<string, string> = {
  common: "#9d9d9d",
  uncommon: "#1eff00",
  rare: "#0070ff",
  epic: "#a335ee",
  legendary: "#ff8000",
};

function rarityLabel(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

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

    // Initialize item and ability registries
    if (!this.saveData.itemRegistry) this.saveData.itemRegistry = {};
    setItemRegistry(this.saveData.itemRegistry);
    if (!this.saveData.abilityRegistry) this.saveData.abilityRegistry = {};
    setAbilityRegistry(this.saveData.abilityRegistry);

    // Generate contracts/recruits if not cached
    const partyLevel = getPartyLevel(this.saveData.roster);
    if (!this.saveData.availableContracts || this.saveData.availableContracts.length === 0) {
      this.saveData.availableContracts = generateContracts(partyLevel, this.saveData.roster.length, simpleRng);
    }
    if (!this.saveData.availableRecruits || this.saveData.availableRecruits.length === 0) {
      this.saveData.availableRecruits = generateRecruits(partyLevel, simpleRng);
      this.saveData.abilityRegistry = getAbilityRegistry();
    } else {
      // Regenerate recruits if cached from before skill tree system
      const needsRegen = this.saveData.availableRecruits.some(r => !r.skillTree);
      if (needsRegen) {
        this.saveData.availableRecruits = generateRecruits(partyLevel, simpleRng);
        this.saveData.abilityRegistry = getAbilityRegistry();
      }
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
    // 3x zoom on the sprite frame to fill the container with the character art
    const zoom = 3;
    sprite.style.backgroundSize = `${zoom * 600}% ${zoom * 100}%`;
    // Center on character art (approx 45% x, 40% y within each frame)
    const frameSize = size * zoom;
    const offsetX = Math.round(-(0.45 * frameSize - size / 2));
    const offsetY = Math.round(-(0.40 * frameSize - size / 2));
    sprite.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
    sprite.style.borderRadius = size > 64 ? "6px" : "4px";
    sprite.style.backgroundColor = "transparent";
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
        skillTree: m.skillTree,
        unlockedNodes: new Set(m.unlockedNodes ?? []),
        nodeStacks: m.nodeStacks ?? {},
        classPoints: m.classPoints ?? 0,
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
        skillTree: r.skillTree,
        unlockedNodes: new Set<string>(),
        nodeStacks: {},
        classPoints: r.classPoints ?? 0,
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
    const container = el("div", "skill-tree-container");

    if (!unit.skillTree || unit.skillTree.nodes.length === 0) {
      // Fallback: show flat ability list for legacy data
      if (unit.abilities.length === 0) {
        container.appendChild(el("div", "mgmt-empty", "No abilities."));
        return container;
      }
      for (const ab of unit.abilities) {
        const ability = resolveAbility(ab.uid);
        if (!ability) continue;
        const unlocked = unit.level >= ab.unlockLevel;
        const card = el("div", `skill-card${unlocked ? "" : " locked"}`);
        card.style.borderLeftColor = RARITY_COLORS[ability.rarity] ?? "#9d9d9d";
        const nameSpan = el("span", "skill-name", ability.name);
        nameSpan.style.color = unlocked ? (RARITY_COLORS[ability.rarity] ?? "#9d9d9d") : "#666";
        card.appendChild(nameSpan);
        if (unlocked) card.appendChild(el("div", "skill-desc", ability.description));
        container.appendChild(card);
      }
      return container;
    }

    // CP balance header
    const cpHeader = el("div", "cp-header", `Class Points: ${unit.classPoints}`);
    container.appendChild(cpHeader);

    // Tree wrapper (positioned for SVG lines)
    const treeWrapper = el("div", "skill-tree-wrapper");
    const nodeElements = new Map<string, HTMLElement>();

    // Render tiers 1-4
    for (const tier of [1, 2, 3, 4] as const) {
      const tierNodes = unit.skillTree.nodes
        .filter(n => n.tier === tier)
        .sort((a, b) => a.col - b.col);
      if (tierNodes.length === 0) continue;

      const tierRow = el("div", "skill-tree-tier");
      for (const node of tierNodes) {
        const ability = resolveAbility(node.abilityUid);
        if (!ability) continue;

        const isUnlocked = unit.unlockedNodes.has(node.nodeId);
        const prereqsMet = node.prerequisites.every(p => unit.unlockedNodes.has(p));
        const canAfford = unit.classPoints >= node.cpCost;
        const isAvailable = !isUnlocked && prereqsMet;
        const currentStacks = unit.nodeStacks[node.nodeId] ?? (isUnlocked ? 1 : 0);
        const canStack = node.stackable && isUnlocked && currentStacks < node.maxStacks && canAfford;

        const nodeEl = el("div", "tree-node");
        nodeEl.dataset.nodeId = node.nodeId;
        if (isUnlocked) nodeEl.classList.add("unlocked");
        else if (isAvailable) nodeEl.classList.add("available");
        else nodeEl.classList.add("locked");

        nodeEl.classList.add(node.isActive ? "node-active" : "node-passive");
        if (node.dualParent) nodeEl.classList.add("dual-parent");

        // Name (colored by rarity)
        const nameEl = el("div", "tree-node-name", ability.name);
        const rarityColor = RARITY_COLORS[ability.rarity] ?? "#9d9d9d";
        nameEl.style.color = rarityColor;
        nodeEl.appendChild(nameEl);

        // Type badge with rarity
        const typeText = `${rarityLabel(ability.rarity)} ${node.isActive ? "Active" : "Passive"}`;
        const typeEl = el("span", "tree-node-type", typeText);
        if (ability.rarity !== "common") typeEl.style.color = rarityColor;
        nodeEl.appendChild(typeEl);

        // Stack indicator for stackable nodes
        if (node.stackable) {
          nodeEl.appendChild(el("div", "tree-node-stacks", `${currentStacks}/${node.maxStacks}`));
        }

        // Cost or status
        if (isUnlocked && !(node.stackable && currentStacks < node.maxStacks)) {
          nodeEl.appendChild(el("div", "tree-node-status", "\u2713"));
        } else {
          nodeEl.appendChild(el("div", "tree-node-cost", `${node.cpCost}`));
        }

        // Prerequisites label
        if (node.prerequisites.length > 0) {
          const prereqLabel = node.prerequisites.map(pid => {
            const pn = unit.skillTree!.nodes.find(n => n.nodeId === pid);
            if (!pn) return "?";
            const pa = resolveAbility(pn.abilityUid);
            return pa?.name ?? "?";
          }).join(", ");
          const fromEl = el("div", "tree-node-from", "\u2191 " + prereqLabel);
          nodeEl.appendChild(fromEl);
        }

        // Tap handler
        nodeEl.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.showNodeDetail(unit, node, ability, isUnlocked, isAvailable, canAfford, canStack, currentStacks);
        });

        tierRow.appendChild(nodeEl);
        nodeElements.set(node.nodeId, nodeEl);
      }

      treeWrapper.appendChild(tierRow);
    }

    container.appendChild(treeWrapper);

    // Draw SVG connector lines after layout
    requestAnimationFrame(() => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("tree-svg-lines");
      const wrapperRect = treeWrapper.getBoundingClientRect();

      for (const [parentId, childId] of unit.skillTree!.edges) {
        const parentEl = nodeElements.get(parentId);
        const childEl = nodeElements.get(childId);
        if (!parentEl || !childEl) continue;

        const pr = parentEl.getBoundingClientRect();
        const cr = childEl.getBoundingClientRect();

        const x1 = pr.left + pr.width / 2 - wrapperRect.left;
        const y1 = pr.top + pr.height - wrapperRect.top;
        const x2 = cr.left + cr.width / 2 - wrapperRect.left;
        const y2 = cr.top - wrapperRect.top;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));

        // Color based on unlock state
        const childNode = unit.skillTree!.nodes.find(n => n.nodeId === childId);
        const bothUnlocked = unit.unlockedNodes.has(parentId) && unit.unlockedNodes.has(childId);
        const parentUnlocked = unit.unlockedNodes.has(parentId);
        if (bothUnlocked) {
          line.setAttribute("stroke", "#4a4");
        } else if (parentUnlocked) {
          line.setAttribute("stroke", "#886");
        } else {
          line.setAttribute("stroke", "#334");
        }
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
      }

      svg.style.width = wrapperRect.width + "px";
      svg.style.height = wrapperRect.height + "px";
      treeWrapper.insertBefore(svg, treeWrapper.firstChild);
    });

    // Unit synergies (from all unlocked abilities)
    const unlockedAbilityIds = unit.skillTree.nodes
      .filter(n => unit.unlockedNodes.has(n.nodeId))
      .map(n => n.abilityUid);
    const synergies = detectUnitSynergies(unlockedAbilityIds);
    if (synergies.length > 0) {
      container.appendChild(el("div", "mgmt-equip-label", "Synergies:"));
      for (const syn of synergies) {
        container.appendChild(el("div", "mgmt-synergy-row", `\u2194 ${syn.description}`));
      }
    }

    return container;
  }

  private showNodeDetail(
    unit: DetailUnit,
    node: SkillTreeNode,
    ability: ReturnType<typeof resolveAbility>,
    isUnlocked: boolean,
    isAvailable: boolean,
    canAfford: boolean,
    canStack: boolean,
    currentStacks: number,
  ): void {
    if (!ability) return;

    // Remove any existing popup
    const existing = this.root.querySelector(".node-detail-backdrop");
    if (existing) existing.remove();

    const backdrop = el("div", "node-detail-backdrop");
    const panel = el("div", "node-detail-panel");

    // Title (colored by rarity)
    const title = el("div", "node-detail-title", ability.name);
    title.style.color = RARITY_COLORS[ability.rarity] ?? "#9d9d9d";
    panel.appendChild(title);

    // Type + tier + rarity
    const meta: string[] = [];
    meta.push(`${rarityLabel(ability.rarity)} ${node.isActive ? "Active" : "Passive"}`);
    meta.push(`Tier ${node.tier}`);
    if (node.dualParent) meta.push("\u2605 Dual-parent bonus");
    if (node.stackable) meta.push(`Stackable (${currentStacks}/${node.maxStacks})`);
    panel.appendChild(el("div", "node-detail-meta", meta.join(" \u2022 ")));

    // Description
    panel.appendChild(el("div", "node-detail-desc", ability.description));

    // Cost info for active abilities
    if (node.isActive && !ability.isPassive) {
      const costParts: string[] = [];
      costParts.push(`${ability.cost.ap} AP`);
      if (ability.cost.stamina > 0) costParts.push(`${ability.cost.stamina} Stamina`);
      if (ability.cost.mana > 0) costParts.push(`${ability.cost.mana} Mana`);
      if (ability.cost.cooldown > 0) costParts.push(`${ability.cost.cooldown}T CD`);
      if (ability.cost.turnEnding) costParts.push("Turn Ending");
      panel.appendChild(el("div", "node-detail-cost", costParts.join(" | ")));
    }

    // Prerequisites
    if (node.prerequisites.length > 0 && !isUnlocked) {
      const prereqNames = node.prerequisites.map(pid => {
        const pn = unit.skillTree!.nodes.find(n => n.nodeId === pid);
        if (!pn) return pid;
        const pa = resolveAbility(pn.abilityUid);
        const met = unit.unlockedNodes.has(pid);
        return `${met ? "\u2713" : "\u2717"} ${pa?.name ?? pid}`;
      });
      panel.appendChild(el("div", "node-detail-prereqs", "Requires: " + prereqNames.join(", ")));
    }

    // Unlock / Stack button (roster only)
    if (!unit.isRecruit) {
      if (isAvailable && canAfford) {
        const btn = document.createElement("button");
        btn.className = "node-unlock-btn";
        btn.textContent = `Unlock (${node.cpCost} CP)`;
        btn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.unlockNode(this.detailUnit!.index, node.nodeId, node.cpCost);
          backdrop.remove();
        });
        panel.appendChild(btn);
      } else if (canStack) {
        const btn = document.createElement("button");
        btn.className = "node-unlock-btn";
        btn.textContent = `Stack +1 (${node.cpCost} CP) [${currentStacks}→${currentStacks + 1}]`;
        btn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.stackNode(this.detailUnit!.index, node.nodeId, node.cpCost);
          backdrop.remove();
        });
        panel.appendChild(btn);
      } else if (!isUnlocked && !canAfford && isAvailable) {
        panel.appendChild(el("div", "node-detail-cant-afford", `Need ${node.cpCost} CP (have ${unit.classPoints})`));
      }
    }

    // Close on backdrop tap
    backdrop.addEventListener("pointerup", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    backdrop.appendChild(panel);
    this.root.appendChild(backdrop);
  }

  private unlockNode(rosterIdx: number, nodeId: string, cost: number): void {
    const member = this.saveData.roster[rosterIdx];
    if (!member || (member.classPoints ?? 0) < cost) return;

    member.classPoints = (member.classPoints ?? 0) - cost;
    if (!member.unlockedNodes) member.unlockedNodes = [];
    member.unlockedNodes.push(nodeId);
    if (!member.nodeStacks) member.nodeStacks = {};
    member.nodeStacks[nodeId] = 1;

    this.save();
    this.render();
  }

  private stackNode(rosterIdx: number, nodeId: string, cost: number): void {
    const member = this.saveData.roster[rosterIdx];
    if (!member || (member.classPoints ?? 0) < cost) return;

    member.classPoints = (member.classPoints ?? 0) - cost;
    if (!member.nodeStacks) member.nodeStacks = {};
    member.nodeStacks[nodeId] = (member.nodeStacks[nodeId] ?? 1) + 1;

    this.save();
    this.render();
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
        const nameEl = el("div", "equip-slot-name", resolveItemName(slot.itemId));
        if (isGeneratedItemId(slot.itemId)) {
          const gen = this.saveData.itemRegistry?.[slot.itemId];
          if (gen) nameEl.style.color = qualityColor(gen.itemLevel);
        }
        left.appendChild(nameEl);
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
      abilities: r.skillTree.nodes.map(n => n.abilityUid),
      skillTree: r.skillTree,
      unlockedNodes: [],
      nodeStacks: {},
      classPoints: r.classPoints ?? 0,
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
        }
        break;
      }
      case "shield": {
        if (m.equipment.offHand) this.saveData.stash.push(m.equipment.offHand);
        m.equipment.offHand = itemId;
        break;
      }
      case "body_armor": {
        if (m.armor.body) this.saveData.stash.push(m.armor.body.id);
        const armorDef = resolveArmor(itemId);
        m.armor.body = armorDef
          ? { id: itemId, armor: armorDef.armor, magicResist: armorDef.magicResist }
          : null;
        break;
      }
      case "head_armor": {
        if (m.armor.head) this.saveData.stash.push(m.armor.head.id);
        const armorDef = resolveArmor(itemId);
        m.armor.head = armorDef
          ? { id: itemId, armor: armorDef.armor, magicResist: armorDef.magicResist }
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

      // Rarity tag
      const rarityTag = el("span", "mgmt-rarity-tag", qualityLabel(gen.itemLevel));
      rarityTag.style.color = qualityColor(gen.itemLevel);
      row.appendChild(rarityTag);

      const nameSpan = el("span", "mgmt-item-name", gen.name);
      nameSpan.style.color = qualityColor(gen.itemLevel);
      // Show modifier count if any
      if (gen.modifiers.length > 0) {
        nameSpan.textContent = `${gen.name} [+${gen.modifiers.length}]`;
      }
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
      this.addStatLine(detail, "Stamina", `${resolved.staminaCost}`, resolved.staminaCost < base.staminaCost ? "better" : resolved.staminaCost > base.staminaCost ? "worse" : "same", `(${base.staminaCost})`);
      this.addStatLine(detail, "Armor Pierce", `${resolved.armorPiercing}`, resolved.armorPiercing > base.armorPiercing ? "better" : "same", `(${base.armorPiercing})`);
    } else if (gen.slotType === "shield") {
      const base = resolveShield(gen.baseId);
      const resolved = resolveShield(gen.uid);
      if (base && resolved) {
        this.addStatLine(detail, "Dodge", `+${resolved.dodgeBonus}`, resolved.dodgeBonus > base.dodgeBonus ? "better" : "same", `(+${base.dodgeBonus})`);
        this.addStatLine(detail, "Armor", `${resolved.armor}`, resolved.armor > base.armor ? "better" : "same", `(${base.armor})`);
        this.addStatLine(detail, "Stamina Pen.", `${resolved.staminaPenalty}`, resolved.staminaPenalty < base.staminaPenalty ? "better" : resolved.staminaPenalty > base.staminaPenalty ? "worse" : "same", `(${base.staminaPenalty})`);
        this.addStatLine(detail, "MP Pen.", `${resolved.mpPenalty}`, resolved.mpPenalty < base.mpPenalty ? "better" : resolved.mpPenalty > base.mpPenalty ? "worse" : "same", `(${base.mpPenalty})`);
      }
    } else if (gen.slotType === "body_armor" || gen.slotType === "head_armor") {
      const base = resolveArmor(gen.baseId);
      const resolved = resolveArmor(gen.uid);
      if (base && resolved) {
        this.addStatLine(detail, "Armor", `${resolved.armor}`, resolved.armor > base.armor ? "better" : "same", `(${base.armor})`);
        this.addStatLine(detail, "Magic Resist", `${resolved.magicResist}`, resolved.magicResist > base.magicResist ? "better" : "same", `(${base.magicResist})`);
        this.addStatLine(detail, "Stamina Pen.", `${resolved.staminaPenalty}`, resolved.staminaPenalty < base.staminaPenalty ? "better" : resolved.staminaPenalty > base.staminaPenalty ? "worse" : "same", `(${base.staminaPenalty})`);
        this.addStatLine(detail, "Init Pen.", `${resolved.initiativePenalty}`, resolved.initiativePenalty < base.initiativePenalty ? "better" : resolved.initiativePenalty > base.initiativePenalty ? "worse" : "same", `(${base.initiativePenalty})`);
        this.addStatLine(detail, "MP Pen.", `${resolved.mpPenalty}`, resolved.mpPenalty < base.mpPenalty ? "better" : resolved.mpPenalty > base.mpPenalty ? "worse" : "same", `(${base.mpPenalty})`);
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
