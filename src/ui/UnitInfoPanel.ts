export class UnitInfoPanel {
  private container: HTMLDivElement;
  private nameText: HTMLDivElement;
  private hpText: HTMLDivElement;
  private hpFill: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "unit-info-panel";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.nameText = document.createElement("div");
    this.nameText.className = "unit-name";
    this.container.appendChild(this.nameText);

    const hpBar = document.createElement("div");
    hpBar.className = "hp-bar";
    this.container.appendChild(hpBar);

    this.hpFill = document.createElement("div");
    this.hpFill.className = "hp-fill";
    hpBar.appendChild(this.hpFill);

    this.hpText = document.createElement("div");
    this.hpText.className = "hp-text";
    this.container.appendChild(this.hpText);
  }

  show(name: string, currentHp: number, maxHp: number): void {
    this.container.style.display = "block";
    this.nameText.textContent = name;
    this.hpText.textContent = `${currentHp}/${maxHp}`;

    const pct = maxHp > 0 ? currentHp / maxHp : 0;
    this.hpFill.style.width = `${pct * 100}%`;

    if (pct > 0.5) {
      this.hpFill.style.background = "#44bb44";
    } else if (pct > 0.25) {
      this.hpFill.style.background = "#bbbb44";
    } else {
      this.hpFill.style.background = "#bb4444";
    }
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
