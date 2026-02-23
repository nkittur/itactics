# 06 - Battle Maps & Terrain Design

> Design document for the tactical battle map system in a mobile browser game (Babylon.js, portrait mode) inspired by Battle Brothers. Covers hex grid mechanics, terrain types, elevation, procedural generation, line of sight, deployment, night battles, retreat, fatigue interactions, and portrait-mode UI considerations.

---

## Table of Contents

1. [Hex Grid System](#1-hex-grid-system)
2. [Terrain Types](#2-terrain-types)
3. [Elevation System](#3-elevation-system)
4. [Map Generation](#4-map-generation)
5. [Obstacles](#5-obstacles)
6. [Line of Sight](#6-line-of-sight)
7. [Deployment Phase](#7-deployment-phase)
8. [Night Battles](#8-night-battles)
9. [Map Types](#9-map-types)
10. [Retreat Mechanic](#10-retreat-mechanic)
11. [Fatigue and Terrain](#11-fatigue-and-terrain)
12. [Portrait Mode Considerations](#12-portrait-mode-considerations)

---

## 1. Hex Grid System

### Grid Orientation

The battle map uses a **flat-top hexagonal grid**. Each hex has a flat edge on top and bottom, with vertices pointing left and right. This orientation was chosen because it produces natural-looking horizontal rows and aligns well with a portrait-mode viewport where the player scrolls more vertically than horizontally.

### Coordinate System

The grid uses an **offset coordinate system** (odd-q offset) for storage and display, with conversion to **cube coordinates** (q, r, s where q + r + s = 0) for all distance, pathfinding, and line-of-sight calculations.

| Coordinate System | Usage |
|---|---|
| Offset (col, row) | Storage in map arrays, rendering position calculations |
| Cube (q, r, s) | Distance calculations, ring/spiral iteration, line drawing, pathfinding |
| Axial (q, r) | Compact form of cube coords used in serialization |

**Hex-to-pixel conversion (flat-top):**

```
x = hex_size * (3/2 * q)
y = hex_size * (sqrt(3)/2 * q + sqrt(3) * r)
```

**Pixel-to-hex (for touch input):**

```
q = (2/3 * x) / hex_size
r = (-1/3 * x + sqrt(3)/3 * y) / hex_size
```

Round fractional cube coordinates to the nearest hex using the standard cube-round algorithm.

### Map Dimensions

| Map Size Category | Width (hexes) | Height (hexes) | Total Hexes | Typical Use |
|---|---|---|---|---|
| Small | 25 | 15 | ~375 | Quick skirmishes, ambushes, 3v3-6v6 |
| Medium | 30 | 20 | ~600 | Standard battles, camp assaults, 6v6-12v12 |
| Large | 35 | 25 | ~875 | Settlement defenses, large pitched battles, 12v12+ |

The map dimension is selected at battle initialization based on encounter type and the combined number of combatants. The grid is stored as a flat array indexed by `col * height + row`.

### Hex Size and Spacing

Each hex has a **size** (center-to-vertex distance) that determines its pixel footprint. The size is dynamic based on zoom level, but the logical grid remains constant.

| Measurement | Formula (flat-top) |
|---|---|
| Width | `2 * size` |
| Height | `sqrt(3) * size` |
| Horizontal spacing | `3/2 * size` |
| Vertical spacing | `sqrt(3) * size` |
| Odd column vertical offset | `sqrt(3)/2 * size` |

### Movement Between Hexes

Moving from one hex to an adjacent hex costs **Action Points (AP)**. The base cost is determined by the **destination hex's terrain type**. A character can move through multiple hexes in a single turn as long as they have sufficient AP remaining.

**Core movement rules:**

- Movement cost is always based on the **destination** hex, not the origin.
- A character must have enough AP remaining to pay the full cost of entering a hex; partial movement into a hex is not allowed.
- Moving uphill incurs an additional AP cost (see [Elevation System](#3-elevation-system)).
- Moving downhill has no additional cost beyond base terrain.
- Characters cannot move through hexes occupied by enemy units.
- Characters can move through hexes occupied by friendly units but cannot end their movement on an occupied hex.
- Diagonal movement costs the same as cardinal movement (all 6 hex neighbors are equidistant).

**Pathfinding:**

The game uses **A\* pathfinding** on the hex grid with terrain cost as the edge weight. When a player taps a destination hex, the optimal path is calculated and displayed as a highlighted trail. The path respects Zone of Control interruptions (see below). If the character lacks sufficient AP to reach the destination, the path is shown partially in green (reachable this turn) and partially in yellow (remaining distance).

### Zone of Control (ZoC)

Every unit exerts a **Zone of Control** over the **6 hexes adjacent** to its current position. ZoC represents the threat area where an engaged enemy cannot simply walk away.

| ZoC Rule | Details |
|---|---|
| Trigger | Entering a hex adjacent to an enemy, or starting a turn adjacent to an enemy |
| Effect on leaving | Attempting to leave a ZoC hex without using the Disengage action provokes a **free attack** (attack of opportunity) from the enemy |
| Disengage action | Costs **2 AP** and allows safe movement out of one ZoC hex without provoking a free attack |
| Multiple ZoC | If a character is in the ZoC of multiple enemies, disengaging from one does not protect against the others; each requires a separate disengage or provokes a free attack |
| ZoC and movement | Moving *within* an enemy's ZoC (from one adjacent hex to another adjacent hex of the same enemy) also provokes a free attack unless disengaging |
| Immune to ZoC | Characters with the **Footwork** perk can leave ZoC once per turn without provoking or paying the disengage cost |

### Facing and Surrounding

There is **no explicit facing mechanic**. Characters do not have a front, flank, or rear. However, a **surrounding penalty** applies based on how many enemies are adjacent.

| Adjacent Enemies | Melee Defense Penalty | Description |
|---|---|---|
| 1 | 0% | Normal engagement |
| 2 | -5% melee defense | Outnumbered |
| 3 | -10% melee defense | Heavily outnumbered |
| 4 | -15% melee defense | Surrounded |
| 5 | -20% melee defense | Nearly encircled |
| 6 | -25% melee defense | Fully encircled |

The penalty applies to the **defender** and is computed at the time of each attack. It stacks with all other defense modifiers (terrain, elevation, status effects, etc.).

---

## 2. Terrain Types

Each hex on the battle map has exactly one terrain type. Terrain affects movement cost, defense bonuses, and line-of-sight calculations.

### Master Terrain Table

| Terrain | AP Cost | Melee Defense Modifier | Ranged Defense Modifier | LoS Effect | Fatigue Cost (per hex) | Visual Description |
|---|---|---|---|---|---|---|
| Grass / Plain | 2 | +0 | +0 | None | 4 | Short green/brown grass, flat ground |
| Forest / Trees | 3 | +0 | +15 | Reduces / Blocks | 6 | Dense deciduous or pine trees, underbrush |
| Swamp | 4 | -10 | +0 | None | 8 | Murky water, reeds, mud |
| Snow | 3 | +0 | +0 | None | 6 | Snow-covered ground, bare trees |
| Sand / Desert | 3 | +0 | +0 | None | 6 | Loose sand, dunes, sparse scrub |
| Rocky / Rough | 3 | +0 | +0 | None | 6 | Loose stones, uneven ground, scree |
| Shallow Water | 4 | -10 | +0 | None | 8 | Ankle-to-knee depth water, river fords |
| Fences | +2 (crossing) | +10 (defender behind) | +0 | None | +2 | Wooden fences, low stone walls |
| Walls / Palisades | Impassable | +15 to +20 (adjacent) | +15 to +20 (adjacent) | Blocks | 0 (cannot enter) | Tall wooden palisades, stone walls |

### Terrain Details

#### Grass / Plain
- The default terrain type. Represents open, flat, unobstructed ground.
- No special interactions.
- Most common terrain on open field maps.

#### Forest / Trees
- Each forest hex contains 1-3 tree meshes for visual variety.
- **Ranged defense bonus (+15):** A character standing in a forest hex gains +15% ranged defense because incoming projectiles are partially deflected or obstructed by branches and trunks.
- **LoS effect:** A single forest hex in the line of sight between attacker and target applies a **-15% ranged hit penalty**. Two or more consecutive forest hexes in the LoS path **fully block** ranged attacks (LoS is broken).
- Characters *in* a forest hex can still be targeted by ranged attacks (they get the defense bonus, not full immunity).
- Forest does not affect melee combat beyond the movement cost.

#### Swamp
- Represents boggy, waterlogged terrain.
- **Melee defense penalty (-10):** Footing is treacherous; characters standing in swamp have reduced ability to dodge or parry.
- High AP and fatigue cost makes swamp hexes highly undesirable positions.
- Swamp does not affect LoS.

#### Snow
- Cosmetic variant with standard 3 AP cost.
- Commonly appears on maps generated from tundra, mountain, or northern biomes.
- No combat bonuses or penalties beyond the increased movement cost.
- May be combined with elevation for mountain encounters.

#### Sand / Desert
- Cosmetic variant with standard 3 AP cost.
- Commonly appears on desert and steppe biome maps.
- No combat bonuses or penalties beyond the increased movement cost.
- Visually distinct with warm tones and sparse vegetation.

#### Rocky / Rough
- Represents uneven, stony ground that is difficult to traverse but offers no inherent tactical advantage.
- Common around elevation transitions and mountain maps.
- 3 AP cost reflects the difficulty of navigating loose stone and uneven footing.

#### Shallow Water
- River fords, creek crossings, coastal shallows.
- **Melee defense penalty (-10):** Water impedes footwork.
- High AP and fatigue cost discourages prolonged occupation.
- Rivers are typically 1-2 hexes wide and serve as natural barriers.
- Deep water hexes (if present) are **impassable**.

#### Fences
- Fences exist as hex **edges** rather than as a hex terrain type. A hex can have a fence on one or more of its 6 edges.
- **Crossing cost (+2 AP):** Added to the destination hex's base terrain cost when the movement path crosses a fence edge.
- **Melee defense bonus (+10):** A character who is attacked in melee *across* a fence edge gains +10% melee defense. The bonus only applies when the fence edge is between the attacker and defender.
- Fences do not affect LoS or ranged attacks.
- Fences can be **destroyed** by attacks (HP: 20, no armor). Once destroyed, the edge reverts to normal.

#### Walls / Palisades
- Like fences, walls exist as hex **edges** or occupy full hexes (e.g., building walls).
- **Impassable:** Characters cannot move through wall edges. They must find a gate or breach.
- **Defense bonus (+15 to +20):** Characters adjacent to a wall on the defender's side gain +15% to +20% to both melee and ranged defense, depending on wall type (wooden palisade: +15, stone wall: +20).
- **LoS block:** Walls fully block line of sight. Ranged attacks cannot pass through wall hexes or wall edges.
- Walls can be **destroyed** by siege weapons or specific abilities (HP: 80-150 depending on material). Gates have lower HP (40-60).
- Characters on elevated positions (e.g., on top of a wall/tower) can shoot over walls.

### Pathfinder Perk

The **Pathfinder** perk reduces the AP cost of entering any terrain hex by **1 AP**, to a minimum of **1 AP**.

| Terrain | Normal AP Cost | With Pathfinder |
|---|---|---|
| Grass / Plain | 2 | 1 |
| Forest / Trees | 3 | 2 |
| Swamp | 4 | 3 |
| Snow | 3 | 2 |
| Sand / Desert | 3 | 2 |
| Rocky / Rough | 3 | 2 |
| Shallow Water | 4 | 3 |

Pathfinder does **not** reduce the extra AP cost from elevation changes or fence crossing. It only affects the base terrain AP cost.

### Terrain Data Structure

Each hex stores terrain information in a compact format:

```
HexTile {
    terrain: TerrainType      // enum: GRASS, FOREST, SWAMP, SNOW, SAND, ROCKY, SHALLOW_WATER
    elevation: 0 | 1 | 2      // low, mid, high
    edges: EdgeFlags[6]        // per-edge: NONE, FENCE, WALL, GATE
    obstacle: ObstacleType     // NONE, TREE, ROCK, BOULDER, BUILDING
    occupied_by: EntityId | null
    decorations: number[]      // indices into decoration mesh pool
}
```

---

## 3. Elevation System

### Elevation Levels

The map supports **3 discrete elevation levels**:

| Level | Name | Typical Terrain |
|---|---|---|
| 0 | Low | Valleys, riverbeds, plains |
| 1 | Mid | Standard ground, gentle hills |
| 2 | High | Hilltops, cliffs, elevated plateaus |

Elevation is assigned per-hex. Adjacent hexes can differ by at most 1 elevation level under normal generation rules. A 2-level difference between adjacent hexes represents a **cliff** and is impassable without a ladder or ramp hex.

### Movement and Elevation

| Movement Direction | Additional AP Cost | Notes |
|---|---|---|
| Same level to same level | +0 | No elevation change |
| Moving uphill (+1 level) | +2 AP | Added to terrain base cost |
| Moving downhill (-1 level) | +0 AP | No additional cost |
| Moving uphill (+2 levels) | Impassable | Cliff face; cannot traverse |
| Moving downhill (-2 levels) | Impassable | Cliff face; cannot traverse |

**Example:** Moving from a mid-elevation grass hex to a high-elevation forest hex costs `3 (forest base) + 2 (uphill) = 5 AP`. Moving in the reverse direction (high forest to mid grass) costs only `2 AP` (grass base, downhill is free).

With the Pathfinder perk, the same uphill move costs `2 (forest with Pathfinder) + 2 (uphill) = 4 AP`.

### Combat Bonuses from Elevation

Elevation advantage provides significant combat bonuses. The bonuses are calculated based on the **difference** in elevation between attacker and defender.

| Elevation Advantage | Melee Hit Bonus | Melee Defense Bonus | Ranged Hit Bonus | Ranged Defense Bonus | Ranged Range Bonus |
|---|---|---|---|---|---|
| +1 level (attacker higher) | +10% | +10% | +10% | +10% | +1 hex effective range |
| +2 levels (attacker higher) | +20% | +20% | +20% | +20% | +2 hex effective range |
| -1 level (attacker lower) | -10% | -10% | -10% | -10% | -1 hex effective range |
| -2 levels (attacker lower) | -20% | -20% | -20% | -20% | -2 hex effective range |
| Same level | +0% | +0% | +0% | +0% | +0 |

**Key rules:**

- A **two-level difference doubles** all bonuses/penalties compared to a one-level difference.
- Elevation bonuses stack with terrain bonuses. A character on a high-elevation forest hex gains both the +15 ranged defense from forest and the +10 (or +20) ranged defense from elevation.
- The ranged range bonus means a bow with 7-hex range effectively has 8-hex range when the attacker is 1 level higher, or 9-hex range when 2 levels higher.
- Elevation defense bonuses apply to the **character on higher ground**, regardless of whether they are attacking or defending. The bonuses represent the inherent advantage of holding the high ground.

### Elevation and Line of Sight

- A character at a higher elevation can see **over** obstacles and units at lower elevations.
- Specifically, a character at elevation 2 can see over obstacles at elevation 0 and 1 (but not over obstacles at elevation 2).
- A character at elevation 1 can see over obstacles at elevation 0.
- This allows archers on hills to shoot over low-ground cover that would otherwise block LoS.
- Elevation differences also extend maximum vision range by +1 hex per elevation level advantage.

### Visual Representation

Elevation is rendered as vertical displacement of the hex tile mesh:

| Elevation Level | Y-offset (world units) | Visual Treatment |
|---|---|---|
| 0 (Low) | 0.0 | Base ground plane |
| 1 (Mid) | 0.5 | Raised platform, slight slope on edges |
| 2 (High) | 1.0 | Prominent hill, steep slopes on edges |

Transition hexes between elevation levels display sloped geometry. Cliff faces (2-level drops) display vertical rock faces.

---

## 4. Map Generation

Battle maps are **procedurally generated** at the start of each combat encounter. The generation is seeded by the encounter parameters to ensure deterministic reproduction for debugging and replay.

### Generation Inputs

| Input | Source | Effect on Generation |
|---|---|---|
| Biome | Overworld tile where the encounter occurs | Determines terrain composition palette |
| Encounter type | Contract/event type | Determines structural layout (open, camp, settlement, etc.) |
| Enemy count | Encounter data | Influences map size selection |
| Time of day | World clock | Night battles reduce visibility |
| Road presence | Overworld road on tile | Generates a road across the map |
| Difficulty tier | Contract difficulty | Affects advantageousness of terrain for enemies |

### Biome-to-Terrain Mapping

Each overworld biome defines a probability distribution for terrain types used during generation.

| Biome | Primary Terrain | Secondary Terrain | Rare Terrain | Elevation Profile |
|---|---|---|---|---|
| Grassland | Grass (70%) | Forest (15%) | Rocky (5%), Shallow Water (10%) | Mostly flat (0-1) |
| Forest | Forest (55%) | Grass (25%) | Swamp (10%), Rocky (10%) | Rolling (0-1) |
| Swamp | Swamp (45%) | Grass (20%) | Forest (20%), Shallow Water (15%) | Flat (0) |
| Tundra | Snow (60%) | Rocky (20%) | Forest (10%), Grass (10%) | Moderate (0-2) |
| Desert | Sand (65%) | Rocky (25%) | Grass (5%), Rough (5%) | Moderate (0-2) |
| Mountain | Rocky (45%) | Grass (20%) | Snow (15%), Forest (20%) | Steep (0-2, frequent cliffs) |
| Steppe | Grass (50%) | Sand (25%) | Rocky (15%), Rough (10%) | Gentle (0-1) |
| Coastal | Grass (35%) | Sand (30%) | Shallow Water (25%), Rocky (10%) | Flat to gentle (0-1) |

### Generation Pipeline

The map generation follows a multi-pass pipeline:

**Pass 1 -- Elevation:**
1. Generate a 2D Perlin noise field at low frequency.
2. Quantize the noise values into 3 elevation levels (low, mid, high) using biome-specific thresholds.
3. For mountain biomes, increase noise amplitude to create more dramatic elevation changes.
4. Ensure cliffs (2-level jumps) have connecting ramp hexes within 3-5 hex distance for pathability.

**Pass 2 -- Base Terrain:**
1. Generate a second Perlin noise field at medium frequency.
2. Map noise values to terrain types using the biome's probability distribution.
3. Apply clustering: use cellular automata (2-3 iterations) to group similar terrain types into natural-looking patches.
4. Ensure minimum patch sizes (forest clusters of at least 4-6 hexes, swamp areas of at least 3-5 hexes).

**Pass 3 -- Structure Placement (encounter-type dependent):**
1. Place structural elements based on encounter type (see table below).
2. Walls, buildings, gates, and other structural elements are placed according to templates.
3. Templates are selected from a library of pre-designed layouts and then rotated/mirrored randomly.

**Pass 4 -- Roads:**
1. If the overworld tile contains a road, generate a path across the map (typically edge-to-edge).
2. Road hexes are converted to Grass/Plain terrain with a road decoration overlay.
3. Road hexes cost **1 AP** to traverse (special case, cheaper than normal grass).

**Pass 5 -- Obstacles and Decorations:**
1. Scatter obstacle objects (trees, rocks, boulders) based on terrain type.
2. Forest hexes get 1-3 tree objects. Rocky hexes get 0-2 rock objects.
3. Place decorative elements (bushes, flowers, bones, camp debris) that have no gameplay effect.

**Pass 6 -- Deployment Zones:**
1. Designate player deployment zone on one map edge (typically south for portrait mode).
2. Designate enemy deployment zone on opposite edge or around structural objectives.
3. Ensure deployment zones are on passable terrain with adequate space.

**Pass 7 -- Validation:**
1. Run A* pathfinding from player deployment zone to enemy deployment zone to confirm the map is fully traversable.
2. If no valid path exists, regenerate with a different seed.
3. Verify minimum distances between deployment zones (at least 8 hexes on small maps, 12 on medium, 16 on large).

### Encounter Type Structures

| Encounter Type | Structure | Layout Description |
|---|---|---|
| Open Field | None | Pure biome terrain, no structural elements. Deployment zones on opposite edges. |
| Forest Ambush | Forest clusters | Dense forest dominates center. Player may start partially surrounded or in a clearing. Enemy forces begin hidden in tree hexes. |
| Camp / Lair Assault | Palisades, gates, tents | Rectangular or irregular palisade enclosure (8-15 hex diameter). 1-2 gates. Enemy inside, player outside. Scattered tent/structure obstacles inside. |
| Settlement Defense | Buildings, fences, roads | Grid of building hexes forming streets. Player defends from within. Enemies approach from 1-2 edges. Road through center. |
| Mountain Battle | Elevation, chokepoints | High elevation variation. Natural chokepoints formed by cliff faces. Rocky terrain dominant. |
| Swamp Battle | Swamp clusters, shallow water | Large swamp and water areas restrict movement. Scattered dry-ground islands. |
| Desert Battle | Sand, dunes (elevation), rocks | Open terrain with gentle dune elevation. Scattered rock formations for cover. |
| Bridge Battle | River, bridge | River (impassable deep water) bisects the map. 1-2 bridges provide crossing points (1-2 hexes wide). |

---

## 5. Obstacles

Obstacles are objects placed on or between hexes that affect movement, line of sight, and combat. They are distinct from terrain types -- a hex can have both a terrain type and an obstacle.

### Obstacle Types

| Obstacle | Passable? | LoS Effect | Cover Bonus | HP | Destructible? | Notes |
|---|---|---|---|---|---|---|
| Tree | Yes (costs hex terrain AP) | Partial block | +10 ranged defense | 30 | Yes | 1-3 per forest hex; sparse trees on grass |
| Small Rock | Yes | None | None | -- | No | Decorative only, no gameplay effect |
| Boulder | No | Full block | +15 ranged defense (adjacent) | 60 | Yes (siege only) | Large rock formations, impassable |
| Wall Segment | No | Full block | +15-20 all defense (adjacent) | 80-150 | Yes | Part of palisade or fortification |
| Fence Segment | Yes (+2 AP) | None | +10 melee defense (across) | 20 | Yes | Low wooden fence or stone wall |
| Building | No | Full block | +15 ranged defense (adjacent) | -- | No | Multi-hex structures, impassable interior |
| Bridge | Yes (normal AP) | None | None | -- | No | Spans deep water, natural chokepoint |
| Gate | Yes (normal AP) | None when open | +10 melee defense (when closed) | 40-60 | Yes | Part of palisade, can be open or closed |
| Tent / Cart | No | Partial block | +5 ranged defense (adjacent) | 15 | Yes | Camp obstacle, easily destroyed |
| Barrel / Crate | No | None | +5 ranged defense (adjacent) | 10 | Yes | Settlement obstacle, easily destroyed |

### Obstacle Interactions

**Trees:**
- A forest hex has an implicit "dense trees" obstacle. Individual tree obstacles can also be placed on non-forest hexes (scattered trees on grass).
- A character in a hex with a tree gains **+10 ranged defense** from the tree cover (in addition to any forest terrain bonus, but these do not double-stack; forest hex gives +15 total, not +15 terrain + +10 tree).
- Trees provide **partial LoS blocking**: a single tree hex in the LoS path imposes a -15% ranged hit penalty. Two or more consecutive tree/forest hexes fully block LoS.
- Trees can be destroyed. When a tree is destroyed, it is removed from the hex. If it was the last tree in a forest hex, the hex terrain type changes to Grass.

**Rocks and Boulders:**
- Small rocks are decorative and have no gameplay effect.
- Boulders are **impassable** -- units cannot enter a hex containing a boulder.
- Boulders provide **full LoS block** -- ranged attacks cannot pass through a boulder hex.
- A character adjacent to a boulder gains **+15 ranged defense** as cover.
- Boulders are only destructible by siege weapons or certain high-damage abilities (not standard attacks).

**Walls:**
- Walls block movement and LoS completely.
- Characters **adjacent** to a wall (on the protected side) gain +15 to +20 defense to both melee and ranged.
- Wall HP varies by material: wooden palisade (80 HP), stone wall (150 HP).
- Destroying a wall segment creates a **breach** -- a passable hex with rough terrain (3 AP cost) and no defense bonus.

**Fences:**
- Fences are low obstacles that can be crossed with extra AP.
- Crossing a fence edge adds **+2 AP** to the movement cost.
- Defending behind a fence (melee attack crosses the fence edge from attacker to defender) grants **+10 melee defense**.
- Fences are easily destroyed (20 HP) and can be demolished with a single attack from most weapons.

**Buildings:**
- Buildings occupy multiple hexes (typically 2x2 to 4x4 hex footprints).
- All building hexes are **impassable**.
- Buildings **fully block LoS** through any of their hexes.
- Characters adjacent to a building gain **+15 ranged defense** (using the building as cover).
- Buildings are **indestructible** during battle.

**Bridges:**
- Bridges replace deep water hexes, making them passable.
- Movement cost on a bridge is the same as grass (2 AP).
- Bridges are typically 1-2 hexes wide.
- Bridges are **indestructible** and serve as natural chokepoints where ZoC and positioning become critical.
- A bridge hex has no defense bonus or LoS effect.

---

## 6. Line of Sight

Line of Sight (LoS) determines whether a character can see and target another character with ranged attacks or certain abilities.

### LoS Calculation Method

LoS is calculated by drawing a **straight line** from the center of the attacker's hex to the center of the target's hex, then checking every hex that the line passes through.

**Algorithm:**

1. Convert attacker and target positions to cube coordinates.
2. Compute the number of steps N = cube_distance(attacker, target).
3. For each step i from 0 to N, compute the interpolated point: `lerp(attacker, target, i/N)`.
4. Round each interpolated point to the nearest hex (cube_round).
5. Collect all unique hexes along the path (excluding attacker and target hexes).
6. Check each intervening hex for LoS-blocking elements.

When the line passes exactly along a hex edge (between two hexes), **both** hexes are checked. If either one blocks LoS, the line is blocked.

### LoS Blocking Rules

| Blocker Type | LoS Effect | Notes |
|---|---|---|
| Building hex | Full block | LoS is completely broken |
| Boulder hex | Full block | LoS is completely broken |
| Wall edge | Full block | LoS is completely broken |
| Single forest/tree hex | -15% ranged hit penalty | Partial obstruction |
| 2+ consecutive forest/tree hexes | Full block | Too much foliage to see through |
| Intervening elevation (+1 or more above both attacker and target) | Full block | Hill/cliff between combatants blocks view |
| Character in path (friendly or enemy) | -10% ranged hit penalty + friendly fire risk | See below |
| Smoke / dust (future feature) | Partial or full block | Environmental effects |

### Characters in the LoS Path

Characters (friendly or enemy) standing in hexes along the LoS path do **not** block line of sight. However, they impose penalties:

- **-10% ranged hit penalty** per character in the path.
- **Friendly fire risk:** If a ranged attack misses the intended target and there is a friendly unit in the path, there is a chance the projectile hits the friendly unit instead. The friendly fire chance is calculated as:
  - `friendly_fire_chance = 15% per friendly unit in the path`
  - If friendly fire triggers, the attack is resolved against the friendly unit using the attacker's ranged skill vs. the friendly unit's ranged defense.
- Multiple characters in the path stack their penalties: two characters in the path means -20% hit penalty and up to 30% total friendly fire chance.

### Height and LoS

Elevation differences significantly affect LoS:

| Scenario | LoS Rule |
|---|---|
| Attacker and target at same elevation | Standard LoS check through intervening hexes |
| Attacker higher than target by 1+ levels | Can see over obstacles and units at lower elevation levels. An obstacle only blocks LoS if it is at the **same or higher** elevation than the attacker. |
| Attacker lower than target by 1+ levels | Intervening hexes at the target's elevation or higher block LoS normally. The attacker cannot see "over" anything. |
| Intervening hex elevation higher than both attacker and target | LoS is blocked regardless of other factors. A hill between two low-ground combatants blocks sight. |

**Example:** An archer at elevation 2 shooting at a target at elevation 0. A forest hex at elevation 1 is in the path. Normally forest would partially block LoS, but because the archer's elevation (2) is higher than the forest hex elevation (1), the archer can see over the trees. LoS is clear.

### LoS Caching

LoS calculations can be expensive on large maps with many units. The following optimizations are used:

- **Pre-computed LoS map:** At the start of each turn, compute and cache LoS from each friendly unit to all hexes within their vision range. Invalidate on unit movement.
- **Symmetric LoS:** If A can see B, then B can see A (at the same elevation). Cache entries work bidirectionally for same-elevation pairs.
- **Dirty flag:** When a destructible obstacle is destroyed or a unit moves, mark affected LoS cache entries as dirty for recalculation.

---

## 7. Deployment Phase

Before combat begins, the player has a **deployment phase** to position their brothers on the battlefield.

### Deployment Zone

| Property | Details |
|---|---|
| Location | Player's edge of the map (typically the south edge in portrait mode) |
| Depth | 2-3 rows of hexes from the map edge |
| Width | Full map width or a subsection depending on encounter type |
| Terrain | Must be passable terrain (no water, boulders, or buildings in deployment zone) |

The deployment zone is highlighted visually with a distinct color overlay (e.g., translucent blue) so the player can clearly see valid placement hexes.

### Deployment Interaction

**Drag-and-drop positioning:**

1. The player's brothers are displayed in a roster panel (bottom of the screen in portrait mode).
2. The player taps a brother in the roster to select them.
3. The player taps a valid hex in the deployment zone to place the selected brother.
4. Alternatively, the player can **drag** a brother from the roster directly onto a deployment hex.
5. Brothers already placed on the map can be tapped and then tapped on a different valid hex to reposition.
6. Two placed brothers can be **swapped** by dragging one onto the other's hex.

**Formation mirroring:**

- The deployment zone layout mirrors the player's **formation setup** from the company management screen.
- When the deployment phase begins, brothers are auto-placed according to their formation positions.
- The player can then adjust positions manually before confirming.
- The default formation places frontline fighters in the front row and ranged units in the back row.

### Deployment Confirmation

- A **"Start Battle"** button appears once all brothers are placed.
- The player can spend as long as they want adjusting positions.
- During deployment, the player can see the visible portion of the map (fog of war applies; enemy positions may be partially or fully hidden depending on encounter type).

### Encounter-Specific Deployment

| Encounter Type | Deployment Variation |
|---|---|
| Open Field | Standard 2-3 row zone on south edge. Full width. |
| Forest Ambush | Reduced deployment zone (1-2 rows). May be in an unfavorable position (clearing surrounded by forest). Enemy positions visible only if adjacent. |
| Camp Assault | Deployment zone is **outside** the palisade walls. Gate locations are visible. Player must plan entry approach. |
| Settlement Defense | Deployment zone is **inside** the settlement. Player positions among buildings and streets. |
| Mountain Battle | Deployment zone may be at low elevation. High ground must be contested. |
| Ambush (player ambushed) | Very small deployment zone (1 row). Unfavorable terrain. Enemies start closer than normal. No time to arrange formation optimally. |
| Ambush (player ambushing) | Favorable deployment zone. May be on elevated or forested terrain. Enemies start in the open. Player gets first turn. |

### Pre-Battle Information

During the deployment phase, the following information is visible:

| Information | Visibility |
|---|---|
| Terrain and elevation | Fully visible across entire map |
| Obstacles | Fully visible |
| Enemy positions (standard battle) | Visible in their deployment zone |
| Enemy positions (ambush by player) | Visible; enemies are in the open |
| Enemy positions (ambush of player) | Partially visible; some enemies may be hidden |
| Enemy unit types | Visible if within vision range of deployed brothers |

---

## 8. Night Battles

Battles that occur during nighttime hours on the overworld clock have reduced visibility, fundamentally changing tactical dynamics.

### Vision Range

| Condition | Vision Range (hexes) |
|---|---|
| Daytime | 8-10 hexes (effectively unlimited on small maps) |
| Night (no torch) | 4-5 hexes |
| Night (with torch) | 8-9 hexes (4-5 base + 4 torch bonus) |
| Night (Night Owl trait) | 6-7 hexes (reduced penalty) |
| Night (Night Vision potion) | 7-8 hexes |
| Night (Night Owl + torch) | 10-11 hexes (near-daytime) |

### Torch Mechanics

| Property | Details |
|---|---|
| Torch slot | Occupies one **hand slot** (off-hand). Cannot dual-wield or use a shield while holding a torch. |
| Radius bonus | +4 hexes to night vision range |
| Duration | Lasts the entire battle (does not burn out) |
| Visibility | A character holding a torch is **visible to enemies** even beyond their normal night vision range (enemies can see the torch from 8 hexes away). This is a double-edged sword. |
| Equip/unequip | Can be equipped or stowed during battle using the **swap equipment** action (costs 4 AP). |

### Night Combat Effects

| Effect | Details |
|---|---|
| Ranged attack penalty | -20% ranged hit chance against targets at the edge of vision range (4-5 hexes). Penalty scales: -5% per hex beyond 3 hexes in night conditions. |
| Melee combat | Unaffected by darkness (assumed to be close enough to see). |
| Fog of war | Hexes beyond vision range are hidden (enemies on those hexes are not visible). Previously seen terrain remains visible but unit positions are not updated. |
| Morale | Some characters may receive morale penalties for fighting at night (based on traits like "Fearful" or "Superstitious"). |
| Ambush advantage | Night ambushes start enemies even closer (reduced gap between deployment zones). |

### Night Owl Trait

| Property | Details |
|---|---|
| Effect | Reduces night vision penalty by approximately 50%. Vision range at night becomes 6-7 hexes instead of 4-5. |
| Ranged penalty | Reduced from -20% to -10% at vision edge. |
| Morale | Immune to night-based morale penalties. |

### Night Vision Potion

| Property | Details |
|---|---|
| Duration | Lasts 5 turns from consumption. |
| Effect | Vision range at night becomes 7-8 hexes. Ranged penalty reduced to -10% at vision edge. |
| Stacking | Stacks with Night Owl trait for near-daytime performance. Does not stack with torch (use the higher value). |
| Consumption | Uses the **potion** quick slot. Can be consumed at battle start or during combat (costs 2 AP). |

### Visual Rendering at Night

- The map has a dark ambient overlay.
- Each character's vision range creates a circular (hex-based) light area around them.
- Characters with torches have a warm, flickering light radius rendered as a point light in Babylon.js.
- Hexes outside all friendly vision ranges are rendered in deep shadow (very low brightness, terrain visible but no unit information).
- Transition between lit and dark areas uses a 1-hex gradient for visual smoothness.

---

## 9. Map Types

Each encounter type produces a distinct map layout with characteristic terrain composition and structural features.

### Map Type Summary

| Map Type | Typical Size | Elevation | Key Features | Tactical Theme |
|---|---|---|---|---|
| Open Field | Medium-Large | Gentle (0-1) | Scattered trees, rocks. Road if applicable. | Maneuver warfare, flanking |
| Forest Ambush | Small-Medium | Flat-Rolling (0-1) | Dense forest, small clearings | Close quarters, limited ranged, surprise |
| Camp / Lair Assault | Medium | Flat (0-1) | Palisade walls, gates, interior obstacles | Breach and clear, chokepoints |
| Settlement Defense | Medium-Large | Flat (0) | Buildings, streets, fences, market square | Urban combat, LoS management |
| Mountain Battle | Medium | Steep (0-2) | Cliffs, chokepoints, rocky terrain | Elevation control, limited flanking |
| Swamp Battle | Medium | Flat (0) | Large swamp areas, dry islands | Movement restriction, fatigue management |
| Desert Battle | Medium-Large | Gentle dunes (0-1) | Open sand, rock formations, oasis | Exposure, long ranged sightlines |
| Bridge Battle | Medium | Flat (0) | River bisecting map, 1-2 bridges | Extreme chokepoint, ZoC dominance |

### Detailed Map Type Descriptions

#### Open Field
- The most common and straightforward map type.
- Biome terrain dominates with light obstacle scattering.
- May have gentle elevation changes (one or two low hills).
- A road may cross the map if the overworld tile has one, providing a fast movement corridor.
- Favors balanced compositions: melee frontline supported by ranged backline, with space for flanking maneuvers.
- Deployment zones are on opposite long edges with 10-16 hexes of open ground between them.

#### Forest Ambush
- Heavy forest coverage (50-70% of map hexes are forest).
- Small clearings (3-5 hex diameter) break up the tree cover.
- Ranged combat is severely limited due to LoS blocking.
- Enemy forces may start partially hidden in forest hexes (enemies in forest are not visible until a friendly unit has LoS to them).
- If the player is the ambusher, they get forest deployment positions and first turn.
- If the player is ambushed, they start in a clearing with enemies emerging from surrounding forest.
- Favors melee-heavy compositions with the Pathfinder perk.

#### Camp / Lair Assault
- A central palisade enclosure (roughly 8-15 hex diameter) with 1-2 gates.
- Interior contains tents, crates, and other camp obstacles.
- Enemy forces are inside the palisade; player deploys outside.
- The player must approach the gates or breach the walls to engage.
- Gates can be bashed open (40-60 HP) or may start open depending on the encounter.
- The approach to the camp is open terrain, exposing attackers to ranged fire from defenders on the walls.
- Favors siege tactics: shield-bearers to approach under fire, two-handed weapons to breach walls.

#### Settlement Defense
- Player defends a settlement from attacking enemies.
- Buildings arranged in a loose grid with streets and alleys.
- A central market square or open area provides a fallback rally point.
- Fences and low walls around the settlement perimeter.
- Player deploys inside the settlement.
- Enemies approach from 1-2 map edges.
- LoS is highly restricted by buildings, creating close-quarters engagements in streets.
- Favors defensive positioning, chokepoint control, and ranged units in elevated positions (if available).

#### Mountain Battle
- High elevation variation with frequent 2-level drops (cliffs).
- Rocky and rough terrain dominates.
- Natural chokepoints formed by cliff faces and narrow passes.
- Snow terrain at highest elevations.
- The central high ground is the key tactical objective.
- Favors units with high mobility (Pathfinder, light armor) to seize elevation advantages.

#### Swamp Battle
- Large swamp hexes with interspersed dry-ground islands.
- Shallow water areas create additional movement obstacles.
- Very flat (almost entirely elevation 0).
- Movement is extremely expensive across most of the map.
- Dry-ground islands connected by narrow paths of passable terrain.
- Heavily penalizes heavy armor (fatigue costs are amplified).
- Favors light, mobile units and ranged attackers positioned on dry ground.

#### Desert Battle
- Open sand terrain with long sightlines.
- Scattered rock formations provide the only cover.
- Gentle dune elevation (elevation 0-1) provides minor tactical differences.
- Oasis hexes (shallow water surrounded by grass) may appear.
- Very favorable for ranged combat due to minimal LoS obstruction.
- Favors archers and crossbowmen with clear firing lanes.

#### Bridge Battle
- A river of deep water (impassable) bisects the map horizontally or diagonally.
- 1-2 bridges (1-2 hexes wide each) provide the only crossing points.
- Extreme chokepoint combat: a few defenders can hold a bridge against superior numbers.
- ZoC is devastatingly effective on bridges since there is no room to maneuver around engaged enemies.
- Player and enemy deploy on opposite sides of the river.
- Favors heavily armored frontline fighters to hold the bridge, supported by ranged units firing across the river.

---

## 10. Retreat Mechanic

When a battle turns against the player, they may choose to retreat. Retreat is not instant; brothers must physically flee the battlefield.

### Retreat Rules

| Rule | Details |
|---|---|
| Initiate retreat | Player presses the **Retreat** button (available at any time during the player's turn). |
| Effect | All player brothers enter **fleeing** state at the start of their next activation. |
| Fleeing behavior | Fleeing brothers automatically move toward the **nearest map edge** using all available AP each turn. |
| Player control | The player loses direct control of fleeing brothers. They cannot attack, use abilities, or change direction. |
| Zone of Control | ZoC **still applies** to fleeing brothers. Leaving a ZoC hex while fleeing provokes free attacks. Fleeing brothers do NOT use the disengage action -- they simply run and take the hits. |
| Reaching the edge | A fleeing brother who reaches any map edge hex is **removed from battle** and considered safely escaped. |
| Partial retreat | Brothers who successfully escape survive with their current HP and injuries. Brothers who are killed or incapacitated during the retreat are lost. |
| Cancellation | Retreat **cannot** be cancelled once initiated. |
| Loot | Retreating forfeits all loot from the battle. Items dropped by fallen brothers on the battlefield are also lost. |

### Retreat Pathfinding

Fleeing brothers use a simple heuristic to determine their escape path:

1. Calculate the shortest path to the **nearest map edge hex** using standard A* pathfinding.
2. If the path is blocked by enemies, attempt to route around them (up to 3 hexes of detour).
3. If completely boxed in with no path to any edge, the brother stands in place and defends (can still be attacked).
4. Fleeing brothers spend ALL available AP on movement each turn. They do not reserve AP for attacks or defense.

### Partial Retreat Outcomes

| Outcome | Result |
|---|---|
| All brothers escape | Battle ends. Company survives with escaped brothers. No loot. |
| Some brothers escape, some killed | Battle ends when last non-escaped brother is killed. Escaped brothers survive. Killed brothers are lost permanently. No loot. |
| No brothers escape | Total party kill. Game over (or company destruction if any brothers were left at camp). |

### Strategic Considerations

- Retreat is most effective early, before brothers are surrounded and deep in enemy ZoC.
- Brothers near the map edge can escape quickly (1-3 turns).
- Brothers in the center of a large map may need 5-8 turns to reach an edge, during which they are vulnerable.
- Light armor and Pathfinder perk increase escape chances by allowing more hexes per turn.
- Shieldwall or defensive perks do not help during retreat since fleeing brothers do not defend.

---

## 11. Fatigue and Terrain

Fatigue accumulates as brothers move and fight. Terrain directly influences how quickly fatigue builds from movement.

### Base Fatigue Costs

| Terrain | Fatigue per Hex | Notes |
|---|---|---|
| Grass / Plain | 4 | Base flat terrain cost |
| Road (on grass) | 2 | Roads reduce fatigue significantly |
| Forest / Trees | 6 | Navigating through trees and underbrush |
| Swamp | 8 | Slogging through mud and water |
| Snow | 6 | Trudging through snow |
| Sand / Desert | 6 | Loose footing, energy-sapping |
| Rocky / Rough | 6 | Uneven ground requires careful footing |
| Shallow Water | 8 | Wading through water |

### Elevation Fatigue

| Movement | Additional Fatigue |
|---|---|
| Uphill (+1 level) | +4 fatigue |
| Downhill (-1 level) | +0 fatigue |
| Same level | +0 fatigue |

### Armor Weight and Fatigue

Armor weight amplifies fatigue costs from movement. The **fatigue modifier** from armor is applied as a multiplier to all movement fatigue costs.

| Armor Weight Class | Fatigue Multiplier | Example |
|---|---|---|
| None / Cloth (0-5 fatigue penalty) | 1.0x | Robes, no armor |
| Light (6-15 fatigue penalty) | 1.1x | Leather armor, padded surcoat |
| Medium (16-25 fatigue penalty) | 1.25x | Mail hauberk, scale armor |
| Heavy (26-35 fatigue penalty) | 1.4x | Full plate, heavy lamellar |
| Very Heavy (36+ fatigue penalty) | 1.6x | Named/legendary heavy armor |

**Example:** A brother in heavy armor (1.4x multiplier) moving through a swamp hex:
- Base fatigue: 8 (swamp)
- After armor: 8 * 1.4 = 11.2, rounded to **11 fatigue**
- If also moving uphill: (8 + 4) * 1.4 = 16.8, rounded to **17 fatigue**

### Fatigue Thresholds

| Fatigue Level | Effect |
|---|---|
| 0-50% of max | No penalty |
| 50-75% of max | -10% to melee and ranged skill |
| 75-90% of max | -20% to melee and ranged skill, -10% to defense |
| 90-100% of max | -30% to all combat stats, movement AP costs +1 |
| Max fatigue | Cannot perform any actions except **Wait** (which recovers 15 fatigue) |

### Fatigue Recovery

| Action | Fatigue Recovered |
|---|---|
| Wait (skip turn) | 15 fatigue |
| End of round (passive) | 5 fatigue (recovered at the start of each round) |
| Second Wind perk (active) | 50% of current fatigue (once per battle) |
| Fortified Mind perk (passive) | +5 fatigue recovery per round (10 total per round) |

### Tactical Implications

- **Heavy armor in difficult terrain** is extremely fatiguing. A heavily armored knight moving through a swamp will exhaust themselves in 3-4 hexes.
- **Light armor scouts** can range across the entire map without fatigue issues, making them ideal for swamp and mountain battles.
- **Pathfinder** reduces AP costs but does **not** reduce fatigue costs per hex. However, since brothers cover fewer hexes per turn without Pathfinder (running out of AP first), the effective fatigue per turn may be similar.
- Holding position and letting enemies come to you is always more fatigue-efficient than advancing.
- Road hexes are extremely valuable for rapid, low-fatigue movement.

---

## 12. Portrait Mode Considerations

The game is designed for **portrait (vertical) orientation** on mobile browsers. This fundamentally shapes how the battle map is displayed, interacted with, and scrolled.

### Screen Layout

| Screen Region | Vertical Allocation | Content |
|---|---|---|
| Top bar | ~5% | Turn counter, menu button, retreat button |
| Battle map | 50-65% | Hex grid, units, terrain |
| Unit info panel | ~15-20% | Selected unit stats, HP/fatigue bars, status effects |
| Action bar | ~15-20% | Action buttons (move, attack, skills, wait, end turn) |

The battle map occupies the **upper 50-65%** of the screen, depending on whether the unit info panel is collapsed or expanded. When no unit is selected, the map can expand to use more vertical space.

### Map Viewport and Navigation

| Control | Action |
|---|---|
| One-finger drag | Pan the map (scroll in any direction) |
| Two-finger pinch | Zoom in/out |
| Two-finger drag | Pan the map (alternative) |
| Double-tap hex | Center map on that hex |
| Double-tap unit | Select unit and center on it |

**Zoom levels:**

| Zoom Level | Hex Size (dp) | Hexes Visible (Width) | Hexes Visible (Height) | Use Case |
|---|---|---|---|---|
| Maximum zoom out | ~32dp | 10-12 | 16-20 | Full map overview, planning |
| Default / comfortable | 44-48dp | 6-8 | 10-14 | Standard gameplay, unit interaction |
| Maximum zoom in | ~64dp | 4-5 | 7-9 | Detailed inspection, precise placement |

The **minimum hex size for comfortable touch interaction** is **44-48dp** (density-independent pixels). This ensures that tapping a specific hex is reliable without accidental mis-taps. This aligns with platform accessibility guidelines (Apple recommends 44pt minimum touch targets; Material Design recommends 48dp).

### Hex Rendering at Portrait Scale

At the default zoom level on a typical mobile device (360-414dp wide viewport):

- Hex width at 48dp: ~48dp per hex
- Hexes across screen: 360dp / (48dp * 0.75) = ~10 hexes (accounting for flat-top hex overlap)
- Visible hexes horizontally: **6-8 hexes** (with partial hexes on edges)
- Visible hexes vertically: **10-14 hexes** (map area is taller than wide in portrait mode)

This means the player can see a **meaningful tactical area** without scrolling, but larger maps require panning to see the full battlefield.

### Touch Interaction Design

| Interaction | Behavior |
|---|---|
| Tap empty hex | If a unit is selected, show movement path preview. Tap again to confirm move. |
| Tap friendly unit | Select that unit. Display its info in the unit panel. Highlight movement range. |
| Tap enemy unit | If a friendly unit is selected, show attack preview (hit chance, damage range). Tap again to confirm attack. |
| Long-press hex | Show hex info tooltip (terrain type, elevation, defense bonuses). |
| Long-press unit | Show detailed unit info overlay (full stats, equipment, perks). |
| Swipe action bar | Scroll through available actions if they exceed the visible area. |

**Two-tap confirmation pattern:** All significant actions (move, attack, use skill) require **two taps** -- one to preview and one to confirm. This prevents accidental actions on a touch screen. A **cancel** button appears during the preview state.

### Camera Behavior

| Event | Camera Action |
|---|---|
| Unit selected | Smoothly pan to center the selected unit if it is near the edge of the viewport. |
| Enemy turn begins | Camera follows the active enemy unit, panning smoothly as it moves. |
| Ranged attack | Camera pans to show both attacker and target if possible. Zooms out slightly if they are far apart. |
| Deployment phase | Camera starts zoomed out to show the full deployment zone. |
| Battle start | Camera zooms to default level, centered on the player's front line. |

### Performance Considerations for Mobile

| Optimization | Details |
|---|---|
| Hex mesh instancing | All hexes of the same terrain type share a single instanced mesh. Unique per-hex data (elevation, decoration) is passed via instance buffers. |
| LOD (Level of Detail) | At maximum zoom-out, unit models switch to simplified sprites. Terrain decorations (grass tufts, small rocks) are hidden. |
| Culling | Only hexes within the current viewport (plus a 2-hex buffer) are rendered. Off-screen hexes are culled. |
| Shadow maps | Simplified or disabled on low-end devices. A toggle in settings. |
| Particle effects | Reduced particle counts on mobile. Dust, blood splatter, and spell effects use fewer particles. |
| Draw call batching | Terrain hexes are batched by type. Obstacle meshes are batched separately. Target: under 100 draw calls for the battle scene. |
| Texture atlasing | All terrain textures packed into a single 2048x2048 atlas. Unit textures in a separate atlas. |
| Frame rate target | 30 FPS minimum on mid-range devices (2022+). 60 FPS on high-end devices. |

### Responsive Scaling

The UI must handle a range of device sizes and aspect ratios.

| Device Category | Viewport Width (dp) | Hex Size (default) | Map Area Height |
|---|---|---|---|
| Small phone (SE-size) | 320-360dp | 44dp | 55% of screen |
| Standard phone | 360-414dp | 48dp | 60% of screen |
| Large phone / phablet | 414-480dp | 48dp | 60% of screen |
| Small tablet (portrait) | 600-768dp | 56dp | 65% of screen |

On tablets, the additional screen real estate is used to show more hexes at the default zoom level rather than making hexes larger, up to the 56dp maximum default size.

### Accessibility

| Feature | Details |
|---|---|
| Color-blind mode | Terrain types are distinguishable by pattern/texture in addition to color. Movement range highlights use patterns (dots, stripes) in addition to color. |
| High contrast mode | Hex borders and unit outlines are rendered with thicker, higher-contrast strokes. |
| Tap target size | Minimum 44dp ensures compliance with WCAG 2.1 Level AA touch target guidelines. |
| Zoom | Generous zoom range allows players with vision impairments to enlarge the map. |
| Text scaling | Damage numbers and UI text respect the device's system font size setting. |

---

## Appendix: Quick Reference Tables

### AP Cost Summary (All Terrain + Modifiers)

| Terrain | Base AP | + Pathfinder | + Uphill | + Pathfinder + Uphill |
|---|---|---|---|---|
| Grass / Plain | 2 | 1 | 4 | 3 |
| Forest / Trees | 3 | 2 | 5 | 4 |
| Swamp | 4 | 3 | 6 | 5 |
| Snow | 3 | 2 | 5 | 4 |
| Sand / Desert | 3 | 2 | 5 | 4 |
| Rocky / Rough | 3 | 2 | 5 | 4 |
| Shallow Water | 4 | 3 | 6 | 5 |
| Road | 1 | 1 | 3 | 3 |

### Defense Modifier Summary (All Sources)

| Source | Melee Defense | Ranged Defense | Condition |
|---|---|---|---|
| Forest hex | +0 | +15 | Standing in forest |
| Swamp hex | -10 | +0 | Standing in swamp |
| Shallow Water | -10 | +0 | Standing in shallow water |
| Fence (defending behind) | +10 | +0 | Melee attack crosses fence edge |
| Wall (adjacent, palisade) | +15 | +15 | Adjacent to wooden wall, on protected side |
| Wall (adjacent, stone) | +20 | +20 | Adjacent to stone wall, on protected side |
| Elevation +1 | +10 | +10 | Defender is 1 level higher than attacker |
| Elevation +2 | +20 | +20 | Defender is 2 levels higher than attacker |
| Surrounding (2 enemies) | -5 | +0 | 2 enemies adjacent |
| Surrounding (3 enemies) | -10 | +0 | 3 enemies adjacent |
| Surrounding (4 enemies) | -15 | +0 | 4 enemies adjacent |
| Surrounding (5 enemies) | -20 | +0 | 5 enemies adjacent |
| Surrounding (6 enemies) | -25 | +0 | 6 enemies adjacent |
| Boulder (adjacent) | +0 | +15 | Adjacent to boulder, on protected side |
| Building (adjacent) | +0 | +15 | Adjacent to building |
| Tree cover | +0 | +10 | Standing in hex with tree obstacle (non-forest) |

### Fatigue Cost Summary (All Terrain + Armor)

| Terrain | Base Fatigue | Light Armor (1.1x) | Medium (1.25x) | Heavy (1.4x) | Very Heavy (1.6x) |
|---|---|---|---|---|---|
| Grass / Plain | 4 | 4 | 5 | 6 | 6 |
| Road | 2 | 2 | 3 | 3 | 3 |
| Forest | 6 | 7 | 8 | 8 | 10 |
| Swamp | 8 | 9 | 10 | 11 | 13 |
| Snow | 6 | 7 | 8 | 8 | 10 |
| Sand | 6 | 7 | 8 | 8 | 10 |
| Rocky | 6 | 7 | 8 | 8 | 10 |
| Shallow Water | 8 | 9 | 10 | 11 | 13 |
| Uphill bonus | +4 | +4 | +5 | +6 | +6 |

*(Values are rounded to nearest integer.)*

### Night Vision Summary

| Condition | Vision Range (hexes) | Ranged Penalty |
|---|---|---|
| Day | 8-10 | None |
| Night (base) | 4-5 | -20% at edge of range |
| Night + Torch | 8-9 | -10% at edge of range |
| Night + Night Owl | 6-7 | -10% at edge of range |
| Night + Night Vision Potion | 7-8 | -10% at edge of range |
| Night + Night Owl + Torch | 10-11 | None |
