# 09 - Dynamic Ability System Design Document

> **Game**: iTactics
> **Engine**: Babylon.js, mobile browser, portrait mode
> **Version**: 1.0
> **Last Updated**: 2026-02-25

---

## Table of Contents

1. [Research: Abilities Across Tactical RPGs](#1-research-abilities-across-tactical-rpgs)
2. [Functional Taxonomy of Abilities](#2-functional-taxonomy-of-abilities)
3. [What Makes Abilities Fun](#3-what-makes-abilities-fun)
4. [Ability Cost Framework](#4-ability-cost-framework)
5. [Generative Ability Architecture](#5-generative-ability-architecture)
6. [Effect Primitives](#6-effect-primitives)
7. [Targeting Primitives](#7-targeting-primitives)
8. [Modifier Primitives](#8-modifier-primitives)
9. [Trigger/Conditional Primitives](#9-triggerconditional-primitives)
10. [Ability Composition Rules](#10-ability-composition-rules)
11. [Power Budget and Costing Formula](#11-power-budget-and-costing-formula)
12. [Ability Generation Algorithm](#12-ability-generation-algorithm)
13. [Synergy System](#13-synergy-system)
14. [Naming and Presentation](#14-naming-and-presentation)
15. [Example Generated Abilities](#15-example-generated-abilities)
16. [Implementation Plan](#16-implementation-plan)

---

## 1. Research: Abilities Across Tactical RPGs

### 1.1 Final Fantasy Tactics

**Iconic abilities and why they work:**

| Ability | Class | What it does | Why it's fun |
|---------|-------|-------------|-------------|
| Arithmeticks | Arithmetician | Cast any learned spell for 0 MP, 0 charge time, ignoring range — targets all units matching a math condition (e.g. "Level % 5 = 0") | Turns combat into a puzzle; exploits systemic rules rather than just "deal X damage" |
| Dual Wield | Ninja | Attack twice per turn with any weapon type | Universal force multiplier — makes every offensive ability in the game better |
| Chakra | Monk | Restore HP and MP for free, no charge time | Self-sustaining fighter who never runs out of resources |
| Geomancy | Geomancer | Instant, free ability that changes based on terrain tile | Forces positional thinking for a new reason (terrain = ability access) |
| Iaido | Samurai | Instant AoE from katana, 1/8 chance katana breaks | Risk/reward tension; your best weapon could shatter |
| Riposte | — (Reaction) | Counter-attack each time you're hit in melee | Turns defense into offense; scales with number of attackers |
| Counter | Monk (Reaction) | Free attack whenever hit by a melee attack | Punishes enemies for engaging you |
| Auto-Potion | Chemist (Reaction) | Automatically use a potion when hit | Sustain without spending turns |
| Teleport | Time Mage (Move) | Move to any tile in range, ignoring obstacles and height | Breaks movement rules; feels powerful because you understand the constraint being broken |
| Move+2 | — (Move) | +2 tiles of movement | Simple but universally valuable |

**FFT's five ability categories:**
1. **Action Abilities**: Primary actions (spells, attacks, heals)
2. **Reaction Abilities**: Passive triggers on being attacked (Counter, Riposte, Auto-Potion)
3. **Support Abilities**: Passive bonuses always active (Dual Wield, Attack Boost)
4. **Movement Abilities**: Passive movement modifications (Teleport, Move+2, Float)
5. **Innate Abilities**: Class-locked always-on passives

**Key synergies:**
- Ninja Dual Wield + Knight Stat-Break = break enemy stats twice per turn
- Black Mage + Arithmeticks = free instant AoE map-clearing every turn
- Monk + Dual Wield + Teleport = self-sustaining teleporting double-puncher
- Any caster + Short Charge = near-instant spells

### 1.2 Battle Brothers

**Iconic abilities:**

| Ability | Weapon/Type | What it does | Why it's fun |
|---------|------------|-------------|-------------|
| Spearwall | Spear (Stance) | Free attack against any enemy entering adjacent hex; stops their movement | Area denial; one unit locks down a chokepoint |
| Riposte | Sword (Stance) | Counter-attack anyone who misses a melee attack on you | Scales with number of attackers; rewards high defense builds |
| Split Shield | Axe | Destroys enemy shield | Enables tactical role (shield-breaker); axes feel mechanically distinct |
| Rotation | Utility | Swap positions with adjacent ally | Team positioning; rescue wounded allies |
| Adrenaline | Perk | Act immediately next turn (breaks turn order) | Devastating when combined with other skills; two actions in a row |
| Indomitable | Perk | 50%+ damage reduction for one round | Ultimate "I will not die" button |
| Rally the Troops | Perk | Restore morale to nearby allies | Prevents cascade routs; clutch team save |
| Recover | Utility | Skip a turn to restore fatigue | Resource management; creates tempo decisions |
| Puncture | Dagger | Bypass armor completely, deal HP damage directly | Anti-armor specialist; rewards bringing the right tool |
| Decapitate | Cleaver | Execute: damage scales with target's missing HP | Finisher fantasy; dramatic kills on wounded enemies |
| Round Swing | 2H Axe | AoE hitting all 6 adjacent tiles | Massive risk/reward (hits everyone, including allies nearby) |
| Shieldwall | Shield (Stance) | Greatly increased defense, bonus to adjacent shield allies | Formation play; knights feel like a wall |

**Key design patterns:**
- **Fatigue as universal cost**: Every action costs fatigue. Heavy armor = more fatigue. This single resource creates enormous build tension.
- **Nimble vs Battleforged**: One defensive perk choice defines the entire build identity.
- **Weapon mastery perks**: Reduce fatigue cost for a weapon family, enabling "fatigue-neutral" builds that can attack forever.

### 1.3 XCOM 2

**Iconic abilities:**

| Ability | Class | What it does | Why it's fun |
|---------|-------|-------------|-------------|
| Serial | Sharpshooter | Each kill refunds the action | Chain kills; enormous ceiling when planned |
| Reaper | Ranger | Chain melee: each kill grants another action at reduced damage | High risk, high reward melee carnage |
| Run and Gun | Ranger | Take action after dashing (3-turn CD) | Breaks the fundamental move-or-shoot constraint |
| Bladestorm | Ranger | Free melee attack on any enemy entering melee range | Creates a danger zone; reactive threat |
| Salvo | Grenadier | Using grenade as first action doesn't end turn | Enables grenade + shoot combos |
| Holo-Targeting | Grenadier | Aiming at target grants +15% hit to all allies | Support role; "painting" targets for the team |
| Phantom | Ranger | Stay concealed when squad is revealed | Asymmetric information; scouting advantage |
| Untouchable | Ranger | After killing, next attack against you auto-misses | Kill-reward defense; encourages aggressive play |
| Return Fire | Sharpshooter | Auto-fire at any enemy that shoots at you | Reactive area denial for ranged units |
| Aid Protocol | Specialist | Grant defense bonus to ally at range via drone | Remote support without spending positioning |
| Rapid Fire | Sharpshooter | Two shots at -15% accuracy each | Quantity vs quality tradeoff |
| Chain Shot | Grenadier | Two shots, second only fires if first hits | High risk, massive reward (double damage) |

**Key design patterns:**
- **Action economy manipulation**: The best abilities give you extra actions (Serial, Reaper) or preserve actions (Salvo, Run and Gun)
- **Reactive abilities**: Bladestorm, Return Fire, Untouchable create "auras" that punish enemy decisions without costing your own actions
- **Cooldown-based power budgets**: Powerful abilities on 3-5 turn cooldowns create rhythm

### 1.4 Into the Breach

**Iconic abilities:**

| Ability | Mech/Type | What it does | Why it's fun |
|---------|----------|-------------|-------------|
| Titan Fist | Combat Mech | Punch: deal damage + push target 1 tile | Displacement is the primary value, not damage |
| Rocket Artillery | Artillery Mech | Damage target + push all adjacent + create smoke behind self | One ability creates 3 distinct tactical effects |
| Grappling Hook | — | Pull mech toward object or pull unit toward mech, 0 damage | Pure utility; zero damage but immense value |
| Frost Beam | Freeze Mech | Freeze everything in a line (can't act, but take no damage) | Delay, not solution; creates timing puzzles |
| Smoke Drop | — | Cover area in smoke; units in smoke can't attack | Area denial that works on both sides |
| Shield | — | Block one instance of damage, prevent status effects | Reactive defense that must be pre-positioned |
| Self-Destruct | Science Mech | Kill self, deal 2 damage + push all adjacent | Ultimate sacrifice play; incredibly dramatic |
| Vice Fist | Judo Mech | Grab adjacent enemy and throw them to target tile | Precise displacement; solves positioning puzzles elegantly |
| Teleporter | Swap Mech | Swap positions with any unit (enemy or ally) | Position manipulation at any range |

**Key design patterns:**
- **Displacement over damage**: Almost every weapon pushes, pulls, or repositions. Damage is secondary.
- **Environmental interaction**: Push into water = instant kill. Push into each other = both damaged. Push into buildings = collateral damage.
- **Perfect information**: No hit chances. All attacks are deterministic. The puzzle is spatial.
- **More problems than solutions**: 4-5 threats vs 3 mechs forces triage every turn.

### 1.5 Darkest Dungeon

**Iconic abilities:**

| Ability | Class | What it does | Why it's fun |
|---------|-------|-------------|-------------|
| Riposte | Highwayman | Counter-attack every attacker for one round | Enormous damage ceiling vs multiple enemies |
| Duelist's Advance | Highwayman | Lunge forward + activate Riposte | Creates oscillating "dance" through party positions |
| Point Blank Shot | Highwayman | Massive damage from position 1, moves self backward | Paired with Advance for back-and-forth rhythm |
| Iron Swan | Hellion | Attack position 4 from position 1 | Breaks the "front can't reach back" rule |
| Battle Ballad | Jester | Party-wide +accuracy, +speed, +crit | Multiplicative team buff; force multiplier |
| Come Hither | Bounty Hunter | Pull enemy to front position | Enables Leper (who can only hit pos 1-2) to reach anyone |
| Mark for Death | Occultist/BH | Mark target; marked targets take bonus damage | "Paint and execute" team coordination |
| Inspiring Tune | Jester | Heal stress from an ally | Prevents cascading afflictions that cause wipes |
| Wyrd Reconstruction | Occultist | Heal 0-30+ HP (random range); can cause bleed | High variance healing; dramatic swings |
| Holy Lance | Crusader | Massive damage when used from positions 3-4 (back row) | Rewards unusual positioning for a melee class |

**Key design patterns:**
- **Position as primary constraint**: Each skill can only be used from specific party positions (1-4) and can only target specific enemy positions (1-4). Position IS the cost.
- **Self-displacement abilities**: Many abilities move the user forward or backward, dynamically reshuffling the party mid-combat.
- **Stress as second health bar**: Stress damage causes afflictions that cascade into party wipes. Stress healing is as critical as HP healing.
- **Mark-and-execute compositions**: Occultist marks, Bounty Hunter/Arbalest deal bonus damage to marked targets.

### 1.6 Fire Emblem (Three Houses/Three Hopes)

**Iconic abilities:**

| Ability | Class/Source | What it does | Why it's fun |
|---------|------------|-------------|-------------|
| Canto | Cavalier (innate) | After acting, use remaining movement to reposition | Hit-and-run; cavalry feels fundamentally different |
| Combat Arts | Weapon skill | Activated abilities that consume weapon durability, bonus damage/effects, prevents follow-up | Explicit tradeoff: one big hit vs two normal hits |
| Personal Abilities | Character-unique | One permanent unique passive per character | Characters feel irreplaceable |
| Class Mastery Reward | Training | Permanent ability earned from mastering a class | Investment rewarded permanently |
| Vantage | Skill | When below 50% HP, always attack first | Desperation play; rewards being near death |
| Wrath | Skill | +20 Crit when below 50% HP | Paired with Vantage = counter-kill before enemy attacks |

**Key design patterns:**
- **Weapon durability as ability cost**: Combat Arts consume extra durability. Cost is tangible and visible.
- **No follow-up tradeoff**: Using a Combat Art prevents doubling, even with speed advantage.
- **Weapon triangle/effectiveness**: Certain abilities gain "effective" damage vs armor/cavalry/flying, creating rock-paper-scissors.

### 1.7 Procedural Systems (Noita, Caves of Qud, Mages of Mystralia)

**Noita — Spell Composition:**
- 422 spells in 8 categories: Projectile (122), Modifier (143), Multicast, Static, Material, Utility, Passive, Other
- Spells placed on wands in order, read left-to-right like a program
- Modifiers apply to the next projectile: `Homing + Damage Up + Fireball` = homing high-damage fireball
- Triggers enable nesting: projectile hits → casts secondary spell from that point
- Wand stats (mana, cast delay, recharge) constrain total power
- Combinatorial space: 143 modifiers x 122 projectiles = enormous emergent possibility

**Caves of Qud — Mutation System:**
- Physical mutations: elemental attacks, wings, extra limbs, force walls
- Mental mutations: psychic damage, mind control, precognition, clairvoyance
- Each mutation has a **level** that scales its power (Freeze 2 turns → Freeze 20 turns)
- Morphotype constraint: physical-only or mental-only, no mixing
- **Glimmer**: mental mutations increase Glimmer, which attracts hunters. Built-in escalating risk for power.
- Defects: permanent penalties that grant bonus creation points. Can't be removed.

**Mages of Mystralia — Spell Crafting:**
- Four spell "focuses": Immedi (melee), Actus (projectile), Creo (conjuration), Ego (self)
- 11 Behavior Runes modify how spell acts (Move, Homing, Duplicate, Detonate)
- Augment Runes modify parameters (size, speed, mana cost)
- Trigger Runes enable chaining: onHit → cast another spell, onTimer → delayed cast
- **Order-dependent**: same runes in different order = different behavior
- Template + Trigger architecture: complex spells = simple spells chained via triggers

---

## 2. Functional Taxonomy of Abilities

Every ability across every game maps to one or more of these **12 functional clusters**. An ability is a combination of 1-3 of these functions.

### Cluster 1: Direct Damage
Single-target or multi-target HP reduction.

| Game | Examples |
|------|----------|
| FFT | Fire, Thunder, Holy |
| BB | Slash, Chop, Strike, Thrust |
| XCOM | Rapid Fire, Chain Shot |
| ItB | Titan Fist, Rocket Artillery |
| DD | Iron Swan, Point Blank Shot |
| FE | Combat Arts |

**Sub-types:**
- **Single-target**: Most basic attacks
- **Multi-target/AoE**: Round Swing, Swing, Crush (hit multiple adjacent)
- **Line**: Frost Beam (hits everything in a line)
- **Execute**: Decapitate, Deathblow (bonus damage based on target's low HP or incapacitated state)
- **Multi-hit**: Stab (2 hits), Triple Lash (3 hits), Rapid Fire (2 shots)

### Cluster 2: Damage-over-Time (DoT)
Applies a recurring damage effect that ticks over multiple turns.

| Game | Examples |
|------|----------|
| BB | Gash (Bleed), Fire Arrow (Burn) |
| DD | Noxious Blast (Blight), Gash (Bleed) |
| ItB | Fire (1 dmg/turn) |
| Qud | Acid, Poison |

**Sub-types:**
- **Bleed**: HP damage per turn, stacks
- **Poison/Blight**: HP damage per turn, may resist
- **Burn**: HP damage per turn, may spread to terrain
- **Acid**: Increases damage taken (multiplicative DoT)

### Cluster 3: Displacement
Move the target (or self) to a different position on the grid.

| Game | Examples |
|------|----------|
| ItB | Push (Titan Fist), Pull (Grappling Hook), Throw (Vice Fist), Swap (Teleporter) |
| BB | Repel (push), Hook (pull), Rotation (ally swap) |
| DD | Come Hither (pull to front), Duelist's Advance (self forward), Point Blank Shot (self backward) |
| FFT | Teleport (self) |

**Sub-types:**
- **Push**: Move target away from user (1-2 tiles)
- **Pull**: Move target toward user (1-2 tiles)
- **Throw**: Move target to a specific tile
- **Swap**: Exchange positions with target
- **Self-advance**: Move self forward (toward enemies)
- **Self-retreat**: Move self backward (to safety)
- **Teleport**: Move self to any valid tile

### Cluster 4: Crowd Control (CC)
Prevent or limit the target's ability to act.

| Game | Examples |
|------|----------|
| BB | Stun (lose turn), Entangle (-AP, -skill) |
| XCOM | Flashbang (-aim, -will) |
| ItB | Freeze (can't act, but immune to damage) |
| DD | Stun, Daze, Horror (stress-based CC) |
| FFT | Stop (frozen in time), Disable (can't use action abilities) |

**Sub-types:**
- **Stun**: Target loses next turn entirely
- **Root/Immobilize**: Target can't move but can still act (Impale, Pin)
- **Daze/Knockdown**: Target loses partial AP
- **Silence/Disable**: Target can't use special abilities
- **Freeze**: Can't act AND immune to damage (ItB)
- **Charm/Domination**: Target fights for you (FFT Orator, Qud Domination)
- **Fear/Panic**: Target acts randomly or flees (BB Morale)

### Cluster 5: Debuff
Reduce target's stats for a duration.

| Game | Examples |
|------|----------|
| BB | Knock Out (-4 AP next turn), Lacerate (-15 initiative), Entangle (-25% melee skill, -2 AP) |
| FFT | Rend Speed (-speed), Rend Power (-attack), Speechcraft (-bravery) |
| XCOM | Holo-Targeting (reverse debuff: +15% for allies = effectively -15% defense) |
| DD | Weakening Curse (-damage), Hex (-accuracy) |

**Sub-types:**
- **Stat reduction**: -X to a specific stat (meleeSkill, defense, initiative, AP)
- **Defense shred**: Remove armor/shield (Split Shield, A.C.I.D.)
- **Vulnerability**: Target takes more damage from all sources (Mark)
- **Resource drain**: Reduce fatigue cap, drain MP

### Cluster 6: Buff
Increase own or ally's stats for a duration.

| Game | Examples |
|------|----------|
| BB | Indomitable (+50% damage reduction), Rally (+morale) |
| DD | Battle Ballad (+accuracy, +speed, +crit), Bolster (+stress resist) |
| XCOM | Aid Protocol (+defense to ally) |
| FFT | Haste (+speed), Protect (+defense), Shell (+magic defense) |
| FE | Rally skills (+stats to nearby allies) |
| ItB | Shield (block one hit) |

**Sub-types:**
- **Stat boost**: +X to a specific stat
- **Damage reduction**: Take less damage (flat or percentage)
- **Damage boost**: Deal more damage (next attack or for duration)
- **Shield/Barrier**: Absorb a fixed amount of damage
- **Morale boost**: Restore or protect morale/stress

### Cluster 7: Healing
Restore HP or cure status effects.

| Game | Examples |
|------|----------|
| FFT | Cure, Curaja, Chakra (free self-heal) |
| DD | Battlefield Medicine (cure bleed/blight), Inspiring Tune (stress heal) |
| XCOM | Medical Protocol (remote heal via drone) |

**Sub-types:**
- **Direct heal**: Restore X HP
- **Heal-over-time (HoT)**: Regeneration effect
- **Status cure**: Remove bleed, poison, stun
- **Stress/morale heal**: Restore morale
- **Sacrifice heal**: Spend own HP to heal ally

### Cluster 8: Reactive/Counter
Trigger automatically when a condition is met (enemy attacks you, enemy enters range, etc.)

| Game | Examples |
|------|----------|
| BB | Spearwall (on enemy enter), Riposte (on enemy miss) |
| XCOM | Bladestorm (on enemy enter melee), Return Fire (on being shot at), Untouchable (dodge after kill) |
| DD | Riposte (counter every attacker) |
| FFT | Counter (on being hit), Blade Grasp (auto-dodge physical), Auto-Potion (on damage) |
| FE | Vantage (attack first when low HP) |

**Sub-types:**
- **Counter-attack**: Free attack when attacked (on hit or on miss)
- **Overwatch/Zone**: Free attack when enemy enters range
- **Dodge/Evade**: Automatically avoid one attack
- **Reflect**: Return damage/effect to attacker
- **On-kill trigger**: Bonus effect when killing (Untouchable, Serial, Reaper)

### Cluster 9: Area Denial
Create persistent effects on tiles that limit or punish movement.

| Game | Examples |
|------|----------|
| ItB | Smoke (can't attack), Fire tiles (1 dmg/turn), A.C.I.D. tiles |
| BB | Spearwall (dangerous zone), Shieldwall (defensive zone) |
| XCOM | Smoke grenade (defense bonus zone), Fire grenade (damage zone) |

**Sub-types:**
- **Danger zone**: Tiles that damage units standing on them
- **Denial zone**: Tiles that prevent movement or action
- **Buff zone**: Tiles that grant bonuses to allies
- **Wall/Barrier**: Impassable tile creation

### Cluster 10: Resource Manipulation
Modify action economy, fatigue, AP, or other resources.

| Game | Examples |
|------|----------|
| BB | Recover (skip turn to restore fatigue), Adrenaline (act immediately) |
| XCOM | Serial (kill refunds action), Salvo (grenade doesn't end turn), Run and Gun (act after dash) |
| FFT | Chakra (restore MP), Arithmeticks (0 MP cost) |
| DD | Meditation (accelerate MP recovery) |

**Sub-types:**
- **Action refund**: Regain AP/action on kill or condition
- **Extra action**: Act again immediately
- **Cost reduction**: Reduce AP/fatigue cost of next action
- **Fatigue recovery**: Restore fatigue mid-combat
- **Turn order manipulation**: Move self earlier or later in initiative

### Cluster 11: Mark/Tag
Apply a marker that enables or enhances follow-up effects from allies.

| Game | Examples |
|------|----------|
| DD | Mark for Death (bonus damage from all sources) |
| XCOM | Holo-Targeting (+15% to all allies targeting this unit) |
| BB | (implicit via surround bonus) |

**Sub-types:**
- **Damage amplifier**: Marked targets take bonus damage
- **Focus fire**: Allies gain accuracy against marked targets
- **Bounty**: Extra rewards from killing marked targets

### Cluster 12: Stance/Mode
Enter a persistent state that modifies behavior until next turn or until cancelled.

| Game | Examples |
|------|----------|
| BB | Spearwall, Riposte, Shieldwall, Indomitable |
| DD | Riposte |
| FE | Canto (post-action movement mode) |
| FFT | (Reaction abilities function as always-on stances) |

**Sub-types:**
- **Offensive stance**: Gain counter-attacks or offensive bonuses
- **Defensive stance**: Gain damage reduction or defense
- **Overwatch**: Free attacks on enemies that enter range
- **Guard**: Redirect attacks from an ally to self

---

## 3. What Makes Abilities Fun

Across all researched games, the most memorable and enjoyable abilities share these properties:

### 3.1 Rule-Breaking
The best abilities violate the game's own rules in a way the player understands.
- Run and Gun breaks move-or-shoot
- Iron Swan breaks front-can't-reach-back
- Canto breaks act-then-done
- Teleport breaks pathing constraints
- Arithmeticks breaks MP/range/charge time

**Design principle**: Every ability should feel like it's cheating a constraint the player has internalized.

### 3.2 Spatial Manipulation
Positioning decisions are more interesting than numerical decisions.
- Into the Breach is almost entirely push/pull
- Darkest Dungeon compositions revolve around position shuffling
- Battle Brothers' Spearwall and Rotation control space

**Design principle**: Abilities that change WHERE things are create deeper decisions than abilities that change HOW MUCH damage.

### 3.3 Chain/Cascade Potential
Abilities that can trigger multiple times create "pop-off" moments.
- Serial/Reaper chain on kills
- Riposte triggers per attacker
- Noita trigger chains

**Design principle**: Include abilities with variable output ceiling based on player skill/planning.

### 3.4 Meaningful Tradeoffs
Every ability should have an obvious cost or limitation.
- Combat Arts prevent follow-up attacks
- Nimble vs Battleforged is a permanent identity choice
- Round Swing hits allies too
- Iaido might break your katana

**Design principle**: Power without cost isn't interesting. The tradeoff IS the fun.

### 3.5 Team Synergy
The best gameplay emerges from abilities that are mediocre alone but powerful in combination.
- Mark + Execute
- Come Hither + Leper (can only hit front positions)
- Holo-Targeting + focus fire
- Duelist's Advance + Point Blank Shot (self-shuffling combo)

**Design principle**: Design abilities in pairs/groups that reward coordination.

---

## 4. Ability Cost Framework

Every ability in the game must be paid for with one or more cost types. This creates the decision space.

### 4.1 Cost Types

| Cost | Description | Effect on gameplay |
|------|------------|-------------------|
| **AP (Action Points)** | Primary per-turn budget (9 AP/turn). Most attacks = 4-6 AP. | Budget allocation; can I attack twice or move + attack? |
| **Fatigue** | Accumulates over the battle. When max fatigue reached, unit can't act. | Long-term resource; punishes spam, rewards pacing |
| **Cooldown** | Can't use again for N turns after use | Timing decisions; save for the right moment |
| **Charges** | Limited uses per battle (1-3) | Scarcity; each use matters enormously |
| **HP sacrifice** | Spend own HP to power the ability | Risk/reward; desperation plays |
| **Positioning** | Can only use from specific positions or facing | Spatial cost; must be in the right place |
| **Turn-ending** | Using this ability ends your turn regardless of remaining AP | Opportunity cost; can't do anything else |
| **Self-debuff** | Suffer a stat penalty after use | Vulnerability window; timing matters |
| **Weapon durability** | Reduce weapon condition (future game feature) | Equipment wear; long-term resource management |

### 4.2 Cost Scaling Principles

- **Weak abilities**: 1 cost type, low values (4 AP, 10 fatigue)
- **Medium abilities**: 1-2 cost types, moderate values (6 AP, 20 fatigue, 2-turn CD)
- **Powerful abilities**: 2-3 cost types, high values (6 AP, 30 fatigue, 3-turn CD, turn-ending)
- **Overwhelming abilities**: Multiple costs, severe limitations (9 AP, 35 fatigue, 4-turn CD, turn-ending, self-debuff)

---

## 5. Generative Ability Architecture

### 5.1 Core Insight

Every ability in every game studied can be decomposed into:

```
Ability = Targeting × Effect × Modifier* × Trigger* × Cost
```

Where:
- **Targeting**: Who/what is affected (single enemy, AoE, self, ally, line, cone)
- **Effect**: What happens (damage, heal, push, stun, buff, debuff, DoT)
- **Modifier**: How the effect is altered (bonus damage, accuracy change, armor ignore, element)
- **Trigger**: When/if a secondary effect fires (on hit, on kill, on being attacked, on turn start)
- **Cost**: What the user pays (AP, fatigue, cooldown, charges, HP)

By defining a library of primitives for each category, we can **compose abilities procedurally** from these building blocks.

### 5.2 Data Structure

```ts
interface GeneratedAbility {
  uid: string;                    // "ga_abc123"
  name: string;                   // "Blazing Riposte"
  description: string;            // Auto-generated from components
  targeting: TargetingPrimitive;
  effects: EffectPrimitive[];     // 1-3 effects
  modifiers: ModifierPrimitive[]; // 0-3 modifiers
  triggers: TriggerPrimitive[];   // 0-1 triggers
  cost: AbilityCost;
  powerBudget: number;            // Computed total power score
  tags: string[];                 // For synergy lookups: ["damage", "counter", "fire"]
  weaponReq: WeaponFamily[];      // Empty = any weapon
  classReq: string[];             // Empty = any class
  tier: 1 | 2 | 3;               // Complexity tier
}
```

---

## 6. Effect Primitives

Each effect is a discrete, composable unit of gameplay consequence.

### 6.1 Damage Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `dmg_weapon` | Weapon Strike | `mult: 0.3-2.0` | mult × 10 | Deal weapon damage × multiplier |
| `dmg_fixed` | Fixed Damage | `amount: 3-20` | amount × 0.8 | Deal flat damage (ignores weapon) |
| `dmg_execute` | Execute | `hpThreshold: 0.25-0.50, bonusMult: 0.5-1.5` | 12 | Bonus damage scaling with target's missing HP |
| `dmg_multihit` | Multi-Hit | `hits: 2-3, multPerHit: 0.4-0.7` | hits × multPerHit × 12 | Multiple independent attacks |
| `dmg_splash` | Splash | `splashDmg: 0.3-0.6` | 6 | Adjacent enemies take splash damage |

### 6.2 DoT Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `dot_bleed` | Bleed | `dmgPerTurn: 2-8, turns: 2-4` | dmg × turns × 0.5 | HP damage per turn, stacks |
| `dot_poison` | Poison | `dmgPerTurn: 3-6, turns: 2-3` | dmg × turns × 0.6 | HP damage per turn, doesn't stack |
| `dot_burn` | Burn | `dmgPerTurn: 3-5, turns: 2-3` | dmg × turns × 0.7 | HP damage per turn, can spread |

### 6.3 Displacement Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `disp_push` | Push | `distance: 1-2` | distance × 5 | Push target away from user |
| `disp_pull` | Pull | `distance: 1-2` | distance × 5 | Pull target toward user |
| `disp_swap` | Swap | — | 8 | Swap positions with target |
| `disp_self_advance` | Advance | `distance: 1-2` | distance × 3 | Move self toward target |
| `disp_self_retreat` | Retreat | `distance: 1-2` | distance × 3 | Move self away after acting |

### 6.4 Crowd Control Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `cc_stun` | Stun | `chance: 30-100` | chance × 0.2 | Target loses next turn |
| `cc_root` | Root | `turns: 1-2` | turns × 8 | Target can't move but can act |
| `cc_daze` | Daze | `apLoss: 2-4` | apLoss × 3 | Target loses AP next turn |
| `cc_disarm` | Disarm | `chance: 25-60` | chance × 0.15 | Target drops weapon |

### 6.5 Debuff Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `debuff_stat` | Weaken | `stat: StatKey, amount: 3-15, turns: 1-3` | amount × turns × 0.3 | Reduce target stat |
| `debuff_vuln` | Vulnerability | `bonusDmg: 15-30, turns: 2-3` | bonusDmg × turns × 0.15 | Target takes +X% damage from all sources |
| `debuff_armor` | Armor Shred | `amount: 3-10` | amount × 1.2 | Reduce armor durability permanently |

### 6.6 Buff Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `buff_stat` | Fortify | `stat: StatKey, amount: 5-20, turns: 1-3` | amount × turns × 0.3 | Increase own stat |
| `buff_shield` | Shield | `amount: 5-15` | amount × 0.8 | Absorb next N damage before HP |
| `buff_dmgReduce` | Harden | `pct: 20-50, turns: 1-2` | pct × turns × 0.2 | Reduce incoming damage by X% |
| `buff_dmgBoost` | Empower | `pct: 15-40, turns: 1-2` | pct × turns × 0.15 | Increase outgoing damage by X% |

### 6.7 Healing Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `heal_flat` | Heal | `amount: 3-15` | amount × 0.8 | Restore X HP to target |
| `heal_cure` | Cure | `effects: string[]` | effects.length × 4 | Remove status effects |
| `heal_regen` | Regen | `amount: 2-5, turns: 2-4` | amount × turns × 0.5 | HP restored per turn |

### 6.8 Stance Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `stance_counter` | Riposte Stance | `maxCounters: 1-3, hitPenalty: 10-20` | maxCounters × 6 | Counter-attack melee attackers |
| `stance_overwatch` | Overwatch Stance | `maxTriggers: 1-3` | maxTriggers × 6 | Free attack on enemies entering range |
| `stance_guard` | Guard Stance | `ally: "adjacent"` | 10 | Redirect attacks from adjacent ally to self |
| `stance_defensive` | Defensive Stance | `defBonus: 10-25` | defBonus × 0.5 | Increased defense until next turn |

### 6.9 Mark Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `mark_target` | Mark | `bonusDmg: 10-25, turns: 2-3` | bonusDmg × turns × 0.12 | All allies deal bonus damage to target |
| `mark_reveal` | Reveal | `turns: 2-3` | turns × 2 | Target can't benefit from cover/terrain defense |

### 6.10 Resource Effects

| ID | Name | Parameters | Power | Description |
|----|------|-----------|-------|-------------|
| `res_apRefund` | Momentum | `amount: 2-4` | amount × 3 | Refund AP on kill |
| `res_fatigueRestore` | Second Wind | `amount: 10-25` | amount × 0.4 | Restore fatigue |
| `res_extraAction` | Adrenaline | — | 15 | Take an additional action this turn |

---

## 7. Targeting Primitives

| ID | Name | Parameters | Power Mult | Description |
|----|------|-----------|-----------|-------------|
| `tgt_single_enemy` | Single Enemy | `range: 1-6` | 1.0 | Target one enemy |
| `tgt_single_ally` | Single Ally | `range: 1-3` | 1.0 | Target one ally |
| `tgt_self` | Self | — | 0.8 | Target self only |
| `tgt_aoe_adjacent` | Adjacent AoE | `count: 2-6` | 0.7 + count × 0.1 | Hit N adjacent tiles (may include allies if count > 3) |
| `tgt_aoe_radius` | Radius AoE | `radius: 1-2, range: 2-5` | 1.2 + radius × 0.3 | All units in radius at range |
| `tgt_line` | Line | `length: 2-4` | 0.9 + length × 0.1 | All units in a line |
| `tgt_cone` | Cone | `range: 2-3` | 1.3 | Fan shape from user |
| `tgt_all_allies` | All Allies | — | 1.8 | Every ally on the field |
| `tgt_all_enemies` | All Enemies | — | 2.5 | Every enemy on the field (extremely expensive) |

---

## 8. Modifier Primitives

Modifiers alter how effects work. 0-3 per ability.

| ID | Name | Parameters | Power Add | Description |
|----|------|-----------|----------|-------------|
| `mod_accuracy` | Accuracy | `bonus: -25 to +20` | bonus × 0.3 | Modify hit chance |
| `mod_armorIgnore` | Armor Pierce | `pct: 0.1-1.0` | pct × 8 | Fraction of damage bypassing armor |
| `mod_armorDmg` | Armor Break | `mult: 1.2-2.0` | (mult-1) × 10 | Multiplier to armor durability damage |
| `mod_headTarget` | Head Hunter | `bonusChance: 25-75` | bonusChance × 0.1 | Increased chance to hit head |
| `mod_ignoreShield` | Shield Bypass | — | 5 | Attack ignores shield defense bonus |
| `mod_noCounter` | Swift Strike | — | 3 | Does not trigger reactive abilities |
| `mod_friendlyFire` | Reckless | — | -4 | AoE can hit allies too (cost reduction) |
| `mod_requireState` | Opportunist | `state: "stunned" \| "bleeding" \| "below50hp"` | -5 | Only usable against targets in a specific state (cost reduction, power boost) |
| `mod_selfMove` | Rush | `direction: "forward" \| "backward", distance: 1-2` | distance × 2 | Move self as part of the attack |
| `mod_turnEnding` | Committed | — | -6 | Ends turn after use (cost reduction) |

---

## 9. Trigger/Conditional Primitives

Triggers add reactive or conditional behavior. 0-1 per ability.

| ID | Name | Parameters | Power Add | Description |
|----|------|-----------|----------|-------------|
| `trg_onKill` | On Kill | — | 8 | Secondary effect fires when this ability kills the target |
| `trg_onHit` | On Hit | `chance: 30-100` | chance × 0.08 | Secondary effect fires when this ability hits |
| `trg_onMiss` | On Miss | — | 3 | Secondary effect fires when this ability misses |
| `trg_onTakeDamage` | Retaliation | — | 7 | Passive: fires when user takes damage |
| `trg_onAllyHit` | Protector | — | 6 | Passive: fires when adjacent ally takes damage |
| `trg_onEnemyEnter` | Sentinel | — | 8 | Passive: fires when enemy enters adjacent hex |
| `trg_turnStart` | Dawn | — | 4 | Fires at the start of each of your turns |
| `trg_belowHP` | Desperation | `threshold: 25-50` | 5 | Fires/activates when user drops below HP threshold |

---

## 10. Ability Composition Rules

### 10.1 Tier Structure

Abilities are generated in three complexity tiers:

| Tier | Effects | Modifiers | Triggers | Examples |
|------|---------|-----------|----------|---------|
| **Tier 1** (Basic) | 1 | 0-1 | 0 | Slash, Heal, Push |
| **Tier 2** (Advanced) | 1-2 | 1-2 | 0-1 | Riposte, Crippling Shot, Gash |
| **Tier 3** (Elite) | 2-3 | 1-3 | 0-1 | Serial, Decapitate + Bleed, AoE Stun + Debuff |

### 10.2 Composition Constraints

These rules prevent degenerate or nonsensical combinations:

1. **Max 3 effects per ability**. More creates confusion.
2. **Max 1 trigger per ability**. Multiple triggers are unreadable.
3. **Stances can't have displacement effects** (you're staying put).
4. **Self-target can't have CC effects** (can't stun yourself — except as cost, see below).
5. **AoE + Execute is forbidden** (execute is a single-target fantasy).
6. **Healing + Damage on same target is forbidden** (pick one intention).
7. **On-kill triggers require a damage effect** (can't kill without damage).
8. **Displacement effects on self-targeting must be advance or retreat** (can't push yourself).
9. **Multi-hit caps at 3** to keep turns fast on mobile.
10. **Friendly fire modifier only valid on AoE targeting with count > 2**.

### 10.3 Synergy Tags

Each effect and modifier generates tags. Abilities with matching tags synergize:

```
dmg_weapon → ["damage", "weapon"]
dot_bleed → ["damage", "bleed", "dot"]
cc_stun → ["control", "stun"]
stance_counter → ["reactive", "counter", "melee"]
mark_target → ["support", "mark"]
mod_armorIgnore → ["armor_pierce"]
trg_onKill → ["on_kill", "chain"]
```

Synergy rules (see section 13) use these tags.

### 10.4 Weapon Family Affinity

Certain effect/modifier combinations are more likely with certain weapon families:

| Weapon Family | Favored Effects | Favored Modifiers |
|--------------|----------------|-------------------|
| Sword | stance_counter, dmg_weapon, buff_stat | mod_accuracy(+), mod_selfMove |
| Axe | debuff_armor, dmg_splash, dmg_weapon(high mult) | mod_armorDmg, mod_headTarget |
| Mace | cc_stun, cc_daze, dmg_weapon | mod_armorIgnore |
| Spear | stance_overwatch, dmg_weapon, disp_push | mod_accuracy(+high) |
| Dagger | dmg_multihit, dmg_execute, dot_bleed | mod_armorIgnore(high), mod_noCounter |
| Polearm | disp_push, disp_pull, dmg_weapon | mod_selfMove |
| Bow | dot_burn, debuff_stat, cc_root | mod_accuracy |
| Cleaver | dot_bleed, dmg_execute, dmg_weapon | mod_headTarget |
| Flail | cc_daze, debuff_stat, dmg_multihit | mod_ignoreShield |

"Favored" means +30% probability weight when generating for that family. Non-favored effects can still appear, creating unusual and interesting combinations.

---

## 11. Power Budget and Costing Formula

### 11.1 Power Budget Calculation

Every ability has a computed **power score** from its components:

```
totalPower = sum(effect.power) × targeting.powerMult + sum(modifier.powerAdd) + sum(trigger.powerAdd)
```

### 11.2 Cost Derivation

The cost is derived from the total power score:

| Power Range | AP Cost | Fatigue | Additional Costs |
|-------------|---------|---------|-----------------|
| 1-8 | 3 | 8-12 | — |
| 9-14 | 4 | 12-18 | — |
| 15-20 | 5 | 18-25 | — |
| 21-28 | 6 | 22-30 | Cooldown 2 turns |
| 29-35 | 6 | 25-35 | Cooldown 3 turns |
| 36-45 | 7-8 | 30-40 | Cooldown 3-4 turns, may be turn-ending |
| 46+ | 8-9 | 35-50 | Cooldown 4+, charges 1-2, turn-ending |

### 11.3 Cost Reduction Modifiers

Some modifiers reduce effective power, allowing stronger effects at lower cost:

| Modifier | Power Reduction | Tradeoff |
|---------|----------------|----------|
| `mod_friendlyFire` | -4 | AoE hits allies too |
| `mod_requireState` | -5 | Only works on stunned/bleeding/low-HP targets |
| `mod_turnEnding` | -6 | Ends turn after use |
| `mod_accuracy` (negative) | bonus × 0.3 (negative) | Harder to hit |
| Self-debuff effect | -(debuff power × 0.5) | Suffer a penalty |

### 11.4 Example Power Calculations

**Puncture** (existing):
- `dmg_weapon(mult: 0.5)` → power 5
- `mod_armorIgnore(pct: 1.0)` → power +8
- `mod_accuracy(bonus: +15)` → power +4.5
- `tgt_single_enemy` → mult 1.0
- Total: (5) × 1.0 + 8 + 4.5 = **17.5** → AP 5, Fatigue 18-25

**Riposte** (planned):
- `stance_counter(maxCounters: 3, hitPenalty: 15)` → power 18
- `tgt_self` → mult 0.8
- Total: (18) × 0.8 = **14.4** → AP 5, Fatigue 20-25

**Decapitate** (planned):
- `dmg_execute(hpThreshold: 0.50, bonusMult: 1.0)` → power 12
- `dmg_weapon(mult: 1.5)` → power 15
- `tgt_single_enemy` → mult 1.0
- Total: (12 + 15) × 1.0 = **27** → AP 6, Fatigue 25-30, CD 2

**Serial-like** (on-kill chain):
- `dmg_weapon(mult: 1.0)` → power 10
- `trg_onKill` → power +8
- `res_apRefund(amount: 4)` → power 12
- `tgt_single_enemy` → mult 1.0
- Total: (10 + 12) × 1.0 + 8 = **30** → AP 6, Fatigue 30, CD 3

---

## 12. Ability Generation Algorithm

### 12.1 Inputs

```ts
function generateAbility(
  tier: 1 | 2 | 3,
  weaponFamily: WeaponFamily | null,  // null = universal
  classId: string | null,             // null = any class
  partyLevel: number,                 // affects power scaling
  rng: () => number,
): GeneratedAbility
```

### 12.2 Algorithm

```
1. ROLL number of effects based on tier:
   - Tier 1: 1 effect
   - Tier 2: 1-2 effects (60% one, 40% two)
   - Tier 3: 2-3 effects (30% two, 70% three... but clip at 3)

2. SELECT primary effect:
   - Weight by weapon family affinity (+30% for favored effects)
   - Select from effect pool appropriate to tier
   - Roll parameters within allowed ranges

3. SELECT secondary effects (if any):
   - Must be compatible with primary (check composition rules)
   - Prefer complementary clusters:
     damage + DoT, damage + displacement, damage + CC,
     buff + stance, heal + cure, mark + debuff
   - Roll parameters

4. SELECT targeting:
   - Constrained by effects (stances must be self-target, heals can be ally/self)
   - Weight by tier: Tier 1 favors single-target, Tier 3 allows AoE
   - Roll parameters

5. ROLL modifier count (0 to tier):
   - Select modifiers compatible with effects and targeting
   - Roll parameters

6. ROLL trigger (tier 2+, 30% chance tier 2, 50% chance tier 3):
   - Select trigger compatible with effects
   - On-kill requires damage effect
   - Stance triggers (onEnemyEnter, onTakeDamage) require stance effect

7. CALCULATE power budget from all components

8. DERIVE cost from power budget using cost table

9. GENERATE name from effect/modifier/trigger combination (see section 14)

10. GENERATE description from components

11. VALIDATE: reject and re-roll if:
    - Total power < 3 (too weak to be interesting)
    - Total power > 55 (too expensive to ever use)
    - Violates composition rules
    - Duplicate of an existing ability in the pool
```

### 12.3 Tier Distribution by Party Level

| Party Level | Tier 1 Weight | Tier 2 Weight | Tier 3 Weight |
|------------|--------------|--------------|--------------|
| 1-2 | 80% | 20% | 0% |
| 3-4 | 50% | 40% | 10% |
| 5-6 | 20% | 50% | 30% |
| 7+ | 10% | 40% | 50% |

### 12.4 Ability Acquisition

Generated abilities can be acquired through:

1. **Recruit unique skills**: Each recruit is generated with 4 unique skills that unlock at levels 5, 10, 15, and 20. These form a coherent theme with built-in synergies (see Section 17).
2. **Equipment-attached**: Generated weapons (from the shop system) can have an attached ability, usable only while that weapon is equipped.
3. **Scroll/Tome drops**: After battle, occasionally find a "scroll" that teaches one ability. Consumed on use.
4. **Perk unlock**: Certain perks grant a specific generated ability or unlock a new effect category.

---

## 13. Synergy System

Synergies are about concrete mechanical combos: one ability creates a condition, another ability exploits it. This is the core of what makes tactical combat interesting — planning multi-step plays across turns and across units.

### 13.1 The Setup/Payoff Model

Every ability that participates in a synergy has one of two roles:

- **Setup**: Creates a condition on the battlefield (applies bleed, creates a hazard tile, stuns a target, marks an enemy, positions an ally)
- **Payoff**: Gains a bonus when that condition exists (bonus damage vs bleeding targets, extra crit vs stunned, free action when a debuff lands)

Some abilities are both — they exploit one condition while setting up another, creating chains.

```ts
interface SynergyTag {
  creates?: string[];   // conditions this ability puts into the world
  exploits?: string[];  // conditions this ability benefits from
}

// Examples:
// Gashing Slash: creates ["bleeding"]
// Bloodletter's Strike: exploits ["bleeding"], creates ["bleeding"]  (chain!)
// Coup de Grace: exploits ["stunned"]
// Concussive Blow: creates ["stunned"]
```

### 13.2 Condition-Based Combos

These are the concrete combo patterns the system should generate. Each is a setup + payoff pair where having both abilities on one unit (or across the team) creates emergent power.

#### Combo Family 1: Apply DoT → Exploit DoT

| Setup Ability | Payoff Ability | Combo Name | Mechanic |
|--------------|---------------|-----------|----------|
| Any ability that applies **Bleed** | "Blood Feast" — deal +30% damage to bleeding targets | Hemorrhage | Setup unit gashes, payoff unit finishes |
| Any ability that applies **Bleed** | "Sanguine Drain" — heal 2 HP per turn from each bleeding enemy within 2 hexes | Leech | Sustain from your own DoTs |
| Any ability that applies **Bleed** | "Red Mist" — execute threshold raised to 50% HP against bleeding targets | Bleed Out | Bleed softens, then one big kill |
| Any ability that applies **Poison** | "Pandemic" — when a poisoned target dies, adjacent enemies gain the poison | Plague | DoT becomes AoE through kills |
| Any ability that applies **Burn** | "Fan the Flames" — deal +2 burn damage/turn to already burning targets | Inferno | Stacking fire from multiple sources |
| Any ability that applies **Burn** | "Ash Strike" — deal +40% damage to burning targets, but extinguishes the burn | Consume | Big one-shot that eats the DoT |

**Self-synergy example (one unit):**
Level 5 skill: "Lacerating Slash" — deal 60% weapon damage, apply Bleed (3 dmg/turn, 3 turns).
Level 10 skill: "Blood Feast" — deal 100% weapon damage, +30% vs bleeding targets.
→ The unit gashes first, then follows up with a boosted attack. The player learns to always gash before striking.

#### Combo Family 2: Apply CC → Exploit CC

| Setup | Payoff | Combo Name | Mechanic |
|-------|--------|-----------|----------|
| Any ability that applies **Stun** | "Coup de Grace" — deal 200% weapon damage to stunned targets, 100% armor ignore | Execution | Stun sets up a devastating kill |
| Any ability that applies **Stun** | "Pillage" — attacks against stunned targets cost 0 fatigue | Exploitation | Stun creates free attacks |
| Any ability that applies **Root** | "Pinpoint Strike" — +25% accuracy and +50% head hit chance against rooted targets | Sitting Duck | Immobile targets are easy prey |
| Any ability that applies **Daze** (-AP) | "Overwhelm" — gain +2 AP when attacking a dazed target | Press the Advantage | Daze creates action economy swing |
| Any ability that **reduces defense** | "Precision Strike" — deal +20% damage to targets below 20 defense | Exposed | Strip defense then exploit low defense |

**Team synergy example (two units):**
Unit A (Mace): "Concussive Blow" — deal 50% damage, stun target 1 turn.
Unit B (Dagger): "Coup de Grace" — deal 200% damage to stunned targets.
→ Unit A stuns on their turn, Unit B executes on theirs. Classic "wombo combo."

#### Combo Family 3: Displacement → Hazard

| Setup | Payoff | Combo Name | Mechanic |
|-------|--------|-----------|----------|
| Any ability that creates **fire tiles** | Any ability that **pushes** an enemy | Furnace | Push enemies into your fire |
| Any ability that creates **poison tiles** | Any ability that **pulls** an enemy | Toxic Trap | Pull enemies into poison |
| Any overwatch/spearwall stance | Any ability that **pushes** enemies toward the watcher | Kill Corridor | Push enemies through your ally's overwatch zone |
| Any ability that **pushes** | Any ability that triggers "on enemy displaced" — deal 60% weapon damage as a free attack | Billiards | Every push creates a free hit |
| Any ability that **swaps** positions | Any ability that has "on adjacency" bonus — +15% damage to enemies adjacent when your turn starts | Ambush Swap | Swap to surround then exploit adjacency |

**Self-synergy example (one unit):**
Level 5: "Flame Strike" — deal 80% weapon damage, target tile becomes fire (3 dmg/turn, 2 turns).
Level 10: "Thundering Shove" — push target 2 tiles, if they land on a hazard tile, they take double hazard damage this turn.
→ The unit strikes to create fire, then pushes the next enemy into it. Or creates fire one turn, repositions and pushes on the next.

#### Combo Family 4: Debuff → Chain Reaction

| Setup | Payoff | Combo Name | Mechanic |
|-------|--------|-----------|----------|
| Any ability that applies any **debuff** | "Opportunist's Eye" — gain +1 AP whenever any enemy receives a new debuff (max 2/turn) | Cascade | Debuffing creates extra actions, which enable more debuffs |
| Any ability that applies any **debuff** | "Weakness Exploit" — deal +5% damage per active debuff on the target (stacks) | Pile On | More debuffs = more damage |
| Any ability that applies **vulnerability** (mark/expose) | "Focus Fire" — next 3 attacks from any ally against marked target deal +10 flat bonus damage | Kill Order | Mark concentrates team damage |
| Any ability that applies **defense reduction** | "Shatter" — if target's defense is below 10, stun them for 1 turn | Broken Guard | Defense shred eventually stuns |

**Chain example (one unit, 3 turns):**
Turn 1: "Enfeebling Strike" — deal 80% damage, reduce target meleeDefense by 8 for 3 turns. (Opportunist's Eye procs: +1 AP)
Turn 2: Use bonus AP for "Crippling Blow" — deal 80% damage, reduce target movementPoints by 2. (Opportunist's Eye procs: +1 AP, Weakness Exploit: +10% damage because 2 debuffs active)
Turn 3: "Finishing Strike" — Weakness Exploit now at +15% because 3 debuffs active. Target can barely move or fight back.

#### Combo Family 5: Kill → Reward

| Setup (Kill Condition) | Payoff | Combo Name | Mechanic |
|----------------------|--------|-----------|----------|
| Kill any enemy | "Blood Rush" — refund 3 AP on kill | Chain Killer | Kill chain across multiple enemies in one turn |
| Kill any enemy | "Triumph" — gain +15% damage for 2 turns after killing | Momentum | Each kill makes the next fight easier |
| Kill any enemy | "Battle Trance" — restore 15 fatigue on kill | Tireless | Killing sustains your resource pool |
| Kill any enemy | "Reaper's Harvest" — heal 5 HP on kill | Vampiric | Killing sustains your HP |
| Kill any enemy | "Dread Aura" — all enemies within 3 hexes lose 10 morale on kill | Terror | Killing destabilizes enemy morale |

**Self-synergy example:**
Level 5: "Gashing Slash" — bleed for setup.
Level 10: "Blood Feast" — bonus damage vs bleeding.
Level 15: "Reaper's Harvest" — heal 5 HP on kill.
→ The unit bleeds targets to soften them, finishes with Blood Feast for boosted damage, and heals from each kill. A self-sustaining damage dealer.

#### Combo Family 6: Buff Ally → Amplified Action

| Setup | Payoff | Combo Name | Mechanic |
|-------|--------|-----------|----------|
| Any ability that grants ally **+damage** | Ally uses **AoE attack** | Force Multiplier | Damage buff × multiple targets = enormous value |
| Any ability that grants ally **+accuracy** | Ally uses **low-accuracy high-damage** ability | Guided Strike | Buff patches the weakness of a powerful but inaccurate skill |
| "Guard" stance (redirect attacks to self) | Self has **counter-attack** stance active | Living Shield | Intercept attacks AND counter them |
| Any ability that grants **Shield** (absorb damage) | Unit uses **self-damaging** ability (HP sacrifice) | Calculated Risk | Shield absorbs the self-damage cost |
| Any ability that grants **damage reduction** | Unit activates **counter-attack** stance | Iron Riposte | Take reduced damage while counter-attacking everyone |

**Team synergy example:**
Unit A (Support): "War Cry" — grant adjacent ally +30% damage for 1 turn.
Unit B (2H Axe): "Round Swing" — AoE hitting all 6 adjacent tiles at 80% damage.
→ Buff then swing: each of those 6 targets takes 104% damage instead of 80%. A support turn invested amplifies the attacker's AoE dramatically.

#### Combo Family 7: Positioning → Exploitation

| Setup | Payoff | Combo Name | Mechanic |
|-------|--------|-----------|----------|
| Any ability that moves self **forward** | Next attack from this position deals +20% damage | Charging Strike | Momentum from movement |
| Any ability that moves self **backward** after attacking | "Safe Distance" — gain +15 ranged defense until next turn when retreating | Hit and Run | Attack then retreat to safety |
| "Rotation" (swap with ally) | Ally has "on arriving in melee range" — free attack on all adjacent enemies | Cavalry Charge | Swap ally into a surrounded position for AoE |
| Any ability that creates **adjacency** (pull/push to be adjacent) | "Point Blank" — +50% damage against adjacent enemies when you have a ranged weapon | Close Quarters | Pull them close, then blast |

### 13.3 Condition Types (Exhaustive List)

Every condition that can exist on the battlefield, used for setup/payoff matching:

| Condition | Created By | Example Payoffs |
|-----------|-----------|----------------|
| `bleeding` | Gash, Lacerate, Bleed-on-hit effects | Bonus dmg, heal from bleeders, execute threshold |
| `poisoned` | Poison abilities, poison tiles | Spread on death, bonus dmg, prevent healing |
| `burning` | Fire abilities, fire tiles | Fan flames, consume for burst, spread |
| `stunned` | Stun abilities, mace family | Execute, free attacks, guaranteed crits |
| `rooted` | Root/pin abilities | Accuracy bonus, head hit bonus, AoE centered on them |
| `dazed` | Daze abilities, AP drain | Gain AP when attacking, overwhelm |
| `defense_reduced` | Defense debuff abilities | Bonus dmg below threshold, stun when broken |
| `marked` | Mark abilities | Team bonus damage, team accuracy, bounty |
| `low_hp` (below 30%) | Damage | Execute bonus, morale pressure, fear |
| `displaced_this_turn` | Push/pull/throw/swap | Free attacks on displaced, bonus dmg |
| `hazard_tile` (fire, poison, acid) | Tile-creating abilities | Push into hazard, double hazard dmg |
| `adjacent_to_ally` | Movement, positioning | Surround bonus, flanking, combo triggers |
| `debuffed` (any debuff active) | Any debuff ability | Bonus per debuff, chain AP, pile on |
| `buffed_ally` (any buff on ally) | Any buff ability | Amplified attacks, extended buff |
| `in_stance` | Stance activation | Counter, overwatch, guard interactions |

### 13.4 Synergy Probability in Generation

Synergies should emerge naturally from the generation system, not be forced. The mechanism:

1. **Condition tags on effects**: Every effect primitive declares what conditions it `creates` and what conditions it `exploits`.
2. **Weighted pairing**: When generating an ability for a unit that already has abilities, the generator weights effects that exploit conditions created by existing abilities (+40% weight).
3. **Theme coherence**: Recruit skill trees use themes (see Section 17) that naturally cluster setup/payoff pairs.
4. **Cross-unit discovery**: The UI highlights when two units on the roster have setup/payoff matches, encouraging the player to deploy them together.

### 13.5 Anti-Synergy (Exploit Prevention)

| Rule | Rationale |
|------|-----------|
| "Gain AP on debuff" caps at +2 AP per turn | Prevents infinite action loops |
| "Heal from bleeding enemies" caps at 4 HP per turn total | Prevents unkillable bleed tanks |
| DoT stacking caps at 15 damage/turn per type per target | Prevents instant kills from pure DoT stacking |
| On-kill AP refund caps at +4 AP per turn | Prevents clearing entire enemy teams in one turn |
| Buff amplification from stacking caps at +50% total | Prevents exponential buff multiplication |
| Hazard tile damage doubling only triggers once per displacement | Prevents push-pull ping-pong on hazard tiles |

---

## 14. Naming and Presentation

### 14.1 Name Generation

Ability names are composed from template patterns based on their components:

```
Pattern: [Prefix] + [Core Verb] + [Suffix]
```

**Prefixes** (from modifiers/triggers):

| Source | Prefixes |
|--------|---------|
| mod_armorIgnore | "Piercing", "Sundering", "Rending" |
| mod_headTarget | "Decisive", "Precise", "Targeted" |
| mod_accuracy(+) | "True", "Guided", "Aimed" |
| mod_accuracy(-) | "Wild", "Reckless", "Frenzied" |
| mod_ignoreShield | "Bypassing", "Slipping" |
| mod_selfMove(forward) | "Charging", "Lunging", "Rushing" |
| mod_selfMove(backward) | "Retreating", "Fading", "Dancing" |
| mod_friendlyFire | "Reckless", "Wild", "Indiscriminate" |
| trg_onKill | "Relentless", "Unstoppable", "Reaping" |
| trg_onHit | "Infectious", "Venomous", "Jarring" |
| trg_onTakeDamage | "Retaliating", "Vengeful", "Thorned" |
| trg_onEnemyEnter | "Watchful", "Vigilant", "Sentinel's" |
| trg_belowHP | "Desperate", "Frantic", "Last" |
| dot_bleed | "Bleeding", "Gashing", "Lacerating" |
| dot_poison | "Toxic", "Venomous", "Noxious" |
| dot_burn | "Blazing", "Scorching", "Searing" |

**Core verbs** (from primary effect):

| Effect | Verbs |
|--------|-------|
| dmg_weapon | "Strike", "Slash", "Blow", "Cut", "Chop", "Thrust", "Shot" |
| dmg_multihit | "Flurry", "Barrage", "Combo", "Onslaught" |
| dmg_execute | "Execution", "Finisher", "Deathblow", "Coup de Grace" |
| cc_stun | "Stun", "Bash", "Concussion", "Daze" |
| cc_root | "Pin", "Snare", "Root", "Bind" |
| disp_push | "Shove", "Repel", "Knockback", "Slam" |
| disp_pull | "Hook", "Drag", "Yank", "Grapple" |
| disp_swap | "Switch", "Trade", "Swap" |
| stance_counter | "Riposte", "Retort", "Stance", "Guard" |
| stance_overwatch | "Watch", "Vigil", "Ward", "Sentinel" |
| buff_stat | "Rally", "Bolster", "Fortify", "Empower" |
| buff_dmgReduce | "Brace", "Harden", "Steel", "Bulwark" |
| heal_flat | "Mend", "Heal", "Restore", "Salve" |
| mark_target | "Mark", "Brand", "Tag", "Hex" |
| debuff_stat | "Weaken", "Curse", "Sap", "Diminish" |
| res_apRefund | "Rush", "Surge", "Momentum" |

**Suffixes** (from targeting, secondary effects):

| Source | Suffixes |
|--------|---------|
| tgt_aoe_adjacent (3+) | "of Havoc", "Sweep", "Whirlwind" |
| tgt_line | "Line", "Pierce", "Through" |
| tgt_all_allies | "of Valor", "Anthem", "Banner" |
| Secondary heal | "of Mending", "of Life" |
| Secondary buff | "of Iron", "of Might", "of Speed" |
| Secondary debuff | "of Ruin", "of Weakness" |
| Secondary displacement | "and Shove", "and Pull" |

**Example compositions:**
- `mod_armorIgnore` + `dmg_weapon` + `tgt_single` = "Piercing Strike"
- `trg_onKill` + `res_apRefund` + `dmg_weapon` = "Relentless Surge"
- `dot_bleed` + `dmg_weapon` + `tgt_aoe_adjacent(3)` = "Lacerating Sweep"
- `trg_belowHP` + `dmg_execute` + `mod_headTarget` = "Desperate Deathblow"
- `stance_counter` + `dot_bleed` = "Bleeding Riposte"
- `buff_dmgReduce` + `stance_defensive` + `tgt_self` = "Iron Bulwark"

### 14.2 Description Generation

Auto-generated from components in a formulaic but readable style:

```
"{targeting description}. {primary effect description}. {modifier descriptions}. {trigger description}. {cost description}."
```

Examples:
- "Strike one adjacent enemy. Deal 120% weapon damage. Ignores 30% of armor. On kill: refund 4 AP. [6 AP, 25 FAT, CD 3]"
- "Enter a counter-stance. Counter-attack up to 3 melee attackers at -15% accuracy. Counters apply Bleed (3/turn, 2 turns). [5 AP, 25 FAT]"
- "Target all adjacent enemies (up to 4). Deal 80% weapon damage. -10% accuracy per target. May hit allies. [6 AP, 30 FAT, CD 2]"

### 14.3 Quality/Rarity Colors

Generated abilities inherit quality tiers from how they're acquired:

| Tier | Color | Acquisition |
|------|-------|------------|
| Common (Tier 1) | White #ffffff | Level-up choice, basic scrolls |
| Uncommon (Tier 2) | Green #44cc44 | Level-up choice (higher level), equipment-attached |
| Rare (Tier 3) | Blue #4488ff | Rare scrolls, boss drops, high-level equipment |
| Unique | Purple #aa44ff | Hand-crafted signature abilities (1 per class) |

---

## 15. Example Generated Abilities

### 15.1 Tier 1 Examples

**Aimed Thrust** (Spear)
- Targeting: Single enemy, range 1
- Effects: `dmg_weapon(mult: 1.0)`
- Modifiers: `mod_accuracy(bonus: +10)`
- Cost: 4 AP, 12 FAT
- Power: 10 × 1.0 + 3 = 13
- Tags: [damage, weapon]

**Shield Bash** (Shield)
- Targeting: Single enemy, range 1
- Effects: `dmg_fixed(amount: 8)`, `disp_push(distance: 1)`
- Modifiers: none
- Cost: 4 AP, 14 FAT
- Power: (6.4 + 5) × 1.0 = 11.4
- Tags: [damage, displacement]

**Quick Mend** (Any)
- Targeting: Self
- Effects: `heal_flat(amount: 6)`
- Cost: 3 AP, 8 FAT
- Power: 4.8 × 0.8 = 3.8
- Tags: [heal]

### 15.2 Tier 2 Examples

**Gashing Slash** (Sword/Cleaver)
- Targeting: Single enemy, range 1
- Effects: `dmg_weapon(mult: 0.6)`, `dot_bleed(dmg: 4, turns: 3)`
- Modifiers: none
- Cost: 4 AP, 14 FAT
- Power: (6 + 6) × 1.0 = 12
- Tags: [damage, weapon, bleed, dot]
- Synergy: Pairs with Execute abilities (Bloodthirst synergy)

**Crippling Shot** (Bow)
- Targeting: Single enemy, range = weapon range
- Effects: `dmg_weapon(mult: 0.8)`, `debuff_stat(stat: movementPoints, amount: 2, turns: 2)`
- Modifiers: none
- Cost: 5 AP, 18 FAT
- Power: (8 + 3.6) × 1.0 = 11.6
- Tags: [damage, weapon, debuff]

**Vengeful Counter** (Sword)
- Targeting: Self
- Effects: `stance_counter(maxCounters: 2, hitPenalty: 15)`
- Modifiers: none
- Trigger: none (stance activates on being attacked)
- Cost: 5 AP, 20 FAT
- Power: 12 × 0.8 = 9.6
- Tags: [reactive, counter, melee]

**Rallying Cry** (Any, support)
- Targeting: All allies
- Effects: `buff_stat(stat: meleeSkill, amount: 8, turns: 2)`
- Cost: 5 AP, 22 FAT, CD 3
- Power: 4.8 × 1.8 = 8.6
- Tags: [buff, support]

**Marked for Death** (Any)
- Targeting: Single enemy, range 1-2
- Effects: `mark_target(bonusDmg: 20, turns: 2)`
- Cost: 4 AP, 10 FAT
- Power: 4.8 × 1.0 = 4.8
- Tags: [support, mark]

### 15.3 Tier 3 Examples

**Reaping Strike** (Axe/Cleaver)
- Targeting: Single enemy, range 1
- Effects: `dmg_weapon(mult: 1.2)`, `dmg_execute(hpThreshold: 0.50, bonusMult: 0.8)`
- Modifiers: `mod_armorDmg(mult: 1.5)`
- Trigger: `trg_onKill` → `res_apRefund(amount: 3)`
- Cost: 6 AP, 28 FAT, CD 3
- Power: (12 + 12) × 1.0 + 5 + 8 + 9 = 46
- Tags: [damage, weapon, execute, on_kill, chain, armor_pierce]
- Synergy: Bloodthirst (if unit also has a bleed ability)

**Sentinel's Vigil** (Spear/Polearm)
- Targeting: Self
- Effects: `stance_overwatch(maxTriggers: 3)`, `buff_stat(stat: meleeDefense, amount: 10, turns: 1)`
- Modifiers: `mod_accuracy(bonus: +5)`
- Cost: 5 AP, 22 FAT
- Power: (18 + 3) × 0.8 + 1.5 = 18.3
- Tags: [reactive, overwatch, melee, buff, defensive]

**Blazing Flurry** (Dagger)
- Targeting: Single enemy, range 1
- Effects: `dmg_multihit(hits: 3, multPerHit: 0.4)`, `dot_burn(dmg: 3, turns: 2)`
- Modifiers: `mod_armorIgnore(pct: 0.5)`, `mod_accuracy(bonus: -10)`
- Cost: 6 AP, 25 FAT, CD 2
- Power: (14.4 + 4.2) × 1.0 + 4 + (-3) = 19.6
- Tags: [damage, weapon, multihit, dot, burn, armor_pierce]

**Iron Bulwark** (Shield, defensive)
- Targeting: Self
- Effects: `buff_dmgReduce(pct: 40, turns: 1)`, `stance_guard(ally: "adjacent")`
- Modifiers: none
- Cost: 4 AP, 18 FAT, CD 2
- Power: (8 + 10) × 0.8 = 14.4
- Tags: [buff, defensive, reactive, guard]

**Whirlwind of Ruin** (2H Axe)
- Targeting: Adjacent AoE (count: 6)
- Effects: `dmg_weapon(mult: 0.8)`, `debuff_stat(stat: meleeDefense, amount: 5, turns: 1)`
- Modifiers: `mod_accuracy(bonus: -15)`, `mod_friendlyFire`
- Cost: 6 AP, 30 FAT, CD 2
- Power: (8 + 1.5) × 1.3 + (-4.5) + (-4) = 3.85 → adjusted up to minimum viable ~15 (friendly fire + accuracy penalty compensate)
- Tags: [damage, weapon, aoe, debuff]

**Leaping Deathblow** (Dagger)
- Targeting: Single enemy, range 1
- Effects: `dmg_execute(hpThreshold: 0.25, bonusMult: 1.5)`
- Modifiers: `mod_selfMove(forward, 2)`, `mod_armorIgnore(pct: 0.5)`, `mod_requireState("stunned")`
- Cost: 5 AP, 18 FAT
- Power: (12) × 1.0 + 4 + 4 + (-5) = 15 (reduced by require state)
- Tags: [damage, execute, armor_pierce, movement]
- Synergy: Coup de Grace with a stun-capable ally

---

## 16. Implementation Plan

### 16.1 Phase 1: Foundation (extend existing SkillData.ts)

**New file**: `src/data/AbilityGenerator.ts`
- Define all primitive interfaces (EffectPrimitive, TargetingPrimitive, etc.)
- Implement `generateAbility()` function
- Implement power budget calculator
- Implement cost deriver
- Implement name generator
- Implement description generator

**Modify**: `src/data/SkillData.ts`
- Add `GeneratedAbility` alongside existing static `SkillDef`
- Add resolution function: if ability ID starts with `ga_`, look up from registry
- Keep all existing static skills (basic_attack, puncture, stun, etc.) working

**Modify**: `src/save/SaveManager.ts`
- Add `abilityRegistry: Record<string, GeneratedAbility>` to SaveData
- Add ability assignments per roster member

### 16.2 Phase 2: Combat Integration

**Modify**: `src/combat/DamageCalculator.ts`
- Extend `resolveSkillAttack` to handle generated ability effects
- Add effect resolution for each effect primitive type

**Modify**: `src/combat/SkillExecutor.ts`
- Add execution logic for new effect types (displacement, DoT application, mark, buff/debuff)
- Add stance management for new stance types (counter, overwatch, guard)

**Modify**: `src/combat/CombatManager.ts`
- Wire up trigger system (onKill, onHit, onEnemyEnter, etc.)
- Add cooldown tracking per entity per ability
- Add charge tracking per entity per ability

### 16.3 Phase 3: Acquisition and UI

**Modify**: `src/scenes/DemoBattle.ts`
- Add ability drops on battle victory (scrolls)
- Wire up level-up ability selection

**Modify**: `src/ui/ManagementScreen.ts`
- Add ability management tab (view/assign abilities per unit)
- Show ability details with effect descriptions

**Modify**: `src/ui/ActionBar.ts`
- Show available abilities for current unit (beyond basic attack + weapon skills)
- Show cooldown/charge state
- Tooltip with description

### 16.4 Phase 4: Synergy and Polish

- Implement synergy detection and bonus application
- Add visual indicators for synergy pairs in UI
- Add team synergy display in management screen
- Balance pass: adjust power budget weights based on playtesting
- Add equipment-attached abilities to generated weapons

---

## 17. Recruit Skill Generation

Every recruit is generated with 4 **unique skills** that unlock at levels 5, 10, 15, and 20. These skills are the primary way units differentiate themselves. The system guarantees that each recruit's skills form a coherent theme with built-in synergies — so leveling a unit always feels like building toward something powerful.

### 17.1 Skill Tiers by Level

| Unlock Level | Tier | Role | Power Budget | Typical Shape |
|-------------|------|------|-------------|---------------|
| 5 | T1 (Foundation) | Simple setup or basic tool | 3–5 | Single-target, 1 effect, no conditions |
| 10 | T2 (Development) | Payoff for T1 or second setup | 5–8 | 1–2 effects, may exploit a condition |
| 15 | T3 (Specialization) | Advanced combo piece | 8–12 | Multi-effect, conditional bonuses, AoE possible |
| 20 | T4 (Capstone) | Powerful ability exploiting the full chain | 12–18 | Multi-effect, multi-condition, defines the unit's identity |

**Key constraint**: T1 should always be immediately useful on its own. A recruit shouldn't feel weak until level 10. T2–T4 get progressively better *if* the player uses the full kit, but each should still be functional standalone.

### 17.2 Skill Themes

A **theme** is a curated package of setup/payoff pairings that determines what kind of skills a recruit generates. Each theme draws primarily from 1–2 combo families (Section 13.2) and specifies:

- **Primary condition**: The condition the theme revolves around
- **Secondary condition** (optional): A second condition for T3/T4 chain combos
- **Combo families used**: Which of the 7 combo families supply the setup/payoff patterns
- **Stat affinity**: Which weapon families and playstyles the theme works best with

#### Theme Table

| Theme | Primary Condition | Secondary | Combo Families | Best With |
|-------|------------------|-----------|---------------|-----------|
| **Bleeder** | `bleeding` | `low_hp` | DoT→Exploit, Kill→Reward | Swords, Cleavers, Daggers |
| **Poisoner** | `poisoned` | `debuffed` | DoT→Exploit, Debuff→Chain | Daggers, Ranged |
| **Pyromaniac** | `burning` | `hazard_tile` | DoT→Exploit, Displacement→Hazard | Any melee, special weapons |
| **Crusher** | `stunned` | `defense_reduced` | CC→Exploit, Debuff→Chain | Maces, Hammers, 2H weapons |
| **Lockdown** | `rooted` | `dazed` | CC→Exploit, Positioning→Exploit | Spears, Polearms |
| **Executioner** | `low_hp` | `bleeding` | Kill→Reward, DoT→Exploit | Axes, Cleavers, Daggers |
| **Skirmisher** | `displaced_this_turn` | `hazard_tile` | Displacement→Hazard, Positioning→Exploit | Shields, Spears, any 1H |
| **Opportunist** | `debuffed` | `dazed` | Debuff→Chain, CC→Exploit | Any, favors multi-hit weapons |
| **Vanguard** | `adjacent_to_ally` | `buffed_ally` | Buff→Amplify, Positioning→Exploit | 2H weapons, Shields |
| **Sentinel** | `in_stance` | `adjacent_to_ally` | Buff→Amplify, CC→Exploit | Spears, Shields, Polearms |
| **Reaper** | Kill triggers | `low_hp` | Kill→Reward, CC→Exploit | 2H weapons, Axes |
| **Tactician** | `marked` | `debuffed` | Debuff→Chain, Buff→Amplify | Ranged, Support-oriented |

### 17.3 Theme Skill Progressions

Each theme defines a **skill progression template** — not fixed skills, but a formula for what each tier *does*. The generator picks specific effects, targeting, and numbers from the primitives (Sections 6–8) to fill in each slot, so two "Bleeder" recruits won't have identical skills.

#### Progression Template Structure

```
T1 (Level 5):  SETUP — Apply primary condition
T2 (Level 10): PAYOFF_A — Exploit primary condition (or second setup)
T3 (Level 15): SETUP_B + PAYOFF_B — Apply secondary condition, or combo effect
T4 (Level 20): CAPSTONE — Exploit both conditions, or powerful on-kill/on-trigger chain
```

#### Full Theme Progressions

**Bleeder**
```
T1: "Lacerating Strike" — Deal 70% weapon damage, apply Bleed (3 dmg/turn, 3 turns)
    creates: [bleeding]
T2: "Blood Feast" — Deal 100% weapon damage. +30% vs bleeding targets
    exploits: [bleeding]
T3: "Hemorrhage" — Deal 80% weapon damage. If target is bleeding, apply a second
    Bleed stack (5 dmg/turn, 2 turns) and reduce their healing received by 50%
    exploits: [bleeding], creates: [bleeding, debuffed]
T4: "Exsanguinate" — Deal 120% weapon damage. Deal bonus damage equal to
    2× target's active bleed damage/turn. If this kills, heal HP equal to overkill damage
    exploits: [bleeding, low_hp], on-kill: heal
```

**Crusher**
```
T1: "Concussive Blow" — Deal 60% weapon damage, 75% chance to Stun for 1 turn
    creates: [stunned]
T2: "Coup de Grace" — Deal 100% weapon damage. +80% damage vs stunned targets,
    100% armor ignore vs stunned
    exploits: [stunned]
T3: "Shatterguard" — Deal 80% weapon damage. Reduce target melee/ranged defense
    by 10 for 2 turns. If target is already defense-reduced, Stun for 1 turn
    creates: [defense_reduced], exploits: [defense_reduced] → creates: [stunned]
T4: "Demolisher" — Deal 130% weapon damage to target and all adjacent enemies.
    Stunned targets take double damage. Reduce all hit targets' defense by 8 for 2 turns
    exploits: [stunned], creates: [defense_reduced], AoE
```

**Skirmisher**
```
T1: "Shoulder Check" — Deal 40% weapon damage, push target 1 tile
    creates: [displaced_this_turn]
T2: "Flame Strike" — Deal 80% weapon damage. Target tile becomes fire
    (3 dmg/turn, 2 turns)
    creates: [hazard_tile]
T3: "Battering Ram" — Push target 2 tiles. If they land on a hazard tile,
    deal 60% weapon damage and double hazard damage this turn. If they collide
    with another unit, both take 40% weapon damage
    exploits: [hazard_tile], creates: [displaced_this_turn]
T4: "Wrecking Ball" — Push all adjacent enemies 2 tiles (AoE). Each pushed enemy
    that lands on a hazard or collides takes 80% weapon damage. Gain +2 AP for each
    enemy pushed into a hazard
    exploits: [hazard_tile], creates: [displaced_this_turn], on-push-into-hazard: +AP
```

**Opportunist**
```
T1: "Enfeebling Strike" — Deal 80% weapon damage. Reduce target's melee defense
    by 8 for 2 turns
    creates: [debuffed, defense_reduced]
T2: "Opportunist's Eye" — Passive/stance: Gain +1 AP whenever any enemy within
    3 hexes receives a new debuff (max +2 AP per turn)
    exploits: [debuffed]
T3: "Crippling Flurry" — Deal 50% weapon damage ×2 hits. Each hit reduces target
    AP by 1 next turn. +5% damage per active debuff on target
    creates: [dazed, debuffed], exploits: [debuffed]
T4: "Plague of Weakness" — Deal 60% weapon damage to all enemies within 2 hexes.
    Apply -5 defense, -5 accuracy, -1 AP for 2 turns. Deal +8% damage per
    debuff already on each target
    AoE, creates: [debuffed, defense_reduced, dazed], exploits: [debuffed]
```

**Executioner**
```
T1: "Raking Cut" — Deal 90% weapon damage. If target below 50% HP, apply Bleed
    (4 dmg/turn, 2 turns)
    exploits: [low_hp] → creates: [bleeding]
T2: "Smell Blood" — Passive: +10% damage against targets below 50% HP.
    +20% against targets below 25% HP
    exploits: [low_hp]
T3: "Eviscerate" — Deal 150% weapon damage. +50% damage against bleeding targets.
    Execute threshold: kill outright if target below 20% HP
    exploits: [bleeding, low_hp]
T4: "Reaper's Toll" — Deal 120% weapon damage. Kill outright if target below 30% HP.
    On kill: gain +3 AP, +15% damage for 2 turns. On kill of bleeding target:
    also heal 8 HP
    exploits: [low_hp, bleeding], on-kill: +AP, +damage, conditional heal
```

**Sentinel**
```
T1: "Spearwall" — Stance: free attack against any enemy entering adjacent hexes
    (max 3 per round). Ends on your next turn
    creates: [in_stance]
T2: "Hold the Line" — Passive: while in a stance, gain +10 melee defense and
    +10 ranged defense
    exploits: [in_stance]
T3: "Stalwart Presence" — Stance: adjacent allies gain +8 melee defense. When
    an adjacent ally is attacked, 50% chance to redirect the attack to you
    creates: [in_stance, adjacent_to_ally buff]
T4: "Unbreakable Wall" — Stance: free counter-attack on ALL incoming melee attacks
    (no limit). Adjacent allies gain +12 defense. If 3+ enemies are adjacent,
    gain +3 AP at start of your next turn
    exploits: [in_stance, adjacent_to_ally], creates: [in_stance]
```

**Reaper**
```
T1: "Heavy Strike" — Deal 120% weapon damage. High fatigue cost
    Simple strong attack (setup for kill chain)
T2: "Blood Rush" — Passive: on kill, refund 3 AP
    exploits: kill trigger
T3: "Triumphant Cleave" — Deal 100% weapon damage to target + all adjacent enemies.
    On kill: +15% damage for 2 turns
    AoE, on-kill: buff self
T4: "Avatar of Death" — Deal 140% weapon damage. On kill: refund all AP spent on
    this ability, restore 10 fatigue, gain +20% damage for 1 turn. Can chain
    indefinitely (capped at +4 AP/turn from refunds)
    on-kill: full AP refund + fatigue + damage, anti-synergy cap applied
```

### 17.4 Generation Algorithm

```
function generateRecruitSkills(theme: Theme, rng: RNG): RecruitSkillSet {
  const skills: GeneratedAbility[] = [];

  for (const tier of [T1, T2, T3, T4]) {
    // 1. Get the progression template for this theme + tier
    const template = theme.progressions[tier];

    // 2. Select specific effect primitives matching the template role
    //    (setup/payoff/chain) from the primitive pools (Section 6-8)
    const effects = selectEffects(template.role, template.conditions, rng);

    // 3. Select targeting primitive appropriate for tier
    //    T1: mostly single-target; T3-T4: can be AoE
    const targeting = selectTargeting(tier, rng);

    // 4. Apply any modifiers (conditional bonuses, on-kill triggers)
    const modifiers = selectModifiers(template.modifiers, rng);

    // 5. Calculate power budget and derive costs
    const power = calculatePower(effects, targeting, modifiers);
    const costs = deriveCosts(power, tier);

    // 6. Assign synergy tags (creates/exploits)
    const synergyTags = deriveSynergyTags(effects, modifiers);

    // 7. Generate name and description
    const name = generateAbilityName(effects, tier, theme);
    const description = generateDescription(effects, targeting, modifiers, costs);

    // 8. Add variation: ±10% on numeric values
    applyVariation(effects, rng, 0.10);

    skills.push({ name, description, tier, effects, targeting, modifiers,
                  costs, synergyTags, power });
  }

  return { theme: theme.id, skills };
}
```

### 17.5 Variation Within Themes

Two recruits with the same theme should feel similar but not identical. Variation comes from:

| Variation Source | Example |
|-----------------|---------|
| **Numeric ranges** | Bleeder T1 might apply 3 or 4 bleed/turn, 2 or 3 turn duration |
| **Effect swaps** | Crusher T3 could reduce melee def *or* ranged def *or* both at reduced values |
| **Targeting variation** | Reaper T3 could be "adjacent enemies" (cone 3) or "2-hex radius" or "line 3" |
| **Modifier substitution** | Executioner T4 on-kill reward could be +AP *or* +damage *or* heal — weighted by theme but not fixed |
| **Secondary condition** | Bleeder T3 could add the healing reduction debuff *or* an accuracy debuff *or* a movement debuff |
| **Cost trade-offs** | Same ability might roll higher fatigue but lower AP, or vice versa |

This ensures that even if two recruits share a theme, the player will want to read the specifics and may value one over the other for different team compositions.

### 17.6 Cross-Unit Synergy Probability

The system is designed so that synergies emerge *between* units, not just within a single unit's kit:

**Same-theme synergy**: Two Bleeders have overlapping conditions — one's T1 bleed sets up the other's T2 payoff. High probability, but somewhat redundant.

**Cross-theme synergy (designed)**: Certain theme pairs have natural overlaps:

| Theme A | Theme B | Shared Condition | Combo |
|---------|---------|-----------------|-------|
| Bleeder | Executioner | `bleeding`, `low_hp` | Bleeder softens with DoT, Executioner finishes |
| Crusher | Opportunist | `stunned`, `debuffed` | Crusher stuns, Opportunist gains AP from the debuff |
| Pyromaniac | Skirmisher | `hazard_tile`, `displaced` | Pyro creates fire, Skirmisher pushes enemies in |
| Lockdown | Executioner | `rooted`, `low_hp` | Lockdown pins target, Executioner has easy kill |
| Sentinel | Vanguard | `in_stance`, `adjacent_to_ally` | Sentinel's guard stance protects the Vanguard's position |
| Tactician | Any damage theme | `marked`, `debuffed` | Tactician marks/debuffs, damage dealer finishes |
| Poisoner | Opportunist | `poisoned`, `debuffed` | Poisoner's DoT counts as debuff for Opportunist's chain |

**Probability math**: With 12 themes and 4-person parties:
- Each unit has 1 theme → party has 4 themes
- Each theme pair has ~40% chance of at least one condition overlap (from the table above: 21 out of 66 possible pairs = 32%, plus some incidental overlaps)
- With 6 pairs in a 4-unit party: ~87% chance of at least one cross-unit synergy pair
- This is the "decent chance of synergies" the design targets

### 17.7 Recruit Generation Integration

When a new recruit is generated (for hiring in the management screen):

```ts
interface RecruitDef {
  // ... existing fields (name, stats, background, etc.)

  skillTheme: string;           // "bleeder", "crusher", etc.
  uniqueSkills: {
    level5:  GeneratedAbility;  // Unlocked at level 5
    level10: GeneratedAbility;  // Unlocked at level 10
    level15: GeneratedAbility;  // Unlocked at level 15
    level20: GeneratedAbility;  // Unlocked at level 20
  };
}
```

**Display in recruitment UI**:
- Show the theme name as a trait: "Bleeder", "Crusher", etc.
- Show T1 skill name and brief description (the recruit's "preview" ability)
- T2–T4 skill names are shown but descriptions are hidden ("Unlocks at level 10") — gives the player something to anticipate
- Theme icon/color in the recruit list for quick scanning

**Display in unit info / management**:
- All unlocked skills shown with full descriptions
- Locked skills show name + unlock level
- Synergy indicators: if another rostered unit has a matching condition tag, show a link icon between the two skills

### 17.8 Balancing Recruit Skills vs Other Abilities

Recruit unique skills should be the **primary** source of interesting abilities, but not the only one:

| Source | Quantity | Power Level | Uniqueness |
|--------|----------|-------------|-----------|
| Recruit unique skills (4 per unit) | Fixed, always available | T1–T4 (3–18 power) | Unique to this recruit |
| Weapon-family skills (existing) | 1–2 per weapon type | Low-medium | Shared by weapon type |
| Equipment-attached skills | 0–1 per generated weapon | T1–T2 (3–8 power) | Tied to item, can be traded |
| Scroll drops | Occasional | T1–T3 (3–12 power) | Teachable to any unit |

A fully leveled unit at level 20 might have:
- 1 basic attack
- 1–2 weapon-family skills (e.g., Puncture for daggers, Stun for maces)
- 4 unique recruit skills (T1–T4)
- 0–1 equipment skill
- 0–2 scroll-learned skills
- **Total: 6–10 abilities** — manageable for mobile UI, rich enough for tactical depth

---

## Appendix A: Complete Ability Catalog from Research

Every distinct ability documented across all 7 games, clustered by function:

### A.1 Direct Damage (42 abilities)

| # | Name | Game | Weapon/Class | Mult | Special |
|---|------|------|-------------|------|---------|
| 1 | Slash | BB | 1H Sword | 100% | +5% hit (family) |
| 2 | Split | BB | 2H Sword | 120% | +15% armor damage |
| 3 | Swing | BB | 2H Greatsword | 90% | AoE 3 targets, -5% hit/target |
| 4 | Chop | BB | 1H Axe | 100% | +10% armor damage (family) |
| 5 | Headhunter | BB | 1H Axe | 110% | +100% head hit, +10% ignore head armor |
| 6 | Round Swing | BB | 2H Axe | 80% | AoE ALL 6 adjacent, -15% hit |
| 7 | Split Man | BB | 2H Axe | 130% | +50% armor damage |
| 8 | Strike | BB | 1H Mace | 100% | +10% stun chance (family) |
| 9 | Shatter | BB | 2H Mace | 120% | +30% armor dmg, 33% destroy armor |
| 10 | Crush | BB | 2H Hammer | 100% | AoE 3 tiles, +20% stun |
| 11 | Bash | BB | 1H Flail | 100% | Ignores shield defense (family) |
| 12 | Lash | BB | 1H Flail | 80% | +50% head hit, ignores shield |
| 13 | Triple Lash | BB | 3-Head Flail | 60% ×3 | 3 independent hits |
| 14 | Hail | BB | 2H Flail | 70% | AoE 7 tiles, -20% hit, friendly fire |
| 15 | Slash | BB | 1H Cleaver | 100% | +10% vs unarmored |
| 16 | Stab | BB | Dagger | 50% ×2 | Two quick stabs, 3 AP |
| 17 | Puncture | BB | Dagger | 40% | 100% armor ignore, -10% hit |
| 18 | Deathblow | BB | Dagger | 200% | Only vs incapacitated, 50% armor ignore |
| 19 | Shiv | BB | Knife/Dagger | 30% | 2 AP (fastest attack) |
| 20 | Thrust | BB | 1H Spear | 100% | +20% hit (family) |
| 21 | Jab | BB | 1H Spear | 50% | 3 AP, quick poke |
| 22 | Thrust | BB | Polearm | 100% | 2-tile range, can't hit adjacent |
| 23 | Lunge | BB | Pike | 120% | 2-tile, +10% armor pen, AP refund on kill |
| 24 | Aimed Shot | BB | Bow | 100% | Full accuracy ranged |
| 25 | Quick Shot | BB | Short/Hunting Bow | 80% | 3 AP, -15% hit |
| 26 | Rain of Arrows | BB | War Bow | 50% | AoE 7 tiles, -25% hit, indirect fire |
| 27 | Shoot | BB | Crossbow | 100% | Must reload after |
| 28 | Aimed Shot | BB | Crossbow | 120% | +10% hit, must reload |
| 29 | Throw | BB | Throwing | 100% | No range penalty close (family) |
| 30 | Aimed Throw | BB | Throwing | 120% | +10% hit |
| 31 | Barrage | BB | Darts | 60% ×2 | Two throws |
| 32 | Fire | BB | Handgonne | 100% | -15 morale, 50% scatter |
| 33 | Point Blank | BB | Handgonne | 150% | Adjacent only, +30% hit, -20 morale, 5% self-damage |
| 34 | Serial | XCOM | Sharpshooter | 100% | Each kill refunds action |
| 35 | Reaper | XCOM | Ranger | 100%→decay | Chain melee, reduced per kill |
| 36 | Rapid Fire | XCOM | Sharpshooter | 100% ×2 | Two shots, -15% each |
| 37 | Chain Shot | XCOM | Grenadier | 100% ×2 | Second fires only if first hits |
| 38 | Iron Swan | DD | Hellion | High | Hit pos 4 from pos 1 |
| 39 | Point Blank Shot | DD | Highwayman | Very high | From pos 1, move self back |
| 40 | Holy Lance | DD | Crusader | High | From pos 3-4 only |
| 41 | Titan Fist | ItB | Combat Mech | 2 dmg | + push 1 tile |
| 42 | Rocket Artillery | ItB | Artillery Mech | 2 dmg | + push adjacent + smoke behind |

### A.2 Damage-over-Time (12 abilities)

| # | Name | Game | DoT Type | Damage/Turn | Duration |
|---|------|------|----------|------------|----------|
| 1 | Gash | BB (Sword) | Bleed | 5 | 2 turns, stacks to 15/turn |
| 2 | Gash | BB (Cleaver) | Bleed | 5 | 3 turns, stacks to 20/turn |
| 3 | Lacerate | BB (Dagger) | Bleed | 5 | 2 turns, -15 initiative |
| 4 | Disembowel | BB (2H Cleaver) | Bleed | 15 | 3 turns, -15 max fatigue |
| 5 | Reap | BB (2H Cleaver) | Bleed | 8 | 2 turns, AoE 3 targets |
| 6 | Fire Arrow | BB (Bow) | Burn | 10 | 2 turns, can ignite terrain |
| 7 | Noxious Blast | DD (Plague Doctor) | Blight | 4-7 | 3 turns |
| 8 | Incision | DD (Plague Doctor) | Bleed | 3-4 | 3 turns |
| 9 | Rend | DD (Abomination) | Bleed | 3-5 | 3 turns |
| 10 | Poisoned Blade | FFT | Poison | Varies | Until cured |
| 11 | Bio | FFT (Black Mage) | Poison | % max HP | 3 turns |
| 12 | Fire (tile) | ItB | Burn | 1 | Until extinguished |

### A.3 Displacement (16 abilities)

| # | Name | Game | Type | Distance | Additional |
|---|------|------|------|----------|-----------|
| 1 | Repel | BB (Polearm) | Push | 1 tile | +30% dmg if blocked behind |
| 2 | Hook | BB (Polearm) | Pull | 1 tile | -3 AP on target |
| 3 | Rotation | BB (Utility) | Swap | Adjacent ally | Team positioning |
| 4 | Shield Bash | BB (Shield) | Push | 1 tile | + 15-25 damage, 25% stun |
| 5 | Knock Back | BB (Shield) | Push | 1 tile | 100% success, no damage |
| 6 | Come Hither | DD (BH) | Pull | To front pos | — |
| 7 | Duelist's Advance | DD (HW) | Self-advance | Forward 1 | + activate Riposte |
| 8 | Point Blank Shot | DD (HW) | Self-retreat | Back 1 | + massive damage |
| 9 | Holy Lance | DD (Crusader) | Self-advance | Forward 2 | + high damage |
| 10 | Titan Fist | ItB | Push | 1 tile | + 2 damage |
| 11 | Grappling Hook | ItB | Pull (self or target) | Variable | 0 damage |
| 12 | Vice Fist | ItB (Judo) | Throw | To specific tile | Precise placement |
| 13 | Teleporter | ItB (Swap) | Swap | Any range | Any unit |
| 14 | Self-Destruct | ItB (Science) | Push all adjacent | 1 tile | Kill self + 2 damage each |
| 15 | Teleport | FFT (Time Mage) | Self-teleport | In range | Ignores pathing |
| 16 | Pin | BB (Javelin) | Root | N/A | Root target 1 turn |

### A.4 Crowd Control (14 abilities)

| # | Name | Game | CC Type | Chance/Duration |
|---|------|------|---------|----------------|
| 1 | Stun | BB (Mace) | Full stun | 100% if hits, -15% hit, 1 turn |
| 2 | Knock Out | BB (Mace) | AP drain | -4 AP next turn, no hit penalty |
| 3 | Impale | BB (Pike) | Root both | Both can't move, 1 turn |
| 4 | Entangle | BB (Flail) | Debuff | -25% skill, -2 AP |
| 5 | Entangle | BB (Whip) | Debuff | -2 AP, -10 melee def |
| 6 | Disarm | BB (Whip) | Disarm | 25% + (skill diff) chance |
| 7 | Pin | BB (Javelin) | Root | 1 turn |
| 8 | Freeze | ItB | Full freeze | Can't act, immune to damage |
| 9 | Smoke | ItB | Silence | Can't attack |
| 10 | Stun | DD | Full stun | 1 turn |
| 11 | Daze | DD | AP drain | Reduced actions |
| 12 | Horror | DD | Stress CC | Can't attack |
| 13 | Stop | FFT | Time stop | Multiple turns |
| 14 | Disable | FFT | Silence | Can't use abilities |

### A.5 Debuffs (11 abilities)

| # | Name | Game | Stat | Amount | Duration |
|---|------|------|------|--------|---------|
| 1 | Rend Speed | FFT (Knight) | Speed | Permanent -3 | Permanent |
| 2 | Rend Power | FFT (Knight) | Power | Permanent -3 | Permanent |
| 3 | Crippling Shot | BB (Bow) | AP & MP | -2 AP, -1 tile | 2 turns |
| 4 | Lacerate | BB (Dagger) | Initiative | -15 | + bleed |
| 5 | Entangle | BB (Flail) | Skill & AP | -25% skill, -2 AP | 1 turn |
| 6 | Entangle | BB (Whip) | AP & Def | -2 AP, -10 mDef | 1 turn |
| 7 | Disembowel | BB (Cleaver) | Max fatigue | -15 | Rest of battle |
| 8 | Weakening Curse | DD (Occultist) | Damage | -damage | 3 turns |
| 9 | Hex | DD (Occultist) | Accuracy | -accuracy | 3 turns |
| 10 | Holo-Targeting | XCOM (Grenadier) | Def (reverse) | -15% effective defense | 1 turn |
| 11 | A.C.I.D. | ItB | Armor & vulnerability | Double damage taken | Until cured |

### A.6 Buffs (12 abilities)

| # | Name | Game | Stat | Amount | Duration |
|---|------|------|------|--------|---------|
| 1 | Indomitable | BB | Damage reduction | 50%+ | 1 turn |
| 2 | Shieldwall | BB | Defense | +shield bonus | 1 turn, +5 to adjacent allies |
| 3 | Battle Ballad | DD (Jester) | Acc, speed, crit | +3 each | Multi-turn |
| 4 | Bolster | DD (M-a-A) | Stress resist | +15% | 3 turns |
| 5 | Aid Protocol | XCOM (Specialist) | Defense | +defense | Remote, 1 turn |
| 6 | Untouchable | XCOM (Ranger) | Dodge | Auto-dodge next attack | Until triggered |
| 7 | Haste | FFT (Time Mage) | Speed | +speed | Multi-turn |
| 8 | Protect | FFT (White Mage) | Phys def | +defense | Multi-turn |
| 9 | Shell | FFT (White Mage) | Magic def | +magic def | Multi-turn |
| 10 | Shield | ItB | Absorb | Block 1 hit | Until triggered |
| 11 | Brace | BB (Boar Spear) | Counter dmg | 200% on charge | 1 turn |
| 12 | Pavise Shot | BB (Crossbow) | Ranged def | +15 | Until next turn |

### A.7 Healing (8 abilities)

| # | Name | Game | Type | Amount |
|---|------|------|------|--------|
| 1 | Chakra | FFT (Monk) | Self HP + MP | Free, moderate |
| 2 | Cure/Curaja | FFT (White Mage) | HP heal | Scaling with faith |
| 3 | Battlefield Medicine | DD (PD) | Cure bleed/blight | + minor heal |
| 4 | Inspiring Tune | DD (Jester) | Stress heal | -stress |
| 5 | Medical Protocol | XCOM (Specialist) | Remote HP | Moderate, remote |
| 6 | Wyrd Reconstruction | DD (Occultist) | HP heal (random) | 0-30+, may cause bleed |
| 7 | Recover | BB | Fatigue restore | Skip turn, restore fatigue |
| 8 | Repair | ItB | Self-heal | Remove status + heal |

### A.8 Reactive/Counter (14 abilities)

| # | Name | Game | Trigger | Effect |
|---|------|------|---------|--------|
| 1 | Riposte | BB (Sword) | On enemy miss | Counter-attack, up to 3/round |
| 2 | Riposte | DD (Highwayman) | On any attack | Counter-attack each attacker |
| 3 | Spearwall | BB (Spear) | On enemy enter hex | Free attack, stops movement |
| 4 | Brace | BB (Boar Spear) | On being charged | 200% counter-attack |
| 5 | Counter | FFT (Monk) | On being melee hit | Free attack |
| 6 | Blade Grasp | FFT (Samurai) | On phys attack | Near-100% evade |
| 7 | Auto-Potion | FFT (Chemist) | On taking damage | Use potion automatically |
| 8 | Bladestorm | XCOM (Ranger) | On enemy enter melee | Free melee attack |
| 9 | Return Fire | XCOM (Sharpshooter) | On being shot at | Auto return shot |
| 10 | Untouchable | XCOM (Ranger) | After killing | Next attack auto-misses |
| 11 | Vantage | FE | Below 50% HP | Always attack first |
| 12 | Wrath | FE | Below 50% HP | +20 Crit |
| 13 | Canto | FE (Cavalier) | After acting | Use remaining movement |
| 14 | Pincer Attack | TO (Reborn) | Ally behind target | Free ally attack |

### A.9 Area Denial (6 abilities)

| # | Name | Game | Zone Type | Effect |
|---|------|------|----------|--------|
| 1 | Spearwall | BB | Threat zone | Free attacks on entry |
| 2 | Shieldwall | BB | Defense zone | Bonus defense, adjacent allies buffed |
| 3 | Smoke | ItB | Denial zone | Can't attack |
| 4 | Fire tiles | ItB | Damage zone | 1 dmg/turn |
| 5 | A.C.I.D. tiles | ItB | Vulnerability zone | Double damage taken |
| 6 | Force Wall | Qud | Barrier | Impassable tiles |

### A.10 Execute / Finisher (5 abilities)

| # | Name | Game | Threshold | Bonus |
|---|------|------|-----------|-------|
| 1 | Decapitate | BB (Cleaver) | Missing HP scaling | `1.5 + (1 - hp_ratio)` mult |
| 2 | Deathblow | BB (Dagger) | Requires incapacitated | 200% + 50% armor ignore |
| 3 | Serial | XCOM | On kill | Refund action |
| 4 | Reaper | XCOM | On kill | Extra action, reduced damage |
| 5 | Lunge | BB (Pike) | On kill | +4 AP refund |

### A.11 Mark/Support (5 abilities)

| # | Name | Game | Bonus | Duration |
|---|------|------|-------|---------|
| 1 | Mark for Death | DD (BH/Occ) | +bonus damage from all | 3 turns |
| 2 | Holo-Targeting | XCOM (Grenadier) | +15% hit for all allies | 1 turn |
| 3 | Phantom | XCOM (Ranger) | Stay concealed (scouting) | Until broken |
| 4 | Rally the Troops | BB | Restore morale nearby | Instant |
| 5 | Battle Ballad | DD (Jester) | Party-wide multi-stat buff | Multi-turn |

---

## Appendix B: Glossary of Reusable Mechanics

| Mechanic | Description | Games Using It |
|----------|------------|---------------|
| **Chain on kill** | Action/AP refunded when ability kills | XCOM (Serial, Reaper), BB (Lunge), Noita (triggers) |
| **Counter-attack** | Free attack when attacked or when enemy enters range | BB, DD, FFT, XCOM, FE |
| **Execute scaling** | Damage increases as target HP decreases | BB (Decapitate), DD, many RPGs |
| **Displacement** | Move target to a different hex | ItB (core mechanic), BB, DD |
| **Stance/Mode** | Enter persistent state until next turn | BB (Spearwall, Riposte, Shieldwall), DD |
| **Mark and focus** | Tag target for bonus damage from all sources | DD, XCOM |
| **Multi-hit** | Multiple independent attack rolls in one action | BB (Stab, Triple Lash), XCOM (Rapid Fire) |
| **AoE with friendly fire** | Hit everything in area, including allies | BB (Round Swing, Hail), ItB |
| **Position requirement** | Ability only usable from specific positions | DD (entire system), FE (some skills) |
| **Resource manipulation** | Restore AP/fatigue/actions mid-turn | BB (Adrenaline, Recover), XCOM (Serial), FFT (Chakra) |
| **Self-displacement** | Move self as part of ability (advance/retreat) | DD (Duelist's Advance/PBS), BB (Hook), FE (Canto) |
| **Armor interaction** | Bypass, shred, or specifically target armor | BB (Puncture, Split Shield, Split Man), ItB (A.C.I.D.) |
| **Conditional power** | Stronger against targets in specific states | BB (Deathblow vs stunned), Noita (trigger chains) |
| **Environmental interaction** | Effect changes based on terrain | FFT (Geomancy), ItB (push into water = kill) |
