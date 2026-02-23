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
  private orthoHalfHeight = 8;
  private engine: Engine;

  private readonly minOrthoHalfHeight = 3;
  private readonly maxOrthoHalfHeight = 15;

  constructor(scene: Scene, engine: Engine) {
    this.engine = engine;

    this.camera = new FreeCamera("camera", new Vector3(0, 10, 0), scene);
    // Fixed rotation: look straight down. No setTarget() — avoids gimbal lock.
    this.camera.rotation.x = Math.PI / 2;
    this.camera.rotation.y = 0;
    this.camera.rotation.z = 0;
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    this.camera.inputs.clear();
    this.updateOrtho();
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
   * Only modifies position — rotation stays fixed.
   */
  pan(dx: number, dz: number): void {
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

  centerOn(x: number, z: number): void {
    this.camera.position.x = x;
    this.camera.position.z = z;
  }

  get orthoSize(): number {
    return this.orthoHalfHeight;
  }
}
