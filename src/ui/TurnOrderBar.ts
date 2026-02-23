import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { Control } from "@babylonjs/gui/2D/controls/control";
import type { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import type { TurnEntry } from "@combat/TurnOrder";

export class TurnOrderBar {
  private panel: StackPanel;

  constructor(gui: AdvancedDynamicTexture) {
    this.panel = new StackPanel("turnOrderBar");
    this.panel.isVertical = false;
    this.panel.height = "40px";
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.paddingTop = "5px";
    gui.addControl(this.panel);
  }

  /**
   * Update the displayed turn order. Highlight the current unit.
   *
   * @param entries          The ordered list of turn entries.
   * @param currentEntityId  The entity whose turn it currently is (highlighted).
   * @param getTeam          Function to resolve which team an entity belongs to.
   */
  update(
    entries: readonly TurnEntry[],
    currentEntityId: string | null,
    getTeam: (id: string) => "player" | "enemy"
  ): void {
    // Clear existing children
    this.panel.clearControls();

    for (const entry of entries) {
      const isCurrent = entry.entityId === currentEntityId;
      const team = getTeam(entry.entityId);

      // Create a small colored rectangle for each unit
      const rect = new Rectangle(`turnSlot_${entry.entityId}`);
      rect.width = "32px";
      rect.height = "32px";
      rect.cornerRadius = 4;
      rect.paddingLeft = "2px";
      rect.paddingRight = "2px";

      // Team color: blue for player, red for enemy
      if (team === "player") {
        rect.background = isCurrent ? "#5588cc" : "#334466";
      } else {
        rect.background = isCurrent ? "#cc5555" : "#663333";
      }

      // Highlight the current unit with a bright border
      if (isCurrent) {
        rect.color = "#ffffff";
        rect.thickness = 2;
      } else {
        rect.color = "#888888";
        rect.thickness = 1;
      }

      // Dim units that have already acted
      if (entry.hasActed) {
        rect.alpha = 0.4;
      }

      // Show a small "W" for waiting units
      if (entry.isWaiting && !entry.hasActed) {
        const waitLabel = new TextBlock(`waitLabel_${entry.entityId}`, "W");
        waitLabel.color = "#ffcc00";
        waitLabel.fontSize = 12;
        waitLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        waitLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        rect.addControl(waitLabel);
      }

      this.panel.addControl(rect);
    }
  }

  /** Show/hide the turn order bar. */
  setVisible(visible: boolean): void {
    this.panel.isVisible = visible;
  }
}
