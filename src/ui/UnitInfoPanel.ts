export class UnitInfoPanel {
  private container: HTMLDivElement;
  private nameText: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private fatigueText: HTMLSpanElement;
  private apText: HTMLSpanElement;
  private mpText: HTMLSpanElement;
  private statusText: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "unit-info-panel";
    this.container.style.display = "none";
    root.appendChild(this.container);

    // Name row
    this.nameText = document.createElement("div");
    this.nameText.className = "uip-name";
    this.container.appendChild(this.nameText);

    // Two-column stats row
    const row = document.createElement("div");
    row.className = "uip-stats-row";
    this.container.appendChild(row);

    // Left column: HP / Fatigue
    const left = document.createElement("div");
    left.className = "uip-col";
    row.appendChild(left);

    this.hpText = document.createElement("span");
    this.hpText.className = "uip-hp";
    left.appendChild(this.hpText);

    this.fatigueText = document.createElement("span");
    this.fatigueText.className = "uip-fat";
    left.appendChild(this.fatigueText);

    // Right column: AP / MP
    const right = document.createElement("div");
    right.className = "uip-col uip-col-right";
    row.appendChild(right);

    this.apText = document.createElement("span");
    this.apText.className = "uip-ap";
    right.appendChild(this.apText);

    this.mpText = document.createElement("span");
    this.mpText.className = "uip-mp";
    right.appendChild(this.mpText);

    // Status effects (morale + effects on one line)
    this.statusText = document.createElement("div");
    this.statusText.className = "uip-status";
    this.container.appendChild(this.statusText);
  }

  show(
    name: string,
    currentHp: number,
    maxHp: number,
    ap?: number,
    mp?: number,
    maxMP?: number,
    fatigue?: { current: number; max: number },
    _weaponName?: string,
    moraleState?: string,
    statusEffects?: string[],
  ): void {
    this.container.style.display = "block";
    this.nameText.textContent = name;

    // HP with color
    const hpPct = maxHp > 0 ? currentHp / maxHp : 0;
    const hpColor = hpPct > 0.5 ? "#44bb44" : hpPct > 0.25 ? "#bbbb44" : "#bb4444";
    this.hpText.textContent = `HP ${currentHp}/${maxHp}`;
    this.hpText.style.color = hpColor;
    this.hpText.style.display = "block";

    // Fatigue
    if (fatigue) {
      this.fatigueText.textContent = `Fat ${fatigue.current}/${fatigue.max}`;
      this.fatigueText.style.display = "block";
    } else {
      this.fatigueText.style.display = "none";
    }

    // AP
    if (ap != null) {
      this.apText.textContent = `AP ${ap}/9`;
      this.apText.style.display = "block";
    } else {
      this.apText.style.display = "none";
    }

    // MP
    if (mp != null) {
      this.mpText.textContent = `MP ${mp}/${maxMP ?? 8}`;
      this.mpText.style.display = "block";
    } else {
      this.mpText.style.display = "none";
    }

    // Status line: morale + effects
    const parts: string[] = [];
    if (moraleState && moraleState !== "steady") {
      parts.push(moraleState.charAt(0).toUpperCase() + moraleState.slice(1));
    }
    if (statusEffects && statusEffects.length > 0) {
      parts.push(...statusEffects);
    }
    if (parts.length > 0) {
      this.statusText.textContent = parts.join(" · ");
      this.statusText.style.display = "block";
    } else {
      this.statusText.style.display = "none";
    }
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
