import type { DetailedAttackPreview } from "@combat/DamageCalculator";
import type { SkillDef } from "@data/SkillData";

export interface AttackPreviewData {
  targetName: string;
  preview: DetailedAttackPreview;
  skill?: SkillDef;
}

export interface StancePreviewData {
  skill: SkillDef;
}

/**
 * Compact bottom panel showing attack hit chance, modifiers, and damage.
 * Also shows stance preview for self-targeting skills.
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
    const skill = data.skill;
    const isSkill = skill && !skill.isBasicAttack;

    // Header: skill name or "Attack"
    const headerLabel = isSkill ? skill.name : "Attack";
    let html = `<div class="edp-header">${headerLabel} ${data.targetName}</div>`;

    // Skill description
    if (isSkill) {
      html += `<div class="edp-skill-desc">${skill.description}</div>`;
    }

    // Skill effects summary
    if (isSkill) {
      const effects: string[] = [];
      if (skill.damageMultiplier !== 1.0) {
        effects.push(`${Math.round(skill.damageMultiplier * 100)}% damage`);
      }
      if (skill.armorIgnoreOverride != null) {
        effects.push(`${Math.round(skill.armorIgnoreOverride * 100)}% ignore armor`);
      }
      if (skill.onHit) {
        for (const oh of skill.onHit) {
          effects.push(`${oh.chance}% ${oh.effect}`);
        }
      }
      if (effects.length > 0) {
        html += `<div class="edp-skill-effects">${effects.join(" / ")}</div>`;
      }
    }

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
    html += `<div class="attack-preview-hint">Tap again to ${isSkill ? "use" : "attack"}</div>`;

    this.container.innerHTML = html;
  }

  /** Show stance/self-targeting skill preview (no hit chance or damage). */
  showStance(data: StancePreviewData): void {
    this.container.style.display = "block";
    const skill = data.skill;

    let html = `<div class="edp-header">${skill.name}</div>`;
    html += `<div class="edp-skill-desc">${skill.description}</div>`;

    // Cost info
    html += `<div class="edp-modifiers">`;
    if (skill.apCost > 0) {
      html += `<div class="edp-mod-row">`;
      html += `<span class="edp-mod-label">AP Cost</span>`;
      html += `<span class="edp-mod-value" style="color:#ccaa44">${skill.apCost}</span>`;
      html += `</div>`;
    }
    if (skill.fatigueExtra > 0) {
      html += `<div class="edp-mod-row">`;
      html += `<span class="edp-mod-label">Fatigue</span>`;
      html += `<span class="edp-mod-value" style="color:#cc8844">+${skill.fatigueExtra}</span>`;
      html += `</div>`;
    }
    html += `</div>`;

    html += `<div class="attack-preview-hint">Tap again to activate</div>`;

    this.container.innerHTML = html;
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
