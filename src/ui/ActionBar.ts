import type { SkillDef } from "@data/SkillData";

export type ActionType = "wait" | "endTurn";

export class ActionBar {
  private container: HTMLDivElement;
  private skillSection: HTMLDivElement;
  private separator: HTMLDivElement;
  private actionSection: HTMLDivElement;
  private actionButtons: Map<string, HTMLButtonElement> = new Map();
  private skillButtons: Map<string, HTMLButtonElement> = new Map();
  private skills: SkillDef[] = [];
  private activeSkillId: string | null = null;

  onAction?: (action: ActionType) => void;
  onSkillSelect?: (skill: SkillDef) => void;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "action-bar";
    root.appendChild(this.container);

    // Skill section (left side, dynamically populated)
    this.skillSection = document.createElement("div");
    this.skillSection.className = "action-bar-skills";
    this.container.appendChild(this.skillSection);

    // Separator between skills and actions
    this.separator = document.createElement("div");
    this.separator.className = "action-separator";
    this.container.appendChild(this.separator);

    // Action section (right side, static)
    this.actionSection = document.createElement("div");
    this.actionSection.className = "action-bar-actions";
    this.container.appendChild(this.actionSection);

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

  /** Populate skill buttons. Only shows non-basic skills. */
  setSkills(skills: SkillDef[]): void {
    this.skillSection.innerHTML = "";
    this.skillButtons.clear();
    this.skills = skills.filter(s => !s.isBasicAttack);
    this.activeSkillId = null;

    if (this.skills.length === 0) {
      this.separator.style.display = "none";
      return;
    }

    this.separator.style.display = "";

    for (const skill of this.skills) {
      const btn = document.createElement("button");
      btn.className = "skill-btn";
      btn.textContent = skill.name;
      btn.title = skill.description;
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
