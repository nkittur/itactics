import { Scene } from "@babylonjs/core/scene";
import { CameraController } from "@rendering/CameraController";
import { HexLayout, pixelToHex } from "@hex/HexLayout";

/**
 * Unified touch and pointer input manager.
 *
 * - **Tap** (quick press, minimal movement): Picks the hex under the pointer.
 * - **Pan** (single-finger drag or mouse drag): Pans the camera.
 * - **Pinch** (two-finger gesture): Zooms the camera.
 * - **Mouse wheel**: Zooms the camera.
 *
 * Uses pointer events for mouse/stylus (since Babylon.js suppresses mouse
 * events via preventDefault on its own pointer handlers) and raw touch
 * events for multi-touch pinch detection.
 */
export class TouchManager {
  /** Called when a hex tile is tapped. Receives axial (q, r) coordinates. */
  onHexTap: ((q: number, r: number) => void) | null = null;

  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private camera: CameraController;
  private hexLayout: HexLayout;

  // Touch state tracking (for pinch)
  private touchStart: { x: number; y: number; time: number } | null = null;
  private isDragging = false;
  private initialPinchDistance: number | null = null;
  private lastPinchScale = 1;
  private touchActive = false; // true while a touch sequence is active

  // Pointer state tracking (mouse/stylus — not touch)
  private pointerDown = false;
  private pointerStart: { x: number; y: number } | null = null;
  private pointerDragging = false;

  private readonly wheelZoomSpeed = 0.002;

  // Bound event handlers
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;
  private boundOnTouchCancel: (e: TouchEvent) => void;
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
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

    this.canvas.style.touchAction = "none";

    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    this.boundOnTouchCancel = this.onTouchCancel.bind(this);
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);

    this.setupTouchEvents();
    this.setupPointerEvents();
  }

  setHexLayout(layout: HexLayout): void {
    this.hexLayout = layout;
  }

  // ---------------------------------------------------------------------------
  // Touch events (handles tap, single-finger pan, and pinch-zoom)
  // ---------------------------------------------------------------------------

  private setupTouchEvents(): void {
    this.canvas.addEventListener("touchstart", this.boundOnTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this.boundOnTouchCancel);
  }

  private onTouchStart(e: TouchEvent): void {
    // Do NOT call preventDefault here — it would suppress pointer events,
    // blocking Babylon.js GUI button taps. CSS touch-action:none handles
    // preventing browser gestures instead.
    this.touchActive = true;

    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      this.isDragging = false;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      this.initialPinchDistance = Math.hypot(dx, dy);
      this.lastPinchScale = 1;
      this.touchStart = null;
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
        this.panByScreenDelta(dx, dy);
        this.touchStart.x = touch.clientX;
        this.touchStart.y = touch.clientY;
      }
    } else if (e.touches.length === 2 && this.initialPinchDistance !== null) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const currentDistance = Math.hypot(dx, dy);
      const scale = currentDistance / this.initialPinchDistance;
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

      if (elapsed < 300 && moved < 15) {
        console.log("[Touch] tap at", touch.clientX, touch.clientY);
        this.handleTap(touch.clientX, touch.clientY);
      }
    }

    if (e.touches.length === 0) {
      this.touchStart = null;
      this.isDragging = false;
      this.initialPinchDistance = null;
      this.lastPinchScale = 1;
      this.touchActive = false;
    }
  }

  private onTouchCancel(_e: TouchEvent): void {
    this.touchStart = null;
    this.isDragging = false;
    this.initialPinchDistance = null;
    this.lastPinchScale = 1;
    this.touchActive = false;
  }

  // ---------------------------------------------------------------------------
  // Pointer events (mouse/stylus on desktop — skips touch pointers)
  // ---------------------------------------------------------------------------

  private setupPointerEvents(): void {
    this.canvas.addEventListener("pointerdown", this.boundOnPointerDown);
    this.canvas.addEventListener("pointermove", this.boundOnPointerMove);
    this.canvas.addEventListener("pointerup", this.boundOnPointerUp);
    this.canvas.addEventListener("wheel", this.boundOnWheel, { passive: false });
  }

  private onPointerDown(e: PointerEvent): void {
    // Skip touch pointers — handled by touch events above
    if (e.pointerType === "touch") return;

    console.log("[Pointer] down", e.pointerType, e.clientX, e.clientY);
    this.pointerDown = true;
    this.pointerDragging = false;
    this.pointerStart = { x: e.clientX, y: e.clientY };
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "touch") return;
    if (!this.pointerDown || !this.pointerStart) return;

    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;

    if (Math.hypot(dx, dy) > 5 || this.pointerDragging) {
      this.pointerDragging = true;
      this.panByScreenDelta(dx, dy);
      this.pointerStart.x = e.clientX;
      this.pointerStart.y = e.clientY;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerType === "touch") return;

    console.log("[Pointer] up", e.pointerType, "dragging=", this.pointerDragging, "down=", this.pointerDown);

    if (this.pointerDown && !this.pointerDragging) {
      console.log("[Pointer] click→tap at", e.clientX, e.clientY);
      this.handleTap(e.clientX, e.clientY);
    }

    this.pointerDown = false;
    this.pointerDragging = false;
    this.pointerStart = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * this.wheelZoomSpeed * this.camera.orthoSize;
    this.camera.zoom(delta);
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  /** Convert a screen-space drag delta to a world-space camera pan. */
  private panByScreenDelta(dx: number, dy: number): void {
    const cam = this.camera.camera;
    const worldPerPixelX = (cam.orthoRight! - cam.orthoLeft!) / this.canvas.clientWidth;
    const worldPerPixelZ = (cam.orthoTop! - cam.orthoBottom!) / this.canvas.clientHeight;
    const worldDx = -dx * worldPerPixelX;
    const worldDz = dy * worldPerPixelZ;
    this.camera.pan(worldDx, worldDz);
  }

  /**
   * Convert a screen tap/click into a hex coordinate using direct math
   * for the orthographic camera.
   */
  private handleTap(screenX: number, screenY: number): void {
    if (!this.onHexTap) {
      console.log("[handleTap] no onHexTap callback!");
      return;
    }

    const cam = this.camera.camera;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;

    if (cw === 0 || ch === 0) return;

    const nx = screenX / cw;
    const ny = screenY / ch;

    const worldX = cam.position.x + cam.orthoLeft! + nx * (cam.orthoRight! - cam.orthoLeft!);
    const worldZ = cam.position.z + cam.orthoTop! - ny * (cam.orthoTop! - cam.orthoBottom!);

    const hexCoord = pixelToHex(this.hexLayout, worldX, worldZ);
    console.log("[handleTap] screen=(%f,%f) world=(%f,%f) hex=(%d,%d)",
      screenX, screenY, worldX, worldZ, hexCoord.q, hexCoord.r);
    this.onHexTap(hexCoord.q, hexCoord.r);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.canvas.removeEventListener("touchstart", this.boundOnTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundOnTouchMove);
    this.canvas.removeEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.boundOnTouchCancel);
    this.canvas.removeEventListener("pointerdown", this.boundOnPointerDown);
    this.canvas.removeEventListener("pointermove", this.boundOnPointerMove);
    this.canvas.removeEventListener("pointerup", this.boundOnPointerUp);
    this.canvas.removeEventListener("wheel", this.boundOnWheel);

    this.onHexTap = null;
  }
}
