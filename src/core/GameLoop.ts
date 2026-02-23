/**
 * Fixed-timestep game loop with variable render rate.
 *
 * The update function is called at a fixed 60 Hz rate using an accumulator
 * pattern, ensuring deterministic game logic regardless of frame rate.
 * The render function is called once per animation frame.
 */
export class GameLoop {
  private readonly TIMESTEP = 1 / 60; // 60 Hz fixed update
  private readonly MAX_FRAME_TIME = 0.25; // cap to avoid spiral of death

  private accumulator = 0;
  private lastTime = 0;
  private rafId: number | null = null;
  private running = false;

  constructor(
    private readonly updateFn: (dt: number) => void,
    private readonly renderFn: () => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const currentTime = timestamp / 1000;
    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Clamp frame time to prevent spiral of death after long pauses
    if (frameTime > this.MAX_FRAME_TIME) {
      frameTime = this.MAX_FRAME_TIME;
    }

    this.accumulator += frameTime;

    // Fixed-timestep updates
    while (this.accumulator >= this.TIMESTEP) {
      this.updateFn(this.TIMESTEP);
      this.accumulator -= this.TIMESTEP;
    }

    // Variable-rate render
    this.renderFn();

    this.rafId = requestAnimationFrame(this.tick);
  };
}
