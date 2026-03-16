import type { CombatSkill } from "@data/CombatSkill";

export type ActionType = "wait" | "endTurn";

/** Tier color borders: T1 white, T2 green, T3 blue. */
const TIER_COLORS: Record<number, string> = {
  1: "#cccccc",
  2: "#44cc44",
  3: "#4488dd",
};

export class ActionBar {
  private container: HTMLDivElement;
  private skillDetailStrip: HTMLDivElement;
  private skillSection: HTMLDivElement;
  private separator: HTMLDivElement;
  private actionSection: HTMLDivElement;
  private actionButtons: Map<string, HTMLButtonElement> = new Map();
  private skillButtons: Map<string, HTMLButtonElement> = new Map();
  private skills: CombatSkill[] = [];
  private activeSkillId: string | null = null;

  onAction?: (action: ActionType) => void;
  onSkillSelect?: (skill: CombatSkill) => void;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "action-bar-wrapper";
    root.appendChild(this.container);

    // Strip along bottom showing selected skill name + description (for mobile tap)
    this.skillDetailStrip = document.createElement("div");
    this.skillDetailStrip.className = "action-bar-skill-detail";
    this.skillDetailStrip.setAttribute("aria-live", "polite");
    this.container.appendChild(this.skillDetailStrip);

    const barEl = document.createElement("div");
    barEl.className = "action-bar";
    this.container.appendChild(barEl);

    // Skill section (left side, dynamically populated)
    this.skillSection = document.createElement("div");
    this.skillSection.className = "action-bar-skills";
    barEl.appendChild(this.skillSection);

    // Separator between skills and actions
    this.separator = document.createElement("div");
    this.separator.className = "action-separator";
    barEl.appendChild(this.separator);

    // Action section (right side, static)
    this.actionSection = document.createElement("div");
    this.actionSection.className = "action-bar-actions";
    barEl.appendChild(this.actionSection);

    this.addActionButton("wait", "Wait", "#5a5a7a");
    this.addActionButton("endTurn", "End", "#7a5a3a");

    // Hide separator initially (no skills)
    this.separator.style.display = "none";
  }

  private addActionButton(id: string, label: string, bgColor: string): void {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = label;
    btn.style.background = bgColor;
    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.onAction?.(id as ActionType);
    });
    this.actionSection.appendChild(btn);
    this.actionButtons.set(id, btn);
  }

  /** Populate skill buttons. Only shows non-basic, non-passive skills. */
  setSkills(skills: CombatSkill[]): void {
    this.skillSection.innerHTML = "";
    this.skillButtons.clear();
    this.skills = skills.filter(s => !s.isBasicAttack && !s.isPassive);
    this.activeSkillId = null;

    if (this.skills.length === 0) {
      this.separator.style.display = "none";
      return;
    }

    this.separator.style.display = "";

    for (const skill of this.skills) {
      const btn = document.createElement("button");
      btn.className = "skill-btn";
      // Weapon skills (e.g. Puncture, Stun): label so it's clear they're from the weapon
      const isWeaponSkill = skill.skillDef && !skill.isBasicAttack;
      btn.textContent = isWeaponSkill ? `${skill.name} (Weapon)` : skill.name;
      btn.title = skill.description;

      // Tier color border for generated or ruleset abilities
      const tier = skill.generatedAbility?.tier ?? (skill.rulesetAbility ? 1 : undefined);
      if (tier !== undefined) {
        btn.style.borderColor = TIER_COLORS[tier] ?? "#cccccc";
        btn.style.borderWidth = "2px";
        btn.style.borderStyle = "solid";
      }

      // Cooldown badge for abilities on cooldown
      if (skill.cooldown > 0) {
        const badge = document.createElement("span");
        badge.className = "skill-cooldown-badge";
        badge.textContent = `${skill.cooldown}`;
        btn.style.position = "relative";
        btn.appendChild(badge);
      }

      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.onSkillSelect?.(skill);
      });
      this.skillSection.appendChild(btn);
      this.skillButtons.set(skill.id, btn);
    }
  }

  /** Update which skills are affordable. */
  updateSkillAffordability(affordable: Set<string>): void {
    for (const [id, btn] of this.skillButtons) {
      const canUse = affordable.has(id);
      btn.disabled = !canUse;
    }
  }

  /** Highlight the active skill (in targeting mode). Pass null to clear. */
  setSkillActive(skillId: string | null): void {
    this.activeSkillId = skillId;
    for (const [id, btn] of this.skillButtons) {
      btn.classList.toggle("skill-selected", id === skillId);
    }
  }

  /** Clear all skill buttons. */
  clearSkills(): void {
    this.skillSection.innerHTML = "";
    this.skillButtons.clear();
    this.skills = [];
    this.activeSkillId = null;
    this.separator.style.display = "none";
  }

  /** Show skill name and description along the bottom (e.g. when tapped on mobile). Pass null to hide. */
  setSkillDetail(skill: CombatSkill | null): void {
    if (!skill) {
      this.skillDetailStrip.textContent = "";
      this.skillDetailStrip.classList.remove("action-bar-skill-detail-visible");
      return;
    }
    this.skillDetailStrip.innerHTML = "";
    const nameEl = document.createElement("span");
    nameEl.className = "action-bar-skill-detail-name";
    nameEl.textContent = skill.name;
    const descEl = document.createElement("span");
    descEl.className = "action-bar-skill-detail-desc";
    descEl.textContent = skill.description;
    this.skillDetailStrip.appendChild(nameEl);
    this.skillDetailStrip.appendChild(descEl);
    this.skillDetailStrip.classList.add("action-bar-skill-detail-visible");
  }

  setVisible(visible: boolean): void {
    this.container.style.display = visible ? "flex" : "none";
  }

  setEnabled(action: string, enabled: boolean): void {
    const btn = this.actionButtons.get(action);
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? "1" : "0.4";
    }
  }
}
