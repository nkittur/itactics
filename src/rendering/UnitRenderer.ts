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
 * This is a placeholder renderer -- real sprites will replace these discs
 * once the SpriteManager is implemented.
 */
export class UnitRenderer {
  private scene: Scene;
  private layout: HexLayout;
  private units = new Map<string, UnitEntry>();
  private selectionRing: Mesh | null = null;
  private selectionMaterial: StandardMaterial | null = null;
  private selectedEntityId: string | null = null;

  constructor(scene: Scene, layout: HexLayout) {
    this.scene = scene;
    this.layout = layout;
  }

  /**
   * Add a unit disc to the scene at the given hex position.
   *
   * @param entityId - Unique entity identifier.
   * @param q - Axial q coordinate.
   * @param r - Axial r coordinate.
   * @param team - Which team the unit belongs to.
   */
  addUnit(entityId: string, q: number, r: number, team: UnitTeam): void {
    // Remove existing if present (idempotent)
    if (this.units.has(entityId)) {
      this.removeUnit(entityId);
    }

    const { x, y } = hexToPixel(this.layout, q, r);

    // Create a disc mesh for the unit
    const mesh = MeshBuilder.CreateDisc(
      `unit_${entityId}`,
      { radius: this.layout.size * 0.4, tessellation: 16 },
      this.scene
    );
    // Lay flat on XZ plane
    mesh.rotation.x = -Math.PI / 2;
    // Position slightly above hex tiles
    mesh.position.x = x;
    mesh.position.y = 0.1;
    mesh.position.z = y;

    // Material colored by team
    const mat = new StandardMaterial(`unitMat_${entityId}`, this.scene);
    mat.diffuseColor = TEAM_COLORS[team];
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mesh.material = mat;

    this.units.set(entityId, { mesh, team, q, r });
  }

  /**
   * Remove a unit from the scene.
   */
  removeUnit(entityId: string): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    // Clear selection if this unit was selected
    if (this.selectedEntityId === entityId) {
      this.setSelected(null);
    }

    entry.mesh.material?.dispose();
    entry.mesh.dispose();
    this.units.delete(entityId);
  }

  /**
   * Move a unit's visual representation to a new hex position.
   */
  updatePosition(entityId: string, q: number, r: number): void {
    const entry = this.units.get(entityId);
    if (!entry) return;

    const { x, y } = hexToPixel(this.layout, q, r);
    entry.mesh.position.x = x;
    entry.mesh.position.z = y;
    entry.q = q;
    entry.r = r;

    // Move selection ring if this unit is selected
    if (this.selectedEntityId === entityId && this.selectionRing) {
      this.selectionRing.position.x = x;
      this.selectionRing.position.z = y;
    }
  }

  /**
   * Set the currently selected unit. Pass null to deselect.
   * A yellow ring is drawn around the selected unit.
   */
  setSelected(entityId: string | null): void {
    // Remove existing selection ring
    if (this.selectionRing) {
      this.selectionRing.dispose();
      this.selectionRing = null;
    }

    this.selectedEntityId = entityId;

    if (entityId === null) return;

    const entry = this.units.get(entityId);
    if (!entry) return;

    const { x, y } = hexToPixel(this.layout, entry.q, entry.r);

    // Create a torus (ring) around the selected unit
    const ring = MeshBuilder.CreateTorus(
      "selectionRing",
      {
        diameter: this.layout.size * 1.0,
        thickness: this.layout.size * 0.08,
        tessellation: 24,
      },
      this.scene
    );
    // Lay flat on XZ plane
    ring.rotation.x = Math.PI / 2;
    ring.position.x = x;
    ring.position.y = 0.15; // above unit disc
    ring.position.z = y;

    // Yellow selection material
    if (!this.selectionMaterial) {
      this.selectionMaterial = new StandardMaterial("selectionMat", this.scene);
      this.selectionMaterial.diffuseColor = SELECTION_COLOR;
      this.selectionMaterial.emissiveColor = SELECTION_COLOR.scale(0.5);
      this.selectionMaterial.specularColor = Color3.Black();
      this.selectionMaterial.backFaceCulling = false;
    }
    ring.material = this.selectionMaterial;

    this.selectionRing = ring;
  }

  /**
   * Get the currently selected entity ID, or null if none.
   */
  getSelected(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Remove all unit meshes from the scene.
   */
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

    if (this.selectionMaterial) {
      this.selectionMaterial.dispose();
      this.selectionMaterial = null;
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.clear();
  }
}
