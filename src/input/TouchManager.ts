import { Scene } from "@babylonjs/core/scene";
import { CameraController } from "@rendering/CameraController";
import { HexLayout, pixelToHex } from "@hex/HexLayout";

/**
 * Unified touch and mouse input manager.
 *
 * Handles all pointer input on the game canvas and translates raw browser
 * events into game-meaningful actions:
 *
 * - **Tap** (touch < 200ms, movement < 10px): Picks the hex under the pointer
 *   and fires the onHexTap callback.
 * - **Pan** (single-finger drag or mouse drag): Pans the camera across the
 *   battlefield.
 * - **Pinch** (two-finger gesture): Zooms the camera in or out.
 * - **Mouse wheel**: Zooms the camera.
 *
 * Touch events are handled via the pointer events API fallback, with direct
 * touch event listeners for pinch detection. The canvas touch-action is set
 * to "none" to prevent browser gestures from interfering.
 */
export class TouchManager {
  /** Called when a hex tile is tapped. Receives axial (q, r) coordinates. */
  onHexTap: ((q: number, r: number) => void) | null = null;

  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private camera: CameraController;
  private hexLayout: HexLayout;

  // Touch state tracking
  private touchStart: { x: number; y: number; time: number } | null = null;
  private isDragging = false;
  private initialPinchDistance: number | null = null;
  private lastPinchScale = 1;

  // Mouse state tracking
  private mouseDown = false;
  private mouseStart: { x: number; y: number } | null = null;
  private mouseDragging = false;

  /** Speed multiplier for converting screen-space drag pixels to world-space pan units. */
  private readonly panSpeed = 0.02;
  /** Speed multiplier for mouse wheel zoom. */
  private readonly wheelZoomSpeed = 0.002;

  // Bound event handlers (for proper removeEventListener)
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;
  private boundOnTouchCancel: (e: TouchEvent) => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    scene: Scene,
    camera: CameraController,
    hexLayout: HexLayout
  ) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.hexLayout = hexLayout;

    // Prevent browser default touch gestures (scroll, zoom, etc.)
    this.canvas.style.touchAction = "none";

    // Bind handlers
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnTouchCancel = this.onTouchCancel.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);

    this.setupTouchEvents();
    this.setupMouseEvents();
  }

  /**
   * Update the hex layout reference (e.g., if the layout changes at runtime).
   */
  setHexLayout(layout: HexLayout): void {
    this.hexLayout = layout;
  }

  // ---------------------------------------------------------------------------
  // Touch events
  // ---------------------------------------------------------------------------

  private setupTouchEvents(): void {
    this.canvas.addEventListener("touchstart", this.boundOnTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this.boundOnTouchCancel);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      this.isDragging = false;
    } else if (e.touches.length === 2) {
      // Begin pinch
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      this.initialPinchDistance = Math.hypot(dx, dy);
      this.lastPinchScale = 1;
      this.touchStart = null; // cancel any pending tap
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1 && this.touchStart) {
      const touch = e.touches[0]!;
      const dx = touch.clientX - this.touchStart.x;
      const dy = touch.clientY - this.touchStart.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 10 || this.isDragging) {
        this.isDragging = true;

        // Convert screen-space drag to world-space camera pan.
        // Invert X because dragging right should move the camera left (viewport moves right).
        // Invert Y (screen Y -> world Z) and further invert because dragging up
        // should move camera "forward" which is negative Z in our top-down view.
        const worldDx = -dx * this.panSpeed * this.camera.orthoSize;
        const worldDz = dy * this.panSpeed * this.camera.orthoSize;

        this.camera.pan(worldDx, worldDz);

        // Update start for continuous drag deltas
        this.touchStart.x = touch.clientX;
        this.touchStart.y = touch.clientY;
      }
    } else if (e.touches.length === 2 && this.initialPinchDistance !== null) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const currentDistance = Math.hypot(dx, dy);
      const scale = currentDistance / this.initialPinchDistance;

      // Apply only the delta since last frame
      const deltaScale = scale / this.lastPinchScale;
      this.camera.zoomByScale(deltaScale);
      this.lastPinchScale = scale;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.touchStart && e.changedTouches.length === 1 && !this.isDragging) {
      const touch = e.changedTouches[0]!;
      const elapsed = Date.now() - this.touchStart.time;
      const moved = Math.hypot(
        touch.clientX - this.touchStart.x,
        touch.clientY - this.touchStart.y
      );

      // Tap: short duration and minimal movement
      if (elapsed < 200 && moved < 10) {
        this.handleTap(touch.clientX, touch.clientY);
      }
    }

    // Reset state
    if (e.touches.length === 0) {
      this.touchStart = null;
      this.isDragging = false;
      this.initialPinchDistance = null;
      this.lastPinchScale = 1;
    }
  }

  private onTouchCancel(_e: TouchEvent): void {
    this.touchStart = null;
    this.isDragging = false;
    this.initialPinchDistance = null;
    this.lastPinchScale = 1;
  }

  // ---------------------------------------------------------------------------
  // Mouse events (desktop / hybrid devices)
  // ---------------------------------------------------------------------------

  private setupMouseEvents(): void {
    this.canvas.addEventListener("mousedown", this.boundOnMouseDown);
    this.canvas.addEventListener("mousemove", this.boundOnMouseMove);
    this.canvas.addEventListener("mouseup", this.boundOnMouseUp);
    this.canvas.addEventListener("wheel", this.boundOnWheel, { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouseDown = true;
    this.mouseDragging = false;
    this.mouseStart = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.mouseDown || !this.mouseStart) return;

    const dx = e.clientX - this.mouseStart.x;
    const dy = e.clientY - this.mouseStart.y;

    if (Math.hypot(dx, dy) > 5 || this.mouseDragging) {
      this.mouseDragging = true;

      const worldDx = -dx * this.panSpeed * this.camera.orthoSize;
      const worldDz = dy * this.panSpeed * this.camera.orthoSize;

      this.camera.pan(worldDx, worldDz);

      this.mouseStart.x = e.clientX;
      this.mouseStart.y = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.mouseDown && !this.mouseDragging) {
      // Click (no drag) = tap
      this.handleTap(e.clientX, e.clientY);
    }

    this.mouseDown = false;
    this.mouseDragging = false;
    this.mouseStart = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    // Positive deltaY = scroll down = zoom out (increase ortho size)
    const delta = e.deltaY * this.wheelZoomSpeed * this.camera.orthoSize;
    this.camera.zoom(delta);
  }

  // ---------------------------------------------------------------------------
  // Hex picking
  // ---------------------------------------------------------------------------

  /**
   * Convert a screen tap/click into a hex coordinate using Babylon.js scene
   * picking. The pick ray intersects with scene meshes; the hit point in
   * world space is converted from (worldX, worldZ) to axial hex coordinates
   * using pixelToHex.
   */
  private handleTap(screenX: number, screenY: number): void {
    if (!this.onHexTap) return;

    // Use Babylon.js scene picking to find the world-space position of the tap
    const pickResult = this.scene.pick(screenX, screenY);

    if (pickResult?.hit && pickResult.pickedPoint) {
      // World X -> hex pixel X, World Z -> hex pixel Y (top-down on XZ plane)
      const worldX = pickResult.pickedPoint.x;
      const worldZ = pickResult.pickedPoint.z;

      const hexCoord = pixelToHex(this.hexLayout, worldX, worldZ);
      this.onHexTap(hexCoord.q, hexCoord.r);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Remove all event listeners and clean up resources.
   */
  dispose(): void {
    this.canvas.removeEventListener("touchstart", this.boundOnTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundOnTouchMove);
    this.canvas.removeEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.boundOnTouchCancel);
    this.canvas.removeEventListener("mousedown", this.boundOnMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundOnMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundOnMouseUp);
    this.canvas.removeEventListener("wheel", this.boundOnWheel);

    this.onHexTap = null;
  }
}
