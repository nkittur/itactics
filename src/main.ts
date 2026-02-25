/**
 * iTactics — Entry point
 * Initializes the demo battle scene on the canvas.
 */

import { DemoBattle } from "./scenes/DemoBattle";

async function init() {
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element #gameCanvas not found");
  }

  const demo = new DemoBattle(canvas);
  await demo.start();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    demo.dispose();
  });
}

init();
