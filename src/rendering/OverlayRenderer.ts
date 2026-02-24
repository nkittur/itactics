import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HexLayout, hexToPixel } from "@hex/HexLayout";
import type { HexGrid } from "@hex/HexGrid";
import { LAYER_HEIGHT } from "@rendering/TileRenderer";

/**
 * Renders semi-transparent hex overlays for movement range and attack range.
 *
 * Movement overlays are blue, attack overlays are red. Each overlay is a
 * flat disc slightly above the terrain tiles. Overlays are cleared when
 * the game state changes (e.g., unit deselected, action confirmed).
 */
export class OverlayRenderer {
  private scene: Scene;
  private grid: HexGrid | null = null;
  private overlays: Mesh[] = [];
  private movementMaterial: StandardMaterial | null = null;
  private attackMaterial: StandardMaterial | null = null;
  private zocDangerMaterial: StandardMaterial | null = null;
  private selfTargetMaterial: StandardMaterial | null = null;
  private targetRingMaterial: StandardMaterial | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** Set the grid reference so overlays can sit on correct tile elevation. */
  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  /** Get the Y position for an overlay on a given hex, sitting on the tile surface. */
  private overlayY(q: number, r: number, yOffset: number): number {
    const tile = this.grid?.get(q, r);
    const elevation = tile?.elevation ?? 0;
    return elevation * LAYER_HEIGHT + yOffset;
  }

  /**
   * Display movement range overlays on reachable hexes.
   */
  showMovementRange(reachableHexes: Map<string, number>, layout: HexLayout): void {
    if (!this.movementMaterial) {
      this.movementMaterial = new StandardMaterial("movementOverlayMat", this.scene);
      this.movementMaterial.diffuseColor = Color3.Black();
      this.movementMaterial.emissiveColor = new Color3(0.2, 0.4, 0.9);
      this.movementMaterial.alpha = 0.4;
      this.movementMaterial.specularColor = Color3.Black();
      this.movementMaterial.backFaceCulling = false;
    }

    for (const [key] of reachableHexes) {
      const coords = parseHexKey(key);
      if (!coords) continue;

      const { x, y } = hexToPixel(layout, coords.q, coords.r);

      const disc = MeshBuilder.CreateDisc(
        `moveOverlay_${key}`,
        { radius: layout.size * 0.9, tessellation: 6 },
        this.scene
      );
      disc.rotation.x = -Math.PI / 2;
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = this.overlayY(coords.q, coords.r, 0.02);
      disc.position.z = y;
      disc.renderingGroupId = 1;
      disc.material = this.movementMaterial;

      this.overlays.push(disc);
    }
  }

  /**
   * Display attack range overlays on targetable hexes.
   */
  showAttackRange(hexes: Set<string>, layout: HexLayout): void {
    if (!this.attackMaterial) {
      this.attackMaterial = new StandardMaterial("attackOverlayMat", this.scene);
      this.attackMaterial.diffuseColor = Color3.Black();
      this.attackMaterial.emissiveColor = new Color3(0.9, 0.2, 0.2);
      this.attackMaterial.alpha = 0.4;
      this.attackMaterial.specularColor = Color3.Black();
      this.attackMaterial.backFaceCulling = false;
    }

    for (const key of hexes) {
      const coords = parseHexKey(key);
      if (!coords) continue;

      const { x, y } = hexToPixel(layout, coords.q, coords.r);

      const disc = MeshBuilder.CreateDisc(
        `attackOverlay_${key}`,
        { radius: layout.size * 0.9, tessellation: 6 },
        this.scene
      );
      disc.rotation.x = -Math.PI / 2;
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = this.overlayY(coords.q, coords.r, 0.03);
      disc.position.z = y;
      disc.renderingGroupId = 1;
      disc.material = this.attackMaterial;

      this.overlays.push(disc);
    }
  }

  /**
   * Display ZoC danger overlays on hexes where moving would trigger free attacks.
   */
  showZoCDanger(hexes: Set<string>, layout: HexLayout): void {
    if (hexes.size === 0) return;

    if (!this.zocDangerMaterial) {
      this.zocDangerMaterial = new StandardMaterial("zocDangerMat", this.scene);
      this.zocDangerMaterial.diffuseColor = Color3.Black();
      this.zocDangerMaterial.emissiveColor = new Color3(0.9, 0.5, 0.1);
      this.zocDangerMaterial.alpha = 0.45;
      this.zocDangerMaterial.specularColor = Color3.Black();
      this.zocDangerMaterial.backFaceCulling = false;
    }

    for (const key of hexes) {
      const coords = parseHexKey(key);
      if (!coords) continue;

      const { x, y } = hexToPixel(layout, coords.q, coords.r);

      const disc = MeshBuilder.CreateDisc(
        `zocOverlay_${key}`,
        { radius: layout.size * 0.9, tessellation: 6 },
        this.scene
      );
      disc.rotation.x = -Math.PI / 2;
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = this.overlayY(coords.q, coords.r, 0.04);
      disc.position.z = y;
      disc.renderingGroupId = 1;
      disc.material = this.zocDangerMaterial;

      this.overlays.push(disc);
    }
  }

  /**
   * Display gold disc overlay at renderingGroupId 3 (above unit sprites).
   * Used for self-targeting skill hexes so the overlay is visible on top of the unit.
   */
  showSelfTargetRange(hexes: Set<string>, layout: HexLayout): void {
    if (!this.selfTargetMaterial) {
      this.selfTargetMaterial = new StandardMaterial("selfTargetMat", this.scene);
      this.selfTargetMaterial.diffuseColor = Color3.Black();
      this.selfTargetMaterial.emissiveColor = new Color3(0.9, 0.75, 0.2);
      this.selfTargetMaterial.alpha = 0.45;
      this.selfTargetMaterial.specularColor = Color3.Black();
      this.selfTargetMaterial.backFaceCulling = false;
    }

    for (const key of hexes) {
      const coords = parseHexKey(key);
      if (!coords) continue;

      const { x, y } = hexToPixel(layout, coords.q, coords.r);

      const disc = MeshBuilder.CreateDisc(
        `selfOverlay_${key}`,
        { radius: layout.size * 0.9, tessellation: 6 },
        this.scene
      );
      disc.rotation.x = -Math.PI / 2;
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = this.overlayY(coords.q, coords.r, 0.05);
      disc.position.z = y;
      disc.renderingGroupId = 3;
      disc.material = this.selfTargetMaterial;

      this.overlays.push(disc);
    }
  }

  /**
   * Display thick gold ring outlines on skill target hexes.
   * Renders at renderingGroupId 3 (above unit sprites).
   */
  showTargetRings(hexes: Set<string>, layout: HexLayout): void {
    if (!this.targetRingMaterial) {
      this.targetRingMaterial = new StandardMaterial("targetRingMat", this.scene);
      this.targetRingMaterial.diffuseColor = Color3.Black();
      this.targetRingMaterial.emissiveColor = new Color3(1.0, 0.85, 0.2);
      this.targetRingMaterial.alpha = 0.9;
      this.targetRingMaterial.specularColor = Color3.Black();
      this.targetRingMaterial.backFaceCulling = false;
    }

    for (const key of hexes) {
      const coords = parseHexKey(key);
      if (!coords) continue;

      const { x, y } = hexToPixel(layout, coords.q, coords.r);

      const ring = MeshBuilder.CreateTorus(
        `targetRing_${key}`,
        { diameter: layout.size * 1.75, thickness: 0.18, tessellation: 32 },
        this.scene
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.x = x;
      ring.position.y = this.overlayY(coords.q, coords.r, 0.06);
      ring.position.z = y;
      ring.renderingGroupId = 3;
      ring.material = this.targetRingMaterial;

      this.overlays.push(ring);
    }
  }

  /**
   * Remove all overlay meshes from the scene.
   */
  clearOverlays(): void {
    for (const mesh of this.overlays) {
      mesh.dispose();
    }
    this.overlays = [];
  }

  /**
   * Dispose of all resources including shared materials.
   */
  dispose(): void {
    this.clearOverlays();

    if (this.movementMaterial) {
      this.movementMaterial.dispose();
      this.movementMaterial = null;
    }
    if (this.attackMaterial) {
      this.attackMaterial.dispose();
      this.attackMaterial = null;
    }
    if (this.zocDangerMaterial) {
      this.zocDangerMaterial.dispose();
      this.zocDangerMaterial = null;
    }
    if (this.selfTargetMaterial) {
      this.selfTargetMaterial.dispose();
      this.selfTargetMaterial = null;
    }
    if (this.targetRingMaterial) {
      this.targetRingMaterial.dispose();
      this.targetRingMaterial = null;
    }
  }
}

/**
 * Parse a hex key string "q,r" into numeric coordinates.
 * Returns null if the key is malformed.
 */
function parseHexKey(key: string): { q: number; r: number } | null {
  const parts = key.split(",");
  if (parts.length !== 2) return null;
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  if (Number.isNaN(q) || Number.isNaN(r)) return null;
  return { q, r };
}
