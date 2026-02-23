import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Control } from "@babylonjs/gui/2D/controls/control";
import type { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

export type ActionType = "undo" | "wait" | "endTurn";

export class ActionBar {
  private panel: StackPanel;
  onAction?: (action: ActionType) => void;
  private buttons: Map<string, Button> = new Map();

  constructor(gui: AdvancedDynamicTexture) {
    this.panel = new StackPanel("actionBar");
    this.panel.isVertical = false;
    this.panel.height = "70px";
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.paddingBottom = "40px";
    gui.addControl(this.panel);

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
    this.panel.isVisible = visible;
  }

  setEnabled(action: string, enabled: boolean): void {
    const btn = this.buttons.get(action);
    if (btn) {
      btn.isEnabled = enabled;
      btn.alpha = enabled ? 1.0 : 0.4;
    }
  }
}
