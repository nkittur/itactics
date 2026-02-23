export class UIManager {
  root: HTMLDivElement;

  constructor() {
    const existing = document.getElementById("gameUI") as HTMLDivElement | null;
    if (existing) {
      this.root = existing;
    } else {
      this.root = document.createElement("div");
      this.root.id = "gameUI";
      document.body.appendChild(this.root);
    }
  }

  dispose(): void {
    this.root.innerHTML = "";
  }
}
