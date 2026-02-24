export type ActionType = "undo" | "wait" | "endTurn" | "recover";

export class ActionBar {
  private container: HTMLDivElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  onAction?: (action: ActionType) => void;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "action-bar";
    root.appendChild(this.container);

    this.addButton("undo", "Undo", "#6a5a3a");
    this.addButton("recover", "Rest", "#3a6a5a");
    this.addButton("wait", "Wait", "#5a5a7a");
    this.addButton("endTurn", "End", "#7a5a3a");
  }

  private addButton(id: string, label: string, bgColor: string): void {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = label;
    btn.style.background = bgColor;
    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.onAction?.(id as ActionType);
    });
    this.container.appendChild(btn);
    this.buttons.set(id, btn);
  }

  setVisible(visible: boolean): void {
    this.container.style.display = visible ? "flex" : "none";
  }

  setEnabled(action: string, enabled: boolean): void {
    const btn = this.buttons.get(action);
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? "1" : "0.4";
    }
  }
}
