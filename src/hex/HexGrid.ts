import { hexKey } from "./HexCoord";

export enum TerrainType {
  Grass = "grass",
  Forest = "forest",
  Swamp = "swamp",
  Hills = "hills",
  Mountains = "mountains",
  Sand = "sand",
  Snow = "snow",
  Water = "water",
  Road = "road",
}

export interface HexTile {
  readonly q: number;
  readonly r: number;
  /** Height level 0-3. Affects combat bonuses and movement cost. */
  elevation: number;
  terrain: TerrainType;
  /** Entity ID occupying this tile, or null. */
  occupant: string | null;
  /** True if the tile blocks line-of-sight (e.g., tall forest, mountain). */
  blocksLoS: boolean;
  /** Movement cost multiplier (1.0 = normal, 2.0 = difficult terrain). */
  movementCost: number;
  /** Defense bonus granted to occupant (+10, +15, etc.). */
  defenseBonusMelee: number;
  defenseBonusRanged: number;
}

export class HexGrid {
  private tiles = new Map<string, HexTile>();

  get size(): number {
    return this.tiles.size;
  }

  /** Add or overwrite a tile. */
  set(q: number, r: number, tile: HexTile): void {
    this.tiles.set(hexKey(q, r), tile);
  }

  /** Retrieve a tile, or undefined if out of bounds. */
  get(q: number, r: number): HexTile | undefined {
    return this.tiles.get(hexKey(q, r));
  }

  has(q: number, r: number): boolean {
    return this.tiles.has(hexKey(q, r));
  }

  /** Iterate all tiles. */
  values(): IterableIterator<HexTile> {
    return this.tiles.values();
  }

  /** Return all tiles as an array (useful for rendering). */
  toArray(): HexTile[] {
    return [...this.tiles.values()];
  }
}
