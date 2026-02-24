import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/**
 * Orthographic camera controller for top-down hex grid viewing.
 *
 * Uses a fixed rotation (pitch PI/2 = look straight down) instead of
 * setTarget to avoid gimbal lock drift. With this rotation:
 *   screen right = world +X
 *   screen up    = world +Z
 */
export class CameraController {
  camera: FreeCamera;
  private orthoHalfHeight = 15;
  private engine: Engine;
  private scene: Scene;

  private readonly minOrthoHalfHeight = 3;
  private readonly maxOrthoHalfHeight = 25;

  /** Active smooth-pan animation state, or null if idle. */
  private panAnim: {
    startX: number; startZ: number;
    targetX: number; targetZ: number;
    startTime: number; duration: number;
    onComplete: (() => void) | null;
  } | null = null;

  constructor(scene: Scene, engine: Engine) {
    this.engine = engine;
    this.scene = scene;

    this.camera = new FreeCamera("camera", new Vector3(0, 10, 0), scene);
    // Fixed rotation: look straight down. No setTarget() — avoids gimbal lock.
    this.camera.rotation.x = Math.PI / 2;
    this.camera.rotation.y = 0;
    this.camera.rotation.z = 0;
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    this.camera.inputs.clear();
    this.updateOrtho();

    // Drive smooth-pan each frame
    scene.registerBeforeRender(() => this.tickPan());
  }

  updateOrtho(): void {
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    this.camera.orthoTop = this.orthoHalfHeight;
    this.camera.orthoBottom = -this.orthoHalfHeight;
    this.camera.orthoLeft = -this.orthoHalfHeight * aspect;
    this.camera.orthoRight = this.orthoHalfHeight * aspect;
  }

  /**
   * Pan the camera by a world-space delta on the XZ plane.
   * Cancels any in-flight smooth pan.
   */
  pan(dx: number, dz: number): void {
    this.panAnim = null;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
  }

  zoom(delta: number): void {
    this.orthoHalfHeight = Math.max(
      this.minOrthoHalfHeight,
      Math.min(this.maxOrthoHalfHeight, this.orthoHalfHeight + delta)
    );
    this.updateOrtho();
  }

  zoomByScale(scale: number): void {
    if (scale === 0) return;
    this.orthoHalfHeight = Math.max(
      this.minOrthoHalfHeight,
      Math.min(this.maxOrthoHalfHeight, this.orthoHalfHeight / scale)
    );
    this.updateOrtho();
  }

  /** Instantly center the camera on a world position. */
  centerOn(x: number, z: number): void {
    this.panAnim = null;
    this.camera.position.x = x;
    this.camera.position.z = z;
  }

  /** Smoothly pan the camera to a world position over durationMs. */
  panTo(targetX: number, targetZ: number, durationMs = 400, onComplete?: () => void): void {
    this.panAnim = {
      startX: this.camera.position.x,
      startZ: this.camera.position.z,
      targetX,
      targetZ,
      startTime: performance.now(),
      duration: durationMs,
      onComplete: onComplete ?? null,
    };
  }

  private tickPan(): void {
    if (!this.panAnim) return;
    const { startX, startZ, targetX, targetZ, startTime, duration } = this.panAnim;
    const t = Math.min(1, (performance.now() - startTime) / duration);
    const ease = 1 - (1 - t) * (1 - t); // ease-out quadratic

    this.camera.position.x = startX + (targetX - startX) * ease;
    this.camera.position.z = startZ + (targetZ - startZ) * ease;

    if (t >= 1) {
      const cb = this.panAnim.onComplete;
      this.panAnim = null;
      cb?.();
    }
  }

  /**
   * Project a world XZ position to screen-space CSS pixels.
   * Useful for positioning HTML overlays above game objects.
   */
  worldToScreen(worldX: number, worldZ: number): { x: number; y: number } {
    const canvas = this.engine.getRenderingCanvas()!;
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;
    const oL = this.camera.orthoLeft!;
    const oR = this.camera.orthoRight!;
    const oT = this.camera.orthoTop!;
    const oB = this.camera.orthoBottom!;

    const ndcX = (worldX - camX - oL) / (oR - oL);
    const ndcY = 1 - (worldZ - camZ - oB) / (oT - oB);

    return {
      x: ndcX * canvas.clientWidth,
      y: ndcY * canvas.clientHeight,
    };
  }

  get orthoSize(): number {
    return this.orthoHalfHeight;
  }
}
