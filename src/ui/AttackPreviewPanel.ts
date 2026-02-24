import type { DetailedAttackPreview } from "@combat/DamageCalculator";

export interface AttackPreviewData {
  targetName: string;
  preview: DetailedAttackPreview;
}

/**
 * Compact bottom panel showing attack hit chance, modifiers, and damage.
 * Replaces UnitInfoPanel while active. Tap again to confirm, elsewhere to cancel.
 */
export class AttackPreviewPanel {
  private container: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "attack-preview-panel";
    this.container.style.display = "none";
    root.appendChild(this.container);
  }

  show(data: AttackPreviewData): void {
    this.container.style.display = "block";
    const ap = data.preview;

    let html = `<div class="edp-header">Attack ${data.targetName}</div>`;

    // Hit chance
    html += `<div class="edp-hit-header">`;
    html += `<span class="edp-hit-label">Hit Chance</span>`;
    html += `<span class="edp-hit-value">${ap.hitChance}%</span>`;
    html += `</div>`;

    // Modifier breakdown
    html += `<div class="edp-modifiers">`;
    for (const mod of ap.modifiers) {
      const sign = mod.value >= 0 ? "+" : "";
      const color = mod.value > 0 ? "#88cc88" : mod.value < 0 ? "#cc8888" : "#999";
      html += `<div class="edp-mod-row">`;
      html += `<span class="edp-mod-label">${mod.label}</span>`;
      html += `<span class="edp-mod-value" style="color:${color}">${sign}${mod.value}</span>`;
      html += `</div>`;
    }
    html += `</div>`;

    // Damage range
    html += `<div class="edp-dmg-row">`;
    html += `<span class="edp-label">Damage</span>`;
    html += `<span class="edp-value">${ap.minDamage}-${ap.maxDamage}</span>`;
    html += `</div>`;

    // Armor interaction
    if (ap.armorIgnorePct > 0 || ap.armorDamageMult > 0) {
      const parts: string[] = [];
      if (ap.armorIgnorePct > 0) parts.push(`${Math.round(ap.armorIgnorePct * 100)}% ignore armor`);
      if (ap.armorDamageMult > 0) parts.push(`${Math.round(ap.armorDamageMult * 100)}% vs armor`);
      html += `<div class="edp-armor-info">${parts.join(" / ")}</div>`;
    }

    // Confirm hint
    html += `<div class="attack-preview-hint">Tap again to attack</div>`;

    this.container.innerHTML = html;
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
