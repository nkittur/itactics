import type { TurnEntry } from "@combat/TurnOrder";

export class TurnOrderBar {
  private container: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "turn-order-bar";
    root.appendChild(this.container);
  }

  update(
    entries: readonly TurnEntry[],
    currentEntityId: string | null,
    getTeam: (id: string) => "player" | "enemy"
  ): void {
    this.container.innerHTML = "";

    for (const entry of entries) {
      const isCurrent = entry.entityId === currentEntityId;
      const team = getTeam(entry.entityId);

      const slot = document.createElement("div");
      slot.className = "turn-slot";

      if (team === "player") {
        slot.style.background = isCurrent ? "#5588cc" : "#334466";
      } else {
        slot.style.background = isCurrent ? "#cc5555" : "#663333";
      }

      if (isCurrent) {
        slot.style.border = "2px solid #ffffff";
      } else {
        slot.style.border = "1px solid #888888";
      }

      if (entry.hasActed) {
        slot.style.opacity = "0.4";
      }

      if (entry.isWaiting && !entry.hasActed) {
        slot.textContent = "W";
        slot.style.color = "#ffcc00";
      }

      this.container.appendChild(slot);
    }
  }

  setVisible(visible: boolean): void {
    this.container.style.display = visible ? "flex" : "none";
  }
}
