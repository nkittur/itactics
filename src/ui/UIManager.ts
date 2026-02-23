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
    // Scale GUI controls relative to a consistent design height so they
    // aren't tiny on high-DPI / retina mobile screens.
    this.guiTexture.idealHeight = 844;
  }

  dispose(): void {
    this.guiTexture.dispose();
  }
}
