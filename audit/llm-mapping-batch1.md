# LLM Ability-to-Effect Mapping — Batch 1

Generated: 2026-02-28
Classes: Chronoweaver, Ironbloom Warden, Echo Dancer, Bladesinger

---

## Chronoweaver

### Chronoweaver / Accelerant / Quicken (Buff)
Description: "Haste self for 2 turns, +30% action rate"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["haste"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "initiative" } }
- gaps: ["action rate is not directly representable; initiative is closest proxy"]
- reasoning: "Haste/action rate maps closest to initiative buff. The system doesn't have a direct 'action rate' stat, so initiative (which determines turn order frequency) is the best fit."

---

### Chronoweaver / Accelerant / Blink Step (Movement)
Description: "Short-range teleport, 3 turns cooldown"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: { buff_stat: { stat: "movementPoints" } }
- gaps: ["teleportation (ignoring terrain/pathing) has no direct effect; movement point buff is an approximation"]
- reasoning: "Teleport is a movement ability. The closest mechanical representation is a self-buff to movement points, though the actual teleport mechanic (bypassing obstacles) is a gap."

---

### Chronoweaver / Accelerant / Shared Haste (Buff)
Description: "Quicken now also affects nearest ally"

Mapping:
- effects: [buff_stat]
- targeting: tgt_single_ally
- conditions: { creates: ["haste"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "initiative" } }
- gaps: ["extending an existing buff to an ally is a modifier on another ability, not a standalone effect"]
- reasoning: "Functionally grants an ally the same initiative/haste buff. Modeled as a single-ally buff to initiative."

---

### Chronoweaver / Accelerant / Flicker Strike (Attack)
Description: "Teleport to target, strike, teleport back"

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["teleport-to-target-and-back movement component not representable; effectively a ranged melee hit"]
- reasoning: "The core payoff is a weapon damage strike. The teleport in/out is flavor and positioning that the effect system abstracts away. Weapon damage on a single target captures the mechanical intent."

---

### Chronoweaver / Accelerant / Overclock (Buff)
Description: "Double action rate for 1 turn, then 1 turn self-stun"

Mapping:
- effects: [buff_stat, cc_stun]
- targeting: tgt_self
- conditions: { creates: ["haste", "stun_self"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "initiative" } }
- gaps: ["delayed self-stun as a cost/drawback is not naturally modeled; 'double action rate' is beyond normal buff range"]
- reasoning: "Powerful initiative buff with a self-stun drawback. Both effects apply to self. The self-stun is a cost but mechanically it is still a stun effect."

---

### Chronoweaver / Accelerant / Temporal Surge (Ultimate)
Description: "Party-wide haste, +50% speed for 3 turns, 10 turns cooldown"

Mapping:
- effects: [buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["haste"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "initiative" } }
- gaps: ["party-wide targeting beyond adjacent range; affects all allies not just adjacent ones"]
- reasoning: "Mass initiative buff. tgt_aoe_adjacent is the closest multi-target option available, though the actual ability affects the entire party regardless of range."

---

### Chronoweaver / Accelerant / Infinite Loop (Ultimate)
Description: "for 2 turns, every action you take is repeated once for free 15 turns cooldown. Does not copy other Legendaries."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["infinite_loop"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "initiative" } }
- gaps: ["action duplication/echo mechanic has no effect equivalent; initiative buff is a very rough proxy"]
- reasoning: "Repeating every action is fundamentally unique. The closest approximation is a massive self-buff (doubling effective output), but this is a significant gap. Flagged for custom implementation."

---

### Chronoweaver / Entropy / Rust Touch (Attack)
Description: "Melee hit applies Corrode: -5% armor for 2 turns, stacks 3x"

Mapping:
- effects: [dmg_weapon, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["corrode"], exploits: [] }
- paramOverrides: {}
- gaps: ["armor reduction specifically (vs general vulnerability) is a nuance; stacking mechanic is a detail"]
- reasoning: "Melee weapon hit plus a vulnerability debuff. Corrode reducing armor makes the target take more damage, which maps to debuff_vuln. The stacking and duration are parameter details."

---

### Chronoweaver / Entropy / Wither Bolt (Attack)
Description: "Ranged bolt dealing low damage + Decay (DoT, 2 turns)"

Mapping:
- effects: [dmg_spell, dot_poison]
- targeting: tgt_single_enemy
- conditions: { creates: ["decay"], exploits: [] }
- paramOverrides: {}
- gaps: ["'Decay' as a thematic DoT is not its own type; dot_poison (which includes stat reduction) is the closest generic DoT"]
- reasoning: "Ranged bolt is spell damage. Decay is a time-themed DoT — dot_poison is the best generic fit since it includes a stat-weakening component that aligns with 'decay' thematically."

---

### Chronoweaver / Entropy / Sap Vitality (Debuff)
Description: "Target heals 30% less for 3 turns"

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["heal_reduction"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "resolve" } }
- gaps: ["healing reduction is not a standard stat; resolve is the loosest proxy (willpower/sustain)"]
- reasoning: "Healing reduction has no direct stat match. Resolve (mental fortitude) is the closest available stat, but this is a notable gap. The core mechanic is debuffing the target's ability to sustain."

---

### Chronoweaver / Entropy / Dust to Dust (Attack)
Description: "If target has 3+ DoTs, deal burst damage equal to 2 ticks"

Mapping:
- effects: [dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] }
- paramOverrides: {}
- gaps: ["conditional burst based on DoT count is specific; dmg_execute (bonus vs low HP) is an approximation of 'finishing' conditional damage"]
- reasoning: "This is a conditional burst that rewards DoT stacking. dmg_execute captures the 'big conditional damage' concept. The exploit list shows it keys off existing DoTs on the target."

---

### Chronoweaver / Entropy / Entropic Field (AoE)
Description: "3 hexes zone: all enemies inside gain Decay, lasts 2 turns"

Mapping:
- effects: [dot_poison]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["decay"], exploits: [] }
- paramOverrides: {}
- gaps: ["zone/persistent area effect over multiple turns; aoe_adjacent is an approximation of a placed zone"]
- reasoning: "AoE application of the Decay DoT. Mapped to dot_poison as the generic decay-like DoT. The zone persistence is a detail beyond the effect system."

---

### Chronoweaver / Entropy / Crumble (Attack)
Description: "Destroy 50% of target's remaining armor (6 turns cooldown)"

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["armor_break"], exploits: [] }
- paramOverrides: {}
- gaps: ["percentage-based armor destruction is more extreme than a vulnerability debuff but maps to same outcome"]
- reasoning: "Destroying armor makes the target take more damage, which is what debuff_vuln represents. The percentage-based scaling is a parameter detail."

---

### Chronoweaver / Entropy / Pandemic (Active)
Description: "All DoTs on target spread to enemies within 4 hexes"

Mapping:
- effects: [dot_poison]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] }
- paramOverrides: {}
- gaps: ["DoT spreading/copying mechanic is unique; this applies whatever DoTs exist, not a fixed type"]
- reasoning: "The mechanical outcome is AoE DoT application. Mapped to dot_poison as the primary DoT type for this class. The 'spread existing DoTs' mechanic is a gap but the end result is AoE DoT damage."

---

### Chronoweaver / Entropy / Heat Death (Ultimate)
Description: "Mark a target. for 3 turns, all damage they've taken from your DoTs is recorded, then dealt again as a single burst. 15 turns cooldown."

Mapping:
- effects: [dmg_spell, dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: ["heat_death_mark"], exploits: ["dot_bleed", "dot_burn", "dot_poison"] }
- paramOverrides: {}
- gaps: ["damage recording and replay mechanic is unique; delayed burst based on accumulated damage has no direct parallel"]
- reasoning: "The core output is a massive delayed burst on a single target. dmg_spell for the magical burst nature, dmg_execute for the 'finishing' conditional scaling. The recording mechanic itself is a gap that needs custom logic."

---

### Chronoweaver / Paradox / Rewind (Heal)
Description: "Restore self to HP/position from 1 turn ago, 5 turns cooldown"

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["position restoration (teleport to previous location) not representable; HP snapshot restoration vs percentage healing is a nuance"]
- reasoning: "The HP restoration component maps to heal_pctDmg on self. The position rewind is a gap. Mechanically this is a self-heal with a unique delivery method."

---

### Chronoweaver / Paradox / Deja Vu (Debuff)
Description: "Target repeats their last action involuntarily"

Mapping:
- effects: [cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["deja_vu"], exploits: [] }
- paramOverrides: {}
- gaps: ["forced action repetition is a unique CC type; stun is a rough approximation since the target loses agency over their turn"]
- reasoning: "The target loses control of their action, which is closest to a stun (loss of turn agency). The forced repetition is thematically different but mechanically similar in denying the enemy their chosen action."

---

### Chronoweaver / Paradox / Stutter (CC)
Description: "Freeze target in time for 1 turn (stun)"

Mapping:
- effects: [cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["stun"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Direct 1:1 mapping. Freezing in time for 1 turn is exactly a stun — target loses their turn."

---

### Chronoweaver / Paradox / Causal Loop (Debuff)
Description: "Target takes damage equal to damage they deal for 2 turns"

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["causal_loop"], exploits: [] }
- paramOverrides: {}
- gaps: ["damage reflection/self-harm on attack is unique; debuff_vuln (take more damage) is a loose approximation since the target is effectively punished for acting"]
- reasoning: "The target is penalized for dealing damage, which discourages attacking. debuff_vuln captures the 'takes more damage' aspect. The reflection mechanic itself is a significant gap."

---

### Chronoweaver / Paradox / Echo Cast (Active)
Description: "Repeat your last-used skill at 60% power, no cost"

Mapping:
- effects: [res_apRefund]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["skill repetition/echo mechanic is unique; AP refund approximates the 'free action' aspect but doesn't capture the skill copying"]
- reasoning: "The 'no cost repeat' is closest to an AP refund — you get an extra action effectively for free. The actual skill-copying mechanic is a gap that needs custom implementation."

---

### Chronoweaver / Paradox / Time Bomb (Attack)
Description: "Place a marker. after 2 turns, all damage dealt in the area during that time is repeated as AoE."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["time_bomb_marker"], exploits: [] }
- paramOverrides: {}
- gaps: ["delayed detonation based on accumulated damage is unique; damage recording over time has no effect parallel"]
- reasoning: "The end result is AoE spell damage. The delayed/accumulated damage mechanic is a major gap. Modeled as AoE spell damage with the understanding that the trigger timing needs custom logic."

---

### Chronoweaver / Paradox / Fork Reality (Active)
Description: "Create a clone of yourself for 3 turns. It copies your attacks at 40% damage. If it dies, you take 20% of your max HP."

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_self
- conditions: { creates: ["clone"], exploits: [] }
- paramOverrides: {}
- gaps: ["summon/clone mechanic is not representable; clone as separate entity with AI, HP, positioning is a major gap; self-damage on clone death is unique"]
- reasoning: "The clone effectively doubles your damage output at reduced power, which is closest to dmg_multihit (multiple hits at reduced damage). The actual summon/entity mechanics are a significant gap."

---

### Chronoweaver / Paradox / Grandfather (Active)
Description: "Erase an enemy's last action (undo their last attack, heal, or buff). 8 turns cooldown."

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "resolve" } }
- gaps: ["action erasure/undo mechanic is completely unique; no effect can represent reversing a completed action"]
- reasoning: "Undoing an enemy's last action has no mechanical parallel. debuff_stat with resolve is the loosest proxy (weakening their effectiveness). This ability fundamentally needs custom implementation."

---

### Chronoweaver / Paradox / Closed Timelike (Ultimate)
Description: "Rewind the entire battlefield 2 turns. All positions, HP, Only you retain memory (keep your buffs). 15 turns cooldown."

Mapping:
- effects: [heal_pctDmg, buff_stat]
- targeting: tgt_self
- conditions: { creates: ["time_rewind"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: ["full battlefield state rewind is completely unique and cannot be represented by effects; this is a game-state manipulation, not a buff/debuff"]
- reasoning: "Battlefield rewind is the most exotic ability in the set. The self-heal represents your HP being restored, the self-buff represents retaining your advantages. The actual rewind mechanic is a massive gap requiring custom systems."

---

## Ironbloom Warden

### Ironbloom Warden / Thornwall / Barkskin (Buff)
Description: "+20% damage reduction for 2 turns"

Mapping:
- effects: [buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: ["barkskin"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Direct 1:1 mapping. Damage reduction buff on self is exactly buff_dmgReduce."

---

### Ironbloom Warden / Thornwall / Root Stance (Stance)
Description: "Immobile but +30% damage reduction, +threat generation"

Mapping:
- effects: [buff_dmgReduce, debuff_stat]
- targeting: tgt_self
- conditions: { creates: ["rooted_stance"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: ["threat/aggro generation has no effect representation"]
- reasoning: "The damage reduction maps to buff_dmgReduce. The immobility is a self-imposed movement debuff (movementPoints to 0). Threat generation is a gap — the aggro/taunt mechanic isn't in the effect system."

---

### Ironbloom Warden / Thornwall / Splinter Burst (Active)
Description: "Shatter your Barkskin early to deal AoE damage based on damage absorbed. More absorbed = more burst."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["barkskin"] }
- paramOverrides: {}
- gaps: ["damage scaling based on absorbed damage is a unique conditional; consuming a buff to empower damage has no direct parallel"]
- reasoning: "AoE burst damage centered on self. dmg_spell for the magical/nature burst. The damage-absorbed scaling is a parameter detail. Exploits barkskin because it consumes that buff."

---

### Ironbloom Warden / Thornwall / Entangling Wall (Active)
Description: "Summon a line of thorns (3 hexes). Enemies crossing take damage and are slowed 50% for 1 turn."

Mapping:
- effects: [dmg_spell, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["thorn_wall"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: ["persistent terrain/wall creation is not representable; line-shaped targeting differs from adjacent AoE"]
- reasoning: "Creates a damaging zone that slows. The damage is spell-like (nature magic), the slow maps to a movement point debuff. The wall/terrain creation aspect is a gap."

---

### Ironbloom Warden / Thornwall / World Tree (Ultimate)
Description: "for 3 turns, you become immobile and massive. +80% damage reduction, all allies within 4 hexes gain +30% DR, and attackers take massive thorn damage. 15 turns cooldown."

Mapping:
- effects: [buff_dmgReduce, stance_counter]
- targeting: tgt_self
- conditions: { creates: ["world_tree", "rooted_stance"], exploits: [] }
- paramOverrides: {}
- gaps: ["ally AoE damage reduction aura is not directly targetable; massive thorn reflect damage needs a reflect/reactive system; immobility as transform is unique"]
- reasoning: "Massive self-DR maps to buff_dmgReduce. The thorn damage to attackers is closest to stance_counter (reactive damage). The ally DR aura is a significant gap — it would need a separate aura system."

---

### Ironbloom Warden / Overgrowth / Rejuvenate (Heal)
Description: "HoT on self or ally, heals over 3 turns"

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_single_ally
- conditions: { creates: ["rejuvenate_hot"], exploits: [] }
- paramOverrides: {}
- gaps: ["heal-over-time (HoT) vs instant heal is a delivery nuance not captured by heal_pctDmg"]
- reasoning: "Healing on an ally maps to heal_pctDmg with single ally targeting. The HoT delivery (over 3 turns) is a parameter/timing detail rather than a different effect type."

---

### Ironbloom Warden / Overgrowth / Seedling (Summon)
Description: "Plant a seedling that pulses minor heals in 2 hexes for 3 turns"

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["seedling"], exploits: [] }
- paramOverrides: {}
- gaps: ["summon/placeable entity is a major gap; persistent healing zone from a placed object is not representable as a standard effect"]
- reasoning: "The outcome is AoE healing over time. heal_pctDmg with AoE targeting approximates the effect. The seedling as a placed entity is a significant gap."

---

### Ironbloom Warden / Overgrowth / Overgrowth (Active)
Description: "Instantly grow all active Seedlings, doubling their radius and healing"

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["seedling"] }
- paramOverrides: {}
- gaps: ["modifying existing summons/entities is not representable; this is a buff to other placed objects, not a direct heal"]
- reasoning: "The end result is amplified AoE healing from seedlings. Mapped as a burst AoE heal since that's the mechanical outcome. The summon-modification aspect is a gap."

---

### Ironbloom Warden / Overgrowth / Verdant Tide (Heal)
Description: "AoE heal-over-time in 3 hexes radius, 3 turns duration"

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["verdant_tide_hot"], exploits: [] }
- paramOverrides: {}
- gaps: ["large radius AoE heal zone vs adjacent-only targeting"]
- reasoning: "AoE healing maps directly to heal_pctDmg with AoE targeting. The 3-hex radius is larger than 'adjacent' but aoe_adjacent is the only multi-target option."

---

### Ironbloom Warden / Overgrowth / Bloom Cascade (Active)
Description: "Consume all Seedlings. Each consumed heals all allies in its radius for a large burst. More seedlings = bigger heal."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["seedling"] }
- paramOverrides: {}
- gaps: ["consuming summons for scaling effect; multi-point AoE (each seedling location) is not representable as single AoE"]
- reasoning: "Large burst heal consuming resources (seedlings). The output is a big AoE heal, which maps to heal_pctDmg. The seedling consumption and multi-point nature are gaps."

---

### Ironbloom Warden / Overgrowth / Gaia's Embrace (Ultimate)
Description: "for 4 turns, the entire battlefield becomes overgrown. All allies regen 5% max HP/s. All enemies are slowed 30%. Seedlings sprout automatically every 1 turn. 15 turns cooldown."

Mapping:
- effects: [heal_pctDmg, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["gaia_embrace", "seedling"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: ["battlefield-wide persistent effect; automatic summon spawning; combined ally heal + enemy debuff on different target groups"]
- reasoning: "Ally regen maps to heal_pctDmg, enemy slow maps to debuff_stat on movementPoints. The battlefield-wide scope and auto-seedling spawning are significant gaps. The dual-target nature (allies heal, enemies slow) is also a gap."

---

### Ironbloom Warden / Rot Herald / Spore Shot (Attack)
Description: "Ranged attack that applies Poison (DoT, 2 turns)"

Mapping:
- effects: [dmg_weapon, dot_poison]
- targeting: tgt_single_enemy
- conditions: { creates: ["poison"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Clean mapping. Ranged weapon attack with a poison DoT application. Both effects have direct parallels in the system."

---

### Ironbloom Warden / Rot Herald / Fungal Growth (Summon)
Description: "Plant a fungal node that poisons enemies in 2 hexes radius"

Mapping:
- effects: [dot_poison]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["fungal_node"], exploits: [] }
- paramOverrides: {}
- gaps: ["summon/placeable entity (fungal node) is a major gap; persistent poison zone from a placed object is not a standard effect"]
- reasoning: "The mechanical outcome is AoE poison application. The fungal node as a placed entity is the primary gap. The poison DoT itself maps cleanly."

---

### Ironbloom Warden / Rot Herald / Decompose (Active)
Description: "Consume Poison stacks on target for burst damage"

Mapping:
- effects: [dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["dot_poison"] }
- paramOverrides: {}
- gaps: ["DoT stack consumption for burst damage is a specific conditional; dmg_execute approximates the 'conditional big hit' concept"]
- reasoning: "Consuming poison stacks for burst damage is a payoff ability. dmg_execute captures the conditional burst damage concept. Exploits poison as the required setup."

---

### Ironbloom Warden / Rot Herald / Plague Garden (Active)
Description: "Plant 3 fungal nodes in a triangle. Zone inside deals constant poison damage and reduces healing by 40%."

Mapping:
- effects: [dot_poison, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["fungal_node", "plague_zone", "heal_reduction"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "resolve" } }
- gaps: ["multi-point zone creation (triangle formation); persistent terrain effect; healing reduction has no direct stat"]
- reasoning: "AoE poison damage maps to dot_poison. Healing reduction is approximated by debuff_stat (resolve as proxy). The geometric zone placement is a significant gap."

---

### Ironbloom Warden / Rot Herald / Parasitic Vine (Attack)
Description: "Latch onto target. Drains HP from them to you over 2 turns. Breaks if you move too far."

Mapping:
- effects: [dot_poison, heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: ["parasitic_vine"], exploits: [] }
- paramOverrides: {}
- gaps: ["tethered/leash mechanic (breaks on distance); HP drain as simultaneous damage + heal channel"]
- reasoning: "HP drain is damage to enemy + heal to self, mapped as dot_poison (DoT to target) + heal_pctDmg (healing from damage dealt). The tether/distance-break mechanic is a gap."

---

### Ironbloom Warden / Rot Herald / Cordyceps (Debuff)
Description: "Infect target. If they die within 3 turns, a fungal minion rises from their corpse for 4 turns."

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["cordyceps_infection"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "resolve" } }
- gaps: ["on-death summon/minion creation is a major gap; conditional trigger (death within window) has no parallel; resolve debuff is a very loose placeholder"]
- reasoning: "The debuff application maps loosely to debuff_stat. The real payoff — summoning a minion on death — is completely outside the effect system. This ability needs heavy custom implementation."

---

### Ironbloom Warden / Rot Herald / The Spreading (Ultimate)
Description: "Select a target. A fungal infection grows on them over 3 turns. At full growth, it detonates: lethal to non-bosses, 40% max HP to bosses. Infection spreads to nearby enemies at 50% progress on detonation. 15 turns cooldown."

Mapping:
- effects: [dmg_execute, dot_poison]
- targeting: tgt_single_enemy
- conditions: { creates: ["spreading_infection"], exploits: [] }
- paramOverrides: {}
- gaps: ["delayed lethal detonation (instakill mechanic); infection spreading on detonation; boss-specific damage cap; growth over time mechanic"]
- reasoning: "The detonation is a massive execute-style hit, mapped to dmg_execute. The growing infection is a DoT (dot_poison). The instakill, boss cap, and spread mechanics are all major gaps requiring custom systems."

---

## Echo Dancer

### Echo Dancer / Resonance / Tuning Strike (Attack)
Description: "Melee hit applies 1 Resonance stack to target"

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["resonance"], exploits: [] }
- paramOverrides: {}
- gaps: ["Resonance as a custom stacking debuff/resource is tracked outside the effect system"]
- reasoning: "Simple melee weapon hit. The Resonance stack application is a condition/status effect that the ability creates, tracked as a condition rather than a separate effect."

---

### Echo Dancer / Resonance / Shatter Point (Attack)
Description: "Consume all Resonance stacks. Deal burst damage scaling with stacks consumed (big payoff at 5+)"

Mapping:
- effects: [dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["resonance"] }
- paramOverrides: {}
- gaps: ["stack consumption for scaling damage; the more stacks consumed, the more damage — this scaling is beyond normal execute behavior"]
- reasoning: "Consuming stacks for a big payoff hit is the classic execute/finisher pattern. dmg_execute captures the conditional burst. Exploits resonance stacks as the required setup."

---

### Echo Dancer / Resonance / Crystal Freq (Active)
Description: "Lock onto target's Resonance frequency. for 2 turns, all hits apply 2 stacks instead of 1."

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["crystal_freq"], exploits: ["resonance"] }
- paramOverrides: {}
- gaps: ["doubling stack application rate is a unique modifier; debuff_vuln approximates 'target becomes more susceptible'"]
- reasoning: "Making a target accumulate Resonance faster means they reach the shatter threshold sooner and take more damage. debuff_vuln captures the 'increased vulnerability' concept."

---

### Echo Dancer / Resonance / Sonic Boom (Active)
Description: "Detonate all Resonance on all nearby enemies simultaneously. Chain reaction: each detonation adds 1 stack to survivors."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["resonance"], exploits: ["resonance"] }
- paramOverrides: {}
- gaps: ["chain reaction mechanic (detonation feeds into survivors); simultaneous multi-target stack consumption"]
- reasoning: "AoE burst from detonating Resonance stacks. dmg_spell captures the sound-based magical damage. The chain reaction adding stacks to survivors is both creating and exploiting resonance."

---

### Echo Dancer / Resonance / Requiem (Ultimate)
Description: "Mark a target. for 3 turns, track all damage dealt to them. At end, replay 60% of total damage as pure sound damage (ignores all defenses). 15 turns cooldown."

Mapping:
- effects: [dmg_spell, dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: ["requiem_mark"], exploits: [] }
- paramOverrides: {}
- gaps: ["damage tracking and replay mechanic is unique; defense-ignoring damage ('pure') has no modifier; delayed burst based on accumulated damage"]
- reasoning: "Similar to Heat Death — delayed massive burst. dmg_spell for the pure sound damage, dmg_execute for the conditional scaling nature. The tracking/replay and defense-bypass mechanics are gaps."

---

### Echo Dancer / Silence / Muffle (Debuff)
Description: "Silence target for 1 turn (no abilities)"

Mapping:
- effects: [cc_daze]
- targeting: tgt_single_enemy
- conditions: { creates: ["silence"], exploits: [] }
- paramOverrides: {}
- gaps: ["silence (ability lockout) is distinct from daze (AP loss); silence specifically prevents abilities while allowing basic attacks/movement"]
- reasoning: "Silence prevents ability use. cc_daze (losing AP) is the closest — it reduces the target's ability to act. A true 'silence' effect type is a gap, but daze approximates partial action denial."

---

### Echo Dancer / Silence / Sound Eater (Stealth)
Description: "Enter stealth for 2 turns. Broken by attacking. 4 turns cooldown."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["stealth"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["stealth/invisibility mechanic (untargetable) is not representable; dodge buff is a very rough proxy for being hard to target"]
- reasoning: "Stealth makes you untargetable. The closest stat is dodge (evasion), but true stealth is fundamentally different. This is a significant gap — stealth needs its own system."

---

### Echo Dancer / Silence / Dead Air (Debuff)
Description: "Create a 2 hexes zone of silence. Enemies inside cannot cast abilities for 2 turns."

Mapping:
- effects: [cc_daze]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["silence_zone"], exploits: [] }
- paramOverrides: {}
- gaps: ["persistent zone/terrain effect; silence as distinct from daze; area denial mechanic"]
- reasoning: "AoE ability denial maps to cc_daze (reduced ability to act). The zone persistence is a gap. AoE targeting captures the multi-target nature."

---

### Echo Dancer / Silence / Ambush (Attack)
Description: "Attacks from stealth deal +80% damage and stun for 1 turn"

Mapping:
- effects: [dmg_weapon, cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["stun"], exploits: ["stealth"] }
- paramOverrides: {}
- gaps: ["conditional damage bonus from stealth is a modifier, not a separate effect; stealth-break trigger"]
- reasoning: "High-damage melee strike with a stun. The +80% damage is a parameter on dmg_weapon. The stun maps directly to cc_stun. Exploits stealth as the required condition for the bonus."

---

### Echo Dancer / Silence / Void Frequency (Debuff)
Description: "Target's cooldowns are frozen for 2 turns (cannot recover)"

Mapping:
- effects: [cc_daze]
- targeting: tgt_single_enemy
- conditions: { creates: ["cooldown_freeze"], exploits: [] }
- paramOverrides: {}
- gaps: ["cooldown manipulation is a unique mechanic with no effect parallel; daze (AP loss) approximates reduced effectiveness"]
- reasoning: "Preventing cooldown recovery limits the target's ability options, similar to how daze limits actions through AP loss. The specific cooldown-freeze mechanic is a gap."

---

### Echo Dancer / Silence / Ghost Note (Active)
Description: "Leave a sound decoy at your position. Enemies target it for 2 turns. You gain stealth."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["stealth", "decoy"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["decoy/summon that draws aggro is a major gap; taunt/threat redirection has no effect; stealth as dodge buff is approximate"]
- reasoning: "The primary benefit is gaining stealth (approximated by dodge buff). The decoy creation is a summon/aggro mechanic with no parallel in the effect system."

---

### Echo Dancer / Silence / Total Silence (Active)
Description: "4 hexes radius: all enemies silenced for 2 turns, all allies gain stealth for 2 turns. 8 turns cooldown."

Mapping:
- effects: [cc_daze, buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["silence", "stealth"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["dual-target effect (enemies silenced, allies stealthed) on different groups from same ability; large radius vs adjacent"]
- reasoning: "Enemy silence maps to cc_daze. Ally stealth maps to buff_stat (dodge). The split targeting — debuffing enemies while buffing allies in the same cast — is a gap since the system targets one group per ability."

---

### Echo Dancer / Silence / The Unheard (Ultimate)
Description: "for 4 turns, you exist in perfect silence. Permanent stealth (not broken by attacks), all attacks from stealth, +50% damage, enemies cannot target you directly. 15 turns cooldown."

Mapping:
- effects: [buff_stat, buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: ["stealth", "untargetable"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["permanent unbreakable stealth is unique; untargetable status has no effect; +50% damage from stealth is a conditional modifier"]
- reasoning: "Unbreakable stealth approximated by massive dodge buff. Untargetable status approximated by buff_dmgReduce (reduced incoming damage). The +50% damage is a separate conditional buff. This ability is heavily gap-dependent."

---

### Echo Dancer / Cacophony / Screech (Attack)
Description: "Cone AoE, moderate damage + 1 turn Disoriented (miss chance)"

Mapping:
- effects: [dmg_spell, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["disoriented"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["cone-shaped targeting vs adjacent AoE; 'Disoriented' as miss chance could also affect rangedSkill"]
- reasoning: "Sound-based AoE damage is dmg_spell. Miss chance (Disoriented) maps to debuff_stat reducing meleeSkill (accuracy). Cone shape is approximated by aoe_adjacent."

---

### Echo Dancer / Cacophony / Bass Drop (Attack)
Description: "AoE slam, damages and knocks back enemies in 2 hexes"

Mapping:
- effects: [dmg_spell, disp_push]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Clean mapping. AoE damage with knockback. dmg_spell for sound-based damage, disp_push for the knockback. Both effects map directly."

---

### Echo Dancer / Cacophony / Tinnitus (Debuff)
Description: "Target has 20% miss chance for 2 turns"

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["disoriented"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["miss chance could affect both melee and ranged; applying to only one stat is a limitation"]
- reasoning: "Miss chance directly maps to reducing accuracy (meleeSkill). Could also warrant a rangedSkill debuff but keeping to 1 effect for a simple debuff ability."

---

### Echo Dancer / Cacophony / Wall of Sound (Active)
Description: "Create a barrier of noise. Enemies crossing it are stunned 1 turn and take damage."

Mapping:
- effects: [dmg_spell, cc_stun]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["sound_wall"], exploits: [] }
- paramOverrides: {}
- gaps: ["persistent barrier/wall terrain creation; triggered effect on crossing (reactive, not immediate)"]
- reasoning: "The payoff effects are damage and stun, both of which map cleanly. The barrier/wall placement and triggered-on-crossing mechanic are gaps related to terrain/zone systems."

---

### Echo Dancer / Cacophony / Shockwave (Attack)
Description: "Line attack: damages all enemies in a row, damage increases per enemy hit"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["line-shaped targeting vs adjacent AoE; escalating damage per target hit is a unique scaling mechanic"]
- reasoning: "Line AoE damage is approximated by dmg_spell with aoe_adjacent targeting. The damage-escalation-per-hit mechanic is a parameter detail/gap."

---

### Echo Dancer / Cacophony / Noise Complaint (Active)
Description: "Massive 4 hexes AoE. All enemies Disoriented for 2 turns. Disoriented enemies that attack have 30% chance to hit an ally instead."

Mapping:
- effects: [debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["disoriented"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["friendly fire mechanic (confused enemies hitting allies) is unique; large radius AoE; Disoriented causing ally-targeting is beyond simple miss chance"]
- reasoning: "AoE accuracy debuff via Disoriented. The friendly fire / confusion mechanic is a significant gap — enemies potentially attacking their own allies is not representable. Base effect is accuracy reduction."

---

### Echo Dancer / Cacophony / Brown Note (Active)
Description: "Target enemy flees in terror for 2 turns and takes DoT. Feared enemies spread fear to allies they pass. 8 turns CD."

Mapping:
- effects: [cc_root, dot_burn]
- targeting: tgt_single_enemy
- conditions: { creates: ["fear"], exploits: [] }
- paramOverrides: {}
- gaps: ["fear/flee mechanic (forced movement away) is unique; fear spreading to nearby enemies on movement; cc_root is opposite of forced movement but both deny controlled action"]
- reasoning: "Fear removes the target from combat effectiveness. cc_root is the closest CC (denies useful positioning). dot_burn for the ongoing damage. The flee behavior and fear-spreading are major gaps. Note: cc_stun could also work, but root was chosen because fear still allows the target to 'exist' on the field, just not usefully."

---

### Echo Dancer / Cacophony / Symphony of (Ultimate)
Description: "5 hexes radius for 3 turns. Constant AoE damage that escalates 40% and Disoriented. Allies inside gain +20% damage. 15 turns cooldown."

Mapping:
- effects: [dmg_spell, debuff_stat, buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["disoriented", "symphony_zone"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" }, buff_stat: { stat: "meleeSkill" } }
- gaps: ["persistent escalating damage zone; dual-target (enemies damaged/debuffed, allies buffed) in same ability; escalating damage over time; large radius"]
- reasoning: "AoE damage maps to dmg_spell, enemy Disoriented maps to debuff_stat (meleeSkill), ally damage boost maps to buff_stat. The escalating damage, zone persistence, and split-target buffing/debuffing are gaps."

---

## Bladesinger

### Bladesinger / Sword Dance / Opening Step (Attack)
Description: "A quick strike that initiates your combo chain; generates 1 Rhythm."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["rhythm"], exploits: [] }
- paramOverrides: {}
- gaps: ["Rhythm as a custom resource/stack is tracked outside the effect system"]
- reasoning: "Simple melee weapon strike. Rhythm generation is a resource/condition tracked separately. The attack itself is a clean dmg_weapon."

---

### Bladesinger / Sword Dance / Flowing Cut (Attack)
Description: "Follow-up strike dealing 120% damage; generates 2 Rhythm if used after Opening Step."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["rhythm"], exploits: ["rhythm"] }
- paramOverrides: {}
- gaps: ["combo chain sequencing (conditional bonus from previous ability) is a custom mechanic; 120% damage is a parameter detail"]
- reasoning: "Enhanced melee strike in a combo chain. dmg_weapon at higher multiplier. The combo-conditional bonus Rhythm generation is tracked as exploiting/creating rhythm."

---

### Bladesinger / Sword Dance / Pivot Slash (Attack)
Description: "Spinning strike hitting all enemies in a 180-degree arc; generates 1 Rhythm per enemy hit."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["rhythm"], exploits: [] }
- paramOverrides: {}
- gaps: ["180-degree arc targeting (half-circle) vs full adjacent AoE; Rhythm generation scaling with enemies hit"]
- reasoning: "Melee AoE attack hitting nearby enemies. dmg_weapon with aoe_adjacent captures the multi-target strike. The arc shape is approximated by adjacent AoE."

---

### Bladesinger / Sword Dance / Whirlwind Step (Movement)
Description: "Dash through an enemy dealing damage; resets your combo chain timer by 1 turn."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["rhythm"], exploits: [] }
- paramOverrides: {}
- gaps: ["dash-through movement (ends on other side of target); combo timer reset is a custom mechanic"]
- reasoning: "Movement + damage ability. The core mechanical output is weapon damage on a single target. The dash-through positioning and timer reset are custom mechanics tracked separately."

---

### Bladesinger / Sword Dance / Rising Flourish (Attack)
Description: "Launch an enemy upward; generates 3 Rhythm and enables aerial follow-up combos."

Mapping:
- effects: [dmg_weapon, cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["rhythm", "airborne"], exploits: [] }
- paramOverrides: {}
- gaps: ["launching/airborne state is a unique positional CC; aerial combo follow-ups are a custom system"]
- reasoning: "Melee strike that launches the target. The launch disables the target briefly (approximated by cc_stun — they can't act while airborne). Generates significant Rhythm for combo building."

---

### Bladesinger / Sword Dance / Crescendo Strike (Active)
Description: "Consume all Rhythm; deal damage equal to 15x Rhythm stacks in a single blinding blow."

Mapping:
- effects: [dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["rhythm"] }
- paramOverrides: {}
- gaps: ["damage scaling directly from resource consumption (15x stacks) is a unique formula; dmg_execute approximates the 'big conditional hit' but the scaling is custom"]
- reasoning: "The definitive finisher/payoff ability. Consumes Rhythm for massive damage, directly paralleling dmg_execute's 'conditional big hit' concept. The linear stack-to-damage scaling is a parameter detail."

---

### Bladesinger / Sword Dance / Blade Waltz (Stance)
Description: "Enter a flow state; for 3 turns every attack automatically chains to the next optimal combo hit."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["blade_waltz"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["automatic combo chaining is a unique AI/automation mechanic; 'optimal combo' selection has no parallel"]
- reasoning: "Flow state that optimizes your attack sequences. Approximated as a meleeSkill buff (you fight better). The auto-chaining mechanic is a significant gap requiring custom combo logic."

---

### Bladesinger / Sword Dance / Dervish Protocol (Active)
Description: "for 3 turns, movement and attacks fuse—every step deals AoE damage equal to a basic attack."

Mapping:
- effects: [dmg_weapon, buff_stat]
- targeting: tgt_self
- conditions: { creates: ["dervish_protocol"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "movementPoints" } }
- gaps: ["movement-triggered AoE damage is a unique mechanic; fusing movement and attacks has no parallel"]
- reasoning: "Every movement step becomes an attack. The buff_stat (movementPoints) represents wanting to move more since each step is now damage. The movement-as-AoE-damage mechanic is the primary gap."

---

### Bladesinger / Sword Dance / The Endless Dance (Transform)
Description: "Enter the Eternal Rhythm for 4 turns: Rhythm no longer caps, every strike generates 3 Rhythm, Crescendo Strike fires every 1 turn automatically at full accumulated power, and you are immune to interruption."

Mapping:
- effects: [buff_stat, dmg_multihit]
- targeting: tgt_self
- conditions: { creates: ["eternal_rhythm"], exploits: ["rhythm"] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["transform/ultimate state with multiple rule changes; auto-firing abilities; uncapped resource accumulation; interrupt immunity"]
- reasoning: "Massive combat transformation. buff_stat represents the enhanced fighting state. dmg_multihit approximates the repeated automatic Crescendo Strikes. The transform mechanics (uncapping, auto-fire, immunity) are all gaps requiring custom implementation."

---

### Bladesinger / Spell Weave / Arcane Edge (Attack)
Description: "A melee strike that primes your blade with magical charge for 1 turn."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["blade_charge"], exploits: [] }
- paramOverrides: {}
- gaps: ["blade priming/charge state is a custom condition that buffs the next ability"]
- reasoning: "Melee weapon strike that sets up the next attack. The charge is a condition created, not a separate effect. Clean dmg_weapon mapping."

---

### Bladesinger / Spell Weave / Spark Slash (Attack)
Description: "A spell-infused strike; if used while blade is charged, deal bonus arcane damage."

Mapping:
- effects: [dmg_weapon, dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["blade_charge"] }
- paramOverrides: {}
- gaps: ["conditional bonus damage based on blade charge state is a custom combo mechanic"]
- reasoning: "Hybrid melee+magic strike. dmg_weapon for the physical component, dmg_spell for the arcane bonus. Exploits blade_charge for the conditional bonus damage."

---

### Bladesinger / Spell Weave / Force Bolt Slash (Active)
Description: "Fire a force bolt then immediately dash forward to strike; counts as both spell and strike."

Mapping:
- effects: [dmg_spell, dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["blade_charge"], exploits: [] }
- paramOverrides: {}
- gaps: ["dash/gap-close movement component; dual-nature ability (counts as both types for Weave tracking)"]
- reasoning: "Ranged spell bolt followed by melee strike in one action. dmg_spell for the bolt, dmg_weapon for the strike. The dash movement and dual-type tracking are custom mechanics."

---

### Bladesinger / Spell Weave / Runic Barrage (Active)
Description: "Unleash 4 rapid magical slashes that each count as alternating strike/spell for Resonance."

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: ["weave_resonance"], exploits: [] }
- paramOverrides: {}
- gaps: ["alternating strike/spell classification per hit for Resonance tracking is a custom system"]
- reasoning: "4 rapid hits maps directly to dmg_multihit. The alternating type classification for Resonance is a custom tracking mechanic. The multi-hit nature is the core mechanical output."

---

### Bladesinger / Spell Weave / Phase Cut (Attack)
Description: "A Weave-charged strike that teleports you behind the target, ignoring armor."

Mapping:
- effects: [dmg_weapon, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["weave_resonance"] }
- paramOverrides: {}
- gaps: ["teleport-behind positioning; armor ignore is more absolute than vulnerability debuff"]
- reasoning: "Armor-ignoring melee strike. dmg_weapon for the strike, debuff_vuln to represent armor bypass (the target's defenses are negated). The teleport-behind positioning is a gap."

---

### Bladesinger / Spell Weave / Resonance Overflow (Active)
Description: "Expend Resonance to fire a beam of condensed spell-strike energy; pierces all targets in a line."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["weave_resonance"] }
- paramOverrides: {}
- gaps: ["line/piercing targeting shape vs adjacent AoE; Resonance consumption for damage scaling"]
- reasoning: "Line AoE beam of magical damage. dmg_spell for the energy beam. Line targeting approximated by aoe_adjacent. Consumes Resonance (exploits) for the payoff."

---

### Bladesinger / Spell Weave / Grand Synthesis (Active)
Description: "Release all accumulated Resonance in a single perfect strike that simultaneously detonates as a nova spell—deals damage in both melee and 4 hexes AoE, with each domain amplified by the number of perfectly-woven actions taken since last use."

Mapping:
- effects: [dmg_weapon, dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["weave_resonance"] }
- paramOverrides: {}
- gaps: ["dual-domain damage (melee + AoE spell simultaneously); damage scaling from action count since last use; melee-range hit + 4-hex nova in one ability"]
- reasoning: "Ultimate finisher combining weapon and spell damage. dmg_weapon for the melee strike component, dmg_spell for the nova detonation. AoE targeting for the nova radius. The action-count scaling and dual-domain nature are gaps."

---

### Bladesinger / War Chant / Counterpoint (Active)
Description: "Briefly sing a second Chant simultaneously for 2 turns, stacking both aura effects."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["counterpoint"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: ["dual aura maintenance is a unique mechanic; this modifies the aura system rather than applying a direct buff; the actual effect depends on which Chants are active"]
- reasoning: "Enabling a second simultaneous aura is a meta-buff. Approximated as a self-buff (resolve for general empowerment). The actual mechanical output depends on which Chants are active, making this inherently context-dependent."

---

### Bladesinger / War Chant / Harmonic Chorus (Active)
Description: "Broadcast your current Chant at double radius and double potency for 3 turns."

Mapping:
- effects: [buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["harmonic_chorus"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: ["aura amplification (radius + potency) is a modifier on existing aura, not a standalone effect; actual buff depends on active Chant"]
- reasoning: "Amplifies an existing aura. The output is a stronger, wider party buff. Approximated as AoE buff_stat since it empowers allies. The aura-modification mechanic is a gap."

---

### Bladesinger / War Chant / Discordant Note (Active)
Description: "Interrupt an enemy's spell or ability by singing a jarring tone; 5 turns cooldown."

Mapping:
- effects: [cc_daze]
- targeting: tgt_single_enemy
- conditions: { creates: ["interrupt"], exploits: [] }
- paramOverrides: {}
- gaps: ["interrupt/counterspell mechanic is reactive/timed and different from a standard CC application"]
- reasoning: "Interrupting an ability in progress is closest to cc_daze (denying their action). The timing aspect (interrupting mid-cast) is a gap — standard CC applies on your turn, not reactively."

---

### Bladesinger / War Chant / Symphony of War (Active)
Description: "Cycle through all three Chants in rapid succession; each plays for 1 turn in a 4 turns loop automatically."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["symphony_of_war"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: ["automatic aura cycling is a unique automation mechanic; the effect changes every turn; multiple different buffs in sequence"]
- reasoning: "Automated cycling through three different aura buffs. Approximated as a self-buff since the mechanical outcome is sustained multi-type buffing. The cycling/automation mechanic is the gap."

---

### Bladesinger / War Chant / The Eternal War Song (Toggle)
Description: "Activate to simultaneously maintain all three Chants at full power indefinitely; allies within 4 hexes also gain immunity to silence and fear, and your Chants can no longer be interrupted or suppressed."

Mapping:
- effects: [buff_stat, buff_dmgReduce]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["eternal_war_song"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: ["triple simultaneous aura maintenance; CC immunity for allies; interrupt/suppression immunity; toggle (indefinite) vs duration-based; the actual buffs depend on the three Chant definitions"]
- reasoning: "Ultimate aura ability stacking all three Chants plus CC immunity. buff_stat (resolve) for the general empowerment aura. buff_dmgReduce for the protective aspects (fear/silence immunity approximated as damage reduction). The triple-aura and immunity mechanics are major gaps."

---

# Summary Statistics

| Class | Archetypes | Total Non-Passive Abilities Mapped | Abilities with Zero Gaps |
|---|---|---|---|
| Chronoweaver | 3 | 18 | 1 (Stutter) |
| Ironbloom Warden | 3 | 16 | 1 (Barkskin) |
| Echo Dancer | 3 | 17 | 1 (Bass Drop) |
| Bladesinger | 3 | 19 | 1 (Opening Step) |
| **Total** | **12** | **70** | **4** |

## Common Gap Themes

1. **Summon/Placeable Entities**: Seedlings, fungal nodes, clones, decoys — the effect system has no summon type.
2. **Stealth/Invisibility**: No stealth effect; approximated by dodge buff, but mechanically very different.
3. **Silence (Ability Lockout)**: Distinct from stun/daze but no dedicated effect; approximated by cc_daze.
4. **Zone/Terrain Creation**: Walls, persistent areas, placed zones — no terrain manipulation effects.
5. **Damage Tracking/Replay**: Heat Death, Requiem, Time Bomb — recording damage for delayed burst has no parallel.
6. **Fear/Flee**: Forced movement away from caster is neither push nor root; needs its own CC type.
7. **Action Duplication/Echo**: Infinite Loop, Echo Cast — repeating actions has no effect equivalent.
8. **Healing Reduction**: Frequently needed but no dedicated debuff; approximated by resolve.
9. **Combo/Resource Systems**: Rhythm, Resonance, Weave — tracked as conditions but the stacking/consumption mechanics need custom implementation.
10. **Dual-Target Abilities**: Effects that buff allies AND debuff enemies simultaneously (Total Silence, Symphony of Destruction) cannot be expressed in single-target-type abilities.
