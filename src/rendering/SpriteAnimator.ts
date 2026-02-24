import { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/**
 * Available sprite animation states.
 * Each maps to a horizontal sprite strip PNG.
 */
export type SpriteAnim = "idle" | "walk" | "attack" | "hurt" | "death";

/** Character type determines which sprite folder to load from. */
export type SpriteCharType =
  | "archer"
  | "armored-axeman"
  | "armored-orc"
  | "armored-skeleton"
  | "elite-orc"
  | "greatsword-skeleton"
  | "knight"
  | "knight-templar"
  | "lancer"
  | "orc"
  | "orc-rider"
  | "priest"
  | "skeleton"
  | "skeleton-archer"
  | "slime"
  | "soldier"
  | "swordsman"
  | "werebear"
  | "werewolf"
  | "wizard";

/** All character types for iteration. */
export const ALL_CHAR_TYPES: SpriteCharType[] = [
  "archer", "armored-axeman", "armored-orc", "armored-skeleton",
  "elite-orc", "greatsword-skeleton", "knight", "knight-templar",
  "lancer", "orc", "orc-rider", "priest", "skeleton", "skeleton-archer",
  "slime", "soldier", "swordsman", "werebear", "werewolf", "wizard",
];

/** Per-character frame counts for each animation. */
interface AnimFrameCounts {
  idle: number;
  walk: number;
  attack: number;
  hurt: number;
  death: number;
}

const CHAR_FRAMES: Record<SpriteCharType, AnimFrameCounts> = {
  "archer":              { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "armored-axeman":      { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "armored-orc":         { idle: 6, walk: 8, attack: 7, hurt: 4, death: 4 },
  "armored-skeleton":    { idle: 6, walk: 8, attack: 8, hurt: 4, death: 4 },
  "elite-orc":           { idle: 6, walk: 8, attack: 7, hurt: 4, death: 4 },
  "greatsword-skeleton": { idle: 6, walk: 9, attack: 9, hurt: 4, death: 4 },
  "knight":              { idle: 6, walk: 8, attack: 7, hurt: 4, death: 4 },
  "knight-templar":      { idle: 6, walk: 8, attack: 7, hurt: 4, death: 4 },
  "lancer":              { idle: 6, walk: 8, attack: 6, hurt: 4, death: 4 },
  "orc":                 { idle: 6, walk: 8, attack: 6, hurt: 4, death: 4 },
  "orc-rider":           { idle: 6, walk: 8, attack: 8, hurt: 4, death: 4 },
  "priest":              { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "skeleton":            { idle: 6, walk: 8, attack: 6, hurt: 4, death: 4 },
  "skeleton-archer":     { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "slime":               { idle: 6, walk: 6, attack: 6, hurt: 4, death: 4 },
  "soldier":             { idle: 6, walk: 8, attack: 6, hurt: 4, death: 4 },
  "swordsman":           { idle: 6, walk: 8, attack: 7, hurt: 5, death: 4 },
  "werebear":            { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "werewolf":            { idle: 6, walk: 8, attack: 9, hurt: 4, death: 4 },
  "wizard":              { idle: 6, walk: 8, attack: 6, hurt: 4, death: 4 },
};

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
 * Pre-loads template textures for all animations of all character types.
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
    for (const charType of ALL_CHAR_TYPES) {
      const frames = CHAR_FRAMES[charType];
      for (const anim of Object.keys(ANIM_FILES) as SpriteAnim[]) {
        const url = `sprites/${charType}/${ANIM_FILES[anim]}`;
        const tex = new Texture(url, this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
        tex.hasAlpha = true;
        tex.wrapU = Texture.CLAMP_ADDRESSMODE;
        tex.wrapV = Texture.CLAMP_ADDRESSMODE;
        tex.uScale = 1 / frames[anim];
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
    const frameCount = CHAR_FRAMES[charType][anim];
    clone.uScale = 1 / frameCount;
    clone.uOffset = 0;
    return clone;
  }

  /** Get the frame count for a character's animation. */
  getFrameCount(charType: SpriteCharType, anim: SpriteAnim): number {
    return CHAR_FRAMES[charType][anim];
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
    const frameCount = CHAR_FRAMES[state.charType][state.currentAnim];

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
