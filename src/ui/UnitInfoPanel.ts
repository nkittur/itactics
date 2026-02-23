import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Control } from "@babylonjs/gui/2D/controls/control";
import type { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

export class UnitInfoPanel {
  private container: Rectangle;
  private nameText: TextBlock;
  private hpText: TextBlock;
  private hpBar: Rectangle;
  private hpFill: Rectangle;

  constructor(gui: AdvancedDynamicTexture) {
    // Outer container positioned above the action bar
    this.container = new Rectangle("unitInfoPanel");
    this.container.width = "200px";
    this.container.height = "60px";
    this.container.cornerRadius = 6;
    this.container.color = "#aaaaaa";
    this.container.thickness = 1;
    this.container.background = "#1a1a2ecc";
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.top = "-70px"; // above the action bar
    this.container.isVisible = false;
    gui.addControl(this.container);

    // Inner stack panel for vertical layout
    const innerPanel = new StackPanel("unitInfoInner");
    innerPanel.isVertical = true;
    innerPanel.width = "180px";
    innerPanel.height = "50px";
    innerPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.container.addControl(innerPanel);

    // Unit name
    this.nameText = new TextBlock("unitName", "");
    this.nameText.color = "#ffffff";
    this.nameText.fontSize = 13;
    this.nameText.height = "18px";
    this.nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    innerPanel.addControl(this.nameText);

    // HP bar background
    this.hpBar = new Rectangle("hpBarBg");
    this.hpBar.width = "180px";
    this.hpBar.height = "12px";
    this.hpBar.cornerRadius = 3;
    this.hpBar.background = "#333333";
    this.hpBar.color = "#555555";
    this.hpBar.thickness = 1;
    innerPanel.addControl(this.hpBar);

    // HP bar fill (child of the HP bar background)
    this.hpFill = new Rectangle("hpBarFill");
    this.hpFill.width = 1; // 0.0 to 1.0, will be updated
    this.hpFill.height = 1;
    this.hpFill.cornerRadius = 3;
    this.hpFill.background = "#44bb44";
    this.hpFill.color = "transparent";
    this.hpFill.thickness = 0;
    this.hpFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.hpBar.addControl(this.hpFill);

    // HP text (e.g., "45/60")
    this.hpText = new TextBlock("hpText", "");
    this.hpText.color = "#cccccc";
    this.hpText.fontSize = 11;
    this.hpText.height = "16px";
    this.hpText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    innerPanel.addControl(this.hpText);
  }

  /**
   * Show the panel with the given unit information.
   * HP bar color changes based on health percentage:
   *   > 50% green, > 25% yellow, otherwise red.
   */
  show(name: string, currentHp: number, maxHp: number): void {
    this.container.isVisible = true;
    this.nameText.text = name;
    this.hpText.text = `${currentHp}/${maxHp}`;

    const pct = maxHp > 0 ? currentHp / maxHp : 0;
    this.hpFill.width = pct; // 0.0 to 1.0

    // Color based on health percentage
    if (pct > 0.5) {
      this.hpFill.background = "#44bb44"; // green
    } else if (pct > 0.25) {
      this.hpFill.background = "#bbbb44"; // yellow
    } else {
      this.hpFill.background = "#bb4444"; // red
    }
  }

  hide(): void {
    this.container.isVisible = false;
  }
}
