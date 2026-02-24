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
 * These colors are used as diffuseColor on StandardMaterial for each terrain type.
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

/** Height per elevation level in world Y units. */
const LAYER_HEIGHT = 0.12;
/** How much wider each successive cliff ring extends beyond the terrain disc. */
const RING_STEP = 0.06;
/** Cliff ring colors by depth (1 = just below surface, 3 = base). */
const CLIFF_COLORS = [
  Color3.FromHexString("#6a5a44"), // depth 1 — lightest
  Color3.FromHexString("#584832"), // depth 2
  Color3.FromHexString("#463826"), // depth 3 — darkest
];

/**
 * Renders the hex grid as colored disc meshes using Babylon.js instancing.
 *
 * For each terrain type, a single base mesh is created with its own material
 * and color. All tiles of that terrain type are rendered as instances of the
 * base mesh, keeping draw calls to one per terrain type.
 *
 * Elevated tiles are shown as stacked discs: the terrain disc on top with
 * progressively wider dark cliff-ring discs below, creating a raised look.
 *
 * The hex discs are flat on the XZ plane (rotated -PI/2 around X).
 */
export class TileRenderer {
  private scene: Scene;
  /** Base meshes keyed by TerrainType. Each has its own material. */
  private baseMeshes = new Map<TerrainType, Mesh>();
  /** All instanced meshes, keyed by "q,r" for fast lookup. */
  private instances = new Map<string, InstancedMesh>();
  /** Base meshes for cliff ring layers, keyed by ring depth (1-3). */
  private cliffBaseMeshes = new Map<number, Mesh>();
  /** All cliff ring instances. */
  private cliffInstances: InstancedMesh[] = [];
  /** Highlight meshes for temporary overlays on specific tiles. */
  private highlights = new Map<string, Mesh>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Build the visual hex grid from a HexGrid and HexLayout.
   * Creates one base mesh per terrain type and instances for each tile.
   * Elevated tiles get stacked cliff ring discs below the terrain surface.
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

    // Build cliff rings for elevated tiles
    this.buildElevationRings(grid, layout);
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

    for (const mesh of this.cliffBaseMeshes.values()) {
      mesh.material?.dispose();
      mesh.dispose();
    }
    this.cliffBaseMeshes.clear();

    this.clearHighlights();
  }

  /**
   * Place a colored highlight disc on a specific hex tile.
   * Useful for showing the currently hovered or selected tile.
   */
  highlightTile(q: number, r: number, layout: HexLayout, color: Color3): void {
    const key = `${q},${r}`;

    // Remove existing highlight on this tile
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
    // Lay flat on XZ plane
    disc.rotation.x = -Math.PI / 2;
    // Rotate 30 degrees for flat-top orientation
    disc.rotation.y = Math.PI / 6;
    disc.position.x = x;
    disc.position.y = 0.05; // just above tile
    disc.position.z = y;

    const mat = new StandardMaterial(`highlightMat_${key}`, this.scene);
    mat.diffuseColor = color;
    mat.alpha = 0.5;
    mat.backFaceCulling = false;
    disc.material = mat;

    this.highlights.set(key, disc);
  }

  /**
   * Remove all highlight overlays.
   */
  clearHighlights(): void {
    for (const mesh of this.highlights.values()) {
      mesh.material?.dispose();
      mesh.dispose();
    }
    this.highlights.clear();
  }

  /**
   * Create a base hex disc mesh for a given terrain type.
   * The disc has 6 tessellation segments (hexagonal shape), is rotated flat
   * onto the XZ plane, and has a material colored per terrain type.
   */
  private createBaseMesh(terrain: TerrainType, hexSize: number): Mesh {
    const mesh = MeshBuilder.CreateDisc(
      `base_${terrain}`,
      { radius: hexSize * 0.95, tessellation: 6 },
      this.scene
    );

    // Rotate to lay flat on XZ plane (disc is created in XY by default)
    mesh.rotation.x = -Math.PI / 2;
    // Rotate 30 degrees around Y for flat-top hex orientation
    mesh.rotation.y = Math.PI / 6;

    // Material with terrain color
    const mat = new StandardMaterial(`mat_${terrain}`, this.scene);
    mat.diffuseColor = TERRAIN_COLORS[terrain];
    mat.specularColor = Color3.Black(); // no specular highlight for flat 2D look
    mat.backFaceCulling = false;
    mat.freeze(); // material will not change, optimize
    mesh.material = mat;

    // The base mesh is not rendered directly; only its instances are
    mesh.isVisible = false;

    return mesh;
  }

  /**
   * Get an instanced mesh by hex coordinate key.
   */
  getInstance(q: number, r: number): InstancedMesh | undefined {
    return this.instances.get(`${q},${r}`);
  }

  /**
   * Create cliff ring disc instances for all elevated tiles.
   *
   * For a tile at elevation E, E ring layers are placed below the terrain disc.
   * Each ring at depth D (1 = just below surface, E = base) has radius
   * `hexSize * (0.95 + D * RING_STEP)`, creating visible concentric rings
   * from the top-down camera — a stepped cliff/plateau effect.
   */
  private buildElevationRings(grid: HexGrid, layout: HexLayout): void {
    // Find max elevation to know how many base meshes we need
    let maxElev = 0;
    for (const tile of grid.toArray()) {
      if (tile.elevation > maxElev) maxElev = tile.elevation;
    }
    if (maxElev === 0) return;

    // Create one cliff base mesh per ring depth level
    const terrainRadius = layout.size * 0.95;
    for (let depth = 1; depth <= maxElev; depth++) {
      const radius = terrainRadius + depth * RING_STEP;
      const mesh = MeshBuilder.CreateDisc(
        `cliff_ring_d${depth}`,
        { radius, tessellation: 6 },
        this.scene,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.y = Math.PI / 6;

      const colorIdx = Math.min(depth - 1, CLIFF_COLORS.length - 1);
      const mat = new StandardMaterial(`mat_cliff_d${depth}`, this.scene);
      mat.emissiveColor = CLIFF_COLORS[colorIdx]!;
      mat.diffuseColor = Color3.Black();
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      mat.freeze();
      mesh.material = mat;
      mesh.isVisible = false;

      this.cliffBaseMeshes.set(depth, mesh);
    }

    // Place cliff ring instances for each elevated tile
    for (const tile of grid.toArray()) {
      if (tile.elevation <= 0) continue;

      const { x, y } = hexToPixel(layout, tile.q, tile.r);

      for (let depth = 1; depth <= tile.elevation; depth++) {
        const baseMesh = this.cliffBaseMeshes.get(depth);
        if (!baseMesh) continue;

        const instance = baseMesh.createInstance(
          `cliff_${tile.q},${tile.r}_d${depth}`,
        );
        instance.position.x = x;
        // Depth 1 is just below the terrain surface, deeper layers lower
        instance.position.y = (tile.elevation - depth) * LAYER_HEIGHT;
        instance.position.z = y;

        this.cliffInstances.push(instance);
      }
    }
  }
}
