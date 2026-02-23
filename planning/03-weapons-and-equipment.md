# 03 - Weapons and Equipment Design Document

> **Game**: iTactics (working title)
> **Engine**: Babylon.js, mobile browser, portrait mode
> **Inspiration**: Battle Brothers
> **Version**: 1.0
> **Last Updated**: 2026-02-23

---

## Table of Contents

1. [Core Mechanics Overview](#1-core-mechanics-overview)
2. [Weapon Categories](#2-weapon-categories)
3. [Weapon Skills by Family](#3-weapon-skills-by-family)
4. [Shields](#4-shields)
5. [Armor System](#5-armor-system)
6. [Named / Famed Items](#6-named--famed-items)
7. [Inventory System](#7-inventory-system)
8. [Supplies and Consumables](#8-supplies-and-consumables)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Core Mechanics Overview

### 1.1 Damage Resolution Pipeline

Every attack follows this pipeline in strict order:

```
1. Roll hit chance (attacker Melee/Ranged Skill vs defender Melee/Ranged Defense)
2. If hit: determine raw damage (roll between weapon min-max, apply skill modifier)
3. Apply armor damage: raw_damage * (armor_damage_% / 100) => subtracted from armor durability
4. Apply armor mitigation: remaining armor absorbs (100% - armor_ignore_%) of raw damage
5. Remaining HP damage = raw_damage * (armor_ignore_% / 100) + overflow if armor breaks
6. Apply injuries if HP damage exceeds threshold (>15% of max HP)
```

### 1.2 Key Stat Definitions

| Stat | Abbreviation | Description |
|------|-------------|-------------|
| **Damage Range** | DMG | Min-Max base damage before modifiers |
| **Armor Damage %** | AD% | Percentage of raw damage applied to armor durability |
| **Armor Ignore %** | AI% | Percentage of raw damage that bypasses armor entirely |
| **Action Point Cost** | AP | Points consumed per basic attack (out of 9 per turn) |
| **Fatigue Cost** | FAT | Fatigue generated per basic attack |
| **Range** | RNG | Tile range (1 = adjacent melee, 2 = reach, 3-7 = ranged) |
| **Durability** | DUR | Weapon condition; at 0 the weapon breaks |
| **Hands** | H | 1H (one-handed) or 2H (two-handed) |

### 1.3 Action Point Budget

- Each character has **9 AP** per turn.
- Moving 1 tile costs **2 AP** (4 AP in difficult terrain).
- Basic attacks cost **4-6 AP** depending on weapon.
- Skills cost **4-9 AP** depending on the skill.
- Swapping weapons from bag costs **4 AP** (0 AP with Quick Hands perk).
- Using items (potions, bandages) costs **4 AP**.
- Waiting costs **0 AP** and delays the character to end of round.

---

## 2. Weapon Categories

### 2.1 Swords

Swords are versatile, reliable weapons with balanced stats. They have moderate armor damage but strong base damage and consistent hit chance bonuses. The sword family favors sustained, defensive combat.

**Family Bonus**: +5% hit chance (inherent accuracy bonus on all sword attacks).

#### One-Handed Swords

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Short Sword | 20-30 | 80% | 15% | 4 | 10 | 1 | 64 | 1H | 200 | +10% hit chance (total +15% with family bonus) |
| Arming Sword | 30-45 | 80% | 20% | 4 | 12 | 1 | 72 | 1H | 500 | Standard workhorse |
| Noble Sword | 35-50 | 80% | 25% | 4 | 12 | 1 | 72 | 1H | 2000 | Superior craftsmanship |

#### Two-Handed Swords

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Longsword | 45-70 | 80% | 25% | 4 | 15 | 1 | 80 | 2H | 1800 | Can use 1H sword skills + 2H skills |
| Greatsword | 55-85 | 80% | 30% | 6 | 20 | 1 | 96 | 2H | 3500 | AoE sweep capability |

---

### 2.2 Axes

Axes excel at destroying armor and shields. Their damage is less consistent (wider ranges) but they hit armor hard. The split shield mechanic makes them essential against shielded enemies.

**Family Bonus**: +10% armor damage (stacks with AD%).

#### One-Handed Axes

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Hatchet | 20-35 | 120% | 10% | 4 | 12 | 1 | 48 | 1H | 150 | Can be thrown (RNG 3, single use) |
| Hand Axe | 30-50 | 130% | 10% | 4 | 14 | 1 | 56 | 1H | 400 | Reliable anti-armor |
| Fighting Axe | 40-60 | 140% | 10% | 4 | 16 | 1 | 64 | 1H | 900 | Premium 1H axe |

#### Two-Handed Axes

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Great Axe | 50-85 | 150% | 10% | 6 | 22 | 1 | 72 | 2H | 1500 | AoE round swing |
| Longaxe | 45-75 | 140% | 10% | 6 | 20 | 2 | 64 | 2H | 1800 | Reach weapon; also counts as Polearm |
| Bardiche | 55-90 | 160% | 10% | 6 | 24 | 1 | 80 | 2H | 2500 | Highest armor damage in class |

---

### 2.3 Maces and Hammers

Blunt weapons bypass armor through sheer concussive force. High armor ignore % means they damage the person inside the armor. The stun mechanic is their signature ability, disabling enemies for a full turn.

**Family Bonus**: +10% chance to stun on any hit (in addition to Stun skill).

#### One-Handed Maces/Hammers

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Club | 15-25 | 60% | 30% | 4 | 10 | 1 | 56 | 1H | 50 | Cheap, reliable stun platform |
| Winged Mace | 25-40 | 80% | 35% | 4 | 14 | 1 | 72 | 1H | 600 | Balanced blunt weapon |
| Morning Star | 30-55 | 100% | 30% | 4 | 16 | 1 | 64 | 1H | 1200 | High damage variance; ignores shield defense |
| Warhammer | 20-40 | 60% | 50% | 4 | 15 | 1 | 80 | 1H | 1500 | Extreme armor penetration |

#### Two-Handed Maces/Hammers

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Two-Handed Hammer | 40-70 | 80% | 50% | 6 | 25 | 1 | 96 | 2H | 2000 | AoE stun; devastating vs plate |
| Polehammer | 35-60 | 80% | 45% | 6 | 22 | 2 | 80 | 2H | 2500 | Reach weapon; also counts as Polearm |

---

### 2.4 Flails

Flails are unpredictable weapons that bypass shield defense bonuses entirely. Their damage is highly variable but they cannot be parried. The chain-wrapped head ignores the shield's contribution to melee defense.

**Family Bonus**: Ignore shield melee defense bonus on all attacks.

#### One-Handed Flails

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Flail | 20-45 | 90% | 20% | 4 | 14 | 1 | 56 | 1H | 400 | Wide damage range |
| Three-Headed Flail | 15-25 x3 | 80% | 15% | 4 | 18 | 1 | 48 | 1H | 1400 | 3 separate hits; each rolls independently |

#### Two-Handed Flails

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Two-Handed Flail | 35-75 | 100% | 20% | 6 | 24 | 1 | 64 | 2H | 1800 | AoE lash; enormous damage variance |

---

### 2.5 Cleavers

Cleavers specialize in inflicting bleeding wounds that deal damage over time. They are anti-flesh weapons -- strong against lightly armored targets but weak against heavy plate. The Decapitate skill is one of the highest single-target damage abilities in the game.

**Family Bonus**: +10% damage vs targets with no armor on the hit location.

#### One-Handed Cleavers

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Military Cleaver | 30-45 | 60% | 40% | 4 | 12 | 1 | 52 | 1H | 350 | Applies bleed (5 dmg/turn, 2 turns) |
| Falchion | 35-55 | 70% | 35% | 4 | 14 | 1 | 64 | 1H | 800 | Stronger bleed (8 dmg/turn, 2 turns) |

#### Two-Handed Cleavers

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Kriegsmesser | 50-80 | 80% | 30% | 6 | 20 | 1 | 72 | 2H | 1600 | Bleed (10 dmg/turn, 3 turns) |
| Crypt Cleaver | 60-95 | 70% | 35% | 6 | 24 | 1 | 80 | 2H | 4000 | Bleed (15 dmg/turn, 3 turns); undead bane |

---

### 2.6 Spears

Spears are the simplest and most accessible weapon type. They grant a large hit chance bonus, making them ideal for low-skill recruits. The Spearwall ability creates a zone of control that punishes enemies moving adjacent.

**Family Bonus**: +20% hit chance on basic attacks.

#### One-Handed Spears

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Spear | 20-35 | 80% | 15% | 4 | 10 | 1 | 56 | 1H | 200 | Best early-game accuracy weapon |
| Boar Spear | 25-45 | 90% | 15% | 4 | 12 | 1 | 64 | 1H | 550 | Can brace vs charging enemies (double damage) |

> **Note**: Spears can be paired with shields for a defensive frontline setup. The +20% hit bonus makes them forgiving for new characters with low melee skill.

---

### 2.7 Polearms

Polearms are 2-tile reach weapons that attack over allies. They cannot attack adjacent tiles (with the exception of certain skills). This makes them powerful second-line weapons but vulnerable if enemies close to melee range.

**Family Bonus**: +2 tile range on basic attacks (attack from 2 tiles away). Cannot attack adjacent tiles with basic attack (only with specific skills like Hook).

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Pike | 35-55 | 60% | 30% | 4 | 14 | 2 | 56 | 2H | 800 | Longest reach; low armor damage |
| Billhook | 35-60 | 100% | 20% | 6 | 18 | 2 | 64 | 2H | 1200 | Hook ability pulls enemies |
| Polehammer | 35-60 | 80% | 45% | 6 | 22 | 2 | 80 | 2H | 2500 | Dual-category: Mace/Hammer + Polearm |
| Warscythe | 45-80 | 80% | 25% | 6 | 22 | 2 | 72 | 2H | 2200 | Highest polearm base damage |
| Glaive | 40-70 | 90% | 20% | 6 | 20 | 2 | 72 | 2H | 1800 | AoE sweep at range |
| Longaxe | 45-75 | 140% | 10% | 6 | 20 | 2 | 64 | 2H | 1800 | Dual-category: Axe + Polearm |

> **Important Implementation Note**: The "cannot attack adjacent" restriction must be enforced in the targeting system. When an enemy is at range 1, polearm basic attacks are unavailable; only specific skills (Hook, close-range variants) can target adjacent tiles.

---

### 2.8 Daggers

Daggers are fast, low-damage weapons designed to bypass armor through the Puncture skill. They are ideal for capturing enemy equipment intact (Puncture ignores armor without damaging it). Low AP cost allows multiple attacks per turn.

**Family Bonus**: +3 AP refund on kill (allows chaining kills).

#### One-Handed Daggers

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Knife | 10-20 | 50% | 30% | 3 | 6 | 1 | 32 | 1H | 30 | Cheapest weapon; fast |
| Dagger | 15-25 | 50% | 35% | 3 | 7 | 1 | 40 | 1H | 120 | Standard sidearm |
| Rondel Dagger | 20-30 | 40% | 50% | 3 | 8 | 1 | 48 | 1H | 500 | Designed for armor gaps; highest AI% in class |

> **Design Note**: Daggers attack twice per use (each hit rolls separately). The listed AP cost covers both strikes. This makes them excellent vs unarmored targets and for finishing off wounded enemies.

---

### 2.9 Bows

Bows are the primary ranged weapon. They have unlimited range (up to 7 tiles) but suffer accuracy penalties at long range. Bows deal reduced damage to armor but can target any visible enemy. Indirect fire is not possible.

**Family Bonus**: No penalty for shooting at targets not in melee (ranged units without engagement penalty).

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Short Bow | 20-35 | 40% | 25% | 5 | 12 | 5 | 40 | 2H | 200 | Quick Shot costs only 3 AP; -10% dmg at range 5+ |
| Hunting Bow | 25-45 | 50% | 25% | 5 | 14 | 6 | 48 | 2H | 500 | Versatile; -10% dmg at range 6+ |
| War Bow | 35-60 | 60% | 25% | 6 | 20 | 7 | 56 | 2H | 1500 | Heavy draw; -10% dmg at range 7; requires 60+ Ranged Skill |

**Range Accuracy Penalties**:

| Distance (tiles) | Accuracy Modifier |
|-------------------|-------------------|
| 1-2 | -30% (point blank in melee) |
| 3 | +0% (optimal) |
| 4 | -5% |
| 5 | -10% |
| 6 | -15% |
| 7 | -20% |

**Scatter**: Missed bow shots have a 33% chance to hit an adjacent tile (friend or foe). Calculate scatter direction randomly from the 6 hex neighbors of the target.

**Ammunition**: Bows consume arrows. Each bow starts with a quiver of **20 arrows**. Arrows can be replenished from inventory or the ammunition pool between battles.

---

### 2.10 Crossbows

Crossbows trade rate of fire for raw damage and armor penetration. They require a reload action between shots. Higher damage per shot than bows, but lower DPS due to the reload mechanic.

**Family Bonus**: +10% armor penetration bonus on all shots.

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Light Crossbow | 40-60 | 60% | 35% | 5 | 16 | 6 | 64 | 2H | 600 | Reload: 5 AP |
| Heavy Crossbow | 55-85 | 70% | 40% | 6 | 22 | 7 | 80 | 2H | 2000 | Reload: 6 AP; devastating single shots |

**Reload Mechanic**: After firing, the crossbow must be reloaded before firing again. Reload costs AP and fatigue:

| Crossbow | Reload AP | Reload FAT |
|----------|-----------|------------|
| Light Crossbow | 5 | 10 |
| Heavy Crossbow | 6 | 14 |

**Ammunition**: Crossbows use bolts. Each crossbow starts with **12 bolts**. Bolts are heavier than arrows and the quiver holds fewer.

**Range Accuracy Penalties**: Same table as bows (see Section 2.9).

---

### 2.11 Throwing Weapons

Throwing weapons are secondary ranged options used from the offhand or as consumables. They have limited ammunition but deal high burst damage at short-to-medium range. After throwing, the character can switch to melee seamlessly.

**Family Bonus**: No accuracy penalty at range 1-2 (effective in melee range).

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Ammo | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|------|-------|
| Javelin (stack of 5) | 30-50 | 80% | 30% | 4 | 12 | 4 | N/A | 1H | 150 | 5 | +20% hit chance; can be used in melee (as spear) |
| Throwing Axe (stack of 5) | 25-50 | 120% | 15% | 4 | 14 | 3 | N/A | 1H | 200 | 5 | High armor damage; +10% hit |
| Dart (stack of 8) | 15-30 | 40% | 40% | 3 | 8 | 4 | N/A | 1H | 80 | 8 | Fast; low damage; high AP efficiency |

> **Implementation Note**: Throwing weapons are consumed on use. The stack count decreases by 1 per throw. When the stack is empty, the slot becomes empty. Throwing weapons occupy 1 bag slot per stack. Multiple stacks can be carried.

---

### 2.12 Firearms

Firearms are rare, expensive, and devastating. They ignore a massive percentage of armor and deal high damage, but require lengthy reloading and suffer at longer ranges. Loud noise may affect morale of nearby enemies (and allies).

**Family Bonus**: -15 morale check penalty on hit target (fear effect).

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Handgonne | 50-90 | 50% | 60% | 6 | 25 | 5 | 48 | 2H | 3000 | Reload: 9 AP (cannot reload and fire same turn) |

**Reload Mechanic**:

| Firearm | Reload AP | Reload FAT |
|---------|-----------|------------|
| Handgonne | 9 | 20 |

> Because reload costs 9 AP (an entire turn), the Handgonne is a "fire once, swap to melee" weapon in practice. Quick Hands perk is essential for Handgonne users: fire, swap to melee weapon for free, and fight in melee.

**Ammunition**: Handgonne uses **powder and shot**. Each handgonne comes with **8 shots**.

**Scatter**: Missed firearm shots scatter to an adjacent tile with 50% probability (higher than bows due to inaccuracy).

---

### 2.13 Whips

Whips are exotic weapons that attack at 2-tile range like polearms but can also attack adjacent tiles. They deal low direct damage but specialize in disarming enemies and inflicting morale penalties.

**Family Bonus**: Can target both range 1 and range 2 tiles. Attacks cannot be retaliated against (no counter-attack trigger).

| Weapon | DMG | AD% | AI% | AP | FAT | RNG | DUR | Hands | Value | Notes |
|--------|-----|-----|-----|----|----|-----|-----|-------|-------|-------|
| Whip | 15-30 | 40% | 50% | 4 | 10 | 2 | 40 | 1H | 800 | Disarm on hit (25% base chance); can pair with 1H weapon |

> **Design Note**: Whips are niche utility weapons. Their low damage is offset by the Disarm mechanic and 2-tile range. Pairing a whip with a dagger in the other hand creates a "disarm + puncture" combo for capturing enemy equipment.

---

## 3. Weapon Skills by Family

Every weapon family grants access to specific skills. Characters can use any skill associated with the weapon they currently wield. Perks may modify or unlock additional interactions.

### 3.1 Sword Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Slash** | 4 | 12 | 100% | Standard attack. +5% hit chance (sword family bonus). If attack misses, gain +10% defense until next turn. | Any 1H Sword |
| **Riposte** | 5 | 25 | 100% | Enter Riposte stance until next turn. Automatically counter-attack each melee attacker (up to 3 counters). Each counter uses Riposte damage with -15% hit chance. Costs 10 FAT per counter triggered. | Any 1H Sword |
| **Split** | 6 | 20 | 120% | Two-handed sword overhead strike. +15% armor damage. Cannot be used with 1H swords. | Any 2H Sword |
| **Swing** | 6 | 25 | 90% | AoE sweep hitting up to 3 adjacent targets in an arc. Each target is attacked independently. -5% hit chance per additional target. | 2H Sword (Greatsword only) |
| **Gash** | 4 | 14 | 60% | A shallow cut. Low damage but applies **Bleed** (5 HP/turn for 2 turns). Bleed stacks with existing bleed effects up to 15 HP/turn. | Any Sword |

---

### 3.2 Axe Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Chop** | 4 | 14 | 100% | Standard axe attack. +10% bonus armor damage (axe family bonus). | Any 1H Axe |
| **Split Shield** | 6 | 20 | 80% | Targets the enemy's shield directly. Deals damage to the shield's durability equal to (weapon damage x 2). If the shield breaks, excess damage hits the enemy. -15% hit chance. | Any 1H Axe |
| **Headhunter** | 5 | 18 | 110% | Targets head specifically (+100% head hit chance). Ignores head armor by additional 10%. | Any 1H Axe |
| **Round Swing** | 6 | 30 | 80% | AoE attack hitting ALL adjacent tiles (up to 6 targets on hex grid). -15% hit chance. Each target is rolled independently. | Any 2H Axe |
| **Split Man** | 6 | 25 | 130% | Powerful overhead chop. +50% armor damage. Single target only. | Any 2H Axe |

---

### 3.3 Mace/Hammer Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Strike** | 4 | 14 | 100% | Standard blunt attack. +10% stun chance (family bonus). | Any 1H Mace/Hammer |
| **Stun** | 4 | 20 | 50% | Guaranteed stun if the attack hits. Stunned target loses their next turn entirely (cannot act, 0 melee/ranged defense). Stun lasts 1 turn. -15% hit chance. | Any 1H Mace/Hammer |
| **Knock Out** | 5 | 22 | 40% | Low damage but reduces target's AP by 4 on their next turn (instead of full stun). More reliable than Stun (+0% hit penalty). | Any 1H Mace/Hammer |
| **Shatter** | 6 | 30 | 120% | Devastating overhead blow. +30% armor damage. 33% chance to destroy a random piece of the target's armor (reduces durability to 0). | Any 2H Mace/Hammer |
| **Crush** | 6 | 28 | 100% | AoE slam hitting target and 2 adjacent tiles. Each target takes full damage. +20% stun chance on all targets. -10% hit chance. | 2H Hammer only |

---

### 3.4 Flail Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Bash** | 4 | 14 | 100% | Standard flail attack. Ignores shield defense bonus (family bonus). | Any 1H Flail |
| **Lash** | 5 | 18 | 80% | Whipping strike that targets the head specifically. +50% chance to hit head instead of body. Ignores shield defense. | Any 1H Flail |
| **Triple Lash** | 4 | 22 | 60% per hit | Three-Headed Flail only. 3 independent attacks, each can target a different body part (random). Each hit rolls separately for hit/miss. | Three-Headed Flail |
| **Hail** | 6 | 30 | 70% | 2H Flail AoE. Hits target tile and all 6 adjacent tiles (including allies!). Each tile rolled independently. -20% hit chance. Friendly fire warning. | 2H Flail |
| **Entangle** | 5 | 16 | 30% | Wraps the chain around the target's weapon arm. Target gets -25% melee skill and -2 AP on their next turn. | Any Flail |

---

### 3.5 Cleaver Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Gash** | 4 | 12 | 60% | Shallow cut. Applies **Bleed**: 5 HP damage per turn for 3 turns. Bleed effects stack (multiple gashes = more bleed damage per turn, max 20 HP/turn). | Any 1H Cleaver |
| **Slash** | 4 | 14 | 100% | Standard cleaver attack. Higher damage than Gash but no bleed. +10% damage vs unarmored locations. | Any 1H Cleaver |
| **Decapitate** | 6 | 25 | 150% + (missing HP%) | Execute strike. Damage increases proportionally to the target's missing HP. At 50% HP, deals 200% damage. At 25% HP, deals 225% damage. Formula: `base * (1.5 + (1 - target_hp_ratio))`. | Any Cleaver |
| **Disembowel** | 6 | 28 | 120% | 2H Cleaver power strike. Applies heavy bleed (15 HP/turn, 3 turns) and reduces target's max fatigue by 15 for the rest of battle. | Any 2H Cleaver |
| **Reap** | 6 | 30 | 80% | AoE sweep hitting up to 3 adjacent targets. Each target hit receives Bleed (8 HP/turn, 2 turns). -10% hit chance. | Any 2H Cleaver |

---

### 3.6 Spear Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Thrust** | 4 | 10 | 100% | Standard spear thrust. +20% hit chance (family bonus). Most accurate melee attack in the game. | Any 1H Spear |
| **Spearwall** | 5 | 20 | 80% | Enter Spearwall stance until next turn. Automatically attacks any enemy that moves into an adjacent tile (up to 3 free attacks). Each spearwall attack costs 12 FAT. If any spearwall attack hits, the enemy's movement is stopped. | Any 1H Spear |
| **Brace** | 3 | 8 | 200% | Passive stance. If the character is charged (enemy moves 2+ tiles and attacks), the spear deals double damage as a free counter-attack before the charge hits. Costs 3 AP to activate; lasts until next turn. | Boar Spear only |
| **Jab** | 3 | 8 | 50% | Quick poke. Very low damage but very low AP cost. Can be used to finish off weakened enemies or trigger effects. | Any 1H Spear |

---

### 3.7 Polearm Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Thrust** | 4 | 14 | 100% | Standard 2-tile range thrust. Cannot target adjacent tiles. | Any Polearm |
| **Hook** | 6 | 22 | 80% | Pulls the target 1 tile toward the attacker. Can target adjacent or 2-tile range. Breaks the target's formation. Target loses 3 AP on their next turn. | Billhook, Longaxe |
| **Repel** | 5 | 18 | 70% | Pushes target 1 tile away from the attacker. If target cannot be pushed (blocked behind), deals +30% damage instead. Breaks engagement. | Any Polearm |
| **Lunge** | 6 | 20 | 120% | Powerful 2-tile thrust. +10% armor penetration. If target is killed, gain +4 AP refund. | Pike, Warscythe |
| **Sweep** | 6 | 25 | 80% | AoE attack hitting up to 3 tiles in an arc at 2-tile range. Each target rolled independently. -10% hit chance. | Glaive, Warscythe, Longaxe |
| **Impale** | 6 | 22 | 100% | Pins the target in place. Target cannot move for 1 turn. Attacker also cannot move while impaling. Can be released early (free action). | Pike only |

---

### 3.8 Dagger Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Stab** | 3 | 6 | 50% x2 | Two quick stabs. Each hit rolls independently. Very fast (3 AP for 2 attacks). Ideal for finishing wounded targets. | Any Dagger |
| **Puncture** | 4 | 12 | 40% | Targets armor gaps. Deals direct HP damage, completely ignoring armor. Does NOT damage armor durability at all. Ideal for looting: kills enemies while keeping their gear intact. -10% hit chance. | Any Dagger |
| **Deathblow** | 5 | 18 | 200% | Coup de grace on a stunned, sleeping, or rooted target. Only usable against incapacitated enemies. Ignores 50% of armor. Massive single-hit damage. | Any Dagger |
| **Shiv** | 2 | 4 | 30% | Ultra-fast attack. Lowest AP cost of any attack in the game. Minimal damage but can be used 4 times per turn for chip damage. | Knife, Dagger |
| **Lacerate** | 4 | 10 | 60% | Applies Bleed (5 HP/turn, 2 turns) and reduces target's initiative by 15. | Rondel Dagger |

---

### 3.9 Bow Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Aimed Shot** | 6 | 16 | 100% | Careful aimed shot. Full accuracy. Standard ranged attack. Consumes 1 arrow. | Any Bow |
| **Quick Shot** | 3 | 10 | 80% | Snap shot. -15% hit chance but costs only 3 AP. Allows 2 shots per turn with some bows. Consumes 1 arrow. | Short Bow, Hunting Bow |
| **Rain of Arrows** | 9 | 35 | 50% | AoE barrage. Targets a hex tile and hits all units in a 7-hex area (center + 6 adjacent). Each target rolled independently with -25% hit chance. Consumes 5 arrows. Indirect fire (ignores line of sight). | War Bow only |
| **Crippling Shot** | 6 | 20 | 80% | Targets the legs. -2 AP and -1 tile movement for 2 turns on hit. | Any Bow |
| **Fire Arrow** | 6 | 18 | 70% | Ignites the target. Deals 10 fire damage/turn for 2 turns. Can ignite terrain (oil, hay). Requires fire source (torch, campfire in adjacent tile). Consumes 1 arrow. | Any Bow |

---

### 3.10 Crossbow Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Shoot** | 5-6 | 16-22 | 100% | Standard crossbow shot. High damage, high armor penetration. Must reload before next shot. Consumes 1 bolt. | Any Crossbow |
| **Aimed Shot** | 6 | 20 | 120% | Carefully aimed shot. +10% hit chance over standard. Must reload before next shot. Consumes 1 bolt. | Any Crossbow |
| **Reload** | 5-6 | 10-14 | N/A | Reloads the crossbow. Must be performed before Shoot can be used again. | Any Crossbow |
| **Pavise Shot** | 6 | 18 | 100% | Fire while braced behind a deployed pavise shield. +15 ranged defense until next turn. Cannot move on the same turn. Consumes 1 bolt. | Heavy Crossbow + Pavise Shield |

---

### 3.11 Throwing Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Throw** | 4 | 12 | 100% | Standard throw. Consumes 1 from the stack. No range penalty at short range (family bonus). | Any Throwing Weapon |
| **Aimed Throw** | 5 | 16 | 120% | Careful throw with +10% hit chance. Consumes 1 from the stack. | Any Throwing Weapon |
| **Barrage** | 6 | 22 | 60% x2 | Throw 2 in rapid succession at the same target. Each rolled independently. Consumes 2 from the stack. | Darts only |
| **Pin** | 4 | 14 | 80% | Javelin throw that roots the target in place for 1 turn if it hits. The javelin pins their cloak/armor to the ground. Consumes 1 javelin. | Javelins only |

---

### 3.12 Firearm Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Fire** | 6 | 25 | 100% | Fire the handgonne. Enormous damage. -15 morale check on target. 50% scatter on miss. Consumes 1 shot. Must reload before firing again. | Handgonne |
| **Reload** | 9 | 20 | N/A | Reload the handgonne. Takes an entire turn. | Handgonne |
| **Point Blank** | 6 | 28 | 150% | Fire at an adjacent target. +30% hit chance. Devastating damage. -20 morale check on target. Risk of self-injury (5% chance of 10-20 self-damage). Consumes 1 shot. | Handgonne |

---

### 3.13 Whip Skills

| Skill | AP | FAT | Damage Modifier | Effect | Requires |
|-------|----|----|----------------|--------|----------|
| **Crack** | 4 | 10 | 100% | Standard whip attack. Range 1-2. No counter-attack triggered. | Whip |
| **Disarm** | 5 | 16 | 30% | Attempts to disarm the target. 25% base chance + (attacker Melee Skill - target Melee Defense)/2 %. Disarmed weapon drops to the ground tile. Target must spend 4 AP to pick it up. | Whip |
| **Snap** | 3 | 8 | 50% | Quick strike. Low damage but only 3 AP. Good for applying pressure and triggering morale checks. Range 1-2. | Whip |
| **Entangle** | 5 | 14 | 20% | Wraps around the target. Target loses 2 AP and -10 melee defense on their next turn. | Whip |

---

## 4. Shields

Shields are equipped in the off-hand and provide defensive bonuses. They can be damaged and destroyed by Split Shield attacks. Shields add fatigue penalty (reducing max stamina).

### 4.1 Shield Stats

| Shield | Melee Def | Ranged Def | Shieldwall Bonus | Durability | FAT Penalty | Hands | Value | Notes |
|--------|-----------|------------|------------------|------------|-------------|-------|-------|-------|
| Buckler | +10 | +10 | +10 | 48 | -8 | 1H | 100 | Lightest shield; minimal fatigue impact |
| Wooden Round Shield | +15 | +15 | +15 | 64 | -12 | 1H | 200 | Standard shield; cheap and available |
| Heater Shield | +20 | +15 | +15 | 80 | -16 | 1H | 500 | Good melee defense; balanced |
| Kite Shield | +15 | +25 | +20 | 96 | -18 | 1H | 800 | Best ranged defense; cavalry heritage |
| Tower Shield | +25 | +30 | +25 | 120 | -24 | 1H | 1500 | Massive defense; heavy fatigue penalty; -5 initiative |
| Orc Shield | +20 | +15 | +15 | 160 | -22 | 1H | 600 | Crude but incredibly durable; hard to split |
| Goblin Shield | +10 | +20 | +10 | 32 | -6 | 1H | 80 | Fragile but light; good ranged defense |

### 4.2 Shield Mechanics

**Shieldwall Skill** (Available to all shield users):

| Skill | AP | FAT | Effect |
|-------|----|----|--------|
| **Shieldwall** | 4 | 15 | Enter Shieldwall stance. Gain the Shieldwall Bonus on top of base shield defense until next turn. Adjacent allies with shields also gain +5 melee defense. Cannot move while in Shieldwall. |
| **Shield Bash** | 4 | 12 | Bash with the shield. Deals 15-25 damage (ignores weapon). Pushes target back 1 tile. 25% chance to stun for 1 turn. -10% hit chance. |
| **Knock Back** | 4 | 14 | Push target back 1 tile without dealing damage. 100% success rate if the attack hits. Used for repositioning enemies. |

**Shield Durability**: When a shield's durability reaches 0, it is destroyed and all defense bonuses are lost. Shields can be repaired with Tools between battles.

**Fatigue Penalty**: The FAT Penalty reduces the character's maximum fatigue pool. For example, a character with 100 max fatigue carrying a Heater Shield (-16) has an effective max fatigue of 84.

---

## 5. Armor System

Armor is split into two slots: **Body Armor** and **Head Armor (Helmet)**. Each has independent durability and provides damage absorption. When armor durability reaches 0 on a location, subsequent hits to that location deal full HP damage.

### 5.1 Body Armor

#### Tier 1: Cloth and Padding (5-30 Armor)

| Armor | Durability | FAT Penalty | Value | Notes |
|-------|------------|-------------|-------|-------|
| Tattered Rags | 5 | 0 | 5 | Peasant starting gear |
| Linen Tunic | 10 | 0 | 15 | Minimal protection |
| Padded Surcoat | 20 | -3 | 50 | Soft armor; some padding |
| Thick Padded Vest | 25 | -4 | 80 | Decent early-game option |
| Gambeson | 30 | -5 | 120 | Quilted armor; good vs slashing |

#### Tier 2: Leather Armor (40-80 Armor)

| Armor | Durability | FAT Penalty | Value | Notes |
|-------|------------|-------------|-------|-------|
| Leather Jerkin | 40 | -6 | 150 | Basic leather protection |
| Hardened Leather Armor | 55 | -8 | 300 | Boiled and hardened leather |
| Studded Leather Armor | 65 | -10 | 500 | Reinforced with metal studs |
| Leather Lamellar Armor | 75 | -12 | 700 | Overlapping leather strips |
| Thick Leather Armor | 80 | -13 | 900 | Heavy, multi-layered leather |

#### Tier 3: Mail Armor (100-180 Armor)

| Armor | Durability | FAT Penalty | Value | Notes |
|-------|------------|-------------|-------|-------|
| Light Mail Shirt | 100 | -15 | 800 | Short-sleeved mail |
| Mail Hauberk | 120 | -18 | 1200 | Full mail to mid-thigh |
| Reinforced Mail Hauberk | 140 | -20 | 2000 | Mail with leather backing |
| Heavy Mail Hauberk | 160 | -23 | 3000 | Double-layered mail |
| Augmented Mail Hauberk | 180 | -25 | 4500 | Mail with plate reinforcement |

#### Tier 4: Plate Armor (200-330 Armor)

| Armor | Durability | FAT Penalty | Value | Notes |
|-------|------------|-------------|-------|-------|
| Coat of Plates | 200 | -28 | 5000 | Plates riveted to fabric |
| Scale Armor | 220 | -30 | 6500 | Overlapping metal scales |
| Coat of Scales | 250 | -32 | 8000 | Heavy scale construction |
| Full Plate Armor | 300 | -38 | 15000 | Complete plate coverage; rare |
| Lordly Plate Armor | 330 | -42 | 25000 | Masterwork; noble houses only |

### 5.2 Head Armor (Helmets)

#### Tier 1: Hoods and Caps (10-60 Armor)

| Helmet | Durability | FAT Penalty | Vision Penalty | Value | Notes |
|--------|------------|-------------|----------------|-------|-------|
| Headband | 10 | 0 | 0 | 5 | Negligible protection |
| Hood | 20 | -1 | 0 | 20 | Basic cloth protection |
| Leather Cap | 30 | -2 | 0 | 50 | Simple leather head cover |
| Padded Coif | 40 | -3 | 0 | 100 | Quilted head protection |
| Mail Coif | 60 | -5 | 0 | 200 | Open-faced mail hood |

#### Tier 2: Open Helms (80-120 Armor)

| Helmet | Durability | FAT Penalty | Vision Penalty | Value | Notes |
|--------|------------|-------------|----------------|-------|-------|
| Nasal Helmet | 80 | -6 | 0 | 300 | Simple helm with nose guard |
| Kettle Hat | 90 | -7 | 0 | 450 | Wide-brimmed helm; popular infantry |
| Flat Top Helmet | 100 | -8 | 0 | 600 | Cylindrical open-faced helm |
| Norman Helmet | 110 | -9 | 0 | 800 | Conical helm with nose guard |
| Sallet | 120 | -10 | 0 | 1000 | Elegant helm; good visibility |

#### Tier 3: Closed Helms (130-200 Armor)

| Helmet | Durability | FAT Penalty | Vision Penalty | Value | Notes |
|--------|------------|-------------|----------------|-------|-------|
| Closed Mail Coif | 130 | -12 | -1 | 1200 | Mail covering face; slight vision loss |
| Bascinet | 150 | -14 | -2 | 2000 | Visor helm; significant vision restriction |
| Barbute | 170 | -16 | -2 | 3000 | Italian style; narrow eye slits |
| Closed Flat Top | 190 | -18 | -3 | 4500 | Full face plate; heavy |
| Armet | 200 | -20 | -3 | 6000 | Hinged visor; premium closed helm |

#### Tier 4: Great Helms (200-300+ Armor)

| Helmet | Durability | FAT Penalty | Vision Penalty | Value | Notes |
|--------|------------|-------------|----------------|-------|-------|
| Great Helm | 220 | -22 | -4 | 7000 | Barrel helm; extreme protection |
| Reinforced Great Helm | 260 | -25 | -4 | 10000 | Double-plated great helm |
| Crown Helm | 280 | -28 | -5 | 15000 | Lordly great helm with crest |
| Full Jousting Helm | 300 | -30 | -6 | 20000 | Maximum head protection; nearly blind |
| Legendary Great Helm | 330 | -26 | -3 | 30000+ | Named item tier; masterwork |

### 5.3 Vision Penalty Explanation

Vision penalty reduces the character's ranged defense and ranged skill proportionally:

| Vision Penalty | Effect |
|----------------|--------|
| 0 | No penalty |
| -1 | -5 Ranged Defense, -3 Ranged Skill |
| -2 | -10 Ranged Defense, -6 Ranged Skill |
| -3 | -15 Ranged Defense, -10 Ranged Skill |
| -4 | -20 Ranged Defense, -15 Ranged Skill |
| -5 | -25 Ranged Defense, -20 Ranged Skill |
| -6 | -30 Ranged Defense, -25 Ranged Skill |

> **Design Rationale**: Closed helms create a meaningful trade-off between head protection and combat awareness. Archers should never wear closed helms. Frontline fighters must weigh the protection against the defense penalty.

### 5.4 Armor Attachment System

Body armor can have one attachment that modifies its properties. Attachments are applied via the equipment screen and can be swapped between battles (not during battle).

| Attachment | Effect | FAT Cost | Value | Applicable To |
|------------|--------|----------|-------|---------------|
| Bone Plates | +10 armor durability | -2 | 50 | Any body armor |
| Leather Patches | +15 armor durability | -2 | 100 | Any body armor |
| Mail Patch | +20 armor durability | -4 | 300 | Leather or higher |
| Reinforced Plates | +30 armor durability | -6 | 600 | Mail or higher |
| Lordly Crest | +10 Resolve (morale) | -2 | 500 | Plate armor only |
| Fur Padding | +10 armor durability, cold resistance | -3 | 200 | Any body armor |
| Spiked Pauldrons | +5 armor, reflects 5 damage to melee attackers | -4 | 400 | Mail or higher |
| Heraldic Tabard | +5 Resolve, +5 armor | -1 | 350 | Mail or higher |
| Gilded Ornaments | +0 armor, +15 Resolve (morale), +50% sell value | -1 | 1000 | Plate armor only |
| Thick Padding Liner | +15 armor durability, +5% blunt damage reduction | -3 | 250 | Any body armor |

**Helmet Attachments**:

| Attachment | Effect | FAT Cost | Value | Applicable To |
|------------|--------|----------|-------|---------------|
| Face Guard | +10 head armor, -1 Vision | -2 | 200 | Open helms |
| Aventail | +15 head armor | -3 | 350 | Any helm |
| Crest/Plume | +5 Resolve | -1 | 250 | Any helm |
| Closed Visor | +25 head armor, -2 Vision | -4 | 500 | Open helms tier 2+ |
| Reinforced Brow | +10 head armor | -2 | 300 | Any helm |
| Cheek Guards | +10 head armor, -1 Vision | -2 | 200 | Open helms |

---

### 5.5 Damage to Armor vs HP Resolution (Detailed)

When a hit lands, the system resolves damage to both armor and HP simultaneously:

```
given:
  raw_damage      = random(weapon_min, weapon_max) * skill_damage_modifier
  armor_current   = target's armor on hit location (body or head)
  weapon_ad       = weapon's armor_damage_%
  weapon_ai       = weapon's armor_ignore_%

step 1 - armor damage:
  armor_damage = raw_damage * weapon_ad
  armor_current = max(0, armor_current - armor_damage)

step 2 - direct HP damage (armor penetration):
  hp_damage_direct = raw_damage * weapon_ai

step 3 - overflow damage (if armor breaks):
  if armor_damage > armor_before_hit:
    overflow = armor_damage - armor_before_hit
    hp_damage_overflow = overflow * (1.0 - weapon_ai)  // only non-penetrating portion overflows
  else:
    hp_damage_overflow = 0

step 4 - total HP damage:
  total_hp_damage = hp_damage_direct + hp_damage_overflow

step 5 - injury check:
  if total_hp_damage > (target_max_hp * 0.15):
    roll_injury(hit_location, weapon_type)
```

### 5.6 Hit Location

Each attack targets either the **body** (checks body armor) or the **head** (checks head armor). Base distribution:

| Location | Probability | Notes |
|----------|-------------|-------|
| Body | 75% | Default target |
| Head | 25% | Higher damage potential; triggers head injuries |

Modifiers that affect head hit chance:

- **Headhunter** perk: After hitting the body, next attack has +100% head chance (guaranteed head hit)
- **Axe Headhunter skill**: +100% head chance on that attack
- **Flail Lash**: +50% head chance (total 75% head)
- **Certain helmets**: Reduce head hit chance by 5-10% (deflection)

---

## 6. Named / Famed Items

Named (Famed) items are unique, powerful versions of standard weapons and armor. They have improved base stats and additional bonus properties. They are rare loot found from champion enemies, legendary locations, and endgame content.

### 6.1 Named Weapon Generation

When a named weapon drops, the game:

1. Selects a base weapon type (any weapon in the game)
2. Applies **2-3 bonus rolls** from the bonus table
3. Generates a unique name (procedural or from a name pool)
4. Applies a visual variant (tinted, glowing, ornate model)

**Named Weapon Bonus Rolls**:

| Bonus | Min Roll | Max Roll | Weight | Notes |
|-------|----------|----------|--------|-------|
| +Damage (flat) | +3 | +15 | 20% | Added to both min and max damage |
| +Damage (%) | +5% | +15% | 15% | Multiplicative with base damage |
| +Armor Damage % | +5% | +20% | 15% | Added to base AD% |
| +Armor Ignore % | +3% | +12% | 10% | Added to base AI% |
| -Fatigue Cost | -1 | -4 | 15% | Reduced fatigue per attack |
| +Hit Chance | +3% | +8% | 10% | Added to all attacks with this weapon |
| -AP Cost | -1 | -1 | 5% | Extremely rare; reduces AP by 1 |
| +Durability | +10 | +30 | 5% | More durable |
| +Skill Effect | varies | varies | 5% | Enhances a specific skill (e.g., +10% stun chance, +2 bleed damage/turn) |

> **Constraint**: A weapon cannot roll the same bonus twice. -AP Cost can only appear once per weapon and cannot reduce AP below 2.

### 6.2 Named Armor Generation

Named armor follows a similar system:

**Named Body Armor Bonus Rolls (2-3 rolls)**:

| Bonus | Min Roll | Max Roll | Weight | Notes |
|-------|----------|----------|--------|-------|
| +Armor Durability | +10 | +40 | 25% | More protection |
| -Fatigue Penalty | -2 | -8 | 25% | Lighter; less encumbering |
| +Resolve | +3 | +8 | 15% | Morale bonus while worn |
| +Initiative | +3 | +8 | 10% | Speed bonus |
| +Max Fatigue | +5 | +15 | 10% | Offsets armor weight |
| -Movement Cost | -1 | -1 | 5% | Rare; reduces tile movement AP by 1 |
| +Damage Reduction (flat) | +3 | +8 | 5% | Flat damage subtracted from each hit |
| +Special Resistance | varies | varies | 5% | e.g., fire resistance, poison resistance |

**Named Helmet Bonus Rolls (1-2 rolls)**:

| Bonus | Min Roll | Max Roll | Weight | Notes |
|-------|----------|----------|--------|-------|
| +Armor Durability | +10 | +30 | 30% | More head protection |
| -Fatigue Penalty | -1 | -4 | 25% | Lighter helm |
| -Vision Penalty | +1 | +2 | 15% | Better visibility (reduces or removes vision penalty) |
| +Resolve | +3 | +8 | 10% | Morale while worn |
| +Head Hit Deflection | +5% | +15% | 10% | Reduces chance of head hits |
| +Initiative | +2 | +5 | 10% | Speed bonus |

### 6.3 Named Item Sources

| Source | Drop Chance | Quality Tier | Notes |
|--------|-------------|-------------|-------|
| Champion Enemies | 15% | 1-2 bonus rolls | Elite enemies marked with skull icon |
| Legendary Locations | 100% (one per location) | 2-3 bonus rolls | Unique map locations; guarded by powerful enemies |
| Named Enemy Leaders | 25% | 2-3 bonus rolls | Bandit leaders, orc warlords, etc. |
| Merchant (Rare) | N/A (purchasable) | 1-2 bonus rolls | Very expensive; appears rarely in city shops |
| Quest Rewards | 100% (specific quests) | 2-3 bonus rolls | Endgame quest rewards |
| Arena Champions | 30% | 1-3 bonus rolls | Arena victory rewards |

### 6.4 Named Item Examples

Below are example named items to illustrate the system:

**"Oathkeeper" (Named Arming Sword)**
- Base: Arming Sword (30-45 DMG, 80% AD, 20% AI)
- Bonus 1: +8 Damage (flat) => 38-53 DMG
- Bonus 2: +6% Hit Chance
- Bonus 3: -2 Fatigue Cost => 10 FAT per attack
- Visual: Blue-tinted blade with silver crossguard

**"Skullsplitter" (Named Great Axe)**
- Base: Great Axe (50-85 DMG, 150% AD, 10% AI)
- Bonus 1: +12% Armor Damage => 162% AD
- Bonus 2: +10 Damage (flat) => 60-95 DMG
- Visual: Dark iron head with bone inlays

**"Ironwall" (Named Full Plate Armor)**
- Base: Full Plate Armor (300 durability, -38 FAT)
- Bonus 1: +30 Armor Durability => 330 durability
- Bonus 2: -6 Fatigue Penalty => -32 FAT
- Bonus 3: +5 Resolve
- Visual: Gold filigree on pauldrons

---

## 7. Inventory System

### 7.1 Character Equipment Slots

Each character has the following equipment slots:

| Slot | Accepts | Notes |
|------|---------|-------|
| **Main Hand** | Any 1H weapon, 2H weapon | 2H weapons also occupy Off-Hand |
| **Off-Hand** | Shield, 1H weapon (dual wield), or empty | Blocked if Main Hand holds 2H weapon |
| **Body Armor** | Any body armor | One attachment slot |
| **Head Armor** | Any helmet | One attachment slot |
| **Accessory** | Amulet, ring, or talisman | Optional slot; unique items |
| **Bag Slot 1** | Any item (see sizes below) | Always available |
| **Bag Slot 2** | Any item (see sizes below) | Always available |
| **Bag Slot 3** | Any item (see sizes below) | Always available |
| **Bag Slot 4** | Any item (see sizes below) | Always available |
| **Bag Slot 5** | Any item (see sizes below) | Requires **Bags and Belts** perk |
| **Bag Slot 6** | Any item (see sizes below) | Requires **Bags and Belts** perk |

### 7.2 Item Sizes (Bag Slots)

| Item Type | Slots Required | Examples |
|-----------|----------------|----------|
| 1H Weapon | 1 slot | Arming Sword, Hand Axe, Dagger |
| 2H Weapon | 2 slots | Greatsword, War Bow, Pike |
| Shield | 2 slots | Any shield |
| Throwing Stack | 1 slot | Javelins x5, Throwing Axes x5 |
| Consumable | 1 slot | Potion, Bandage, Net |
| Ammunition Stack | 1 slot | Arrows x20, Bolts x12 |
| Tool | 2 slots | Repair Kit (in-combat), Medkit (in-combat) |

### 7.3 Weapon Swapping

| Action | AP Cost | FAT Cost | Notes |
|--------|---------|----------|-------|
| Swap weapon from bag | 4 AP | 5 | Standard swap; takes half a turn |
| Swap weapon (Quick Hands perk) | 0 AP | 0 | Free swap; essential for ranged/melee hybrids |
| Pick up weapon from ground | 4 AP | 5 | Must be standing on the tile |
| Drop weapon | 0 AP | 0 | Free action; drops to current tile |

> **Quick Hands Design Note**: The Quick Hands perk is intentionally powerful. It enables build archetypes like: fire Handgonne -> free swap to sword+shield, or throw javelin -> free swap to polearm. The 0 AP cost makes this perk a staple for versatile fighters.

### 7.4 Company Stash and Cart

Outside of battle, the company has a shared stash for storing items. Stash capacity is determined by whether the company owns a cart.

| Transport | Stash Slots | Cost | Notes |
|-----------|-------------|------|-------|
| No Cart (carrying) | 30 slots | Free | Distributed among characters; heavy items slow travel |
| Small Cart | 60 slots | 500 | Pulled by donkey; -10% travel speed |
| Medium Cart | 90 slots | 1500 | Pulled by horse; -5% travel speed |
| Large Cart | 120 slots | 4000 | Pulled by oxen; -15% travel speed |
| War Wagon | 150 slots | 8000 | Armored; no speed penalty; rare purchase |

**Stash Slot Sizes** (for storage):

| Item Type | Stash Slots | Notes |
|-----------|-------------|-------|
| Any weapon (1H) | 1 | Compact storage |
| Any weapon (2H) | 2 | Larger items |
| Shield | 2 | Bulky |
| Body Armor | 3 | Large and heavy |
| Helmet | 1 | Compact |
| Supply item | 1 per unit | Food, tools, etc. |
| Throwing stack | 1 | Per stack |
| Ammunition stack | 1 | Per stack |
| Trade goods | 1-3 | Varies by item |

### 7.5 Looting

After battle, all items from fallen enemies (and fallen allies) are available for looting. The loot screen displays all available items. Constraints:

- Items damaged during battle retain their reduced durability.
- Weapons/armor at 0 durability are destroyed and cannot be looted.
- Items on the ground (dropped weapons, thrown javelins that missed) remain on the battlefield; they are auto-collected after battle if the player wins.
- Loot must fit in the stash or a character's bag. Excess loot is abandoned.

---

## 8. Supplies and Consumables

### 8.1 Repair Tools

Repair tools are used between battles to restore weapon and armor durability. Each unit of tools has a pool of "repair points" that are spent to restore durability.

| Tool | Repair Points | Value | Weight (slots) | Notes |
|------|---------------|-------|-----------------|-------|
| Cheap Tools | 50 | 100 | 1 | Repairs 50 total durability across all items |
| Standard Tools | 100 | 300 | 1 | Standard repair kit |
| Quality Tools | 150 | 600 | 1 | Efficient repairs |
| Master Tools | 200 | 1200 | 1 | Best available; repairs more per point |

**Repair Mechanics**:
- Repairing 1 point of weapon durability costs 1 repair point.
- Repairing 1 point of armor durability costs 1 repair point.
- Repairing 1 point of shield durability costs 1 repair point.
- Repairs happen automatically between battles; the system prioritizes items with lowest durability percentage first.
- Characters with the **Repair** background skill repair 20% more durability per point.

**Auto-Repair Priority**: When tools are limited, the auto-repair system follows this priority:
1. Weapons at <25% durability
2. Shields at <25% durability
3. Body armor at <50% durability
4. Head armor at <50% durability
5. All remaining items, lowest % first

### 8.2 Medical Supplies

Medical supplies heal injuries sustained in battle. Injuries reduce character stats until healed. Each injury takes a number of days to heal, and medical supplies reduce heal time.

| Supply | Heal Speed Modifier | Value | Weight (slots) | Notes |
|--------|---------------------|-------|-----------------|-------|
| Bandages | 1x (baseline) | 50 | 1 | Basic wound care; prevents infection |
| Healing Herbs | 1.5x | 150 | 1 | Natural remedies; reduce heal time by 33% |
| Medical Kit | 2x | 400 | 1 | Surgical tools; halve heal time |
| Master Surgeon Kit | 3x | 1000 | 1 | Expert care; heal time reduced to 33% |

**Injury Heal Times** (base, without medical supplies):

| Injury Severity | Heal Time | Stat Penalty While Injured |
|-----------------|-----------|----------------------------|
| Light (cut, bruise) | 2-3 days | -5 to relevant stat |
| Medium (fracture, deep wound) | 4-6 days | -10 to relevant stat |
| Heavy (severed tendon, crushed bone) | 7-12 days | -15 to relevant stat |
| Permanent (lost eye, lost finger) | Never | Permanent stat reduction |

**In-Combat Medical Items**:

| Item | AP Cost | Effect | Charges | Bag Slots |
|------|---------|--------|---------|-----------|
| Bandage (combat) | 4 | Stops bleeding, heals 10 HP | 3 | 1 |
| Antidote | 4 | Cures poison | 1 | 1 |
| Stimulant | 4 | Removes stun, +15 Initiative for 3 turns | 1 | 1 |
| Healing Potion | 4 | Heals 25 HP immediately | 1 | 1 |

### 8.3 Food and Provisions

Food is consumed daily by the company. Each character consumes **2 food units per day**. Running out of food causes morale loss and eventually HP loss.

| Food Type | Nutrition (food units) | Morale Effect | Spoil Time | Value | Notes |
|-----------|----------------------|---------------|------------|-------|-------|
| Dried Meat | 1 | +0 | 7 days | 5 | Cheap, lasts long |
| Bread | 2 | +0 | 3 days | 8 | Spoils fast |
| Smoked Fish | 2 | +0 | 5 days | 7 | Reliable preserved food |
| Cured Sausage | 3 | +1 | 6 days | 15 | Good morale food |
| Pickled Vegetables | 2 | +0 | 10 days | 10 | Long-lasting |
| Porridge | 4 | -1 | 4 days | 12 | Filling but depressing |
| Luxury Rations | 3 | +3 | 3 days | 50 | Excellent morale but expensive and perishable |
| Hardtack | 1 | -1 | Never | 3 | Emergency rations; never spoils; terrible taste |
| Fresh Fruit | 2 | +2 | 2 days | 20 | Morale boost; spoils very fast |
| Wine (barrel) | 0 | +2 | Never | 40 | Morale only; not food; risk of drunkenness |

**Hunger Mechanic**:

| Hunger State | Condition | Effect |
|-------------|-----------|--------|
| Well-Fed | >= 2 food/char/day | +5 Resolve |
| Normal | 2 food/char/day | No modifier |
| Hungry | 1 food/char/day | -10 Resolve, -5 Melee/Ranged Skill |
| Starving | 0 food/char/day | -20 Resolve, -10 all stats, -5 HP/day |

> **Daily Food Consumption** = (Number of characters) x 2 food units. A company of 12 consumes 24 food units per day.

### 8.4 Ammunition

Ammunition is tracked globally for the company and distributed to characters as needed. Between battles, ranged characters automatically refill from the company ammunition pool.

| Ammunition | Units per Stack | Value per Stack | Notes |
|------------|----------------|-----------------|-------|
| Arrows | 20 | 20 | Standard arrows for all bows |
| Bolts | 12 | 30 | Crossbow bolts |
| Powder and Shot | 8 | 50 | Handgonne ammunition |
| Fire Arrows | 10 | 40 | Incendiary arrows; require fire source |
| Poisoned Arrows | 10 | 60 | Apply poison (3 dmg/turn, 3 turns) on hit |
| Armor-Piercing Bolts | 8 | 50 | +10% armor ignore on crossbow |

**Ammunition Replenishment**:
- After each battle, surviving characters automatically refill from the company ammo pool.
- Ammunition can be purchased from towns and merchants.
- Fletcher background characters produce 5 arrows/day while traveling (if wood is available).
- Javelins, throwing axes, and darts that hit the ground (miss) have a 33% chance to be recoverable after battle. Ones that hit a target are destroyed.

### 8.5 Miscellaneous Consumables

| Item | AP Cost | Effect | Bag Slots | Value | Notes |
|------|---------|--------|-----------|-------|-------|
| Net | 4 | Thrown (range 2). Roots target for 2 turns. -30 melee/ranged defense. Target can cut free (costs 4 AP + dagger/sword). | 1 | 30 | Single use; not recoverable |
| Oil Flask | 4 | Thrown (range 3). Creates oil puddle on target tile + adjacent tiles. Units in oil have -10 initiative. Oil can be ignited (fire arrow, torch) for 15 dmg/turn for 3 turns. | 1 | 50 | Single use |
| Smoke Bomb | 4 | Thrown (range 3). Creates smoke cloud on target tile + adjacent tiles for 3 turns. Units in smoke cannot be targeted by ranged attacks. -50% melee hit chance for all in cloud. | 1 | 80 | Single use; rare |
| Torch | 0 (equip) | Equipped in off-hand. Provides light in dark battles. Adjacent allies gain +10 Resolve. Can ignite oil. | 1 | 5 | Lasts entire battle |
| Caltrops | 4 | Placed on current tile. Enemies moving onto the tile take 10 damage and lose 4 AP. Lasts until triggered (3 triggers). | 1 | 20 | Single use; area denial |
| Bear Trap | 4 | Placed on current tile. First enemy to step on it takes 20 damage and is rooted for 1 turn. | 1 | 40 | Single use; more damage than caltrops |
| War Horn | 4 | All allies within 4 tiles gain +10 Resolve and +5 Melee Skill for 3 turns. | 1 | 200 | 1 use per battle |
| Sergeant's Banner | 0 (equip) | Equipped in off-hand. All allies within 3 tiles gain +5 Resolve passively. | 2 | 500 | Not consumed; permanent equipment |

---

## 9. Implementation Notes

### 9.1 Data Schema (Weapon)

```typescript
interface Weapon {
  id: string;                    // unique identifier, e.g., "arming_sword"
  name: string;                  // display name, e.g., "Arming Sword"
  family: WeaponFamily;          // enum: SWORD, AXE, MACE, FLAIL, CLEAVER, SPEAR, POLEARM, DAGGER, BOW, CROSSBOW, THROWING, FIREARM, WHIP
  hands: 1 | 2;                  // 1H or 2H
  damageMin: number;             // minimum damage roll
  damageMax: number;             // maximum damage roll
  armorDamagePercent: number;    // 0.0 to 3.0 (e.g., 0.8 = 80%)
  armorIgnorePercent: number;    // 0.0 to 1.0 (e.g., 0.2 = 20%)
  apCost: number;                // AP cost of basic attack
  fatigueCost: number;           // Fatigue cost of basic attack
  range: number;                 // 1 = melee, 2 = reach, 3-7 = ranged
  durability: number;            // max durability
  currentDurability: number;     // current durability (for instance tracking)
  value: number;                 // gold value for buy/sell
  skills: string[];              // list of skill IDs this weapon grants
  familyBonus: FamilyBonus;      // passive bonus from weapon family
  isNamed: boolean;              // true if this is a famed item
  namedBonuses?: NamedBonus[];   // bonus rolls if named
  bagSlots: number;              // inventory space required (1 or 2)
  ammoType?: AmmoType;           // ARROW, BOLT, SHOT, or undefined for melee
  ammoMax?: number;              // max ammo capacity
  ammoCurrent?: number;          // current ammo
  icon: string;                  // path to icon asset
  model: string;                 // path to 3D model/sprite
}

enum WeaponFamily {
  SWORD, AXE, MACE, FLAIL, CLEAVER,
  SPEAR, POLEARM, DAGGER, BOW,
  CROSSBOW, THROWING, FIREARM, WHIP
}

interface NamedBonus {
  type: NamedBonusType;          // FLAT_DAMAGE, PERCENT_DAMAGE, ARMOR_DAMAGE, etc.
  value: number;                 // bonus amount
}
```

### 9.2 Data Schema (Armor)

```typescript
interface Armor {
  id: string;                    // unique identifier
  name: string;                  // display name
  slot: ArmorSlot;               // BODY or HEAD
  durability: number;            // max armor durability (= armor value)
  currentDurability: number;     // current durability
  fatiguePenalty: number;        // negative number subtracted from max fatigue
  visionPenalty: number;         // 0 to -6 (helmets only)
  value: number;                 // gold value
  tier: number;                  // 1-4 for sorting/filtering
  attachment?: ArmorAttachment;  // optional attachment
  isNamed: boolean;              // famed item flag
  namedBonuses?: NamedBonus[];   // bonus rolls if named
  stashSlots: number;            // stash space required
  icon: string;                  // path to icon asset
  model: string;                 // path to 3D model/sprite
}

interface ArmorAttachment {
  id: string;
  name: string;
  armorBonus: number;            // added to durability
  fatigueCost: number;           // additional fatigue penalty
  specialEffect?: string;        // description of special effect
  value: number;
  applicableTo: ArmorTier[];     // which armor tiers this can attach to
}

enum ArmorSlot { BODY, HEAD }
enum ArmorTier { CLOTH, LEATHER, MAIL, PLATE }
```

### 9.3 Data Schema (Shield)

```typescript
interface Shield {
  id: string;
  name: string;
  meleeDefBonus: number;         // added to melee defense
  rangedDefBonus: number;        // added to ranged defense
  shieldwallBonus: number;       // additional defense when using Shieldwall
  durability: number;            // max shield durability
  currentDurability: number;     // current durability
  fatiguePenalty: number;        // reduces max fatigue
  value: number;
  bagSlots: number;              // always 2 for bag storage
  isNamed: boolean;
  namedBonuses?: NamedBonus[];
  icon: string;
  model: string;
}
```

### 9.4 Data Schema (Skill)

```typescript
interface WeaponSkill {
  id: string;                    // e.g., "sword_riposte"
  name: string;                  // e.g., "Riposte"
  family: WeaponFamily;          // which weapon family grants this
  apCost: number;                // AP to use
  fatigueCost: number;           // fatigue generated
  damageModifier: number;        // multiplier on weapon damage (1.0 = 100%)
  effect: SkillEffect;           // structured effect data
  description: string;           // human-readable description
  requiresWeapon?: string[];     // specific weapon IDs if restricted
  requires2H?: boolean;          // only 2H weapons
  requires1H?: boolean;          // only 1H weapons
  cooldown?: number;             // turns before skill can be used again (0 = no cooldown)
  icon: string;                  // path to skill icon
}

interface SkillEffect {
  type: EffectType;              // DAMAGE, STUN, BLEED, DISARM, AOE, STANCE, etc.
  aoePattern?: HexPattern;       // which tiles are affected for AoE
  statusApplied?: StatusEffect;  // status effect applied on hit
  statusDuration?: number;       // turns the status lasts
  hitChanceModifier?: number;    // bonus/penalty to hit chance
  specialRules?: string[];       // array of special rule descriptions
}

enum EffectType {
  DAMAGE, STUN, BLEED, DISARM, AOE, STANCE,
  PUSH, PULL, ROOT, COUNTER, RELOAD, EXECUTE
}
```

### 9.5 Mobile UI Considerations

Given the portrait-mode mobile target:

- **Equipment Screen**: Vertical layout. Character model at top (small), equipment slots arranged below as a 2-column grid. Tap a slot to open item list. Swipe left/right to compare items.
- **Skill Bar**: Bottom of screen during combat. Show 4 visible skill buttons (weapon skills) + scrollable overflow. Large touch targets (minimum 48x48dp).
- **Inventory Bags**: Show as a row of 4-6 small squares below the skill bar. Tap to swap. Drag-and-drop support for bag reordering.
- **Loot Screen**: Full-screen overlay. Scrollable list of items with icons, names, and key stats. "Take All" button and individual "Take" buttons.
- **Tooltip System**: Long-press any item/skill to show detailed tooltip. Tooltip includes all stats, skill descriptions, and comparison to currently equipped item (green/red stat differences).

### 9.6 Balance Tuning Parameters

The following constants should be exposed to a configuration file for balance tuning without code changes:

```typescript
const BALANCE_CONFIG = {
  // Action economy
  AP_PER_TURN: 9,
  AP_MOVE_NORMAL: 2,
  AP_MOVE_DIFFICULT: 4,
  AP_SWAP_WEAPON: 4,
  AP_USE_ITEM: 4,

  // Hit location
  HEAD_HIT_CHANCE: 0.25,
  BODY_HIT_CHANCE: 0.75,

  // Ranged
  SCATTER_CHANCE_BOW: 0.33,
  SCATTER_CHANCE_FIREARM: 0.50,
  AMMO_RECOVERY_CHANCE: 0.33,

  // Injury
  INJURY_THRESHOLD_PERCENT: 0.15,

  // Food
  FOOD_PER_CHARACTER_PER_DAY: 2,

  // Named items
  NAMED_DROP_CHANCE_CHAMPION: 0.15,
  NAMED_DROP_CHANCE_LEADER: 0.25,
  NAMED_MIN_BONUSES: 1,
  NAMED_MAX_BONUSES: 3,

  // Repair
  REPAIR_POINTS_PER_TOOL: [50, 100, 150, 200], // by tool tier
  REPAIR_COST_WEAPON: 1,
  REPAIR_COST_ARMOR: 1,
  REPAIR_COST_SHIELD: 1,

  // Morale
  WELL_FED_RESOLVE_BONUS: 5,
  HUNGRY_RESOLVE_PENALTY: -10,
  STARVING_RESOLVE_PENALTY: -20,
  STARVING_HP_LOSS_PER_DAY: 5,

  // Cart
  CART_SPEED_PENALTY: [0, -0.10, -0.05, -0.15, 0], // by cart tier
  CART_CAPACITY: [30, 60, 90, 120, 150],             // by cart tier
};
```

### 9.7 Weapon Family Quick Reference

| Family | Strengths | Weaknesses | Best Against | Worst Against |
|--------|-----------|------------|-------------|---------------|
| Sword | Versatile, accurate, Riposte defense | Low armor damage | Mixed enemies | Heavy plate |
| Axe | Armor/shield destruction, AoE | Inconsistent damage | Shields, armor | Unarmored swarms |
| Mace/Hammer | Armor bypass, stun | Low base damage | Plate armor | Large HP pools |
| Flail | Ignores shields, head targeting | Wild damage variance | Shield users | Consistent fights |
| Cleaver | Bleed, execute, anti-flesh | Weak vs armor | Unarmored, wounded | Heavy plate |
| Spear | Accuracy, Spearwall zone control | Low damage | Recruits, defense | Late-game armor |
| Polearm | Reach, safe damage | Cannot attack adjacent | Backline support | Flanking enemies |
| Dagger | Fast, armor bypass (Puncture) | Very low damage | Looting, finishing | Fresh enemies |
| Bow | Range, flexibility | Low armor damage | Unarmored, support | Plate, shields |
| Crossbow | High single-shot damage | Slow reload | Armored targets | Multiple enemies |
| Throwing | Burst damage, versatile | Limited ammo | Opening volley | Extended fights |
| Firearm | Devastating alpha strike | Extremely slow reload | Any single target | Sustained combat |
| Whip | Disarm, reach, no counter | Extremely low damage | Equipped enemies | Unarmed/beasts |

---

## Appendix A: Complete Weapon Table (Sorted by Value)

| # | Weapon | Family | H | DMG | AD% | AI% | AP | FAT | RNG | DUR | Value |
|---|--------|--------|---|-----|-----|-----|----|----|-----|-----|-------|
| 1 | Knife | Dagger | 1 | 10-20 | 50% | 30% | 3 | 6 | 1 | 32 | 30 |
| 2 | Club | Mace | 1 | 15-25 | 60% | 30% | 4 | 10 | 1 | 56 | 50 |
| 3 | Dart x8 | Throwing | 1 | 15-30 | 40% | 40% | 3 | 8 | 4 | -- | 80 |
| 4 | Goblin Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 32 | 80 |
| 5 | Buckler* | Shield | 1 | -- | -- | -- | -- | -- | -- | 48 | 100 |
| 6 | Dagger | Dagger | 1 | 15-25 | 50% | 35% | 3 | 7 | 1 | 40 | 120 |
| 7 | Hatchet | Axe | 1 | 20-35 | 120% | 10% | 4 | 12 | 1 | 48 | 150 |
| 8 | Javelin x5 | Throwing | 1 | 30-50 | 80% | 30% | 4 | 12 | 4 | -- | 150 |
| 9 | Spear | Spear | 1 | 20-35 | 80% | 15% | 4 | 10 | 1 | 56 | 200 |
| 10 | Short Sword | Sword | 1 | 20-30 | 80% | 15% | 4 | 10 | 1 | 64 | 200 |
| 11 | Short Bow | Bow | 2 | 20-35 | 40% | 25% | 5 | 12 | 5 | 40 | 200 |
| 12 | Wooden Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 64 | 200 |
| 13 | Throwing Axe x5 | Throwing | 1 | 25-50 | 120% | 15% | 4 | 14 | 3 | -- | 200 |
| 14 | Military Cleaver | Cleaver | 1 | 30-45 | 60% | 40% | 4 | 12 | 1 | 52 | 350 |
| 15 | Hand Axe | Axe | 1 | 30-50 | 130% | 10% | 4 | 14 | 1 | 56 | 400 |
| 16 | Flail | Flail | 1 | 20-45 | 90% | 20% | 4 | 14 | 1 | 56 | 400 |
| 17 | Arming Sword | Sword | 1 | 30-45 | 80% | 20% | 4 | 12 | 1 | 72 | 500 |
| 18 | Hunting Bow | Bow | 2 | 25-45 | 50% | 25% | 5 | 14 | 6 | 48 | 500 |
| 19 | Heater Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 80 | 500 |
| 20 | Rondel Dagger | Dagger | 1 | 20-30 | 40% | 50% | 3 | 8 | 1 | 48 | 500 |
| 21 | Boar Spear | Spear | 1 | 25-45 | 90% | 15% | 4 | 12 | 1 | 64 | 550 |
| 22 | Light Crossbow | Crossbow | 2 | 40-60 | 60% | 35% | 5 | 16 | 6 | 64 | 600 |
| 23 | Winged Mace | Mace | 1 | 25-40 | 80% | 35% | 4 | 14 | 1 | 72 | 600 |
| 24 | Orc Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 160 | 600 |
| 25 | Falchion | Cleaver | 1 | 35-55 | 70% | 35% | 4 | 14 | 1 | 64 | 800 |
| 26 | Kite Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 96 | 800 |
| 27 | Pike | Polearm | 2 | 35-55 | 60% | 30% | 4 | 14 | 2 | 56 | 800 |
| 28 | Whip | Whip | 1 | 15-30 | 40% | 50% | 4 | 10 | 2 | 40 | 800 |
| 29 | Fighting Axe | Axe | 1 | 40-60 | 140% | 10% | 4 | 16 | 1 | 64 | 900 |
| 30 | Morning Star | Mace | 1 | 30-55 | 100% | 30% | 4 | 16 | 1 | 64 | 1200 |
| 31 | Billhook | Polearm | 2 | 35-60 | 100% | 20% | 6 | 18 | 2 | 64 | 1200 |
| 32 | Three-Headed Flail | Flail | 1 | 15-25 x3 | 80% | 15% | 4 | 18 | 1 | 48 | 1400 |
| 33 | Warhammer | Mace | 1 | 20-40 | 60% | 50% | 4 | 15 | 1 | 80 | 1500 |
| 34 | Great Axe | Axe | 2 | 50-85 | 150% | 10% | 6 | 22 | 1 | 72 | 1500 |
| 35 | War Bow | Bow | 2 | 35-60 | 60% | 25% | 6 | 20 | 7 | 56 | 1500 |
| 36 | Tower Shield* | Shield | 1 | -- | -- | -- | -- | -- | -- | 120 | 1500 |
| 37 | Kriegsmesser | Cleaver | 2 | 50-80 | 80% | 30% | 6 | 20 | 1 | 72 | 1600 |
| 38 | Longsword | Sword | 2 | 45-70 | 80% | 25% | 4 | 15 | 1 | 80 | 1800 |
| 39 | Two-Handed Flail | Flail | 2 | 35-75 | 100% | 20% | 6 | 24 | 1 | 64 | 1800 |
| 40 | Longaxe | Axe/Polearm | 2 | 45-75 | 140% | 10% | 6 | 20 | 2 | 64 | 1800 |
| 41 | Glaive | Polearm | 2 | 40-70 | 90% | 20% | 6 | 20 | 2 | 72 | 1800 |
| 42 | Heavy Crossbow | Crossbow | 2 | 55-85 | 70% | 40% | 6 | 22 | 7 | 80 | 2000 |
| 43 | Noble Sword | Sword | 1 | 35-50 | 80% | 25% | 4 | 12 | 1 | 72 | 2000 |
| 44 | Two-Handed Hammer | Mace | 2 | 40-70 | 80% | 50% | 6 | 25 | 1 | 96 | 2000 |
| 45 | Warscythe | Polearm | 2 | 45-80 | 80% | 25% | 6 | 22 | 2 | 72 | 2200 |
| 46 | Bardiche | Axe | 2 | 55-90 | 160% | 10% | 6 | 24 | 1 | 80 | 2500 |
| 47 | Polehammer | Mace/Polearm | 2 | 35-60 | 80% | 45% | 6 | 22 | 2 | 80 | 2500 |
| 48 | Handgonne | Firearm | 2 | 50-90 | 50% | 60% | 6 | 25 | 5 | 48 | 3000 |
| 49 | Greatsword | Sword | 2 | 55-85 | 80% | 30% | 6 | 20 | 1 | 96 | 3500 |
| 50 | Crypt Cleaver | Cleaver | 2 | 60-95 | 70% | 35% | 6 | 24 | 1 | 80 | 4000 |

*Shields listed for completeness; their stats are in Section 4.

---

## Appendix B: Damage Per AP Efficiency Rankings

This table ranks weapons by average damage per AP spent (basic attack only, no skills), useful for balance validation.

| Rank | Weapon | Avg DMG | AP | DMG/AP | Notes |
|------|--------|---------|----|----|-------|
| 1 | Rondel Dagger | 25 (x2=50) | 3 | 16.7 | But only 40% AD, 50% AI |
| 2 | Dagger | 20 (x2=40) | 3 | 13.3 | Low total damage |
| 3 | Knife | 15 (x2=30) | 3 | 10.0 | Extremely low damage |
| 4 | Greatsword | 70 | 6 | 11.7 | Best 2H sword efficiency |
| 5 | Crypt Cleaver | 77.5 | 6 | 12.9 | Highest cleaver |
| 6 | Bardiche | 72.5 | 6 | 12.1 | Best axe efficiency |
| 7 | Great Axe | 67.5 | 6 | 11.3 | Strong 2H axe |
| 8 | Longsword | 57.5 | 4 | 14.4 | Excellent AP efficiency |
| 9 | Noble Sword | 42.5 | 4 | 10.6 | Best 1H sword |
| 10 | Fighting Axe | 50 | 4 | 12.5 | Best 1H axe efficiency |

> **Balance Note**: Daggers appear to have the highest DMG/AP but their actual damage is very low due to low base numbers and poor armor interaction. The effective DPS against armored targets is dramatically lower. These rankings should be validated against armored target simulations.

---

## Appendix C: Armor Effectiveness Breakpoints

How much armor is needed to survive a single hit from common weapons (assuming full HP):

| Threat | Avg DMG | AD% | AI% | Armor Needed to Survive | HP Damage if 100 Armor |
|--------|---------|-----|-----|-------------------------|-----------------------|
| Arming Sword | 37.5 | 80% | 20% | 30 (absorbs most) | 7.5 direct + 0 overflow = 7.5 |
| Hand Axe | 40 | 130% | 10% | 52 (covers the damage) | 4 direct + 0 overflow = 4 |
| Warhammer | 30 | 60% | 50% | 18 (low armor damage) | 15 direct + 0 overflow = 15 |
| Heavy Crossbow | 70 | 70% | 40% | 49 (significant) | 28 direct + 0 overflow = 28 |
| Handgonne | 70 | 50% | 60% | 35 (low armor damage) | 42 direct + 0 overflow = 42 |
| Great Axe | 67.5 | 150% | 10% | 101 (heavy armor damage) | 6.75 direct + 0 overflow = 6.75 |

> This table helps designers ensure that armor tiers create meaningful progression. Tier 2 leather (40-80) should protect against most 1H weapons. Tier 3 mail (100-180) should handle 2H weapons. Tier 4 plate (200-330) should only be threatened by dedicated armor-piercing weapons.

---

*End of Document*
