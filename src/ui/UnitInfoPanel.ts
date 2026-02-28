export interface ClassResourceDisplay {
  name: string;
  current: number;
  max: number;
  color: string;
}

export class UnitInfoPanel {
  private container: HTMLDivElement;
  private nameText: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private staminaText: HTMLSpanElement;
  private apText: HTMLSpanElement;
  private mpText: HTMLSpanElement;
  private resourceText: HTMLDivElement;
  private combatText: HTMLDivElement;
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

    // Left column: HP / Stamina
    const left = document.createElement("div");
    left.className = "uip-col";
    row.appendChild(left);

    this.hpText = document.createElement("span");
    this.hpText.className = "uip-hp";
    left.appendChild(this.hpText);

    this.staminaText = document.createElement("span");
    this.staminaText.className = "uip-sta";
    left.appendChild(this.staminaText);

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

    // Class resources row (Heat, Rage, Chi, etc.)
    this.resourceText = document.createElement("div");
    this.resourceText.className = "uip-resources";
    this.container.appendChild(this.resourceText);

    // Combat stats line (weapon damage + armor)
    this.combatText = document.createElement("div");
    this.combatText.className = "uip-combat";
    this.container.appendChild(this.combatText);

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
    stamina?: { current: number; max: number },
    _weaponName?: string,
    moraleState?: string,
    statusEffects?: string[],
    weaponDamage?: string,
    totalArmor?: number,
    bonusDamage?: number,
    bonusArmor?: number,
    classResources?: ClassResourceDisplay[],
  ): void {
    this.container.style.display = "block";
    this.nameText.textContent = name;

    // HP with color
    const hpPct = maxHp > 0 ? currentHp / maxHp : 0;
    const hpColor = hpPct > 0.5 ? "#44bb44" : hpPct > 0.25 ? "#bbbb44" : "#bb4444";
    this.hpText.textContent = `HP ${currentHp}/${maxHp}`;
    this.hpText.style.color = hpColor;
    this.hpText.style.display = "block";

    // Stamina
    if (stamina) {
      this.staminaText.textContent = `Sta ${stamina.current}/${stamina.max}`;
      this.staminaText.style.display = "block";
    } else {
      this.staminaText.style.display = "none";
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

    // Class resources (Heat, Rage, Chi, etc.)
    if (classResources && classResources.length > 0) {
      // Clear previous
      this.resourceText.innerHTML = "";
      for (const res of classResources) {
        const span = document.createElement("span");
        span.style.color = res.color;
        span.style.marginRight = "8px";
        span.textContent = `${res.name} ${Math.round(res.current)}/${res.max}`;
        this.resourceText.appendChild(span);
      }
      this.resourceText.style.display = "block";
    } else {
      this.resourceText.style.display = "none";
    }

    // Combat stats: weapon damage + armor
    if (weaponDamage != null || totalArmor != null) {
      const parts: string[] = [];
      if (weaponDamage != null) {
        let dmgStr = `Dmg ${weaponDamage}`;
        if (bonusDamage && bonusDamage > 0) dmgStr += `+${bonusDamage}`;
        parts.push(dmgStr);
      }
      if (totalArmor != null) {
        let armStr = `Arm ${totalArmor}`;
        if (bonusArmor && bonusArmor > 0) armStr += `+${bonusArmor}`;
        parts.push(armStr);
      }
      this.combatText.textContent = parts.join(" | ");
      this.combatText.style.display = "block";
    } else {
      this.combatText.style.display = "none";
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
