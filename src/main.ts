/**
 * iTactics — Entry point
 * Loads save data, then initializes the battle scene.
 */

import { DemoBattle } from "./scenes/DemoBattle";
import { loadGame } from "@save/SaveManager";

async function init() {
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element #gameCanvas not found");
  }

  // Load save before constructing the scene (determines which scenario to load)
  const saveData = await loadGame().catch(() => null);
  const scenarioIndex = saveData?.currentScenarioIndex ?? 0;

  const demo = new DemoBattle(canvas, scenarioIndex);
  await demo.start();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    demo.dispose();
  });
}

init();
