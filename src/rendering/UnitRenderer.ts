import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HexLayout, hexToPixel } from "@hex/HexLayout";

/** Which team a unit belongs to, determines its base color. */
export enum UnitTeam {
  Player = "player",
  Enemy = "enemy",
  Neutral = "neutral",
}

/** Internal record for a rendered unit. */
interface UnitEntry {
  mesh: Mesh;
  team: UnitTeam;
  q: number;
  r: number;
}

/** Health bar meshes for a single unit. */
interface HealthBarEntry {
  bg: Mesh;
  fill: Mesh;
  fillMat: StandardMaterial;
  pct: number;
}

/** Team to base color mapping. */
const TEAM_COLORS: Record<UnitTeam, Color3> = {
  [UnitTeam.Player]: Color3.FromHexString("#4477cc"),  // blue
  [UnitTeam.Enemy]: Color3.FromHexString("#cc4444"),    // red
  [UnitTeam.Neutral]: Color3.FromHexString("#88aa44"),  // olive green
};

const SELECTION_COLOR = Color3.FromHexString("#ffcc00"); // yellow

/**
 * Renders units as colored disc meshes on the hex grid.
 *
 * Each unit is a simple flat disc positioned slightly above the hex tile
 * (y=0.1). Player units are blue, enemy units are red. When a unit is
 * selected, a yellow selection ring is displayed around it.
 *
 * Damaged units show a health bar above their disc.
 */
export class UnitRenderer {
  private scene: Scene;
  private layout: HexLayout;
  private units = new Map<string, UnitEntry>();
  private selectionRing: Mesh | null = null;
  private selectionMaterial: StandardMaterial | null = null;
  private selectedEntityId: string | null = null;

  private healthBars = new Map<string, HealthBarEntry>();
  private hpBgMat: StandardMaterial | null = null;

  constructor(scene: Scene, layout: HexLayout) {
    this.scene = scene;
    this.layout = layout;
  }

  addUnit(entityId: string, q: number, r: number, team: UnitTeam): void {
    if (this.units.has(entityId)) {
      this.removeUnit(entityId);
    }

    const { x, y } = hexToPixel(this.layout, q, r);

    const mesh = MeshBuilder.CreateDisc(
      `unit_${entityId}`,
      { radius: this.layout.size * 0.4, tessellation: 16 },
      this.scene
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.x = x;
    mesh.position.y = 0.1;
    mesh.position.z = y;

    const mat = new StandardMaterial(`unitMat_${entityId}`, this.scene);
    mat.diffuseColor = Color3.Black();
    mat.emissiveColor = TEAM_COLORS[team];
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mesh.material = mat;

    this.units.set(entityId, { mesh, team, q, r });
  }

  removeUnit(entityId: string): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    if (this.selectedEntityId === entityId) {
      this.setSelected(null);
    }

    entry.mesh.material?.dispose();
    entry.mesh.dispose();
    this.units.delete(entityId);

    this.removeHealthBar(entityId);
  }

  updatePosition(entityId: string, q: number, r: number): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    const { x, y } = hexToPixel(this.layout, q, r);
    entry.mesh.position.x = x;
    entry.mesh.position.z = y;
    entry.q = q;
    entry.r = r;

    if (this.selectedEntityId === entityId && this.selectionRing) {
      this.selectionRing.position.x = x;
      this.selectionRing.position.z = y;
    }

    this.moveHealthBar(entityId, x, y);
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

    const ring = MeshBuilder.CreateTorus(
      "selectionRing",
      {
        diameter: this.layout.size * 1.0,
        thickness: this.layout.size * 0.08,
        tessellation: 24,
      },
      this.scene
    );
    ring.position.x = x;
    ring.position.y = 0.15;
    ring.position.z = y;

    if (!this.selectionMaterial) {
      this.selectionMaterial = new StandardMaterial("selectionMat", this.scene);
      this.selectionMaterial.diffuseColor = Color3.Black();
      this.selectionMaterial.emissiveColor = SELECTION_COLOR;
      this.selectionMaterial.specularColor = Color3.Black();
      this.selectionMaterial.backFaceCulling = false;
    }
    ring.material = this.selectionMaterial;

    this.selectionRing = ring;
  }

  getSelected(): string | null {
    return this.selectedEntityId;
  }

  // ── Animations ──

  /**
   * Animate a unit moving hex-by-hex along a path.
   * @param durationPerStep  Milliseconds per hex step.
   * @param onComplete       Called when the full animation finishes.
   */
  animateMove(
    entityId: string,
    path: Array<{ q: number; r: number }>,
    durationPerStep: number,
    onComplete: () => void
  ): void {
    const entry = this.units.get(entityId);
    if (!entry || path.length === 0) { onComplete(); return; }

    const positions = path.map(p => hexToPixel(this.layout, p.q, p.r));
    let stepIdx = 0;
    let fromX = entry.mesh.position.x;
    let fromZ = entry.mesh.position.z;
    let stepStart = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - stepStart) / durationPerStep);
      const target = positions[stepIdx]!;

      entry.mesh.position.x = fromX + (target.x - fromX) * t;
      entry.mesh.position.z = fromZ + (target.y - fromZ) * t;

      if (t >= 1) {
        // Update stored hex coords
        const dest = path[stepIdx]!;
        entry.q = dest.q;
        entry.r = dest.r;

        // Move selection ring + health bar
        if (this.selectedEntityId === entityId && this.selectionRing) {
          this.selectionRing.position.x = target.x;
          this.selectionRing.position.z = target.y;
        }
        this.moveHealthBar(entityId, target.x, target.y);

        stepIdx++;
        if (stepIdx >= positions.length) {
          this.scene.onBeforeRenderObservable.remove(observer);
          onComplete();
        } else {
          fromX = target.x;
          fromZ = target.y;
          stepStart = performance.now();
        }
      }
    });
  }

  /**
   * Animate a unit lunging toward a target and snapping back (attack).
   * @param targetWorldX/Z  World position to lunge toward.
   * @param duration         Total lunge duration in ms.
   * @param onComplete       Called when animation finishes.
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

    const startX = entry.mesh.position.x;
    const startZ = entry.mesh.position.z;
    // Lunge halfway to target
    const midX = (startX + targetWorldX) / 2;
    const midZ = (startZ + targetWorldZ) / 2;
    const halfDur = duration / 2;
    const startTime = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;

      if (elapsed < halfDur) {
        // Moving toward target
        const t = elapsed / halfDur;
        entry.mesh.position.x = startX + (midX - startX) * t;
        entry.mesh.position.z = startZ + (midZ - startZ) * t;
      } else {
        // Returning to start
        const t = Math.min(1, (elapsed - halfDur) / halfDur);
        entry.mesh.position.x = midX + (startX - midX) * t;
        entry.mesh.position.z = midZ + (startZ - midZ) * t;
      }

      if (elapsed >= duration) {
        entry.mesh.position.x = startX;
        entry.mesh.position.z = startZ;
        this.scene.onBeforeRenderObservable.remove(observer);
        onComplete();
      }
    });
  }

  // ── Health bars ──

  /**
   * Show or update a health bar above a unit. Hides bar at full health.
   */
  updateHealthBar(entityId: string, current: number, max: number): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    if (current >= max) {
      this.removeHealthBar(entityId);
      return;
    }

    const { x, y } = hexToPixel(this.layout, entry.q, entry.r);
    const barWidth = this.layout.size * 0.7;
    const barHeight = this.layout.size * 0.08;
    const barZ = y + this.layout.size * 0.55;
    const barY = 0.2;
    const pct = Math.max(0.01, current / max);

    let bar = this.healthBars.get(entityId);
    if (!bar) {
      // Lazy-create shared background material
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
      fill.material = fillMat;

      bar = { bg, fill, fillMat, pct };
      this.healthBars.set(entityId, bar);
    }

    bar.pct = pct;

    // Position background (centered on unit X)
    bar.bg.position.x = x;
    bar.bg.position.y = barY;
    bar.bg.position.z = barZ;

    // Scale fill and left-align
    bar.fill.scaling.x = pct;
    bar.fill.position.x = x - barWidth * (1 - pct) / 2;
    bar.fill.position.y = barY + 0.01;
    bar.fill.position.z = barZ;

    // Color by health percentage
    if (pct > 0.5) {
      bar.fillMat.emissiveColor = new Color3(0.2, 0.8, 0.2);   // green
    } else if (pct > 0.25) {
      bar.fillMat.emissiveColor = new Color3(0.8, 0.8, 0.2);   // yellow
    } else {
      bar.fillMat.emissiveColor = new Color3(0.8, 0.2, 0.2);   // red
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

  private moveHealthBar(entityId: string, worldX: number, worldZ: number): void {
    const bar = this.healthBars.get(entityId);
    if (!bar) return;
    const barWidth = this.layout.size * 0.7;
    const barZ = worldZ + this.layout.size * 0.55;

    bar.bg.position.x = worldX;
    bar.bg.position.z = barZ;

    bar.fill.position.x = worldX - barWidth * (1 - bar.pct) / 2;
    bar.fill.position.z = barZ;
  }

  // ── Cleanup ──

  clear(): void {
    this.setSelected(null);

    for (const [id] of this.units) {
      const entry = this.units.get(id);
      if (entry) {
        entry.mesh.material?.dispose();
        entry.mesh.dispose();
      }
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
  }
}
