# 05 - Enemies and AI Design Document

> iTactics -- Mobile Browser Tactical RPG (Babylon.js, Portrait Mode)
> Inspired by Battle Brothers

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Human Enemies](#2-human-enemies)
3. [Undead Enemies](#3-undead-enemies)
4. [Greenskin Enemies](#4-greenskin-enemies)
5. [Beast Enemies](#5-beast-enemies)
6. [AI Behavior System](#6-ai-behavior-system)
7. [Enemy Camps and Lairs](#7-enemy-camps-and-lairs)
8. [Difficulty Scaling](#8-difficulty-scaling)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Design Philosophy

Every enemy faction must feel mechanically distinct. The player should be able to identify the faction within the first turn and immediately shift strategy. Brigands are sloppy and exploitable. Noble troops are disciplined and dangerous in formation. Goblins never fight fair. Orcs hit like freight trains. Undead ignore psychology and keep coming. Beasts break the rules entirely.

Core principles:

- **Stat Ranges**: All enemies have randomized stats within defined ranges. This prevents fights from feeling scripted.
- **Faction Identity**: Each faction has unique AI behavior, not just different stat blocks.
- **Escalation**: Within every faction there is a clear progression from fodder to elite to boss.
- **Counterplay**: Every enemy has an exploitable weakness. No enemy should feel unbeatable if the player adapts.
- **Mobile Constraints**: Enemy counts are capped at 12 per battle to keep turn times reasonable on mobile. Encounters compensate with stronger individual enemies rather than larger hordes.

---

## 2. Human Enemies

Human enemies are the most common opponents in the early and mid game. They use the same equipment system as the player's brothers, meaning their gear can be looted after battle. This makes human fights the primary source of early equipment upgrades.

### 2.1 Brigands

Brigands are the introductory enemy faction. They appear from Day 1 and remain relevant through the mid game as their composition scales. They are poorly organized, use mixed-quality equipment, and break morale quickly.

**Faction Traits:**
- Equipment is lootable and varies wildly in quality
- Low-to-medium Resolve across the board; they flee when losing
- No disciplined formation; they cluster and swarm
- Leaders provide morale backbone; killing the leader triggers mass Resolve checks

#### Brigand Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Shield |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Thug** | 40-55 | 80-100 | 20-35 | 90-110 | 40-50 | 5-15 | 20-30 | 5-10 | 0-50 | 0-30 | Cleavers, knives, clubs, wooden flails | None or wooden shield (15-25 durability) |
| **Marksman** | 35-50 | 80-100 | 25-35 | 95-115 | 25-35 | 0-10 | 45-60 | 5-10 | 0-40 | 0-25 | Short bow, hunting bow, light crossbow | None |
| **Raider** | 55-70 | 90-110 | 35-50 | 85-105 | 55-65 | 15-25 | 30-40 | 10-15 | 80-130 | 50-90 | Swords, axes, maces, flails | Kite shield or round shield (40-70 durability) |
| **Leader** | 60-80 | 100-120 | 55-70 | 80-100 | 60-75 | 20-30 | 30-40 | 10-15 | 130-200 | 80-130 | Named weapons, 2H swords, military picks | Heater shield (70-100 durability) or 2H weapon |

**Thug -- Detailed Behavior:**
- Thugs are the weakest human enemy. They exist to teach the player basic combat.
- They wear ragged clothing or cheap leather armor (0-50 body armor).
- They attack the nearest target with no tactical consideration.
- They break morale at Wavering when they see an ally die adjacent to them.
- When Fleeing, they drop their weapon 30% of the time.
- Spawned in groups of 3-8 in early game camps.

**Marksman -- Detailed Behavior:**
- Marksmen stay behind the melee line and fire at the most exposed target.
- They switch to a knife if engaged in melee (MAtk 25-35 with knife).
- Short bows have range 5, hunting bows range 6, light crossbows range 6.
- They do not use the Aimed Shot ability; they fire every turn.
- They prioritize targets without shields, then targets with low armor.
- They attempt to maintain 3-4 tiles of distance from melee enemies.

**Raider -- Detailed Behavior:**
- Raiders are the backbone of brigand camps from Day 15 onward.
- They use Shieldwall when first engaged, then attack on subsequent turns.
- They attempt to gang up on isolated targets (2-3 Raiders on one brother).
- If their HP drops below 30%, they attempt to disengage and flee.
- Their armor is always lootable, making them valuable mid-game targets.

**Leader -- Detailed Behavior:**
- Exactly one Leader spawns per brigand encounter (if composition allows).
- The Leader uses the **Rally** ability once every 3 turns, affecting all brigand allies within 4 tiles. Rally restores +10 Resolve for 2 turns and removes the Wavering status.
- The Leader stays in the second row, behind Raiders, but will engage in melee if approached.
- When the Leader dies, all brigand allies must make an immediate Resolve check at -15.
- Leaders have a 20% chance to carry a named/famed weapon (post Day 40).

**Brigand Composition by Difficulty:**

| Encounter Tier | Thugs | Marksmen | Raiders | Leaders | Total |
|---|---|---|---|---|---|
| Easy (Day 1-15) | 3-6 | 0-1 | 0 | 0 | 3-7 |
| Medium (Day 15-35) | 2-4 | 1-2 | 2-4 | 0-1 | 5-10 |
| Hard (Day 35-60) | 1-3 | 2-3 | 3-5 | 1 | 7-12 |
| Elite (Day 60+) | 0-2 | 2-3 | 4-6 | 1 | 8-12 |

---

### 2.2 Noble Troops

Noble troops are professional soldiers fielded by the three noble houses. They appear from Day 20 onward in contract battles and noble war events. They are well-equipped, disciplined, and hold formation. They do not flee as easily as brigands.

**Faction Traits:**
- High-quality armor and weapons; excellent loot
- Disciplined AI: they hold formation and rotate wounded members to the back
- Sergeants provide strong morale support
- They use combined arms: billmen behind footmen, arbalesters on flanks

#### Noble Troop Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Shield |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Militia** | 45-60 | 85-100 | 30-40 | 90-110 | 45-55 | 10-20 | 25-35 | 5-10 | 40-80 | 20-50 | Pitchforks, militia spears, short swords | Wooden shield (20-35 durability) |
| **Billman** | 55-70 | 95-115 | 40-50 | 85-100 | 55-65 | 10-20 | 20-30 | 5-10 | 80-120 | 50-80 | Billhook, polehammer, pike | None (2H polearm) |
| **Footman** | 60-75 | 100-120 | 45-55 | 75-95 | 60-70 | 25-35 | 25-30 | 15-20 | 150-200 | 100-150 | Arming sword, military cleaver, morning star | Heater shield (80-110 durability) |
| **Knight** | 70-90 | 110-130 | 55-70 | 65-85 | 75-90 | 20-35 | 20-25 | 10-15 | 250-300 | 180-250 | Greatsword, warhammer, battle axe, longsword | None (2H weapon) or kite shield + sword |
| **Sergeant** | 60-75 | 100-120 | 70-85 | 80-95 | 55-65 | 20-30 | 25-30 | 10-15 | 130-180 | 90-130 | Military sword, flanged mace | Heater shield (80-110 durability) |
| **Arbalester** | 50-65 | 90-110 | 40-50 | 85-105 | 30-40 | 5-15 | 60-75 | 10-15 | 60-100 | 40-70 | Heavy crossbow, arbalest | None |

**Militia -- Detailed Behavior:**
- Militia are conscripted peasants. They are the weakest noble unit.
- They use Spearwall when available (costs 15 Fatigue, triggers a free attack against enemies entering adjacent tiles).
- They hold the flanks of the formation.
- They break morale before professional soldiers do (Resolve 30-40).
- Militia pitchforks have Reach 2, allowing them to attack from behind a Footman.

**Billman -- Detailed Behavior:**
- Billmen stand in the second row behind Footmen and attack with Reach 2 polearms.
- Billhook has a **Hook** ability: pulls an enemy 1 tile toward the Billman, breaking the target's formation. Costs 20 Fatigue. Used on priority targets.
- Polehammer has **Stagger**: target loses 2 AP next turn. Used on heavily armored targets.
- Pike has **Pike Wall**: like Spearwall but at Reach 2 range. Used defensively.
- Billmen never voluntarily enter the front line. If the front line breaks they retreat.

**Footman -- Detailed Behavior:**
- Footmen are the formation core. They use Shieldwall on Turn 1, then hold position.
- They rotate: if a Footman drops below 40% HP, the AI attempts to swap him with a healthier ally behind him.
- They use **Riposte** when engaged by multiple enemies, countering each attack against them.
- They prioritize holding ground over chasing enemies.
- Footmen only break formation to pursue fleeing enemies if victory is nearly assured.

**Knight -- Detailed Behavior:**
- Knights are the elite damage-dealers. They wade into the enemy formation.
- With 2H weapons they use **Split** (hits target + adjacent ally), **Overhead Strike** (single-target massive damage), or **Swing** (hits all adjacent enemies).
- Knights target the highest-value player brother (best armor, most dangerous weapon).
- They have the **Berserk** perk: killing a target grants +4 AP, allowing a second action.
- They have the **Battle Forged** perk: percentage-based damage reduction scaling with armor value.
- Knights do not flee. They fight to the death unless the Sergeant is killed and they fail a Resolve check.

**Sergeant -- Detailed Behavior:**
- Exactly one Sergeant per noble encounter.
- Uses **Rally** every 2 turns, affecting all allies within 5 tiles.
- Uses **Hold!** command: all allies within 3 tiles gain +10 MDef until the Sergeant's next turn.
- Stays in the center of the formation, 1-2 rows back.
- When the Sergeant dies, all noble troops make a Resolve check at -10.
- The Sergeant is a priority target for the player, but the AI positions him behind Footmen.

**Arbalester -- Detailed Behavior:**
- Arbalesters use heavy crossbows (Range 7, 50-70 base damage, high armor penetration).
- Heavy crossbows require 1 full turn to reload (fire on Turn 1, reload on Turn 2, fire on Turn 3).
- They fire at the most armored target, exploiting the crossbow's armor penetration.
- If engaged in melee, they switch to a dagger and try to create distance.
- They position on high ground or flanks for line-of-sight.
- Arbalest variant has Range 8 and 60-80 base damage but takes 2 turns to reload.

**Noble Troop Composition by Difficulty:**

| Encounter Tier | Militia | Billmen | Footmen | Knights | Sergeants | Arbalesters | Total |
|---|---|---|---|---|---|---|---|
| Medium (Day 20-40) | 3-5 | 1-2 | 1-2 | 0 | 0-1 | 0-1 | 5-10 |
| Hard (Day 40-70) | 1-3 | 2-3 | 2-3 | 0-1 | 1 | 1-2 | 8-12 |
| Elite (Day 70+) | 0-2 | 2-3 | 2-4 | 1-2 | 1 | 2-3 | 9-12 |

---

### 2.3 Barbarians

Barbarians are a northern faction representing savage tribal warriors. They appear in snow and tundra biomes starting around Day 25. They specialize in overwhelming aggression, using massive two-handed weapons and minimal concern for self-preservation.

**Faction Traits:**
- Extremely high HP and melee attack on elite units
- Mixed quality: Thralls are expendable fodder, Chosen are terrifying elites
- No ranged units; they close distance as fast as possible
- Chosen never flee regardless of morale state
- Barbarian weapons are oversized and deal bonus damage but cost more Fatigue

#### Barbarian Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Shield |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Thrall** | 40-55 | 70-90 | 15-25 | 100-120 | 35-45 | 0-10 | 15-20 | 0-5 | 0-30 | 0-20 | Crude clubs, hatchets, stone axes | None |
| **Chosen** | 100-130 | 120-140 | 60-80 | 75-95 | 75-90 | 15-25 | 20-30 | 5-10 | 200-280 | 140-200 | Great axe, great sword, great hammer, two-handed flail | None (always 2H) |

**Thrall -- Detailed Behavior:**
- Thralls are enslaved warriors forced to fight. They are weaker than brigand Thugs.
- They serve as a meat shield for Chosen behind them.
- They charge directly at the nearest enemy with no tactical consideration.
- They break and flee at the first sign of trouble (Resolve 15-25).
- They exist to absorb the player's first volley and waste AP.
- Spawned in groups of 4-8 as screening force.

**Chosen -- Detailed Behavior:**
- Chosen are the most dangerous standard human enemies in the game.
- They have the **Never Flee** trait: they are immune to morale breaks and fight to the death.
- They use the **Adrenaline** perk: once per battle, they can act immediately at the start of a turn regardless of Initiative.
- They target the strongest-looking player brother (best equipment).
- Their two-handed weapons deal 80-120 base damage with high armor damage multipliers.
- They have the **Killing Frenzy** perk: +25% damage for 2 turns after killing a target.
- Chosen appear in groups of 2-6 backed by 4-8 Thralls.
- Each Chosen has a 15% chance to carry a named/famed weapon.

**Barbarian Composition by Difficulty:**

| Encounter Tier | Thralls | Chosen | Total |
|---|---|---|---|
| Medium (Day 25-45) | 4-6 | 1-2 | 5-8 |
| Hard (Day 45-70) | 4-6 | 3-4 | 7-10 |
| Elite (Day 70+) | 5-8 | 4-6 | 9-12 |

---

### 2.4 Nomads

Nomads are a desert faction appearing in arid and steppe biomes starting around Day 20. They specialize in mobility, debuffs, and hit-and-run tactics. Their curved swords bypass some armor, and their nets immobilize targets.

**Faction Traits:**
- High Initiative and evasion
- Nets immobilize targets for 1-2 turns
- Slings deal low damage but ignore some armor and can daze
- Curved swords (scimitars, shamshirs) have bonus damage vs. unarmored targets
- They kite and skirmish rather than holding ground

#### Nomad Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Shield |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Cutthroat** | 45-60 | 90-110 | 30-40 | 105-125 | 50-60 | 15-25 | 30-40 | 10-15 | 30-70 | 20-50 | Scimitar, saif, jambiya (dagger) | Leather buckler (25-40 durability) |
| **Slinger** | 40-55 | 85-100 | 25-35 | 100-120 | 30-40 | 5-15 | 50-65 | 10-15 | 20-50 | 15-40 | Sling (range 5), staff sling (range 6) | None |
| **Outlander** | 55-70 | 100-120 | 40-55 | 95-115 | 60-70 | 20-30 | 35-45 | 10-20 | 80-130 | 50-90 | Shamshir, fighting spear, military pick | Round shield (50-80 durability) |
| **Assassin** | 50-65 | 95-115 | 35-45 | 115-135 | 55-65 | 25-35 | 40-50 | 15-20 | 40-70 | 30-50 | Poisoned dagger, throwing nets, javelins | None |
| **Champion** | 65-85 | 110-130 | 55-70 | 90-110 | 70-80 | 20-30 | 40-50 | 15-20 | 130-190 | 80-130 | Two-handed scimitar, polesword | None |

**Cutthroat -- Detailed Behavior:**
- Cutthroats are the basic melee unit. They use Duelist fighting style (bonus damage with 1H weapon, no shield).
- They circle around to flank rather than engaging head-on.
- Scimitars deal +20% damage to targets with less than 50% body armor remaining.
- They pair up and try to surround single targets for flanking bonuses.

**Slinger -- Detailed Behavior:**
- Slingers fire stones that deal 15-30 damage but have 50% armor penetration.
- Sling attacks have a 20% chance to inflict **Daze** (target loses 2 Initiative and -10% to all skills for 1 turn).
- Staff slings fire heavier projectiles (25-40 damage) at longer range.
- Slingers kite backwards when enemies approach, maintaining 3-4 tile distance.

**Outlander -- Detailed Behavior:**
- Outlanders are the solid line infantry equivalent for nomads.
- They use Shieldwall and fighting spears with Spearwall defensively.
- They are more mobile than noble Footmen, willing to reposition mid-fight.
- They protect Slingers and Assassins by screening.

**Assassin -- Detailed Behavior:**
- Assassins carry 2 throwing nets and 3 javelins.
- **Net** (Range 3): immobilizes target for 2 turns. Target cannot move or use movement-based skills. Costs 15 Fatigue. Net must be cut free (costs target 1 full turn of AP).
- Assassins throw nets at high-value targets, then close in with poisoned daggers.
- Poisoned daggers apply **Poison**: 5 damage/turn for 3 turns, ignoring armor.
- They have the **Footwork** perk: can disengage from melee without triggering free attacks.
- Maximum of 1-2 Assassins per encounter.

**Champion -- Detailed Behavior:**
- Champions lead nomad war parties.
- They use **Rally** equivalent (War Cry): +10 Resolve to allies within 4 tiles.
- Their two-handed scimitars deal 70-100 base damage with the armor-bypass bonus.
- They challenge the strongest player brother directly.
- One Champion per encounter. 25% chance of famed weapon (post Day 50).

**Nomad Composition by Difficulty:**

| Encounter Tier | Cutthroats | Slingers | Outlanders | Assassins | Champions | Total |
|---|---|---|---|---|---|---|
| Medium (Day 20-40) | 2-4 | 1-2 | 1-2 | 0-1 | 0 | 4-8 |
| Hard (Day 40-65) | 2-3 | 2-3 | 2-3 | 1 | 0-1 | 7-10 |
| Elite (Day 65+) | 2-3 | 2-3 | 2-4 | 1-2 | 1 | 9-12 |

---

## 3. Undead Enemies

The undead are a fundamentally different challenge from human enemies. They are immune to morale effects, poison, and bleeding. They do not flee. They do not tire. They must be destroyed completely. Undead fights are wars of attrition where the player must manage Fatigue carefully and prioritize the right targets.

**Universal Undead Traits:**
- Immune to morale (cannot be Wavering, Breaking, or Fleeing)
- Immune to Poison
- Immune to Bleeding
- Do not generate Fatigue from actions (always at 0 Fatigue)
- Cannot be charmed, frightened, or taunted via normal means

---

### 3.1 Wiederganger (Zombies)

Wiederganger are reanimated corpses. They are slow, stupid, and individually weak. Their danger comes from numbers and the ability to rise from the dead after being killed.

#### Wiederganger Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Wiederganger** | 50-80 | N/A | N/A | 40-60 | 35-50 | 5-15 | 0 | 0-5 | 0-40 | 0-30 | Claws, rusty swords, clubs | Rise from Dead |
| **Fallen Hero** | 80-120 | N/A | N/A | 50-70 | 55-70 | 15-25 | 0 | 5-10 | 150-250 | 100-180 | Ancient swords, military hammers, axes | Rise from Dead, retains armor |

**Rise from Dead Mechanic:**
- When a Wiederganger is killed, it has a 50% base chance to rise again after 1-3 turns.
- The risen Wiederganger returns with 50% of its max HP and no armor.
- A Wiederganger can rise a maximum of 2 times per battle.
- To permanently kill a Wiederganger, the player must **decapitate** it (final blow with a cutting weapon to the head) or destroy it with a single massive blow (overkill by 20+ HP).
- If a Necromancer is present, rise chance increases to 80% and there is no maximum rise count.

**Wiederganger -- Detailed Behavior:**
- Wiederganger shuffle toward the nearest living target at 1-2 tiles per turn.
- They have no tactical intelligence. They attack whatever is closest.
- They are individually easy to kill but dangerous in groups of 6-12.
- Their low Initiative means the player usually acts first.
- They surround and grapple: if 3+ Wiederganger are adjacent to a target, the target suffers -15 MDef.

**Fallen Hero -- Detailed Behavior:**
- Fallen Heroes are reanimated knights and warriors. They retain their armor and better weapons.
- They are significantly more dangerous than standard Wiederganger.
- They still have no tactical intelligence but hit much harder.
- Their armor must be destroyed before they can be damaged efficiently.
- They rise from the dead with armor intact (at 50% durability).
- Fallen Heroes appear in ancient battlefields and high-tier undead encounters.

---

### 3.2 Ancient Dead (Skeletons)

Ancient Dead are the reanimated remains of a long-fallen empire. Unlike Wiederganger, they retain tactical intelligence and fight in disciplined formations. They are extremely dangerous in groups.

#### Ancient Dead Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Legionnaire** | 40-55 | N/A | N/A | 60-80 | 50-60 | 15-25 | 0 | 10-15 | 60-100 | 40-70 | Ancient sword, ancient spear (Reach 2) | Formation, Shield Expert |
| **Honor Guard** | 60-80 | N/A | N/A | 55-75 | 65-80 | 10-20 | 0 | 5-10 | 140-220 | 100-160 | Ancient great sword, ancient pike, ancient two-hander | Formation |
| **Auxiliary** | 35-50 | N/A | N/A | 70-90 | 35-45 | 5-10 | 50-65 | 10-15 | 30-60 | 20-40 | Ancient bow, ancient javelin (3 ammo) | Formation |
| **Priest** | 45-60 | N/A | N/A | 50-70 | 30-40 | 5-15 | 0 | 5-10 | 50-80 | 40-60 | Ancient staff | Rally equivalent, Resurrect |

**Formation Mechanic:**
- Ancient Dead receive +10 MDef when adjacent to at least 2 other Ancient Dead allies.
- This bonus stacks with Shieldwall, making Legionnaire formations extremely hard to penetrate.
- Breaking the formation (killing units to create gaps) removes this bonus.
- The AI actively repositions to maintain formation integrity.

**Legionnaire -- Detailed Behavior:**
- Legionnaires form the shield wall. They use Shieldwall and Spearwall.
- Ancient spears have Reach 2, allowing them to attack from behind the front line.
- They hold position and wait for the player to approach. They do not charge.
- Their shields have 80-120 durability and the **Shield Expert** perk (shields take 50% less damage from attacks targeting them).
- Destroying their shields is critical -- without shields they lose 15-25 MDef.

**Honor Guard -- Detailed Behavior:**
- Honor Guard stand in the second row with Reach 2 weapons or wade into melee with great swords.
- Ancient great swords deal 60-90 damage with **Split** (hits adjacent target too).
- They are the primary damage dealers of Ancient Dead formations.
- They target whoever is engaged with the Legionnaire line.
- With 140-220 armor they are difficult to put down quickly.

**Auxiliary -- Detailed Behavior:**
- Auxiliaries are the ranged component of Ancient Dead forces.
- Ancient bows have Range 6 and deal 30-50 damage.
- Ancient javelins have Range 4, deal 40-60 damage, and have only 3 ammo.
- After expending javelins, Auxiliaries switch to a short ancient sword (MAtk 35-45).
- They stand behind the Legionnaire line and fire over it.

**Priest -- Detailed Behavior:**
- Priests are the command unit for Ancient Dead.
- They use **Resurrect** (3-turn cooldown): revive one destroyed Ancient Dead unit at the Priest's location with 75% HP and 50% armor. The unit appears in the Priest's tile and can act next turn.
- They use **Rally of the Dead**: all Ancient Dead within 5 tiles gain +5 MAtk for 2 turns.
- Priests stay behind the formation, protected by Honor Guard.
- Killing the Priest stops Resurrections and removes the Formation bonus from all units (they fight individually).
- Maximum of 1 Priest per encounter. The Priest is always the top priority target.

**Ancient Dead Composition by Difficulty:**

| Encounter Tier | Legionnaires | Honor Guard | Auxiliaries | Priests | Total |
|---|---|---|---|---|---|
| Medium (Day 25-45) | 4-6 | 1-2 | 0-2 | 0 | 5-9 |
| Hard (Day 45-70) | 4-6 | 2-3 | 1-2 | 0-1 | 8-11 |
| Elite (Day 70+) | 4-6 | 3-4 | 2-3 | 1 | 10-12 |

---

### 3.3 Necromancers

Necromancers are living human spellcasters who control the undead. They always appear alongside Wiederganger and occasionally with Ancient Dead. They are the single most important target in any undead encounter.

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Necromancer** | 50-70 | 100-120 | 50-65 | 70-90 | 25-35 | 5-15 | 0 | 5-10 | 30-60 | 20-40 | Staff, dagger | Raise Dead, Corpse Explosion |

**Necromancer -- Detailed Behavior:**
- The Necromancer starts at the very back of the battlefield, 6-8 tiles behind the undead front line.
- Every 2 turns, the Necromancer uses **Raise Dead**: selects any corpse on the battlefield and reanimates it as a Wiederganger with the corpse's original armor. This includes player brothers who have died.
- **Corpse Explosion** (4-turn cooldown): detonates a corpse within 5 tiles, dealing 30-50 damage to all units within 2 tiles of the corpse. Armor is only 50% effective against this damage.
- The Necromancer does not engage in melee. If approached, he attempts to flee to the farthest tile from all enemies.
- He is protected by 2-4 Wiederganger bodyguards who stay adjacent to him.
- When the Necromancer dies, all Wiederganger lose Rise from Dead capability, and any currently-dead Wiederganger cannot rise.
- Maximum 1 Necromancer per encounter (rarely 2 in elite encounters).
- The Necromancer has the **Nine Lives** perk: first killing blow instead reduces him to 1 HP. He must be hit twice to kill.

---

### 3.4 Vampires (Necrosavants)

Vampires are the most dangerous undead elite. They bypass the player's front line by teleporting directly to vulnerable back-line units.

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Vampire** | 100-140 | N/A | N/A | 110-130 | 70-85 | 25-40 | 0 | 15-25 | 0-30 | 0-20 | Claws (60-80 damage) | Teleport, Life Drain, Immune to morale |

**Teleport Mechanic:**
- Vampires can teleport to any tile within 8 tiles as a movement action.
- Teleporting does not trigger free attacks from adjacent enemies.
- They typically teleport past the front line to reach archers, banner-bearers, and injured brothers.

**Life Drain Mechanic:**
- Every melee attack by a Vampire heals it for 50% of damage dealt to HP (after armor).
- This makes Vampires extremely hard to kill in prolonged fights.
- A Vampire at 30 HP can heal back to full if it gets several unanswered attacks on a lightly armored target.

**Vampire -- Detailed Behavior:**
- Vampires always target the most vulnerable back-line unit (lowest HP, lowest MDef, or most important role like banner-bearer).
- On Turn 1 they teleport directly onto a back-line target and attack.
- They attack twice per turn (2 claw strikes).
- If they kill a target, they teleport to the next vulnerable target.
- If surrounded by 3+ enemies, they teleport away to a new target.
- They have no armor but very high MDef (25-40) and HP (100-140).
- They are killed by overwhelming them with multiple melee attackers simultaneously.
- Vampires appear in groups of 1-3, sometimes accompanied by Wiederganger.

---

### 3.5 Alps

Alps are nightmare creatures that attack the minds of the player's brothers, putting them to sleep and draining their life.

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Alp** | 60-80 | N/A | N/A | 130-150 | 0 | 30-45 | 0 | 20-30 | 0 | 0 | None (Nightmare drain) | Nightmare, Sleep, Phase |

**Nightmare Mechanic:**
- Alps do not attack conventionally. Instead, they use **Nightmare** (Range 5): forces a Resolve check on the target. If the target fails, they fall **Asleep**.
- A Sleeping brother cannot act, has 0 MDef, and takes 15-25 HP damage per turn as the Alp drains their life.
- Sleeping brothers can be woken by an adjacent ally spending 4 AP to shake them awake, or by taking direct HP damage from any source.
- Alps drain HP from Sleeping targets at the start of each of the Alp's turns. This heals the Alp for the same amount.

**Phase Mechanic:**
- Alps are semi-ethereal. All physical damage against them is reduced by 50%.
- They take full damage from cleavers and blunt weapons (these disrupt their form).
- They cannot be grappled, netted, or stunned.

**Alp -- Detailed Behavior:**
- Alps stay at maximum range (5 tiles) and use Nightmare every turn on a new target.
- They flee if any enemy gets within 2 tiles.
- They target brothers with the lowest Resolve first.
- A single Alp can shut down 2-3 brothers per fight if left unchecked.
- The counter is high Resolve, having a brother dedicated to waking allies, or rushing the Alp with fast units.
- Alps appear in groups of 2-4, always in night battles or swamp/forest terrain.
- They have extremely high Initiative (130-150), almost always acting first.

---

### 3.6 Geists

Geists are spectral undead that have almost no HP but can devastate the player's morale with their Horrifying Scream.

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Geist** | 1 | N/A | N/A | 100-120 | 0 | 0 | 0 | 0 | 0 | 0 | None | Horrifying Scream, Ethereal |

**Horrifying Scream Mechanic:**
- **Horrifying Scream** (every 2 turns): all player brothers within 6 tiles must make a Resolve check at -20. Failure causes immediate morale drop by one level (Confident to Steady, Steady to Wavering, Wavering to Breaking, Breaking to Fleeing).
- Multiple Geists stack: 2 Geists screaming in the same turn force a check at -30, 3 at -40.
- This can cause chain routing if the player's brothers have low Resolve.

**Ethereal Trait:**
- Geists have only 1 HP but are Ethereal: ranged attacks have a 75% chance to pass through them harmlessly.
- Melee attacks hit normally but the Geist must be within melee range first.
- They float above the battlefield and cannot be blocked by terrain or units.

**Geist -- Detailed Behavior:**
- Geists hover near the center of the undead formation, behind the Wiederganger line.
- They scream every 2 turns, targeting the largest cluster of player brothers.
- They do not attack physically. Their only role is morale disruption.
- They flee to the far edge of the map if any melee enemy gets within 2 tiles.
- Killing Geists is the top priority in any undead encounter that includes them.
- They always appear alongside Wiederganger (4-8) who serve as a screen.
- 1-3 Geists per encounter.

---

## 4. Greenskin Enemies

Greenskins are divided into two sub-factions: Goblins and Orcs. They may appear together in mixed war parties. Goblins are cunning and evasive. Orcs are brute-force monsters. Together they cover each other's weaknesses.

---

### 4.1 Goblins

Goblins are small, fast, and fight dirty. They use poison, nets, and evasion to frustrate and wear down the player. They never engage in fair melee if they can avoid it.

**Faction Traits:**
- Extremely high Ranged Defense and evasion
- Poison on most weapons (5 damage/turn for 3 turns, ignoring armor)
- Nets to immobilize high-value targets
- Wolfriders provide unmatched mobility
- Shamans provide magical support and crowd control
- Goblins kite: they retreat when approached and shoot while moving

#### Goblin Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ambusher** | 30-45 | 80-100 | 20-30 | 110-130 | 30-40 | 20-30 | 45-60 | 25-35 | 10-40 | 5-25 | Poison bow, poison javelins (3 ammo), nets | Poison, Net, Nimble |
| **Skirmisher** | 35-50 | 85-105 | 25-35 | 105-125 | 40-50 | 25-35 | 35-45 | 20-30 | 20-50 | 10-35 | Poison daggers, falchions, notched blades | Poison, Backstab |
| **Wolfrider** | 50-65 (wolf: 40-60) | 100-120 | 30-40 | 120-140 | 45-55 | 20-30 | 40-50 | 20-30 | 30-70 | 20-50 | Goblin lance, javelins, poison bow | Mounted, Hit-and-Run |
| **Overseer** | 40-55 | 90-110 | 40-55 | 95-115 | 40-50 | 15-25 | 40-50 | 20-30 | 40-80 | 30-60 | Whip (Range 2), poison dagger | Whip Buff, Slave Driver |
| **Shaman** | 35-50 | 90-110 | 45-60 | 90-110 | 20-30 | 10-20 | 30-40 | 15-25 | 20-50 | 15-40 | Staff, poison dagger | Root, Hex, Summon Bugs |

**Ambusher -- Detailed Behavior:**
- Ambushers are the primary goblin ranged unit. They fire poisoned arrows every turn.
- Poison arrows deal 15-25 base damage and apply **Poison** (5 HP/turn for 3 turns, ignoring armor).
- They carry 1-2 nets (Range 3). Nets immobilize for 2 turns. They throw nets at dangerous melee brothers.
- They have the **Nimble** perk: damage reduction based on low Fatigue (they wear almost no armor, so Nimble is always active).
- They kite backwards when enemies approach within 3 tiles.
- They prioritize targets without shields (ranged attacks vs. shields have -25% hit chance).
- Their high RDef (25-35) makes them frustrating to hit with player ranged attacks.

**Skirmisher -- Detailed Behavior:**
- Skirmishers are goblin melee units. They are fragile but evasive.
- **Backstab**: when attacking a target from behind or the side (not the front 3 hexes), they gain +20% damage.
- They dart into flanking positions rather than engaging head-on.
- Poison daggers apply **Poison** on hit.
- They use **Footwork** to disengage if cornered.
- They are individually weak; their threat comes from flanking bonuses and poison stacking.

**Wolfrider -- Detailed Behavior:**
- Wolfriders are mounted on dire wolves, giving them 4 tiles of movement per turn (standard is 2).
- **Hit-and-Run**: after attacking, Wolfriders can move 2 tiles without triggering free attacks.
- They circle the battlefield, attacking flanks and rear.
- The wolf itself attacks separately: bite deals 20-30 damage.
- If the wolf is killed (40-60 HP), the goblin dismounts and becomes a Skirmisher.
- Wolfriders throw javelins as they close distance, then use lances in melee.
- Lance charges deal double damage on the first attack after moving 3+ tiles.
- Maximum 2-4 Wolfriders per encounter.

**Overseer -- Detailed Behavior:**
- Overseers use whips (Range 2) to both attack and buff allies.
- **Whip Buff**: the Overseer cracks his whip, granting all goblin allies within 3 tiles +10 Initiative and +5 MAtk for 2 turns. Used every 3 turns.
- **Slave Driver**: if a goblin ally within 2 tiles is Wavering or Breaking, the Overseer whips them, removing the morale penalty but dealing 5 damage. This keeps goblins in the fight.
- Overseers position themselves behind the Skirmisher line.
- 1 Overseer per encounter.

**Shaman -- Detailed Behavior:**
- Shamans are the goblin spellcasters. They provide crowd control and debuffs.
- **Root** (Range 6, 3-turn cooldown): vines erupt from the ground, rooting one target in place for 2 turns. The target cannot move but can still attack and use non-movement skills.
- **Hex** (Range 6, 4-turn cooldown): curses one target, reducing all stats by 15% for 3 turns.
- **Summon Bugs** (5-turn cooldown): summons a swarm of biting insects on a 2-tile radius area. All units in the area take 10 damage/turn for 3 turns and suffer -10 to all skills.
- Shamans stay at maximum range, behind all other goblins.
- They are fragile and die quickly if reached.
- Maximum 1 Shaman per encounter.

**Goblin Composition by Difficulty:**

| Encounter Tier | Ambushers | Skirmishers | Wolfriders | Overseers | Shamans | Total |
|---|---|---|---|---|---|---|
| Medium (Day 15-35) | 3-5 | 1-3 | 0-1 | 0 | 0 | 4-8 |
| Hard (Day 35-60) | 3-4 | 2-3 | 1-2 | 0-1 | 0-1 | 7-10 |
| Elite (Day 60+) | 3-4 | 2-3 | 2-3 | 1 | 1 | 9-12 |

---

### 4.2 Orcs

Orcs are massive, brutal, and terrifying. They have the highest HP and melee damage of any standard enemy faction. They overwhelm through raw power. Their weakness is low Initiative (they act last), low Ranged Defense, and vulnerability to focus fire.

**Faction Traits:**
- Enormous HP pools, best in the game for non-beast enemies
- **Rage** mechanic: Orcs gain damage when wounded
- Heavy armor on Warriors and Warlords
- No ranged units; they charge head-on every turn
- Low Initiative (they usually act last)
- Young Orcs are cannon fodder; Warriors and Warlords are endgame threats

#### Orc Unit Table

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Young** | 70-90 | 100-120 | 35-50 | 70-85 | 45-55 | 5-15 | 10-20 | 0-10 | 40-80 | 30-60 | Orc axe, orc cleaver, jagged pike | Rage |
| **Berserker** | 100-130 | 130-150 | 50-65 | 80-95 | 65-80 | 0-10 | 10-15 | 0-5 | 0-30 | 0-20 | Orc great axe, orc mansplitter, orc flail | Rage (enhanced), Frenzy |
| **Warrior** | 120-160 | 120-140 | 55-70 | 60-80 | 70-85 | 15-25 | 10-20 | 5-10 | 200-300 | 140-220 | Orc battle axe, orc jagged pike, orc warhammer | Rage |
| **Warlord** | 150-200 | 130-150 | 70-85 | 55-75 | 80-95 | 15-25 | 15-20 | 5-10 | 250-340 | 180-260 | Orc great hammer, orc great axe, orc mansplitter | Rage, Rally, Warcry |

**Rage Mechanic:**
- When an Orc's HP drops below 50%, it enters **Rage**.
- In Rage: +15% damage, +10 MAtk, -5 MDef (they attack more recklessly).
- For Berserkers, Rage activates at 75% HP and grants +25% damage, +15 MAtk, -10 MDef.
- Rage does not end until the Orc is killed.
- This means half-killing an Orc is worse than not hitting it at all. Focus fire to finish them.

**Young -- Detailed Behavior:**
- Young Orcs are adolescents proving themselves. They are strong by human standards but weak by Orc standards.
- They charge the nearest target recklessly.
- They break morale at normal rates (Resolve 35-50).
- They serve as the front wave, absorbing initial strikes before Warriors arrive.
- Orc axes deal 40-60 damage; jagged pikes have Reach 2.

**Berserker -- Detailed Behavior:**
- Berserkers wear almost no armor. They rely on massive HP pools and Rage.
- **Frenzy**: when a Berserker kills an enemy, it immediately gains a free attack on a random adjacent target.
- They charge the strongest-looking player brother and attack relentlessly.
- They are extremely dangerous when Enraged: 65-80 MAtk becomes 80-95 with +25% damage.
- Orc mansplitter deals 80-130 base damage with huge armor damage.
- Counter: focus fire with ranged weapons before they reach melee. Their 0-30 armor and 0-5 RDef make them vulnerable to arrows.
- 1-3 Berserkers per encounter.

**Warrior -- Detailed Behavior:**
- Warriors are the backbone of Orc armies. They are walking tanks.
- 200-300 body armor takes enormous effort to penetrate.
- They use heavy weapons that deal 60-100 base damage.
- They target whoever is in front of them; they do not flank or maneuver.
- When Enraged (below 50% HP), they become terrifyingly effective: 85-100 MAtk with +15% damage.
- Counter: hammers and maces to destroy armor, then focus fire. Alternatively, ignore Warriors and kill softer targets first.

**Warlord -- Detailed Behavior:**
- Warlords are the leaders of Orc war parties. They are the most dangerous standard humanoid enemy in the game.
- **Rally** (every 3 turns): all Orc allies within 5 tiles gain +15 Resolve for 2 turns and remove Wavering.
- **Warcry** (once per battle): all player brothers within 5 tiles must make a Resolve check at -25 or drop one morale level.
- The Warlord charges the player's strongest unit and engages in single combat.
- 150-200 HP with 250-340 armor means the Warlord can absorb 8-12 attacks before going down.
- 1 Warlord per encounter. Always has a 30% chance of famed weapon (post Day 50).

**Orc Composition by Difficulty:**

| Encounter Tier | Young | Berserkers | Warriors | Warlords | Total |
|---|---|---|---|---|---|
| Medium (Day 20-40) | 3-5 | 0-1 | 1-2 | 0 | 4-8 |
| Hard (Day 40-65) | 2-4 | 1-2 | 2-3 | 0-1 | 6-10 |
| Elite (Day 65+) | 2-3 | 1-3 | 3-4 | 1 | 8-12 |

**Mixed Greenskin Encounters (Goblins + Orcs):**

| Encounter Tier | Goblin Ambushers | Goblin Wolfriders | Orc Young | Orc Warriors | Orc Warlord | Total |
|---|---|---|---|---|---|---|
| Hard (Day 50+) | 2-3 | 1-2 | 2-3 | 1-2 | 0 | 7-10 |
| Elite (Day 70+) | 2-3 | 1-2 | 1-2 | 2-3 | 0-1 | 8-12 |

---

## 5. Beast Enemies

Beasts break the standard combat rules. They have unique body plans, special mechanics, and often require specific strategies. They are encountered in wilderness contracts and deep exploration.

---

### 5.1 Direwolves

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Direwolf** | 50-70 | 100-120 | 40-50 | 120-140 | 55-65 | 25-35 | 0 | 15-20 | 0 | 0 | Bite (30-50 damage) | Pack Tactics, Fast, Surround |

**Pack Tactics Mechanic:**
- Direwolves gain +10 MAtk for each other Direwolf adjacent to the same target.
- 3 wolves on one target: each wolf has +20 MAtk. This makes their effective MAtk 75-85.
- They coordinate attacks on a single target, bringing it down before moving to the next.

**Direwolf -- Detailed Behavior:**
- Direwolves have 3 tiles of movement per turn (standard is 2).
- They always focus fire on one target. The AI selects the most isolated brother.
- They attempt to surround the target (3+ wolves adjacent) before attacking.
- High Initiative (120-140) means they usually act first, allowing them to reposition before the player can react.
- Their MDef (25-35) is high for a beast; they are hard to hit.
- Counter: tight formation prevents isolation. Spearwall denies their approach. Overwhelm perk reduces their evasion.
- Appear in packs of 4-8.

---

### 5.2 Webknechts (Spiders)

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Webknecht** | 40-60 | 90-110 | 30-40 | 95-115 | 45-55 | 15-25 | 0 | 10-15 | 10-30 | 5-15 | Bite (20-35 damage, poison) | Web Spit, Poison Bite, Spawn Hatchlings |
| **Hatchling** | 10-20 | 50-70 | 10-20 | 110-130 | 30-40 | 15-25 | 0 | 10-15 | 0 | 0 | Bite (10-15 damage, poison) | Poison Bite, Tiny |

**Web Spit Mechanic:**
- **Web Spit** (Range 4, 2-turn cooldown): fires a web at a target. Hit target is **Webbed** for 2 turns. Webbed units cannot move and suffer -20 MDef.
- Webs can be cut free by the target spending a full turn of AP, or by an adjacent ally spending 4 AP.

**Spawn Hatchlings Mechanic:**
- When a Webknecht is killed, it has a 40% chance to spawn 2-3 Hatchlings in adjacent tiles.
- Hatchlings are tiny, weak, and die in 1-2 hits. But they apply poison and clog up tiles.

**Poison Bite:**
- Webknecht bite applies **Poison**: 8 damage/turn for 3 turns, ignoring armor.
- Hatchling bite applies weaker Poison: 3 damage/turn for 2 turns.

**Webknecht -- Detailed Behavior:**
- Webknechts open with Web Spit to immobilize a target, then close to melee range to bite.
- They target the most heavily armored brothers (poison ignores armor, so armor is irrelevant).
- They move through forest and web terrain without penalty.
- Appear in groups of 4-8, often in forest or cave terrain.
- Counter: antidote consumable removes poison. Ranged attacks kill them before they close. Cut webbed allies free immediately.

---

### 5.3 Unholds (Trolls)

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Unhold** | 250-350 | 150-180 | 50-65 | 50-70 | 65-80 | 10-20 | 0 | 0-5 | 50-100 | 30-60 | Fist slam (50-80 damage), Throw | Regeneration, 2x2, Throw, Knockback |
| **Armored Unhold** | 280-380 | 140-170 | 55-70 | 45-65 | 70-85 | 10-20 | 0 | 0-5 | 150-250 | 80-150 | Fist slam (60-90 damage), Throw | Regeneration, 2x2, Throw, Knockback |

**2x2 Size:**
- Unholds occupy a 2x2 tile area on the hex grid. They block movement and line of sight.
- They can be surrounded by up to 8 enemies instead of the standard 6.
- Their attacks can hit 2 adjacent targets simultaneously.

**Regeneration Mechanic:**
- Unholds regenerate 15-25 HP at the start of each of their turns.
- This regeneration continues as long as the Unhold is alive.
- Regeneration is halved (8-12 HP) if the Unhold is on fire (torch, fire pot).
- Counter: sustained high DPS to outdamage regeneration. Fire reduces it. Do not fight Unholds in prolonged battles of attrition.

**Throw Mechanic:**
- **Throw** (3-turn cooldown): the Unhold grabs an adjacent enemy and throws them 3 tiles in a direction. The thrown brother takes 30-50 damage and is **Stunned** for 1 turn. If the thrown brother lands on another unit, both take 20-30 damage.
- This disrupts formation and can throw a brother into the middle of other enemies.

**Knockback:**
- Every melee attack by an Unhold has a 33% chance to knock the target back 1 tile.

**Unhold -- Detailed Behavior:**
- Unholds are slow (1 tile of movement per turn) but devastating when they arrive.
- They target the nearest cluster of enemies and wade in.
- They use Throw on the most dangerous adjacent enemy (highest MAtk).
- They prioritize attacking enemies that are dealing the most damage to them.
- Appear alone or in groups of 2-3. Armored Unholds appear in late-game encounters.
- Counter: kite them with ranged attacks. Use nets to immobilize. Focus fire one at a time.

---

### 5.4 Lindwurms

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Lindwurm** | 300-400 | 200-250 | 60-75 | 60-80 | 80-90 | 10-20 | 0 | 0-5 | 100-150 | 60-100 | Bite (70-100 damage), Tail Swipe (40-60 damage, AoE) | Two Heads, Acid Blood, 2x2 |

**Two Heads Mechanic:**
- Lindwurms have two heads and take **2 actions per turn**.
- Action 1: Head Bite -- single-target attack dealing 70-100 damage. 30% chance to inflict **Bleeding** (10 damage/turn for 3 turns).
- Action 2: Tail Swipe OR second Bite.
- **Tail Swipe**: hits all enemies in a 180-degree arc behind the Lindwurm, dealing 40-60 damage and knocking targets back 1 tile.
- The Lindwurm can attack two different targets per turn or focus both attacks on one target.

**Acid Blood Mechanic:**
- When a melee attacker strikes a Lindwurm, the Lindwurm's acid blood splashes back.
- The attacker takes 10-20 damage to their body armor and 5-10 damage to HP (ignoring armor).
- This means every melee attack costs the player HP and armor durability.
- Ranged attacks do not trigger Acid Blood.
- Counter: use ranged attacks when possible. Melee attackers should have expendable armor. Rotate melee attackers to spread acid damage.

**Lindwurm -- Detailed Behavior:**
- Lindwurms are aggressive predators. They charge the nearest enemy and bite.
- They use Tail Swipe when 3+ enemies are behind or to the side.
- They are 2x2 size like Unholds.
- They do not regenerate but have massive HP pools (300-400).
- Appear alone or in pairs.
- Counter: ranged focus fire. If melee is required, use spears (Reach 2) to avoid Acid Blood splash. Surround and overwhelm with coordinated attacks.

---

### 5.5 Schrats

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Schrat** | 300-400 | 180-220 | 55-70 | 40-60 | 70-85 | 10-20 | 0 | 0-5 | 0 (Wood Shield) | 0 | Wooden slam (60-90 damage), Root attack | Wood Shield, Regeneration, Weak to Axes, 2x2 |

**Wood Shield Mechanic:**
- Schrats have a regenerating **Wood Shield** with 200-300 durability.
- The Wood Shield absorbs all damage until it is destroyed.
- Once destroyed, the Schrat takes full HP damage for 2 turns.
- The Wood Shield regenerates 40-60 durability per turn starting 2 turns after being destroyed.
- The cycle: destroy shield, deal HP damage for 2 turns, shield regenerates, repeat.

**Weak to Axes:**
- Axes deal double damage to the Wood Shield (chopping wood).
- Without axes, destroying the Wood Shield takes much longer.
- This is the primary counter: bring at least 2-3 axe-wielding brothers.

**Root Attack (3-turn cooldown):**
- The Schrat sends roots through the ground that erupt under a target within 4 tiles.
- The target takes 30-50 damage and is **Rooted** for 1 turn (cannot move).

**Schrat -- Detailed Behavior:**
- Schrats are slow (1 tile/turn) and territorial.
- They attack the nearest enemy with wooden slams.
- They use Root Attack on enemies trying to kite them.
- They are 2x2 size.
- Regeneration: 15-20 HP per turn (in addition to Wood Shield regeneration).
- Appear alone or in pairs in deep forest terrain.
- Counter: axes to destroy the shield, then focus fire during the 2-turn vulnerability window. Repeat.

---

### 5.6 Hexen (Witches)

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Hexe** | 50-70 | 90-110 | 55-70 | 100-120 | 25-35 | 20-30 | 0 | 15-25 | 0-20 | 0-15 | Claws (15-25 damage) | Charm, Hex, Disguise |

**Charm Mechanic:**
- **Charm** (Range 5, 4-turn cooldown): the Hexe forces a Resolve check on a target at -20. If the target fails, they are **Charmed** for 3 turns.
- A Charmed brother switches to enemy control. The AI controls them as a full combatant, attacking their own allies.
- Charm can be broken by: dealing 20+ HP damage to the Charmed brother (snaps them out of it), killing the Hexe who charmed them, or waiting 3 turns.
- The Hexe targets the most dangerous brother (highest MAtk with a 2H weapon) to turn them against the player.

**Hex Ability (2-turn cooldown):**
- Curses a target within 5 tiles. The target suffers -20% to all stats for 3 turns.

**Disguise:**
- Hexen begin combat disguised as harmless figures (old women, children). They appear as neutral units on the battlefield.
- They reveal themselves when they first use an ability or when a brother moves adjacent to them.
- This means the player may not know where the Hexen are on Turn 1.

**Hexe -- Detailed Behavior:**
- Hexen are the highest priority target in any encounter where they appear.
- They stay at maximum range and Charm the most dangerous player brother immediately.
- They are always accompanied by bodyguards: 2-4 Direwolves, Unholds, or Wiederganger.
- They flee if any enemy gets within 2 tiles.
- If the player does not kill the Hexe quickly, the Charmed brother can devastate the player's own party.
- Appear in groups of 1-3 with bodyguards.
- Counter: rush them with fast brothers. Keep high-Resolve brothers in front (harder to Charm). Stun or net charmed brothers instead of killing them.

---

### 5.7 Kraken

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Kraken (Body)** | 500-700 | N/A | N/A | 30-40 | 0 | 0 | 0 | 0 | 200-300 | N/A | N/A | Immobile, spawns Tentacles |
| **Tentacle** | 80-120 | N/A | N/A | 80-100 | 60-75 | 15-25 | 0 | 10-15 | 0 | 0 | Tentacle slam (40-60 damage), Grab | Grab, Devour, Regrow |

**Kraken Body:**
- The Kraken body occupies a 3x3 area in the center of the battlefield. It is immobile.
- The body cannot be attacked directly while any Tentacles are alive.
- Once all Tentacles are destroyed, the body is exposed for 2 turns.
- After 2 turns, the Kraken regrows 2-4 Tentacles.
- Win condition: destroy all Tentacles, then deal enough damage to the body during the 2-turn window. Repeat until dead.

**Tentacle Mechanics:**
- The Kraken spawns 4-6 Tentacles at the start of battle, positioned around the body.
- Each Tentacle occupies 1 tile and can attack adjacent enemies.
- **Grab** (2-turn cooldown): the Tentacle grabs an adjacent enemy. The grabbed brother cannot move or attack (they are held). They take 20-30 damage/turn while grabbed.
- **Devour**: if a brother remains Grabbed for 3 consecutive turns, they are pulled to the Kraken body and instantly killed (devoured).
- Grabbed brothers can be freed by destroying the Tentacle holding them.
- **Regrow**: destroyed Tentacles regrow 2 turns after all Tentacles are killed (see body description above).

**Kraken -- Detailed Behavior:**
- Tentacles attack the nearest brothers and attempt to Grab them.
- They prioritize grabbing different targets (one brother per Tentacle).
- The Kraken is a late-game boss encounter. It appears in coastal caves and deep water locations.
- Counter: bring axes and swords to quickly destroy Tentacles. Free grabbed brothers immediately (they die in 3 turns). Coordinate burst damage on the body during vulnerability windows.

---

### 5.8 Ifrits

| Unit | HP | Fatigue | Resolve | Initiative | MAtk | MDef | RAtk | RDef | Armor (Body) | Armor (Head) | Weapon Types | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ifrit** | 120-160 | N/A | N/A | 100-120 | 65-80 | 20-30 | 55-70 | 15-25 | 0 | 0 | Fire claws (50-70 damage, fire) | Fire Aura, Fireball, Teleport |

**Fire Aura:**
- All units adjacent to an Ifrit take 10-15 fire damage at the start of the Ifrit's turn.
- Fire damage ignores armor.
- This means melee attackers take passive damage every turn.

**Fireball (3-turn cooldown):**
- The Ifrit hurls a fireball at a target tile within 6 tiles.
- The fireball explodes in a 2-tile radius, dealing 30-50 fire damage to all units in the area.
- Fire damage ignores armor.
- Hit targets have a 40% chance to catch fire: **Burning** deals 10 damage/turn for 2 turns.

**Teleport:**
- Ifrits can teleport to any tile within 5 tiles as a movement action.
- Teleport does not trigger free attacks.
- They teleport to optimal Fireball positions and away from melee clusters.

**Ifrit -- Detailed Behavior:**
- Ifrits are aggressive. They teleport into range, fireball a cluster of brothers, then engage in melee.
- They teleport away if surrounded by 3+ enemies.
- They prioritize Fireball on clusters of 3+ brothers.
- Their melee attacks deal fire damage, which ignores armor.
- Counter: spread formation to avoid Fireball. Ranged focus fire (they have 0 armor). Engage one-on-one in melee (Fire Aura only hits adjacent).
- Appear in desert biomes and fire-themed locations, in groups of 2-4.
- Appear starting Day 40 in desert regions.

---

## 6. AI Behavior System

The AI system governs all enemy decision-making. It operates on a per-unit, per-turn basis with faction-level overrides.

### 6.1 Decision Priority Stack

Every enemy unit evaluates actions in the following priority order each turn:

1. **Survival Check**: If HP is below flee threshold and unit can flee, attempt to flee (does not apply to undead, Chosen, or beasts).
2. **Special Ability Check**: If a high-priority ability is available (Charm, Raise Dead, Rally, etc.), use it.
3. **Target Selection**: Choose the optimal target based on targeting algorithm.
4. **Action Selection**: Choose the best action for the selected target (attack, ability, move toward).
5. **Positioning**: If no action can reach a target, move to the optimal position.

### 6.2 Target Selection Algorithm

The AI evaluates all visible enemy units and assigns a **Priority Score** to each. The highest score becomes the target.

**Priority Score Calculation:**

```
PriorityScore = VulnerabilityScore + ThreatScore + ProximityScore + RoleScore + FactionModifier
```

| Factor | Calculation | Weight |
|---|---|---|
| **VulnerabilityScore** | `(1 - currentHP/maxHP) * 40` | 0-40 points. Low HP targets are prioritized. |
| **ThreatScore** | `(targetMAtk / 100) * 25` OR `(targetRAtk / 100) * 25` | 0-25 points. Dangerous enemies are prioritized. |
| **ProximityScore** | `(1 - distance/maxRange) * 20` | 0-20 points. Closer targets are preferred. |
| **RoleScore** | Banner: +15, Healer: +12, Archer: +10, Other: 0 | 0-15 points. Key roles are prioritized. |
| **FactionModifier** | Varies by faction (see below) | -10 to +10 points. |

**Faction-Specific Modifiers:**
- **Brigands**: +5 to targets that are alone (isolated). They mob isolated targets.
- **Noble Troops**: +5 to the target currently engaged with their front line (they focus fire within formation).
- **Goblins**: +10 to targets without shields (easier to hit with ranged). -10 to heavily armored targets (they avoid tanks).
- **Orcs**: +10 to the target with the best armor (they seek the strongest foe for glory).
- **Undead (Wiederganger)**: no modifier (they attack nearest).
- **Ancient Dead**: +5 to targets engaged with Legionnaires (combined fire).
- **Vampires**: +15 to back-line units (archers, banner, lightly armored).
- **Beasts**: varies (wolves target isolated, Hexen target highest MAtk).

### 6.3 Focus Fire Logic

The AI uses focus fire to maximize kill efficiency:

1. Before selecting a new target, the AI checks if any visible target is below 30% HP.
2. If yes, all units that can reach that target prioritize it (to secure the kill).
3. If multiple targets are below 30%, the one closest to death is prioritized.
4. Focus fire breaks if the target moves out of range or is fully healed.

### 6.4 Flanking System

The AI actively seeks flanking positions:

**Flanking Bonus:**
- Attacking a target from the side: +5% hit chance.
- Attacking a target from the rear: +10% hit chance.
- For each ally also adjacent to the target: +5% hit chance (surround bonus).

**Flanking AI:**
- Before moving to attack, a unit checks if a flanking tile is reachable within its movement range.
- If a flanking tile (side or rear relative to the target's facing) is available and reachable, the unit moves there instead of approaching head-on.
- Units with Footwork or high mobility (Wolfriders, Direwolves) prioritize flanking more aggressively.
- Units in formation (Noble Troops, Ancient Dead) do NOT break formation to flank. They hold the line.

### 6.5 Faction-Specific AI Behaviors

#### Brigand AI
- **Cluster Behavior**: Brigands clump together. They do not spread out.
- **Mob Mentality**: If 3+ brigands can reach the same target, they all attack that target.
- **Leader Dependency**: While the Leader is alive, brigands fight normally. When the Leader dies, any brigand below 60% HP attempts to flee.
- **Marksman Positioning**: Marksmen position 3-4 tiles behind the melee line and fire at exposed targets.
- **Retreat Threshold**: Individual brigands flee when below 25% HP.

#### Noble Troop AI
- **Formation Holding**: Noble troops maintain a formation. Footmen in front, Billmen behind them, Arbalesters on the flanks, Sergeant in the center.
- **Rotation**: Wounded Footmen (below 40% HP) swap with a healthy unit behind them. This costs 4 AP for each unit involved.
- **Combined Arms**: Billmen use Hook to pull dangerous targets into the front line where Footmen can engage. Arbalesters fire at the most armored targets.
- **Hold Command**: The Sergeant uses "Hold!" to boost MDef when the formation is under pressure.
- **Controlled Pursuit**: Noble troops only pursue fleeing enemies if 75% of the enemy force is routing.

#### Goblin AI
- **Kiting**: Goblin ranged units always move away from approaching melee enemies before firing.
- **Net Priority**: Ambushers throw nets at the fastest or most dangerous melee brother approaching them.
- **Wolfrider Harassment**: Wolfriders circle the battlefield, attacking the flanks and rear. They never engage the front line head-on.
- **Poison Stacking**: Multiple goblins target the same brother to stack Poison applications (15+ damage/turn from multiple poisons).
- **Retreat and Regroup**: If 50% of goblins are killed, survivors attempt to disengage and regroup at the farthest point from the player.

#### Orc AI
- **Charge**: Orcs move toward the nearest enemy every turn. No exceptions. They do not kite, maneuver, or retreat.
- **Rage Priority**: When an Orc enters Rage, it targets the enemy that wounded it (revenge).
- **Warlord Positioning**: The Warlord charges into the thickest fighting, using Rally on surrounding allies.
- **Young as Screen**: Young Orcs are pushed to the front. Warriors move behind them on Turn 1, then the Warriors crash through once the Young have absorbed the initial attacks.
- **No Retreat**: Orcs do not flee until they drop below 15% HP AND fail a Resolve check. Warlords and Berserkers never flee.

#### Undead AI (Wiederganger)
- **Mindless Advance**: Wiederganger move toward the nearest living unit every turn. Zero tactical consideration.
- **Swarm**: They surround single targets. If 3+ Wiederganger are adjacent, the target suffers -15 MDef.
- **No Morale**: They never flee, never break, never hesitate.
- **Necromancer Protection**: If a Necromancer is present, 2-4 Wiederganger stay within 2 tiles of the Necromancer as bodyguards.

#### Ancient Dead AI
- **Formation**: Legionnaires form a shield wall. They advance slowly (1 tile/turn) in formation.
- **Combined Arms**: Honor Guard attack from behind the Legionnaire line with Reach 2 weapons.
- **Priest Protection**: The formation positions to keep the Priest in the center rear.
- **Reformation**: If the formation is broken (gaps created by kills), surviving Legionnaires attempt to close ranks over 1-2 turns.
- **No Retreat**: Ancient Dead never flee. They fight in formation until destroyed.

#### Beast AI
- **Direwolves**: Pack tactics. Select one target, all wolves converge and surround. Switch to next target when the first is killed.
- **Webknechts**: Web the most dangerous target, then swarm. Prioritize webbing over biting.
- **Unholds**: Advance slowly, throw the most dangerous adjacent brother, slam everything else.
- **Lindwurms**: Charge, bite twice, use Tail Swipe when surrounded.
- **Schrats**: Advance slowly, Root anyone trying to kite, slam whatever is adjacent.
- **Hexen**: Charm first, Hex second, flee if approached. Bodyguards attack whoever is closest to the Hexe.
- **Kraken**: Tentacles grab nearest targets, body is passive until exposed.
- **Ifrits**: Teleport to optimal Fireball position, Fireball clusters, engage isolated targets in melee.

### 6.6 Morale System for Enemies

Enemies have the same morale states as the player's brothers:

| Morale State | Effect |
|---|---|
| **Confident** | +10% to MAtk, RAtk, MDef, Resolve |
| **Steady** | No modifier (default state) |
| **Wavering** | -10% to MAtk, RAtk, MDef, Resolve |
| **Breaking** | -20% to all stats. Unit will attempt to flee on next turn if it fails another Resolve check |
| **Fleeing** | Unit runs toward the nearest map edge at maximum speed. It does not attack. If it reaches the edge, it escapes. |

**Morale Triggers:**
- Ally killed within 3 tiles: Resolve check at -5
- Ally killed adjacent: Resolve check at -10
- Leader killed: ALL allies make Resolve check at -15
- Unit HP drops below 50%: Resolve check
- Unit HP drops below 25%: Resolve check at -10
- Surrounded by 3+ enemies: Resolve check at -5
- Ally fleeing within 3 tiles: Resolve check at -5 (chain routing)

**Chain Routing:**
- When a unit begins Fleeing, all allies within 3 tiles must make a Resolve check at -5.
- If they fail and also begin Fleeing, the chain continues.
- This can cause entire groups to collapse if a critical mass of units start fleeing.
- Leaders with Rally break the chain (Rally removes Wavering and Breaking in their radius).

**Morale Immunity:**
- All Undead are immune to morale.
- Barbarian Chosen are immune to morale.
- Orc Berserkers and Warlords are immune to morale.
- Beasts have simplified morale (no chain routing, but they can individually flee at very low HP).

---

## 7. Enemy Camps and Lairs

Enemy camps appear on the world map as points of interest. They contain a fixed composition of enemies and may have loot rewards.

### 7.1 Camp Types

| Camp Type | Factions | Terrain | Loot Quality | Respawn |
|---|---|---|---|---|
| **Brigand Hideout** | Brigands | Forest, Hills | Low-Medium weapons/armor | 5-8 days |
| **Noble Patrol** | Noble Troops | Roads, Plains | Medium-High weapons/armor | 3-5 days |
| **Barbarian Camp** | Barbarians | Tundra, Mountains | Medium-High weapons | 6-10 days |
| **Nomad Encampment** | Nomads | Desert, Steppe | Medium weapons, trade goods | 5-8 days |
| **Graveyard** | Wiederganger, Geists | Any | Low weapons, ancient coins | 7-12 days |
| **Ancient Ruins** | Ancient Dead, Priests | Ruins, Desert | High ancient weapons/armor | 10-15 days |
| **Necromancer's Crypt** | Necromancer + Wiederganger | Swamp, Ruins | Medium + magical items | Does not respawn |
| **Goblin Tunnels** | Goblins | Forest, Hills | Low-Medium, poison weapons | 5-8 days |
| **Orc Stronghold** | Orcs | Mountains, Wasteland | High orc weapons/armor | 8-12 days |
| **Greenskin Warcamp** | Orcs + Goblins | Any hostile | High mixed | Does not respawn |
| **Wolf Den** | Direwolves | Forest, Tundra | Pelts, wolf capes | 4-6 days |
| **Spider Nest** | Webknechts | Forest, Caves | Silk, poison glands | 5-7 days |
| **Troll Cave** | Unholds | Mountains, Caves | High random | 8-12 days |
| **Lindwurm Lair** | Lindwurms | Mountains, Caves | Very High (Lindwurm bones) | Does not respawn |
| **Witch's Hut** | Hexen + beasts | Swamp, Forest | Hex items, scrolls | Does not respawn |
| **Kraken Cove** | Kraken | Coast, Caves | Legendary | Does not respawn |

### 7.2 Composition Scaling

Camp compositions scale based on:
1. **Day Count**: Higher day = more and stronger enemies.
2. **Player Company Strength**: Assessed by average brother level, equipment quality, and company size.
3. **Camp Tier**: Each camp has a fixed tier (1-3) determining base difficulty.

**Company Strength Assessment:**

```
CompanyStrength = (AverageBrotherLevel * 10)
                + (AverageArmorValue / 10)
                + (CompanySize * 5)
                + (AverageWeaponDamage / 5)
```

The CompanyStrength value is compared against the camp's threat level to determine composition:

| CompanyStrength Range | Camp Scaling |
|---|---|
| 0-80 | Minimum composition (fewest enemies, weakest variants) |
| 81-150 | Standard composition |
| 151-250 | Enhanced composition (more enemies, stronger variants) |
| 251+ | Maximum composition (full roster, elite variants possible) |

### 7.3 Named Champions

Every camp has a chance to contain a **Named Champion** -- a unique, elite version of a standard enemy with boosted stats, a unique name, and a guaranteed famed/named item drop.

**Named Champion Rules:**
- Base 10% chance per camp, increasing by 2% per day after Day 30. Capped at 40%.
- Champions have +20% to all base stats compared to their unit type.
- Champions have a unique name generated from a name table (e.g., "Rotgut the Crusher", "Sir Aldric the Unyielding", "Grashnak Skullsplitter").
- Champions always drop a **Famed Item**: a weapon or piece of armor with 1-2 bonus properties (e.g., +10% damage, +5 MDef, +15 durability).
- Champions have 1 additional perk from a curated list:
  - **Iron Will**: immune to morale drops.
  - **Fortified Mind**: immune to Charm and Fear.
  - **Thick Skin**: take 15% less damage from all sources.
  - **Swift**: +20 Initiative.
  - **Relentless**: attacks cost 10% less Fatigue.

**Named Champion Stat Boost Table:**

| Base Unit | Champion HP | Champion MAtk | Champion MDef | Champion Armor |
|---|---|---|---|---|
| Brigand Raider | 66-84 | 66-78 | 18-30 | 96-156 |
| Orc Warrior | 144-192 | 84-102 | 18-30 | 240-360 |
| Barbarian Chosen | 120-156 | 90-108 | 18-30 | 240-336 |
| Ancient Dead Honor Guard | 72-96 | 78-96 | 12-24 | 168-264 |
| Any other unit | Base * 1.2 | Base * 1.2 | Base * 1.2 | Base * 1.2 |

---

## 8. Difficulty Scaling

The game uses a hybrid scaling system combining day-based progression with player strength assessment.

### 8.1 Day-Based Progression Tiers

| Day Range | Tier Name | Description | Enemy Types Available |
|---|---|---|---|
| **1-20** | Early Game | Tutorial phase. Easy encounters only. | Brigand Thugs, Brigand Marksmen, Wiederganger, Direwolves, Webknechts |
| **20-40** | Early-Mid Game | Standard difficulty. Most factions appear. | All Brigands, Militia, Billmen, Young Orcs, Goblins, Ancient Dead (basic), Nomads (basic), Unholds (solo) |
| **40-80** | Mid-Late Game | Hard encounters. Elite units appear. | All human factions (full roster), all undead (full roster), all greenskins (full roster), all beasts except Kraken |
| **80+** | Endgame | Elite encounters. Everything at maximum. | All enemies at maximum composition. Kraken available. Named Champions common. Mixed faction encounters. |

### 8.2 Encounter Generation Algorithm

When the player engages an enemy camp:

```
1. Determine base faction and camp tier (pre-set on world map).
2. Look up DayTier based on current day count.
3. Calculate CompanyStrength.
4. Select composition from faction composition table:
   - Use the highest applicable tier (min of DayTier and camp's skull rating).
   - Scale enemy count: BaseCount * (CompanyStrength / 150), clamped to [MinCount, MaxCount=12].
5. Roll for Named Champion (10% + 2% per day past 30, cap 40%).
6. For each enemy in composition:
   a. Randomize stats within the unit's defined ranges.
   b. Apply +5% to all stats if DayTier >= Mid-Late.
   c. Apply +10% to all stats if DayTier >= Endgame.
   d. Assign equipment from the unit's equipment table.
7. Position enemies on the battle map according to faction formation rules.
```

### 8.3 Skull Rating System

Camps on the world map display a skull rating indicating difficulty relative to the player's current strength.

| Skulls | Meaning | Color | Difficulty Relative to Player |
|---|---|---|---|
| 1 Skull | Easy | Green | Player is significantly stronger than the camp. Expected losses: 0. |
| 2 Skulls | Challenging | Yellow | Roughly even fight. Expected losses: 0-1 brothers. |
| 3 Skulls | Deadly | Red | Camp is stronger than the player. Expected losses: 1-3 brothers. Retreat may be necessary. |
| Skull with X | Legendary | Dark Red | Boss encounter or extreme threat. Full preparation required. Expected losses: 2-4+ brothers. |

**Skull Calculation:**

```
CampThreat = Sum of all enemy unit ThreatValues
PlayerPower = CompanyStrength (from 7.2)

Ratio = CampThreat / PlayerPower

if Ratio < 0.6:  1 Skull
if Ratio 0.6-1.0: 2 Skulls
if Ratio 1.0-1.5: 3 Skulls
if Ratio > 1.5:   Skull with X
```

**Enemy Unit Threat Values:**

| Unit | Threat Value |
|---|---|
| Brigand Thug | 5 |
| Brigand Marksman | 7 |
| Brigand Raider | 12 |
| Brigand Leader | 18 |
| Militia | 6 |
| Billman | 10 |
| Footman | 15 |
| Knight | 25 |
| Sergeant | 16 |
| Arbalester | 14 |
| Thrall | 4 |
| Chosen | 30 |
| Nomad Cutthroat | 8 |
| Nomad Outlander | 12 |
| Nomad Assassin | 14 |
| Nomad Champion | 22 |
| Wiederganger | 5 |
| Fallen Hero | 15 |
| Legionnaire | 10 |
| Honor Guard | 18 |
| Priest | 20 |
| Necromancer | 25 |
| Vampire | 35 |
| Alp | 20 |
| Geist | 15 |
| Direwolf | 10 |
| Webknecht | 8 |
| Unhold | 35 |
| Armored Unhold | 45 |
| Lindwurm | 50 |
| Schrat | 45 |
| Hexe | 40 |
| Kraken | 100 |
| Ifrit | 30 |
| Goblin Ambusher | 8 |
| Goblin Skirmisher | 7 |
| Wolfrider | 15 |
| Overseer | 12 |
| Shaman | 18 |
| Orc Young | 10 |
| Orc Berserker | 25 |
| Orc Warrior | 30 |
| Orc Warlord | 45 |

### 8.4 Late-Game Scaling Safeguards

To prevent the endgame from becoming trivially easy or impossibly hard:

- **Minimum Threat Floor**: After Day 80, no camp spawns with fewer than 8 enemies or a CampThreat below 120.
- **Maximum Enemy Count**: No battle ever has more than 12 enemy units (mobile performance constraint).
- **Quality over Quantity**: When the cap of 12 is reached, the system upgrades existing units to stronger variants rather than adding more (e.g., replace Thugs with Raiders, replace Young with Warriors).
- **Famed Item Pity Timer**: If the player has not received a famed item in 5 consecutive 3-skull encounters, the next 3-skull encounter guarantees a Named Champion with a famed drop.
- **Dynamic Cooldown**: After the player loses 3+ brothers in a single battle, the next 2 generated encounters are reduced by 1 skull tier (mercy mechanic to prevent death spirals).

---

## 9. Implementation Notes

### 9.1 Data Architecture

Each enemy unit type is defined as a JSON template:

```json
{
  "id": "brigand_raider",
  "faction": "brigands",
  "displayName": "Brigand Raider",
  "tier": 2,
  "stats": {
    "hp": { "min": 55, "max": 70 },
    "fatigue": { "min": 90, "max": 110 },
    "resolve": { "min": 35, "max": 50 },
    "initiative": { "min": 85, "max": 105 },
    "mAtk": { "min": 55, "max": 65 },
    "mDef": { "min": 15, "max": 25 },
    "rAtk": { "min": 30, "max": 40 },
    "rDef": { "min": 10, "max": 15 }
  },
  "armor": {
    "body": { "min": 80, "max": 130 },
    "head": { "min": 50, "max": 90 }
  },
  "weaponPool": ["sword_t2", "axe_t2", "mace_t2", "flail_t2"],
  "shieldPool": ["kite_shield", "round_shield", null],
  "perks": [],
  "traits": [],
  "aiBehavior": "brigand_melee",
  "threatValue": 12,
  "lootTable": "brigand_raider_loot",
  "spriteSheet": "brigand_raider",
  "sounds": {
    "attack": "human_attack_01",
    "hurt": "human_hurt_01",
    "death": "human_death_01"
  }
}
```

### 9.2 AI State Machine

Each enemy unit runs a simple finite state machine:

```
States: IDLE, ADVANCING, ENGAGING, USING_ABILITY, FLEEING, DEAD

Transitions:
  IDLE -> ADVANCING: battle starts
  ADVANCING -> ENGAGING: target is within attack range
  ADVANCING -> USING_ABILITY: special ability conditions met
  ENGAGING -> USING_ABILITY: ability off cooldown and beneficial
  ENGAGING -> FLEEING: morale broken
  ENGAGING -> DEAD: HP <= 0
  FLEEING -> DEAD: killed while fleeing
  USING_ABILITY -> ADVANCING: ability used, no target in range
  USING_ABILITY -> ENGAGING: ability used, target still in range
  Any -> DEAD: HP <= 0
```

### 9.3 Performance Considerations for Mobile

- **Maximum 12 enemies per battle**: Hard limit. No exceptions.
- **AI turn calculation budget**: 200ms maximum per enemy unit. Total AI turn must complete in under 2.5 seconds.
- **Pathfinding**: A* with a maximum of 50 nodes evaluated per unit per turn. Cache paths between turns.
- **Targeting**: Pre-compute Priority Scores for all visible targets at start of AI turn, cache results.
- **Animations**: Enemy actions queue and play sequentially. Each action animation is capped at 1.5 seconds. Fast-forward button skips to results.
- **Memory**: Enemy templates loaded on demand. Only the current battle's enemy data is in memory. Sprite sheets use texture atlases (1024x1024 max per faction).

### 9.4 Spawn and Placement Rules

When a battle begins, enemies are placed on the battle map according to faction-specific formation templates:

| Faction | Formation Type | Description |
|---|---|---|
| Brigands | Cluster | All units grouped loosely in the center of their deployment zone. Marksmen slightly behind. |
| Noble Troops | Line | Footmen in front row, Billmen directly behind, Arbalesters on flanks, Sergeant center-rear. |
| Barbarians | Wave | Thralls in front row, Chosen in second row, 2 tiles behind. |
| Nomads | Spread | Cutthroats and Outlanders in front, Slingers and Assassins spread across back, Champion center. |
| Wiederganger | Swarm | Random placement across deployment zone. Necromancer and Geists in far back. |
| Ancient Dead | Phalanx | Tight Legionnaire shield wall, Honor Guard directly behind, Auxiliaries on flanks, Priest center-rear. |
| Goblins | Dispersed | Ambushers spread wide, Skirmishers in loose groups, Wolfriders on flanks, Shaman far back. |
| Orcs | Column | Young in front row, Warriors in second row, Berserkers on flanks, Warlord center. |
| Beasts | Varies | Wolves encircle; Spiders cluster near webs; Unholds stand alone; Lindwurms face forward. |

---

*End of Enemies and AI Design Document*
