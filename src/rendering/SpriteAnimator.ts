import { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/**
 * Available sprite animation states.
 * Each maps to a horizontal sprite strip PNG.
 */
export type SpriteAnim = "idle" | "walk" | "attack" | "hurt" | "death";

/** Frame counts for each animation strip. */
const FRAME_COUNTS: Record<SpriteAnim, number> = {
  idle: 6,
  walk: 8,
  attack: 6,
  hurt: 4,
  death: 4,
};

/** Character type determines which sprite folder to load from. */
export type SpriteCharType = "soldier" | "orc";

/** Maps animation names to filenames. */
const ANIM_FILES: Record<SpriteAnim, string> = {
  idle: "Idle.png",
  walk: "Walk.png",
  attack: "Attack.png",
  hurt: "Hurt.png",
  death: "Death.png",
};

/** State for one animated sprite instance. */
export interface SpriteState {
  charType: SpriteCharType;
  currentAnim: SpriteAnim;
  frameIndex: number;
  frameTimer: number;
  loop: boolean;
  onComplete: (() => void) | null;
}

/**
 * Manages sprite strip textures and frame animation state.
 *
 * Pre-loads template textures for all animations of soldier and orc.
 * Provides cloned textures per-unit (independent UV offsets) and
 * manages per-unit animation state (frame counter, looping, callbacks).
 */
export class SpriteAnimator {
  private scene: Scene;
  private templates = new Map<string, Texture>();

  /** Ms per frame for sprite animation. */
  readonly frameMs = 120;

  constructor(scene: Scene) {
    this.scene = scene;
    this.preloadTemplates();
  }

  private templateKey(charType: SpriteCharType, anim: SpriteAnim): string {
    return `${charType}:${anim}`;
  }

  private preloadTemplates(): void {
    for (const charType of ["soldier", "orc"] as SpriteCharType[]) {
      for (const anim of Object.keys(ANIM_FILES) as SpriteAnim[]) {
        const url = `sprites/${charType}/${ANIM_FILES[anim]}`;
        const tex = new Texture(url, this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
        tex.hasAlpha = true;
        tex.wrapU = Texture.CLAMP_ADDRESSMODE;
        tex.wrapV = Texture.CLAMP_ADDRESSMODE;
        tex.uScale = 1 / FRAME_COUNTS[anim];
        tex.uOffset = 0;
        this.templates.set(this.templateKey(charType, anim), tex);
      }
    }
  }

  /** Clone a texture for a specific unit (independent UV). */
  cloneTexture(charType: SpriteCharType, anim: SpriteAnim): Texture {
    const key = this.templateKey(charType, anim);
    const template = this.templates.get(key)!;
    const clone = template.clone();
    clone.uScale = 1 / FRAME_COUNTS[anim];
    clone.uOffset = 0;
    return clone;
  }

  /** Get the frame count for an animation. */
  getFrameCount(anim: SpriteAnim): number {
    return FRAME_COUNTS[anim];
  }

  /** Create a new sprite state for a unit. */
  createState(charType: SpriteCharType): SpriteState {
    return {
      charType,
      currentAnim: "idle",
      frameIndex: 0,
      frameTimer: 0,
      loop: true,
      onComplete: null,
    };
  }

  /**
   * Switch a sprite state to a new animation.
   * Returns the cloned texture for the new animation.
   */
  setAnimation(
    state: SpriteState,
    anim: SpriteAnim,
    loop = true,
    onComplete?: () => void
  ): Texture {
    state.currentAnim = anim;
    state.frameIndex = 0;
    state.frameTimer = 0;
    state.loop = loop;
    state.onComplete = onComplete ?? null;
    return this.cloneTexture(state.charType, anim);
  }

  /**
   * Advance the animation frame for a sprite state.
   * Updates the texture's uOffset to show the current frame.
   */
  tick(state: SpriteState, texture: Texture, deltaMs: number): void {
    state.frameTimer += deltaMs;
    const frameCount = FRAME_COUNTS[state.currentAnim];

    if (state.frameTimer >= this.frameMs) {
      state.frameTimer -= this.frameMs;
      state.frameIndex++;

      if (state.frameIndex >= frameCount) {
        if (state.loop) {
          state.frameIndex = 0;
        } else {
          state.frameIndex = frameCount - 1;
          if (state.onComplete) {
            const cb = state.onComplete;
            state.onComplete = null;
            cb();
          }
        }
      }
    }

    texture.uOffset = state.frameIndex / frameCount;
  }

  dispose(): void {
    for (const [, tex] of this.templates) {
      tex.dispose();
    }
    this.templates.clear();
  }
}
