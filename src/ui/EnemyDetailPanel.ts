import type { DetailedAttackPreview } from "@combat/DamageCalculator";

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
  /** Attack preview if in range, null if not. */
  attackPreview: DetailedAttackPreview | null;
}

/**
 * Full-screen modal panel that shows detailed enemy info on long-press.
 * Includes stat breakdown, equipment, effects, and combat preview with modifiers.
 */
export class EnemyDetailPanel {
  private container: HTMLDivElement;
  private content: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "enemy-detail-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.content = document.createElement("div");
    this.content.className = "enemy-detail-panel";
    this.container.appendChild(this.content);
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

    // Attack preview
    if (data.attackPreview) {
      const ap = data.attackPreview;
      const divider = el("div", "edp-divider");
      this.content.appendChild(divider);

      const hitRow = el("div", "edp-hit-header");
      hitRow.innerHTML =
        `<span class="edp-hit-label">Hit Chance</span>` +
        `<span class="edp-hit-value">${ap.hitChance}%</span>`;
      this.content.appendChild(hitRow);

      // Modifier breakdown
      const modList = el("div", "edp-modifiers");
      for (const mod of ap.modifiers) {
        const sign = mod.value >= 0 ? "+" : "";
        const color = mod.value > 0 ? "#88cc88" : mod.value < 0 ? "#cc8888" : "#999";
        const row = el("div", "edp-mod-row");
        row.innerHTML =
          `<span class="edp-mod-label">${mod.label}</span>` +
          `<span class="edp-mod-value" style="color:${color}">${sign}${mod.value}</span>`;
        modList.appendChild(row);
      }
      this.content.appendChild(modList);

      // Damage range
      const dmgRow = el("div", "edp-dmg-row");
      dmgRow.innerHTML =
        `<span class="edp-label">Damage</span>` +
        `<span class="edp-value">${ap.minDamage}-${ap.maxDamage}</span>`;
      this.content.appendChild(dmgRow);

      // Armor interaction
      if (ap.armorIgnorePct > 0 || ap.armorDamageMult > 0) {
        const armorRow = el("div", "edp-armor-info");
        const parts: string[] = [];
        if (ap.armorIgnorePct > 0) parts.push(`${Math.round(ap.armorIgnorePct * 100)}% ignore armor`);
        if (ap.armorDamageMult > 0) parts.push(`${Math.round(ap.armorDamageMult * 100)}% vs armor`);
        armorRow.textContent = parts.join(" / ");
        this.content.appendChild(armorRow);
      }
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
