import type { SkillDef } from "@data/SkillData";

export class SkillBar {
  private container: HTMLDivElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private selectedId: string | null = null;

  onSkillSelect?: (skill: SkillDef) => void;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "skill-bar";
    this.container.style.display = "none";
    root.appendChild(this.container);
  }

  /** Populate the bar with skills. First skill is selected by default. */
  setSkills(skills: SkillDef[], apRemaining: number): void {
    this.container.innerHTML = "";
    this.buttons.clear();
    this.selectedId = null;

    for (const skill of skills) {
      const btn = document.createElement("button");
      btn.className = "skill-btn";
      btn.textContent = skill.isBasicAttack ? skill.name : abbreviate(skill.name);
      btn.title = skill.description;
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.select(skill.id);
        this.onSkillSelect?.(skill);
      });
      this.container.appendChild(btn);
      this.buttons.set(skill.id, btn);
    }

    // Select first skill by default
    if (skills.length > 0) {
      this.select(skills[0]!.id);
    }
  }

  /** Update which skills are affordable. */
  updateAffordability(affordable: Set<string>): void {
    for (const [id, btn] of this.buttons) {
      const canUse = affordable.has(id);
      btn.disabled = !canUse;
    }
  }

  select(skillId: string): void {
    this.selectedId = skillId;
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle("skill-selected", id === skillId);
    }
  }

  setVisible(visible: boolean): void {
    this.container.style.display = visible ? "flex" : "none";
  }

  hide(): void {
    this.setVisible(false);
  }
}

function abbreviate(name: string): string {
  // Short names stay as-is, long names get abbreviated
  if (name.length <= 6) return name;
  // Use initials for multi-word names
  const words = name.split(" ");
  if (words.length > 1) {
    return words.map(w => w[0]).join("").toUpperCase();
  }
  return name.slice(0, 6);
}
