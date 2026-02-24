import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HexLayout, hexToPixel } from "@hex/HexLayout";
import type { HexGrid } from "@hex/HexGrid";
import { LAYER_HEIGHT } from "@rendering/TileRenderer";
import { SpriteAnimator, type SpriteAnim, type SpriteCharType, type SpriteState } from "./SpriteAnimator";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/** Which team a unit belongs to, determines its sprite type. */
export enum UnitTeam {
  Player = "player",
  Enemy = "enemy",
  Neutral = "neutral",
}

/** Internal record for a rendered unit. */
interface UnitEntry {
  mesh: Mesh;
  material: StandardMaterial;
  team: UnitTeam;
  q: number;
  r: number;
  spriteState: SpriteState;
  currentTexture: Texture;
}

/** Health bar meshes for a single unit. */
interface HealthBarEntry {
  bg: Mesh;
  fill: Mesh;
  fillMat: StandardMaterial;
  pct: number;
}

const SELECTION_COLOR = Color3.FromHexString("#ffcc00"); // yellow

/** Height above tile surface for unit sprites. */
const UNIT_Y = 0.5;
/** Height for selection ring. Between tile and unit sprite. */
const RING_Y = 0.35;
/** Health bar height. Above unit sprite. */
const HP_BAR_Y = 0.7;

/**
 * Renders units as animated sprite planes on the hex grid.
 *
 * Each unit is a flat plane with a sprite strip texture, positioned above
 * the hex tiles. Player units use Soldier sprites, enemy units use Orc sprites.
 * Frame animation is driven per-frame by SpriteAnimator.
 */
export class UnitRenderer {
  private scene: Scene;
  private layout: HexLayout;
  private grid: HexGrid | null = null;
  private units = new Map<string, UnitEntry>();
  private selectionRing: Mesh | null = null;
  private selectionMaterial: StandardMaterial | null = null;
  private selectedEntityId: string | null = null;

  private healthBars = new Map<string, HealthBarEntry>();
  private hpBgMat: StandardMaterial | null = null;

  private spriteAnimator: SpriteAnimator;
  private lastTickTime = 0;

  constructor(scene: Scene, layout: HexLayout) {
    this.scene = scene;
    this.layout = layout;
    this.spriteAnimator = new SpriteAnimator(scene);

    // Drive sprite animation each frame
    this.lastTickTime = performance.now();
    scene.registerBeforeRender(() => {
      const now = performance.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.tickAllSprites(delta);
    });
  }

  /** Set the grid reference for elevation lookups. */
  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  /** Get the Y position for a hex tile's elevation. */
  private getElevationY(q: number, r: number): number {
    if (!this.grid) return 0;
    const tile = this.grid.get(q, r);
    return (tile?.elevation ?? 0) * LAYER_HEIGHT;
  }

  addUnit(entityId: string, q: number, r: number, team: UnitTeam, charType?: SpriteCharType): void {
    if (this.units.has(entityId)) {
      this.removeUnit(entityId);
    }

    const { x, y } = hexToPixel(this.layout, q, r);
    const elevY = this.getElevationY(q, r);
    const resolvedCharType: SpriteCharType = charType ?? (team === UnitTeam.Enemy ? "orc" : "soldier");

    // Create a plane mesh for the sprite
    const spriteSize = this.layout.size * 12;
    const mesh = MeshBuilder.CreatePlane(
      `unit_${entityId}`,
      { width: spriteSize, height: spriteSize },
      this.scene
    );
    // Lay flat on XZ plane, facing upward
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.x = x;
    mesh.position.y = UNIT_Y + elevY;
    mesh.position.z = y;
    mesh.isPickable = false;
    mesh.renderingGroupId = 2; // render above overlays

    // Create material with sprite texture
    const mat = new StandardMaterial(`unitMat_${entityId}`, this.scene);
    mat.specularColor = Color3.Black();
    mat.emissiveColor = new Color3(0.6, 0.6, 0.6); // brighten sprite
    mat.backFaceCulling = false;
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = 2; // MATERIAL_ALPHABLEND

    // Initial idle texture
    const spriteState = this.spriteAnimator.createState(resolvedCharType);
    const texture = this.spriteAnimator.cloneTexture(resolvedCharType, "idle");
    mat.diffuseTexture = texture;

    mesh.material = mat;

    this.units.set(entityId, { mesh, material: mat, team, q, r, spriteState, currentTexture: texture });
  }

  removeUnit(entityId: string): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    if (this.selectedEntityId === entityId) {
      this.setSelected(null);
    }

    entry.currentTexture.dispose();
    entry.material.dispose();
    entry.mesh.dispose();
    this.units.delete(entityId);

    this.removeHealthBar(entityId);
  }

  updatePosition(entityId: string, q: number, r: number): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    const { x, y } = hexToPixel(this.layout, q, r);
    const elevY = this.getElevationY(q, r);
    entry.mesh.position.x = x;
    entry.mesh.position.y = UNIT_Y + elevY;
    entry.mesh.position.z = y;
    entry.q = q;
    entry.r = r;

    if (this.selectedEntityId === entityId && this.selectionRing) {
      this.selectionRing.position.x = x;
      this.selectionRing.position.y = RING_Y + elevY;
      this.selectionRing.position.z = y;
    }

    this.moveHealthBar(entityId, x, y, elevY);
  }

  setSelected(entityId: string | null): void {
    if (this.selectionRing) {
      this.selectionRing.dispose();
      this.selectionRing = null;
    }

    this.selectedEntityId = entityId;

    if (entityId === null) return;

    const entry = this.units.get(entityId);
    if (!entry) return;

    const { x, y } = hexToPixel(this.layout, entry.q, entry.r);
    const elevY = this.getElevationY(entry.q, entry.r);

    if (!this.selectionMaterial) {
      this.selectionMaterial = new StandardMaterial("selectionMat", this.scene);
      this.selectionMaterial.diffuseColor = Color3.Black();
      this.selectionMaterial.emissiveColor = SELECTION_COLOR;
      this.selectionMaterial.alpha = 0.45;
      this.selectionMaterial.specularColor = Color3.Black();
      this.selectionMaterial.backFaceCulling = false;
    }

    const ring = MeshBuilder.CreateDisc(
      "selectionRing",
      { radius: this.layout.size * 0.9, tessellation: 6 },
      this.scene,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.y = Math.PI / 6;
    ring.position.x = x;
    ring.position.y = RING_Y + elevY;
    ring.position.z = y;
    ring.material = this.selectionMaterial;
    ring.renderingGroupId = 1;

    this.selectionRing = ring;
  }

  getSelected(): string | null {
    return this.selectedEntityId;
  }

  // ── Sprite Animation ──

  /** Set the sprite animation for a unit. */
  setAnimation(
    entityId: string,
    anim: SpriteAnim,
    loop = true,
    onComplete?: () => void
  ): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    if (entry.spriteState.currentAnim === anim) return;

    // Dispose old texture clone, get new one
    entry.currentTexture.dispose();
    const newTex = this.spriteAnimator.setAnimation(
      entry.spriteState,
      anim,
      loop,
      onComplete
    );
    entry.currentTexture = newTex;
    entry.material.diffuseTexture = newTex;
  }

  /** Tick all sprite animations each frame. */
  private tickAllSprites(deltaMs: number): void {
    for (const [, entry] of this.units) {
      this.spriteAnimator.tick(entry.spriteState, entry.currentTexture, deltaMs);
    }
  }

  // ── Movement/Attack Animations ──

  /**
   * Animate a unit moving hex-by-hex along a path.
   * Switches to "walk" animation during movement, back to "idle" on complete.
   */
  animateMove(
    entityId: string,
    path: Array<{ q: number; r: number }>,
    durationPerStep: number,
    onComplete: () => void
  ): void {
    const entry = this.units.get(entityId);
    if (!entry || path.length === 0) { onComplete(); return; }

    this.setAnimation(entityId, "walk");

    const positions = path.map(p => {
      const px = hexToPixel(this.layout, p.q, p.r);
      const elevY = this.getElevationY(p.q, p.r);
      return { x: px.x, z: px.y, y: UNIT_Y + elevY, elevY };
    });
    let stepIdx = 0;
    let fromX = entry.mesh.position.x;
    let fromZ = entry.mesh.position.z;
    let fromY = entry.mesh.position.y;
    let stepStart = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - stepStart) / durationPerStep);
      const target = positions[stepIdx]!;

      entry.mesh.position.x = fromX + (target.x - fromX) * t;
      entry.mesh.position.z = fromZ + (target.z - fromZ) * t;
      entry.mesh.position.y = fromY + (target.y - fromY) * t;

      if (t >= 1) {
        const dest = path[stepIdx]!;
        entry.q = dest.q;
        entry.r = dest.r;

        if (this.selectedEntityId === entityId && this.selectionRing) {
          this.selectionRing.position.x = target.x;
          this.selectionRing.position.y = RING_Y + target.elevY;
          this.selectionRing.position.z = target.z;
        }
        this.moveHealthBar(entityId, target.x, target.z, target.elevY);

        stepIdx++;
        if (stepIdx >= positions.length) {
          this.scene.onBeforeRenderObservable.remove(observer);
          this.setAnimation(entityId, "idle");
          onComplete();
        } else {
          fromX = target.x;
          fromZ = target.z;
          fromY = target.y;
          stepStart = performance.now();
        }
      }
    });
  }

  /**
   * Animate a unit lunging toward a target and snapping back (attack).
   * Plays "attack" animation during the lunge.
   */
  animateLunge(
    entityId: string,
    targetWorldX: number,
    targetWorldZ: number,
    duration: number,
    onComplete: () => void
  ): void {
    const entry = this.units.get(entityId);
    if (!entry) { onComplete(); return; }

    // Scale frame time so the full animation fits within `duration`.
    const attackFrames = this.spriteAnimator.getFrameCount(entry.spriteState.charType, "attack");
    const baseAnimMs = attackFrames * this.spriteAnimator.frameMs;
    const animDuration = Math.max(duration, baseAnimMs);

    // Physical lunge occupies the middle portion of the animation
    const lungeStart = animDuration * 0.2;
    const lungeEnd = animDuration * 0.5;
    const lungeDur = lungeEnd - lungeStart;

    const startX = entry.mesh.position.x;
    const startZ = entry.mesh.position.z;
    const midX = (startX + targetWorldX) / 2;
    const midZ = (startZ + targetWorldZ) / 2;
    const startTime = performance.now();

    let animDone = false;
    let lungeDone = false;

    // Play attack animation non-looping; fires when all frames complete
    this.setAnimation(entityId, "attack", false, () => {
      animDone = true;
      if (lungeDone) {
        this.setAnimation(entityId, "idle");
        onComplete();
      }
    });

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;

      // Physical lunge: forward then back
      if (elapsed < lungeStart) {
        // Before lunge — stay at start
      } else if (elapsed < lungeStart + lungeDur / 2) {
        // Lunge forward
        const t = (elapsed - lungeStart) / (lungeDur / 2);
        entry.mesh.position.x = startX + (midX - startX) * t;
        entry.mesh.position.z = startZ + (midZ - startZ) * t;
      } else if (elapsed < lungeEnd) {
        // Lunge back
        const t = (elapsed - lungeStart - lungeDur / 2) / (lungeDur / 2);
        entry.mesh.position.x = midX + (startX - midX) * t;
        entry.mesh.position.z = midZ + (startZ - midZ) * t;
      } else if (!lungeDone) {
        // Snap to start, lunge movement complete
        entry.mesh.position.x = startX;
        entry.mesh.position.z = startZ;
        lungeDone = true;
        this.scene.onBeforeRenderObservable.remove(observer);
        if (animDone) {
          this.setAnimation(entityId, "idle");
          onComplete();
        }
      }
    });
  }

  /** Play hurt animation on a unit (non-blocking). */
  playHurt(entityId: string): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    this.setAnimation(entityId, "hurt", false, () => {
      // Return to idle after hurt plays
      if (this.units.has(entityId)) {
        this.setAnimation(entityId, "idle");
      }
    });
  }

  /** Play death animation on a unit. Calls onComplete when done. */
  playDeath(entityId: string, onComplete?: () => void): void {
    this.setAnimation(entityId, "death", false, onComplete);
  }

  // ── Health bars ──

  updateHealthBar(entityId: string, current: number, max: number): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    if (current >= max) {
      this.removeHealthBar(entityId);
      return;
    }

    const { x, y } = hexToPixel(this.layout, entry.q, entry.r);
    const elevY = this.getElevationY(entry.q, entry.r);
    const barWidth = this.layout.size * 0.7;
    const barHeight = this.layout.size * 0.08;
    const barZ = y + this.layout.size * 0.55;
    const pct = Math.max(0.01, current / max);

    let bar = this.healthBars.get(entityId);
    if (!bar) {
      if (!this.hpBgMat) {
        this.hpBgMat = new StandardMaterial("hpBgMat", this.scene);
        this.hpBgMat.diffuseColor = Color3.Black();
        this.hpBgMat.emissiveColor = new Color3(0.2, 0.05, 0.05);
        this.hpBgMat.specularColor = Color3.Black();
        this.hpBgMat.backFaceCulling = false;
      }

      const bg = MeshBuilder.CreatePlane(
        "hpBg_" + entityId,
        { width: barWidth, height: barHeight },
        this.scene
      );
      bg.rotation.x = -Math.PI / 2;
      bg.renderingGroupId = 2;
      bg.material = this.hpBgMat;

      const fillMat = new StandardMaterial("hpFillMat_" + entityId, this.scene);
      fillMat.diffuseColor = Color3.Black();
      fillMat.specularColor = Color3.Black();
      fillMat.backFaceCulling = false;

      const fill = MeshBuilder.CreatePlane(
        "hpFill_" + entityId,
        { width: barWidth, height: barHeight },
        this.scene
      );
      fill.rotation.x = -Math.PI / 2;
      fill.renderingGroupId = 2;
      fill.material = fillMat;

      bar = { bg, fill, fillMat, pct };
      this.healthBars.set(entityId, bar);
    }

    bar.pct = pct;

    bar.bg.position.x = x;
    bar.bg.position.y = HP_BAR_Y + elevY;
    bar.bg.position.z = barZ;

    bar.fill.scaling.x = pct;
    bar.fill.position.x = x - barWidth * (1 - pct) / 2;
    bar.fill.position.y = HP_BAR_Y + 0.01 + elevY;
    bar.fill.position.z = barZ;

    if (pct > 0.5) {
      bar.fillMat.emissiveColor = new Color3(0.2, 0.8, 0.2);
    } else if (pct > 0.25) {
      bar.fillMat.emissiveColor = new Color3(0.8, 0.8, 0.2);
    } else {
      bar.fillMat.emissiveColor = new Color3(0.8, 0.2, 0.2);
    }
  }

  private removeHealthBar(entityId: string): void {
    const bar = this.healthBars.get(entityId);
    if (!bar) return;
    bar.bg.dispose();
    bar.fill.dispose();
    bar.fillMat.dispose();
    this.healthBars.delete(entityId);
  }

  private moveHealthBar(entityId: string, worldX: number, worldZ: number, elevY = 0): void {
    const bar = this.healthBars.get(entityId);
    if (!bar) return;
    const barWidth = this.layout.size * 0.7;
    const barZ = worldZ + this.layout.size * 0.55;

    bar.bg.position.x = worldX;
    bar.bg.position.y = HP_BAR_Y + elevY;
    bar.bg.position.z = barZ;

    bar.fill.position.x = worldX - barWidth * (1 - bar.pct) / 2;
    bar.fill.position.y = HP_BAR_Y + 0.01 + elevY;
    bar.fill.position.z = barZ;
  }

  // ── Cleanup ──

  clear(): void {
    this.setSelected(null);

    for (const [, entry] of this.units) {
      entry.currentTexture.dispose();
      entry.material.dispose();
      entry.mesh.dispose();
    }
    this.units.clear();

    for (const [, bar] of this.healthBars) {
      bar.bg.dispose();
      bar.fill.dispose();
      bar.fillMat.dispose();
    }
    this.healthBars.clear();

    if (this.selectionMaterial) {
      this.selectionMaterial.dispose();
      this.selectionMaterial = null;
    }

    if (this.hpBgMat) {
      this.hpBgMat.dispose();
      this.hpBgMat = null;
    }
  }

  dispose(): void {
    this.clear();
    this.spriteAnimator.dispose();
  }
}
