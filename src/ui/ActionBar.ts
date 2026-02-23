import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import type { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

export type ActionType = "undo" | "wait" | "endTurn";

export class ActionBar {
  private container: Rectangle;
  private panel: StackPanel;
  onAction?: (action: ActionType) => void;
  private buttons: Map<string, Button> = new Map();

  constructor(gui: AdvancedDynamicTexture) {
    // Semi-transparent background container
    this.container = new Rectangle("actionBarBg");
    this.container.width = 1;
    this.container.height = "110px"; // tall enough for buttons + iOS safe area
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.container.background = "rgba(0, 0, 0, 0.5)";
    this.container.thickness = 0;
    gui.addControl(this.container);

    this.panel = new StackPanel("actionBar");
    this.panel.isVertical = false;
    this.panel.height = "60px";
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.paddingTop = "8px";
    this.container.addControl(this.panel);

    this.addButton("undo", "Undo", "#6a5a3a");
    this.addButton("wait", "Wait", "#5a5a7a");
    this.addButton("endTurn", "End Turn", "#7a5a3a");
  }

  private addButton(id: string, label: string, bgColor: string): void {
    const btn = Button.CreateSimpleButton(id, label);
    btn.width = "100px";
    btn.height = "50px";
    btn.color = "white";
    btn.background = bgColor;
    btn.cornerRadius = 8;
    btn.paddingLeft = "6px";
    btn.paddingRight = "6px";
    btn.fontSize = 16;
    btn.onPointerUpObservable.add(() => {
      this.onAction?.(id as ActionType);
    });
    this.panel.addControl(btn);
    this.buttons.set(id, btn);
  }

  setVisible(visible: boolean): void {
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
