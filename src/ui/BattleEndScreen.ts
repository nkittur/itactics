import type { XPAward } from "@combat/XPCalculator";
import { xpForNextLevel } from "@data/LevelData";

export class BattleEndScreen {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  onContinue: (() => void) | null = null;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "battle-end-backdrop";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.panel = document.createElement("div");
    this.panel.className = "battle-end-panel";
    this.container.appendChild(this.panel);
  }

  show(victory: boolean, awards: XPAward[]): void {
    this.container.style.display = "flex";
    this.panel.innerHTML = "";

    // Title
    const title = el("div", "battle-end-title", victory ? "Victory!" : "Defeat");
    title.style.color = victory ? "#44cc44" : "#cc4444";
    this.panel.appendChild(title);

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

    // Button
    const btn = document.createElement("button") as HTMLButtonElement;
    btn.className = "battle-end-btn";
    btn.textContent = victory ? "Continue" : "Retry";
    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.onContinue?.();
    });
    this.panel.appendChild(btn);
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
