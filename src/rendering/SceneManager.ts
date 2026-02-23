import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";

export class SceneManager {
  engine: Engine;
  scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      adaptToDeviceRatio: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.1, 0.1, 0.18, 1); // dark blue-gray

    // Ambient light for 2D top-down view
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
    light.intensity = 1.0;

    // Performance optimizations for mobile
    this.scene.skipPointerMovePicking = true;
  }

  startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  resize(): void {
    this.engine.resize();
  }

  /**
   * Configure hardware scaling based on device capability.
   * Low-end devices render at half resolution, mid-range at 1.5x scaling.
   */
  configureScaling(): void {
    const gl = this.engine.getRenderingCanvas()?.getContext("webgl2");
    const maxTextureSize = gl?.getParameter(gl.MAX_TEXTURE_SIZE) as number | undefined ?? 4096;
    const cores = navigator.hardwareConcurrency ?? 4;
    const isLowEnd = maxTextureSize <= 2048 || cores <= 2;
    const isMidRange = maxTextureSize <= 4096 || cores <= 4;

    if (isLowEnd) {
      this.engine.setHardwareScalingLevel(2.0);
    } else if (isMidRange) {
      this.engine.setHardwareScalingLevel(1.5);
    } else {
      this.engine.setHardwareScalingLevel(1.0);
    }
  }

  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
