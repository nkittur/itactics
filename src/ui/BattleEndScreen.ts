import type { XPAward } from "@combat/XPCalculator";
import type { CPAward } from "@combat/CPCalculator";
import { xpForNextLevel } from "@data/LevelData";

export class BattleEndScreen {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  onContinue: (() => void) | null = null;
  onForfeit: (() => void) | null = null;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "battle-end-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.panel = document.createElement("div");
    this.panel.className = "battle-end-panel";
    this.container.appendChild(this.panel);
  }

  show(victory: boolean, awards: XPAward[], goldEarned?: number, cpAwards?: CPAward[]): void {
    this.container.style.display = "flex";
    this.panel.innerHTML = "";

    // Title
    const title = el("div", "battle-end-title", victory ? "Victory!" : "Defeat");
    title.style.color = victory ? "#44cc44" : "#cc4444";
    this.panel.appendChild(title);

    // Gold earned
    if (victory && goldEarned != null && goldEarned > 0) {
      this.panel.appendChild(el("div", "battle-end-gold", `+${goldEarned} Gold`));
    }

    // XP table
    if (awards.length > 0) {
      const table = el("div", "xp-table");

      for (const award of awards) {
        const row = el("div", award.leveledUp ? "xp-row xp-levelup" : "xp-row");

        const nameSpan = el("span", "xp-name", award.name);
        row.appendChild(nameSpan);

        const xpSpan = el("span", "xp-gained", `+${award.xpGained} XP`);
        row.appendChild(xpSpan);

        const levelSpan = el("span", "xp-level", `Lv ${award.newLevel}`);
        if (award.leveledUp) {
          levelSpan.textContent = `Lv ${award.newLevel} → ${award.newLevel + 1}`;
        }
        row.appendChild(levelSpan);

        // XP progress
        const needed = xpForNextLevel(award.newLevel);
        const progressPct = needed > 0 ? Math.min(100, (award.newTotal / (award.newTotal - award.xpGained + needed)) * 100) : 100;
        const bar = el("div", "xp-bar");
        const fill = el("div", "xp-bar-fill");
        fill.style.width = `${Math.min(100, (award.newTotal % needed) / needed * 100)}%`;
        if (award.leveledUp) fill.style.width = "100%";
        bar.appendChild(fill);
        row.appendChild(bar);

        table.appendChild(row);
      }

      this.panel.appendChild(table);
    }

    // CP awards
    if (cpAwards && cpAwards.length > 0) {
      const cpSection = el("div", "cp-awards-section");
      cpSection.appendChild(el("div", "cp-section-title", "Class Points Earned"));

      for (const cp of cpAwards) {
        const row = el("div", "cp-row");
        row.appendChild(el("span", "cp-name", cp.name));
        const breakdown = `${cp.actions} acts + ${cp.kills} kills`;
        row.appendChild(el("span", "cp-breakdown", breakdown));
        const earned = el("span", "cp-earned", `+${cp.cpEarned} CP`);
        row.appendChild(earned);
        cpSection.appendChild(row);
      }

      this.panel.appendChild(cpSection);
    }

    // Buttons
    if (victory) {
      const btn = document.createElement("button") as HTMLButtonElement;
      btn.className = "battle-end-btn";
      btn.textContent = "Continue";
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.onContinue?.();
      });
      this.panel.appendChild(btn);
    } else {
      const btnRow = el("div", "battle-end-btn-row");

      const retryBtn = document.createElement("button") as HTMLButtonElement;
      retryBtn.className = "battle-end-btn";
      retryBtn.textContent = "Retry";
      retryBtn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.onContinue?.();
      });
      btnRow.appendChild(retryBtn);

      const forfeitBtn = document.createElement("button") as HTMLButtonElement;
      forfeitBtn.className = "battle-end-btn battle-end-forfeit";
      forfeitBtn.textContent = "Forfeit";
      forfeitBtn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        this.onForfeit?.();
      });
      btnRow.appendChild(forfeitBtn);

      this.panel.appendChild(btnRow);
    }
  }

  hide(): void {
    this.container.style.display = "none";
  }
}

function el(tag: string, className?: string, text?: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
