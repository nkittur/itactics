import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/**
 * Orthographic camera controller for hex grid viewing.
 *
 * Tilted ~15 degrees from vertical to show 3D hex column sides.
 * Uses a fixed rotation (no setTarget) to avoid gimbal lock drift.
 *   screen right = world +X
 *   screen up    ≈ world +Z (foreshortened by cos(tilt))
 */

/** Camera tilt: 75 degrees from horizontal = 15 degrees from vertical. */
const TILT = (75 * Math.PI) / 180;
export const TILT_SIN = Math.sin(TILT);
const TILT_COS = Math.cos(TILT);

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
    // Tilted rotation: mostly down with slight forward lean.
    this.camera.rotation.x = TILT;
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
   * Pan the camera by a world-space delta on the ground plane.
   * dz is in ground-plane units; internally adjusted for tilt.
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

  /**
   * Center the camera so ground point (gx, gz) appears at screen center.
   * Accounts for tilt offset.
   */
  centerOn(gx: number, gz: number): void {
    this.panAnim = null;
    this.camera.position.x = gx;
    this.camera.position.z = gz + this.camera.position.y * TILT_COS / TILT_SIN;
  }

  /** Smoothly pan the camera to center on ground point (gx, gz). */
  panTo(gx: number, gz: number, durationMs = 400, onComplete?: () => void): void {
    const targetZ = gz + this.camera.position.y * TILT_COS / TILT_SIN;
    this.panAnim = {
      startX: this.camera.position.x,
      startZ: this.camera.position.z,
      targetX: gx,
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
    const ease = 1 - (1 - t) * (1 - t);

    this.camera.position.x = startX + (targetX - startX) * ease;
    this.camera.position.z = startZ + (targetZ - startZ) * ease;

    if (t >= 1) {
      const cb = this.panAnim.onComplete;
      this.panAnim = null;
      cb?.();
    }
  }

  /**
   * Convert a screen-space drag delta into a world-space camera pan.
   * Accounts for tilted orthographic projection.
   */
  panByScreenDelta(dx: number, dy: number, canvasW: number, canvasH: number): void {
    this.panAnim = null;
    const cam = this.camera;
    const worldDx = -dx * (cam.orthoRight! - cam.orthoLeft!) / canvasW;
    const worldDz = -dy * (cam.orthoTop! - cam.orthoBottom!) / (canvasH * TILT_SIN);
    cam.position.x += worldDx;
    cam.position.z += worldDz;
  }

  /**
   * Convert screen CSS-pixel coordinates to world ground-plane (Y=0) coordinates.
   * Accounts for tilted orthographic projection.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; z: number } {
    const canvas = this.engine.getRenderingCanvas()!;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return { x: 0, z: 0 };

    const nx = screenX / cw;
    const ny = screenY / ch;

    const cam = this.camera;
    const oL = cam.orthoLeft!;
    const oR = cam.orthoRight!;
    const oT = cam.orthoTop!;
    const oB = cam.orthoBottom!;

    const worldX = cam.position.x + oL + nx * (oR - oL);
    const orthoV = oB + (1 - ny) * (oT - oB);
    const worldZ = cam.position.z - (cam.position.y * TILT_COS + orthoV) / TILT_SIN;

    return { x: worldX, z: worldZ };
  }

  /**
   * Project a world ground-plane position to screen-space CSS pixels.
   * Useful for positioning HTML overlays above game objects.
   */
  worldToScreen(worldX: number, worldZ: number, worldY = 0): { x: number; y: number } {
    const canvas = this.engine.getRenderingCanvas()!;
    const cam = this.camera;
    const oL = cam.orthoLeft!;
    const oR = cam.orthoRight!;
    const oT = cam.orthoTop!;
    const oB = cam.orthoBottom!;

    const ndcX = (worldX - cam.position.x - oL) / (oR - oL);
    const orthoV = (cam.position.z - worldZ) * TILT_SIN + (worldY - cam.position.y) * TILT_COS;
    const ndcY = 1 - (orthoV - oB) / (oT - oB);

    return {
      x: ndcX * canvas.clientWidth,
      y: ndcY * canvas.clientHeight,
    };
  }

  get orthoSize(): number {
    return this.orthoHalfHeight;
  }
}
