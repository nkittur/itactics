import {
  type StatKey,
  ALL_STAT_KEYS,
  statDisplayName,
  getStatRollRange,
  rollStatIncrease,
} from "@data/TalentData";

export interface LevelUpData {
  entityId: string;
  name: string;
  oldLevel: number;
  newLevel: number;
  currentStats: Record<StatKey, number>;
  talentStars: Record<StatKey, number>;
}

export interface LevelUpResult {
  entityId: string;
  chosenStats: StatKey[];
  increases: Record<StatKey, number>;
  perkPointsAwarded: number;
}

export class LevelUpModal {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  onComplete: ((result: LevelUpResult) => void) | null = null;

  private selected = new Set<StatKey>();
  private data: LevelUpData | null = null;
  private confirmed = false;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "levelup-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.panel = document.createElement("div");
    this.panel.className = "levelup-panel";
    this.container.appendChild(this.panel);
  }

  show(data: LevelUpData): void {
    this.data = data;
    this.selected.clear();
    this.confirmed = false;
    this.container.style.display = "flex";
    this.render();
  }

  hide(): void {
    this.container.style.display = "none";
  }

  private render(): void {
    this.panel.innerHTML = "";

    const data = this.data!;

    // Header
    const header = el("div", "levelup-header",
      `${data.name} — Level ${data.oldLevel} → ${data.newLevel}`);
    this.panel.appendChild(header);

    const hint = el("div", "levelup-hint",
      this.confirmed ? "Level up complete!" : "Pick 3 stats to increase");
    this.panel.appendChild(hint);

    // Stat grid
    for (const key of ALL_STAT_KEYS) {
      const row = document.createElement("div") as HTMLDivElement;
      row.className = "levelup-stat-row";
      const isSelected = this.selected.has(key);
      if (isSelected) row.classList.add("levelup-selected");

      // Stat name
      const name = el("span", "levelup-stat-name", statDisplayName(key));
      row.appendChild(name);

      // Current value
      const value = el("span", "levelup-stat-value", `${data.currentStats[key]}`);
      row.appendChild(value);

      // Stars
      const starsDiv = el("span", "levelup-stars");
      const starCount = data.talentStars[key];
      for (let i = 0; i < 3; i++) {
        const star = el("span", i < starCount ? "levelup-star filled" : "levelup-star empty",
          i < starCount ? "★" : "☆");
        starsDiv.appendChild(star);
      }
      row.appendChild(starsDiv);

      // Roll range or result
      const [min, max] = getStatRollRange(key, starCount);
      const rangeSpan = el("span", "levelup-range", `+${min}-${max}`);
      row.appendChild(rangeSpan);

      if (!this.confirmed) {
        row.addEventListener("pointerup", () => {
          if (this.confirmed) return;
          if (this.selected.has(key)) {
            this.selected.delete(key);
          } else if (this.selected.size < 3) {
            this.selected.add(key);
          }
          this.render();
        });
        row.style.cursor = "pointer";
      }

      this.panel.appendChild(row);
    }

    // Confirm button
    if (!this.confirmed) {
      const btn = document.createElement("button") as HTMLButtonElement;
      btn.className = "levelup-confirm-btn";
      btn.textContent = "Confirm";
      btn.disabled = this.selected.size !== 3;
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        if (this.selected.size !== 3 || this.confirmed) return;
        this.confirmLevelUp();
      });
      this.panel.appendChild(btn);
    } else {
      // Show "Continue" after confirmation
      const btn = document.createElement("button") as HTMLButtonElement;
      btn.className = "levelup-confirm-btn";
      btn.textContent = "Continue";
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.hide();
        if (this._lastResult) {
          this.onComplete?.(this._lastResult);
        }
      });
      this.panel.appendChild(btn);
    }
  }

  private _lastResult: LevelUpResult | null = null;

  private confirmLevelUp(): void {
    if (!this.data || this.confirmed) return;
    this.confirmed = true;

    const increases: Record<string, number> = {};
    for (const key of this.selected) {
      const stars = this.data.talentStars[key];
      increases[key] = rollStatIncrease(key, stars, Math.random);
    }

    this._lastResult = {
      entityId: this.data.entityId,
      chosenStats: [...this.selected],
      increases: increases as Record<StatKey, number>,
      perkPointsAwarded: 1,
    };

    // Re-render to show results
    this.showResults(increases as Record<StatKey, number>);
  }

  private showResults(increases: Record<StatKey, number>): void {
    this.panel.innerHTML = "";
    const data = this.data!;

    const header = el("div", "levelup-header",
      `${data.name} — Level ${data.newLevel}!`);
    this.panel.appendChild(header);

    const hint = el("div", "levelup-hint", "+1 Perk Point");
    hint.style.color = "#ffcc44";
    this.panel.appendChild(hint);

    // Show stat increases
    for (const key of ALL_STAT_KEYS) {
      const row = document.createElement("div") as HTMLDivElement;
      row.className = "levelup-stat-row";

      const name = el("span", "levelup-stat-name", statDisplayName(key));
      row.appendChild(name);

      const value = el("span", "levelup-stat-value", `${data.currentStats[key]}`);
      row.appendChild(value);

      if (key in increases) {
        row.classList.add("levelup-selected");
        const inc = el("span", "levelup-increase", `+${increases[key]}`);
        row.appendChild(inc);

        const newVal = el("span", "levelup-new-value",
          `→ ${data.currentStats[key] + increases[key]!}`);
        row.appendChild(newVal);
      }

      this.panel.appendChild(row);
    }

    // Continue button
    const btn = document.createElement("button") as HTMLButtonElement;
    btn.className = "levelup-confirm-btn";
    btn.textContent = "Continue";
    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.hide();
      if (this._lastResult) {
        this.onComplete?.(this._lastResult);
      }
    });
    this.panel.appendChild(btn);
  }
}

function el(tag: string, className?: string, text?: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
