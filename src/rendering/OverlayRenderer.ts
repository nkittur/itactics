import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HexLayout, hexToPixel } from "@hex/HexLayout";

/**
 * Renders semi-transparent hex overlays for movement range and attack range.
 *
 * Movement overlays are blue, attack overlays are red. Each overlay is a
 * flat disc slightly above the terrain tiles. Overlays are cleared when
 * the game state changes (e.g., unit deselected, action confirmed).
 */
export class OverlayRenderer {
  private scene: Scene;
  private overlays: Mesh[] = [];
  private movementMaterial: StandardMaterial | null = null;
  private attackMaterial: StandardMaterial | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Display movement range overlays on reachable hexes.
   *
   * @param reachableHexes - Map of hex keys ("q,r") to remaining movement points.
   *   All keys in the map receive an overlay.
   * @param layout - The hex layout for coordinate conversion.
   */
  showMovementRange(reachableHexes: Map<string, number>, layout: HexLayout): void {
    // Ensure movement material exists
    if (!this.movementMaterial) {
      this.movementMaterial = new StandardMaterial("movementOverlayMat", this.scene);
      this.movementMaterial.diffuseColor = Color3.Black();
      this.movementMaterial.emissiveColor = new Color3(0.2, 0.4, 0.9); // blue
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
      // Lay flat on XZ plane
      disc.rotation.x = -Math.PI / 2;
      // Flat-top hex orientation
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = 0.25; // above all tile elevations
      disc.position.z = y;
      disc.material = this.movementMaterial;

      this.overlays.push(disc);
    }
  }

  /**
   * Display attack range overlays on targetable hexes.
   *
   * @param hexes - Set of hex keys ("q,r") that are within attack range.
   * @param layout - The hex layout for coordinate conversion.
   */
  showAttackRange(hexes: Set<string>, layout: HexLayout): void {
    // Ensure attack material exists
    if (!this.attackMaterial) {
      this.attackMaterial = new StandardMaterial("attackOverlayMat", this.scene);
      this.attackMaterial.diffuseColor = Color3.Black();
      this.attackMaterial.emissiveColor = new Color3(0.9, 0.2, 0.2); // red
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
      // Lay flat on XZ plane
      disc.rotation.x = -Math.PI / 2;
      // Flat-top hex orientation
      disc.rotation.y = Math.PI / 6;
      disc.position.x = x;
      disc.position.y = 0.26; // slightly above movement overlays
      disc.position.z = y;
      disc.material = this.attackMaterial;

      this.overlays.push(disc);
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
