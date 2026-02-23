import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Control } from "@babylonjs/gui/2D/controls/control";
import type { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

export type ActionType = "undo" | "wait" | "endTurn";

export class ActionBar {
  private container: Rectangle;
  private panel: StackPanel;
  onAction?: (action: ActionType) => void;
  private buttons: Map<string, Button> = new Map();

  constructor(gui: AdvancedDynamicTexture) {
    // Outer container: fixed rectangle with visible background
    this.container = new Rectangle("actionBarBg");
    this.container.width = "300px";
    this.container.height = "60px";
    this.container.cornerRadius = 8;
    this.container.background = "#1a1a2ecc";
    this.container.color = "#444466";
    this.container.thickness = 1;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.container.top = "-20px";
    gui.addControl(this.container);

    // Inner horizontal stack for buttons
    this.panel = new StackPanel("actionBar");
    this.panel.isVertical = false;
    this.panel.width = "290px";
    this.panel.height = "50px";
    this.container.addControl(this.panel);

    this.addButton("undo", "Undo", "#6a5a3a");
    this.addButton("wait", "Wait", "#5a5a7a");
    this.addButton("endTurn", "End", "#7a5a3a");

    console.log("[ActionBar] created with", this.buttons.size, "buttons");
  }

  private addButton(id: string, label: string, bgColor: string): void {
    const btn = Button.CreateSimpleButton(id, label);
    btn.width = "90px";
    btn.height = "50px";
    btn.color = "white";
    btn.background = bgColor;
    btn.cornerRadius = 8;
    btn.paddingLeft = "4px";
    btn.paddingRight = "4px";
    btn.fontSize = 16;
    btn.onPointerUpObservable.add(() => {
      console.log("[ActionBar] button pressed:", id);
      this.onAction?.(id as ActionType);
    });
    this.panel.addControl(btn);
    this.buttons.set(id, btn);
  }

  setVisible(visible: boolean): void {
    console.log("[ActionBar] setVisible", visible);
    this.container.isVisible = visible;
  }

  setEnabled(action: string, enabled: boolean): void {
    const btn = this.buttons.get(action);
    if (btn) {
      btn.isEnabled = enabled;
      btn.alpha = enabled ? 1.0 : 0.4;
    }
  }
}
