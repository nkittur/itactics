import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import type { Scene } from "@babylonjs/core/scene";

export class UIManager {
  guiTexture: AdvancedDynamicTexture;

  constructor(scene: Scene) {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "UI",
      true,
      scene
    );
  }

  dispose(): void {
    this.guiTexture.dispose();
  }
}
