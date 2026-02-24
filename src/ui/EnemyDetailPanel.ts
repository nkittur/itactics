export interface EnemyDetailData {
  name: string;
  currentHp: number;
  maxHp: number;
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
}

/**
 * Full-screen modal panel that shows detailed enemy info on long-press.
 * Includes stat breakdown, equipment, morale, and status effects.
 */
export class EnemyDetailPanel {
  private container: HTMLDivElement;
  private content: HTMLDivElement;
  /** Called when the backdrop is tapped to dismiss the panel. */
  onDismiss: (() => void) | null = null;

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
    this.content.innerHTML = "";

    // Header: name
    const header = el("div", "edp-header", data.name);
    this.content.appendChild(header);

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

    // Equipment
    const equipSection = el("div", "edp-section");
    equipSection.appendChild(el("div", "edp-equip", `${data.weaponName}  ${data.weaponDamage}`));
    if (data.shieldName) equipSection.appendChild(el("div", "edp-equip", data.shieldName));
    if (data.bodyArmor) equipSection.appendChild(el("div", "edp-equip edp-armor", data.bodyArmor));
    if (data.headArmor) equipSection.appendChild(el("div", "edp-equip edp-armor", data.headArmor));
    this.content.appendChild(equipSection);

    // Morale + Fatigue
    if (data.moraleState || data.fatigue) {
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
