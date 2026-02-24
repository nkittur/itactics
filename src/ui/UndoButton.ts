export class UndoButton {
  private btn: HTMLButtonElement;

  onUndo?: () => void;

  constructor(root: HTMLDivElement) {
    this.btn = document.createElement("button");
    this.btn.className = "undo-btn";
    this.btn.textContent = "↩";
    this.btn.title = "Undo move";
    this.btn.style.display = "none";
    this.btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      this.onUndo?.();
    });
    root.appendChild(this.btn);
  }

  setVisible(visible: boolean): void {
    this.btn.style.display = visible ? "block" : "none";
  }
}
