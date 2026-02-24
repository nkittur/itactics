export class UnitInfoPanel {
  private container: HTMLDivElement;
  private nameText: HTMLDivElement;
  private hpText: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private apText: HTMLDivElement;
  private mpText: HTMLDivElement;
  private fatigueFill: HTMLDivElement;
  private fatigueText: HTMLDivElement;
  private weaponText: HTMLDivElement;
  private moraleText: HTMLDivElement;
  private statusText: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.container = document.createElement("div");
    this.container.className = "unit-info-panel";
    this.container.style.display = "none";
    root.appendChild(this.container);

    this.nameText = document.createElement("div");
    this.nameText.className = "unit-name";
    this.container.appendChild(this.nameText);

    // HP bar
    const hpBar = document.createElement("div");
    hpBar.className = "hp-bar";
    this.container.appendChild(hpBar);

    this.hpFill = document.createElement("div");
    this.hpFill.className = "hp-fill";
    hpBar.appendChild(this.hpFill);

    this.hpText = document.createElement("div");
    this.hpText.className = "hp-text";
    this.container.appendChild(this.hpText);

    // AP display
    this.apText = document.createElement("div");
    this.apText.className = "ap-text";
    this.apText.style.fontSize = "11px";
    this.apText.style.color = "#aad4ff";
    this.apText.style.marginTop = "2px";
    this.container.appendChild(this.apText);

    // MP display
    this.mpText = document.createElement("div");
    this.mpText.className = "mp-text";
    this.mpText.style.fontSize = "11px";
    this.mpText.style.color = "#88cc88";
    this.mpText.style.marginTop = "2px";
    this.container.appendChild(this.mpText);

    // Fatigue bar
    const fatigueBar = document.createElement("div");
    fatigueBar.className = "hp-bar";
    fatigueBar.style.marginTop = "2px";
    this.container.appendChild(fatigueBar);

    this.fatigueFill = document.createElement("div");
    this.fatigueFill.className = "hp-fill";
    fatigueBar.appendChild(this.fatigueFill);

    this.fatigueText = document.createElement("div");
    this.fatigueText.className = "hp-text";
    this.fatigueText.style.fontSize = "10px";
    this.container.appendChild(this.fatigueText);

    // Weapon name
    this.weaponText = document.createElement("div");
    this.weaponText.className = "weapon-text";
    this.weaponText.style.fontSize = "10px";
    this.weaponText.style.color = "#ccaa88";
    this.weaponText.style.marginTop = "2px";
    this.container.appendChild(this.weaponText);

    // Morale state
    this.moraleText = document.createElement("div");
    this.moraleText.style.fontSize = "10px";
    this.moraleText.style.marginTop = "2px";
    this.container.appendChild(this.moraleText);

    // Status effects
    this.statusText = document.createElement("div");
    this.statusText.style.fontSize = "9px";
    this.statusText.style.color = "#cc8844";
    this.statusText.style.marginTop = "1px";
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
    weaponName?: string,
    moraleState?: string,
    statusEffects?: string[],
  ): void {
    this.container.style.display = "block";
    this.nameText.textContent = name;
    this.hpText.textContent = `HP ${currentHp}/${maxHp}`;

    const hpPct = maxHp > 0 ? currentHp / maxHp : 0;
    this.hpFill.style.width = `${hpPct * 100}%`;

    if (hpPct > 0.5) {
      this.hpFill.style.background = "#44bb44";
    } else if (hpPct > 0.25) {
      this.hpFill.style.background = "#bbbb44";
    } else {
      this.hpFill.style.background = "#bb4444";
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

    // Fatigue
    if (fatigue) {
      const fatPct = fatigue.max > 0 ? fatigue.current / fatigue.max : 0;
      this.fatigueFill.style.width = `${fatPct * 100}%`;
      this.fatigueFill.style.background = "#cc8844";
      this.fatigueText.textContent = `Fat ${fatigue.current}/${fatigue.max}`;
      this.fatigueText.style.display = "block";
      this.fatigueFill.parentElement!.style.display = "block";
    } else {
      this.fatigueText.style.display = "none";
      this.fatigueFill.parentElement!.style.display = "none";
    }

    // Weapon
    if (weaponName) {
      this.weaponText.textContent = weaponName;
      this.weaponText.style.display = "block";
    } else {
      this.weaponText.style.display = "none";
    }

    // Morale
    if (moraleState && moraleState !== "steady") {
      const moraleColors: Record<string, string> = {
        confident: "#44cc44",
        wavering: "#cccc44",
        breaking: "#cc8844",
        fleeing: "#cc4444",
      };
      this.moraleText.textContent = moraleState.charAt(0).toUpperCase() + moraleState.slice(1);
      this.moraleText.style.color = moraleColors[moraleState] ?? "#999999";
      this.moraleText.style.display = "block";
    } else {
      this.moraleText.style.display = "none";
    }

    // Status effects
    if (statusEffects && statusEffects.length > 0) {
      this.statusText.textContent = statusEffects.join(", ");
      this.statusText.style.display = "block";
    } else {
      this.statusText.style.display = "none";
    }
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
