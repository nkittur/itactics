# Combat Mechanics Design Document

**Game**: iTactics (working title)
**Platform**: Mobile browser (portrait mode, Babylon.js)
**Inspiration**: Battle Brothers
**Version**: 1.0 Draft

---

## Table of Contents

1. [Turn Order & Initiative](#1-turn-order--initiative)
2. [Attack Resolution](#2-attack-resolution)
3. [Damage System](#3-damage-system)
4. [Armor System](#4-armor-system)
5. [Fatigue System](#5-fatigue-system)
6. [Morale System](#6-morale-system)
7. [Injury System](#7-injury-system)
8. [Zone of Control](#8-zone-of-control)
9. [Action Points](#9-action-points)
10. [Status Effects](#10-status-effects)
11. [Elevation](#11-elevation)
12. [Surrounding](#12-surrounding)

---

## 1. Turn Order & Initiative

### Overview

Combat is turn-based with individual character turns. Each round, every character on the field acts once. Turn order within a round is determined by **effective initiative**, computed at the start of each round.

### Effective Initiative Formula

```
effective_initiative = base_initiative - fatigue_penalty - armor_initiative_penalty + perk_bonuses + status_modifiers
```

Where:
- `base_initiative` = the character's Initiative stat (typically 90-130 for player characters, 50-150 for enemies)
- `fatigue_penalty` = current_fatigue (1:1 reduction; every point of accumulated fatigue reduces initiative by 1)
- `armor_initiative_penalty` = sum of head armor and body armor initiative penalties (typically 0-15% of armor durability value)
- `perk_bonuses` = bonuses from perks such as Dodge or Anticipation (see below)
- `status_modifiers` = modifiers from morale, buffs, debuffs

### Turn Order Resolution

1. At the start of each round, compute `effective_initiative` for every living, non-fleeing character.
2. Sort all characters in **descending** order of effective initiative (highest acts first).
3. Ties are broken by: (a) player characters act before enemies, (b) then by `base_initiative` descending, (c) then random.

### The Wait Mechanic

Any character may choose to **Wait** instead of acting on their normal turn. This costs **0 AP** and **0 fatigue**.

- Waiting characters are moved to a **wait queue**.
- After all non-waiting characters have acted, the wait queue resolves in **reverse initiative order** (lowest effective initiative acts first among waiters).
- This means a fast character who waits will act last among waiters, while a slow character who waits will act first among waiters.
- A character may only wait once per round. If they waited, they must act when their wait-turn arrives.
- Waiting does NOT carry over to the next round. If a character waits and the round ends, they lose their action.

**Design Rationale**: The wait mechanic creates tactical depth. Fast characters normally act first, but if they wait, they act last. This lets slow characters use Wait to "jump ahead" of fast characters who also wait, creating interesting mind games. It also allows reactive play --- waiting to see what the enemy does before committing.

### Wait Queue Resolution Example

Round start initiative order: A(120), B(100), C(80), D(60)

- A acts normally.
- B chooses to Wait.
- C chooses to Wait.
- D acts normally.
- Wait queue resolves (reverse initiative): C(80) acts, then B(100) acts.

### Perk Interactions with Initiative

#### Dodge
- **Effect**: Converts a portion of current effective initiative into bonus Melee Defense and Ranged Defense.
- **Formula**: `bonus_defense = floor(effective_initiative * 0.15)`
- **Timing**: Recalculated at the start of each round when initiative is computed.
- **Interaction**: Because fatigue reduces initiative, and Dodge scales off initiative, characters with Dodge want to stay low on fatigue. This creates a natural tension between acting aggressively (high fatigue, low Dodge bonus) and conserving stamina (low fatigue, high Dodge bonus).
- **Cap**: None. If a character has 130 effective initiative, Dodge grants +19 to both defenses.
- **Loss on action**: After a character takes their turn (performs any action other than Wait or End Turn), Dodge bonus is reduced by 25% until the start of the next round. This prevents Dodge from being overpowered on characters who also attack aggressively.

#### Anticipation
- **Effect**: Grants bonus Ranged Defense based on the distance to the attacker.
- **Formula**: `bonus_ranged_defense = floor(distance_in_tiles * (effective_initiative * 0.08))`
- **Minimum distance**: 2 tiles (no bonus at range 1).
- **Example**: Character with 100 effective initiative attacked from 5 tiles away: `floor(5 * (100 * 0.08))` = `floor(5 * 8)` = +40 Ranged Defense.
- **Interaction**: Stacks with Dodge's ranged defense bonus. Together they make high-initiative characters very hard to hit with ranged attacks at distance.
- **Design Rationale**: Rewards characters built around initiative and provides a counter to ranged-heavy enemy compositions.

#### Relentless
- **Effect**: Reduces the impact of fatigue on initiative by 50%.
- **Formula**: `effective_initiative = base_initiative - floor(fatigue_penalty * 0.5) - armor_initiative_penalty + perk_bonuses + status_modifiers`
- **Interaction**: Directly benefits Dodge (since Dodge scales off effective initiative, and Relentless keeps initiative higher under fatigue). A character with both Relentless and Dodge maintains defensive bonuses even when fatigued.
- **Design Rationale**: Creates a viable "endurance fighter" archetype who stays effective in prolonged fights.

### Initiative Stat Ranges

| Character Type | Base Initiative Range |
|---|---|
| Heavy frontline (player) | 90-105 |
| Medium fighter (player) | 105-120 |
| Light/fast fighter (player) | 120-135 |
| Nimble dodge build (player) | 130-145 |
| Zombie (enemy) | 30-50 |
| Bandit thug (enemy) | 70-90 |
| Bandit raider (enemy) | 90-110 |
| Orc warrior (enemy) | 60-80 |
| Goblin skirmisher (enemy) | 110-140 |

---

## 2. Attack Resolution

### Overview

Every attack (melee or ranged) resolves against a single target with a hit/miss check. The core formula is the same, but melee and ranged attacks use different stats and modifiers.

### Core Hit Chance Formula

```
hit_chance = attacker_skill - defender_defense + sum(modifiers)
hit_chance = clamp(hit_chance, 5, 95)
```

- **Minimum hit chance**: 5% (attacks can always hit, no matter how unlikely)
- **Maximum hit chance**: 95% (attacks can always miss, no matter how likely)
- The 5/95 bounds are hard limits applied after all modifiers.

### Melee Attack Resolution

```
melee_hit_chance = melee_skill - melee_defense + elevation_mod + surround_mod + shield_mod + morale_mod + status_mod + perk_mod
```

Where:
- `melee_skill` = attacker's Melee Skill stat (typically 50-90)
- `melee_defense` = defender's Melee Defense stat (typically 0-40, can be negative)
- `elevation_mod` = +10% per elevation level above target, -10% per level below (see Section 11)
- `surround_mod` = +5% per ally adjacent to target beyond the first (see Section 12)
- `shield_mod` = defender's shield bonus to melee defense (see below)
- `morale_mod` = attacker morale bonus/penalty (see Section 6)
- `status_mod` = stunned target has 0 defense; dazed reduces by 25%; etc. (see Section 10)
- `perk_mod` = bonuses from perks like Backstabber, Fast Adaptation, etc.

### Ranged Attack Resolution

```
ranged_hit_chance = ranged_skill - ranged_defense + elevation_mod + distance_mod + obstruction_mod + shield_mod + morale_mod + status_mod + perk_mod
```

Where:
- `ranged_skill` = attacker's Ranged Skill stat (typically 40-80)
- `ranged_defense` = defender's Ranged Defense stat (typically 0-30)
- `elevation_mod` = +10% per elevation level above target, -10% per level below
- `distance_mod` = distance penalty (see below)
- `obstruction_mod` = penalty for characters in the line of fire (see below)
- `shield_mod` = defender's shield bonus to ranged defense (see below)

### Distance Penalty (Ranged Only)

Ranged attacks suffer an accuracy penalty based on distance to the target. The penalty depends on the weapon type.

| Weapon Type | Penalty Per Tile | Effective Range (tiles) | Max Range (tiles) |
|---|---|---|---|
| Short bow | -2% per tile beyond 2 | 2-5 | 7 |
| Hunting bow | -2% per tile beyond 3 | 3-6 | 8 |
| War bow | -2% per tile beyond 3 | 3-7 | 9 |
| Crossbow (light) | -3% per tile beyond 2 | 2-5 | 7 |
| Crossbow (heavy) | -2% per tile beyond 3 | 3-7 | 9 |
| Javelin | -4% per tile beyond 1 | 1-3 | 5 |
| Throwing axe | -4% per tile beyond 1 | 1-3 | 4 |
| Sling | -3% per tile beyond 2 | 2-5 | 7 |

**Formula**:
```
distance_mod = -penalty_per_tile * max(0, distance - effective_range_start)
```

**Example**: War bow (penalty -2%/tile beyond 3) firing at target 6 tiles away:
```
distance_mod = -2 * max(0, 6 - 3) = -2 * 3 = -6%
```

### Obstruction Penalty (Ranged Only)

When firing a ranged weapon, any character (ally or enemy) positioned between the attacker and the target along the line of fire applies an obstruction penalty.

- **Penalty per obstructing character**: -10% to hit chance against the intended target.
- **Friendly fire / redirection**: For each obstructing character, there is a chance the shot hits them instead. The chance is `10%` per obstructing character, checked sequentially from nearest to farthest along the line of fire.
- **Resolution order**:
  1. For each obstructing character (nearest first), roll to see if the shot hits them: `obstruction_hit_chance = 10%`.
  2. If the roll succeeds, the shot hits the obstructing character instead. Apply full attack resolution against them (they use their own ranged defense).
  3. If no obstructing character is hit, resolve the shot against the original target with the cumulative -10% penalty per obstruction.

**Example**: Archer fires at target. Two allies stand in the way.
1. Check ally A (nearest): 10% chance to hit ally A. Roll fails.
2. Check ally B: 10% chance to hit ally B. Roll fails.
3. Shot reaches target with -20% penalty (2 obstructing characters * -10%).

**Design Rationale**: This creates meaningful positioning decisions. Players must keep firing lanes clear. It also makes shield walls a double-edged sword --- they protect your frontline but obstruct your archers.

### Shield Bonuses

Shields provide flat bonuses to both Melee Defense and Ranged Defense. These are added to the defender's base defense stats.

| Shield Type | Melee Defense Bonus | Ranged Defense Bonus | Fatigue Penalty |
|---|---|---|---|
| Buckler | +10 | +10 | -6 |
| Wooden shield | +15 | +15 | -12 |
| Heater shield | +15 | +20 | -16 |
| Kite shield | +15 | +25 | -18 |
| Tower shield | +20 | +30 | -24 |

**Shieldwall Skill**: When activated, doubles the shield's defense bonuses until the character's next turn. Costs 5 AP, 20 fatigue. Cannot attack while in Shieldwall.

**Shield Knock / Destroy**: The Split Shield and Knock Back skills can reduce or destroy enemy shields. Split Shield deals direct damage to the shield's durability, eventually breaking it. Knock Back pushes the target one tile and can stagger them.

### Perk Interactions with Attack Resolution

| Perk | Effect on Hit Chance |
|---|---|
| **Fast Adaptation** | After each miss, gain +8% hit chance for the next attack. Resets on hit. Stacks up to 3 times (+24%). |
| **Backstabber** | +10% hit chance per ally adjacent to target (instead of +5%). See Section 12. |
| **Bullseye** | Halves the distance penalty for ranged attacks. Also halves obstruction redirect chance (5% instead of 10%). |
| **Duelist** | +25% damage when using a one-handed weapon with no shield/offhand. No hit chance bonus, but changes the damage calculation. |
| **Gifted** | +3 to all stats at level-up. Indirectly increases Melee Skill / Ranged Skill. |
| **Crippling Strikes** | Applies injuries on hit regardless of HP threshold. Does not affect hit chance. |

### Miss Resolution

When an attack misses:
- The attack animation plays but the target dodges/deflects.
- No damage is dealt. No armor is damaged.
- Morale checks are not triggered.
- Fast Adaptation stacks increment by 1.
- The attacker still pays the full AP and fatigue cost of the attack.

---

## 3. Damage System

### Overview

When an attack hits, damage is calculated and distributed between armor and hit points. The system models weapons that are good at destroying armor, weapons that bypass armor, and the gradual degradation of protection.

### Weapon Damage Properties

Every weapon has four key damage properties:

| Property | Description | Typical Range |
|---|---|---|
| `min_damage` | Minimum damage rolled on hit | 15-50 |
| `max_damage` | Maximum damage rolled on hit | 25-120 |
| `armor_damage_mult` | Multiplier for damage dealt to armor (%) | 50%-200% |
| `armor_ignore_pct` | Percentage of damage that bypasses armor and hits HP directly (%) | 0%-50% |

### Damage Roll

```
raw_damage = random_int(min_damage, max_damage)
```

Damage is rolled uniformly between min and max (inclusive). There are no critical hit multipliers beyond the head hit system (see below).

### Damage Resolution Step-by-Step

Given `raw_damage`, `armor_damage_mult`, `armor_ignore_pct`, and the target's current armor value:

**Step 1: Determine Hit Location**

Roll for hit location (see Section 4 for full details):
- 75% chance: **body hit** (damage applied against body armor)
- 25% chance: **head hit** (damage applied against head armor, bonus damage)

**Step 2: Calculate Armor-Ignoring Damage**

```
armor_ignore_damage = floor(raw_damage * armor_ignore_pct)
```

This portion goes directly to HP regardless of armor.

**Step 3: Calculate Armor Damage**

```
armor_hit_damage = floor(raw_damage * armor_damage_mult)
```

This is the amount of damage applied to the armor's durability pool.

**Step 4: Apply Damage to Armor**

```
remaining_armor = max(0, current_armor - armor_hit_damage)
overflow_damage = max(0, armor_hit_damage - current_armor)
```

If `armor_hit_damage` exceeds `current_armor`, the armor is destroyed and the excess becomes overflow.

**Step 5: Calculate HP Damage**

```
if current_armor > 0:
    hp_damage = armor_ignore_damage
else:
    hp_damage = raw_damage  // Full damage when no armor remains
```

**More precisely, when armor absorbs the hit but is not destroyed**:
```
hp_damage = armor_ignore_damage
```

**When armor is destroyed by this hit (overflow)**:
```
// The overflow from armor destruction converts to HP damage at a 1:1 ratio
// Plus the armor-ignoring portion
hp_damage = armor_ignore_damage + floor(overflow_damage / armor_damage_mult)
```

The division by `armor_damage_mult` converts the overflow back from "armor damage" to "raw damage" before applying to HP, so that weapons with high armor damage multipliers don't deal disproportionate HP damage on armor break.

**Step 6: Apply Head Hit Bonus (if applicable)**

If this is a head hit:
```
hp_damage = floor(hp_damage * 1.5)
```

Head hits deal **150% HP damage** after all other calculations.

**Step 7: Apply Final HP Damage**

```
target.hp = max(0, target.hp - hp_damage)
target.armor[location] = remaining_armor
```

### Full Damage Resolution Example

**Scenario**: Sword (40-60 damage, 100% armor mult, 10% armor ignore) hits a target with 80 body armor and 50 HP.

1. Hit location roll: 75% body. Result: body hit.
2. Damage roll: `random_int(40, 60)` = 52.
3. Armor ignore damage: `floor(52 * 0.10)` = 5 HP directly.
4. Armor damage: `floor(52 * 1.00)` = 52 to armor.
5. Apply to armor: `remaining_armor = max(0, 80 - 52)` = 28. No overflow.
6. HP damage: 5 (armor ignore only, armor not destroyed).
7. Not a head hit, so no bonus.
8. Result: Target now has 28 body armor, 45 HP.

**Scenario**: Warhammer (30-50 damage, 200% armor mult, 30% armor ignore) hits the same target (now 28 armor, 45 HP).

1. Body hit again.
2. Damage roll: 42.
3. Armor ignore damage: `floor(42 * 0.30)` = 12 HP directly.
4. Armor damage: `floor(42 * 2.00)` = 84 to armor.
5. Apply to armor: `remaining_armor = max(0, 28 - 84)` = 0. `overflow_damage = 84 - 28` = 56.
6. HP damage: `12 + floor(56 / 2.00)` = `12 + 28` = 40 HP.
7. Not a head hit.
8. Result: Target now has 0 body armor, 5 HP.

### Weapon Damage Table

| Weapon | Min Dmg | Max Dmg | Armor Mult | Armor Ignore | Notes |
|---|---|---|---|---|---|
| Dagger | 15 | 25 | 30% | 50% | High ignore, low total |
| Short sword | 25 | 35 | 80% | 10% | Balanced |
| Arming sword | 30 | 45 | 85% | 10% | Standard sidearm |
| Longsword (1H) | 35 | 55 | 90% | 10% | Versatile |
| Greatsword | 50 | 80 | 110% | 15% | AoE slash option |
| Military pick | 30 | 45 | 150% | 30% | Anti-armor specialist |
| Warhammer (1H) | 25 | 40 | 170% | 25% | Armor crusher |
| Greathammer | 45 | 75 | 200% | 30% | Best anti-armor |
| Hand axe | 30 | 45 | 110% | 10% | Shield damage bonus |
| Greataxe | 55 | 85 | 130% | 15% | High damage |
| Spear (1H) | 25 | 40 | 80% | 10% | +20% hit, reach |
| Pike | 30 | 50 | 70% | 15% | 2-tile reach |
| Flail | 25 | 45 | 100% | 0% | Ignores shields |
| Morning star | 30 | 50 | 150% | 20% | Stun chance |
| Short bow | 25 | 40 | 40% | 15% | Fast ranged |
| War bow | 40 | 65 | 50% | 25% | Power ranged |
| Light crossbow | 35 | 50 | 60% | 20% | No skill needed |
| Heavy crossbow | 50 | 75 | 70% | 30% | Armor piercing |
| Javelin | 30 | 50 | 100% | 20% | Thrown, shield bonus |
| Throwing axe | 25 | 45 | 120% | 10% | Thrown, armor dmg |

### Head Hit System

- **Base head hit chance**: 25% on any successful attack.
- **Aimed Shot (ranged skill)**: Increases head hit chance to 60%. Costs +5 AP and +10 fatigue.
- **Head hit damage multiplier**: 150% (applied to the final HP damage after all armor calculations).
- **Helmeted targets**: Head armor absorbs damage using the same armor system. The bonus damage only applies to HP, not to armor damage.

### Steel Brow Perk

- **Effect**: Negates the 150% head hit damage multiplier entirely. Head hits deal normal (100%) HP damage.
- **Implementation**: If defender has Steel Brow, skip Step 6 of damage resolution.
- **Design Rationale**: Head hits are extremely dangerous, especially against lightly armored characters. Steel Brow provides a reliable counter, making it a strong defensive perk for characters who forgo heavy helmets.

### Damage Modifier Perks

| Perk | Effect |
|---|---|
| **Duelist** | +25% `armor_ignore_pct` when using a one-handed weapon with empty offhand. Stacks additively. E.g., sword (10%) becomes 35%. |
| **Killing Frenzy** | +25% total damage for 2 turns after killing a target. Applies to `raw_damage` before all calculations. |
| **Berserk** | Recover 4 AP on kill. No direct damage effect, but enables extra attacks. |
| **Executioner** | +20% damage against targets with any injury. Applies to `raw_damage`. |
| **Overwhelm** | No direct damage bonus. Reduces target defenses (see Section 10). |

---

## 4. Armor System

### Overview

Armor is the primary damage mitigation system. Each character has two separate armor pools: **head armor** and **body armor**. Armor absorbs damage, degrades over time in combat, and imposes fatigue and initiative penalties.

### Hit Location Distribution

Every successful attack rolls for hit location:

| Roll (d100) | Location | Probability |
|---|---|---|
| 1-75 | Body | 75% |
| 76-100 | Head | 25% |

The hit location determines which armor pool absorbs the attack. See Section 3 for how armor interacts with damage.

### Armor Properties

Each piece of armor has:

| Property | Description |
|---|---|
| `durability` | Maximum (and starting) armor points. Damage reduces this. |
| `fatigue_penalty` | Flat penalty to maximum usable fatigue. |
| `initiative_penalty` | Flat penalty to effective initiative (typically ~10-15% of durability). |
| `condition` | Current durability / max durability. Determines repair cost. |

### Armor Tier Table: Body Armor

| Tier | Armor Type | Durability Range | Fatigue Penalty | Initiative Penalty |
|---|---|---|---|---|
| **Cloth** | Linen tunic | 5-10 | -1 | -1 |
| **Cloth** | Padded surcoat | 15-25 | -3 | -2 |
| **Cloth** | Thick padded vest | 25-30 | -5 | -4 |
| **Leather** | Leather jerkin | 40-50 | -8 | -5 |
| **Leather** | Hardened leather armor | 55-65 | -12 | -7 |
| **Leather** | Studded leather armor | 70-80 | -15 | -9 |
| **Mail** | Short mail shirt | 100-120 | -18 | -11 |
| **Mail** | Full mail hauberk | 130-155 | -22 | -14 |
| **Mail** | Reinforced mail | 160-180 | -26 | -17 |
| **Plate** | Coat of plates | 200-230 | -30 | -19 |
| **Plate** | Half plate | 250-280 | -34 | -22 |
| **Plate** | Full plate armor | 300-330 | -38 | -25 |

### Armor Tier Table: Head Armor

| Tier | Armor Type | Durability Range | Fatigue Penalty | Initiative Penalty |
|---|---|---|---|---|
| **Cloth** | Hood | 5-10 | -1 | -1 |
| **Cloth** | Padded cap | 10-15 | -2 | -1 |
| **Leather** | Leather cap | 20-30 | -3 | -2 |
| **Leather** | Leather helm | 35-45 | -5 | -3 |
| **Mail** | Mail coif | 50-70 | -7 | -5 |
| **Mail** | Nasal helm w/ mail | 80-100 | -10 | -7 |
| **Plate** | Kettle hat | 110-130 | -12 | -8 |
| **Plate** | Bascinet | 150-180 | -15 | -10 |
| **Plate** | Great helm | 200-250 | -20 | -14 |
| **Plate** | Full plate helm | 280-330 | -25 | -18 |

### Brawny Perk

- **Effect**: Reduces the fatigue penalty of all equipped armor by **30%** (rounded down).
- **Formula**: `adjusted_fatigue_penalty = floor(base_fatigue_penalty * 0.70)`
- **Example**: Full plate armor (-38 fatigue penalty) with Brawny: `floor(38 * 0.70)` = 26 fatigue penalty. Savings of 12 fatigue.
- **Scope**: Applies to both head and body armor, as well as shields.
- **At higher character levels** or with named/legendary armor, Brawny can reduce by up to **40%**: `adjusted_fatigue_penalty = floor(base_fatigue_penalty * 0.60)`. This is a perk upgrade available at level 11+.
- **Design Rationale**: Brawny enables "heavy tank" builds that can wear full plate and still have a usable fatigue pool. Without Brawny, full plate severely limits a character's actions per turn.

### Armor Durability During Combat

- Armor takes damage according to the damage system (Section 3).
- When an armor pool reaches 0, subsequent attacks to that location deal full damage to HP.
- Armor **does not regenerate** during combat.
- Visual feedback: armor condition changes the character's appearance (pristine -> damaged -> broken).

### Armor Repair After Battle

- After each battle, all armor automatically repairs to **full durability** at no cost.
- **Design Rationale**: For a mobile game, this simplifies the meta-loop. Players don't need to manage repair costs or wait times between battles. The focus stays on tactical combat.
- **Future consideration**: If an economy/campaign layer is added, repairs could cost gold based on damage taken: `repair_cost = (max_durability - current_durability) * cost_per_point`, where `cost_per_point` scales with tier (cloth: 1, leather: 3, mail: 7, plate: 15).

### Armor Interaction with Perks

| Perk | Armor Interaction |
|---|---|
| **Brawny** | -30% to -40% fatigue penalty from armor. |
| **Nimble** | Reduces HP damage taken based on current fatigue headroom. Favors light armor. Formula: `damage_reduction = (max_usable_fatigue - current_fatigue) / max_usable_fatigue * 0.60`. Max 60% HP damage reduction. |
| **Battle Forged** | Reduces HP damage taken based on total current armor. Formula: `damage_reduction = min(0.05 * floor(total_current_armor / 10), 0.50)`. Max 50% HP damage reduction. Favors heavy armor. |
| **Steel Brow** | Negates head hit bonus damage (see Section 3). |
| **Colossus** | +25% max HP. Indirectly makes armor more valuable by increasing the HP pool behind it. |

### Nimble vs. Battle Forged: The Core Defensive Choice

These two perks represent the fundamental armor decision:

**Nimble** (light armor path):
- Wear light armor (cloth/leather, ~30-80 body armor).
- Keep fatigue headroom high for maximum damage reduction.
- High effective HP via damage reduction, but armor breaks quickly.
- Synergizes with Dodge, high initiative, and fatigue efficiency.
- Vulnerability: once armor breaks, reduction is all that stands between you and death.

**Battle Forged** (heavy armor path):
- Wear heavy armor (mail/plate, ~150-330 body armor).
- Damage reduction scales with total current armor.
- Armor lasts longer, providing sustained protection.
- Synergizes with Brawny, Colossus, and Recover.
- Vulnerability: fatigue-constrained; fewer actions per turn.

**Implementation Note**: Nimble and Battle Forged are mutually exclusive. A character cannot have both.

---

## 5. Fatigue System

### Overview

Fatigue represents physical exertion. Every action costs fatigue. As fatigue accumulates, a character's effective initiative drops (1:1), their Dodge bonus decreases, and eventually they become unable to act. Managing fatigue is a core tactical skill.

### Maximum Usable Fatigue

```
max_usable_fatigue = max_fatigue - equipment_fatigue_penalty
```

Where:
- `max_fatigue` = the character's base Fatigue stat (typically 90-130)
- `equipment_fatigue_penalty` = sum of fatigue penalties from all equipped items (body armor + head armor + shield + weapon fatigue if any)

**Example**: Character with 110 max fatigue wearing full mail hauberk (-22), nasal helm (-10), and heater shield (-16):
```
max_usable_fatigue = 110 - 22 - 10 - 16 = 62
```

This character has 62 fatigue points to spend on actions before becoming exhausted.

### Current Fatigue

```
current_fatigue starts at 0 each battle
current_fatigue += action_fatigue_cost (on each action)
current_fatigue -= recovery (at start of each turn)
current_fatigue = clamp(current_fatigue, 0, max_usable_fatigue)
```

When `current_fatigue >= max_usable_fatigue`, the character is **exhausted** and can only:
- Wait (0 fatigue)
- End Turn (0 fatigue)
- Use the Recover action (special case, see below)

### Fatigue Costs by Action

#### Movement

| Terrain | AP Cost | Fatigue Cost |
|---|---|---|
| Flat (grass, road) | 2 AP | 4 fatigue |
| Forest / light rough | 3 AP | 6 fatigue |
| Swamp / heavy rough | 4 AP | 8 fatigue |
| Uphill (+1 elevation) | 3 AP | 6 fatigue |
| Uphill (+2 elevation) | 4 AP | 8 fatigue |
| Downhill (-1 elevation) | 2 AP | 3 fatigue |
| Downhill (-2 elevation) | 2 AP | 2 fatigue |

**Note**: Moving through multiple tiles costs the sum of each tile's cost.

#### Basic Attacks

| Attack Type | AP Cost | Fatigue Cost |
|---|---|---|
| Dagger stab | 3 AP | 10 fatigue |
| Dagger puncture | 4 AP | 15 fatigue |
| 1H sword/axe/mace swing | 4 AP | 12 fatigue |
| 1H spear thrust | 4 AP | 10 fatigue |
| 2H sword swing | 6 AP | 15 fatigue |
| 2H axe/hammer swing | 6 AP | 18 fatigue |
| 2H spear/pike thrust | 5 AP | 12 fatigue |
| Bow shot | 4 AP | 12 fatigue |
| Crossbow shot | 4 AP | 10 fatigue |
| Crossbow reload | 3 AP | 8 fatigue |
| Javelin throw | 4 AP | 12 fatigue |
| Throwing axe throw | 4 AP | 15 fatigue |

#### Active Skills

| Skill | AP Cost | Fatigue Cost | Effect |
|---|---|---|---|
| Shieldwall | 5 AP | 20 fatigue | Double shield defense bonuses |
| Recover | 9 AP | 0 fatigue | Recover fatigue (see below) |
| Rotation | 3 AP | 25 fatigue | Swap with adjacent ally |
| Footwork | 3 AP | 20 fatigue | Move 1 tile without triggering ZoC |
| Rally the Troops | 5 AP | 30 fatigue | Boost ally morale (see Section 6) |
| Split Shield | 4 AP | 15 fatigue | Damage enemy shield |
| Knock Back | 4 AP | 15 fatigue | Push enemy 1 tile |
| Indomitable | 5 AP | 25 fatigue | 50% damage reduction until next turn |
| Adrenaline Rush | 4 AP | 30 fatigue | Act first next round |
| Taunt | 3 AP | 15 fatigue | Force enemy to target you |

### Fatigue Recovery

#### Passive Recovery (Turn Start)

At the start of each character's turn:
```
current_fatigue = max(0, current_fatigue - 15)
```

Every character passively recovers **15 fatigue** at the start of their turn. This is unconditional.

#### Recover Action

The **Recover** action is a full-turn action (costs 9 AP, so the character can do nothing else that turn):

```
recovery_amount = floor(max_usable_fatigue * 0.50)
current_fatigue = max(0, current_fatigue - recovery_amount)
```

Recover restores **50% of max usable fatigue**. Combined with the 15 passive recovery at turn start, a recovering character effectively regains `15 + floor(max_usable_fatigue * 0.50)` fatigue in that round.

**Example**: Character with 62 max usable fatigue at 60 current fatigue:
- Turn start: `60 - 15 = 45` current fatigue.
- Recover action: `45 - floor(62 * 0.50)` = `45 - 31` = 14 current fatigue.
- Net recovery that round: 46 fatigue points.

#### Fatigue Recovery Perk: Recover (renamed to "Second Wind" to avoid naming collision)

If the perk "Second Wind" is taken:
- Passive recovery increases from 15 to 20 per turn.
- Recover action restores 60% instead of 50%.

### Fatigue-Initiative Interaction

As noted in Section 1:
```
effective_initiative = base_initiative - current_fatigue - armor_initiative_penalty + ...
```

Every point of accumulated fatigue reduces initiative by 1. This means:
- Early in combat, fast characters with low fatigue act first.
- As the battle drags on and fatigue accumulates, turn order can shift dramatically.
- Characters who Recover or pace their actions maintain higher initiative.
- **Relentless** halves the fatigue-to-initiative penalty.

### Design Rationale

The fatigue system creates a natural pacing mechanism:
1. **Early rounds**: Characters are fresh, can use powerful skills freely.
2. **Mid-combat**: Fatigue accumulates, forcing choices --- attack or conserve?
3. **Late combat**: Exhausted characters are slow (low initiative) and limited in actions. Fresh reserves become valuable.

This rewards:
- Bringing the right equipment (not always the heaviest).
- Pacing skill usage rather than spamming the best ability.
- Having a mix of heavy frontliners (who exhaust quickly) and light skirmishers (who stay active longer).

---

## 6. Morale System

### Overview

Morale represents a character's mental state in combat. It affects all stats and can cause characters to flee. Morale is checked (rolled) in response to combat events, and moves up or down through five states.

### Morale States

| State | Melee Skill | Ranged Skill | Melee Def | Ranged Def | Resolve | Initiative |
|---|---|---|---|---|---|---|
| **Confident** | +10 | +10 | +10 | +10 | +10 | +10 |
| **Steady** | 0 | 0 | 0 | 0 | 0 | 0 |
| **Wavering** | -10 | -10 | -10 | -10 | -10 | -10 |
| **Breaking** | -20 | -20 | -20 | -20 | -20 | -20 |
| **Fleeing** | -30 | -30 | -30 | -30 | -30 | -30 |

**Fleeing behavior**: A fleeing character loses control. On their turn, they move as far away from enemies as possible. They cannot attack, use skills, or be given orders. They can still be attacked (and trigger ZoC free attacks while fleeing, often killing them).

### Morale Transitions

Morale moves one step at a time (except for special cases):

```
Confident -> Steady -> Wavering -> Breaking -> Fleeing
Fleeing -> Breaking -> Wavering -> Steady -> Confident
```

Each morale-affecting event triggers a **morale check**. Failing the check moves morale one step down (toward Fleeing). Succeeding keeps morale stable or can move it up.

### Morale Check Formula

```
morale_check_target = resolve + morale_state_bonus + perk_bonus + leadership_bonus - event_difficulty
roll = random_int(1, 100)

if roll <= morale_check_target:
    check_passed (morale stays or improves)
else:
    check_failed (morale drops one step)
```

Where:
- `resolve` = the character's Resolve stat (typically 30-70)
- `morale_state_bonus` = current morale modifier to Resolve (Confident: +10, Steady: 0, Wavering: -10, Breaking: -20, Fleeing: -30)
- `perk_bonus` = bonuses from perks like Brave (+10) or Hold Out (+15)
- `leadership_bonus` = bonus from having a sergeant/leader with Rally within range (+10 to +20)
- `event_difficulty` = the severity of the triggering event (see below)

### Morale Check Triggers & Difficulty

| Event | Difficulty | Who Checks |
|---|---|---|
| Ally killed nearby (within 4 tiles) | 20 | All allies within range |
| Ally killed anywhere | 10 | All other allies |
| Taking damage > 25% max HP in one hit | 15 | The damaged character |
| Taking damage > 50% max HP in one hit | 30 | The damaged character |
| Being surrounded (3+ enemies adjacent) | 10 | The surrounded character |
| Being surrounded (5+ enemies adjacent) | 25 | The surrounded character |
| Enemy with Fearsome perk hits you | +10 to difficulty | The hit character |
| Killing an enemy (positive event) | -10 (easier) | The killing character (check to improve) |
| Winning overwhelmingly (2:1 kill ratio) | -15 | All allies (check to improve) |
| Enemy leader killed | -20 | All enemies (negative for them) |

**Positive events** use negative difficulty, meaning the check is easier to pass. On a positive check pass, morale improves one step (moves toward Confident).

### Fearsome Perk

- **Effect**: When this character deals HP damage (even 1 point), the target must make a morale check with +10 difficulty.
- **Interaction**: Stacks with other morale triggers. If a Fearsome character deals 30% HP damage in one hit, the target faces two checks: one at difficulty 15 (damage > 25% HP) and one at difficulty 10 (Fearsome), or a single combined check at difficulty 25 (implementation choice --- recommend combined for simplicity).
- **Design Rationale**: Fearsome turns aggressive damage-dealers into psychological weapons. Pairs well with weapons that deal frequent small hits (daggers, flails) to trigger repeated morale checks.

### Rally the Troops

- **Skill type**: Active skill (requires the Rally the Troops perk).
- **AP cost**: 5 AP.
- **Fatigue cost**: 30 fatigue.
- **Range**: All allies within 4 tiles of the rallying character.
- **Effect**: Each affected ally makes a morale check to **improve** one step. The check target is:
  ```
  rally_target = rallying_character_resolve + 20
  ```
  Each affected ally rolls against this target. If they succeed, their morale improves one step.
- **Cooldown**: Can only be used once per round.
- **Limitation**: Cannot rally Fleeing characters. A fleeing character must first have their morale naturally recover (which requires them to be out of danger for 2+ turns) or be affected by a special event.

### Morale State Persistence

- Morale states persist between rounds within a battle.
- At the start of each new round, characters at Wavering or Breaking have a passive chance to recover one step:
  ```
  passive_recovery_chance = resolve * 0.5
  ```
  Roll against this. If successful, improve one step.
- Morale resets to **Steady** at the end of each battle.

### Implementation Notes for Mobile

- Display morale as a small icon on each character's portrait (smiley face, neutral, worried, panicking, running).
- Fleeing characters should have a distinct animation (running away, arms up).
- Morale check results should show a brief floating text: "Wavering!", "Breaking!", "Rallied!", "Confident!".

---

## 7. Injury System

### Overview

Injuries are debilitating conditions applied when a character takes a heavy blow. They impose stat penalties and, in the case of permanent injuries, can permanently alter a character's capabilities. Injuries add consequence to combat beyond simple HP loss.

### Injury Trigger Conditions

An injury check occurs when:

1. **HP threshold hit**: A single attack deals damage that reduces HP below a threshold.
   - Below 75% max HP from a single hit: minor injury chance.
   - Below 50% max HP from a single hit: moderate injury.
   - Below 25% max HP from a single hit: severe injury.

2. **Crippling Strikes perk**: Any HP damage triggers an injury check, regardless of threshold.

### Injury Check Formula

```
injury_chance = base_chance + damage_severity_bonus - toughness_bonus

if single_hit_drops_below_75pct: base_chance = 25%
if single_hit_drops_below_50pct: base_chance = 50%
if single_hit_drops_below_25pct: base_chance = 100%

damage_severity_bonus = floor((damage_dealt / max_hp) * 20)  // extra 0-20% based on how severe

toughness_bonus = floor(resolve * 0.2)  // 0-14% for typical Resolve values

final_injury_chance = clamp(injury_chance, 5, 100)
```

If the check succeeds (injury occurs), roll for injury type based on hit location and severity.

### Temporary Injuries

Temporary injuries heal after a set number of in-game days (battles). They impose stat penalties while active.

#### Body Injuries (from body hits)

| Injury | Stat Penalty | Heal Time | Trigger |
|---|---|---|---|
| Bruised ribs | -10 max fatigue | 3 days | HP < 75% |
| Cracked ribs | -20 max fatigue, -5 melee skill | 5 days | HP < 50% |
| Torn muscle | -15% damage dealt, -5 melee defense | 4 days | HP < 50% |
| Deep wound | -1 HP per turn (bleed), -5 all stats | 5 days | HP < 50% |
| Pierced lung | -25 max fatigue, -10 initiative | 7 days | HP < 25% |
| Broken arm | -40% damage dealt, -20 melee skill | 7 days | HP < 25% |
| Broken leg | -2 AP per turn, -50% move speed | 7 days | HP < 25% |
| Internal bleeding | -3 HP per turn, -10 all stats | 6 days | HP < 25% |

#### Head Injuries (from head hits)

| Injury | Stat Penalty | Heal Time | Trigger |
|---|---|---|---|
| Grazed head | -5 initiative, -5 ranged skill | 3 days | HP < 75% |
| Concussion | -15 initiative, -10 ranged skill, -10 melee skill | 5 days | HP < 50% |
| Fractured skull | -20 all stats | 7 days | HP < 25% |
| Damaged ear | -15 initiative, -10 resolve | 5 days | HP < 50% |

### Permanent Injuries

Permanent injuries occur only under extreme circumstances:

**Trigger**: Character HP drops to exactly 0 but they survive (e.g., via the Nine Lives perk or a cheating-death mechanic). Characters who reach 0 HP without a survival mechanic simply die.

**Permanent injury types**:

| Injury | Stat Penalty | Permanent Effect |
|---|---|---|
| Missing eye | -15 ranged skill, -5 melee defense | Cannot be healed |
| Missing ear | -10 initiative, -10 resolve | Cannot be healed |
| Brain damage | -20 resolve, -15 initiative, -10 melee/ranged skill | Cannot be healed |
| Maimed hand | -25 melee skill, -15% damage dealt | Cannot be healed |
| Crippled leg | -1 AP per turn permanently, -10 initiative | Cannot be healed |
| Crushed windpipe | -30 max fatigue | Cannot be healed |
| Broken nose | -5 resolve, -3 melee defense | Cosmetic change |

**Permanent injury selection**: When a permanent injury triggers, roll from the table weighted by hit location. Head hits favor eye/ear/brain injuries. Body hits favor hand/leg/windpipe injuries.

### Multiple Injuries

A character can have multiple injuries simultaneously. Their penalties stack additively. However:
- A character cannot receive the same injury twice.
- If a character already has a bruised ribs injury and would gain it again, reroll for a different injury.
- Maximum concurrent injuries: 3 temporary + 1 permanent. Beyond this, new injuries replace the oldest temporary injury.

### Injury Display (Mobile UI)

- Active injuries shown as small red icons on the character sheet.
- Tapping an injury shows its name, stat penalties, and remaining heal time.
- In combat, injured characters have a visible indicator (bandage icon, limping animation).

### Design Rationale

Injuries create lasting consequences from tough battles. Even a victorious fight can leave your company weakened for the next engagement. This encourages:
- Protecting low-HP characters rather than letting them tank hits.
- Using the injury system as a push-your-luck mechanic (fight one more battle with injured troops, or rest?).
- Permanent injuries adding narrative weight --- that veteran with a missing eye has a story.

---

## 8. Zone of Control (ZoC)

### Overview

Every character exerts a **Zone of Control** over the 6 hexagonal tiles adjacent to them. Moving through or out of a tile in an enemy's ZoC can trigger a **free attack** (also called an attack of opportunity). This makes positioning critical and prevents characters from freely disengaging from melee.

### ZoC Rules

1. **ZoC tiles**: Every character controls the 6 hexes immediately adjacent to them. ZoC is always active (even when it is not the character's turn).

2. **Leaving ZoC triggers a free attack**: When a character moves **out of** a tile that is in an enemy's ZoC, that enemy gets a free melee attack against the moving character.

3. **Moving within ZoC also triggers a free attack**: If a character moves from one tile in an enemy's ZoC to another tile that is also in that enemy's ZoC (i.e., moving around the enemy while staying adjacent), the enemy gets a free attack.

4. **Entering ZoC does NOT trigger a free attack**: Moving into a tile adjacent to an enemy is safe. Only leaving triggers the attack.

5. **Multiple ZoCs**: If a character is in the ZoC of multiple enemies and moves out, **each** enemy with ZoC on the departure tile gets a free attack. This makes being surrounded extremely dangerous to escape from.

6. **Free attack properties**:
   - Uses the enemy's equipped melee weapon.
   - Resolved as a normal melee attack (full hit chance calculation).
   - Deals normal damage.
   - Costs the attacking enemy **0 AP and 0 fatigue** (it is free).
   - A character can make **one free attack per enemy movement**. If multiple enemies move through their ZoC in a single round, they get one free attack against each.
   - Free attacks occur **before** the movement completes (the character is still on the departure tile when hit, not the destination tile).

### Exceptions to ZoC

Several abilities and situations bypass ZoC:

| Exception | Description |
|---|---|
| **Rotation** | The Rotation skill swaps positions with an adjacent ally. Neither character triggers ZoC from any enemy. |
| **Footwork** | The Footwork skill allows moving 1 tile without triggering ZoC from any enemy. Costs 3 AP, 20 fatigue. |
| **Knockback** | A character pushed by Knock Back does not trigger ZoC (they are being forced to move, not choosing to). |
| **Fleeing** | Fleeing characters DO trigger ZoC. This is intentional --- fleeing through enemy lines is extremely dangerous. |
| **Stunned enemies** | A stunned character does not exert ZoC. Characters can freely move around stunned enemies. |
| **Nets** | A netted character still exerts ZoC (they can still swing a weapon). |
| **Death** | Dead characters do not exert ZoC (obviously). |

### Rotation Skill Details

- **Prerequisite**: Must have an adjacent ally.
- **AP cost**: 3 AP.
- **Fatigue cost**: 25 fatigue (to the character using Rotation; the ally pays 0).
- **Effect**: The two characters swap positions. Neither triggers ZoC.
- **Use case**: Pull a wounded ally out of the frontline and replace them with a fresh fighter. Or rotate a fatigued character out of melee.
- **Limitation**: The ally must not be stunned, netted, or rooted. The ally must be adjacent (within 1 hex).

### Footwork Skill Details

- **Prerequisite**: Footwork perk.
- **AP cost**: 3 AP.
- **Fatigue cost**: 20 fatigue.
- **Effect**: Move 1 tile in any direction without triggering ZoC from any enemy.
- **Use case**: Disengage from melee safely. Reposition archers who got engaged.
- **Limitation**: Only 1 tile of movement. Cannot cross impassable terrain.

### ZoC and Ranged Characters

Ranged characters (archers, crossbowmen) do NOT have a special ranged ZoC. Their ZoC works identically to melee characters, based on the weapon they would use in melee (a dagger, usually). If a ranged character has no melee weapon equipped, they still exert ZoC but their free attack uses an unarmed strike (very low damage).

### Implementation Notes

- When a character selects a movement destination, highlight tiles that would trigger ZoC free attacks in red/orange.
- Show the number of free attacks that would trigger (e.g., "2 free attacks" if passing through two enemies' ZoC).
- Free attacks should animate quickly to keep mobile gameplay snappy.
- ZoC visualization: optionally show faint colored outlines around each enemy's 6 adjacent hexes during movement planning.

### Design Rationale

ZoC is the foundational positioning mechanic. It means:
- **Frontlines matter**: Once your fighters engage the enemy frontline, neither side can easily disengage.
- **Flanking is risky**: Moving around an enemy to flank means eating free attacks.
- **Protecting backline**: Your frontline's ZoC prevents enemies from easily reaching your archers.
- **Surrounding is deadly**: A surrounded character cannot escape without taking 3-6 free attacks (likely lethal).
- **Rotation and Footwork are premium skills**: They are the only safe ways to reposition in melee, making them high-value perks.

---

## 9. Action Points

### Overview

Each character has **9 Action Points (AP)** per turn. AP are spent on movement, attacks, and skills. Unlike fatigue, AP fully regenerate at the start of each turn. AP and fatigue together constrain what a character can do in a turn: AP sets the hard action limit, fatigue sets the stamina limit.

### AP Per Turn

```
ap_per_turn = 9 (base, universal)
```

Exceptions:
- **Broken leg (temporary injury)**: -2 AP per turn (7 AP).
- **Crippled leg (permanent injury)**: -1 AP per turn (8 AP).
- **Berserk perk**: Recover 4 AP on kill (can exceed 9 in the turn of a kill, up to a max of 13).
- **Adrenaline Rush**: Does not grant extra AP, but makes you act first next round.

### Movement AP Costs

Movement cost depends on terrain type and elevation change.

| Terrain | Base AP Cost | Base Fatigue Cost |
|---|---|---|
| **Flat** (grass, road, sand) | 2 AP | 4 fatigue |
| **Forest** (light woods, brush) | 3 AP | 6 fatigue |
| **Swamp** (deep mud, bog) | 4 AP | 8 fatigue |
| **Snow** (deep snow) | 3 AP | 6 fatigue |
| **Shallow water** | 3 AP | 6 fatigue |
| **Rocky/rubble** | 3 AP | 5 fatigue |

#### Elevation Modifiers

Elevation changes add to the base terrain cost:

| Elevation Change | AP Modifier | Fatigue Modifier |
|---|---|---|
| **Uphill +1 level** | +1 AP | +2 fatigue |
| **Uphill +2 levels** | +2 AP | +4 fatigue |
| **Downhill -1 level** | +0 AP | -1 fatigue |
| **Downhill -2 levels** | +0 AP | -2 fatigue |

**Combined example**: Moving through a forest tile (+3 AP base) that is also uphill +1 level (+1 AP): total cost = **4 AP, 8 fatigue**.

### Attack AP Costs

| Attack Type | AP Cost | Remaining AP for 9-AP Turn |
|---|---|---|
| **Dagger stab** | 3 AP | 6 AP (can attack 3 times, or move + attack twice) |
| **Dagger puncture** (special) | 4 AP | 5 AP |
| **1H weapon attack** | 4 AP | 5 AP (can move 2 tiles flat + attack, or attack twice) |
| **2H weapon attack** | 6 AP | 3 AP (can move 1 tile flat + attack, or just attack) |
| **Spear thrust (1H)** | 4 AP | 5 AP |
| **Pike thrust (2H)** | 5 AP | 4 AP (can move 2 flat tiles + thrust) |
| **Bow shot** | 4 AP | 5 AP |
| **Crossbow shot** | 4 AP | 5 AP |
| **Crossbow reload** | 3 AP | 6 AP (reload + shoot = 7 AP, leaving 2 for movement) |
| **Javelin throw** | 4 AP | 5 AP |
| **Throwing axe throw** | 4 AP | 5 AP |

### Skill AP Costs

| Skill | AP Cost | Notes |
|---|---|---|
| **Shieldwall** | 5 AP | Can still move 2 tiles (flat) before activating |
| **Recover** | 9 AP | Full turn action, cannot do anything else |
| **Rotation** | 3 AP | Can still attack after rotating (if AP allows) |
| **Footwork** | 3 AP | Can still attack after disengaging |
| **Rally the Troops** | 5 AP | Can move a bit before rallying |
| **Split Shield** | 4 AP | Same as a normal attack |
| **Knock Back** | 4 AP | Same as a normal attack |
| **Indomitable** | 5 AP | Usually used after moving into position |
| **Adrenaline Rush** | 4 AP | Spend AP now for initiative advantage next round |
| **Taunt** | 3 AP | Quick activation |
| **Wait** | 0 AP | Free; defers turn |
| **End Turn** | 0 AP | Free; ends turn immediately |

### Pathfinder Perk

- **Effect**: Reduces AP cost of movement over difficult terrain by **1 AP** (minimum 2 AP per tile).
- **Does NOT reduce**: Flat terrain costs (already at 2 AP minimum) or the fatigue cost of movement.
- **Examples with Pathfinder**:
  - Forest: 3 AP -> 2 AP
  - Swamp: 4 AP -> 3 AP
  - Uphill +1 on flat: 3 AP -> 2 AP
  - Uphill +1 in forest: 4 AP -> 3 AP
  - Flat terrain: 2 AP -> 2 AP (no change, already at minimum)

### Common Turn Patterns

Here are typical turns to illustrate AP usage:

**Aggressive melee fighter (1H weapon)**:
- Move 1 tile flat (2 AP) + attack (4 AP) + attack (4 AP) = **10 AP needed, only 9 available**. Cannot double-attack after moving.
- Move 1 tile flat (2 AP) + attack (4 AP) = 6 AP used, 3 AP left (not enough for another attack).
- Stand still + attack (4 AP) + attack (4 AP) = 8 AP, 1 AP left. **Valid: double attack without moving.**

**Dagger user**:
- Move 1 tile flat (2 AP) + stab (3 AP) + stab (3 AP) = 8 AP, 1 AP left. **Valid: move + double stab.**
- Stand still + stab (3 AP) + stab (3 AP) + stab (3 AP) = 9 AP. **Valid: triple stab without moving.**

**2H weapon user**:
- Move 1 tile flat (2 AP) + attack (6 AP) = 8 AP, 1 AP left. **Valid but tight.**
- Stand still + attack (6 AP) = 6 AP, 3 AP left (not enough for another 2H attack).
- **2H weapons get one attack per turn in most scenarios.**

**Archer**:
- Move 1 tile flat (2 AP) + shoot (4 AP) = 6 AP, 3 AP left (not enough for another shot).
- Stand still + shoot (4 AP) + shoot (4 AP) = 8 AP. **Valid: double shot without moving.**

**Pike user (2-tile reach)**:
- Move 2 tiles flat (4 AP) + thrust (5 AP) = 9 AP. **Valid: good reach + mobility.**

### AP Display (Mobile UI)

- Show AP as 9 small dots/pips along the bottom of the character's turn UI.
- As the player plans actions, dim the pips that will be consumed.
- Color code: green (available), gray (will be consumed by planned action), red (not enough for selected action).
- Remaining AP after planned actions shown as a number.

### Design Rationale

The 9 AP system creates meaningful action economy decisions:
- **1H weapons** are versatile: move + attack, or double attack.
- **2H weapons** sacrifice flexibility for power: usually one attack per turn.
- **Daggers** are the fastest: triple attacks possible, but low damage per hit.
- **Pikes** balance reach with moderate AP cost.
- **Skills** compete with attacks for AP. Using Shieldwall (5 AP) means no 1H attack that turn (4 AP remaining, one attack just fits).
- **Recover** is a full turn commitment, creating risk/reward tension.

---

## 10. Status Effects

### Overview

Status effects are temporary conditions applied by certain attacks, skills, or perks. They modify a character's stats, restrict their actions, or deal ongoing damage. Status effects are central to tactical depth --- applying the right debuff at the right time can turn a battle.

### Status Effect List

#### Stun

| Property | Value |
|---|---|
| **Duration** | 1 turn (the target's next turn) |
| **Effect** | Target loses their entire next turn. They cannot act, move, use skills, or wait. |
| **Defense override** | Target's Melee Defense and Ranged Defense are set to **0** while stunned. |
| **ZoC** | Stunned characters do not exert Zone of Control. |
| **Sources** | Mace/hammer skills, Shield Bash, certain perk interactions. |
| **Resistance** | Stun resistance is not a stat; however, the attack must hit to apply stun. Higher defense = less likely to be stunned. |
| **Stacking** | Does not stack. Reapplying stun refreshes the duration to 1 turn. |

**Implementation**: On the stunned character's turn, skip directly to the next character. Display "Stunned!" floating text.

#### Daze

| Property | Value |
|---|---|
| **Duration** | 1-2 turns (varies by source) |
| **Effect** | All stats reduced by **25%** (Melee Skill, Ranged Skill, Melee Def, Ranged Def, Initiative, max fatigue). |
| **Formula** | `dazed_stat = floor(base_stat * 0.75)` for each affected stat. |
| **Sources** | Heavy blows (2H hammer attacks), certain weapon skills. |
| **Stacking** | Does not stack with itself. Reapplying refreshes duration. |
| **Interaction** | Stacks with other debuffs (Overwhelm, morale penalties, etc.). Applied after base stats, before morale modifiers. |

#### Bleed

| Property | Value |
|---|---|
| **Duration** | 2-3 turns (varies by source) |
| **Damage** | 5-10 HP per turn (at the start of the bleeding character's turn). |
| **Armor interaction** | Bleed damage **completely ignores armor**. It is applied directly to HP. |
| **Sources** | Swords (Gash skill), axes (Split Man), cleavers, certain injuries. |
| **Stacking** | **Stacks**. Multiple bleed effects deal their damage independently. A character with two bleeds (5 HP/turn and 10 HP/turn) takes 15 HP/turn. |
| **Maximum stacks** | 5 (to prevent degenerate strategies). |
| **Removal** | Expires after duration. No active way to remove bleeds in combat. The "Fortified Mind" perk does not affect bleeds (it's a physical effect, not mental). |

**Bleed values by weapon/skill**:

| Source | Bleed Damage | Duration |
|---|---|---|
| Sword Gash | 5 HP/turn | 2 turns |
| Cleaver Gash | 8 HP/turn | 2 turns |
| Greataxe Split | 10 HP/turn | 3 turns |
| Injury: Deep Wound | 5 HP/turn | Until healed (persistent in combat) |

#### Poison

| Property | Value |
|---|---|
| **Duration** | 3 turns |
| **HP Damage** | 5 HP per turn (ignores armor). |
| **Stat Reduction** | -20% to all stats (Melee Skill, Ranged Skill, Melee Def, Ranged Def, Initiative, Resolve). |
| **Formula** | `poisoned_stat = floor(base_stat * 0.80)` |
| **Sources** | Poison-coated weapons (goblin attacks), poisoned throwing weapons, venomous creatures. |
| **Stacking** | Does not stack. Reapplying refreshes the duration. The stat reduction does not compound. |
| **Removal** | Expires after 3 turns. Antidote consumable (if implemented) removes immediately. |
| **Interaction** | The HP damage stacks with Bleed (separate effects). The stat reduction stacks with Daze (multiplicative: a poisoned + dazed character has `floor(floor(base * 0.80) * 0.75)` = 60% stats). |

#### Net

| Property | Value |
|---|---|
| **Duration** | Until removed (1 turn to cut free, or ally can cut free as an action). |
| **Defense penalty** | -50% to Melee Defense and Ranged Defense. |
| **Movement** | **Cannot move** (0 movement). The character is rooted in place. |
| **Actions** | Can still attack and use skills (except movement skills). |
| **Cut free (self)** | Costs 4 AP and 10 fatigue. Removes the net. |
| **Cut free (ally)** | An adjacent ally can use 3 AP and 5 fatigue to cut the net. Requires a blade weapon. |
| **Sources** | Net throwing (3-tile range), certain trap mechanics. |
| **ZoC** | Netted characters still exert ZoC (they can still attack adjacent enemies). |
| **Stacking** | Does not stack. A character can only be under one net. |

#### Root

| Property | Value |
|---|---|
| **Duration** | 1-2 turns |
| **Effect** | Cannot move. Can still attack, use skills, and turn in place. |
| **Defense penalty** | -10 Melee Defense, -10 Ranged Defense. |
| **Sources** | Entangling terrain, certain enemy abilities (e.g., tree creatures). |
| **Difference from Net** | Root has less defense penalty and a fixed duration. Net must be actively removed. |
| **Stacking** | Does not stack. Reapplying refreshes duration. |

#### Charm

| Property | Value |
|---|---|
| **Duration** | 1-2 turns |
| **Effect** | Character switches allegiance temporarily. They act as an enemy (controlled by AI/opponent). They attack their former allies and can be attacked by them. |
| **Resolve check** | At the start of each charmed character's turn, they make a Resolve check (difficulty 50 - Resolve). If they pass, charm breaks. |
| **Sources** | Rare enemy abilities (necromancer's control, siren's song, hexen charm). |
| **Removal** | Expires after duration, Resolve check success, or taking damage from former allies (50% chance to break on hit). |
| **ZoC** | Charmed characters exert ZoC against their former allies. |
| **Design note** | Charm is a powerful, rare effect meant for specific enemy encounters. It should feel threatening and unique. |

#### Overwhelm

| Property | Value |
|---|---|
| **Duration** | Until the target's next turn start (refreshed on each application). |
| **Effect per stack** | -10% to target's Melee Defense and Ranged Defense. |
| **Maximum stacks** | 5 (for -50% defense total). |
| **Application** | Applied on **every attack** (hit or miss) by a character with the Overwhelm perk. |
| **Formula** | `defense_reduction = overwhelm_stacks * 10` |
| **Stacking from multiple sources** | Each attacker with Overwhelm adds their own stack. Two Overwhelm attackers hitting the same target = 2 stacks. |
| **Removal** | All stacks clear at the start of the affected character's next turn. |
| **Design Rationale** | Overwhelm is a team-coordination perk. A group of fast, light attackers with Overwhelm can debuff a heavily armored target's defense, making them easy to hit for the rest of the team. It rewards initiative (fast characters apply Overwhelm before slow allies attack) and multi-attacker strategies. |

### Status Effect Interactions

| Combination | Result |
|---|---|
| Stun + any debuff | Stunned character is helpless; debuffs apply but are somewhat redundant (can't act anyway). However, the 0 defense from stun means attacks against them auto-hit (effectively). |
| Daze + Poison | Stat reductions stack multiplicatively: `floor(floor(base * 0.80) * 0.75)` = ~60% of base stats. |
| Bleed + Poison | Both deal HP damage per turn independently. 5-10 bleed + 5 poison = 10-15 HP/turn ignoring armor. |
| Net + Overwhelm | Devastating combo: -50% defense from net + additional -10% per Overwhelm stack. Target is nearly unhittable to miss. |
| Charm + Stun | If charmed target is stunned, they skip their turn but charm duration still ticks down. |
| Root + Net | Only the most restrictive applies (Net, since it also has -50% defense). Root's -10% defense is overridden. |

### Status Effect Display (Mobile UI)

- Active status effects shown as small icons below the character's HP bar in combat.
- Icons should be distinct and immediately recognizable at mobile resolution:
  - Stun: yellow stars
  - Daze: spinning circles
  - Bleed: red drops
  - Poison: green skull
  - Net: crossed ropes
  - Root: vine tendrils
  - Charm: pink heart
  - Overwhelm: red arrows pointing down
- Tapping an icon shows effect name, remaining duration, and stat impact.
- Stack count shown as a small number on the icon (for Bleed and Overwhelm).

---

## 11. Elevation

### Overview

The battlefield features three elevation levels (0, 1, 2). Higher ground provides combat advantages: improved hit chance, improved defense, and improved vision. Lower ground is disadvantaged. Elevation is a key strategic consideration when positioning.

### Elevation Levels

| Level | Description | Examples |
|---|---|---|
| **0** | Low ground | Valleys, riverbeds, crater floors |
| **1** | Standard ground | Flat fields, roads, most terrain |
| **2** | High ground | Hilltops, fortress walls, elevated ruins |

Most maps use levels 1 and 2, with level 0 reserved for specific terrain features (river crossings, pit fights).

### Combat Modifiers by Elevation Difference

The elevation modifier is calculated as:
```
elevation_difference = attacker_elevation - defender_elevation
elevation_mod = elevation_difference * 10
```

This applies to **both hit chance and defense**.

| Attacker Elevation vs Defender | Hit Chance Modifier | Defense Modifier (for attacker) |
|---|---|---|
| **+2 levels above** | +20% hit chance | +20% defense |
| **+1 level above** | +10% hit chance | +10% defense |
| **Same level** | 0% | 0% |
| **-1 level below** | -10% hit chance | -10% defense |
| **-2 levels below** | -20% hit chance | -20% defense |

**Note**: The defense modifier is applied to the character who has the elevation advantage. When attacking downhill, you are harder to hit (your defense is effectively higher). When attacking uphill, you are easier to hit.

**Implementation**: In the hit chance formula (Section 2), elevation affects both the attacker's effective skill and the defender's effective defense:
```
// Simplified: positive elevation_mod benefits attacker
effective_hit_chance = melee_skill + elevation_mod - (melee_defense - elevation_mod) + other_modifiers
// Which simplifies to:
effective_hit_chance = melee_skill - melee_defense + (2 * elevation_mod) + other_modifiers
```

Wait --- this would double-count. Let me clarify: the +10% per level is a single modifier to hit chance, not applied to both skill and defense separately.

**Corrected**: Elevation modifies hit chance directly:
```
hit_chance = attacker_skill - defender_defense + (elevation_difference * 10) + other_modifiers
```

The defender on higher ground also gets +10% defense per level against attacks from below. This is already captured in the formula above (negative elevation_difference reduces hit chance, which is equivalent to the defender having higher defense). No double-counting.

### Movement Cost for Elevation Changes

Moving to a higher elevation tile costs additional AP and fatigue on top of the terrain base cost.

| Elevation Change | Additional AP | Additional Fatigue |
|---|---|---|
| Uphill +1 level | +1 AP | +2 fatigue |
| Uphill +2 levels | +2 AP | +4 fatigue |
| Downhill -1 level | +0 AP | -1 fatigue (minimum 2 total) |
| Downhill -2 levels | +0 AP | -2 fatigue (minimum 1 total) |

**Example**: Moving from level 1 to level 2 on flat terrain: 2 AP (flat base) + 1 AP (uphill +1) = **3 AP, 6 fatigue**.

**Example**: Moving from level 0 to level 2 on flat terrain: 2 AP (flat base) + 2 AP (uphill +2) = **4 AP, 8 fatigue**.

**Pathfinder perk interaction**: Pathfinder reduces the total AP cost by 1 (minimum 2), so uphill +1 on flat becomes 2 AP instead of 3.

### Ranged Attack Elevation

Elevation is especially impactful for ranged attacks:
- A bow on a hilltop (+1 or +2 above target) gains +10% or +20% to hit.
- Firing uphill at a target above you suffers -10% or -20%.
- Elevation does NOT affect damage, only hit chance.
- Elevation can improve line-of-sight, potentially reducing obstruction (characters on lower ground don't block shots as effectively). Implementation: obstructing characters must be at the same or higher elevation as the line of fire to count as obstructions.

### Elevation and Vision

Higher elevation grants better vision range:
- **Level 0**: Standard vision (6 tiles in fog of war scenarios).
- **Level 1**: Standard vision (7 tiles).
- **Level 2**: Extended vision (8 tiles).

This matters primarily for:
- Spotting approaching enemies in campaign mode.
- Revealing hidden/camouflaged enemies in combat.
- Archer targeting range (can see and thus target farther when elevated).

### Design Rationale

Elevation creates natural strategic objectives on the map:
- **Hill control**: The team that holds the high ground has a significant advantage (+10% to +20% hit and defense). This incentivizes aggressive maneuvering to take hills.
- **Defensive positions**: A fortified hilltop position with shield wall is extremely hard to assault.
- **AP cost trade-off**: Rushing uphill is expensive, meaning attackers arrive fatigued and at disadvantage. This naturally favors defenders.
- **Ranged dominance**: Archers on high ground are much more effective, creating a natural "hold the hill, rain arrows" strategy.

---

## 12. Surrounding

### Overview

When multiple characters are adjacent to the same target, they gain a **surrounding bonus** to hit chance. This represents the difficulty of defending against attacks from multiple directions simultaneously. Surrounding is one of the most important tactical mechanics --- maneuvering to surround enemies (and preventing your own characters from being surrounded) is critical.

### Surrounding Bonus Formula

```
surround_bonus = max(0, (adjacent_allies_to_target - 1)) * 5
```

Where:
- `adjacent_allies_to_target` = number of characters **allied to the attacker** that are adjacent to the target (including the attacker themselves).
- The **-1** means the first adjacent character (the attacker) provides no bonus. The bonus starts with the second adjacent ally.
- Each additional ally beyond the first adds **+5% hit chance**.

### Surrounding Bonus Table

| Allies Adjacent to Target | Bonus |
|---|---|
| 1 (attacker only) | +0% |
| 2 (attacker + 1 ally) | +5% |
| 3 (attacker + 2 allies) | +10% |
| 4 (attacker + 3 allies) | +15% |
| 5 (attacker + 4 allies) | +20% |
| 6 (attacker + 5 allies, full surround) | +25% |

**Maximum surround bonus**: +25% (6 hexes, all occupied by the attacker's allies).

### Backstabber Perk

- **Effect**: Doubles the surrounding bonus from **+5% per ally** to **+10% per ally** (beyond the first).
- **Formula with Backstabber**: `surround_bonus = max(0, (adjacent_allies_to_target - 1)) * 10`

| Allies Adjacent to Target | Normal Bonus | With Backstabber |
|---|---|---|
| 1 (attacker only) | +0% | +0% |
| 2 (attacker + 1 ally) | +5% | +10% |
| 3 (attacker + 2 allies) | +10% | +20% |
| 4 (attacker + 3 allies) | +15% | +30% |
| 5 (attacker + 4 allies) | +20% | +40% |
| 6 (full surround) | +25% | +50% |

**Design Rationale for Backstabber**: This perk rewards flanking playstyles. Characters with Backstabber want to be in positions where allies are adjacent to their target. It synergizes with high mobility (to get into flanking positions) and team coordination. At full surround with Backstabber, the +50% bonus makes even unskilled fighters dangerous.

### Surrounding and Defense

The surrounding bonus only applies to **attack hit chance**, not to the attacker's defense. However, being surrounded has an indirect defensive cost: the surrounded character must defend against attacks from multiple directions, and the hit bonuses mean more attacks will land.

Additionally, surrounding triggers **morale checks** (see Section 6):
- 3+ enemies adjacent: morale check at difficulty 10.
- 5+ enemies adjacent: morale check at difficulty 25.

### Who Counts as "Adjacent Allies"

For the surround bonus:
- Only **living** characters count.
- Characters must be **adjacent** (within 1 hex) to the target.
- Characters must be **allied** to the attacker (same team).
- **Charmed** characters count as allies to their new team. A charmed player character adjacent to an enemy would count toward that enemy's surround bonus when another enemy attacks.
- **Fleeing** characters count (they are still physically present).
- **Stunned** characters count (they are still physically present and threatening).
- **Netted** characters count (they can still swing weapons).

### Surrounding in Practice

**Scenario**: Player characters A and B are fighting enemy X.

- A is adjacent to X. B is not adjacent. A attacks: 0% surround bonus.
- A is adjacent to X. B moves adjacent to X on the other side. A attacks: +5% bonus (2 allies adjacent, bonus starts at 2nd).
- B attacks X: +5% bonus (A is adjacent to X and allied to B).

**Scenario**: Full surround. Enemy X is surrounded by player characters A, B, C, D, E, F (all 6 hexes occupied).

- Any of A-F attacking X gets +25% bonus (+50% with Backstabber).
- X has morale check at difficulty 25 (5+ enemies adjacent).
- X attempting to move triggers free attacks from all 6 characters.
- X is in an extremely dire situation.

### Anti-Surrounding Tactics

Players (and AI) should employ these counters to surrounding:
1. **Shield wall**: Keep the frontline tight so enemies can't get behind.
2. **Terrain**: Fight with your back to impassable terrain (cliffs, water) so enemies can't surround.
3. **Rotation**: Swap a surrounded character out before they die.
4. **Footwork**: Disengage from a surround.
5. **AoE attacks**: Greatsword's sweep attacks hit multiple adjacent enemies, punishing tight surrounds.
6. **Reach weapons**: Spears and pikes can attack from 2 tiles away, contributing surround bonus without being adjacent to the target's ZoC (only pikes at 2 tiles; spears are 1 tile in this system).

### Implementation Notes

- When a character is selected and the player is choosing a target, show the surround bonus as a modifier in the hit chance preview: "75% (+10% surround)".
- Visually, highlight the hexes around a target that are occupied by allies to reinforce the surrounding concept.
- AI should actively seek to surround player characters and avoid being surrounded itself.

---

## Appendix A: Perk Quick Reference

| Perk | Category | Key Effect | Section Reference |
|---|---|---|---|
| **Dodge** | Defense | +15% of initiative as melee/ranged defense | Section 1 |
| **Anticipation** | Defense | +8% of initiative * distance as ranged defense | Section 1 |
| **Relentless** | Utility | Halves fatigue-to-initiative penalty | Section 1 |
| **Fast Adaptation** | Offense | +8% hit per miss (max +24%) | Section 2 |
| **Backstabber** | Offense | Double surround bonus (+10% per ally) | Section 12 |
| **Bullseye** | Ranged | Half distance penalty, half obstruction redirect | Section 2 |
| **Duelist** | Offense | +25% armor ignore with 1H, no offhand | Section 3 |
| **Killing Frenzy** | Offense | +25% damage for 2 turns on kill | Section 3 |
| **Berserk** | Offense | +4 AP on kill | Section 9 |
| **Executioner** | Offense | +20% damage vs injured targets | Section 3 |
| **Crippling Strikes** | Offense | Apply injuries on any HP damage | Section 7 |
| **Overwhelm** | Debuff | -10% defense per stack on target (max 5) | Section 10 |
| **Steel Brow** | Defense | Negates head hit bonus damage | Section 3 |
| **Nimble** | Defense | HP damage reduction based on fatigue headroom | Section 4 |
| **Battle Forged** | Defense | HP damage reduction based on total armor | Section 4 |
| **Brawny** | Utility | -30% to -40% armor fatigue penalty | Section 4 |
| **Colossus** | Defense | +25% max HP | Section 4 |
| **Pathfinder** | Movement | -1 AP for difficult terrain movement | Section 9 |
| **Footwork** | Movement | Move 1 tile ignoring ZoC | Section 8 |
| **Rotation** | Utility | Swap with adjacent ally, no ZoC | Section 8 |
| **Rally the Troops** | Support | Improve ally morale in range | Section 6 |
| **Fearsome** | Offense | +10 morale check difficulty on HP damage | Section 6 |
| **Indomitable** | Defense | 50% damage reduction until next turn | Section 5 |
| **Adrenaline Rush** | Utility | Act first next round | Section 9 |
| **Nine Lives** | Survival | Survive lethal hit at 1 HP (once per battle) | Section 7 |

---

## Appendix B: Formula Summary

### Hit Chance
```
melee_hit = melee_skill - melee_defense + elevation_mod + surround_mod + shield_mod + morale_mod + status_mod + perk_mod
ranged_hit = ranged_skill - ranged_defense + elevation_mod + distance_mod + obstruction_mod + shield_mod + morale_mod + status_mod + perk_mod
final_hit = clamp(hit, 5, 95)
```

### Damage
```
raw_damage = rand(min_damage, max_damage)
armor_ignore_damage = floor(raw_damage * armor_ignore_pct)
armor_damage = floor(raw_damage * armor_damage_mult)
remaining_armor = max(0, current_armor - armor_damage)
overflow = max(0, armor_damage - current_armor)
hp_damage = armor_ignore_damage + (if armor destroyed: floor(overflow / armor_damage_mult))
if head_hit and not steel_brow: hp_damage = floor(hp_damage * 1.5)
```

### Effective Initiative
```
effective_init = base_init - current_fatigue * (relentless ? 0.5 : 1.0) - armor_init_penalty + perk_bonuses + morale_mod
```

### Fatigue
```
max_usable = max_fatigue - equipment_penalty * (brawny ? 0.7 : 1.0)
passive_recovery = 15 per turn (20 with Second Wind)
recover_action = floor(max_usable * 0.50) (0.60 with Second Wind)
```

### Surrounding
```
surround_bonus = max(0, adjacent_allies - 1) * (backstabber ? 10 : 5)
```

### Morale Check
```
check_target = resolve + morale_state_mod + perk_bonus + leadership_bonus - event_difficulty
pass if rand(1, 100) <= check_target
```

### Dodge
```
dodge_bonus = floor(effective_initiative * 0.15)
```

### Anticipation
```
anticipation_bonus = floor(distance * effective_initiative * 0.08)
```

---

## Appendix C: Mobile-Specific Implementation Notes

### Touch Controls
- **Tap character**: Select character, show AP/fatigue/stats.
- **Tap tile**: If selected character, show movement cost. Tap again to confirm move.
- **Tap enemy**: Show hit chance, expected damage. Tap again to confirm attack.
- **Long press**: Show detailed tooltip (stats, status effects, terrain info).
- **Swipe**: Scroll/rotate camera.
- **Pinch**: Zoom in/out.

### Portrait Mode Layout
- **Top**: Enemy info bar (current selected enemy stats).
- **Center**: Hex grid battlefield (main view, ~60% of screen).
- **Bottom**: Action bar (attack, skills, wait, end turn) + selected character info.
- **AP/Fatigue**: Displayed as bars below the action buttons.

### Performance Considerations
- All formulas should be computed synchronously (no delays for calculation).
- Damage numbers should animate as floating text.
- Status effect applications should have brief (0.3s) visual feedback.
- Free attacks (ZoC) should animate quickly (0.5s max) to maintain flow.
- Turn transitions should be snappy (< 0.5s).
- AI turns should compute in < 1s, with movement animated at 2x speed.

### Accessibility
- All floating text should have sufficient contrast (white text with dark outline).
- Hit chance percentages displayed prominently before confirming attacks.
- Color-blind friendly status effect icons (distinct shapes, not just colors).
- Option to increase UI scale for readability.
