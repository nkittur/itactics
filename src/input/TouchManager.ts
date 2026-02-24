import { Scene } from "@babylonjs/core/scene";
import { CameraController } from "@rendering/CameraController";
import { HexLayout, pixelToHex } from "@hex/HexLayout";

/**
 * Unified touch and pointer input manager.
 *
 * - **Tap** (quick press, minimal movement): Picks the hex under the pointer.
 * - **Long-press** (hold ≥400ms without moving): Fires onHexLongPress.
 * - **Pan** (single-finger drag or mouse drag): Pans the camera.
 * - **Pinch** (two-finger gesture): Zooms the camera.
 * - **Mouse wheel**: Zooms the camera.
 */
export class TouchManager {
  /** Called when a hex tile is tapped. Receives axial (q, r) coordinates. */
  onHexTap: ((q: number, r: number) => void) | null = null;
  /** Called when a hex is long-pressed (hold ≥400ms). */
  onHexLongPress: ((q: number, r: number) => void) | null = null;
  /** Called when a long-press ends (finger/mouse released). */
  onLongPressEnd: (() => void) | null = null;

  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private camera: CameraController;
  private hexLayout: HexLayout;

  // Touch state tracking (for pinch)
  private touchStart: { x: number; y: number; time: number } | null = null;
  private isDragging = false;
  private initialPinchDistance: number | null = null;
  private lastPinchScale = 1;
  private touchActive = false;

  // Pointer state tracking (mouse/stylus — not touch)
  private pointerDown = false;
  private pointerStart: { x: number; y: number } | null = null;
  private pointerDragging = false;

  // Long-press state
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressActive = false;
  private readonly LONG_PRESS_MS = 400;
  private readonly LONG_PRESS_MOVE_THRESHOLD = 10;

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
  // Long-press helpers
  // ---------------------------------------------------------------------------

  private startLongPressTimer(screenX: number, screenY: number): void {
    this.cancelLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.longPressActive = true;
      this.fireLongPress(screenX, screenY);
    }, this.LONG_PRESS_MS);
  }

  private cancelLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private fireLongPress(screenX: number, screenY: number): void {
    if (!this.onHexLongPress) return;
    const { x: worldX, z: worldZ } = this.camera.screenToWorld(screenX, screenY);
    const hex = pixelToHex(this.hexLayout, worldX, worldZ);
    this.onHexLongPress(hex.q, hex.r);
  }

  private endLongPress(): void {
    this.cancelLongPressTimer();
    if (this.longPressActive) {
      this.longPressActive = false;
      this.onLongPressEnd?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Touch events (handles tap, long-press, single-finger pan, and pinch-zoom)
  // ---------------------------------------------------------------------------

  private setupTouchEvents(): void {
    this.canvas.addEventListener("touchstart", this.boundOnTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundOnTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundOnTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this.boundOnTouchCancel);
  }

  private onTouchStart(e: TouchEvent): void {
    this.touchActive = true;

    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      this.isDragging = false;
      this.startLongPressTimer(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      this.initialPinchDistance = Math.hypot(dx, dy);
      this.lastPinchScale = 1;
      this.touchStart = null;
      this.cancelLongPressTimer();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1 && this.touchStart) {
      const touch = e.touches[0]!;
      const dx = touch.clientX - this.touchStart.x;
      const dy = touch.clientY - this.touchStart.y;
      const distance = Math.hypot(dx, dy);

      if (distance > this.LONG_PRESS_MOVE_THRESHOLD || this.isDragging) {
        this.cancelLongPressTimer();
        if (this.longPressActive) {
          this.endLongPress();
        }
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
    // End any active long-press
    if (this.longPressActive) {
      this.endLongPress();
    } else if (this.touchStart && e.changedTouches.length === 1 && !this.isDragging) {
      this.cancelLongPressTimer();
      const touch = e.changedTouches[0]!;
      const elapsed = Date.now() - this.touchStart.time;
      const moved = Math.hypot(
        touch.clientX - this.touchStart.x,
        touch.clientY - this.touchStart.y
      );

      if (elapsed < 300 && moved < 15) {
        this.handleTap(touch.clientX, touch.clientY);
      }
    }

    if (e.touches.length === 0) {
      this.cancelLongPressTimer();
      this.touchStart = null;
      this.isDragging = false;
      this.initialPinchDistance = null;
      this.lastPinchScale = 1;
      this.touchActive = false;
    }
  }

  private onTouchCancel(_e: TouchEvent): void {
    this.endLongPress();
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
    if (e.pointerType === "touch") return;

    this.pointerDown = true;
    this.pointerDragging = false;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.startLongPressTimer(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "touch") return;
    if (!this.pointerDown || !this.pointerStart) return;

    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;

    if (Math.hypot(dx, dy) > 5 || this.pointerDragging) {
      this.cancelLongPressTimer();
      if (this.longPressActive) {
        this.endLongPress();
      }
      this.pointerDragging = true;
      this.panByScreenDelta(dx, dy);
      this.pointerStart.x = e.clientX;
      this.pointerStart.y = e.clientY;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerType === "touch") return;

    if (this.longPressActive) {
      this.endLongPress();
    } else if (this.pointerDown && !this.pointerDragging) {
      this.cancelLongPressTimer();
      this.handleTap(e.clientX, e.clientY);
    }

    this.cancelLongPressTimer();
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

  private panByScreenDelta(dx: number, dy: number): void {
    this.camera.panByScreenDelta(dx, dy, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private handleTap(screenX: number, screenY: number): void {
    if (!this.onHexTap) return;

    const { x: worldX, z: worldZ } = this.camera.screenToWorld(screenX, screenY);
    const hexCoord = pixelToHex(this.hexLayout, worldX, worldZ);
    this.onHexTap(hexCoord.q, hexCoord.r);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.cancelLongPressTimer();
    this.canvas.removeEventListener("touchstart", this.boundOnTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundOnTouchMove);
    this.canvas.removeEventListener("touchend", this.boundOnTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.boundOnTouchCancel);
    this.canvas.removeEventListener("pointerdown", this.boundOnPointerDown);
    this.canvas.removeEventListener("pointermove", this.boundOnPointerMove);
    this.canvas.removeEventListener("pointerup", this.boundOnPointerUp);
    this.canvas.removeEventListener("wheel", this.boundOnWheel);

    this.onHexTap = null;
    this.onHexLongPress = null;
    this.onLongPressEnd = null;
  }
}
