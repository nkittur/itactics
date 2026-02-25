export interface BagItemInfo {
  id: string;
  name: string;
  category: "consumable" | "weapon" | "shield" | "unknown";
}

export interface EnemyDetailData {
  name: string;
  currentHp: number;
  maxHp: number;
  /** Character class name (e.g. "Fighter"), if any. */
  className?: string;
  /** Class passive descriptions (e.g. "Dagger AP -1"). */
  classPassives?: string[];
  /** Weapon name + damage range. */
  weaponName: string;
  weaponDamage: string;
  /** Shield name, if any. */
  shieldName?: string;
  /** Body armor: "name durability/max" or null. */
  bodyArmor?: string;
  /** Head armor: "name durability/max" or null. */
  headArmor?: string;
  /** Morale state label. */
  moraleState?: string;
  moraleCurrent?: number;
  /** Fatigue current/max. */
  fatigue?: { current: number; max: number };
  /** Active status effects (formatted strings). */
  statusEffects?: string[];
  /** Base stats. */
  meleeSkill: number;
  meleeDefense: number;
  resolve: number;
  initiative: number;

  // ── Interactive equipment fields (active player unit only) ──
  /** True if this is the active player unit whose turn it is. */
  isActivePlayerUnit?: boolean;
  entityId?: string;
  currentAP?: number;
  bagItems?: BagItemInfo[];
}

/**
 * Full-screen modal panel that shows detailed unit info on long-press.
 * For the active player unit, shows interactive equipment slots and bag.
 */
export class EnemyDetailPanel {
  private container: HTMLDivElement;
  private content: HTMLDivElement;
  /** Called when the backdrop is tapped to dismiss the panel. */
  onDismiss: (() => void) | null = null;

  // ── Equipment action callbacks ──
  onSwapEquipment: ((entityId: string, bagIndex: number, slot: "mainHand" | "offHand") => void) | null = null;
  onUnequipToBag: ((entityId: string, slot: "mainHand" | "offHand") => void) | null = null;
  onUseConsumable: ((entityId: string, bagIndex: number) => void) | null = null;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "enemy-detail-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.content = document.createElement("div");
    this.content.className = "enemy-detail-panel";
    this.container.appendChild(this.content);

    // Tap backdrop to dismiss
    this.container.addEventListener("pointerup", (e) => {
      if (e.target === this.container) {
        this.onDismiss?.();
      }
    });
    // Prevent taps on panel content from dismissing
    this.content.addEventListener("pointerup", (e) => e.stopPropagation());
  }

  show(data: EnemyDetailData): void {
    this.container.style.display = "flex";
    this.buildContent(data);
  }

  /** Refresh the panel content without toggling visibility. */
  refresh(data: EnemyDetailData): void {
    this.buildContent(data);
  }

  private buildContent(data: EnemyDetailData): void {
    this.content.innerHTML = "";

    // Header: name + class
    const header = el("div", "edp-header",
      data.className ? `${data.name}  (${data.className})` : data.name);
    this.content.appendChild(header);

    // Class passives
    if (data.classPassives && data.classPassives.length > 0) {
      const classRow = el("div", "edp-section");
      for (const p of data.classPassives) {
        classRow.appendChild(el("div", "edp-passive", p));
      }
      this.content.appendChild(classRow);
    }

    // HP bar
    const hpRow = el("div", "edp-row");
    const hpPct = data.maxHp > 0 ? data.currentHp / data.maxHp : 0;
    hpRow.innerHTML =
      `<span class="edp-label">HP</span>` +
      `<span class="edp-bar"><span class="edp-bar-fill ${hpPct > 0.5 ? "hp-green" : hpPct > 0.25 ? "hp-yellow" : "hp-red"}" style="width:${hpPct * 100}%"></span></span>` +
      `<span class="edp-value">${data.currentHp}/${data.maxHp}</span>`;
    this.content.appendChild(hpRow);

    // Stats row
    const statsRow = el("div", "edp-stats");
    statsRow.innerHTML =
      `<span>Skill ${data.meleeSkill}</span>` +
      `<span>Def ${data.meleeDefense}</span>` +
      `<span>Res ${data.resolve}</span>` +
      `<span>Init ${data.initiative}</span>`;
    this.content.appendChild(statsRow);

    // Equipment section
    const isInteractive = !!data.isActivePlayerUnit && data.entityId != null;
    const canAct = isInteractive && (data.currentAP ?? 0) >= 4;

    const equipSection = el("div", "edp-section");

    // Main hand slot
    this.buildEquipSlot(equipSection, "Wpn", `${data.weaponName}  ${data.weaponDamage}`,
      isInteractive ? "mainHand" : undefined, data, canAct);

    // Off hand / shield slot
    if (data.shieldName || isInteractive) {
      this.buildEquipSlot(equipSection, "Off", data.shieldName ?? "—",
        isInteractive ? "offHand" : undefined, data, canAct);
    }

    // Armor (read-only, no swapping)
    if (data.bodyArmor) equipSection.appendChild(el("div", "edp-equip edp-armor", data.bodyArmor));
    if (data.headArmor) equipSection.appendChild(el("div", "edp-equip edp-armor", data.headArmor));

    this.content.appendChild(equipSection);

    // Bag section (active player unit only)
    if (isInteractive && data.bagItems) {
      this.content.appendChild(el("div", "edp-divider"));
      const bagHeader = el("div", "edp-bag-header",
        `Bag (${data.bagItems.length})`);
      this.content.appendChild(bagHeader);

      if (data.bagItems.length === 0) {
        this.content.appendChild(el("div", "edp-bag-empty", "Empty"));
      } else {
        for (let i = 0; i < data.bagItems.length; i++) {
          const item = data.bagItems[i]!;
          const row = el("div", "edp-bag-item");

          const nameSpan = el("span", "edp-bag-name", item.name);
          row.appendChild(nameSpan);

          const btnGroup = el("div", "edp-bag-actions");
          const bagIdx = i;

          if (item.category === "consumable") {
            // Use button for consumables
            const useBtn = document.createElement("button") as HTMLButtonElement;
            useBtn.className = "edp-slot-action";
            useBtn.textContent = "Use";
            useBtn.disabled = !canAct;
            useBtn.addEventListener("pointerup", (e) => {
              e.stopPropagation();
              if (data.entityId != null) this.onUseConsumable?.(data.entityId!, bagIdx);
            });
            btnGroup.appendChild(useBtn);
          } else if (item.category === "weapon") {
            // Equip as main hand
            const equipBtn = document.createElement("button") as HTMLButtonElement;
            equipBtn.className = "edp-slot-action";
            equipBtn.textContent = "Equip";
            equipBtn.disabled = !canAct;
            equipBtn.addEventListener("pointerup", (e) => {
              e.stopPropagation();
              if (data.entityId != null) this.onSwapEquipment?.(data.entityId!, bagIdx, "mainHand");
            });
            btnGroup.appendChild(equipBtn);
          } else if (item.category === "shield") {
            // Equip as off hand
            const equipBtn = document.createElement("button") as HTMLButtonElement;
            equipBtn.className = "edp-slot-action";
            equipBtn.textContent = "Equip";
            equipBtn.disabled = !canAct;
            equipBtn.addEventListener("pointerup", (e) => {
              e.stopPropagation();
              if (data.entityId != null) this.onSwapEquipment?.(data.entityId!, bagIdx, "offHand");
            });
            btnGroup.appendChild(equipBtn);
          }

          if (!canAct && item.category !== "unknown") {
            btnGroup.appendChild(el("span", "edp-ap-cost", "4 AP"));
          }

          row.appendChild(btnGroup);
          this.content.appendChild(row);
        }
      }
    }

    // Morale + Fatigue
    if (data.moraleState || data.fatigue) {
      this.content.appendChild(el("div", "edp-divider"));
      const stateRow = el("div", "edp-section");
      if (data.moraleState) {
        const moraleColor = MORALE_COLORS[data.moraleState] ?? "#999";
        stateRow.appendChild(el("span", "edp-morale",
          `${data.moraleState}${data.moraleCurrent != null ? ` (${data.moraleCurrent})` : ""}`));
        stateRow.lastElementChild!.setAttribute("style", `color:${moraleColor}`);
      }
      if (data.fatigue) {
        stateRow.appendChild(el("span", "edp-fatigue", `Fat ${data.fatigue.current}/${data.fatigue.max}`));
      }
      this.content.appendChild(stateRow);
    }

    // Status effects
    if (data.statusEffects && data.statusEffects.length > 0) {
      const effectsRow = el("div", "edp-effects", data.statusEffects.join(", "));
      this.content.appendChild(effectsRow);
    }
  }

  private buildEquipSlot(
    parent: HTMLElement,
    label: string,
    displayText: string,
    slot: "mainHand" | "offHand" | undefined,
    data: EnemyDetailData,
    canAct: boolean | undefined,
  ): void {
    const row = el("div", "edp-equip-slot");
    row.appendChild(el("span", "edp-slot-label", label));
    row.appendChild(el("span", "edp-slot-value", displayText));

    if (slot && data.entityId != null) {
      // Check if the slot has an item to unequip
      const hasItem = slot === "mainHand" ? !!data.weaponName : !!data.shieldName;
      if (hasItem) {
        const stowBtn = document.createElement("button") as HTMLButtonElement;
        stowBtn.className = "edp-slot-action";
        stowBtn.textContent = "Stow";
        stowBtn.disabled = !canAct;
        stowBtn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          this.onUnequipToBag?.(data.entityId!, slot);
        });
        row.appendChild(stowBtn);
      }

      if (!canAct) {
        row.appendChild(el("span", "edp-ap-cost", "4 AP"));
      }
    }

    parent.appendChild(row);
  }

  hide(): void {
    this.container.style.display = "none";
  }
}

const MORALE_COLORS: Record<string, string> = {
  Confident: "#44cc44",
  Steady: "#aaaaaa",
  Wavering: "#cccc44",
  Breaking: "#cc8844",
  Fleeing: "#cc4444",
};

function el(tag: string, className?: string, text?: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
