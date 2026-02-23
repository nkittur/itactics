# 04 - Overworld / Strategic Layer Design Document

This document specifies the complete design for the overworld (strategic map) layer of the game. The overworld is the primary interface between tactical battles. The player moves their mercenary company across a procedurally generated world map, visiting settlements, accepting contracts, managing their roster, and encountering enemies and events. All systems described here are implementation-ready and tuned for a mobile browser experience (portrait mode, Babylon.js).

---

## Table of Contents

1. [World Map](#1-world-map)
2. [Settlement System](#2-settlement-system)
3. [Contracts and Quests](#3-contracts-and-quests)
4. [Company Management](#4-company-management)
5. [Economy](#5-economy)
6. [Time System](#6-time-system)
7. [Reputation and Renown](#7-reputation-and-renown)
8. [Factions](#8-factions)
9. [Crisis System](#9-crisis-system)
10. [Random Events](#10-random-events)
11. [Difficulty Settings](#11-difficulty-settings)

---

## 1. World Map

### 1.1 Map Generation Overview

The world map is a procedurally generated hex-grid landmass rendered as a top-down 2.5D perspective in Babylon.js. The camera is fixed at a slight tilt (~30 degrees from vertical) to give depth while preserving readability in portrait mode. The player's company is represented by a banner token that moves along hex edges.

**Map Dimensions:**
- Small map: 120 x 80 hexes (~9,600 land hexes after ocean carving)
- Standard map: 160 x 110 hexes (~17,600 land hexes)
- Large map: 200 x 140 hexes (~28,000 land hexes)
- Default for mobile: Standard map
- Each hex represents approximately 5 km across (flat-to-flat)

**Generation Pipeline (executed once at campaign start):**

1. **Continent Shape**: Use 3-4 layered Perlin noise octaves to produce an elevation heightmap. Apply a radial falloff (elliptical, slightly taller than wide to suit portrait orientation) so the landmass is surrounded by ocean. Threshold the heightmap: values below 0.3 become ocean, 0.3-0.35 become coastal lowlands, above 0.35 become land.
2. **Mountain Spine**: Place 1-3 mountain range spines using midpoint-displacement fractal lines running roughly north-south or northeast-southwest. Mountains are hexes with elevation > 0.85. Mountain passes are gaps injected every 8-15 hexes along a range to ensure connectivity.
3. **River Placement**: Trace 4-8 rivers from high-elevation hexes downhill to the coast using A* pathfinding weighted toward lower elevation. Rivers follow hex edges (not hex centers). Rivers create natural biome boundaries and provide fresh water to adjacent hexes.
4. **Biome Assignment**: Based on a latitude band (north = cold, south = hot) combined with elevation and moisture (proximity to rivers/coast), assign each hex a biome.
5. **Settlement Placement**: Place settlements with minimum distance constraints (see Section 2).
6. **Road Network**: Generate roads connecting settlements via A* on hex grid with terrain cost weights.
7. **Enemy Camp Placement**: Scatter enemy camps (bandit, greenskin, undead, beast lairs) with density varying by biome and distance from settlements.
8. **Point of Interest Placement**: Scatter ruins, graveyards, oases, shrines, watchtowers across the map.

### 1.2 Biomes

Each hex belongs to exactly one biome. Biomes affect travel speed, encounter types, visual appearance, and settlement types.

| Biome | Elevation Range | Latitude Preference | Moisture Preference | Hex Color (Base) |
|---|---|---|---|---|
| Snow / Tundra | 0.35 - 0.70 | Northern 30% | Any | #E8E8F0 |
| Steppe | 0.35 - 0.55 | Northern 30-50% | Low (<0.3) | #C8B870 |
| Forest (Deciduous) | 0.35 - 0.65 | Central 30-70% | Medium-High (>0.4) | #2D6A2D |
| Forest (Coniferous/Taiga) | 0.35 - 0.65 | Northern 20-45% | Medium (0.3-0.5) | #1B4D1B |
| Swamp | 0.30 - 0.40 | Central 40-70% | Very High (>0.7) | #4A5D3A |
| Plains / Farmland | 0.35 - 0.55 | Central 40-70% | Medium (0.3-0.5) | #8FBC5A |
| Desert | 0.35 - 0.60 | Southern 70%+ | Very Low (<0.15) | #D4B876 |
| Mountains | >0.85 | Any | Any | #7A7A7A |
| Coastal | 0.30 - 0.35 | Any | High | #A0C0A0 |

**Biome Transition**: Adjacent hexes of different biomes use a 1-hex-wide transition zone that blends textures. This is purely visual and does not affect mechanics; the hex uses the biome it was assigned.

### 1.3 Travel Speed Modifiers

The company has a base movement speed of **40 hexes per day** (approximately 200 km/day on roads, representing forced marching by a disciplined company). This base speed is modified by terrain:

| Terrain Type | Speed Modifier | Effective Hexes/Day | Notes |
|---|---|---|---|
| Road | 100% | 40 | Paved or maintained dirt roads |
| Plains / Farmland | 85% | 34 | Open, easy terrain |
| Coastal | 80% | 32 | Sandy, uneven ground |
| Steppe | 80% | 32 | Open but rough grassland |
| Forest (Deciduous) | 55% | 22 | Dense undergrowth slows travel |
| Forest (Coniferous) | 60% | 24 | Slightly more navigable than deciduous |
| Swamp | 40% | 16 | Treacherous footing, winding paths |
| Snow / Tundra | 45% | 18 | Deep snow, bitter cold |
| Desert | 45% | 18 | Soft sand, extreme heat |
| Mountains | 0% (impassable) | 0 | Must use mountain passes |
| Mountain Pass | 30% | 12 | Narrow, winding trails |

**Movement Implementation:**
- Movement is continuous, not turn-based. The player taps a destination hex and the company moves in real-time (accelerated) along the path.
- Pathfinding uses A* with terrain cost = 1 / speed_modifier. Roads have cost 1.0, swamp has cost ~2.5, etc.
- The path is displayed as a dotted line with estimated travel time shown in hours.
- The player can interrupt movement at any time by tapping elsewhere or tapping a stop button.
- Movement consumes time (see Section 6) and may trigger encounters and events.
- When the company enters a hex, that hex and all hexes within a 3-hex radius are explored (fog of war lifted).

**Additional Speed Modifiers (Stacking, Multiplicative):**
- Night travel: x0.75 (see Section 6)
- Pathfinder perk (scout companion): x1.15
- Heavily encumbered (carrying >80% inventory capacity): x0.85
- Lightly loaded (<30% inventory capacity): x1.05
- Forced march (player-activated, costs morale): x1.25 for 8 hours, then x0.70 for next 8 hours as exhaustion penalty
- Wagon attachment (purchased upgrade): x1.10 on roads only, x0.95 off-road
- Rain weather: x0.90
- Storm weather: x0.75
- Blizzard (snow biome): x0.50

### 1.4 Roads

Roads are generated during world creation to connect settlements.

**Road Generation Algorithm:**
1. Build a minimum spanning tree of all settlements weighted by hex distance.
2. Add 20-30% additional edges (shortest non-tree edges) to create alternate routes and loops.
3. For each edge, pathfind between the two settlements using A* with terrain cost, but with an additional preference for hexes already containing roads (cost x0.5) to encourage road merging.
4. Mark each hex on the resulting path as a road hex.

**Road Properties:**
- Roads override the base terrain speed modifier to 100%.
- Roads are visually rendered as a brown/tan line connecting hex centers.
- Roads through forests create a 1-hex-wide "cleared" visual corridor.
- Roads do not prevent encounters; enemies near roads can still ambush the player.
- Some contracts involve protecting roads (patrol contracts).

### 1.5 Fog of War

The map starts mostly hidden. The player reveals terrain by exploring.

**Fog States:**
1. **Unexplored (Black)**: Hex is completely hidden. No terrain, settlement, or enemy information visible. Rendered as solid dark overlay.
2. **Explored (Dim)**: Hex has been visited or was within vision range at some point. Terrain and settlements are visible, but enemy positions are not updated (stale data). Rendered at 50% brightness with a subtle dark overlay.
3. **Visible (Clear)**: Hex is currently within the company's vision range. Full information is displayed, including enemy parties and their composition estimates. Rendered at full brightness.

**Vision Range:**
- Base company vision: 3 hexes in all directions
- On a hill hex (elevation 0.65-0.85): +2 hexes (total 5)
- In forest: -1 hex (total 2)
- In swamp: -1 hex (total 2)
- At night: -1 hex (total 2, or 1 in forest/swamp at night)
- Scout companion perk: +1 hex
- Watchtower (point of interest): reveals 6-hex radius permanently while company is within 2 hexes

**Fog of War Data:**
- Each hex stores a `lastVisitedTimestamp`.
- Enemy party positions are only accurate as of the last time the hex was visible.
- Settlements always show their last-known state (they don't move, but stock/contract data may be stale).
- The minimap (top-right corner in portrait mode) shows explored hexes in simplified color but does not reveal fog-of-war-hidden enemies.

### 1.6 Points of Interest

Scattered across the map are non-settlement locations the player can visit:

| Point of Interest | Biome Preference | Effect |
|---|---|---|
| Ancient Ruins | Any | Lootable once; may contain unique items, gold (200-800), or trigger a fight |
| Graveyard | Plains, Forest | Attracts undead; may be an undead camp spawn point |
| Shrine | Forest, Plains | One-time blessing: +5 max HP or +5 resolve to one brother for 10 days |
| Watchtower | Hills, Plains | Extends vision range when nearby (see above) |
| Oasis | Desert | Restores company water; removes desert fatigue debuff |
| Hot Springs | Snow, Mountains | Heals all brothers +10 HP; removes frostbite debuff |
| Abandoned Mine | Mountains, Hills | Lootable once; ore and gems worth 300-600 gold, or monsters |
| Hermit Hut | Forest, Swamp | Random event: may offer training, healing herbs, or cryptic quest clue |
| Battlefield | Any | Scavengeable once; 1-4 pieces of damaged equipment, bones, weapons |
| Witch's Hut | Swamp, Forest | Random event: may curse or buff a brother, sell rare consumables |

---

## 2. Settlement System

### 2.1 Settlement Types

There are three primary settlement types, each with distinct gameplay roles.

#### 2.1.1 Villages

- **Population**: 50-300 (flavor text, no direct mechanic)
- **Map Icon**: Small cluster of 2-3 buildings
- **Recruits Available**: 1-3 at any given time
- **Recruit Quality**: Mostly low-tier backgrounds (farmhand, militia, beggar, monk, messenger, miner, fisherman, daytaler, gravedigger). Occasionally (15% chance) a mid-tier background (sellsword, hedge knight, retired soldier).
- **Shop Inventory**: Basic goods only
  - Food: Grain (2 gold), Dried Meat (5 gold), Roots & Berries (1 gold)
  - Supplies: Crude Bandages (15 gold), Repair Supplies (25 gold)
  - Equipment: Pitchforks, wooden shields, padded leather, militia spears, short bows, knives
  - Equipment quality: Typically 50-120 gold value range
- **Contracts Available**: 0-2 (simple: deliver item, patrol, hunt beasts)
- **Contract Difficulty**: 1 skull only
- **Count on Map**: 8-14 (standard map)

#### 2.1.2 Cities

- **Population**: 1,000-10,000
- **Map Icon**: Large cluster with walls, towers, multiple buildings
- **Recruits Available**: 3-6+ at any given time
- **Recruit Quality**: Full range of backgrounds. Higher chance (30%) of mid/high-tier backgrounds (sellsword, hedge knight, adventurous noble, swordmaster, retired soldier, assassin, barbarian). Named characters with unique traits may appear (5% chance per recruit slot).
- **Shop Inventory**: Diverse and high-quality
  - Food: Full range including Smoked Ham (8 gold), Wine (10 gold), Provisions (4 gold), Bread (3 gold), Dried Fish (4 gold)
  - Supplies: Medicine (50 gold), Quality Bandages (30 gold), Armor Repair Kit (45 gold), Weapon Oil (20 gold)
  - Equipment: Full range from cheap to expensive. May include named/unique items (3% chance per slot). Equipment value range: 50-3,000 gold.
  - Trade Goods: Silk, Spices, Furs, Gems, Cloth, Tools, Salt, Ale (see Section 5 for trading)
- **Contracts Available**: 2-5 (full range of types)
- **Contract Difficulty**: 1-3 skulls
- **Special Features**: Arena (some cities; pay 100 gold entry, fight for 300-500 gold reward and renown), Tavern (hear rumors about locations and events, recruit), Temple (heal injuries for gold, remove curses), Taxidermist (craft trophies from monster parts)
- **Count on Map**: 4-7 (standard map)

#### 2.1.3 Fortifications (Castles / Forts)

- **Map Icon**: Castle or fortress with walls
- **Recruits Available**: 1-3 (military backgrounds: militia, man-at-arms, deserter, retired soldier, squire)
- **Shop Inventory**: Military goods
  - Weapons: Swords, crossbows, polearms, maces, military-grade equipment
  - Armor: Chainmail, plate components, helmets, kite shields
  - Supplies: Quality Repair Kits (60 gold), Military Medicine (65 gold)
  - Equipment value range: 150-2,500 gold
  - No trade goods, limited food
- **Contracts Available**: 1-3 (military: patrol, destroy camp, defend, escort)
- **Contract Difficulty**: 2-3 skulls
- **Special Features**: Training Ground (some forts; pay 200 gold to give one brother +100 XP), Armory (repair equipment at 50% normal cost)
- **Count on Map**: 3-5 (standard map)

### 2.2 Settlement Placement

**Placement Rules:**
- Minimum distance between any two settlements: 6 hexes
- Maximum distance between nearest settlements: 15 hexes (ensures no isolated gaps)
- Cities must be placed on plains, coastal, or farmland hexes
- Villages can be placed on any non-mountain, non-swamp biome
- Fortifications are placed on hills or at strategic chokepoints (mountain passes, river crossings)
- At least one settlement must be within 4 hexes of the player's starting position
- Each noble house faction controls a contiguous region containing 1-2 cities, 1-2 forts, and 3-5 villages

### 2.3 Settlement Economy and Prosperity

Each settlement has a **prosperity level** ranging from 1 (impoverished) to 5 (thriving). Prosperity affects shop quality, recruit availability, and contract rewards.

| Prosperity Level | Name | Shop Stock Multiplier | Recruit Count Modifier | Contract Reward Modifier | Visual State |
|---|---|---|---|---|---|
| 1 | Impoverished | x0.50 (fewer/worse goods) | -1 from base | x0.70 | Damaged buildings, thin smoke |
| 2 | Struggling | x0.75 | +0 | x0.85 | Worn buildings, sparse market |
| 3 | Stable | x1.00 | +0 | x1.00 | Normal appearance |
| 4 | Prosperous | x1.25 (more/better goods) | +1 | x1.15 | Busy market, well-maintained |
| 5 | Thriving | x1.50 | +2 | x1.30 | Grand market, banners, bustling |

**Prosperity Changes:**
- Completing contracts for a settlement: +0.1 to +0.3 prosperity per contract
- Defending a settlement from attack: +0.5 prosperity
- Settlement attacked (player absent): -0.5 to -1.5 prosperity
- Nearby enemy camp active (within 5 hexes): -0.05 prosperity per day
- Destroying a nearby enemy camp: +0.2 prosperity
- Trade route active (road to another settlement clear of enemies): +0.02 prosperity per day
- During a crisis: all settlements lose 0.01-0.05 prosperity per day depending on crisis proximity
- Prosperity naturally trends toward 3 (Stable) at a rate of +/- 0.01 per day

### 2.4 Shop Restocking

Shop inventories are not static. They restock on a regular cycle.

**Restocking Rules:**
- Shops restock every **2-3 days** (randomized per settlement; villages lean toward 3 days, cities toward 2 days).
- On restock, 30-60% of current stock is replaced with new randomly generated items.
- Items that have been in stock for more than 5 days get a 10% discount (clearance).
- The item pool for restocking is influenced by:
  - Settlement type (village/city/fort)
  - Prosperity level
  - Attached production buildings (see Section 2.5)
  - Current world state (crisis may restrict certain goods)
  - Faction alignment (noble house styles affect equipment aesthetics and types)
- Recruit pool restocks every **3-5 days**.
- Contract pool refreshes every **1-2 days** (contracts that expire or are completed are replaced).

### 2.5 Settlement Attachments

Each settlement has 1-3 **attachments** -- nearby production facilities that affect what goods are available and at what prices. Attachments are generated during world creation based on biome and settlement type.

| Attachment | Biome Requirement | Effect on Settlement |
|---|---|---|
| Wheat Farm | Plains, Farmland | +50% food stock; grain price -30% |
| Cattle Ranch | Plains, Steppe | Dried meat available; meat price -25% |
| Fishery | Coastal, River-adjacent | Dried fish available; fish price -30% |
| Brewery | Any (farmland preferred) | Ale/Beer available; +10% recruit count (tavern draws people) |
| Vineyard | Plains, Forest edge | Wine available; wine price -40% |
| Lumber Mill | Forest | Wood shields/spears cheaper (-20%); repair supplies -15% |
| Iron Mine | Mountains, Hills | Metal weapons/armor available; metal equipment -20% |
| Gold Mine | Mountains | Settlement prosperity +1; gold payouts +15% |
| Quarry | Mountains, Hills | Fortification-type goods available at village |
| Weaver / Tailor | Any | Cloth armor and padded equipment available; clothing -25% |
| Tannery | Forest, Plains | Leather armor available; leather equipment -20% |
| Herbalist Garden | Forest, Swamp | Medicine available; medicine price -35%; antidotes available |
| Smithy | Any (city/fort preferred) | Weapon/armor repair available at settlement; equipment durability restored for gold |
| Port / Harbor | Coastal | Trade goods from far lands (spices, silk, gems); exotic recruits (15% chance of foreign backgrounds) |
| Monastery | Any | Monk recruits; holy water available; +morale event chance |
| Hunters' Lodge | Forest, Steppe | Beast trophies bought here at 2x price; fur trade goods; ranger-type recruits |
| Military Camp | Near fort only | Military recruits +2; military equipment stock +50% |
| Slave Market | Desert, Southern cities | Cheap recruits (indentured backgrounds) with low morale but low wages; controversial reputation effects |

**Attachment Destruction:**
- Enemy raids can destroy attachments. A destroyed attachment takes 10-15 days to rebuild (happens automatically if settlement prosperity is >= 2).
- The player may receive contracts to protect or rebuild attachments.
- During crises, attachment destruction rate increases significantly.

### 2.6 Settlement Interaction UI (Mobile)

When the player taps a settlement while adjacent or inside it, a **settlement panel** slides up from the bottom of the screen (portrait mode), covering the lower 60% of the viewport. The panel has tabbed navigation:

| Tab | Icon | Contents |
|---|---|---|
| Overview | Town silhouette | Settlement name, type, prosperity bar, faction banner, attached buildings list, current mood description |
| Shop | Coin purse | Scrollable grid of items for sale; tap to inspect, buy, or sell from inventory. Filter buttons: All / Weapons / Armor / Supplies / Trade Goods |
| Recruits | Person silhouette | List of available recruits with name, background, level, and estimated stats (hidden behind a "tryout" cost of 5-20 gold to see full stats). Tap to hire. |
| Contracts | Scroll/paper | List of available contracts with skull rating, type icon, brief description, and reward range. Tap to negotiate and accept. |
| Special | Star | Available only if settlement has special features (arena, temple, taxidermist, etc.). Context-dependent UI. |

---

## 3. Contracts and Quests

### 3.1 Contract Types

Contracts are the primary source of income and narrative content. They are procedurally generated based on settlement type, world state, faction relations, and player renown.

#### 3.1.1 Caravan Escort

- **Description**: "Escort a trade caravan from [Settlement A] to [Settlement B]."
- **Skull Rating**: 1-2
- **Mechanics**:
  - A caravan NPC party spawns at Settlement A and follows the road toward Settlement B.
  - The player's company must stay within 3 hexes of the caravan at all times.
  - 1-3 ambush encounters spawn along the route at randomized points (weighted toward forest, swamp, or mountain pass hexes).
  - If the caravan is destroyed (NPC party HP reaches 0), the contract fails.
  - Travel time: typically 1-3 days depending on distance.
- **Reward**: 300-900 gold (scales with distance and skull rating)
- **Reputation Gain**: +3 to +8 with the contracting faction
- **Failure Penalty**: -5 reputation with contracting faction; no gold

#### 3.1.2 Patrol Area

- **Description**: "Patrol the roads near [Settlement] and eliminate any threats."
- **Skull Rating**: 1-2
- **Mechanics**:
  - The player must visit 3-5 designated hexes (marked on the map) within a time limit (3-5 days).
  - Each designated hex has a 40-60% chance of spawning an enemy encounter when the player arrives.
  - All designated hexes must be visited (even if no enemies spawn) to complete the contract.
  - If the time limit expires, the contract fails.
- **Reward**: 200-600 gold
- **Reputation Gain**: +2 to +5
- **Bonus**: If enemies were actually defeated during patrol, +100 gold bonus and +1 reputation

#### 3.1.3 Destroy Enemy Camp

- **Description**: "A [bandit camp / greenskin warcamp / undead lair / beast den] has been spotted near [location]. Destroy it."
- **Skull Rating**: 1-3
- **Mechanics**:
  - An enemy camp is placed on the map (or an existing camp is designated as the target).
  - The player must navigate to the camp and defeat all enemies in a tactical battle.
  - Camp difficulty scales with skull rating:
    - 1 skull: 6-8 enemies, basic equipment/types
    - 2 skull: 8-12 enemies, mid-tier equipment, some elites
    - 3 skull: 12-16+ enemies, strong equipment, named leader, possible reinforcements
  - After victory, the camp is removed from the world map and any attached loot is collected.
- **Reward**: 400-1,500 gold
- **Reputation Gain**: +4 to +10
- **Bonus Loot**: Camp loot table (weapons, armor, trade goods, gold stash: 50-300)

#### 3.1.4 Deliver Item

- **Description**: "Deliver [item] to [Settlement B]."
- **Skull Rating**: 1
- **Mechanics**:
  - A special item is added to the player's inventory (takes no space, cannot be used/sold).
  - The player must travel to Settlement B and deliver the item.
  - Time limit: 3-7 days (generous, but creates urgency for distant deliveries).
  - No guaranteed encounters, but normal travel encounters still apply.
  - Failing to deliver in time: contract fails, item is returned or lost.
- **Reward**: 150-400 gold
- **Reputation Gain**: +2 to +4
- **Notes**: Simplest contract type. Good for early game. Often used to introduce the player to new settlements.

#### 3.1.5 Hunt Beasts

- **Description**: "A [beast type] has been terrorizing the area near [location]. Track it down and kill it."
- **Skull Rating**: 1-3
- **Mechanics**:
  - A beast or group of beasts is placed in a 5-hex radius around the given location.
  - The player must find and engage the beasts. Tracking: each hex within the radius has a chance to reveal tracks (visual cue) pointing toward the beast's actual hex.
  - Beast types by skull rating:
    - 1 skull: Pack of 4-6 wolves, 2-3 direwolves, or 3-4 spiders
    - 2 skull: Lindwurm, pack of 6-8 nachzehrers, 4-5 hexen, unhold
    - 3 skull: Alpine dragon, kraken (coastal), schrat, ancient beast + minions
  - Beasts may flee after taking 50% casualties (player must pursue in a second battle).
- **Reward**: 400-1,200 gold
- **Reputation Gain**: +3 to +8
- **Bonus**: Beast trophies (crafting materials worth 50-300 gold at Hunters' Lodge or Taxidermist)

#### 3.1.6 Rescue

- **Description**: "A [person / group] has been captured by [enemy faction] and is being held at [location]. Free them."
- **Skull Rating**: 2-3
- **Mechanics**:
  - A hostage NPC is held at an enemy camp or lair.
  - The player must defeat the camp defenders in tactical battle.
  - After the battle, the hostage is recovered. If the hostage dies during the battle (they are a non-combatant placed on the map edge), the contract partially fails (50% reward, no reputation gain).
  - Time limit: 5-8 days (after which the hostage is killed and the contract automatically fails).
- **Reward**: 500-1,500 gold
- **Reputation Gain**: +5 to +12
- **Special**: If the hostage is a noble, the noble house faction grants +15 reputation bonus.

#### 3.1.7 Defend Settlement

- **Description**: "[Settlement] is under imminent attack by [enemy force]. Help defend it."
- **Skull Rating**: 2-3
- **Mechanics**:
  - A countdown timer (12-48 hours of game time) begins when the contract is accepted.
  - The player must be present at the settlement when the attack arrives.
  - The tactical battle takes place on a settlement defense map (walls, towers, chokepoints).
  - Friendly militia NPCs (4-8, weak) fight alongside the player's company.
  - Enemy force: 12-20 enemies, scaling with skull rating.
  - If the player is not present when the timer expires, the settlement is attacked without the player. The settlement's prosperity drops by 1-2 and one attachment may be destroyed.
- **Reward**: 600-2,000 gold
- **Reputation Gain**: +8 to +15
- **Bonus**: Settlement prosperity +0.5 on successful defense; shop prices -10% for 5 days as gratitude.

### 3.2 Skull Difficulty Rating

Contracts display a skull rating (1, 2, or 3) indicating difficulty relative to a baseline mercenary company.

| Skulls | Label | Expected Player Level | Enemy Count | Enemy Quality | Risk Assessment |
|---|---|---|---|---|---|
| 1 | Routine | Days 1-30, 6-8 brothers | 5-8 | Low-tier, basic gear | Low risk for prepared company |
| 2 | Challenging | Days 20-60, 8-10 brothers | 8-14 | Mid-tier, some elites | Moderate risk, expect casualties |
| 3 | Deadly | Days 40+, 10-12 brothers | 12-20+ | High-tier, leader units, named enemies | High risk, serious casualties likely |

**Skull Calculation Formula:**
```
difficulty_score = (enemy_count * avg_enemy_power) / (expected_player_power_at_renown_level)
if difficulty_score < 0.6: skulls = 1
elif difficulty_score < 1.2: skulls = 2
else: skulls = 3
```

The skull rating is an estimate, not a guarantee. Actual difficulty may vary based on enemy composition, terrain, and player preparation.

### 3.3 Payment Negotiation

When the player accepts a contract, a **negotiation phase** occurs.

**Negotiation UI:**
- A dialogue window shows the contract giver's portrait and text.
- The base reward is displayed.
- The player has three options:
  1. **Accept** (base reward)
  2. **Negotiate for more gold** (attempt to increase the reward by 15-40%)
  3. **Ask for advance payment** (receive 30-50% of the reward upfront, rest on completion)

**Negotiation Success Factors:**
```
negotiation_chance = base_50% + (renown_tier * 5%) + (faction_reputation * 2%) - (greed_modifier * 10%)
```
- `greed_modifier` increases by 1 each time the player negotiates aggressively with the same faction within 10 days (resets over time).
- On success: reward increases by 15-40% (random within range).
- On failure: the contract giver is mildly offended. The contract is still available at base reward, but the player cannot negotiate again for this contract. -1 faction reputation.
- On critical success (roll > 90%): reward increases by 40-60% and the contract giver adds a bonus item to the reward (potion, quality bandages, or a piece of equipment).

**Reputation Threshold Effects on Negotiation:**
- Below "Fledgling" renown: Cannot negotiate at all. Must accept base reward.
- "Established" renown and above: Negotiation success chance +10%.
- "Renowned" and above: Can demand payment for previously-rejected contracts that become urgent.

### 3.4 Contract Availability and Reputation

The number and quality of contracts available at a settlement depend on:

1. **Settlement Type**: Villages offer fewer (0-2), simpler contracts. Cities offer more (2-5), varied contracts. Forts offer military contracts (1-3).
2. **Player Renown**: Higher renown unlocks access to higher-skull contracts. Below "Fledgling," only 1-skull contracts appear.
3. **Faction Reputation**: Hostile factions will not offer contracts. Friendly factions offer bonus contracts and better rewards (+10-20%).
4. **World State**: During crises, crisis-related contracts dominate. Specific crisis contracts (e.g., "Defend against undead horde") replace some normal contracts.
5. **Proximity to Threats**: Settlements near enemy camps generate more destroy/patrol contracts. Settlements on trade routes generate more escort contracts.
6. **Time Since Last Visit**: Settlements the player hasn't visited in 5+ days accumulate contracts (up to the settlement's max).

---

## 4. Company Management

### 4.1 Roster

The player's mercenary company consists of **brothers** (mercenaries on the roster).

**Roster Limits:**
- **Active Roster**: Maximum **12** brothers. These are the fighters who participate in tactical battles.
- **Reserve Roster**: Up to **13 additional** brothers (total roster cap: **25**). Reserve brothers do not fight but still consume wages and food. They can be swapped into the active roster at camp (takes 1 hour of game time).
- **Minimum Roster**: The game does not enforce a minimum, but having fewer than 5 brothers triggers a "Desperate" morale penalty (-10 morale to all brothers) and a persistent tutorial/warning message.

**Roster UI (Portrait Mode):**
- The roster is displayed as a scrollable vertical list on the left side of the screen.
- Each entry shows: portrait icon, name, level, HP bar, current status icons (injured, sick, fatigued, morale indicator).
- Tapping a brother opens their full character sheet (stats, perks, equipment, traits, background, daily wage).
- Drag-and-drop (long press + drag) to reorder the roster. Order determines front-to-back formation in tactical battles.

### 4.2 Hiring

Brothers are hired from settlement recruit pools.

**Hiring Process:**
1. View recruit list at settlement (Recruits tab).
2. Each recruit shows: Name, Background, Level (usually 1, sometimes 2-3 for veteran backgrounds), a brief flavor description, and hiring cost.
3. **Tryout Cost**: Pay 5-20 gold (scales with settlement size) to reveal the recruit's base stats, traits, and talent stars before hiring. Without a tryout, only background and name are visible.
4. **Hiring Cost**: One-time fee ranging from **30 to 600 gold** depending on background.
5. After hiring, the recruit is added to the roster with their starting equipment (based on background). The player can immediately equip them from inventory.

**Hiring Costs by Background Tier:**

| Tier | Backgrounds | Hiring Cost | Daily Wage |
|---|---|---|---|
| Cheap | Beggar, Daytaler, Cripple, Indebted, Refugee | 30-60 gold | 5-8 gold/day |
| Low | Farmhand, Fisherman, Messenger, Miner, Gravedigger, Miller, Ratcatcher, Gambler | 50-100 gold | 7-11 gold/day |
| Medium | Militia, Monk, Caravan Hand, Poacher, Thief, Brawler, Juggler, Wildman | 80-180 gold | 9-15 gold/day |
| High | Sellsword, Hedge Knight, Manhunter, Raider, Assassin, Barbarian, Disowned Noble, Squire | 150-350 gold | 14-25 gold/day |
| Elite | Swordmaster, Retired Soldier, Adventurous Noble, Beast Slayer, Oathtaker, Gladiator | 300-600 gold | 20-40 gold/day |

### 4.3 Firing / Dismissing

The player can dismiss brothers from the roster at any time.

- Dismissing a brother removes them permanently from the roster.
- The dismissed brother takes their currently equipped non-player-owned items (items they were hired with). Player-purchased equipment is returned to inventory.
- Dismissing a brother causes a small morale penalty (-3 to -5) to all other brothers, scaling with how long the dismissed brother was in the company and their relationship bonds.
- Brothers with the "Loyal" trait cause a larger morale penalty (-8) when dismissed.
- Brothers cannot be dismissed during combat.

### 4.4 Daily Wages

Each brother has a daily wage that is automatically deducted from the company treasury at dawn each day.

**Wage Calculation:**
```
daily_wage = base_wage_for_background * (1 + 0.05 * (level - 1)) * mood_modifier
```
- `base_wage_for_background`: See hiring table above (5-40 gold/day range).
- Level modifier: +5% per level above 1. A level 11 brother costs 50% more than at level 1.
- `mood_modifier`: Brothers with "Content" or higher morale accept base wages. Brothers with "Wavering" morale demand +10%. Brothers with "Disgruntled" morale demand +20%. Brothers with "Deserting" morale may leave.

**Payday:**
- Wages are paid at **dawn each day** (06:00 game time).
- If the company cannot afford wages, brothers go **unpaid**.
- 1 day unpaid: -10 morale to all brothers, warning message.
- 2 consecutive days unpaid: -20 morale, brothers become "Disgruntled."
- 3+ consecutive days unpaid: Each brother has a 15% chance per day of deserting (leaving the roster, taking their equipment).
- Brothers with the "Loyal" trait tolerate 2 extra days before desertion checks begin.

### 4.5 Food Consumption

The company requires food to survive.

**Food Mechanics:**
- Each brother consumes approximately **2 food units per day** (1 unit at morning, 1 unit at evening meal).
- Food is stored in the company's shared inventory. Different food items provide different amounts of food units:

| Food Item | Shop Price | Food Units | Spoilage (Days) | Morale Effect |
|---|---|---|---|---|
| Grain | 2 gold | 2 | 15 | None |
| Roots & Berries | 1 gold | 1 | 5 | None |
| Dried Meat | 5 gold | 3 | 20 | None |
| Dried Fish | 4 gold | 2 | 18 | None |
| Bread | 3 gold | 2 | 4 | None |
| Smoked Ham | 8 gold | 4 | 12 | +2 morale when consumed |
| Provisions (Mixed) | 4 gold | 3 | 10 | None |
| Wine | 10 gold | 1 (drink) | Never | +5 morale when consumed, but -5% melee/ranged skill next day |
| Beer / Ale | 5 gold | 1 (drink) | Never | +3 morale when consumed |
| Luxury Rations | 15 gold | 3 | 8 | +4 morale when consumed |

**Food Priority System:**
- The game auto-consumes food starting with items closest to spoilage.
- The player can set a "food budget" preference: Sparse (1.5 units/brother/day, -3 morale), Normal (2 units), Generous (2.5 units, +2 morale, consumes more).

**Starvation:**
- If food runs out:
  - Day 1 without food: -15 morale to all, "Hungry" status effect (-5% to all combat stats).
  - Day 2: -25 morale, "Starving" status (-15% to all combat stats, -1 HP/hour).
  - Day 3+: Brothers begin deserting (20% chance per brother per day). HP loss increases to -3 HP/hour.

### 4.6 Morale Management

Morale is tracked individually per brother on a scale from 0 to 100, displayed as a named tier.

| Morale Range | Tier Name | Combat Effect | Other Effects |
|---|---|---|---|
| 0-10 | Fleeing | Will not fight; auto-routes in combat | Will desert at first opportunity |
| 11-25 | Deserting | -25% all combat stats | 15% daily desert chance |
| 26-40 | Disgruntled | -15% all combat stats | Demands +20% wages; may refuse orders |
| 41-55 | Wavering | -5% all combat stats | Demands +10% wages |
| 56-70 | Steady | No modifier | Normal behavior |
| 71-85 | Content | +5% all combat stats | Normal behavior |
| 86-95 | Confident | +10% all combat stats | May perform heroic actions |
| 96-100 | Euphoric | +15% all combat stats | Temporary; decays toward Confident |

**Morale Modifiers:**

*Positive:*
- Winning a battle: +5 to +15 (scales with battle difficulty)
- Good food available: +2 to +5 (based on food quality)
- Getting paid on time: +1 per day (steady trickle)
- In a settlement (resting): +3 per day
- Completing an ambition: +10 to +20 (see Section 4.7)
- Brother leveled up: +5 to that brother, +1 to all others
- Renown tier increased: +10 to all brothers
- Events (positive outcomes): varies

*Negative:*
- Losing a battle (retreating): -10 to -20
- Brother killed in battle: -5 to -15 (scales with relationship and time in company)
- Not paid wages: -10 to -20 per day
- No food: -15 to -25 per day
- In dangerous territory (near strong enemies): -2 per day
- Brother dismissed: -3 to -8
- Events (negative outcomes): varies
- Extended travel without rest (>3 days continuous): -3 per day

**Morale Decay:**
- Morale naturally drifts toward 60 (Steady) at a rate of +/-1 per day. Extreme highs decay faster; extreme lows recover slowly.

### 4.7 Ambitions System

Ambitions are company-wide goals that provide direction and morale boosts when completed.

**Ambition Selection:**
- At campaign start and after completing an ambition, the player is presented with 2-3 ambition options to choose from.
- Ambitions are context-sensitive: early ambitions are easier, later ambitions are more challenging.

**Ambition Examples:**

| Ambition | Condition | Reward |
|---|---|---|
| "Assemble a Company" | Reach 8 brothers in roster | +10 morale all, +50 gold |
| "Win Your First Contract" | Complete any contract | +10 morale all, +100 gold |
| "Equip the Company" | All active brothers have armor > 50 durability | +8 morale all, renown +100 |
| "Reach Fledgling Renown" | Renown reaches 500 | +15 morale all, unlock negotiation |
| "Destroy a Bandit Camp" | Destroy any bandit camp | +10 morale, +200 gold |
| "Amass 2,000 Gold" | Company treasury reaches 2,000 gold | +8 morale all |
| "Reach 12 Brothers" | Fill the active roster | +12 morale all, renown +200 |
| "Win a 3-Skull Contract" | Complete any 3-skull contract | +15 morale all, renown +300 |
| "Defeat a Named Enemy" | Kill a champion/boss-tier enemy | +12 morale all, +500 gold |
| "Survive a Crisis" | Complete a world crisis | +20 morale all, renown +500, unique item |

**Active Ambition:**
- Only one ambition is active at a time.
- The active ambition is displayed in the top bar of the overworld UI.
- If an ambition is not completed within 30 days, it does not fail but the player may choose to abandon it (no penalty) and pick a new one.

---

## 5. Economy

### 5.1 Income Sources

| Source | Typical Amount | Frequency | Notes |
|---|---|---|---|
| Contract Rewards | 150-2,000 gold | Per contract (1-3 per day) | Primary income |
| Battle Loot | 50-500 gold in equipment | Per battle | Equipment, weapons, trade goods from enemies |
| Loot Selling | 10-20% of item buy price | When selling | See Section 5.3 |
| Trading (Buy Low/Sell High) | 20-200 gold per transaction | Opportunistic | See Section 5.4 |
| Camp Loot | 100-800 gold | When destroying camps | Gold stash + items |
| Event Rewards | 50-300 gold | Random | Some events provide gold or items |
| Arena Winnings | 300-500 gold | Per arena fight | Cities with arenas only |

### 5.2 Expenses

| Expense | Typical Daily Cost (12 brothers) | Notes |
|---|---|---|
| Wages | 100-250 gold/day | Sum of all brothers' daily wages |
| Food | 24-60 gold/day | ~2 units/brother/day * 12 brothers * 1-2.5 gold/unit |
| Tools / Repair Supplies | 10-30 gold/day (amortized) | Equipment degrades in combat; repair kits cost 25-60 gold and last 3-5 repairs |
| Medicine / Bandages | 5-20 gold/day (amortized) | Injuries require medical supplies; 15-65 gold per use |
| Hiring Costs | 0-600 gold (one-time per recruit) | Sporadic but significant |
| Equipment Purchases | 0-3,000 gold (one-time per item) | Major investments |

### 5.3 Daily Burn Rate

The **daily burn rate** is the minimum gold the company must spend each day to survive (wages + food). This is a critical metric displayed in the company management UI.

**Example Burn Rates by Game Phase:**

| Phase | Brothers | Avg Daily Wage | Daily Food Cost | Daily Burn Rate |
|---|---|---|---|---|
| Early (Day 1-15) | 4-6 | 8 gold each = 40 | 12 food = ~15 gold | ~55 gold/day |
| Mid (Day 15-40) | 8-10 | 12 gold each = 108 | 20 food = ~30 gold | ~138 gold/day |
| Late (Day 40-80) | 12 | 18 gold each = 216 | 24 food = ~45 gold | ~261 gold/day |
| Endgame (Day 80+) | 12 (leveled) | 25 gold each = 300 | 24 food = ~45 gold | ~345 gold/day |

**Key Insight**: The player must complete roughly 1 contract per day in the early game and 1-2 per day in the late game to break even, not counting equipment costs. This creates constant forward pressure.

### 5.4 Loot Economy

Items looted from enemies sell for a fraction of their shop buy price.

**Sell Price Formula:**
```
sell_price = buy_price * sell_modifier * condition_modifier * settlement_modifier
```

- `sell_modifier`: Base 0.10 to 0.20 (10-20% of buy price). Common items sell at 10%. Rare items sell at 15%. Named/unique items sell at 20%.
- `condition_modifier`: Items at full durability sell at full sell_price. Damaged items sell for proportionally less (e.g., 50% durability = 50% of sell_price).
- `settlement_modifier`: Cities pay +10% more. Settlements with relevant attachments (smithy for weapons, tannery for leather) pay +15% more. Settlements at prosperity 4-5 pay +10% more.

**Practical Examples:**
- A Reinforced Mail Hauberk (buy: 2,500 gold) at full condition sells for 250-500 gold.
- A Crude Wooden Shield (buy: 40 gold) at full condition sells for 4-8 gold.
- A Goblin Dagger (buy: 80 gold) at 60% condition sells for 5-10 gold.

This low sell rate is intentional. It forces the player to use looted equipment rather than sell it, and it prevents a "loot farming" economy from trivializing the game's financial pressure.

### 5.5 Trading System

Some items are classified as **trade goods**. These have no direct use but can be bought at one settlement and sold at another for profit.

**Trade Goods:**

| Trade Good | Base Price | Best Buy Biome/Attachment | Best Sell Biome/Attachment | Typical Profit Margin |
|---|---|---|---|---|
| Furs | 120 gold | Snow/Tundra, Hunters' Lodge (-30%) | Desert, Southern cities (+40%) | 50-80% |
| Spices | 200 gold | Port cities, Southern (-20%) | Northern cities, inland (+50%) | 40-70% |
| Silk | 250 gold | Port cities (-25%) | Any non-coastal city (+30%) | 35-55% |
| Salt | 80 gold | Coastal, mines (-30%) | Inland settlements (+40%) | 50-70% |
| Gems | 350 gold | Gold/Iron mines (-20%) | Cities (+25%) | 25-45% |
| Cloth | 60 gold | Weavers (-35%) | Settlements without weavers (+30%) | 40-65% |
| Iron Ore | 90 gold | Iron mines (-30%) | Smithies, cities (+35%) | 45-65% |
| Ale / Beer | 40 gold | Breweries (-40%) | Settlements without breweries (+35%) | 50-75% |
| Wine | 80 gold | Vineyards (-35%) | Northern settlements (+45%) | 55-80% |
| Tools | 70 gold | Smithies (-25%) | Villages, farms (+30%) | 35-55% |
| Medicine | 100 gold | Herbalist (-35%) | Military forts, cities (+30%) | 40-65% |
| Dyes | 150 gold | Port cities (-20%) | Inland cities (+35%) | 35-55% |

**Trading Mechanics:**
- Trade goods take up inventory space (each good = 1 inventory slot).
- Company inventory has 30-50 slots (upgradeable with cart/wagon: +20 slots, costs 500 gold one-time).
- Prices fluctuate by +/- 15% randomly each restock cycle.
- Settlement prosperity affects trade good prices: high prosperity settlements buy at higher prices, low prosperity settlements sell cheaper (people are desperate).
- The player can view a "price comparison" tooltip showing the last-known price at other visited settlements.
- Trade routes are most profitable over long distances through varied biomes, creating a risk-reward tradeoff with travel time and danger.

### 5.6 Economic Difficulty Curve

The economy is designed to be **tight in the early game** and **comfortable in the late game**, with a critical transition period in the mid-game.

**Early Game (Days 1-20):**
- Starting gold: 500-800 (depending on company origin)
- Starting brothers: 3-4
- Daily burn: ~40-55 gold
- Available contracts: 1-skull, paying 150-400 gold
- Player is constantly on the edge of bankruptcy. Every hiring decision and equipment purchase is agonizing. Food management is critical.
- The player can survive approximately 10-15 days without income before going bankrupt.

**Mid Game (Days 20-50):**
- Treasury typically fluctuates between 500-2,000 gold
- Brothers: 8-10
- Daily burn: ~130-180 gold
- Available contracts: 1-2 skulls, paying 300-900 gold
- The player can sustain the company but equipment upgrades are expensive. A bad battle (losing 2-3 brothers) creates a significant financial setback from replacement costs.
- Trading becomes viable as the player knows multiple settlements.

**Late Game (Days 50+):**
- Treasury: 2,000-8,000+ gold
- Brothers: 12 (full roster, well-equipped)
- Daily burn: ~250-350 gold
- Available contracts: 2-3 skulls, paying 600-2,000 gold
- The player accumulates wealth, but crisis events and named enemy encounters provide gold sinks through equipment damage and brother replacement.
- The challenge shifts from "can I afford to survive" to "can I afford the best equipment."

---

## 6. Time System

### 6.1 Day/Night Cycle

Time in the overworld passes continuously while the company is moving or waiting. The cycle is:

| Game Time | Phase | Duration (Real Seconds at 1x Speed) | Visual State |
|---|---|---|---|
| 05:00 - 07:00 | Dawn | 12 seconds | Sky brightening, warm orange tint |
| 07:00 - 18:00 | Day | 66 seconds | Full brightness, blue sky |
| 18:00 - 20:00 | Dusk | 12 seconds | Sky darkening, red/orange tint |
| 20:00 - 05:00 | Night | 54 seconds | Dark, blue-black tint, stars visible |

**Full Day/Night Cycle**: 144 real seconds (~2.4 minutes) at 1x speed.

**Time Speed Controls:**
- **1x**: Normal speed. 1 game day = ~2.4 real minutes.
- **2x**: Accelerated. 1 game day = ~1.2 real minutes.
- **4x**: Fast. 1 game day = ~36 real seconds. (Default while traveling long distances.)
- **Pause**: Time stops. Player can manage inventory, roster, and plan routes.

Time automatically pauses when:
- An encounter triggers (enemy spotted within engagement range)
- The player arrives at a settlement
- A random event fires
- Dawn arrives (daily wage/food consumption notification)
- A contract deadline is within 6 hours

### 6.2 Night Travel

Traveling at night carries penalties:

- **Speed Reduction**: x0.75 movement speed modifier (multiplicative with terrain)
- **Vision Range**: -1 hex (minimum 1 hex)
- **Ambush Chance**: +20% chance that enemies get a surprise round in tactical combat (they get to act first)
- **Morale**: No direct penalty for night travel, but brothers accumulate fatigue faster

**Making Camp:**
- The player can choose to "Make Camp" at any time via a button in the bottom toolbar.
- Camping pauses travel and advances time at normal speed. Brothers rest, heal, and eat.
- Camping is the only way to access certain management features: swap active/reserve brothers, craft items (if applicable), detailed equipment management.
- The player can set a "Break Camp" time (e.g., "Camp until dawn," "Camp for 4 hours," "Camp until healed").
- While camped, the company can still be attacked (reduced chance, but enemies on adjacent hexes may raid the camp).

### 6.3 Healing Over Time

Brothers heal naturally while alive (in camp or traveling).

**HP Recovery:**
- Base HP recovery: **3 HP per day** (passive, always active)
- Resting in camp: **5 HP per day** (increased rate while camped)
- Resting in a settlement: **8 HP per day**
- With Medicine item consumed: +3 HP/day bonus for 2 days
- With "Iron Lungs" or "Resilient" trait: +1 HP/day bonus
- With an active injury: HP recovery is halved until the injury heals

### 6.4 Injury Healing

When a brother takes significant damage in combat (below certain HP thresholds or from specific attack types), they may receive an **injury**. Injuries impose stat penalties and take time to heal.

**Injury Healing Times:**

| Injury Severity | Examples | Healing Time | Stat Penalty While Active |
|---|---|---|---|
| Light | Bruised Ribs, Grazed, Cut Arm | 2-3 days | -5% to one stat |
| Moderate | Deep Wound, Fractured Hand, Concussion | 4-5 days | -10 to -15% to 1-2 stats |
| Severe | Broken Arm, Pierced Lung, Smashed Jaw | 6-8 days | -20 to -30% to 2-3 stats |
| Permanent | Lost Eye, Missing Finger, Brain Damage | Permanent | -5 to -15% to 1 stat forever |

**Injury Healing Modifiers:**
- Resting in settlement: Healing time reduced by 25%
- Temple healing (pay 100-300 gold): Immediately heal one injury (except permanent)
- Medicine item: Healing time reduced by 1 day per application
- "Tough" trait: Injury healing time reduced by 20%
- Permanent injuries never heal but can sometimes be mitigated by equipment (e.g., an eyepatch for Lost Eye gives +5 resolve)

### 6.5 Shop Restocking Schedule

- **Equipment shops**: Restock every 2-3 days (see Section 2.4)
- **Recruit pool**: Refreshes every 3-5 days
- **Contract board**: Refreshes every 1-2 days
- **Trade goods**: Restock every 2-3 days; prices recalculate on each restock
- **Food stock**: Restocks daily at settlements with food-producing attachments, every 2 days otherwise

---

## 7. Reputation and Renown

### 7.1 Renown

Renown is a single global number representing the mercenary company's fame. It determines what contracts, recruits, and events are available.

**Renown Tiers:**

| Tier | Renown Range | Effects |
|---|---|---|
| No-name | 0 - 499 | Only 1-skull contracts available. Settlements may refuse to deal. Recruits are suspicious (-5 starting morale). Cannot negotiate contract payment. |
| Fledgling | 500 - 999 | 1-2 skull contracts available. Payment negotiation unlocked. Settlements treat company normally. Basic backgrounds available for hire. |
| Established | 1,000 - 1,999 | 2-skull contracts reliably available. Negotiation success +10%. Mid-tier recruit backgrounds appear more frequently. Noble houses take notice (faction quests available). |
| Professional | 2,000 - 3,499 | 2-3 skull contracts available. Negotiation success +15%. High-tier recruit backgrounds appear. Faction alliance quests available. Some settlements offer discounts (-5% shop prices). |
| Renowned | 3,500 - 5,499 | All contract tiers available. Negotiation success +20%. Elite recruits appear. Noble houses seek the company for crisis contracts. Named enemies begin targeting the company. Tavern rumors reference the company by name. |
| Legendary | 5,500+ | Maximum contract rewards (+15% all rewards). Named enemies actively hunt the company. Unique legendary contracts appear. The company's banner is displayed on the world map. All factions have strong opinions (no neutral; either friendly or hostile). |

**Renown Sources:**

| Action | Renown Gained |
|---|---|
| Complete 1-skull contract | +15 to +25 |
| Complete 2-skull contract | +30 to +50 |
| Complete 3-skull contract | +60 to +100 |
| Win a difficult battle (outnumbered) | +10 to +30 bonus |
| Destroy an enemy camp | +20 to +40 |
| Defend a settlement | +30 to +60 |
| Complete a crisis event | +100 to +200 |
| Arena victory | +15 to +25 |
| Lose a battle (retreat) | -10 to -20 |
| Fail a contract | -15 to -30 |
| Brother deserts | -5 |
| Day passes without notable action | -1 per day (renown decays slowly) |

**Renown Decay:**
- Renown decays at -1 per day if the company has not completed a contract or won a battle in the last 2 days. This prevents the player from reaching a high tier and coasting.
- Maximum decay rate: -3 per day after 5 consecutive days of inactivity.
- Renown cannot decay below the bottom of the current tier minus 50 (provides a buffer).

### 7.2 Faction Reputation

The player has a separate reputation score with each major faction. This score ranges from -100 (blood enemies) to +100 (devoted allies).

**Reputation Tiers:**

| Range | Tier | Effects |
|---|---|---|
| -100 to -60 | Hostile | Faction's armed forces attack the player on sight. No access to faction settlements. Bounty hunters may be sent. |
| -59 to -20 | Unfriendly | No contracts from this faction. Shop prices +25% at faction settlements. Faction patrols may demand tolls (50-200 gold) or attack. |
| -19 to +19 | Neutral | Normal dealings. Standard contracts and prices. |
| +20 to +59 | Friendly | +10% contract rewards. Shop prices -5%. Additional contracts available. Faction settlements share rumors freely. |
| +60 to +89 | Allied | +20% contract rewards. Shop prices -10%. Access to faction-exclusive equipment. Faction patrols assist the player in nearby battles. |
| +90 to +100 | Devoted | +30% contract rewards. Shop prices -15%. Free healing at faction settlements. Faction provides free recruits (1 per week). Unique faction quest line unlocked. |

**Reputation Changes:**

| Action | Reputation Change |
|---|---|
| Complete contract for faction | +3 to +12 (scales with difficulty) |
| Defend faction settlement | +10 to +20 |
| Destroy enemy camp threatening faction | +5 to +10 |
| Fail contract for faction | -5 to -10 |
| Attack faction caravan/patrol | -20 to -40 |
| Assist rival faction during war | -10 to -15 with opposing faction |
| Complete faction-exclusive quest | +15 to +25 |
| Trade goods delivered to faction | +1 per transaction |
| Time passing (neutral drift) | +/- 1 per 5 days toward 0 |

---

## 8. Factions

### 8.1 Noble Houses

Three noble houses control the civilized lands. Each has a distinct visual style, territory, and personality.

#### 8.1.1 House Valmark (Northern)

- **Territory**: Northern portion of the map (snow, tundra, coniferous forest)
- **Visual Style**: Blue and silver banners, fur-lined armor, axe and shield iconography
- **Personality**: Honorable, martial, direct
- **Settlements**: 1-2 cities, 1-2 forts, 3-4 villages
- **Unique Troops**: Northern Knights (heavy armor, two-handed axes), Shieldwall Infantry
- **Unique Equipment**: Fur-lined Mail, Northern Greatsword, Valmark Tower Shield
- **Trade Focus**: Furs, Iron Ore, Ale
- **Favored Contracts**: Destroy camps, hunt beasts, defend settlements

#### 8.1.2 House Demarion (Central)

- **Territory**: Central region (plains, farmland, deciduous forest)
- **Visual Style**: Gold and green banners, plate armor, crossed swords iconography
- **Personality**: Diplomatic, wealthy, mercantile
- **Settlements**: 2 cities (including the largest on the map), 1 fort, 4-5 villages
- **Unique Troops**: Royal Guard (elite swordsmen), Crossbow Militia
- **Unique Equipment**: Gilded Plate, Courtly Sword, Merchant's Coif
- **Trade Focus**: Cloth, Tools, Grain, Wine
- **Favored Contracts**: Escort caravans, deliver items, patrol trade routes

#### 8.1.3 House Korrath (Southern)

- **Territory**: Southern region (steppe, desert edge, coastal)
- **Visual Style**: Red and black banners, lamellar armor, crescent moon iconography
- **Personality**: Aggressive, expansionist, ruthless
- **Settlements**: 1-2 cities, 2 forts (more militarized), 3-4 villages
- **Unique Troops**: Desert Riders (mounted skirmishers), Korrath Spearmen
- **Unique Equipment**: Lamellar Armor, Curved Scimitar, Korrath Buckler
- **Trade Focus**: Spices, Gems, Silk, Salt
- **Favored Contracts**: Destroy camps, rescue prisoners, offensive missions against rivals

### 8.2 Non-Noble Factions

#### 8.2.1 Bandits

- **Territory**: No fixed territory. Bandit camps spawn in forests, hills, and along roads.
- **Composition**: Thugs, Raiders, Poachers, Bandit Leaders. Occasionally includes deserters with military equipment.
- **Behavior**: Prey on caravans and weak parties. Avoid large armies. Grow in strength if left unchecked.
- **Camp Types**: Small hideout (4-6 bandits), Raider camp (8-12), Bandit fortress (14-20, rare, has wooden walls).
- **Loot Quality**: Low to medium. Some gold stashes, stolen trade goods, basic weapons/armor.
- **Faction Reputation**: No formal reputation. Bandits are always hostile. Destroying bandit camps improves reputation with all noble houses (+2 each).

#### 8.2.2 Greenskins (Orcs & Goblins)

- **Territory**: Wilderness areas, especially steppe, forest, and mountain foothills. Camps spawn in clusters.
- **Composition**:
  - *Goblins*: Scouts, Ambushers, Shamans, Wolf Riders. Numerous but weak. Use poison and nets.
  - *Orcs*: Young Orcs, Warriors, Berserkers, Warlords. Fewer but extremely tough. High HP, heavy damage.
- **Behavior**: Raid settlements periodically. Orcs and goblins often operate separately but unite during the Greenskin Invasion crisis.
- **Camp Types**: Goblin tunnels (6-10 goblins), Orc camp (4-8 orcs), Combined warcamp (8 orcs + 6 goblins), Fortress (12+ orcs, siege equipment, crisis only).
- **Loot Quality**: Orc weapons are crude but heavy-damage. Goblin equipment is light and poisoned. Some unique crafting trophies (orc trophy = +10 resolve accessory).

#### 8.2.3 Undead

- **Territory**: Spawn near graveyards, ancient ruins, cursed hexes. More common in swamps and old battlefields.
- **Composition**:
  - *Zombies (Wiederganger)*: Slow, numerous, moderate damage. Can rise from corpses mid-battle.
  - *Skeletons*: Fast, fragile, equipped with ancient weapons/armor (sometimes high quality).
  - *Vampires*: Rare, extremely powerful. High stats, life drain, charm abilities.
  - *Necromancers*: Support units that raise dead and buff undead. Priority targets.
  - *Ghosts (Geists)*: Screamers that cause morale damage. No physical form; immune to melee.
- **Behavior**: Undead patrol at night. During the day, they retreat to lairs. Their camps grow over time if not destroyed (spreading "cursed ground" hexes).
- **Loot Quality**: Ancient armor and weapons (sometimes high-value). Undead drop no gold. Necromancers may drop spellbooks (trade goods, 200-400 gold).

#### 8.2.4 Barbarians

- **Territory**: Northern and steppe regions. Semi-nomadic; camps move every 5-10 days.
- **Composition**: Thralls (light), Warriors (medium), Champions (heavy, two-handed), Drummers (buff allies), Chosen (elite, very strong).
- **Behavior**: Raid northern settlements. Occasionally send war parties deep into civilized lands.
- **Loot Quality**: Medium. Good quality two-handed weapons, light/medium armor, furs, gold.

#### 8.2.5 Nomads

- **Territory**: Southern desert and steppe.
- **Composition**: Outlaws (light skirmishers), Warriors (medium, curved swords), Assassins (stealth, poison), Overseers (heavy, shields).
- **Behavior**: Control desert trade routes. May be hired as mercenaries by House Korrath during Noble War crisis.
- **Loot Quality**: Medium to high. Curved weapons, lamellar armor, spices, gems.

#### 8.2.6 Southern City-States

- **Territory**: Far southern edge of the map (if map extends that far). 1-2 wealthy trading cities.
- **Composition**: City Guard (polearms), Gladiators (heavy melee), Slavers (nets, whips), Slingers (ranged).
- **Behavior**: Generally neutral trade partners. May offer exotic contracts (escort treasure caravan, arena challenges).
- **Special**: Source of exotic trade goods (silk, spices, gems at best prices) and rare recruits (gladiator background).

### 8.3 How Wars Work

Factions can go to war with each other. Wars affect the overworld dynamically.

**War Triggers:**
- Scripted: The Noble War crisis forces two or more noble houses into war.
- Dynamic: If two factions' reputation with each other drops below -40 (tracked internally), border skirmishes begin. If it drops below -70, full war.
- Player-influenced: Completing many contracts for one faction while ignoring another can shift internal faction relations.

**War Mechanics:**
- During war, faction armies (NPC parties of 10-20 soldiers) spawn from fortifications and march toward enemy settlements.
- Armies will engage each other if they meet on the overworld map (resolved automatically: larger army with better troops wins, loser is destroyed or retreats).
- If an army reaches an enemy settlement, it besieges it: settlement loses 0.3 prosperity per day, shops close, no recruits, no contracts.
- After 5-10 days of siege, the settlement may change faction ownership (50% chance; otherwise the siege is broken by a relief army).
- The player can participate in war battles (side with one faction). Winning a war battle grants +15-25 reputation with the allied faction, -15-25 with the enemy.
- War contracts appear at faction settlements: "Defeat [Enemy Faction] army," "Break the siege of [Settlement]," "Escort supply caravan to besieged [Settlement]." These are among the highest-paying contracts (1,000-3,000 gold).
- Wars end when one faction's military strength drops below 30% (they sue for peace) or after 20-30 days. A peace treaty is signed, and faction relations reset to -20.

---

## 9. Crisis System

### 9.1 Overview

Crises are world-altering events that dramatically change the overworld for a period. Exactly **one crisis** occurs per campaign (in a standard-length game; endless mode may cycle through all three). The crisis is selected based on the world seed or randomly at trigger time.

### 9.2 Crisis Triggers

A crisis triggers when **all** of the following conditions are met:
- Game day >= **70** (minimum; can be 60-100 depending on difficulty setting)
- Player renown >= **1,500** (Established tier or higher)
- No other crisis is currently active
- At least 3 settlements have prosperity >= 3

Once triggered, there is a **warning phase** (7-14 days) during which rumors and events foreshadow the crisis. Then the **active phase** begins.

### 9.3 Greenskin Invasion

**Theme**: United orc and goblin tribes launch a massive assault on civilized lands.

**Warning Phase (10 days):**
- Tavern rumors mention "greenskin clans gathering," "warboss uniting the tribes."
- Greenskin camp spawn rate doubles. Existing camps grow in size.
- Random events: "Refugees fleeing greenskin raids" (can recruit desperate refugees as cheap brothers).

**Active Phase (30-45 days):**
- 3-5 **Greenskin Warcamps** spawn on the map edge and begin marching toward settlements.
- Each warcamp is a massive enemy force (20-30 greenskins including a named Warboss).
- Warcamps leave behind "raided" hexes as they move (scorched terrain, -2 to any settlement prosperity they pass near).
- Noble house factions shift to "defensive" mode. All faction contracts become defense-oriented.
- Settlement prosperity across the map drops by 0.05 per day.

**Crisis Contracts:**
- "Defeat Greenskin Warcamp" -- 3-skull, 1,500-2,500 gold, +80 renown
- "Defend [Settlement] from Greenskin Assault" -- 2-3 skull, 1,000-2,000 gold, +60 renown
- "Scout Greenskin Movements" -- 1 skull, 400-600 gold (reveal warcamp positions on map)
- "Rescue Prisoners from Greenskin Camp" -- 2 skull, 800-1,200 gold

**Resolution:**
- The crisis ends when 3 of the 5 warcamps are destroyed (by the player or by faction armies, though faction armies are weaker and likely to fail without player help).
- If the crisis is not resolved within 45 days, 1-3 settlements are permanently destroyed (reduced to ruins, no longer functional).
- On resolution: +200 renown, +20 reputation with all noble houses, unique reward item (Orc Warboss Trophy -- accessory granting +15 resolve and +5 melee defense).

### 9.4 Undead Scourge

**Theme**: A dark power awakens, and the dead rise across the land.

**Warning Phase (14 days):**
- Rumors: "The dead do not rest," "strange lights in the graveyard," "a chill that won't lift."
- Undead spawn rate triples. Graveyards become active undead spawn points.
- Night becomes longer (night phase extends to 16:00-06:00, reducing daytime to 10 hours).
- Random events: Brothers have nightmares (-5 morale), village graveyards erupt (settlement attacked by undead).

**Active Phase (30-40 days):**
- **Cursed Ground** spreads from graveyards and ruins at a rate of 1 hex per 2 days. Cursed hexes have a green-black tint, spawn undead patrols, and halve travel speed.
- 2-4 **Necromancer Towers** appear on the map. Each tower generates a constant stream of undead patrols (1 patrol of 8-12 undead every 2 days). Towers are defended by a Necromancer Lord and 15-25 undead.
- If a brother dies during the crisis, there is a 30% chance they rise as a hostile undead in a future battle (narrative event, not mechanical -- the player faces a "zombie" version of their fallen brother).
- All settlements lose -0.03 prosperity per day. Settlements adjacent to cursed ground lose -0.1 per day.
- Night encounters become more frequent (+50%).

**Crisis Contracts:**
- "Destroy Necromancer Tower" -- 3 skull, 1,500-2,500 gold, +80 renown
- "Cleanse Cursed Ground" (escort a priest to a cursed hex) -- 2 skull, 800-1,200 gold
- "Defend Graveyard" (prevent undead from rising) -- 2 skull, 600-1,000 gold
- "Obtain Holy Relic" (travel to shrine/temple, retrieve relic that weakens undead in nearby hexes) -- 1-2 skull, 500-800 gold

**Resolution:**
- The crisis ends when all Necromancer Towers are destroyed.
- Cursed ground slowly recedes after resolution (1 hex per day).
- On resolution: +200 renown, unique item (Blessed Medallion -- accessory granting immunity to fear effects and +10% damage vs undead).

### 9.5 Noble War

**Theme**: Two (or all three) noble houses go to war, tearing the realm apart.

**Warning Phase (7 days):**
- Rumors: "Tensions rising between [House A] and [House B]," "armies mustering at the border."
- Noble house patrols increase. Border settlements raise prices (+10%).
- The player may receive a "choose a side" event (optional; can remain neutral).

**Active Phase (30-50 days):**
- Two (or three, for a three-way war) noble houses declare war.
- Faction armies spawn and march toward enemy settlements (see Section 8.3).
- The player can take contracts from any side (but doing so damages reputation with the opposing side).
- Neutral settlements (independent villages) may be caught in the crossfire.
- Bandit activity increases dramatically (+100% spawn rate) as bandits exploit the chaos.
- Road patrols by noble houses decrease, making roads more dangerous.

**Crisis Contracts:**
- "Defeat [Enemy House] Army" -- 2-3 skull, 1,000-3,000 gold, +80 renown
- "Break Siege of [Settlement]" -- 3 skull, 1,500-2,500 gold
- "Escort War Supplies to [Settlement]" -- 1-2 skull, 600-1,200 gold
- "Sabotage [Enemy House] Supply Line" (destroy designated supply caravan) -- 2 skull, 800-1,500 gold
- "Protect Neutral Village from Raiding Party" -- 1-2 skull, 400-800 gold

**Resolution:**
- The crisis ends when one house surrenders (military strength < 30%) or after 50 days (ceasefire).
- The losing house permanently loses 1-2 settlements (they become independent or are absorbed by the winner).
- Faction reputations shift dramatically based on the player's actions during the war.
- On resolution: +200 renown, +30 reputation with allied faction (if any), unique item (War Veteran's Cloak -- armor attachment granting +10 resolve and +5% XP gain).

---

## 10. Random Events

### 10.1 Overview

Random events are narrative encounters with mechanical consequences that fire at semi-random intervals during overworld play. They provide flavor, create memorable moments, and force interesting decisions.

**Event Frequency:**
- Average: **1-3 events per game day**
- While traveling: 1 event per 6-10 hexes traveled (weighted by biome danger)
- While camped: 1 event per 4-8 hours
- While in settlement: 1 event per visit (on first entry or after 12+ hours)
- Events have a minimum cooldown of 2 hours between triggers to prevent fatigue.

**Event UI:**
- Events display as a pop-up panel with:
  - Illustration (a themed image: campfire scene, settlement street, wilderness vista)
  - Narrative text (2-4 paragraphs)
  - 2-4 choice buttons with brief descriptions of the action and any visible consequences

### 10.2 Camp Events

Triggered while the company is camped or resting.

#### Example: "Rivalry in the Ranks"

> *Two of your brothers, [Brother A] and [Brother B], have been at each other's throats for days. Tonight, the argument turns physical. The rest of the company watches uneasily.*

**Choices:**
1. **Let them fight it out.** -- The two brothers brawl. Winner gains +8 morale and the "Tough" trait for 5 days. Loser takes 10-20 damage and gains -8 morale. Other brothers are unaffected.
2. **Break it up and discipline both.** -- Both brothers lose -5 morale. All other brothers gain +3 morale (company discipline maintained). The rivalry ends.
3. **Dismiss one of them.** -- Choose which brother to dismiss. The remaining brother gains +10 morale. All other brothers lose -3 morale (unease about being dismissed).

#### Example: "A Merchant at Camp"

> *A traveling merchant stumbles upon your camp, tired and grateful for company. He offers to trade some of his wares.*

**Choices:**
1. **Trade with him.** -- Opens a small random shop (3-5 items: food, bandages, 1 piece of equipment, 1 trade good). Prices are 10% higher than settlement prices.
2. **Rob him.** -- Gain 100-200 gold and 2-3 random items. -5 morale to brothers with "Honest" or "Devout" traits. If the merchant escapes (30% chance), reputation with nearest faction -5.
3. **Offer him food and protection.** -- Lose 5 food units. Gain +3 morale to all brothers. The merchant shares a rumor (reveals a nearby point of interest or enemy camp on the map).

#### Example: "Strange Mushrooms"

> *While foraging around camp, one of your brothers finds a patch of unusual mushrooms growing in a ring.*

**Choices:**
1. **Eat them.** -- 50% chance: The mushrooms are nutritious. Gain 10 food units. 30% chance: Hallucinogenic. Affected brother gains +10 morale but has -10% melee/ranged skill for 2 days. 20% chance: Poisonous. Affected brother takes 15 damage and gains "Nausea" injury (3 days, -10% all stats).
2. **Leave them.** -- Nothing happens.
3. **Collect and sell them later.** -- Gain "Strange Mushrooms" trade good (worth 30-80 gold at an Herbalist settlement, 10 gold elsewhere).

### 10.3 Settlement Events

Triggered when entering or spending time in a settlement.

#### Example: "The Tavern Brawl"

> *Your brothers are enjoying a night at the local tavern when a group of locals takes offense to their presence. Chairs are thrown.*

**Choices:**
1. **Join the brawl!** -- 2-3 brothers take 5-10 damage each. +5 morale to all brothers. 30% chance the tavern owner demands compensation (50 gold) or faction reputation -3.
2. **Pull your brothers out.** -- -3 morale to all (seen as cowardly by some). No other consequences.
3. **Buy the house a round.** -- Pay 30-50 gold. +8 morale to all brothers. +2 reputation with local faction. Tavern owner shares a rumor.

#### Example: "A Desperate Plea"

> *A tearful villager approaches your company in the street. Their child has been taken by [beasts/bandits/undead] and they beg for help. They have little to offer in reward.*

**Choices:**
1. **Accept the task.** -- A miniature rescue contract activates (no formal contract, 1-skull difficulty). On success: +5 morale to all brothers, +5 local faction reputation, 50-100 gold reward (the villager scrapes together what they can). On failure: -3 morale.
2. **Decline.** -- -2 morale to brothers with "Compassionate" trait. No other consequences.
3. **Demand proper payment first.** -- The villager offers their family heirloom (a piece of equipment worth 100-300 gold). Contract activates as above, but with the heirloom as guaranteed reward.

#### Example: "The Recruiter's Offer"

> *A well-dressed man approaches your company. He represents a [noble house / merchant guild]. He offers a retainer: regular gold payments in exchange for priority on contracts.*

**Choices:**
1. **Accept the retainer.** -- Receive 200-500 gold upfront and +50 gold per week for 30 days. During those 30 days, 50% of your contracts must be from the sponsoring faction. Faction reputation +10.
2. **Decline politely.** -- No consequences.
3. **Negotiate better terms.** -- Negotiation check (see Section 3.3). On success: retainer is doubled. On failure: the offer is withdrawn.

### 10.4 Travel Events

Triggered while moving across the map.

#### Example: "Crossroads Ambush"

> *As your company marches along the road, you spot signs of an ambush ahead. Broken branches, fresh tracks, a disturbed bush...*

**Choices:**
1. **Spring the trap deliberately.** -- Battle begins with the player's company in formation (no surprise penalty). Enemy is a small bandit/beast party (4-6 enemies). Reward: loot from enemies.
2. **Go around.** -- Lose 2-4 hours of travel time (detour). Avoid the encounter entirely.
3. **Send a scout ahead.** -- If a brother has the "Scout" background or Pathfinder perk: automatically detect and avoid the ambush (no penalty). Otherwise: 50% chance the scout is detected and the ambush triggers with the scout separated from the party (they deploy alone on one side of the tactical map).

#### Example: "Abandoned Cart"

> *You come across a merchant's cart, abandoned on the road. The horses are gone. The cart appears undamaged.*

**Choices:**
1. **Search the cart.** -- 60% chance: Find 50-150 gold and 2-3 trade goods or supplies. 25% chance: The cart is trapped. 1 brother takes 10-20 damage (trap). Still find 30-80 gold. 15% chance: The cart is bait. Battle triggers (6-8 bandits ambush).
2. **Leave it.** -- Nothing happens.
3. **Take the whole cart.** -- If you have room: gain a "Salvaged Cart" (functions as +10 inventory slots until sold for 100 gold). Cart slows movement by 5%.

#### Example: "The Burning Village"

> *Smoke rises from a village ahead. As you approach, you see it's being raided by [bandits / greenskins / undead].*

**Choices:**
1. **Rush to help!** -- Battle begins immediately (no preparation time, but you get to choose formation). Enemy: 8-12 enemies appropriate to the biome. Friendly militia NPCs (3-4) fight alongside. On victory: +10 renown, +10 local faction reputation, +0.5 settlement prosperity, 100-300 gold reward from grateful survivors.
2. **Observe and wait.** -- The village is destroyed. -0.5 settlement prosperity. No combat. You can loot the aftermath (50-100 gold, some damaged equipment).
3. **It's none of your business.** -- Move on. -3 morale to brothers with positive traits. Settlement prosperity -1. Nearby faction reputation -5.

### 10.5 Special / Rare Events

These events fire infrequently (once per campaign or once per certain conditions) and have significant consequences.

#### Example: "The Deserter"

> *A lone soldier in battered armor approaches your camp. He claims to be a deserter from [noble house] army. He begs to join your company, offering to serve for reduced wages.*

**Choices:**
1. **Hire him.** -- Gain a free recruit (no hiring cost). He is a level 3-5 Soldier with mid-tier equipment. However: there is a 20% chance he is a spy. If he is a spy, after 5-10 days, he steals 100-300 gold and equipment and flees. -5 faction reputation with the house he "deserted" from (they blame you for harboring a spy). If he is genuine: he becomes a loyal brother with a +5 morale bonus for the first 20 days.
2. **Turn him away.** -- No consequences.
3. **Turn him in to the nearest [noble house] fort.** -- +10 reputation with that faction. 100 gold reward. The deserter is executed (narrative text).

#### Example: "Eclipse"

> *The sky darkens as a solar eclipse passes overhead. Your brothers grow uneasy.*

**Choices:** (None; this is a pure narrative event)
- All brothers lose -5 morale temporarily (recovers over 2 days).
- Undead activity spikes for the next 3 days (+50% spawn rate).
- A unique shrine appears on the map within 10 hexes (marked). Visiting it grants a permanent +3 resolve to one brother.

---

## 11. Difficulty Settings

### 11.1 Combat Difficulty

Affects enemy strength, AI intelligence, and player advantages in tactical combat.

#### Beginner

- Enemy HP: -15%
- Enemy damage: -15%
- Enemy morale: -20% (they flee sooner)
- Player brothers start with +5 HP and +5 to melee/ranged defense
- Injuries are 25% less severe (shorter healing times)
- Enemy AI makes more mistakes (suboptimal targeting, less flanking)
- Retreat is always available (no pursuit mechanic)

#### Veteran (Default)

- All values at baseline (100%)
- Standard AI behavior
- Standard injury severity
- Retreat is available but enemies may pursue (50% chance of losing 1-2 brothers during retreat)

#### Expert

- Enemy HP: +10%
- Enemy damage: +10%
- Enemy morale: +15% (they fight harder, longer)
- Player brothers start with baseline stats (no bonus)
- Injuries are 15% more severe (longer healing times, higher chance of permanent injury)
- Enemy AI is smarter: prioritizes vulnerable targets, flanks more, uses terrain advantages, focuses fire on injured brothers
- Retreat is dangerous: 80% chance of losing 1-3 brothers during retreat; enemies pursue for 2 hexes on the overworld

### 11.2 Economic Difficulty

Affects income, expenses, and the financial pressure on the player.

#### Beginner

- Starting gold: +50% (750-1,200 gold)
- Contract rewards: +20%
- Shop prices: -15%
- Sell prices: +30% (items sell for 13-26% of buy price instead of 10-20%)
- Daily wages: -15%
- Food consumption: -20% (1.6 food units/brother/day)
- Repair costs: -20%
- Hiring costs: -20%
- Trading profit margins: +15%
- Starting equipment quality: Improved (all starting brothers have at least leather armor and a decent weapon)

#### Veteran (Default)

- All values at baseline (100%)
- Starting gold: 500-800 gold
- Standard pricing and consumption

#### Expert

- Starting gold: -25% (375-600 gold)
- Contract rewards: -15%
- Shop prices: +15%
- Sell prices: -25% (items sell for 7.5-15% of buy price)
- Daily wages: +15%
- Food consumption: +15% (2.3 food units/brother/day)
- Repair costs: +20%
- Hiring costs: +20%
- Trading profit margins: -10%
- Starting equipment quality: Reduced (starting brothers have minimal gear)
- Settlement restock timer: +1 day (shops restock less frequently)

### 11.3 Ironman Mode

An optional toggle that can be combined with any combat/economic difficulty pair.

**Rules:**
- **Single save slot**: The game auto-saves after every significant action (entering combat, arriving at settlement, completing a contract, at dawn each day). The player cannot manually save or load.
- **No reloading**: If the player closes the game, they resume from the last auto-save. There is no way to "undo" a battle or decision.
- **Permadeath is absolute**: Dead brothers are gone. Failed contracts are failed. Lost gold is lost.
- **Game over on wipe**: If all brothers die, the campaign ends. A "Company Epitaph" screen shows statistics (days survived, battles fought, gold earned, enemies killed, brothers lost) and a short narrative summary.
- **Save integrity**: The save file includes a checksum to prevent tampering. If the checksum fails, the save is marked as "tainted" and the ironman achievement is voided (the player can still play, but it no longer counts as ironman).

### 11.4 Difficulty Presets

For convenience, the game offers three named presets:

| Preset | Combat | Economic | Ironman | Description |
|---|---|---|---|---|
| "Fresh Recruit" | Beginner | Beginner | Off | For players new to the genre. Forgiving and educational. |
| "Seasoned Mercenary" | Veteran | Veteran | Off | The intended experience. Challenging but fair. |
| "Legendary Commander" | Expert | Expert | On | For masochists and veterans of the genre. Brutally unforgiving. |

The player can also create a **custom** difficulty by independently selecting combat difficulty, economic difficulty, and ironman toggle.

---

## Appendix A: Key Constants Reference

This table consolidates critical numeric values referenced throughout the document for quick implementation reference.

| Constant | Value | Section |
|---|---|---|
| `MAX_ACTIVE_ROSTER` | 12 | 4.1 |
| `MAX_TOTAL_ROSTER` | 25 | 4.1 |
| `BASE_MOVEMENT_HEXES_PER_DAY` | 40 | 1.3 |
| `BASE_VISION_RANGE` | 3 hexes | 1.5 |
| `FOOD_PER_BROTHER_PER_DAY` | 2 units | 4.5 |
| `BASE_HP_RECOVERY_PER_DAY` | 3 HP | 6.3 |
| `CAMP_HP_RECOVERY_PER_DAY` | 5 HP | 6.3 |
| `SETTLEMENT_HP_RECOVERY_PER_DAY` | 8 HP | 6.3 |
| `SHOP_RESTOCK_DAYS` | 2-3 days | 2.4 |
| `RECRUIT_RESTOCK_DAYS` | 3-5 days | 2.4 |
| `CONTRACT_REFRESH_DAYS` | 1-2 days | 2.4 |
| `NIGHT_SPEED_MODIFIER` | 0.75 | 6.2 |
| `LOOT_SELL_MODIFIER_MIN` | 0.10 | 5.4 |
| `LOOT_SELL_MODIFIER_MAX` | 0.20 | 5.4 |
| `RENOWN_DECAY_PER_DAY` | -1 (after 2 days idle) | 7.1 |
| `CRISIS_MIN_DAY` | 70 | 9.2 |
| `CRISIS_MIN_RENOWN` | 1500 | 9.2 |
| `DAY_CYCLE_REAL_SECONDS_1X` | 144 seconds | 6.1 |
| `INVENTORY_BASE_SLOTS` | 30-50 | 5.5 |
| `WAGON_BONUS_SLOTS` | 20 | 5.5 |
| `EVENT_MIN_COOLDOWN_HOURS` | 2 game hours | 10.1 |

## Appendix B: Overworld UI Layout (Portrait Mode)

```
+----------------------------------+
|  [Minimap]   [Day/Time] [Gold]   |  <- Status Bar (always visible)
|  [Renown]    [Food]    [Speed]   |
+----------------------------------+
|                                  |
|                                  |
|                                  |
|         WORLD MAP VIEW           |  <- Main viewport (Babylon.js canvas)
|       (hex grid, 2.5D view)      |     Pinch to zoom, drag to pan
|                                  |     Company banner centered
|                                  |
|                                  |
|                                  |
+----------------------------------+
|  [Camp] [Roster] [Inv] [Map]     |  <- Bottom toolbar (4 buttons)
+----------------------------------+
```

- **Status Bar**: Compact, always visible. Shows current game time (with day/night icon), gold, food supply (with days remaining estimate), company renown tier icon, and movement speed.
- **Main Viewport**: The hex map rendered in Babylon.js. Touch controls: single tap to select hex (shows info tooltip), double tap to move, pinch to zoom, drag to pan. The company banner is always centered unless the player pans away (a "re-center" button appears).
- **Bottom Toolbar**: Four primary buttons that open overlay panels:
  - **Camp**: Make camp, set travel speed, access camp management
  - **Roster**: View/manage brothers, swap active/reserve
  - **Inv**: Company inventory, equipment management
  - **Map**: Toggle full map view (zoomed out, shows explored territory, settlements, known enemy camps)

When a settlement panel or event panel is active, it slides up and covers the lower portion of the screen. The map remains partially visible at the top, maintaining spatial awareness.
