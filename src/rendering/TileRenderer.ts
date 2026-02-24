import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HexGrid, HexTile, TerrainType } from "@hex/HexGrid";
import { HexLayout, hexToPixel } from "@hex/HexLayout";

/**
 * Terrain type to hex color mapping.
 * Uses emissive color for visibility with the tilted camera.
 */
const TERRAIN_COLORS: Record<TerrainType, Color3> = {
  [TerrainType.Grass]: Color3.FromHexString("#4a7c59"),
  [TerrainType.Forest]: Color3.FromHexString("#2d5a3f"),
  [TerrainType.Swamp]: Color3.FromHexString("#5a5a3a"),
  [TerrainType.Hills]: Color3.FromHexString("#8a7a5a"),
  [TerrainType.Sand]: Color3.FromHexString("#c4a35a"),
  [TerrainType.Snow]: Color3.FromHexString("#d0d0d0"),
  [TerrainType.Road]: Color3.FromHexString("#8a7a6a"),
  [TerrainType.Water]: Color3.FromHexString("#3a5a8a"),
  [TerrainType.Mountains]: Color3.FromHexString("#6a6a6a"),
};

/** Height per elevation level in world Y units. Shared with OverlayRenderer / UnitRenderer. */
export const LAYER_HEIGHT = 0.8;

/** Cliff side color for elevated hex columns. */
const CLIFF_COLOR = Color3.FromHexString("#6a5a44");
const CLIFF_EMISSIVE = new Color3(0.25, 0.2, 0.15);

/**
 * Renders the hex grid as colored disc meshes (top surface) with hexagonal
 * prism columns underneath for elevated tiles, giving a 3D cliff effect
 * when viewed from the tilted camera.
 *
 * Instancing keeps draw calls minimal: one per terrain type for surfaces,
 * plus one for all cliff columns.
 */
export class TileRenderer {
  private scene: Scene;
  /** Base meshes keyed by TerrainType. Each has its own material. */
  private baseMeshes = new Map<TerrainType, Mesh>();
  /** All instanced meshes, keyed by "q,r" for fast lookup. */
  private instances = new Map<string, InstancedMesh>();
  /** Base mesh for hex cliff columns (height=1, scaled per instance). */
  private cliffBaseMesh: Mesh | null = null;
  /** All cliff column instances. */
  private cliffInstances: InstancedMesh[] = [];
  /** Highlight meshes for temporary overlays on specific tiles. */
  private highlights = new Map<string, Mesh>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Build the visual hex grid from a HexGrid and HexLayout.
   * Creates one base mesh per terrain type and instances for each tile.
   * Elevated tiles get hexagonal prism columns below the surface disc.
   */
  buildGrid(grid: HexGrid, layout: HexLayout): void {
    this.clearGrid();

    // Group tiles by terrain type
    const tilesByTerrain = new Map<TerrainType, HexTile[]>();
    for (const tile of grid.toArray()) {
      const existing = tilesByTerrain.get(tile.terrain);
      if (existing) {
        existing.push(tile);
      } else {
        tilesByTerrain.set(tile.terrain, [tile]);
      }
    }

    // Create a base mesh and instances for each terrain type
    for (const [terrain, tiles] of tilesByTerrain) {
      const baseMesh = this.createBaseMesh(terrain, layout.size);
      this.baseMeshes.set(terrain, baseMesh);

      for (const tile of tiles) {
        const { x, y } = hexToPixel(layout, tile.q, tile.r);
        const key = `${tile.q},${tile.r}`;

        const instance = baseMesh.createInstance(`tile_${key}`);
        instance.position.x = x;
        instance.position.y = tile.elevation * LAYER_HEIGHT;
        instance.position.z = y;

        this.instances.set(key, instance);
      }
    }

    // Build hex columns for elevated tiles
    this.buildElevationColumns(grid, layout);
  }

  /**
   * Remove all hex meshes and instances from the scene.
   */
  clearGrid(): void {
    for (const instance of this.instances.values()) {
      instance.dispose();
    }
    this.instances.clear();

    for (const instance of this.cliffInstances) {
      instance.dispose();
    }
    this.cliffInstances = [];

    for (const mesh of this.baseMeshes.values()) {
      mesh.material?.dispose();
      mesh.dispose();
    }
    this.baseMeshes.clear();

    if (this.cliffBaseMesh) {
      this.cliffBaseMesh.material?.dispose();
      this.cliffBaseMesh.dispose();
      this.cliffBaseMesh = null;
    }

    this.clearHighlights();
  }

  /**
   * Place a colored highlight disc on a specific hex tile.
   */
  highlightTile(q: number, r: number, layout: HexLayout, color: Color3): void {
    const key = `${q},${r}`;

    const existing = this.highlights.get(key);
    if (existing) {
      existing.material?.dispose();
      existing.dispose();
      this.highlights.delete(key);
    }

    const { x, y } = hexToPixel(layout, q, r);

    const disc = MeshBuilder.CreateDisc(
      `highlight_${key}`,
      { radius: layout.size * 0.9, tessellation: 6 },
      this.scene
    );
    disc.rotation.x = -Math.PI / 2;
    disc.rotation.y = Math.PI / 6;
    disc.position.x = x;
    disc.position.y = 0.05;
    disc.position.z = y;

    const mat = new StandardMaterial(`highlightMat_${key}`, this.scene);
    mat.diffuseColor = color;
    mat.alpha = 0.5;
    mat.backFaceCulling = false;
    disc.material = mat;

    this.highlights.set(key, disc);
  }

  clearHighlights(): void {
    for (const mesh of this.highlights.values()) {
      mesh.material?.dispose();
      mesh.dispose();
    }
    this.highlights.clear();
  }

  /**
   * Create a base hex disc mesh for a given terrain type.
   */
  private createBaseMesh(terrain: TerrainType, hexSize: number): Mesh {
    const mesh = MeshBuilder.CreateDisc(
      `base_${terrain}`,
      { radius: hexSize * 0.95, tessellation: 6 },
      this.scene
    );

    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.y = Math.PI / 6;

    const mat = new StandardMaterial(`mat_${terrain}`, this.scene);
    mat.diffuseColor = TERRAIN_COLORS[terrain];
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mat.freeze();
    mesh.material = mat;

    mesh.isVisible = false;

    return mesh;
  }

  getInstance(q: number, r: number): InstancedMesh | undefined {
    return this.instances.get(`${q},${r}`);
  }

  /**
   * Create hexagonal prism columns for all elevated tiles.
   *
   * Uses a single base cylinder mesh (height=1, tessellation=6) and
   * per-instance scaling.y to set the correct column height.
   * The column sits from Y=0 up to Y=elevation*LAYER_HEIGHT,
   * with the terrain disc on top.
   */
  private buildElevationColumns(grid: HexGrid, layout: HexLayout): void {
    const elevatedTiles = grid.toArray().filter(t => t.elevation > 0);
    if (elevatedTiles.length === 0) return;

    const radius = layout.size * 0.95;
    this.cliffBaseMesh = MeshBuilder.CreateCylinder(
      "cliffColumn",
      {
        height: 1,
        diameter: radius * 2,
        tessellation: 6,
      },
      this.scene,
    );
    // Rotate to match flat-top hex orientation
    this.cliffBaseMesh.rotation.y = Math.PI / 6;

    const mat = new StandardMaterial("cliffMat", this.scene);
    mat.diffuseColor = CLIFF_COLOR;
    mat.emissiveColor = CLIFF_EMISSIVE;
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mat.freeze();
    this.cliffBaseMesh.material = mat;
    this.cliffBaseMesh.isVisible = false;

    for (const tile of elevatedTiles) {
      const { x, y } = hexToPixel(layout, tile.q, tile.r);
      const height = tile.elevation * LAYER_HEIGHT;

      const instance = this.cliffBaseMesh.createInstance(
        `cliff_${tile.q},${tile.r}`,
      );
      instance.position.x = x;
      instance.position.y = height / 2; // center the unit-height cylinder
      instance.position.z = y;
      instance.scaling.y = height; // stretch to desired height

      this.cliffInstances.push(instance);
    }
  }
}
