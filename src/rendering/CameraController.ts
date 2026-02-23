import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/**
 * Orthographic camera controller for top-down hex grid viewing.
 *
 * The camera sits at a fixed Y height looking straight down at the XZ plane.
 * Orthographic projection ensures hex tiles appear uniformly sized regardless
 * of distance. The controller provides pan and zoom methods that are driven
 * by the touch/mouse input system.
 */
export class CameraController {
  camera: FreeCamera;
  private orthoHalfHeight = 8;
  private engine: Engine;

  /** Minimum ortho half-height (most zoomed in). */
  private readonly minOrthoHalfHeight = 3;
  /** Maximum ortho half-height (most zoomed out). */
  private readonly maxOrthoHalfHeight = 15;

  constructor(scene: Scene, engine: Engine) {
    this.engine = engine;

    // Position camera above the origin looking straight down
    this.camera = new FreeCamera("camera", new Vector3(0, 10, 0), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    // Disable all default camera controls; we handle input ourselves
    this.camera.inputs.clear();

    this.updateOrtho();
  }

  /**
   * Recalculate orthographic bounds based on the current ortho half-height
   * and the canvas aspect ratio. Call this whenever the window is resized
   * or the zoom level changes.
   */
  updateOrtho(): void {
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    this.camera.orthoTop = this.orthoHalfHeight;
    this.camera.orthoBottom = -this.orthoHalfHeight;
    this.camera.orthoLeft = -this.orthoHalfHeight * aspect;
    this.camera.orthoRight = this.orthoHalfHeight * aspect;
  }

  /**
   * Pan the camera by a world-space delta on the XZ plane.
   * Both the camera position and target are moved together.
   */
  pan(dx: number, dz: number): void {
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    const target = this.camera.getTarget();
    this.camera.setTarget(new Vector3(target.x + dx, 0, target.z + dz));
  }

  /**
   * Adjust the zoom level by changing the orthographic half-height.
   * Positive delta zooms out (larger visible area), negative zooms in.
   * The value is clamped between minOrthoHalfHeight and maxOrthoHalfHeight.
   */
  zoom(delta: number): void {
    this.orthoHalfHeight = Math.max(
      this.minOrthoHalfHeight,
      Math.min(this.maxOrthoHalfHeight, this.orthoHalfHeight + delta)
    );
    this.updateOrtho();
  }

  /**
   * Zoom by a multiplicative scale factor (used for pinch gestures).
   * A scale > 1 zooms in, scale < 1 zooms out.
   */
  zoomByScale(scale: number): void {
    if (scale === 0) return;
    this.orthoHalfHeight = Math.max(
      this.minOrthoHalfHeight,
      Math.min(this.maxOrthoHalfHeight, this.orthoHalfHeight / scale)
    );
    this.updateOrtho();
  }

  /**
   * Center the camera on a specific world-space position.
   */
  centerOn(x: number, z: number): void {
    this.camera.position.x = x;
    this.camera.position.z = z;
    this.camera.setTarget(new Vector3(x, 0, z));
  }

  /** Current orthographic half-height (read-only). */
  get orthoSize(): number {
    return this.orthoHalfHeight;
  }
}
