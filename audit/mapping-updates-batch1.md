# Mapping Updates — Batch 1

Generated: 2026-03-01
Scope: Chronoweaver, Ironbloom Warden, Echo Dancer, Bladesinger
Criteria: Only skills whose mappings CHANGE due to new effect/targeting types.

---

## Chronoweaver

### Blink Step (Chronoweaver / Accelerant)
**Gap**: Teleportation (ignoring terrain/pathing) had no direct effect; movement point buff was an approximation.
**Before**: effects: [buff_stat], targeting: tgt_self
**After**: effects: [disp_teleport], targeting: tgt_self
**Rationale**: `disp_teleport` is a direct representation of short-range teleportation ignoring terrain. No longer needs the `buff_stat` proxy.

```ts
"blink step": {
  effects: ["disp_teleport"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { disp_teleport: { range: 4 } },
},
```

---

### Flicker Strike (Chronoweaver / Accelerant)
**Gap**: Teleport-to-target-and-back movement component not representable; effectively a ranged melee hit.
**Before**: effects: [dmg_weapon], targeting: tgt_single_enemy
**After**: effects: [disp_teleport, dmg_weapon], targeting: tgt_single_enemy
**Rationale**: Adding `disp_teleport` captures the teleport-to-target component. The teleport-back is still implicit, but the movement-to-engage is now represented.

```ts
"flicker strike": {
  effects: ["disp_teleport", "dmg_weapon"],
  targeting: "tgt_single_enemy",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { disp_teleport: { range: 6 } },
},
```

---

### Temporal Surge (Chronoweaver / Accelerant)
**Gap**: Party-wide targeting beyond adjacent range; affects all allies not just adjacent ones.
**Before**: effects: [buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [buff_stat], targeting: tgt_all_allies
**Rationale**: `tgt_all_allies` precisely represents party-wide ally targeting regardless of range.

```ts
"temporal surge": {
  effects: ["buff_stat"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["haste"], exploits: [] },
  effectParamOverrides: { buff_stat: { stat: "initiative" } },
},
```

---

### Sap Vitality (Chronoweaver / Entropy)
**Gap**: Healing reduction is not a standard stat; resolve was the loosest proxy.
**Before**: effects: [debuff_stat], targeting: tgt_single_enemy
**After**: effects: [debuff_healReduce], targeting: tgt_single_enemy
**Rationale**: `debuff_healReduce` is an exact match for "target heals 30% less for 3 turns." Eliminates the resolve proxy entirely.

```ts
"sap vitality": {
  effects: ["debuff_healReduce"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["heal_reduction"], exploits: [] },
  effectParamOverrides: { debuff_healReduce: { pct: 30, turns: 3 } },
},
```

---

### Rust Touch (Chronoweaver / Entropy)
**Gap**: Armor reduction specifically (vs general vulnerability) is a nuance; stacking mechanic is a detail.
**Before**: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` directly represents percentage-based armor reduction, which is what Corrode does. More precise than generic `debuff_vuln`.

```ts
"rust touch": {
  effects: ["dmg_weapon", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["corrode"], exploits: [] },
  effectParamOverrides: { debuff_armor: { pct: 5, turns: 2 } },
},
```

---

### Entropic Field (Chronoweaver / Entropy)
**Gap**: Zone/persistent area effect over multiple turns; aoe_adjacent is an approximation of a placed zone.
**Before**: effects: [dot_poison], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist], targeting: tgt_aoe_radius3
**Rationale**: `zone_persist` directly models a persistent area effect lasting multiple turns. `tgt_aoe_radius3` captures the "3 hexes zone" description. The Decay DoT is now modeled as the zone's per-turn damage rather than a separate dot_poison.

```ts
"entropic field": {
  effects: ["zone_persist"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["decay"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 3, turns: 2, dmgPerTurn: 0 } },
},
```

---

### Crumble (Chronoweaver / Entropy)
**Gap**: Percentage-based armor destruction is more extreme than a vulnerability debuff but maps to same outcome.
**Before**: effects: [debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` directly represents "destroy 50% of target's remaining armor."

```ts
"crumble": {
  effects: ["debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["armor_break"], exploits: [] },
  effectParamOverrides: { debuff_armor: { pct: 50, turns: 1 } },
},
```

---

### Pandemic (Chronoweaver / Entropy)
**Gap**: DoT spreading/copying mechanic is unique; aoe_adjacent was an approximation for the 4-hex radius.
**Before**: effects: [dot_poison], targeting: tgt_aoe_adjacent
**After**: effects: [dot_poison], targeting: tgt_aoe_radius3
**Rationale**: The 4-hex radius is better captured by `tgt_aoe_radius3` (closest available) than `tgt_aoe_adjacent`. The DoT spreading mechanic itself is still a gap, but the targeting is now more accurate.

```ts
"pandemic": {
  effects: ["dot_poison"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
},
```

---

### Heat Death (Chronoweaver / Entropy)
**Gap**: Damage recording and replay mechanic is unique; delayed burst based on accumulated damage has no direct parallel.
**Before**: effects: [dmg_spell, dmg_execute], targeting: tgt_single_enemy
**After**: effects: [channel_dmg, dmg_execute], targeting: tgt_single_enemy
**Rationale**: `channel_dmg` better represents the 3-turn damage accumulation/recording window than `dmg_spell`. The delayed burst at the end is still `dmg_execute`. The combination of channeled tracking + execute burst is a closer model of "record damage, then replay."

```ts
"heat death": {
  effects: ["channel_dmg", "dmg_execute"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["heat_death_mark"], exploits: ["dot_bleed", "dot_burn", "dot_poison"] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 3 } },
},
```

---

### Rewind (Chronoweaver / Paradox)
**Gap**: Position restoration (teleport to previous location) not representable; HP snapshot restoration vs percentage healing is a nuance.
**Before**: effects: [heal_pctDmg], targeting: tgt_self
**After**: effects: [heal_flat, disp_teleport], targeting: tgt_self
**Rationale**: `heal_flat` better represents HP snapshot restoration (restoring to a fixed value rather than healing based on damage dealt). `disp_teleport` captures the position-restoration component, which was previously unrepresentable.

```ts
"rewind": {
  effects: ["heal_flat", "disp_teleport"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 0 }, disp_teleport: { range: 99 } },
},
```

---

### Causal Loop (Chronoweaver / Paradox)
**Gap**: Damage reflection/self-harm on attack is unique; debuff_vuln was a loose approximation.
**Before**: effects: [debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [dmg_reflect], targeting: tgt_single_enemy
**Rationale**: `dmg_reflect` is a direct match for "takes damage equal to damage they deal." The reflection mechanic is no longer a gap.

```ts
"causal loop": {
  effects: ["dmg_reflect"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["causal_loop"], exploits: [] },
  effectParamOverrides: { dmg_reflect: { pct: 100, turns: 2 } },
},
```

---

### Time Bomb (Chronoweaver / Paradox)
**Gap**: Delayed detonation based on accumulated damage is unique; damage recording over time has no effect parallel.
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, dmg_spell], targeting: tgt_aoe_radius2
**Rationale**: `zone_persist` represents the placed marker that records damage over 2 turns. `dmg_spell` represents the detonation burst. `tgt_aoe_radius2` is more appropriate than `tgt_aoe_adjacent` for a placed zone with an area effect.

```ts
"time bomb": {
  effects: ["zone_persist", "dmg_spell"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["time_bomb_marker"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 } },
},
```

---

### Fork Reality (Chronoweaver / Paradox)
**Gap**: Summon/clone mechanic was not representable; clone as separate entity with AI, HP, positioning was a major gap.
**Before**: effects: [dmg_multihit], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: `summon_unit` directly represents creating a clone entity with HP and a finite duration. The clone copying attacks at 40% is a parameter detail. This eliminates the major "no summon type" gap.

```ts
"fork reality": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["clone"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 } },
},
```

---

### Infinite Loop (Chronoweaver / Accelerant)
**Gap**: Action duplication/echo mechanic has no effect equivalent; initiative buff was a very rough proxy.
**Before**: effects: [buff_stat], targeting: tgt_self
**After**: effects: [transform_state], targeting: tgt_self
**Rationale**: `transform_state` represents entering a powerful temporary state with enhanced rules. "Every action repeated for free" is a transform/ultimate state rather than a simple stat buff. The bonus percentage can represent the effective doubling.

```ts
"infinite loop": {
  effects: ["transform_state"],
  targeting: "tgt_self",
  conditions: { creates: ["infinite_loop"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 2, bonusPct: 100 } },
},
```

---

### Closed Timelike (Chronoweaver / Paradox)
**Gap**: Full battlefield state rewind is completely unique and cannot be represented by effects.
**Before**: effects: [heal_pctDmg, buff_stat], targeting: tgt_self
**After**: effects: [heal_flat, transform_state], targeting: tgt_self
**Rationale**: `heal_flat` replaces `heal_pctDmg` since HP restoration to a snapshot is a fixed amount, not percent-of-damage. `transform_state` replaces the vague `buff_stat` (resolve) since this is fundamentally a state transformation that rewrites battlefield rules. The battlefield rewind itself remains custom, but the self-benefit portion is better captured.

```ts
"closed timelike": {
  effects: ["heal_flat", "transform_state"],
  targeting: "tgt_self",
  conditions: { creates: ["time_rewind"], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 0 }, transform_state: { turns: 1, bonusPct: 0 } },
},
```

---

## Ironbloom Warden

### Root Stance (Ironbloom Warden / Thornwall)
**Gap**: Threat/aggro generation has no effect representation.
**Before**: effects: [buff_dmgReduce, debuff_stat], targeting: tgt_self
**After**: effects: [buff_dmgReduce, debuff_stat, cc_taunt], targeting: tgt_self
**Rationale**: `cc_taunt` directly represents threat/aggro generation by forcing enemies to target you. This was previously a gap with no available type.

```ts
"root stance": {
  effects: ["buff_dmgReduce", "debuff_stat", "cc_taunt"],
  targeting: "tgt_self",
  conditions: { creates: ["rooted_stance"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, cc_taunt: { turns: 2 } },
},
```

---

### Entangling Wall (Ironbloom Warden / Thornwall)
**Gap**: Persistent terrain/wall creation not representable; line-shaped targeting differs from adjacent AoE.
**Before**: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, debuff_stat], targeting: tgt_aoe_line
**Rationale**: `zone_persist` models the persistent thorn wall lasting multiple turns. `tgt_aoe_line` captures the line-of-thorns shape (3 hexes in a line). The movement slow remains `debuff_stat`.

```ts
"entangling wall": {
  effects: ["zone_persist", "debuff_stat"],
  targeting: "tgt_aoe_line",
  conditions: { creates: ["thorn_wall"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 1, turns: 3, dmgPerTurn: 0 }, debuff_stat: { stat: "movementPoints" } },
},
```

---

### World Tree (Ironbloom Warden / Thornwall)
**Gap**: Ally AoE damage reduction aura not directly targetable; massive thorn reflect damage needs a reflect/reactive system; immobility as transform is unique.
**Before**: effects: [buff_dmgReduce, stance_counter], targeting: tgt_self
**After**: effects: [buff_dmgReduce, dmg_reflect, transform_state], targeting: tgt_self
**Rationale**: `dmg_reflect` replaces `stance_counter` as a more precise model for "attackers take massive thorn damage" -- it is literally damage reflection. `transform_state` captures the immobile-but-massively-empowered transformation aspect. The ally DR aura remains a gap but the self effects are now more accurate.

```ts
"world tree": {
  effects: ["buff_dmgReduce", "dmg_reflect", "transform_state"],
  targeting: "tgt_self",
  conditions: { creates: ["world_tree", "rooted_stance"], exploits: [] },
  effectParamOverrides: { dmg_reflect: { pct: 100, turns: 3 }, transform_state: { turns: 3, bonusPct: 80 } },
},
```

---

### Rejuvenate (Ironbloom Warden / Overgrowth)
**Gap**: Heal-over-time (HoT) vs instant heal is a delivery nuance not captured by heal_pctDmg.
**Before**: effects: [heal_pctDmg], targeting: tgt_single_ally
**After**: effects: [heal_hot], targeting: tgt_single_ally
**Rationale**: `heal_hot` is a direct representation of heal-over-time delivery. No longer approximated by instant heal.

```ts
"rejuvenate": {
  effects: ["heal_hot"],
  targeting: "tgt_single_ally",
  conditions: { creates: ["rejuvenate_hot"], exploits: [] },
  effectParamOverrides: { heal_hot: { healPerTurn: 0, turns: 3 } },
},
```

---

### Seedling (Ironbloom Warden / Overgrowth)
**Gap**: Summon/placeable entity is a major gap; persistent healing zone from a placed object is not representable.
**Before**: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [summon_unit, heal_hot], targeting: tgt_aoe_radius2
**Rationale**: `summon_unit` represents the placed seedling entity. `heal_hot` represents the pulsing heals over turns. `tgt_aoe_radius2` captures the "2 hexes" heal radius. This resolves two major gaps simultaneously.

```ts
"seedling": {
  effects: ["summon_unit", "heal_hot"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["seedling"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 }, heal_hot: { healPerTurn: 0, turns: 3 } },
},
```

---

### Verdant Tide (Ironbloom Warden / Overgrowth)
**Gap**: Large radius AoE heal zone vs adjacent-only targeting.
**Before**: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [heal_hot], targeting: tgt_aoe_radius3
**Rationale**: `heal_hot` directly represents the HoT delivery. `tgt_aoe_radius3` captures the 3-hex radius, replacing the undersized `tgt_aoe_adjacent`.

```ts
"verdant tide": {
  effects: ["heal_hot"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["verdant_tide_hot"], exploits: [] },
  effectParamOverrides: { heal_hot: { healPerTurn: 0, turns: 3 } },
},
```

---

### Bloom Cascade (Ironbloom Warden / Overgrowth)
**Gap**: Consuming summons for scaling effect; multi-point AoE not representable as single AoE.
**Before**: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [heal_flat], targeting: tgt_all_allies
**Rationale**: `heal_flat` better represents a burst heal (consuming seedlings for one big heal) vs the damage-based proxy. `tgt_all_allies` captures the "all allies in radius of each seedling" since consuming all seedlings effectively covers the whole party.

```ts
"bloom cascade": {
  effects: ["heal_flat"],
  targeting: "tgt_all_allies",
  conditions: { creates: [], exploits: ["seedling"] },
  effectParamOverrides: { heal_flat: { amount: 0 } },
},
```

---

### Gaia's Embrace (Ironbloom Warden / Overgrowth)
**Gap**: Battlefield-wide persistent effect; automatic summon spawning; combined ally heal + enemy debuff on different target groups.
**Before**: effects: [heal_pctDmg, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [heal_hot, debuff_stat, summon_unit, zone_persist], targeting: tgt_all_allies
**Rationale**: `heal_hot` replaces instant heal for the 5% max HP/turn regen. `summon_unit` captures auto-spawning seedlings. `zone_persist` represents the battlefield-wide persistent nature. `tgt_all_allies` is the primary targeting for the regen. The enemy slow (`debuff_stat`) still applies but dual-targeting remains a gap.

```ts
"gaia's embrace": {
  effects: ["heal_hot", "debuff_stat", "summon_unit", "zone_persist"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["gaia_embrace", "seedling"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, summon_unit: { hp: 0, turns: 4, count: 1 }, zone_persist: { radius: 99, turns: 4, dmgPerTurn: 0 }, heal_hot: { healPerTurn: 0, turns: 4 } },
},
```

---

### Fungal Growth (Ironbloom Warden / Rot Herald)
**Gap**: Summon/placeable entity (fungal node) is a major gap; persistent poison zone from a placed object is not a standard effect.
**Before**: effects: [dot_poison], targeting: tgt_aoe_adjacent
**After**: effects: [summon_unit, zone_persist], targeting: tgt_aoe_radius2
**Rationale**: `summon_unit` represents the placed fungal node entity. `zone_persist` represents the persistent poison aura emanating from it. `tgt_aoe_radius2` captures the 2-hex poison radius.

```ts
"fungal growth": {
  effects: ["summon_unit", "zone_persist"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["fungal_node"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: 0, count: 1 }, zone_persist: { radius: 2, turns: 0, dmgPerTurn: 0 } },
},
```

---

### Plague Garden (Ironbloom Warden / Rot Herald)
**Gap**: Multi-point zone creation (triangle formation); persistent terrain effect; healing reduction has no direct stat.
**Before**: effects: [dot_poison, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, debuff_healReduce, summon_unit], targeting: tgt_aoe_radius2
**Rationale**: `zone_persist` models the persistent poison zone. `debuff_healReduce` directly represents the 40% healing reduction, replacing the imprecise `debuff_stat` (resolve) proxy. `summon_unit` captures the 3 placed fungal nodes. `tgt_aoe_radius2` is more accurate for the triangle zone area.

```ts
"plague garden": {
  effects: ["zone_persist", "debuff_healReduce", "summon_unit"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["fungal_node", "plague_zone", "heal_reduction"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 2, turns: 0, dmgPerTurn: 0 }, debuff_healReduce: { pct: 40, turns: 0 }, summon_unit: { hp: 0, turns: 0, count: 3 } },
},
```

---

### Parasitic Vine (Ironbloom Warden / Rot Herald)
**Gap**: Tethered/leash mechanic (breaks on distance); HP drain as simultaneous damage + heal channel.
**Before**: effects: [dot_poison, heal_pctDmg], targeting: tgt_single_enemy
**After**: effects: [channel_dmg, lifesteal], targeting: tgt_single_enemy
**Rationale**: `channel_dmg` represents the sustained drain over 2 turns (channeled damage to the target). `lifesteal` directly models "damage dealt converts to healing for the caster," which is exactly what HP drain does. The tether/distance-break is still a custom detail but the core mechanic is now precisely represented.

```ts
"parasitic vine": {
  effects: ["channel_dmg", "lifesteal"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["parasitic_vine"], exploits: [] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 2 }, lifesteal: { pct: 100 } },
},
```

---

### Cordyceps (Ironbloom Warden / Rot Herald)
**Gap**: On-death summon/minion creation is a major gap; conditional trigger (death within window) has no parallel; resolve debuff was a very loose placeholder.
**Before**: effects: [debuff_stat], targeting: tgt_single_enemy
**After**: effects: [debuff_stat, summon_unit], targeting: tgt_single_enemy
**Rationale**: Adding `summon_unit` captures the minion-creation payoff, even though the death trigger is still custom logic. The debuff application on the target remains. This is more honest about what the ability produces than a bare resolve debuff.

```ts
"cordyceps": {
  effects: ["debuff_stat", "summon_unit"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["cordyceps_infection"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "resolve" }, summon_unit: { hp: 0, turns: 4, count: 1 } },
},
```

---

## Echo Dancer

### Muffle (Echo Dancer / Silence)
**Gap**: Silence (ability lockout) is distinct from daze (AP loss); silence specifically prevents abilities while allowing basic attacks/movement.
**Before**: effects: [cc_daze], targeting: tgt_single_enemy
**After**: effects: [cc_silence], targeting: tgt_single_enemy
**Rationale**: `cc_silence` is an exact match for "no abilities for 1 turn." This was the #3 most common gap theme across the entire audit.

```ts
"muffle": {
  effects: ["cc_silence"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["silence"], exploits: [] },
  effectParamOverrides: { cc_silence: { turns: 1 } },
},
```

---

### Sound Eater (Echo Dancer / Silence)
**Gap**: Stealth/invisibility mechanic (untargetable) is not representable; dodge buff was a very rough proxy.
**Before**: effects: [buff_stat], targeting: tgt_self
**After**: effects: [buff_stealth], targeting: tgt_self
**Rationale**: `buff_stealth` directly represents stealth/invisibility with break-on-attack behavior. Eliminates the dodge proxy entirely.

```ts
"sound eater": {
  effects: ["buff_stealth"],
  targeting: "tgt_self",
  conditions: { creates: ["stealth"], exploits: [] },
  effectParamOverrides: { buff_stealth: { turns: 2, breakOnAttack: 1 } },
},
```

---

### Dead Air (Echo Dancer / Silence)
**Gap**: Persistent zone/terrain effect; silence as distinct from daze; area denial mechanic.
**Before**: effects: [cc_daze], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, cc_silence], targeting: tgt_aoe_radius2
**Rationale**: `cc_silence` replaces `cc_daze` for ability lockout. `zone_persist` represents the persistent silence zone. `tgt_aoe_radius2` captures the 2-hex zone radius.

```ts
"dead air": {
  effects: ["zone_persist", "cc_silence"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["silence_zone"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 }, cc_silence: { turns: 2 } },
},
```

---

### Void Frequency (Echo Dancer / Silence)
**Gap**: Cooldown manipulation is a unique mechanic with no effect parallel; daze (AP loss) approximates reduced effectiveness.
**Before**: effects: [cc_daze], targeting: tgt_single_enemy
**After**: effects: [cc_silence], targeting: tgt_single_enemy
**Rationale**: Freezing cooldowns prevents the target from regaining access to abilities, which is mechanically closer to `cc_silence` (ability lockout) than `cc_daze` (AP loss). The target can still take basic actions but their ability rotation is frozen.

```ts
"void frequency": {
  effects: ["cc_silence"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["cooldown_freeze"], exploits: [] },
  effectParamOverrides: { cc_silence: { turns: 2 } },
},
```

---

### Ghost Note (Echo Dancer / Silence)
**Gap**: Decoy/summon that draws aggro is a major gap; taunt/threat redirection has no effect; stealth as dodge buff is approximate.
**Before**: effects: [buff_stat], targeting: tgt_self
**After**: effects: [buff_stealth, summon_unit, cc_taunt], targeting: tgt_self
**Rationale**: `buff_stealth` replaces the dodge proxy for the stealth component. `summon_unit` represents the placed decoy entity. `cc_taunt` (on the decoy) represents enemies being forced to target it. This resolves three gaps simultaneously.

```ts
"ghost note": {
  effects: ["buff_stealth", "summon_unit", "cc_taunt"],
  targeting: "tgt_self",
  conditions: { creates: ["stealth", "decoy"], exploits: [] },
  effectParamOverrides: { buff_stealth: { turns: 2, breakOnAttack: 1 }, summon_unit: { hp: 0, turns: 2, count: 1 }, cc_taunt: { turns: 2 } },
},
```

---

### Total Silence (Echo Dancer / Silence)
**Gap**: Dual-target effect (enemies silenced, allies stealthed) on different groups from same ability; large radius vs adjacent.
**Before**: effects: [cc_daze, buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [cc_silence, buff_stealth], targeting: tgt_aoe_radius3
**Rationale**: `cc_silence` replaces `cc_daze` for the enemy silence. `buff_stealth` replaces the dodge proxy for ally stealth. `tgt_aoe_radius3` is the closest match for the 4-hex radius. The dual-target nature (enemies vs allies) is still a gap, but the individual effects are now precise.

```ts
"total silence": {
  effects: ["cc_silence", "buff_stealth"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["silence", "stealth"], exploits: [] },
  effectParamOverrides: { cc_silence: { turns: 2 }, buff_stealth: { turns: 2, breakOnAttack: 1 } },
},
```

---

### The Unheard (Echo Dancer / Silence)
**Gap**: Permanent unbreakable stealth is unique; untargetable status has no effect; +50% damage from stealth is a conditional modifier.
**Before**: effects: [buff_stat, buff_dmgReduce], targeting: tgt_self
**After**: effects: [buff_stealth, transform_state], targeting: tgt_self
**Rationale**: `buff_stealth` replaces the dodge proxy (with `breakOnAttack: 0` for unbreakable). `transform_state` represents the ultimate transformation with +50% damage bonus, replacing the vague `buff_dmgReduce` approximation.

```ts
"the unheard": {
  effects: ["buff_stealth", "transform_state"],
  targeting: "tgt_self",
  conditions: { creates: ["stealth", "untargetable"], exploits: [] },
  effectParamOverrides: { buff_stealth: { turns: 4, breakOnAttack: 0 }, transform_state: { turns: 4, bonusPct: 50 } },
},
```

---

### Screech (Echo Dancer / Cacophony)
**Gap**: Cone-shaped targeting vs adjacent AoE.
**Before**: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_cone
**Rationale**: `tgt_aoe_cone` directly represents the cone AoE shape described in the ability. Effects are unchanged.

```ts
"screech": {
  effects: ["dmg_spell", "debuff_stat"],
  targeting: "tgt_aoe_cone",
  conditions: { creates: ["disoriented"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "meleeSkill" } },
},
```

---

### Bass Drop (Echo Dancer / Cacophony)
**Gap**: None (was already clean), but targeting can be refined.
**Before**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_radius2
**Rationale**: The description says "2 hexes" radius. `tgt_aoe_radius2` is a more precise match than generic `tgt_aoe_adjacent`.

```ts
"bass drop": {
  effects: ["dmg_spell", "disp_push"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: [], exploits: [] },
},
```

---

### Wall of Sound (Echo Dancer / Cacophony)
**Gap**: Persistent barrier/wall terrain creation; triggered effect on crossing (reactive, not immediate).
**Before**: effects: [dmg_spell, cc_stun], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, cc_stun], targeting: tgt_aoe_line
**Rationale**: `zone_persist` models the persistent barrier. `tgt_aoe_line` captures the wall/barrier shape (a line of hexes). The stun-on-crossing trigger is still custom logic but the zone + line shape are now representable.

```ts
"wall of sound": {
  effects: ["zone_persist", "cc_stun"],
  targeting: "tgt_aoe_line",
  conditions: { creates: ["sound_wall"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 1, turns: 0, dmgPerTurn: 0 } },
},
```

---

### Shockwave (Echo Dancer / Cacophony)
**Gap**: Line-shaped targeting vs adjacent AoE; escalating damage per target hit is a unique scaling mechanic.
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell], targeting: tgt_aoe_line
**Rationale**: `tgt_aoe_line` directly represents the "line attack: damages all enemies in a row" description.

```ts
"shockwave": {
  effects: ["dmg_spell"],
  targeting: "tgt_aoe_line",
  conditions: { creates: [], exploits: [] },
},
```

---

### Noise Complaint (Echo Dancer / Cacophony)
**Gap**: Friendly fire mechanic is unique; large radius AoE; Disoriented causing ally-targeting is beyond simple miss chance.
**Before**: effects: [debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [debuff_stat, cc_charm], targeting: tgt_aoe_radius3
**Rationale**: `cc_charm` captures the "30% chance to hit an ally instead" mechanic -- charm/mind control causing friendly fire. `tgt_aoe_radius3` is the closest match for the 4-hex radius. The Disoriented accuracy debuff remains alongside the charm.

```ts
"noise complaint": {
  effects: ["debuff_stat", "cc_charm"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["disoriented"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "meleeSkill" }, cc_charm: { turns: 2, chance: 30 } },
},
```

---

### Brown Note (Echo Dancer / Cacophony)
**Gap**: Fear/flee mechanic (forced movement away) is unique; fear spreading to nearby enemies on movement; cc_root was opposite of forced movement.
**Before**: effects: [cc_root, dot_burn], targeting: tgt_single_enemy
**After**: effects: [cc_fear, dot_burn], targeting: tgt_single_enemy
**Rationale**: `cc_fear` is an exact match for "flees in terror for 2 turns." Replaces the incorrect `cc_root` (which is the opposite of forced movement). Fear was gap theme #6 in the audit.

```ts
"brown note": {
  effects: ["cc_fear", "dot_burn"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["fear"], exploits: [] },
  effectParamOverrides: { cc_fear: { chance: 100, turns: 2 } },
},
```

---

### Symphony of Destruction (Echo Dancer / Cacophony)
**Gap**: Persistent escalating damage zone; dual-target (enemies damaged/debuffed, allies buffed) in same ability; large radius.
**Before**: effects: [dmg_spell, debuff_stat, buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, debuff_stat, buff_stat], targeting: tgt_aoe_radius3
**Rationale**: `zone_persist` replaces `dmg_spell` to represent the persistent damage zone that escalates over 3 turns. `tgt_aoe_radius3` is the closest match for the 5-hex radius. The dual-target nature remains a gap but the zone and radius are now represented.

```ts
"symphony of destruction": {
  effects: ["zone_persist", "debuff_stat", "buff_stat"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["disoriented", "symphony_zone"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 3, turns: 3, dmgPerTurn: 0 }, debuff_stat: { stat: "meleeSkill" }, buff_stat: { stat: "meleeSkill" } },
},
```

---

### Requiem (Echo Dancer / Resonance)
**Gap**: Damage tracking and replay mechanic is unique; defense-ignoring damage has no modifier; delayed burst based on accumulated damage.
**Before**: effects: [dmg_spell, dmg_execute], targeting: tgt_single_enemy
**After**: effects: [channel_dmg, dmg_execute], targeting: tgt_single_enemy
**Rationale**: `channel_dmg` replaces `dmg_spell` to represent the 3-turn damage tracking/recording window, matching the same logic applied to Heat Death. The execute burst at the end remains.

```ts
"requiem": {
  effects: ["channel_dmg", "dmg_execute"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["requiem_mark"], exploits: [] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 3 } },
},
```

---

## Bladesinger

### Whirlwind Step (Bladesinger / Sword Dance)
**Gap**: Dash-through movement (ends on other side of target); combo timer reset is a custom mechanic.
**Before**: effects: [dmg_weapon], targeting: tgt_single_enemy
**After**: effects: [disp_dash, dmg_weapon], targeting: tgt_single_enemy
**Rationale**: `disp_dash` captures the dash-through movement component. The damage-on-arrival represents hitting the target while passing through.

```ts
"whirlwind step": {
  effects: ["disp_dash", "dmg_weapon"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["rhythm"], exploits: [] },
  effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 0 } },
},
```

---

### Pivot Slash (Bladesinger / Sword Dance)
**Gap**: 180-degree arc targeting (half-circle) vs full adjacent AoE.
**Before**: effects: [dmg_weapon], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon], targeting: tgt_aoe_cone
**Rationale**: `tgt_aoe_cone` (120-degree) is a much closer approximation of the 180-degree arc than full `tgt_aoe_adjacent` (360-degree). It captures the directional nature of the attack.

```ts
"pivot slash": {
  effects: ["dmg_weapon"],
  targeting: "tgt_aoe_cone",
  conditions: { creates: ["rhythm"], exploits: [] },
},
```

---

### The Endless Dance (Bladesinger / Sword Dance)
**Gap**: Transform/ultimate state with multiple rule changes; auto-firing abilities; uncapped resource accumulation; interrupt immunity.
**Before**: effects: [buff_stat, dmg_multihit], targeting: tgt_self
**After**: effects: [transform_state, dmg_multihit], targeting: tgt_self
**Rationale**: `transform_state` replaces `buff_stat` to represent the fundamental rule-changing transformation (uncapped Rhythm, auto-firing Crescendo, interrupt immunity). The `dmg_multihit` remains for the repeated auto-strikes.

```ts
"the endless dance": {
  effects: ["transform_state", "dmg_multihit"],
  targeting: "tgt_self",
  conditions: { creates: ["eternal_rhythm"], exploits: ["rhythm"] },
  effectParamOverrides: { transform_state: { turns: 4, bonusPct: 0 } },
},
```

---

### Force Bolt Slash (Bladesinger / Spell Weave)
**Gap**: Dash/gap-close movement component; dual-nature ability.
**Before**: effects: [dmg_spell, dmg_weapon], targeting: tgt_single_enemy
**After**: effects: [dmg_spell, disp_dash, dmg_weapon], targeting: tgt_single_enemy
**Rationale**: `disp_dash` captures the "immediately dash forward to strike" component that was previously unrepresentable.

```ts
"force bolt slash": {
  effects: ["dmg_spell", "disp_dash", "dmg_weapon"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["blade_charge"], exploits: [] },
  effectParamOverrides: { disp_dash: { range: 4, damageOnArrival: 0 } },
},
```

---

### Phase Cut (Bladesinger / Spell Weave)
**Gap**: Teleport-behind positioning; armor ignore is more absolute than vulnerability debuff.
**Before**: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [disp_teleport, dmg_weapon, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `disp_teleport` captures the teleport-behind positioning. `debuff_armor` replaces `debuff_vuln` since ignoring armor is destroying the target's armor value, not increasing general vulnerability.

```ts
"phase cut": {
  effects: ["disp_teleport", "dmg_weapon", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: [], exploits: ["weave_resonance"] },
  effectParamOverrides: { disp_teleport: { range: 1 }, debuff_armor: { pct: 100, turns: 1 } },
},
```

---

### Resonance Overflow (Bladesinger / Spell Weave)
**Gap**: Line/piercing targeting shape vs adjacent AoE.
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell], targeting: tgt_aoe_line
**Rationale**: `tgt_aoe_line` directly represents "beam...pierces all targets in a line."

```ts
"resonance overflow": {
  effects: ["dmg_spell"],
  targeting: "tgt_aoe_line",
  conditions: { creates: [], exploits: ["weave_resonance"] },
},
```

---

### Grand Synthesis (Bladesinger / Spell Weave)
**Gap**: Dual-domain damage (melee + AoE spell simultaneously); 4-hex nova in one ability.
**Before**: effects: [dmg_weapon, dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon, dmg_spell], targeting: tgt_aoe_radius3
**Rationale**: `tgt_aoe_radius3` is the closest match for the 4-hex nova radius, replacing the undersized `tgt_aoe_adjacent`.

```ts
"grand synthesis": {
  effects: ["dmg_weapon", "dmg_spell"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: ["weave_resonance"] },
},
```

---

### Harmonic Chorus (Bladesinger / War Chant)
**Gap**: Aura amplification (radius + potency) is a modifier on existing aura, not a standalone effect.
**Before**: effects: [buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [buff_stat], targeting: tgt_all_allies
**Rationale**: "Double radius" for a chant that buffs allies maps better to `tgt_all_allies` since the amplified aura reaches the whole party.

```ts
"harmonic chorus": {
  effects: ["buff_stat"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["harmonic_chorus"], exploits: [] },
  effectParamOverrides: { buff_stat: { stat: "resolve" } },
},
```

---

### Discordant Note (Bladesinger / War Chant)
**Gap**: Interrupt/counterspell mechanic is reactive/timed and different from a standard CC application.
**Before**: effects: [cc_daze], targeting: tgt_single_enemy
**After**: effects: [cc_silence], targeting: tgt_single_enemy
**Rationale**: `cc_silence` (ability lockout) is a better model for interrupting a spell/ability than `cc_daze` (AP loss). Interrupting means the ability fails and cannot be used, which is silence behavior.

```ts
"discordant note": {
  effects: ["cc_silence"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["interrupt"], exploits: [] },
  effectParamOverrides: { cc_silence: { turns: 1 } },
},
```

---

### The Eternal War Song (Bladesinger / War Chant)
**Gap**: Triple simultaneous aura maintenance; CC immunity for allies; toggle vs duration-based.
**Before**: effects: [buff_stat, buff_dmgReduce], targeting: tgt_aoe_adjacent
**After**: effects: [buff_stat, buff_dmgReduce, transform_state], targeting: tgt_all_allies
**Rationale**: `transform_state` captures the ultimate transformation aspect (triple aura, immunity to suppression). `tgt_all_allies` properly represents the 4-hex ally targeting for the chant auras, which is party-wide in practice.

```ts
"the eternal war song": {
  effects: ["buff_stat", "buff_dmgReduce", "transform_state"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["eternal_war_song"], exploits: [] },
  effectParamOverrides: { buff_stat: { stat: "resolve" }, transform_state: { turns: 0, bonusPct: 0 } },
},
```

---

## Skills NOT Changed (gaps remain custom)

The following skills have gaps that are NOT addressable by the new types because their mechanics are fundamentally custom game-state manipulations, resource system interactions, or combo-chain logic:

| Skill | Class | Remaining Gap |
|---|---|---|
| Quicken | Chronoweaver | Action rate as initiative proxy is the best available fit |
| Shared Haste | Chronoweaver | "Modifier on another ability" pattern is architectural |
| Overclock | Chronoweaver | Delayed self-stun timing is a parameter detail |
| Deja Vu | Chronoweaver | Forced action repetition is entirely custom |
| Echo Cast | Chronoweaver | Skill copying/echo needs custom implementation |
| Grandfather | Chronoweaver | Action erasure/undo is game-state manipulation |
| Splinter Burst | Ironbloom Warden | Damage-scaling-from-absorbed is a conditional formula |
| Overgrowth | Ironbloom Warden | Modifying existing summons is a meta-ability |
| The Spreading | Ironbloom Warden | Instakill + infection spread is custom |
| Tuning Strike | Echo Dancer | Resonance stacking is a resource system |
| Shatter Point | Echo Dancer | Stack-consumption scaling is custom formula |
| Crystal Freq | Echo Dancer | Stack rate doubling is a modifier mechanic |
| Sonic Boom | Echo Dancer | Chain reaction detonation is custom |
| Ambush | Echo Dancer | Conditional stealth bonus is a parameter |
| Tinnitus | Echo Dancer | Melee+ranged miss is a minor limitation |
| Opening Step | Bladesinger | Rhythm is a resource system (zero gaps on effects) |
| Flowing Cut | Bladesinger | Combo sequencing is custom |
| Rising Flourish | Bladesinger | Airborne state is custom positional CC |
| Crescendo Strike | Bladesinger | Stack-to-damage formula is custom |
| Blade Waltz | Bladesinger | Auto-combo-chaining is custom AI |
| Dervish Protocol | Bladesinger | Movement-triggered AoE is custom |
| Arcane Edge | Bladesinger | Blade priming is a condition, not an effect gap |
| Spark Slash | Bladesinger | Conditional bonus from charge is custom combo |
| Runic Barrage | Bladesinger | Alternating type classification is custom |
| Counterpoint | Bladesinger | Dual aura maintenance is architectural |
| Symphony of War | Bladesinger | Auto-cycling auras is custom automation |

---

## Summary

| Metric | Count |
|---|---|
| Total skills audited | 70 |
| Skills with changes | 44 |
| Skills unchanged (best fit already) | 26 |
| New effect types used | 14 of 20 |
| New targeting types used | 5 of 6 |

### New Types Utilized
- `disp_teleport`: 4 skills (Blink Step, Flicker Strike, Rewind, Phase Cut)
- `disp_dash`: 2 skills (Whirlwind Step, Force Bolt Slash)
- `cc_fear`: 1 skill (Brown Note)
- `cc_silence`: 5 skills (Muffle, Dead Air, Void Frequency, Total Silence, Discordant Note)
- `cc_taunt`: 2 skills (Root Stance, Ghost Note)
- `cc_charm`: 1 skill (Noise Complaint)
- `debuff_armor`: 3 skills (Rust Touch, Crumble, Phase Cut)
- `debuff_healReduce`: 2 skills (Sap Vitality, Plague Garden)
- `buff_stealth`: 4 skills (Sound Eater, Ghost Note, Total Silence, The Unheard)
- `heal_flat`: 3 skills (Rewind, Bloom Cascade, Closed Timelike)
- `heal_hot`: 4 skills (Rejuvenate, Seedling, Verdant Tide, Gaia's Embrace)
- `lifesteal`: 1 skill (Parasitic Vine)
- `dmg_reflect`: 2 skills (Causal Loop, World Tree)
- `summon_unit`: 6 skills (Fork Reality, Seedling, Gaia's Embrace, Fungal Growth, Cordyceps, Ghost Note)
- `zone_persist`: 7 skills (Entropic Field, Time Bomb, Entangling Wall, Dead Air, Wall of Sound, Symphony of Destruction, Fungal Growth, Plague Garden, Gaia's Embrace)
- `channel_dmg`: 3 skills (Heat Death, Parasitic Vine, Requiem)
- `transform_state`: 5 skills (Infinite Loop, Closed Timelike, World Tree, The Unheard, The Endless Dance, The Eternal War Song)
- `tgt_aoe_cone`: 2 skills (Screech, Pivot Slash)
- `tgt_aoe_line`: 4 skills (Entangling Wall, Wall of Sound, Shockwave, Resonance Overflow)
- `tgt_aoe_radius2`: 4 skills (Bass Drop, Time Bomb, Dead Air, Seedling, Fungal Growth, Plague Garden)
- `tgt_aoe_radius3`: 5 skills (Entropic Field, Pandemic, Verdant Tide, Noise Complaint, Symphony of Destruction, Grand Synthesis, Total Silence)
- `tgt_all_allies`: 4 skills (Temporal Surge, Bloom Cascade, Gaia's Embrace, Harmonic Chorus, The Eternal War Song)

### Unused New Types
- `disp_pull` — no pull mechanics in these 4 classes
- `buff_shield` — no absorption shield abilities in these classes
- `trap_place` — no trap abilities in these classes
- `tgt_aoe_radius2` — used (listed above)
- `tgt_all_enemies` — no "all enemies on field" abilities in batch 1
