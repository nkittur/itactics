# Character System Design Document

## Overview

This document defines the complete character system for a mobile browser tactical RPG (Babylon.js, portrait mode) inspired by Battle Brothers. Every mercenary in the player's company is defined by their **background**, **primary stats**, **talent stars**, **traits**, and **perks**. There are no traditional "classes" -- a character's role emerges from the combination of their background's starting stats, the player's stat investment choices at each level-up, and the perks selected along the way.

---

## 1. Primary Stats

Every character has exactly **8 primary stats**. These govern all combat calculations. Each stat has a base range determined by background and grows through level-ups.

### Stat Definitions

| Stat | Abbreviation | Base Range | Level-Up Roll | Role |
|------|-------------|------------|---------------|------|
| Hitpoints | HP | 40 -- 80 | +2 to +7 | Total damage a character can absorb before dying |
| Fatigue | FAT | 85 -- 130 | +2 to +7 | Maximum fatigue pool; actions cost fatigue, armor adds fatigue penalty |
| Resolve | RES | 20 -- 60 | +1 to +6 | Resistance to morale checks, rally effectiveness, fear immunity threshold |
| Initiative | INI | 80 -- 135 | +2 to +7 | Determines turn order; current initiative = base minus fatigue spent minus armor penalty |
| Melee Attack | MATT | 35 -- 80 | +1 to +6 | Hit chance for melee weapons; attacker MATT minus defender MDEF = base hit % |
| Melee Defense | MDEF | 0 -- 30 | +1 to +6 | Reduces enemy melee hit chance; most valuable defensive stat for frontliners |
| Ranged Attack | RATT | 25 -- 65 | +1 to +6 | Hit chance for ranged weapons; modified by distance and height |
| Ranged Defense | RDEF | 0 -- 15 | +1 to +6 | Reduces enemy ranged hit chance; less impactful than MDEF due to lower values |

### Detailed Stat Mechanics

#### Hitpoints (HP)

- **Base Range**: 40 -- 80 (determined by background)
- **Level-Up Roll**: +2 to +7 per level (modified by talent stars)
- **Mechanics**:
  - When HP reaches 0, the character dies. There is no "downed" state.
  - Damage is first applied to armor (head or body depending on hit location), then any overflow goes to HP.
  - Some attacks (e.g., maces, flails) have a percentage of damage that bypasses armor and goes directly to HP.
  - Injuries are triggered when a character takes HP damage exceeding 15% of their max HP in a single hit.
  - The Nine Lives perk triggers at 0 HP, restoring the character to 1 HP once per battle.
  - High HP characters (70+) are ideal candidates for the Colossus perk (+25% max HP) and heavy armor builds.
  - Low HP characters should consider Nimble (damage reduction based on low fatigue penalty) as an alternative survival strategy.

#### Fatigue (FAT)

- **Base Range**: 85 -- 130 (determined by background)
- **Level-Up Roll**: +2 to +7 per level (modified by talent stars)
- **Mechanics**:
  - Every action in combat costs fatigue. Swinging a two-handed sword costs ~25 fatigue; moving one tile costs ~4 fatigue.
  - Armor imposes a **fatigue penalty** that reduces your maximum usable fatigue. A character with 120 FAT wearing armor with a 30 fatigue penalty has 90 usable fatigue.
  - At the end of each turn, characters recover **15 fatigue** (modified by perks and traits).
  - If a character's current fatigue equals their maximum usable fatigue, they cannot perform actions that cost fatigue. They can still wait or end turn.
  - Current Initiative is reduced by current fatigue. High-fatigue characters who spend it recklessly drop in turn order.
  - The Recover action spends a full turn to remove half of your current fatigue.
  - Berserk (perk) refunds 4 fatigue on kill, and Killing Frenzy gives a damage bonus after kills, so high-FAT characters can chain kills.
  - Iron Lungs (trait) grants +4 fatigue recovery per turn, extremely valuable.

#### Resolve (RES)

- **Base Range**: 20 -- 60 (determined by background)
- **Level-Up Roll**: +1 to +6 per level (modified by talent stars)
- **Mechanics**:
  - Morale checks occur when: an ally dies nearby, the character takes a severe injury, the company is outnumbered, or certain enemy abilities trigger fear.
  - Morale has 5 states: **Confident** (+10% hit chance), **Steady** (no modifier), **Wavering** (-10% hit chance, -10% damage), **Breaking** (-20% hit chance, -20% damage), **Fleeing** (character runs uncontrollably, drops shield).
  - Each morale check compares a d100 roll against a threshold derived from the character's Resolve. Higher Resolve = less likely to fail.
  - The Rally skill (from the Rally the Troops perk) uses the sergeant's Resolve to restore morale to nearby allies. A sergeant with 60+ Resolve is essential.
  - Undead enemies often have fear auras that force Resolve checks each turn within range.
  - Geists (undead screamers) target the lowest-Resolve character with a scream that forces an immediate morale check at a penalty.
  - The Fearsome perk adds a morale check whenever HP damage is dealt, using the attacker's Resolve vs. the target's.
  - The Brave trait gives +10 RES; the Dastard trait gives -10 RES. These are assigned at character creation and cannot be changed.

#### Initiative (INI)

- **Base Range**: 80 -- 135 (determined by background)
- **Level-Up Roll**: +2 to +7 per level (modified by talent stars)
- **Mechanics**:
  - Turn order each round is determined by **current initiative**: base INI minus current fatigue minus armor fatigue penalty.
  - A character with 130 INI, 20 current fatigue, and 15 armor penalty has 95 current initiative.
  - Going first allows positioning advantages, focus-firing before enemies can act, and applying debuffs preemptively.
  - The **Dodge** perk converts 15% of current initiative into bonus MDEF and RDEF. This makes INI the primary defensive stat for nimble/dodge builds.
  - The **Relentless** perk prevents initiative from being reduced by fatigue, maintaining turn order even after expensive actions.
  - Initiative-based builds (Fencers, Dodge tanks) want light armor (low fatigue penalty) and high base INI.
  - Heavy armor builds largely ignore INI since their armor penalty + fatigue expenditure will tank their current initiative regardless.
  - Adrenaline Rush (perk) guarantees acting first next turn regardless of initiative.

#### Melee Attack (MATT)

- **Base Range**: 35 -- 80 (determined by background)
- **Level-Up Roll**: +1 to +6 per level (modified by talent stars)
- **Mechanics**:
  - Hit chance = attacker's MATT minus defender's MDEF, clamped to 5% -- 95%.
  - A character with 90 MATT attacking a defender with 30 MDEF has a 60% base hit chance.
  - Hit chance is further modified by: weapon skills (some weapons have innate accuracy bonuses), height advantage (+10%), flanking (+5% per adjacent ally beyond the first next to the target), and morale.
  - Two-handed weapons often have +10% to +15% hit chance on their base skill to compensate for no shield.
  - Duelist (perk) adds +25% damage to armor penetration but does not affect hit chance.
  - The Swordmaster background starts with 70-80 MATT, making them the most accurate melee fighters at hire.
  - MATT is the most universally important stat for melee characters. Even tanks benefit from higher MATT since threatening enemies forces them to respect your zone of control.

#### Melee Defense (MDEF)

- **Base Range**: 0 -- 30 (determined by background)
- **Level-Up Roll**: +1 to +6 per level (modified by talent stars)
- **Mechanics**:
  - Directly subtracted from attacker's MATT to determine hit chance. The single most impactful defensive stat.
  - Shields add flat bonus MDEF: buckler (+10), round shield (+15), kite shield (+20), heater shield (+25).
  - The Shieldwall skill doubles the shield's MDEF bonus but costs a turn action.
  - Surrounded penalty: for each enemy adjacent beyond the first, the defender loses **5 MDEF**. A character surrounded by 4 enemies loses 15 MDEF.
  - This makes positioning critical -- never let your backline get surrounded.
  - The Underdog perk removes the surrounded penalty entirely.
  - MDEF has increasing returns: going from 30 to 40 MDEF reduces incoming hits by a larger effective percentage than going from 0 to 10, because it compounds with the attacker's miss chance.
  - Top-tier frontliners aim for 40+ MDEF (combination of base stat, level-ups, and shield).
  - Nimble dodge builds can reach effective 50+ MDEF through the Dodge perk converting initiative to defense.

#### Ranged Attack (RATT)

- **Base Range**: 25 -- 65 (determined by background)
- **Level-Up Roll**: +1 to +6 per level (modified by talent stars)
- **Mechanics**:
  - Hit chance = attacker's RATT minus defender's RDEF, modified by distance and obstacles.
  - Distance penalty: -2% per tile of distance beyond the weapon's optimal range (usually 3 tiles for bows).
  - Height advantage: +10% hit chance if firing from elevated ground; -10% if firing uphill.
  - Cover: targets behind obstacles or allies receive -25% ranged hit chance (the shot may hit the obstacle/ally instead -- friendly fire is possible with bows and crossbows).
  - Crossbows have higher base damage but lower rate of fire (reload takes a turn). Bows fire every turn but deal less per hit.
  - Throwing weapons (javelins, axes) have short range (3--4 tiles) but very high damage and no distance penalty within range.
  - The Bullseye perk halves the distance penalty and removes the friendly-fire chance.
  - Hunters and Bowyers start with the highest RATT (50--65).
  - A dedicated archer wants 85+ RATT after level-ups to reliably hit targets at range.

#### Ranged Defense (RDEF)

- **Base Range**: 0 -- 15 (determined by background)
- **Level-Up Roll**: +1 to +6 per level (modified by talent stars)
- **Mechanics**:
  - Subtracted from attacker's RATT to determine ranged hit chance.
  - Has a much lower base range than MDEF, making it harder to stack.
  - Shields add RDEF: buckler (+5), round shield (+10), kite shield (+15), heater shield (+15).
  - The Anticipation perk adds bonus RDEF equal to half the difference between your base RDEF and the attacker's RATT, making it effective against high-RATT enemies.
  - Nimble characters in light armor are more vulnerable to ranged fire, so some RDEF investment or the Anticipation perk is recommended.
  - Most characters invest minimally in RDEF (it is the least-selected stat at level-up) unless building a pure tank.
  - The Dodge perk also adds 15% of current initiative to RDEF, making it doubly valuable for dodge builds.

---

## 2. Level-Up System

### Progression Overview

| Level | Experience Required | Cumulative XP | Reward |
|-------|-------------------|---------------|--------|
| 1 | 0 (starting) | 0 | Starting stats from background |
| 2 | 200 | 200 | Choose 3 stats + 1 perk point |
| 3 | 400 | 600 | Choose 3 stats + 1 perk point |
| 4 | 600 | 1,200 | Choose 3 stats + 1 perk point |
| 5 | 800 | 2,000 | Choose 3 stats + 1 perk point |
| 6 | 1,100 | 3,100 | Choose 3 stats + 1 perk point |
| 7 | 1,400 | 4,500 | Choose 3 stats + 1 perk point |
| 8 | 1,800 | 6,300 | Choose 3 stats + 1 perk point |
| 9 | 2,300 | 8,600 | Choose 3 stats + 1 perk point |
| 10 | 2,900 | 11,500 | Choose 3 stats + 1 perk point |
| 11 | 3,600 | 15,100 | Choose 3 stats + 1 perk point |

### Level-Up Mechanics

1. **Stat Selection**: At each level-up, the player chooses **exactly 3 of the 8 stats** to increase. Each chosen stat receives a random roll within its range (modified by talent stars -- see Section 3).
2. **Perk Selection**: At each level-up, the player receives **1 perk point** to spend on the perk tree. Perks are gated by tier (see Section 5). You must have enough perks in lower tiers to unlock higher tiers.
3. **Non-selected stats**: The 5 stats NOT chosen at a given level-up receive NO increase. This forces meaningful decisions and differentiation.
4. **Total gains over 10 level-ups**: A stat chosen every single level-up (10 times) with average 0-star rolls (+2 average) gains ~20 points. With 3 stars and every level-up, it gains ~50 points. Realistically, most stats are chosen 3--5 times.

### Veteran Levels (Post-11)

- After reaching level 11, characters can continue earning XP for **veteran levels**.
- Veteran levels require **4,500 XP** each (flat, does not increase).
- Veteran levels grant **1 perk point only** -- no stat increases.
- There is no cap on veteran levels, but the XP cost makes them slow to acquire.
- Veteran levels are represented visually with a chevron icon and a roman numeral (I, II, III, etc.).

### The Student Perk Interaction

- The **Student** perk (Tier 1) grants +20% XP from all sources.
- When a character with Student reaches level 11, the Student perk is **automatically refunded** -- the perk point is returned and Student is removed.
- This effectively makes Student a "free" perk if taken at level 1 or 2, since you get the XP boost for most of your leveling and then get the point back.
- Any leftover XP that would have been lost at level 11 is preserved and applied toward the first veteran level.
- Student is nearly universally recommended as a first perk pick for all builds.

### UI/UX for Level-Up (Mobile)

- On level-up, a full-screen modal appears with the 8 stats displayed in a 2-column layout.
- Each stat shows: current value, the roll range (accounting for talent stars), and talent star icons.
- The player taps 3 stats to select them. Selected stats highlight and show the actual rolled value.
- Below the stat panel, the perk tree is accessible via a "Choose Perk" button.
- A "Confirm" button finalizes the level-up. There is no undo after confirmation.

---

## 3. Talent Stars

### Overview

Talent stars represent a character's natural aptitude in specific stats. They are assigned **at character creation** (when hired) and **never change**. Stars increase the range of level-up rolls for that stat.

### Star Distribution

- Each character receives approximately **7 total star points** distributed randomly across their 8 stats.
- A stat can have **0, 1, 2, or 3 stars**.
- The distribution is weighted by background (e.g., Hunters are more likely to get stars in RATT and INI; Hedge Knights are more likely to get stars in MATT and HP).
- It is possible (but rare) for a character to have 0 stars in all useful stats or to have a perfect distribution with 3 stars in a key stat.

### Roll Ranges by Star Count

| Stars | Roll Range (Standard Stats) | Roll Range (HP & Fatigue) | Average Roll |
|-------|----------------------------|--------------------------|--------------|
| 0 | +1 to +3 | +2 to +4 | +2 / +3 |
| 1 | +2 to +4 | +3 to +5 | +3 / +4 |
| 2 | +3 to +5 | +4 to +6 | +4 / +5 |
| 3 | +4 to +6 | +5 to +7 | +5 / +6 |

**HP and Fatigue receive +1 to all roll values** because their base ranges are larger and the stat budget expects higher absolute gains. A 3-star HP character can gain +5 to +7 HP per level, while a 3-star MDEF character gains +4 to +6.

### Star Weighting by Background

Each background has a **star weight table** that biases the random distribution. The weight determines how likely each stat is to receive star points during generation. Weights are relative values (higher = more likely).

Example star weights for select backgrounds:

| Background | HP | FAT | RES | INI | MATT | MDEF | RATT | RDEF |
|-----------|-----|-----|-----|-----|------|------|------|------|
| Farmhand | 3 | 3 | 1 | 1 | 2 | 1 | 1 | 1 |
| Hunter | 1 | 2 | 1 | 3 | 1 | 1 | 3 | 2 |
| Hedge Knight | 3 | 2 | 2 | 1 | 3 | 2 | 1 | 1 |
| Swordmaster | 1 | 1 | 2 | 3 | 3 | 3 | 1 | 1 |
| Thief | 1 | 2 | 1 | 3 | 2 | 2 | 2 | 2 |

### Star Generation Algorithm

```
function generateTalentStars(background):
    stars = [0, 0, 0, 0, 0, 0, 0, 0]  // 8 stats
    weights = background.starWeights    // 8 values
    totalPoints = 7  // may vary by +-1 randomly

    for i in range(totalPoints):
        // Weighted random selection
        stat = weightedRandom(weights)
        if stars[stat] < 3:
            stars[stat] += 1
        else:
            // Re-roll if stat already at max
            retry with remaining eligible stats

    return stars
```

### Visual Representation

- Stars are displayed as small yellow star icons next to each stat in the character sheet and level-up screen.
- 0 stars: no icons (stat name appears in gray)
- 1 star: one filled star icon
- 2 stars: two filled star icons
- 3 stars: three filled star icons (stat name appears in gold)

---

## 4. Backgrounds

Backgrounds determine a character's starting stats, hiring cost, daily wage, potential traits, and star weights. They are the single most important factor in a character's potential.

### Background Summary Table

| Background | Hire Cost | Daily Wage | HP | FAT | RES | INI | MATT | MDEF | RATT | RDEF | Tier |
|-----------|-----------|-----------|-----|-----|-----|------|------|------|------|------|------|
| Farmhand | 50--150 | 4--6 | 50--65 | 95--115 | 25--40 | 85--105 | 40--55 | 0--8 | 25--40 | 0--5 | Low |
| Militia | 80--200 | 6--8 | 45--60 | 90--110 | 30--45 | 85--105 | 45--60 | 2--10 | 30--45 | 0--5 | Low |
| Lumberjack | 100--250 | 7--9 | 55--70 | 100--120 | 25--40 | 80--100 | 45--60 | 0--8 | 25--35 | 0--5 | Low |
| Hunter | 150--350 | 8--11 | 40--55 | 90--110 | 30--40 | 95--120 | 40--50 | 0--5 | 50--65 | 2--10 | Mid |
| Bowyer | 120--300 | 7--10 | 40--55 | 90--105 | 30--40 | 90--115 | 38--50 | 0--5 | 48--62 | 2--8 | Mid |
| Thief | 60--180 | 5--8 | 40--52 | 95--115 | 20--35 | 100--130 | 42--58 | 2--12 | 35--50 | 2--8 | Mid |
| Assassin | 200--450 | 10--14 | 42--55 | 95--115 | 25--40 | 100--135 | 55--70 | 5--15 | 35--50 | 2--8 | High |
| Monk | 80--200 | 5--8 | 42--55 | 85--100 | 40--60 | 80--100 | 35--48 | 0--5 | 25--38 | 0--5 | Mid |
| Flagellant | 30--100 | 3--5 | 55--75 | 95--115 | 40--60 | 85--105 | 38--52 | 0--5 | 25--35 | 0--3 | Mid |
| Wildman | 50--150 | 5--8 | 60--80 | 100--130 | 20--30 | 90--115 | 45--60 | 0--5 | 25--35 | 0--3 | Mid |
| Raider | 150--350 | 9--12 | 50--65 | 95--115 | 30--45 | 90--115 | 50--65 | 5--15 | 35--50 | 2--8 | Mid |
| Bastard | 100--250 | 7--10 | 50--65 | 90--110 | 25--40 | 85--110 | 48--62 | 2--10 | 30--45 | 0--5 | Mid |
| Killer on the Run | 120--300 | 8--11 | 48--62 | 95--115 | 20--35 | 95--120 | 52--68 | 5--15 | 35--48 | 2--8 | Mid |
| Disowned Noble | 200--450 | 12--16 | 45--58 | 85--105 | 35--55 | 85--110 | 50--65 | 2--12 | 35--50 | 2--8 | High |
| Squire | 250--500 | 12--16 | 50--65 | 90--110 | 35--50 | 85--110 | 55--70 | 5--15 | 30--45 | 0--5 | High |
| Hedge Knight | 300--600 | 18--25 | 60--80 | 95--120 | 30--50 | 80--100 | 60--80 | 5--20 | 25--40 | 0--5 | Elite |
| Sellsword | 250--500 | 15--20 | 50--65 | 95--115 | 30--45 | 85--110 | 55--72 | 5--18 | 30--45 | 0--5 | High |
| Adventurous Noble | 350--700 | 20--28 | 45--60 | 85--105 | 40--60 | 90--115 | 55--70 | 5--15 | 35--50 | 2--8 | Elite |
| Swordmaster | 400--800 | 22--30 | 40--52 | 85--100 | 35--55 | 100--130 | 70--80 | 15--30 | 30--45 | 2--8 | Elite |
| Gladiator | 350--650 | 18--25 | 55--72 | 100--125 | 30--48 | 95--120 | 58--75 | 8--20 | 30--42 | 0--5 | Elite |
| Oathtaker | 300--550 | 16--22 | 55--70 | 90--110 | 45--60 | 80--100 | 55--70 | 8--18 | 25--38 | 0--5 | Elite |

### Detailed Background Profiles

#### Farmhand
- **Tier**: Low
- **Hire Cost**: 50 -- 150 crowns
- **Daily Wage**: 4 -- 6 crowns
- **Description**: A simple farmer with strong arms from years of manual labor. Cheap to hire and maintain, Farmhands offer surprisingly solid HP and Fatigue pools. Their combat skills are lacking but can be developed.
- **Stat Ranges**: HP 50--65, FAT 95--115, RES 25--40, INI 85--105, MATT 40--55, MDEF 0--8, RATT 25--40, RDEF 0--5
- **Star Weights**: HP 3, FAT 3, RES 1, INI 1, MATT 2, MDEF 1, RATT 1, RDEF 1
- **Notable Traits**: May come with Iron Lungs, Strong, or Dexterous. Never comes with Fearful (they are too simple to be afraid). May come with Short Sighted.
- **Role Suitability**: Budget frontliner, expendable shield wall member. With good star rolls in MATT and MDEF, can become a legitimate frontliner. Excellent cost-to-value ratio in the early game.

#### Militia
- **Tier**: Low
- **Hire Cost**: 80 -- 200 crowns
- **Daily Wage**: 6 -- 8 crowns
- **Description**: A town guard or local militia member with basic combat training. More well-rounded than a Farmhand, the Militia has decent starting MATT and RES from their service experience. A reliable early-game hire.
- **Stat Ranges**: HP 45--60, FAT 90--110, RES 30--45, INI 85--105, MATT 45--60, MDEF 2--10, RATT 30--45, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 2, INI 1, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Brave. Occasionally comes with Dastard (a cowardly guard). No extreme positive or negative traits.
- **Role Suitability**: Early frontliner, shield wall member, can develop into a decent sword-and-board tank. Balanced enough to fill any role in a pinch.

#### Lumberjack
- **Tier**: Low
- **Hire Cost**: 100 -- 250 crowns
- **Daily Wage**: 7 -- 9 crowns
- **Description**: Years swinging an axe have given the Lumberjack powerful arms and a sturdy frame. Highest HP among the low-tier backgrounds and excellent Fatigue. Naturally suited to axe and two-handed axe builds.
- **Stat Ranges**: HP 55--70, FAT 100--120, RES 25--40, INI 80--100, MATT 45--60, MDEF 0--8, RATT 25--35, RDEF 0--5
- **Star Weights**: HP 3, FAT 3, RES 1, INI 1, MATT 2, MDEF 1, RATT 1, RDEF 1
- **Notable Traits**: Often comes with Strong (+10% melee damage, +10% max fatigue). May come with Iron Lungs.
- **Role Suitability**: Two-handed axe frontliner, heavy armor wearer. The Strong trait + high FAT makes Lumberjacks excellent candidates for Battleforged (heavy armor perk) builds.

#### Hunter
- **Tier**: Mid
- **Hire Cost**: 150 -- 350 crowns
- **Daily Wage**: 8 -- 11 crowns
- **Description**: A skilled tracker and marksman who has lived off the land. The Hunter has the highest starting RATT of any non-elite background and excellent INI. Born archers.
- **Stat Ranges**: HP 40--55, FAT 90--110, RES 30--40, INI 95--120, MATT 40--50, MDEF 0--5, RATT 50--65, RDEF 2--10
- **Star Weights**: HP 1, FAT 2, RES 1, INI 3, MATT 1, MDEF 1, RATT 3, RDEF 2
- **Notable Traits**: Often comes with Eagle Eyes (+1 vision range, +10% ranged hit at distance). May come with Dexterous.
- **Role Suitability**: Primary archer. With Eagle Eyes and star rolls in RATT, Hunters can reach 90+ RATT by level 11, making them devastating with a warbow. Can also serve as a hybrid thrower.

#### Bowyer
- **Tier**: Mid
- **Hire Cost**: 120 -- 300 crowns
- **Daily Wage**: 7 -- 10 crowns
- **Description**: A craftsman who makes bows for a living and practices with them regularly. Slightly less talented than a Hunter in raw RATT but more affordable. Decent alternative when Hunters are unavailable.
- **Stat Ranges**: HP 40--55, FAT 90--105, RES 30--40, INI 90--115, MATT 38--50, MDEF 0--5, RATT 48--62, RDEF 2--8
- **Star Weights**: HP 1, FAT 2, RES 1, INI 2, MATT 1, MDEF 1, RATT 3, RDEF 2
- **Notable Traits**: May come with Eagle Eyes or Dexterous. Occasionally Short Sighted (ironic for a bowyer, but represents age-related decline).
- **Role Suitability**: Archer, crossbowman. A budget Hunter. Best used with crossbows (which benefit less from extreme RATT due to their high base damage) or as a secondary ranged character.

#### Thief
- **Tier**: Mid
- **Hire Cost**: 60 -- 180 crowns
- **Daily Wage**: 5 -- 8 crowns
- **Description**: A pickpocket and burglar with quick hands and quicker feet. Thieves have the highest starting INI of any non-elite background and decent MDEF from years of dodging the law.
- **Stat Ranges**: HP 40--52, FAT 95--115, RES 20--35, INI 100--130, MATT 42--58, MDEF 2--12, RATT 35--50, RDEF 2--8
- **Star Weights**: HP 1, FAT 2, RES 1, INI 3, MATT 2, MDEF 2, RATT 2, RDEF 2
- **Notable Traits**: May come with Dexterous (-10% fatigue cost for weapon skills) or Lucky (+5% chance to avoid lethal hits). Sometimes comes with Dastard or Bleeder.
- **Role Suitability**: Nimble dodge build, fencer, dagger specialist (for puncture attacks that ignore armor). The high INI makes Thieves ideal Dodge perk users. Can also serve as a hybrid ranged/melee.

#### Assassin
- **Tier**: High
- **Hire Cost**: 200 -- 450 crowns
- **Daily Wage**: 10 -- 14 crowns
- **Description**: A professional killer with excellent combat stats across the board. High INI, high MATT, and solid MDEF make the Assassin one of the most versatile backgrounds. Expensive but worth it.
- **Stat Ranges**: HP 42--55, FAT 95--115, RES 25--40, INI 100--135, MATT 55--70, MDEF 5--15, RATT 35--50, RDEF 2--8
- **Star Weights**: HP 1, FAT 2, RES 1, INI 3, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Dexterous, Lucky, or Bloodthirsty (cosmetic). Never comes with Clumsy or Fat.
- **Role Suitability**: Fencer, nimble dodge duelist, two-handed sword user, dagger puncture specialist. One of the best all-around backgrounds for any melee build that values speed.

#### Monk
- **Tier**: Mid
- **Hire Cost**: 80 -- 200 crowns
- **Daily Wage**: 5 -- 8 crowns
- **Description**: A religious brother who has left the monastery. Monks have the highest base Resolve of any non-elite background, making them natural sergeant candidates. Their combat stats are mediocre.
- **Stat Ranges**: HP 42--55, FAT 85--100, RES 40--60, INI 80--100, MATT 35--48, MDEF 0--5, RATT 25--38, RDEF 0--5
- **Star Weights**: HP 1, FAT 1, RES 3, INI 1, MATT 1, MDEF 1, RATT 1, RDEF 1
- **Notable Traits**: Always comes with Brave (+10 RES). May come with Iron Lungs from chanting. Never comes with Dastard.
- **Role Suitability**: Sergeant (Rally the Troops user). With Brave + high base RES, Monks can reach 80+ RES easily, providing powerful rally support. Can also serve as a backline polearm user.

#### Flagellant
- **Tier**: Mid
- **Hire Cost**: 30 -- 100 crowns
- **Daily Wage**: 3 -- 5 crowns
- **Description**: A religious fanatic who whips himself in penance. Flagellants have excellent HP (pain tolerance), high Resolve (fanatical conviction), and are extremely cheap. Their wounds give them some debuffs.
- **Stat Ranges**: HP 55--75, FAT 95--115, RES 40--60, INI 85--105, MATT 38--52, MDEF 0--5, RATT 25--35, RDEF 0--3
- **Star Weights**: HP 3, FAT 2, RES 3, INI 1, MATT 1, MDEF 1, RATT 1, RDEF 1
- **Notable Traits**: Always comes with Brave. May come with Determined (ignore the first morale check failure each battle). Often starts with a permanent injury that slightly reduces a random stat.
- **Role Suitability**: Budget sergeant, frontline meat shield. The combination of high HP, high RES, and rock-bottom cost makes Flagellants excellent emergency hires. Can serve as a secondary sergeant or a tank with investment.

#### Wildman
- **Tier**: Mid
- **Hire Cost**: 50 -- 150 crowns
- **Daily Wage**: 5 -- 8 crowns
- **Description**: A feral man found living in the wilderness. Wildmen have the highest HP and FAT potential of any non-elite background but have abysmal defensive stats and low Resolve (prone to panic).
- **Stat Ranges**: HP 60--80, FAT 100--130, RES 20--30, INI 90--115, MATT 45--60, MDEF 0--5, RATT 25--35, RDEF 0--3
- **Star Weights**: HP 3, FAT 3, RES 1, INI 2, MATT 2, MDEF 1, RATT 1, RDEF 1
- **Notable Traits**: Often comes with Iron Lungs and/or Huge (+10% HP, larger hit box). May come with Dastard (panics in organized combat). Never comes with traits requiring literacy or civilization.
- **Role Suitability**: Two-handed berserker, Colossus + Battleforged tank. The raw HP and FAT make Wildmen ideal for builds that rely on absorbing damage rather than avoiding it. Need heavy investment in RES or a nearby sergeant.

#### Raider
- **Tier**: Mid
- **Hire Cost**: 150 -- 350 crowns
- **Daily Wage**: 9 -- 12 crowns
- **Description**: A bandit or brigand who has decided mercenary work pays better. Raiders have good all-around combat stats from their experience fighting and looting. Reliable mid-tier hire.
- **Stat Ranges**: HP 50--65, FAT 95--115, RES 30--45, INI 90--115, MATT 50--65, MDEF 5--15, RATT 35--50, RDEF 2--8
- **Star Weights**: HP 2, FAT 2, RES 1, INI 2, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Brave, Strong, or Dexterous. Sometimes comes with Bloodthirsty (cosmetic) or Dastard (cowardly bandits exist).
- **Role Suitability**: Flexible frontliner, two-handed weapon user, or hybrid. Good enough stats to fill any melee role. Particularly strong as a versatile "jack of all trades" melee character.

#### Bastard
- **Tier**: Mid
- **Hire Cost**: 100 -- 250 crowns
- **Daily Wage**: 7 -- 10 crowns
- **Description**: The illegitimate child of a noble, raised with some education and combat training but without land or title. Decent combat stats and better-than-average RES from their noble bearing.
- **Stat Ranges**: HP 50--65, FAT 90--110, RES 25--40, INI 85--110, MATT 48--62, MDEF 2--10, RATT 30--45, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 2, INI 2, MATT 2, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Brave or Lucky. Balanced trait pool with no strong tendencies.
- **Role Suitability**: Versatile. Can be built into any melee role depending on star rolls. The balanced stat spread makes Bastards adaptable -- check their stars and build accordingly.

#### Killer on the Run
- **Tier**: Mid
- **Hire Cost**: 120 -- 300 crowns
- **Daily Wage**: 8 -- 11 crowns
- **Description**: A murderer fleeing justice. High MATT and MDEF from their violent lifestyle, good INI from always being on the run. Low RES -- killing haunts them.
- **Stat Ranges**: HP 48--62, FAT 95--115, RES 20--35, INI 95--120, MATT 52--68, MDEF 5--15, RATT 35--48, RDEF 2--8
- **Star Weights**: HP 1, FAT 2, RES 1, INI 2, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Bloodthirsty or Dastard. Never comes with Brave (their conscience troubles them). Sometimes has Iron Lungs from running.
- **Role Suitability**: Two-handed weapon user, nimble duelist. The high MATT + MDEF combination is excellent for aggressive melee builds. Low RES means they need sergeant support.

#### Disowned Noble
- **Tier**: High
- **Hire Cost**: 200 -- 450 crowns
- **Daily Wage**: 12 -- 16 crowns
- **Description**: A noble who has been cast out of their house. Retains excellent education and combat training. High RES (noble pride), good MATT and RATT, but average physical stats.
- **Stat Ranges**: HP 45--58, FAT 85--105, RES 35--55, INI 85--110, MATT 50--65, MDEF 2--12, RATT 35--50, RDEF 2--8
- **Star Weights**: HP 1, FAT 1, RES 3, INI 2, MATT 2, MDEF 2, RATT 2, RDEF 1
- **Notable Traits**: May come with Brave. Sometimes comes with traits reflecting noble upbringing (Lucky, Eagle Eyes). Never comes with traits suggesting low birth.
- **Role Suitability**: Sergeant, hybrid melee/ranged, polearm user. The high RES makes them natural leaders. Decent MATT allows them to contribute in combat while rallying allies.

#### Squire
- **Tier**: High
- **Hire Cost**: 250 -- 500 crowns
- **Daily Wage**: 12 -- 16 crowns
- **Description**: A knight's apprentice with proper martial training. Squires have excellent MATT and solid defensive stats. They are one of the best high-tier combat backgrounds before the elite tier.
- **Stat Ranges**: HP 50--65, FAT 90--110, RES 35--50, INI 85--110, MATT 55--70, MDEF 5--15, RATT 30--45, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 2, INI 1, MATT 3, MDEF 3, RATT 1, RDEF 1
- **Notable Traits**: May come with Brave or Fearless (a stronger version -- immunity to morale checks below Breaking). Good trait pool overall.
- **Role Suitability**: Frontline fighter, sword-and-board tank, two-handed specialist. The MATT + MDEF star weighting makes Squires ideal for any frontline role. One of the most reliable backgrounds.

#### Hedge Knight
- **Tier**: Elite
- **Hire Cost**: 300 -- 600 crowns
- **Daily Wage**: 18 -- 25 crowns
- **Description**: A wandering knight without a lord. The Hedge Knight is one of the premier melee backgrounds in the game -- highest starting MATT (tied with Swordmaster), excellent HP, and solid FAT for heavy armor.
- **Stat Ranges**: HP 60--80, FAT 95--120, RES 30--50, INI 80--100, MATT 60--80, MDEF 5--20, RATT 25--40, RDEF 0--5
- **Star Weights**: HP 3, FAT 2, RES 2, INI 1, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: Often comes with Strong. May come with Iron Lungs, Brave, or Huge. Very favorable trait pool.
- **Role Suitability**: Two-handed frontliner, Battleforged tank, duelist. The combination of high HP, high MATT, and potential Strong trait makes Hedge Knights the gold standard for melee DPS. Their high cost is justified.

#### Sellsword
- **Tier**: High
- **Hire Cost**: 250 -- 500 crowns
- **Daily Wage**: 15 -- 20 crowns
- **Description**: A professional mercenary with extensive combat experience. Sellswords are well-rounded fighters with good stats across the board but without the extreme peaks of elite backgrounds.
- **Stat Ranges**: HP 50--65, FAT 95--115, RES 30--45, INI 85--110, MATT 55--72, MDEF 5--18, RATT 30--45, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 1, INI 2, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: May come with Strong, Iron Lungs, Dexterous, or Brave. Good trait pool.
- **Role Suitability**: Flexible frontliner. Sellswords can fill any melee role effectively. They are the "safe" high-tier pick -- never amazing, never terrible. Good for filling out a roster.

#### Adventurous Noble
- **Tier**: Elite
- **Hire Cost**: 350 -- 700 crowns
- **Daily Wage**: 20 -- 28 crowns
- **Description**: A noble who seeks glory on the battlefield rather than in court. Excellent RES, good MATT, and versatile stats. The most expensive background but also one of the most versatile.
- **Stat Ranges**: HP 45--60, FAT 85--105, RES 40--60, INI 90--115, MATT 55--70, MDEF 5--15, RATT 35--50, RDEF 2--8
- **Star Weights**: HP 1, FAT 1, RES 3, INI 2, MATT 2, MDEF 2, RATT 2, RDEF 1
- **Notable Traits**: Often comes with Brave. May come with Lucky or Eagle Eyes. Never comes with negative traits (they have lived a charmed life).
- **Role Suitability**: Sergeant (best in slot for RES), versatile melee or hybrid. The guaranteed-no-negative-traits aspect makes Adventurous Nobles extremely consistent. Their high wage is the main drawback.

#### Swordmaster
- **Tier**: Elite
- **Hire Cost**: 400 -- 800 crowns
- **Daily Wage**: 22 -- 30 crowns
- **Description**: A master duelist past his prime but still devastatingly skilled. The highest starting MATT and MDEF in the game, combined with top-tier INI. Low HP and FAT reflect their aging body.
- **Stat Ranges**: HP 40--52, FAT 85--100, RES 35--55, INI 100--130, MATT 70--80, MDEF 15--30, RATT 30--45, RDEF 2--8
- **Star Weights**: HP 1, FAT 1, RES 2, INI 3, MATT 3, MDEF 3, RATT 1, RDEF 1
- **Notable Traits**: Often comes with Dexterous. May come with a permanent injury (old war wound) reducing HP or FAT slightly. Never comes with Clumsy.
- **Role Suitability**: Fencer, nimble dodge duelist. The Swordmaster is THE premier dodge/nimble background. Their low HP mandates Nimble over Battleforged. With Dodge perk, their MDEF can exceed 60, making them nearly unhittable. Best with swords or fencing swords.

#### Gladiator
- **Tier**: Elite
- **Hire Cost**: 350 -- 650 crowns
- **Daily Wage**: 18 -- 25 crowns
- **Description**: A former arena fighter trained in spectacle combat. Gladiators combine excellent HP (hardened by arena punishment) with top-tier MATT and solid FAT. More physically robust than Swordmasters.
- **Stat Ranges**: HP 55--72, FAT 100--125, RES 30--48, INI 95--120, MATT 58--75, MDEF 8--20, RATT 30--42, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 1, INI 2, MATT 3, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: Often comes with Iron Lungs and/or Strong. May come with Huge. Never comes with Dastard (crowd combat steels the nerves).
- **Role Suitability**: Two-handed berserker, duelist, flexible frontliner. The Gladiator is the physically superior version of the Hedge Knight for builds that want both damage and survivability. Excellent with any melee weapon.

#### Oathtaker
- **Tier**: Elite
- **Hire Cost**: 300 -- 550 crowns
- **Daily Wage**: 16 -- 22 crowns
- **Description**: A warrior bound by a sacred oath -- perhaps a former temple guardian or holy knight. The Oathtaker has the highest starting RES of any combat-capable background and excellent MATT/MDEF.
- **Stat Ranges**: HP 55--70, FAT 90--110, RES 45--60, INI 80--100, MATT 55--70, MDEF 8--18, RATT 25--38, RDEF 0--5
- **Star Weights**: HP 2, FAT 2, RES 3, INI 1, MATT 2, MDEF 2, RATT 1, RDEF 1
- **Notable Traits**: Always comes with Brave. May come with Determined. Never comes with Dastard, Fearful, or Bloodthirsty.
- **Role Suitability**: Sergeant-fighter hybrid, frontline tank. The Oathtaker can rally allies while also holding the line effectively. With Brave trait + high base RES, they can reach 90+ RES without heavy stat investment, freeing points for MATT/MDEF.

---

## 5. Perk Tree

### Tier Unlock Requirements

| Tier | Perks Required from Lower Tiers | Available at Level |
|------|-------------------------------|-------------------|
| 1 | 0 | 2+ |
| 2 | 1 | 3+ |
| 3 | 3 | 4+ |
| 4 | 5 | 6+ |
| 5 | 7 | 8+ |
| 6 | 8 | 9+ |
| 7 | 10 (all 10 perk points spent) | 11 (or veteran) |

To unlock a tier, you must have spent the required number of perk points in ANY combination of lower tiers. You do NOT need perks in every tier below -- just the total count.

### Tier 1 Perks (6 perks)

#### 1. Student
- **Tier**: 1
- **Effect**: Gain +20% experience from all sources (combat, quests, events). When reaching level 11, the Student perk is automatically refunded, returning the perk point.
- **Synergies**: Works with every build. The refund mechanic makes this effectively "free" if taken early. The earlier it is taken, the more XP it provides.
- **Notes**: Nearly universally the best first perk. The only reason not to take it is if you plan to keep the character at low level (expendable recruit).

#### 2. Colossus
- **Tier**: 1
- **Effect**: Increases maximum Hitpoints by +25% (multiplicative, applied to final HP after all level-ups). Also reduces the chance of suffering injuries by 33%.
- **Synergies**: Essential for Battleforged builds (more HP = more effective HP under heavy armor). Excellent with Nine Lives. Pairs well with high-HP backgrounds (Wildman, Hedge Knight, Gladiator). The injury reduction helps keep frontliners in fighting shape across battles.
- **Notes**: A 75 HP character becomes 93 HP with Colossus. Combined with heavy armor, this creates characters that can absorb enormous punishment.

#### 3. Nine Lives
- **Tier**: 1
- **Effect**: The first time per battle that this character would be reduced to 0 HP or below, they are instead left at 1 HP, all current injuries are removed, and a debuff reducing all stats by -30% is applied for the remainder of the battle.
- **Synergies**: Insurance perk for fragile characters (archers, nimble builds). Pairs with Colossus (survive, then soak more with the HP buffer). Works with Indomitable (prevents follow-up kill).
- **Notes**: The -30% debuff is harsh, but being alive with reduced stats is better than dead. Triggering Nine Lives is a "last chance" moment.

#### 4. Fast Adaptation
- **Tier**: 1
- **Effect**: Each consecutive miss against the same target grants a stacking +10% hit chance bonus on the next attack. The bonus resets to 0 when you hit or change targets. Maximum stack: +30%.
- **Synergies**: Helps low-MATT characters contribute against high-MDEF targets. Good for characters with moderate MATT (50--70). Less useful for very high-MATT characters who rarely miss. Pairs well with fast-attacking weapons (swords, daggers) that have more opportunities to stack the bonus.
- **Notes**: Effectively a "catch-up" perk. If you miss twice in a row, your third attack has +20% bonus. Reduces the frustration of repeated misses.

#### 5. Pathfinder
- **Tier**: 1
- **Effect**: The fatigue cost and action point cost of moving through difficult terrain (forests, swamps, snow, hills) is reduced by 50%. Movement over flat terrain costs 1 less fatigue per tile.
- **Synergies**: Essential for maps with heavy terrain. Pairs with Berserk (more movement after kills) and Overwhelm (positioning matters). Excellent for flanking-focused builds that need to reposition frequently.
- **Notes**: A niche perk. On flat battlefield maps, its value drops significantly. Best taken when the campaign involves a lot of forest or swamp fighting.

#### 6. Crippling Strikes
- **Tier**: 1
- **Effect**: Injuries inflicted by this character's attacks are upgraded to their more severe version. Additionally, the HP damage threshold required to inflict an injury is reduced from 15% to 5% of the target's max HP.
- **Synergies**: Excellent with weapons that have high armor penetration (maces, hammers) since they deal more direct HP damage. Pairs with Fearsome (injuries + morale checks). Good for cleavers (which have injury-inflicting special attacks).
- **Notes**: Injuries debuff enemies significantly -- a broken arm reduces their MATT, a leg wound reduces their INI and movement. Making injuries easier to inflict is a strong debuff-focused strategy.

### Tier 2 Perks (6 perks)

#### 7. Backstabber
- **Tier**: 2
- **Effect**: Gain +10% hit chance when attacking a target that has at least one other ally adjacent to it (i.e., the target is engaged by an ally). This stacks with the existing flanking bonus.
- **Synergies**: Excellent for two-handed weapon users who stand behind a shield wall. Pairs with Polearm builds (attacking from behind allies). Works well with any melee character who fights in formation.
- **Notes**: With standard flanking (+5% per adjacent ally beyond the first) and Backstabber (+10% if any ally is adjacent), a target surrounded by 3 of your characters gives the attacker +20% total bonus.

#### 8. Anticipation
- **Tier**: 2
- **Effect**: Gain bonus Ranged Defense equal to half the difference between the attacker's Ranged Attack and your base Ranged Defense, with a minimum bonus of +10 RDEF. Formula: bonus = max(10, (attacker_RATT - your_RDEF) / 2).
- **Synergies**: Best for frontliners with low RDEF who get shot at frequently. The perk scales with enemy RATT -- the stronger the enemy archer, the bigger your bonus. Pairs with shields (which already add RDEF, making the total very high). Essential for tanks.
- **Notes**: Against an enemy with 60 RATT, a character with 5 RDEF gains +27 bonus RDEF from Anticipation (max(10, (60-5)/2)). This makes Anticipation extremely effective against high-skill archers.

#### 9. Recover
- **Tier**: 2
- **Effect**: The Recover action now removes **all current fatigue** (instead of half). Recover still costs a full turn and cannot be used if the character has zero AP.
- **Synergies**: Critical for any heavy-armor build or two-handed weapon user who burns through fatigue quickly. Pairs with Berserk and Killing Frenzy (burn fatigue killing, Recover, repeat). Essential for Battleforged builds.
- **Notes**: Without this perk, Recover removes 50% of current fatigue. With it, you start the next turn at 0 fatigue. Taking one turn off every 3--4 turns is a worthwhile trade for full fatigue reset.

#### 10. Rotation
- **Tier**: 2
- **Effect**: Unlocks the Rotation skill. Rotation swaps this character's position with an adjacent ally, costing 3 AP and 25 fatigue. Neither character provokes opportunity attacks during the swap. Can be used to rescue an endangered ally or move a fresh fighter to the front.
- **Synergies**: Essential for any tank build (swap endangered allies to safety). Pairs with Footwork (multiple escape options). Critical for maintaining formation integrity. Works well on high-FAT characters who can afford the 25 fatigue cost.
- **Notes**: One of the most tactically important perks in the game. A tank with Rotation + Indomitable + Shield can pull an injured ally out of danger and absorb the hits meant for them.

#### 11. Rally the Troops
- **Tier**: 2
- **Effect**: Unlocks the Rally skill. Rally attempts to restore morale to all allies within 4 tiles. Each ally makes a Resolve check using the RALLIER'S Resolve as a bonus. Costs 5 AP and 30 fatigue. Can be used once per turn.
- **Synergies**: Requires high Resolve to be effective -- 60+ RES recommended, 80+ ideal. Best on Monks, Oathtakers, Adventurous Nobles, and other high-RES backgrounds. Pairs with the Fortified Mind perk (more RES). Only one or two characters per company need this.
- **Notes**: Morale is a game-changer in difficult fights. A sergeant with Rally can turn a Breaking rout into a Steady defense. Position the sergeant centrally behind the front line for maximum coverage.

#### 12. Bags and Belts
- **Tier**: 2
- **Effect**: Adds 2 additional inventory slots to the character's belt (from 2 to 4 total). Swapping to items in belt slots costs 0 AP (instead of the normal 4 AP).
- **Synergies**: Essential for hybrid builds that switch weapons (e.g., start with a bow, switch to a polearm when enemies close). Pairs with Quick Hands (which this perk replaces the need for in some cases). Useful for carrying additional consumables (bandages, antidotes).
- **Notes**: A character can now carry their primary weapon, a sidearm, a potion, and a shield all readily accessible. The 0 AP swap makes mid-combat weapon changes seamless.

### Tier 3 Perks (6 perks)

#### 13. Gifted
- **Tier**: 3
- **Effect**: Immediately gain +1 to all 8 primary stats. This is a one-time flat bonus applied when the perk is taken.
- **Synergies**: Works with every build. Particularly valuable for characters with poor star rolls who need a stat boost across the board. Best taken early so the +1s compound with level-up decisions. Pairs with Colossus (+1 HP is amplified to +1.25 by Colossus).
- **Notes**: +1 to all 8 stats is equivalent to receiving roughly 2.5 "free" level-ups worth of stats (since you choose 3 stats per level and Gifted gives all 8). A strong pick for any character.

#### 14. Dodge
- **Tier**: 3
- **Effect**: Gain bonus Melee Defense and Ranged Defense equal to **15% of your current Initiative**. Current Initiative = base INI - current fatigue - armor fatigue penalty.
- **Synergies**: The cornerstone of nimble/dodge builds. Requires high base INI (110+) and light armor (low fatigue penalty). A character with 140 current INI gains +21 MDEF and +21 RDEF. Pairs with Relentless (maintains INI even when spending fatigue), Nimble (light armor synergy), and Underdog (prevents surrounded penalty from reducing effective MDEF).
- **Notes**: Dodge is calculated based on CURRENT initiative, which drops as you spend fatigue and wear heavier armor. A Dodge build with heavy armor is counterproductive. Best on Swordmasters, Thieves, and Assassins with 120+ base INI.

#### 15. Fortified Mind
- **Tier**: 3
- **Effect**: Gain +15 Resolve permanently.
- **Synergies**: Essential for sergeants -- stacks with Brave trait and high base RES for maximum rally effectiveness. Also useful for frontliners who need to resist fear effects from undead. Pairs with Rally the Troops.
- **Notes**: +15 RES is enormous. A Monk with 50 base RES + 10 (Brave trait) + 15 (Fortified Mind) = 75 RES, and that is before any level-up investment. With level-ups, easily reaches 85+.

#### 16. Shield Expert
- **Tier**: 3
- **Effect**: Increases the Melee Defense and Ranged Defense bonuses from shields by +25% (rounded down). Additionally, the Shieldwall skill grants an additional +5 MDEF beyond the doubled shield bonus.
- **Synergies**: Essential for sword-and-board tanks. A heater shield normally gives +25 MDEF; with Shield Expert it gives +31 MDEF. In Shieldwall, that becomes +62 + 5 = +67 MDEF. Pairs with Battleforged (heavy armor + shield = maximum protection).
- **Notes**: Also reduces the chance that the shield is destroyed by enemy attacks by 50%. Shields have durability and can break -- Shield Expert makes this much rarer.

#### 17. Weapons Master: Bow
- **Tier**: 3
- **Effect**: Reduces the fatigue cost of all bow attacks by -25%. Increases the effective range of bows by +1 tile before distance penalties apply. Unlocks the Quick Shot skill (fire an arrow for 4 AP instead of 5, but at -15% hit chance).
- **Synergies**: Essential for dedicated archers. Pairs with Bullseye (further reduces distance penalty). The Quick Shot skill allows a bow user to fire and reposition in the same turn. Works best with high-RATT characters (Hunters, Bowyers).
- **Notes**: Bow Mastery + Bullseye + a Warbow is the core ranged DPS combo. The fatigue reduction is important because archers fire every turn and fatigue accumulates.

#### 18. Weapons Master: Crossbow
- **Tier**: 3
- **Effect**: Reduces the fatigue cost of crossbow attacks by -25%. Removes the reload AP cost (crossbows can now fire every turn instead of every other turn). Crossbow damage is increased by +10%.
- **Synergies**: Transforms crossbows from slow-but-powerful to consistent DPS weapons. Pairs with Bullseye for sniping. The +10% damage bonus stacks with the crossbow's already high base damage. Good for characters with moderate RATT (50--70) since crossbow's high base damage compensates.
- **Notes**: Without this mastery, crossbows fire every other turn. With it, they fire every turn, effectively doubling DPS. Crossbow Mastery is one of the highest DPS-increase perks in the game.

### Tier 4 Perks (6 perks)

#### 19. Underdog
- **Tier**: 4
- **Effect**: Eliminates the surrounded penalty (-5 MDEF per additional adjacent enemy beyond the first). The character's full MDEF applies regardless of how many enemies surround them.
- **Synergies**: Essential for any frontliner, especially two-handed weapon users who lack a shield. A two-handed fighter with 35 MDEF surrounded by 4 enemies normally has 20 MDEF; with Underdog, they keep all 35. Pairs with Dodge (preserves the initiative-based MDEF bonus even when surrounded).
- **Notes**: The surrounded penalty is one of the deadliest mechanics in the game. Without Underdog, even a high-MDEF character becomes vulnerable when flanked. This perk is near-mandatory for front-line fighters.

#### 20. Overwhelm
- **Tier**: 4
- **Effect**: Each attack against a target (hit or miss) applies a -10% penalty to the target's MATT and RATT until the start of your next turn. Stacks up to 3 times (-30% total). Only applies to attacks that cost AP.
- **Synergies**: Best with fast-attacking weapons (daggers, swords, dual-wielding). A sword user attacking twice per turn applies -20% to the target's offense. Pairs with high INI (you want to go before the debuffed enemy acts). Works with Dodge builds that want to minimize incoming damage.
- **Notes**: Overwhelm is defensive through offense. By attacking aggressively, you make enemies less dangerous. Particularly effective when multiple Overwhelm users focus the same target.

#### 21. Fearsome
- **Tier**: 4
- **Effect**: Whenever this character deals direct HP damage (any amount, even 1 point), the target must pass a Resolve check or suffer a morale reduction. The check difficulty scales with the attacker's Resolve.
- **Synergies**: Best with weapons that deal frequent HP damage through armor (maces, flails, crossbows). Pairs with Crippling Strikes (more HP damage through armor = more morale checks). Excellent with high-RES characters. A Fearsome sergeant with a mace can break enemy morale rapidly.
- **Notes**: Each hit forces a check. Weapons with area of effect (two-handed flails, axes hitting multiple targets) can trigger multiple Fearsome checks per attack. Very effective against low-RES enemies.

#### 22. Weapons Master: Sword
- **Tier**: 4
- **Effect**: Reduces fatigue cost of all sword attacks by -25%. Unlocks Riposte skill (counter-attack any enemy that misses you in melee; costs 5 AP and 25 fatigue, lasts until your next turn). One-handed swords gain +5% base hit chance.
- **Synergies**: Riposte is the defining sword ability -- turns high MDEF into offense. Each enemy miss triggers a free counter-attack. Pairs with Dodge (higher MDEF = more misses = more Ripostes), Nimble (light armor for Dodge synergy), and Duelist (one-handed sword with no shield + Duelist's damage bonus).
- **Notes**: A Swordmaster with Sword Mastery, Dodge, Nimble, and 50+ MDEF can Riposte 3--5 times per round against surrounding enemies. This is the "fencer" archetype.

#### 23. Weapons Master: Axe
- **Tier**: 4
- **Effect**: Reduces fatigue cost of all axe attacks by -25%. One-handed axe attacks deal +10% damage to shields (increasing shield-destruction rate). Two-handed axe Round Swing (hit all adjacent targets) costs 4 AP instead of 6.
- **Synergies**: Round Swing at 4 AP allows a two-handed axe user to move 1 tile and still cleave. Pairs with Berserk (kill with Round Swing, get 4 AP back, swing again). The shield damage bonus for one-handed axes makes them excellent shield-breakers. Pairs well with Reach Advantage (hit 6 targets = +6 MDEF).
- **Notes**: Two-handed axe with Axe Mastery + Berserk + Killing Frenzy is the premier AoE damage combo. A single Round Swing can hit 6 targets, potentially killing multiple and triggering Berserk chains.

#### 24. Weapons Master: Mace
- **Tier**: 4
- **Effect**: Reduces fatigue cost of all mace attacks by -25%. One-handed mace Stun duration is extended by +1 turn. Two-handed mace attacks gain +15% armor penetration (direct HP damage).
- **Synergies**: The extended Stun is extremely powerful for control. A stunned enemy cannot act and has 0 MDEF. Pairs with Fearsome (more HP damage = more morale checks). Mace Mastery + Fearsome + Crippling Strikes is the premier debuff build.
- **Notes**: Maces are the go-to weapon for fighting heavily armored enemies. The bonus armor penetration from mastery means even tanks in full plate take significant HP damage.

### Tier 5 Perks (6 perks)

#### 25. Reach Advantage
- **Tier**: 5
- **Effect**: Each successful melee attack grants +1 Melee Defense that persists until the start of your next turn. Stacks up to +5 from a single weapon or +8 from two-handed weapons with cleave abilities (since they can hit multiple targets).
- **Synergies**: Best with fast-attacking or multi-target weapons. A two-handed axe Round Swing hitting 4 enemies grants +4 MDEF. Pairs with Underdog (protect the MDEF bonus from surrounded penalty). Essential for two-handed frontliners who lack a shield.
- **Notes**: This perk essentially gives two-handed weapon users a way to build defensive value through offense. Hitting 2 enemies per turn gives +2 MDEF per round, which is like a small permanent shield.

#### 26. Overwhelm (Ranged)
- **Tier**: 5
- **Effect**: Ranged attacks now also apply Overwhelm stacks. Each ranged hit on a target applies -10% to the target's MATT and RATT (stacks up to 3, same as melee Overwhelm).
- **Synergies**: Allows archers to debuff approaching enemies before they reach melee range. Pairs with Quick Shot (Bow Mastery) for double-debuff per turn. Works with throwing weapons for high-damage + debuff hybrid.
- **Notes**: This is a separate perk from melee Overwhelm. A character can have both. Ranged Overwhelm is less common because archers typically prefer damage perks, but it is very effective in a support-archer role.

#### 27. Bullseye
- **Tier**: 5
- **Effect**: Distance penalty for ranged attacks is halved (from -2% per tile to -1% per tile beyond optimal range). Additionally, when shooting at a target with allies or obstacles between you and the target, the chance of hitting the obstacle/ally is halved.
- **Synergies**: Essential for dedicated archers. Pairs with Bow Mastery (extended range + reduced distance penalty = reliable long-range sniping). The reduced friendly-fire chance allows archers to fire into melee safely. Works with Crossbow Mastery as well.
- **Notes**: Without Bullseye, firing a warbow at a target 8 tiles away incurs -10% from distance (5 tiles beyond 3-tile optimal range x -2%). With Bullseye, that becomes -5%. Combined with Bow Mastery's +1 range, the penalty applies from further away.

#### 28. Weapons Master: Polearm
- **Tier**: 5
- **Effect**: Reduces fatigue cost of all polearm attacks by -25%. Polearm attacks from 2 tiles away no longer provoke the -10% accuracy penalty for attacking at range. Unlocks the Lunge skill (attack a target 3 tiles away for 7 AP and 30 fatigue).
- **Synergies**: Polearms attack from behind allies, making Backstabber a natural pair. The removed range penalty makes polearms strictly superior to melee weapons when attacking from the second row. Lunge extends threat range significantly. Pairs with Footwork for repositioning.
- **Notes**: Polearm users stand behind the shield wall and attack over it. They never get attacked in melee unless the enemy pushes past the front line. This makes polearms the safest melee weapon class.

#### 29. Weapons Master: Hammer
- **Tier**: 5
- **Effect**: Reduces fatigue cost of all hammer attacks by -25%. One-handed hammer strikes deal +20% armor damage. Two-handed hammer Shatter skill costs 4 AP instead of 6 and has +10% hit chance.
- **Synergies**: Hammers destroy armor faster than any other weapon. The mastery amplifies this. Pairs with Battleforged (your armor is preserved while you destroy theirs) and Reach Advantage (Shatter can hit multiple tiles). Essential for fighting late-game armored opponents (Orc Warriors, Ancient Legionnaires).
- **Notes**: Two-handed hammer with Hammer Mastery is the premier anti-armor tool. Shatter at 4 AP allows moving 1 tile and still attacking. The +10% hit chance on Shatter compensates for the weapon's typically lower accuracy.

#### 30. Weapons Master: Cleaver
- **Tier**: 5
- **Effect**: Reduces fatigue cost of all cleaver attacks by -25%. Cleaver bleed effects deal +33% more damage per tick. Decapitate skill (one-handed cleaver finisher) costs 5 AP instead of 7.
- **Synergies**: Cleavers inflict bleed (damage over time that bypasses armor). The enhanced bleed is devastating against high-HP targets. Decapitate at 5 AP allows using it more frequently for high single-target damage. Pairs with Crippling Strikes (more severe bleed and injury effects).
- **Notes**: Named "cleavers" but includes all slashing weapons like falchions and military cleavers. Cleaver builds excel at sustained damage through bleed stacking. Less common than sword or axe builds but very effective.

### Tier 6 Perks (6 perks)

#### 31. Berserk
- **Tier**: 6
- **Effect**: Whenever this character kills an enemy, they immediately regain 4 AP. This can trigger multiple times per turn. The recovered AP can be spent on movement, attacks, or skills.
- **Synergies**: The most impactful offensive perk in the game. Pairs with Killing Frenzy (+25% damage after kills, stacking the next kill chance). With Axe Mastery (Round Swing at 4 AP, exactly the refund amount), a kill with Round Swing funds another Round Swing. Pairs with Recover (sustain the fatigue cost of chain-kills).
- **Notes**: A two-handed axe user with Berserk + Killing Frenzy + Axe Mastery can theoretically kill 3--4 enemies in a single turn by chaining Round Swings. This is the "berserker" fantasy realized. Requires high MATT to reliably kill.

#### 32. Killing Frenzy
- **Tier**: 6
- **Effect**: After killing an enemy, gain +25% total damage (additive with other damage bonuses) for 2 turns. The buff refreshes on each kill.
- **Synergies**: The companion perk to Berserk. Together, they create a chain-killing engine: kill one enemy, get +4 AP and +25% damage, use that to kill the next, repeat. Pairs with any weapon mastery. Best on high-MATT characters who can reliably get the first kill.
- **Notes**: The +25% applies to all damage types (melee, ranged, direct HP, and armor damage). It makes the second and third kills in a chain significantly easier.

#### 33. Nimble
- **Tier**: 6
- **Effect**: Reduces all hitpoint damage received by a percentage based on the total fatigue penalty of worn armor. Maximum reduction: 60% at 0 armor fatigue penalty. The formula is: damage_reduction = max(0, 60 - armor_fatigue_penalty * 2)%. Works best with light or no armor.
- **Synergies**: The alternative to Battleforged. Nimble characters wear light armor (0--15 fatigue penalty) for 30--60% damage reduction. Pairs with Dodge (light armor = high current INI = high MDEF bonus). Pairs with Underdog. Best on high-INI, low-HP backgrounds (Swordmaster, Thief, Assassin).
- **Notes**: At 0 armor fatigue penalty (no armor), Nimble gives 60% damage reduction. At 15 penalty (light leather), it gives 30%. At 30+ penalty (heavy armor), it gives 0% -- DO NOT combine with heavy armor. Nimble and Battleforged are mutually exclusive in practice.

#### 34. Battleforged
- **Tier**: 6
- **Effect**: Reduces all damage to armor by a flat percentage equal to 5% of your total armor value (head + body combined). Also reduces direct HP damage that bypasses armor by 10% of your total armor value.
- **Synergies**: The alternative to Nimble. Battleforged characters wear the heaviest armor possible. A character with 300 total armor (head + body) reduces armor damage by 15% and direct HP damage by 30 points. Pairs with Colossus (more HP behind the armor). Best on high-HP, high-FAT backgrounds (Hedge Knight, Wildman, Lumberjack).
- **Notes**: Battleforged scales with armor quality. In the late game with 500+ total armor, the 25% armor damage reduction and 50 direct HP damage reduction make Battleforged characters extremely durable. The downside is the massive fatigue penalty from heavy armor.

#### 35. Indomitable
- **Tier**: 6
- **Effect**: Unlocks the Indomitable skill. When activated (costs 5 AP and 25 fatigue), the character becomes immune to knockback, stun, grab, and other displacement effects. All damage received is reduced by 50% until the start of their next turn. Lasts 1 round.
- **Synergies**: The ultimate defensive skill. A tank activating Indomitable on an exposed turn takes half damage from all sources and cannot be disrupted. Pairs with Rotation (activate Indomitable, then Rotate an ally to safety on the next turn). Pairs with Battleforged/shield builds. Essential against Orc charges and undead grabs.
- **Notes**: Costs both AP and fatigue, so using Indomitable means you usually cannot attack that turn. This is acceptable for tanks whose role is to absorb damage, not deal it. Recover perk helps manage the fatigue cost.

#### 36. Footwork
- **Tier**: 6
- **Effect**: Unlocks the Footwork skill. The character moves 1 tile in any direction without provoking opportunity attacks. Costs 3 AP and 20 fatigue.
- **Synergies**: Essential for archers and ranged characters who need to disengage from melee. Useful for nimble builds that want to reposition without eating free hits. Pairs with Rotation (multiple escape tools). Works with Adrenaline Rush (use Footwork, then Adrenaline to act first next turn).
- **Notes**: Without Footwork, moving away from an adjacent enemy triggers a free attack. Footwork negates this entirely. Critical for backline characters who get flanked.

### Tier 7 Perks (4 perks)

#### 37. Duelist
- **Tier**: 7
- **Effect**: When wielding a one-handed weapon with no shield or off-hand item, all attacks gain +25% damage that ignores armor (applied as additional armor-piercing damage). This bonus is applied after all other damage calculations.
- **Synergies**: The defining perk for one-handed weapon builds without shields. A one-handed sword with Duelist deals its normal damage to armor PLUS 25% of the damage directly to HP. Pairs with any one-handed weapon mastery. Best with swords (Riposte + Duelist) and maces (Stun + high HP damage). Pairs with Nimble (no shield means Dodge provides defense instead).
- **Notes**: Duelist does NOT work with shields equipped. You sacrifice defensive stats for offensive power. This is the trade-off: shield for defense, or Duelist for offense. Fencer builds universally take Duelist.

#### 38. Weapons Master: Throwing
- **Tier**: 7
- **Effect**: Reduces fatigue cost of all throwing weapon attacks by -25%. Throwing weapons gain +20% damage and +1 tile of range. Drawing a throwing weapon from belt slots costs 0 AP (free swap).
- **Synergies**: Throwing weapons (javelins, throwing axes) deal enormous damage at close range but are consumed on use. The free swap means you can throw a javelin, swap to a new one, and throw again. Pairs with Bags and Belts (more inventory slots = more throwables). Excellent for hybrid builds that throw weapons then switch to melee.
- **Notes**: A dedicated thrower with Throwing Mastery + Bags and Belts carries 4 stacks of throwing weapons. Each throw deals massive damage (comparable to crossbow bolts) at 3--5 tile range. Very expensive in consumables but devastating.

#### 39. Relentless
- **Tier**: 7
- **Effect**: Current fatigue no longer reduces your Initiative. Your current Initiative is calculated as: base INI minus armor fatigue penalty only (fatigue spent on actions is ignored).
- **Synergies**: The keystone perk for initiative-based builds. Without Relentless, spending 50 fatigue reduces your current INI by 50, tanking your Dodge bonus. With Relentless, Dodge's bonus is consistent regardless of fatigue spent. Pairs with Dodge (the primary beneficiary), Overwhelm (always act before debuffed enemies), and Adrenaline Rush.
- **Notes**: A character with 140 base INI, 10 armor penalty, and 60 current fatigue normally has 70 current INI. With Relentless, they have 130 current INI. That is the difference between +10 MDEF from Dodge and +19 MDEF from Dodge.

#### 40. Adrenaline Rush
- **Tier**: 7
- **Effect**: Unlocks the Adrenaline Rush skill. When activated (costs 1 AP and 30 fatigue), this character will act before ALL other characters in the next turn, regardless of initiative order. The effect is consumed at the start of the boosted turn.
- **Synergies**: Guarantees first action next round. Pairs with Berserk (use Adrenaline at end of turn, act first next turn, chain kills before enemies can react). Useful for Rotation rescues (guarantee you act before the enemy can kill your ally). Works with Recover (use Adrenaline, Recover first thing next turn, then act at full fatigue).
- **Notes**: The 30 fatigue cost is significant. Use sparingly for critical moments: finishing off a dangerous enemy before they act, rallying allies before a morale cascade, or repositioning to save a life.

---

## 6. Traits System

Traits are innate character properties assigned at character creation. They cannot be gained or removed during gameplay (with rare event exceptions). Each character can have **0 to 3 traits**. Traits are randomly assigned based on background.

### Positive Traits

| Trait | Effect | Notes |
|-------|--------|-------|
| **Brave** | +10 Resolve | One of the best traits. Essential for sergeants. Common on Monks, Oathtakers, Flagellants, Nobles. |
| **Iron Lungs** | +4 fatigue recovery per turn (from 15 to 19) | Extremely valuable. Equivalent to ~25% more actions over a long fight. Common on physically fit backgrounds. |
| **Dexterous** | -10% fatigue cost for all weapon skills | Slightly less impactful than Iron Lungs but still excellent. Reduces the gap between light and heavy weapon users. Common on Thieves, Assassins, Swordmasters. |
| **Strong** | +10% melee damage, +10% maximum Fatigue | A top-tier trait. The damage bonus is multiplicative with weapon damage. The FAT bonus helps offset heavy armor. Common on Lumberjacks, Hedge Knights, Gladiators. |
| **Eagle Eyes** | +1 vision range, +10% ranged hit chance at distances beyond 4 tiles | Essential for archers. The vision range lets you spot enemies one tile further. The hit bonus at range counteracts distance penalties. Common on Hunters. |
| **Huge** | +10% maximum Hitpoints, -5 Melee Defense, +10% melee damage | A mixed trait. The HP and damage bonuses are excellent, but the MDEF penalty hurts. Best on Battleforged builds that rely on armor, not dodging. Common on Wildmen, Gladiators. |
| **Lucky** | +5% chance to avoid lethal damage (acts as a 5% Nine Lives before Nine Lives) | A minor but nice trait. The 5% chance to survive a killing blow has no downside. Stacks with Nine Lives (Nine Lives triggers if Lucky fails). Common on Thieves, Nobles. |
| **Determined** | Ignore the first failed morale check each battle (remain at current morale state) | Very useful on frontliners. Prevents the first morale cascade. Common on Flagellants, Squires. |
| **Fearless** | Cannot have morale reduced below Wavering (immune to Breaking and Fleeing) | Extremely powerful. Guarantees the character never routs. Rare trait, most common on Squires and Oathtakers. |
| **Quick** | +10 Initiative | A modest boost to INI. Most useful for Dodge builds where every point of INI translates to MDEF. Minor for heavy armor builds. |
| **Tough** | +5 Hitpoints, -15% chance to receive injuries from HP damage | A solid trait. The injury reduction keeps characters fighting without debuffs. Common on physically robust backgrounds. |
| **Bright** | +10% experience gained | Stacks with Student perk for +30% total XP bonus. Very useful for power-leveling key characters. Uncommon trait. |

### Negative Traits

| Trait | Effect | Notes |
|-------|--------|-------|
| **Dastard** | -10 Resolve | The opposite of Brave. Makes the character susceptible to morale failure. Common on Thieves, Killers on the Run, some Raiders. Avoid for sergeant builds. |
| **Asthmatic** | -4 fatigue recovery per turn (from 15 to 11) | Extremely punishing. The character effectively has ~25% fewer actions per fight. Makes heavy armor and two-handed weapons nearly unusable. Avoid if possible. |
| **Short Sighted** | -1 vision range, -10% ranged hit chance at distances beyond 3 tiles | Devastating for archers. Acceptable on pure melee characters who don't use ranged weapons. Common on older backgrounds (Swordmasters, Bowyers). |
| **Bleeder** | Injuries that cause bleeding deal +33% more bleed damage; bleeding duration +1 turn | Makes the character more vulnerable to cleavers and bleeding effects. Annoying but rarely lethal on its own. Common on some mid-tier backgrounds. |
| **Clumsy** | +10% fatigue cost for all weapon skills | The opposite of Dexterous. Adds up over a fight, reducing the character's effective action count. Avoid on two-handed weapon users who already have high fatigue costs. |
| **Fat** | -10 maximum Fatigue, -5 Initiative | A permanent stat reduction. The FAT penalty compounds with armor weight. The INI penalty is minor. Avoid on builds that need high FAT. |
| **Fearful** | -5 Resolve, forced morale check when any ally within 3 tiles dies | Worse than Dastard in practice because the forced check can cascade. A Fearful character in a company taking casualties will rout. Avoid for front line. |
| **Night Blind** | -2 vision range at night, -15% hit chance at night | Irrelevant in daytime battles. Devastating in night battles. If your campaign involves many night fights, avoid this trait. Otherwise manageable. |
| **Superstitious** | -10 Resolve when fighting undead or supernatural enemies | Situational. Devastating against undead-heavy campaigns. Irrelevant if fighting only human enemies. Check campaign context before dismissing. |
| **Fragile** | -15% maximum Hitpoints | Extremely harsh. A character with 60 HP becomes 51 HP. Makes Battleforged less effective and Nimble more necessary. Avoid on frontliners. |
| **Pessimist** | Cannot receive the Confident morale state; starts every battle at Steady | Loses the +10% hit chance from Confident. A moderate penalty that prevents the character from benefiting from morale boosts. |
| **Irrational** | -5% hit chance with all attacks | A flat penalty to all offense. Small but persistent. Stacks poorly with other debuffs. |

### Trait Interaction Rules

1. A character cannot have both Brave and Dastard (they are opposites).
2. A character cannot have both Iron Lungs and Asthmatic (they are opposites).
3. A character cannot have both Dexterous and Clumsy (they are opposites).
4. A character cannot have both Eagle Eyes and Short Sighted (they are opposites).
5. A character CAN have both positive and negative traits simultaneously (e.g., Brave + Bleeder).
6. A character CAN have multiple negative traits (e.g., Dastard + Asthmatic -- terrible hire, avoid).
7. Background determines the probability pool for traits. Elite backgrounds have a much higher chance of positive traits and lower chance of negative traits.

---

## 7. Popular Builds

### Build 1: Two-Handed Frontliner ("The Berserker")

**Overview**: A damage-dealing machine that cleaves through groups of enemies using two-handed axes, swords, or hammers. Relies on heavy armor (Battleforged) for survivability and Berserk/Killing Frenzy for chained kills.

**Best Backgrounds**: Hedge Knight, Gladiator, Sellsword, Lumberjack (budget)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 80+ | High (pick 4--5 times) |
| FAT | 120+ | High (pick 4--5 times) |
| RES | 40+ | Low (pick 0--1 times) |
| INI | -- | Never pick |
| MATT | 90+ | Highest (pick every level) |
| MDEF | 30+ | High (pick 4--5 times) |
| RATT | -- | Never pick |
| RDEF | -- | Never pick |

**Stat Priority Per Level**: MATT > MDEF = HP = FAT (rotate as needed) > RES > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost, refunded at 11 |
| 3 | Colossus | +25% HP for survivability |
| 4 | Recover | Full fatigue reset for sustained fighting |
| 5 | Backstabber | +10% hit when allies are adjacent (always true for frontliners) |
| 6 | Gifted | +1 to all stats, general power boost |
| 7 | Underdog | Removes surrounded MDEF penalty |
| 8 | Reach Advantage | +MDEF from hitting enemies (replaces shield defense) |
| 9 | Battleforged | Heavy armor damage reduction |
| 10 | Berserk | +4 AP on kill for chain attacks |
| 11 | Killing Frenzy | +25% damage after kills |
| Vet 1 | Weapon Mastery (Axe/Sword/Hammer) | Depends on chosen weapon |

**Weapon Choice**:
- **Two-Handed Axe**: Best AoE (Round Swing hits all 6 adjacent tiles). Take Axe Mastery.
- **Two-Handed Sword**: Highest single-target damage, AoE swing hits 3 tiles in a line. Take Sword Mastery. The Riposte from Sword Mastery is not usable with 2H swords -- take a different Tier 4 perk.
- **Two-Handed Hammer**: Best anti-armor. Take Hammer Mastery. Essential against late-game armored foes.

---

### Build 2: Sword and Board Tank ("The Wall")

**Overview**: A defensive specialist who holds the line with a shield, absorbs hits, uses Rotation to save allies, and locks enemies down with Shieldwall. Deals moderate damage but is nearly unkillable.

**Best Backgrounds**: Squire, Hedge Knight, Oathtaker, Militia (budget)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 85+ | High (pick 5--6 times) |
| FAT | 110+ | Medium (pick 3--4 times) |
| RES | 45+ | Medium (pick 2--3 times) |
| INI | -- | Never pick |
| MATT | 75+ | Medium (pick 3--4 times) |
| MDEF | 35+ | Highest (pick every level) |
| RATT | -- | Never pick |
| RDEF | 10+ | Low (pick 0--1 times) |

**Stat Priority Per Level**: MDEF > HP > MATT = FAT > RES > RDEF > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Colossus | +25% HP |
| 4 | Recover | Shieldwall + heavy armor drains fatigue fast |
| 5 | Rotation | Swap endangered allies to safety |
| 6 | Shield Expert | +25% shield bonuses, shield durability |
| 7 | Backstabber | Hit chance improvement for moderate-MATT tanks |
| 8 | Battleforged | Heavy armor damage reduction |
| 9 | Underdog | Maintain MDEF when surrounded |
| 10 | Indomitable | 50% damage reduction + CC immunity on demand |
| 11 | Anticipation | Ranged defense to round out durability |
| Vet 1 | Fortified Mind or Gifted | More Resolve for morale, or general stats |

**Weapon Choice**:
- **One-Handed Sword + Heater Shield**: Best overall. Sword's high accuracy compensates for moderate MATT. Shield gives +25 MDEF (+31 with Shield Expert).
- **One-Handed Mace + Heater Shield**: Stun capability for locking down dangerous targets. Slightly less accurate than swords.

---

### Build 3: Nimble Dodge ("The Dancer")

**Overview**: A lightly armored fighter who avoids damage through extreme MDEF (via Dodge perk converting INI to defense) and Nimble's damage reduction. Goes early in turn order and punishes enemies who miss with Riposte.

**Best Backgrounds**: Swordmaster, Assassin, Thief, Killer on the Run

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 60+ | Low (pick 1--2 times, rely on Nimble) |
| FAT | 100+ | Medium (pick 2--3 times) |
| RES | 40+ | Low (pick 1--2 times) |
| INI | 140+ | High (pick 4--5 times) |
| MATT | 85+ | High (pick every level) |
| MDEF | 40+ | High (pick every level) |
| RATT | -- | Never pick |
| RDEF | -- | Never pick (Dodge covers it) |

**Stat Priority Per Level**: MATT = MDEF = INI > FAT > HP = RES > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Colossus | Even Nimble builds benefit from +25% HP as insurance |
| 4 | Dodge | Core perk: 15% of current INI becomes MDEF/RDEF |
| 5 | Underdog | Protect that high MDEF from surrounded penalty |
| 6 | Recover | Manage fatigue to keep INI high |
| 7 | Nimble | 40--60% damage reduction with light armor |
| 8 | Sword Mastery | Riposte for counter-attacks on missed hits |
| 9 | Relentless | Fatigue no longer reduces INI -- massive Dodge boost |
| 10 | Duelist | +25% armor-piercing damage with one-handed sword, no shield |
| 11 | Killing Frenzy or Berserk | Chain-killing power |
| Vet 1 | Whichever of Berserk/Killing Frenzy was not taken at 11 |

**Weapon Choice**:
- **Fencing Sword**: A one-handed sword variant with the Lunge skill (attack from 2 tiles away). Ideal for Duelist Nimble builds.
- **One-Handed Sword**: If fencing sword is unavailable. Riposte + Duelist.
- **Armor**: Wear light leather or padded surcoat (fatigue penalty 10--15) for 30--50% Nimble reduction while keeping INI high.

---

### Build 4: Archer ("The Sniper")

**Overview**: A backline ranged DPS who picks off priority targets from distance. Uses a warbow for maximum damage and relies on Bullseye + Bow Mastery for accuracy at range.

**Best Backgrounds**: Hunter, Bowyer, Adventurous Noble (for hybrid)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 55+ | Low (pick 1--2 times) |
| FAT | 100+ | Medium (pick 2--3 times) |
| RES | 35+ | Low (pick 0--1 times) |
| INI | 120+ | Medium (pick 2--3 times, for Dodge) |
| MATT | -- | Never pick |
| MDEF | -- | Never pick (stay in backline) |
| RATT | 90+ | Highest (pick every level) |
| RDEF | 10+ | Low (pick 0--1 times) |

**Stat Priority Per Level**: RATT > FAT = INI > HP > RDEF = RES > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Bow Mastery | Reduced fatigue, extended range, Quick Shot |
| 4 | Fast Adaptation | Compensates for misses at range |
| 5 | Bullseye | Half distance penalty, reduced friendly fire |
| 6 | Dodge | INI-based defense as insurance |
| 7 | Anticipation | Protect against enemy archers |
| 8 | Nimble | Damage reduction with light armor |
| 9 | Footwork | Escape melee if enemies reach you |
| 10 | Killing Frenzy | +25% damage after scoring kills |
| 11 | Berserk | +4 AP on kill = fire twice in one turn |
| Vet 1 | Gifted or Colossus | Stat boost or HP insurance |

**Weapon Choice**:
- **Warbow**: Highest bow damage. Requires high FAT (15 fatigue per shot). The go-to endgame bow.
- **Hunting Bow**: Lower damage but cheaper fatigue cost. Good for lower-FAT archers.
- **Crossbow**: Alternative if RATT is moderate. Higher base damage, no distance penalty compensation needed. Take Crossbow Mastery instead of Bow Mastery.

---

### Build 5: Thrower/Hybrid ("The Javelin")

**Overview**: A versatile fighter who opens combat with devastating throwing weapon volleys, then switches to melee. Combines ranged burst damage with solid melee capability.

**Best Backgrounds**: Raider, Assassin, Sellsword, Hunter (for RATT)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 70+ | Medium (pick 3--4 times) |
| FAT | 115+ | High (pick 4--5 times) |
| RES | 35+ | Low (pick 0--1 times) |
| INI | -- | Never pick |
| MATT | 80+ | High (pick 5--6 times) |
| MDEF | 25+ | Medium (pick 3--4 times) |
| RATT | 70+ | Medium (pick 3--4 times) |
| RDEF | -- | Never pick |

**Stat Priority Per Level**: MATT > FAT > MDEF = RATT = HP > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Colossus | HP for frontline phase |
| 4 | Bags and Belts | 4 belt slots for throwing stacks + melee weapon |
| 5 | Recover | Throwing + melee burns through fatigue |
| 6 | Backstabber | +10% melee hit chance |
| 7 | Throwing Mastery | +20% throw damage, +1 range, free draw |
| 8 | Battleforged | Durability for melee phase |
| 9 | Underdog | MDEF protection in melee |
| 10 | Berserk | Kill with a throw, free AP for another throw or move |
| 11 | Killing Frenzy | +25% damage chains |
| Vet 1 | Gifted or Reach Advantage | Stats or defensive MDEF |

**Weapon Choice**:
- **Throwing Axes**: High damage, short range (3 tiles). Best for close-range hybrid play.
- **Javelins**: Longer range (4--5 tiles with mastery), piercing damage. Better for opening volleys.
- **Melee Sidearm**: One-handed axe or mace for the melee phase. Kept in belt slot.

---

### Build 6: Sergeant/Rally ("The Commander")

**Overview**: A support character whose primary role is using Rally the Troops to keep the company's morale stable. Also contributes in combat with a polearm or one-handed weapon from behind the front line.

**Best Backgrounds**: Oathtaker, Adventurous Noble, Monk, Disowned Noble, Flagellant (budget)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 65+ | Medium (pick 2--3 times) |
| FAT | 105+ | Medium (pick 3--4 times) |
| RES | 80+ | Highest (pick every level) |
| INI | -- | Never pick |
| MATT | 75+ | Medium (pick 3--4 times) |
| MDEF | 20+ | Medium (pick 2--3 times) |
| RATT | -- | Never pick |
| RDEF | -- | Never pick |

**Stat Priority Per Level**: RES > MATT = FAT > HP = MDEF > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Rally the Troops | Core skill: morale restoration for allies |
| 4 | Fortified Mind | +15 Resolve for stronger rallies |
| 5 | Backstabber | +10% hit for polearm attacks from behind allies |
| 6 | Polearm Mastery | Attack from 2nd row, no accuracy penalty |
| 7 | Recover | Rally costs 30 fatigue -- need to sustain it |
| 8 | Colossus | Survivability insurance |
| 9 | Battleforged | Durability |
| 10 | Gifted | +1 to all stats including Resolve |
| 11 | Underdog or Rotation | Safety if enemies reach you / rescue allies |
| Vet 1 | Whichever of Underdog/Rotation was not taken at 11 |

**Weapon Choice**:
- **Polearm (Billhook or Pike)**: Attack from behind allies. Billhook can pull enemies out of position.
- **One-Handed Mace + Shield**: If the sergeant ends up in melee, stun dangerous enemies while rallying.

---

### Build 7: Fencer ("The Duellist")

**Overview**: A specialized one-handed sword build that uses the Fencing Sword's Lunge ability and Riposte to control space. Extremely high MDEF makes them nearly unhittable, and Duelist ensures their counterattacks deal meaningful damage.

**Best Backgrounds**: Swordmaster, Assassin, Thief

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 55+ | Low (pick 1--2 times) |
| FAT | 95+ | Medium (pick 2--3 times) |
| RES | 40+ | Low (pick 1--2 times) |
| INI | 150+ | Highest (pick every level) |
| MATT | 90+ | High (pick every level) |
| MDEF | 45+ | High (pick every level) |
| RATT | -- | Never pick |
| RDEF | -- | Never pick (Dodge handles it) |

**Stat Priority Per Level**: INI = MATT = MDEF > FAT > HP = RES > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Dodge | Convert INI to MDEF/RDEF immediately |
| 4 | Sword Mastery | Riposte counter-attacks |
| 5 | Underdog | Protect MDEF when surrounded |
| 6 | Nimble | Damage reduction with light armor |
| 7 | Relentless | Fatigue doesn't reduce INI (massive Dodge buff) |
| 8 | Duelist | +25% armor-piercing on one-handed sword attacks |
| 9 | Recover | Sustain Riposte stance over long fights |
| 10 | Gifted | +1 to all stats |
| 11 | Killing Frenzy | +25% damage for chaining Riposte kills |
| Vet 1 | Berserk or Footwork | Chain kills or escape tool |

**Weapon Choice**:
- **Fencing Sword**: The purpose-built weapon. Lunge (2-tile range attack) + Riposte. Higher initiative bonus than regular swords.
- **One-Handed Sword (Named/Legendary)**: If a named sword with superior stats is found, it may outperform the fencing sword.
- **Armor**: Padded leather or similar (fatigue penalty under 15). NEVER heavy armor -- it destroys the build.

**Gameplay Notes**: Position the fencer on the flank of your formation. Use Riposte, then let enemies waste their turns missing. Each miss triggers a counter-attack with Duelist damage. A fencer with 55+ MDEF (base + Dodge + Underdog) will be missed 80--90% of the time by most enemies.

---

### Build 8: Polearm ("The Reacher")

**Overview**: A second-row fighter who attacks from behind the front line using polearms (pikes, billhooks, polehammers). Never directly engaged in melee, allowing investment in offense over defense.

**Best Backgrounds**: Bastard, Sellsword, Raider, Militia (budget)

**Target Stats at Level 11**:

| Stat | Target | Priority |
|------|--------|----------|
| HP | 65+ | Medium (pick 2--3 times) |
| FAT | 115+ | High (pick 4--5 times) |
| RES | 35+ | Low (pick 0--1 times) |
| INI | 100+ | Low (pick 1--2 times) |
| MATT | 85+ | Highest (pick every level) |
| MDEF | 15+ | Low (pick 1--2 times, insurance only) |
| RATT | -- | Never pick |
| RDEF | -- | Never pick |

**Stat Priority Per Level**: MATT > FAT > HP > INI = MDEF > RES > others never

**Perk Build Order**:

| Level | Perk | Rationale |
|-------|------|-----------|
| 2 | Student | Free XP boost |
| 3 | Backstabber | +10% hit chance (always attacking over allies) |
| 4 | Polearm Mastery | No range penalty, Lunge for 3-tile reach |
| 5 | Recover | Polearm attacks are fatigue-heavy |
| 6 | Colossus | HP insurance in case enemies break through |
| 7 | Gifted | +1 to all stats |
| 8 | Reach Advantage | +MDEF from hits (defensive insurance) |
| 9 | Battleforged | Can wear medium-heavy armor since INI doesn't matter |
| 10 | Berserk | +4 AP on kill, potentially attack twice |
| 11 | Killing Frenzy | +25% damage after kills |
| Vet 1 | Underdog or Footwork | Protection if enemies reach you |

**Weapon Choice**:
- **Pike**: Longest range (2 tiles standard, 3 with Lunge). Lower damage but safest positioning.
- **Billhook**: 2-tile range, special ability pulls enemies 1 tile closer (disrupts formation). Excellent utility.
- **Polehammer**: 2-tile range, higher damage, armor destruction. Best against armored targets.

**Gameplay Notes**: Always position directly behind a frontliner. The frontliner absorbs hits while the polearm user deals damage unmolested. If the front line breaks, use Footwork to retreat. Polearm users pair perfectly with tanks (Build 2) who pin enemies in place.

---

## Appendix A: Stat Growth Cheat Sheet

This table shows the total stat gain from 10 level-ups at each star level, assuming the stat is chosen every single level-up.

| Stars | Min Total (10 picks) | Max Total (10 picks) | Average Total | HP/FAT Min | HP/FAT Max | HP/FAT Average |
|-------|----------------------|----------------------|---------------|------------|------------|----------------|
| 0 | +10 | +30 | +20 | +20 | +40 | +30 |
| 1 | +20 | +40 | +30 | +30 | +50 | +40 |
| 2 | +30 | +50 | +40 | +40 | +60 | +50 |
| 3 | +40 | +60 | +50 | +50 | +70 | +60 |

Realistically, a stat is chosen 5--7 times over 10 level-ups. Multiply accordingly.

## Appendix B: Implementation Constants

```javascript
const STAT_CONFIG = {
  hitpoints:     { baseMin: 40, baseMax: 80, levelMin: 2, levelMax: 7, hpFatBonus: true },
  fatigue:       { baseMin: 85, baseMax: 130, levelMin: 2, levelMax: 7, hpFatBonus: true },
  resolve:       { baseMin: 20, baseMax: 60, levelMin: 1, levelMax: 6, hpFatBonus: false },
  initiative:    { baseMin: 80, baseMax: 135, levelMin: 2, levelMax: 7, hpFatBonus: false },
  meleeAttack:   { baseMin: 35, baseMax: 80, levelMin: 1, levelMax: 6, hpFatBonus: false },
  meleeDefense:  { baseMin: 0,  baseMax: 30, levelMin: 1, levelMax: 6, hpFatBonus: false },
  rangedAttack:  { baseMin: 25, baseMax: 65, levelMin: 1, levelMax: 6, hpFatBonus: false },
  rangedDefense: { baseMin: 0,  baseMax: 15, levelMin: 1, levelMax: 6, hpFatBonus: false },
};

const STAR_ROLL_RANGES = {
  // [min, max] for standard stats
  0: [1, 3],
  1: [2, 4],
  2: [3, 5],
  3: [4, 6],
};

// HP and Fatigue get +1 to both min and max
const STAR_ROLL_RANGES_HP_FAT = {
  0: [2, 4],
  1: [3, 5],
  2: [4, 6],
  3: [5, 7],
};

const LEVEL_UP_CONFIG = {
  maxLevel: 11,
  statsPerLevelUp: 3,
  perksPerLevelUp: 1,
  veteranLevelXP: 4500,
  totalStarPoints: 7,
  maxStarsPerStat: 3,
};

const XP_TABLE = [0, 200, 400, 600, 800, 1100, 1400, 1800, 2300, 2900, 3600];

const MORALE_STATES = ['fleeing', 'breaking', 'wavering', 'steady', 'confident'];

const PERK_TIER_REQUIREMENTS = [0, 1, 3, 5, 7, 8, 10]; // perks needed to unlock tier 1-7
```

## Appendix C: Background Star Weights (Full Table)

| Background | HP | FAT | RES | INI | MATT | MDEF | RATT | RDEF |
|-----------|-----|-----|-----|-----|------|------|------|------|
| Farmhand | 3 | 3 | 1 | 1 | 2 | 1 | 1 | 1 |
| Militia | 2 | 2 | 2 | 1 | 3 | 2 | 1 | 1 |
| Lumberjack | 3 | 3 | 1 | 1 | 2 | 1 | 1 | 1 |
| Hunter | 1 | 2 | 1 | 3 | 1 | 1 | 3 | 2 |
| Bowyer | 1 | 2 | 1 | 2 | 1 | 1 | 3 | 2 |
| Thief | 1 | 2 | 1 | 3 | 2 | 2 | 2 | 2 |
| Assassin | 1 | 2 | 1 | 3 | 3 | 2 | 1 | 1 |
| Monk | 1 | 1 | 3 | 1 | 1 | 1 | 1 | 1 |
| Flagellant | 3 | 2 | 3 | 1 | 1 | 1 | 1 | 1 |
| Wildman | 3 | 3 | 1 | 2 | 2 | 1 | 1 | 1 |
| Raider | 2 | 2 | 1 | 2 | 3 | 2 | 1 | 1 |
| Bastard | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1 |
| Killer on the Run | 1 | 2 | 1 | 2 | 3 | 2 | 1 | 1 |
| Disowned Noble | 1 | 1 | 3 | 2 | 2 | 2 | 2 | 1 |
| Squire | 2 | 2 | 2 | 1 | 3 | 3 | 1 | 1 |
| Hedge Knight | 3 | 2 | 2 | 1 | 3 | 2 | 1 | 1 |
| Sellsword | 2 | 2 | 1 | 2 | 3 | 2 | 1 | 1 |
| Adventurous Noble | 1 | 1 | 3 | 2 | 2 | 2 | 2 | 1 |
| Swordmaster | 1 | 1 | 2 | 3 | 3 | 3 | 1 | 1 |
| Gladiator | 2 | 2 | 1 | 2 | 3 | 2 | 1 | 1 |
| Oathtaker | 2 | 2 | 3 | 1 | 2 | 2 | 1 | 1 |
