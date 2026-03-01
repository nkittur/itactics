# Mapping Updates - Batch 3: Berserker, Monk, Ranger

Generated: 2026-03-01

Using new effect types: `disp_teleport`, `disp_dash`, `disp_pull`, `cc_fear`, `cc_silence`, `cc_taunt`, `cc_charm`, `debuff_armor`, `debuff_healReduce`, `buff_stealth`, `buff_shield`, `heal_flat`, `heal_hot`, `lifesteal`, `dmg_reflect`, `summon_unit`, `zone_persist`, `trap_place`, `channel_dmg`, `transform_state`

Using new targeting types: `tgt_aoe_cone`, `tgt_aoe_line`, `tgt_aoe_radius2`, `tgt_aoe_radius3`, `tgt_all_allies`, `tgt_all_enemies`

---

## Berserker

---

### Battle Cry (Berserker / Primal Howl)
**Gap**: fear/flee mechanic (forced movement away); 2-hex radius vs adjacent
**Before**: effects: [cc_daze, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [cc_fear, debuff_stat], targeting: tgt_aoe_radius2
**Rationale**: `cc_fear` directly represents the fear/flee mechanic that was approximated by `cc_daze`. `tgt_aoe_radius2` matches the described 2-hex radius instead of approximating with adjacent.

```ts
"battle cry": {
  effects: ["cc_fear", "debuff_stat"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["feared", "intimidated"], exploits: ["low_morale"] },
  effectParamOverrides: { cc_fear: { chance: 60, turns: 2 }, debuff_stat: { stat: "meleeSkill" } },
},
```

---

### Taunt (Berserker / Primal Howl)
**Gap**: taunt/forced-targeting mechanic
**Before**: effects: [cc_daze, debuff_stat], targeting: tgt_single_enemy
**After**: effects: [cc_taunt, debuff_stat], targeting: tgt_single_enemy
**Rationale**: `cc_taunt` is a direct match for forced-targeting. Replaces the `cc_daze` workaround entirely.

```ts
"taunt": {
  effects: ["cc_taunt", "debuff_stat"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["taunted"], exploits: [] },
  effectParamOverrides: { cc_taunt: { turns: 4 }, debuff_stat: { stat: "meleeSkill" } },
},
```

---

### Howl of Terror (Berserker / Primal Howl)
**Gap**: 4-hex range vs adjacent; tiered effect based on enemy strength/morale; fear/flee mechanic
**Before**: effects: [cc_stun, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [cc_fear, cc_stun, debuff_stat], targeting: tgt_aoe_radius3
**Rationale**: `cc_fear` covers the flee branch for weak enemies. `cc_stun` remains for mid-tier enemies. The 4-hex range is best approximated by `tgt_aoe_radius3` (3 hexes being the largest radius available). The tiered morale check is still a gap, but all three output branches are now representable.

```ts
"howl of terror": {
  effects: ["cc_fear", "cc_stun", "debuff_stat"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["feared", "stunned", "debuffed"], exploits: ["low_morale"] },
  effectParamOverrides: { cc_fear: { chance: 80, turns: 4 }, debuff_stat: { stat: "meleeSkill" } },
},
```

---

### Crushing Dominance (Berserker / Primal Howl)
**Gap**: skill lockout / ability suppression mechanic
**Before**: effects: [debuff_stat, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [debuff_stat, debuff_vuln, cc_silence], targeting: tgt_single_enemy
**Rationale**: `cc_silence` directly represents the ability lockout (cannot use morale-based or bravery-requiring skills). This was the single listed gap and is now closed.

```ts
"crushing dominance": {
  effects: ["debuff_stat", "debuff_vuln", "cc_silence"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["dominated", "vulnerable"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "meleeSkill" }, cc_silence: { turns: 10 } },
},
```

---

### Mass Rout (Berserker / Primal Howl)
**Gap**: charge-path AoE targeting; probability-based fear vs damage branching; post-fear stat reduction
**Before**: effects: [dmg_weapon, cc_daze, debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon, cc_fear, debuff_stat], targeting: tgt_aoe_radius2
**Rationale**: `cc_fear` replaces `cc_daze` for the flee mechanic. `tgt_aoe_radius2` better represents the 2-hex path radius than adjacent. The charge-path shape and branching logic remain gaps.

```ts
"mass rout": {
  effects: ["dmg_weapon", "cc_fear", "debuff_stat"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["feared", "debuffed"], exploits: [] },
  effectParamOverrides: { cc_fear: { chance: 60, turns: 3 }, debuff_stat: { stat: "meleeSkill" } },
},
```

---

### War God's Roar (Berserker / Primal Howl)
**Gap**: battlefield-wide targeting (beyond adjacent); ally buff component on an enemy-targeting ability (dual targeting); fear immunity for allies; anti-air knockdown
**Before**: effects: [cc_stun, buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [cc_fear, buff_stat], targeting: tgt_all_enemies
**Rationale**: `cc_fear` is the correct CC for the fear effect (replacing cc_stun workaround). `tgt_all_enemies` matches the battlefield-wide scope. The ally buff (dual targeting) remains a gap but the enemy-facing half is now correct.

```ts
"war god's roar": {
  effects: ["cc_fear", "buff_stat"],
  targeting: "tgt_all_enemies",
  conditions: { creates: ["feared", "ally_damage_buff"], exploits: [] },
  effectParamOverrides: { cc_fear: { chance: 100, turns: 2 }, buff_stat: { stat: "meleeSkill" } },
},
```

---

### Apex Predator (Berserker / Primal Howl)
**Gap**: battlefield-wide aura; flinch/interrupt-on-attack mechanic; prevent resurrection; ally buff (dual targeting); on-expiry fear burst; ability suppression; transform state management
**Before**: effects: [debuff_stat, buff_stat, cc_daze], targeting: tgt_aoe_adjacent
**After**: effects: [transform_state, debuff_stat, cc_silence, cc_fear], targeting: tgt_all_enemies
**Rationale**: `transform_state` represents the transform duration and power. `cc_silence` covers the ability suppression (cannot use morale-requiring abilities). `cc_fear` replaces `cc_daze` for the on-expiry fear burst. `tgt_all_enemies` matches the battlefield-wide aura. The ally buff (dual targeting), prevent-resurrection, and flinch-on-attack remain gaps.

```ts
"apex predator": {
  effects: ["transform_state", "debuff_stat", "cc_silence", "cc_fear"],
  targeting: "tgt_all_enemies",
  conditions: { creates: ["apex_predator_form", "global_debuff", "ally_buff"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 15, bonusPct: 50 }, debuff_stat: { stat: "meleeSkill" }, cc_silence: { turns: 15 }, cc_fear: { chance: 100, turns: 3 } },
},
```

---

### Cleave (Berserker / Warpath)
**Gap**: 180-degree frontal cone vs full adjacent AoE -- directional targeting not supported
**Before**: effects: [dmg_weapon], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon], targeting: tgt_aoe_cone
**Rationale**: `tgt_aoe_cone` (120-degree cone) is a much closer match to the 180-degree frontal arc than full-surround `tgt_aoe_adjacent`. Closes the directional targeting gap.

```ts
"cleave": {
  effects: ["dmg_weapon"],
  targeting: "tgt_aoe_cone",
  conditions: { creates: [], exploits: [] },
},
```

---

### Whirlwind (Berserker / Warpath)
**Gap**: 2-hex radius vs 1-hex adjacent; movement while attacking
**Before**: effects: [dmg_multihit], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_multihit], targeting: tgt_aoe_radius2
**Rationale**: `tgt_aoe_radius2` directly matches the described 2-hex radius. Closes the range gap.

```ts
"whirlwind": {
  effects: ["dmg_multihit"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: [], exploits: [] },
},
```

---

### Seismic Slam (Berserker / Warpath)
**Gap**: leap/gap-close mechanic; prone vs stun distinction; momentum resource generation
**Before**: effects: [dmg_weapon, cc_stun, disp_push], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon, cc_stun, disp_push], targeting: tgt_aoe_radius2
**Rationale**: The 2-hex radius shockwave maps to `tgt_aoe_radius2` instead of adjacent. Effects remain the same as cc_stun is still the best match for prone.

```ts
"seismic slam": {
  effects: ["dmg_weapon", "cc_stun", "disp_push"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["stunned", "momentum"], exploits: [] },
},
```

---

### The Living Avalanche (Berserker / Warpath)
**Gap**: passive AoE damage on movement; on-kill explosion mechanic; CC/physics immunity; terrain destruction; transform state management
**Before**: effects: [dmg_weapon, buff_stat, buff_dmgReduce], targeting: tgt_self
**After**: effects: [transform_state, dmg_weapon, buff_stat], targeting: tgt_self
**Rationale**: `transform_state` replaces `buff_dmgReduce` to properly represent the 15-second transform with massive power increase. The CC immunity and terrain destruction remain gaps, but the transform is now typed correctly.

```ts
"the living avalanche": {
  effects: ["transform_state", "dmg_weapon", "buff_stat"],
  targeting: "tgt_self",
  conditions: { creates: ["avalanche_form", "aoe_on_move"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 15, bonusPct: 200 }, buff_stat: { stat: "movementPoints" } },
},
```

---

### Crimson God (Berserker / Blood Fury)
**Gap**: HP freeze mechanic; on-kill AoE nova; deferred damage on form expiry; transform state management
**Before**: effects: [dmg_weapon, buff_stat, dmg_weapon], targeting: tgt_self
**After**: effects: [transform_state, dmg_weapon, buff_stat], targeting: tgt_self
**Rationale**: `transform_state` replaces the duplicate `dmg_weapon` to properly represent the 12-second ultimate form. The HP freeze and deferred damage remain gaps, but the transform is now correctly typed.

```ts
"crimson god": {
  effects: ["transform_state", "dmg_weapon", "buff_stat"],
  targeting: "tgt_self",
  conditions: { creates: ["blood_fury_form", "blood_nova_on_kill"], exploits: ["low_hp"] },
  effectParamOverrides: { transform_state: { turns: 12, bonusPct: 100 }, buff_stat: { stat: "meleeSkill" } },
},
```

---

### Bull Rush (Berserker / Warpath)
**Gap**: none listed, but `disp_dash` is a better semantic fit than dmg_weapon+disp_push for a charge
**Before**: effects: [dmg_weapon, disp_push], targeting: tgt_single_enemy
**After**: effects: [disp_dash, disp_push], targeting: tgt_single_enemy
**Rationale**: `disp_dash` (charge toward target with damage on arrival) is an exact match for Bull Rush's charge mechanic. The knockback remains `disp_push`.

```ts
"bull rush": {
  effects: ["disp_dash", "disp_push"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["displaced"], exploits: [] },
  effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 100 } },
},
```

---

### Titan Charge (Berserker / Warpath)
**Gap**: splash damage to nearby enemies at reduced rate; unstoppable/CC-immune during charge
**Before**: effects: [dmg_weapon, dmg_weapon], targeting: tgt_single_enemy
**After**: effects: [disp_dash, dmg_weapon], targeting: tgt_single_enemy
**Rationale**: `disp_dash` covers the charge mechanic with damage on arrival (150% to primary). The second `dmg_weapon` remains for the splash. The splash targeting is still a gap but the charge itself is now properly typed.

```ts
"titan charge": {
  effects: ["disp_dash", "dmg_weapon"],
  targeting: "tgt_single_enemy",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { disp_dash: { range: 4, damageOnArrival: 150 } },
},
```

---

### Chain Charge (Berserker / Warpath)
**Gap**: multi-target chaining with unique-target constraint; diminishing range per chain; stacking damage bonus per chain
**Before**: effects: [dmg_weapon, dmg_multihit], targeting: tgt_single_enemy
**After**: effects: [disp_dash, dmg_multihit], targeting: tgt_single_enemy
**Rationale**: `disp_dash` represents the initial charge toward the first target. `dmg_multihit` covers the chaining hits. The unique-target and diminishing-range constraints remain gaps.

```ts
"chain charge": {
  effects: ["disp_dash", "dmg_multihit"],
  targeting: "tgt_single_enemy",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { disp_dash: { range: 3, damageOnArrival: 100 } },
},
```

---

### Rampage (Berserker / Warpath)
**Gap**: cooldown reset mechanic for specific abilities; conditional maintenance (must keep moving)
**Before**: effects: [res_apRefund], targeting: tgt_self
**After**: effects: [transform_state, res_apRefund], targeting: tgt_self
**Rationale**: The 10-second rampage state is a transform with continuous cooldown resets. `transform_state` represents the timed state, while `res_apRefund` represents the action-economy benefit of cooldown resets. The movement-maintenance condition remains a gap.

```ts
"rampage": {
  effects: ["transform_state", "res_apRefund"],
  targeting: "tgt_self",
  conditions: { creates: ["rampage_state"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 10, bonusPct: 0 } },
},
```

---

## Monk

---

### Armor Crack (Monk / Iron Fist)
**Gap**: armor reduction vs general vulnerability -- no armor-specific stat
**Before**: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` directly represents the 25% armor reduction, replacing the generic `debuff_vuln` workaround. This is an exact semantic match.

```ts
"armor crack": {
  effects: ["dmg_weapon", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["armor_broken"], exploits: ["combo_points"] },
  effectParamOverrides: { debuff_armor: { pct: 25, turns: 4 } },
},
```

---

### Wave of Force (Monk / Inner Fire)
**Gap**: line targeting vs adjacent AoE
**Before**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_line
**Rationale**: `tgt_aoe_line` directly matches the "forward ki wave hitting all enemies in a 3-hex line" description. Closes the targeting gap.

```ts
"wave of force": {
  effects: ["dmg_spell", "disp_push"],
  targeting: "tgt_aoe_line",
  conditions: { creates: ["displaced"], exploits: [] },
},
```

---

### Ki Explosion (Monk / Inner Fire)
**Gap**: targeted AoE centered on enemy (not self)
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell], targeting: tgt_aoe_radius2
**Rationale**: `tgt_aoe_radius2` matches the 2-hex radius detonation. While the "centered on enemy" nuance remains, the radius is now correct instead of using adjacent as a fallback.

```ts
"ki explosion": {
  effects: ["dmg_spell"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: [], exploits: [] },
},
```

---

### Focused Beam (Monk / Inner Fire)
**Gap**: escalating damage over channel duration; channeled ability mechanics
**Before**: effects: [dmg_spell], targeting: tgt_single_enemy
**After**: effects: [channel_dmg], targeting: tgt_single_enemy
**Rationale**: `channel_dmg` is a direct match for a channeled damage beam. Replaces `dmg_spell` to properly represent the sustained, escalating damage output.

```ts
"focused beam": {
  effects: ["channel_dmg"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["escalating_damage"], exploits: [] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 80, turns: 2 } },
},
```

---

### Spirit Bomb (Monk / Inner Fire)
**Gap**: 2-turn charge-up requirement; 4-hex radius vs adjacent; environmental ki gathering
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [channel_dmg], targeting: tgt_aoe_radius3
**Rationale**: `channel_dmg` represents the 2-turn charge-up before damage release. `tgt_aoe_radius3` (3-hex radius) is the closest match for the described 4-hex radius. Closes two gaps simultaneously.

```ts
"spirit bomb": {
  effects: ["channel_dmg"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 0, turns: 2 } },
},
```

---

### Inner Supernova (Monk / Inner Fire)
**Gap**: 4-hex radius vs adjacent; resource depletion (all ki)
**Before**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, disp_push], targeting: tgt_aoe_radius3
**Rationale**: `tgt_aoe_radius3` (3-hex radius) is the closest available match for the described 4-hex omnidirectional burst. Effects remain the same.

```ts
"inner supernova": {
  effects: ["dmg_spell", "disp_push"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["displaced"], exploits: [] },
},
```

---

### Transcendent Ki (Monk / Inner Fire)
**Gap**: free-cast mechanic; auto-chain to nearby enemies; periodic automatic Spirit Bomb; ki bolt on melee strikes; on-expiry nova; transform state management
**Before**: effects: [dmg_spell, buff_stat, dmg_spell], targeting: tgt_self
**After**: effects: [transform_state, dmg_spell, buff_stat], targeting: tgt_self
**Rationale**: `transform_state` replaces the duplicate `dmg_spell` to properly represent the 5-turn transcendence form. The free-cast and auto-chain mechanics remain gaps, but the transform is now correctly typed.

```ts
"transcendent ki": {
  effects: ["transform_state", "dmg_spell", "buff_stat"],
  targeting: "tgt_self",
  conditions: { creates: ["transcendent_form", "auto_chain", "free_cast", "periodic_spirit_bomb"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 5, bonusPct: 100 }, buff_stat: { stat: "meleeSkill" } },
},
```

---

### Ocean's Wrath (Monk / Flowing Water)
**Gap**: 100% auto-dodge; damage reflection at full value; multi-target counter chaining; enemy-attack-count scaling
**Before**: effects: [buff_stat, stance_counter, dmg_weapon], targeting: tgt_self
**After**: effects: [transform_state, dmg_reflect, stance_counter], targeting: tgt_self
**Rationale**: `transform_state` represents the 4-turn state of absolute fluidity. `dmg_reflect` directly captures the damage-reflection-at-full-value mechanic that was a gap. `stance_counter` remains for the counter-attack readiness. The auto-dodge is now implicit in the transform state rather than approximated as a stat buff.

```ts
"ocean's wrath": {
  effects: ["transform_state", "dmg_reflect", "stance_counter"],
  targeting: "tgt_self",
  conditions: { creates: ["oceans_wrath_form", "auto_dodge", "auto_counter"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 4, bonusPct: 0 }, dmg_reflect: { pct: 100, turns: 4 } },
},
```

---

## Ranger

---

### Killzone (Ranger / Dead Eye)
**Gap**: zone-based damage buff (area designation); conditional buff based on target location
**Before**: effects: [buff_stat], targeting: tgt_self
**After**: effects: [zone_persist], targeting: tgt_aoe_radius2
**Rationale**: `zone_persist` directly represents the designated area with a persistent effect (damage buff in the zone for 3 turns). `tgt_aoe_radius2` matches the described 2-hex radius. This closes both the zone-based and area-designation gaps.

```ts
"killzone": {
  effects: ["zone_persist"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: ["killzone_area"], exploits: [] },
  effectParamOverrides: { zone_persist: { radius: 2, turns: 3, dmgPerTurn: 0 } },
},
```

---

### Snare Trap (Ranger / Trapper)
**Gap**: trap placement mechanic (delayed/triggered effect); hidden/invisible placement
**Before**: effects: [cc_root], targeting: tgt_single_enemy
**After**: effects: [trap_place, cc_root], targeting: tgt_single_enemy
**Rationale**: `trap_place` directly represents the trap-placement mechanic. `cc_root` remains the triggered effect. This closes the primary gap.

```ts
"snare trap": {
  effects: ["trap_place", "cc_root"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["rooted", "trap_placed"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 } },
},
```

---

### Tripwire (Ranger / Trapper)
**Gap**: position reveal/scouting mechanic; trap placement mechanic
**Before**: effects: [debuff_stat], targeting: tgt_single_enemy
**After**: effects: [trap_place, debuff_stat], targeting: tgt_single_enemy
**Rationale**: `trap_place` closes the trap-placement gap. The scouting/reveal remains a gap but the delivery mechanic is now correctly typed.

```ts
"tripwire": {
  effects: ["trap_place", "debuff_stat"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["revealed", "trap_placed"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, debuff_stat: { stat: "dodge" } },
},
```

---

### Bait Pile (Ranger / Trapper)
**Gap**: AI manipulation/aggro redirection; lure/pull mechanic; trap placement mechanic
**Before**: effects: [cc_daze], targeting: tgt_single_enemy
**After**: effects: [trap_place, cc_taunt], targeting: tgt_single_enemy
**Rationale**: `trap_place` covers the placement mechanic. `cc_taunt` replaces `cc_daze` to represent forced-targeting (luring/aggro redirection) -- the enemies are compelled to move toward the lure, which is functionally a taunt on a location.

```ts
"bait pile": {
  effects: ["trap_place", "cc_taunt"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["lured", "trap_placed"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, cc_taunt: { turns: 1 } },
},
```

---

### Spike Pit (Ranger / Trapper)
**Gap**: trap placement mechanic; 2x1 hex area trap; camouflage/hidden placement
**Before**: effects: [debuff_stat, dot_bleed], targeting: tgt_single_enemy
**After**: effects: [trap_place, debuff_stat, dot_bleed], targeting: tgt_single_enemy
**Rationale**: `trap_place` closes the trap-placement gap. The triggered effects (slow + bleed) remain unchanged.

```ts
"spike pit": {
  effects: ["trap_place", "debuff_stat", "dot_bleed"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["slowed", "bleeding", "trap_placed"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 1, triggerDmg: 0 }, debuff_stat: { stat: "movementPoints" } },
},
```

---

### Cluster Mine (Ranger / Trapper)
**Gap**: trap placement mechanic; fragment scatter pattern
**Before**: effects: [dmg_multihit], targeting: tgt_aoe_adjacent
**After**: effects: [trap_place, dmg_multihit], targeting: tgt_aoe_adjacent
**Rationale**: `trap_place` closes the trap-placement gap. The 5-fragment scatter is represented by `dmg_multihit` for the multiple damage instances.

```ts
"cluster mine": {
  effects: ["trap_place", "dmg_multihit"],
  targeting: "tgt_aoe_adjacent",
  conditions: { creates: ["trap_placed"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 1, triggerDmg: 50 } },
},
```

---

### Corrosive Net (Ranger / Trapper)
**Gap**: stacking debuff over time while ensnared
**Before**: effects: [cc_root, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [cc_root, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` is a more precise match than `debuff_vuln` for "stacking armor-reduction debuff." The armor-specific degradation is now directly representable.

```ts
"corrosive net": {
  effects: ["cc_root", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["ensnared", "armor_degrading"], exploits: [] },
  effectParamOverrides: { debuff_armor: { pct: 10, turns: 4 } },
},
```

---

### Killbox Setup (Ranger / Trapper)
**Gap**: multi-trap simultaneous placement; linked trap trigger mechanic; triangular formation; trap placement mechanic
**Before**: effects: [dmg_weapon, cc_root], targeting: tgt_aoe_adjacent
**After**: effects: [trap_place, dmg_weapon, cc_root], targeting: tgt_aoe_adjacent
**Rationale**: `trap_place` with `count: 3` represents the three linked traps placed simultaneously. The formation and linking mechanics remain gaps.

```ts
"killbox setup": {
  effects: ["trap_place", "dmg_weapon", "cc_root"],
  targeting: "tgt_aoe_adjacent",
  conditions: { creates: ["trap_placed", "killbox_zone"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 3, triggerDmg: 80 } },
},
```

---

### The Long Game (Ranger / Trapper)
**Gap**: massive area trap seeding; cascading trigger sequence; 6-hex radius zone; 8-turn persistence; 2-turn setup time; 12 individual trap placements
**Before**: effects: [dmg_multihit, cc_root], targeting: tgt_aoe_adjacent
**After**: effects: [trap_place, zone_persist, cc_root], targeting: tgt_aoe_radius3
**Rationale**: `trap_place` with `count: 12` represents the 12 micro-traps. `zone_persist` captures the 8-turn persistent area effect with cascading damage. `tgt_aoe_radius3` (3-hex radius) is the closest available match for the 6-hex area. The 2-turn setup time remains a gap.

```ts
"the long game": {
  effects: ["trap_place", "zone_persist", "cc_root"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["trap_field", "cascading_traps"], exploits: [] },
  effectParamOverrides: { trap_place: { count: 12, triggerDmg: 40 }, zone_persist: { radius: 3, turns: 8, dmgPerTurn: 30 } },
},
```

---

### Scout Hawk (Ranger / Beastmaster Archer)
**Gap**: summon/pet mechanic; scouting/vision reveal; 5-hex cone targeting
**Before**: effects: [debuff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [summon_unit], targeting: tgt_aoe_cone
**Rationale**: `summon_unit` directly represents the hawk summon. `tgt_aoe_cone` matches the described 5-hex cone scouting area. Both primary gaps are now closed. The scouting/vision reveal is inherent in the summon's behavior.

```ts
"scout hawk": {
  effects: ["summon_unit"],
  targeting: "tgt_aoe_cone",
  conditions: { creates: ["scouted", "hawk_active"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 15, turns: 3, count: 1 } },
},
```

---

### Heal Companion (Ranger / Beastmaster Archer)
**Gap**: pet-specific healing; cooldown reduction for pet abilities
**Before**: effects: [heal_pctDmg], targeting: tgt_single_ally
**After**: effects: [heal_flat], targeting: tgt_single_ally
**Rationale**: `heal_flat` is a better match than `heal_pctDmg` because the description says "restore 40% of your pet's max HP" -- this is a fixed heal amount (percentage of max HP), not lifesteal from damage dealt. `heal_pctDmg` implies healing based on damage output, which is not what this ability does.

```ts
"heal companion": {
  effects: ["heal_flat"],
  targeting: "tgt_single_ally",
  conditions: { creates: ["pet_healed"], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 40 } },
},
```

---

### Scatter Drive (Ranger / Beastmaster Archer)
**Gap**: pet herding/displacement mechanic; pull-toward-self displacement
**Before**: effects: [dmg_weapon, debuff_stat, disp_push], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_weapon, debuff_stat, disp_pull], targeting: tgt_aoe_adjacent
**Rationale**: `disp_pull` replaces `disp_push` to correctly represent the pet herding enemies toward the player. The gap specifically noted "pull-toward-self displacement" as the missing type.

```ts
"scatter drive": {
  effects: ["dmg_weapon", "debuff_stat", "disp_pull"],
  targeting: "tgt_aoe_adjacent",
  conditions: { creates: ["slowed", "herded"], exploits: [] },
  effectParamOverrides: { debuff_stat: { stat: "movementPoints" }, disp_pull: { distance: 2 } },
},
```

---

### Hunt as One (Ranger / Beastmaster Archer)
**Gap**: shared HP pool mechanic; spectral pet summons on arrow fire; HP redistribution on expiry; transform state management
**Before**: effects: [buff_stat, dmg_weapon, dmg_weapon], targeting: tgt_self
**After**: effects: [transform_state, buff_stat, summon_unit], targeting: tgt_self
**Rationale**: `transform_state` replaces a duplicate `dmg_weapon` to properly represent the 4-turn merged state. `summon_unit` represents the spectral pet duplicates summoned on each arrow, closing the biggest gap. The shared HP pool and redistribution remain gaps.

```ts
"hunt as one": {
  effects: ["transform_state", "buff_stat", "summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["hunt_as_one_form", "shared_hp_pool", "spectral_duplicates"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 4, bonusPct: 20 }, buff_stat: { stat: "movementPoints" }, summon_unit: { hp: 30, turns: 4, count: 1 } },
},
```

---

### Tungsten Tip (Ranger / Dead Eye)
**Gap**: armor penetration vs general vulnerability
**Before**: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` is a more precise match than `debuff_vuln` for "ignores 30% of armor." This is specifically armor penetration, not general vulnerability.

```ts
"tungsten tip": {
  effects: ["dmg_weapon", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["armor_pierced"], exploits: [] },
  effectParamOverrides: { debuff_armor: { pct: 30, turns: 1 } },
},
```

---

### Sniper's Patience (Ranger / Dead Eye)
**Gap**: variable damage scaling based on charge duration; pierce-through mechanic
**Before**: effects: [dmg_weapon], targeting: tgt_single_enemy
**After**: effects: [channel_dmg], targeting: tgt_aoe_line
**Rationale**: `channel_dmg` represents the hold-to-charge mechanic (up to 1 turn). `tgt_aoe_line` covers the pierce-through ("piercing one enemy" implies the shot can travel in a line). Both listed gaps are now addressed.

```ts
"sniper's patience": {
  effects: ["channel_dmg"],
  targeting: "tgt_aoe_line",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { channel_dmg: { dmgPerTurn: 350, turns: 1 } },
},
```

---

## Summary

| # | Skill | Class / Archetype | Key Changes |
|---|-------|-------------------|-------------|
| 1 | Battle Cry | Berserker / Primal Howl | cc_daze -> cc_fear, tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 2 | Taunt | Berserker / Primal Howl | cc_daze -> cc_taunt |
| 3 | Howl of Terror | Berserker / Primal Howl | +cc_fear, tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 4 | Crushing Dominance | Berserker / Primal Howl | +cc_silence |
| 5 | Mass Rout | Berserker / Primal Howl | cc_daze -> cc_fear, tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 6 | War God's Roar | Berserker / Primal Howl | cc_stun -> cc_fear, tgt_aoe_adjacent -> tgt_all_enemies |
| 7 | Apex Predator | Berserker / Primal Howl | +transform_state, +cc_silence, cc_daze -> cc_fear, tgt_aoe_adjacent -> tgt_all_enemies |
| 8 | Cleave | Berserker / Warpath | tgt_aoe_adjacent -> tgt_aoe_cone |
| 9 | Whirlwind | Berserker / Warpath | tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 10 | Seismic Slam | Berserker / Warpath | tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 11 | The Living Avalanche | Berserker / Warpath | +transform_state, -buff_dmgReduce |
| 12 | Crimson God | Berserker / Blood Fury | +transform_state, -duplicate dmg_weapon |
| 13 | Bull Rush | Berserker / Warpath | dmg_weapon -> disp_dash |
| 14 | Titan Charge | Berserker / Warpath | first dmg_weapon -> disp_dash |
| 15 | Chain Charge | Berserker / Warpath | dmg_weapon -> disp_dash |
| 16 | Rampage | Berserker / Warpath | +transform_state |
| 17 | Armor Crack | Monk / Iron Fist | debuff_vuln -> debuff_armor |
| 18 | Wave of Force | Monk / Inner Fire | tgt_aoe_adjacent -> tgt_aoe_line |
| 19 | Ki Explosion | Monk / Inner Fire | tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 20 | Focused Beam | Monk / Inner Fire | dmg_spell -> channel_dmg |
| 21 | Spirit Bomb | Monk / Inner Fire | dmg_spell -> channel_dmg, tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 22 | Inner Supernova | Monk / Inner Fire | tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 23 | Transcendent Ki | Monk / Inner Fire | +transform_state, -duplicate dmg_spell |
| 24 | Ocean's Wrath | Monk / Flowing Water | +transform_state, +dmg_reflect, -buff_stat, -dmg_weapon |
| 25 | Killzone | Ranger / Dead Eye | buff_stat -> zone_persist, tgt_self -> tgt_aoe_radius2 |
| 26 | Tungsten Tip | Ranger / Dead Eye | debuff_vuln -> debuff_armor |
| 27 | Sniper's Patience | Ranger / Dead Eye | dmg_weapon -> channel_dmg, tgt_single_enemy -> tgt_aoe_line |
| 28 | Snare Trap | Ranger / Trapper | +trap_place |
| 29 | Tripwire | Ranger / Trapper | +trap_place |
| 30 | Bait Pile | Ranger / Trapper | +trap_place, cc_daze -> cc_taunt |
| 31 | Spike Pit | Ranger / Trapper | +trap_place |
| 32 | Cluster Mine | Ranger / Trapper | +trap_place |
| 33 | Corrosive Net | Ranger / Trapper | debuff_vuln -> debuff_armor |
| 34 | Killbox Setup | Ranger / Trapper | +trap_place |
| 35 | The Long Game | Ranger / Trapper | +trap_place, +zone_persist, dmg_multihit removed, tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 36 | Scout Hawk | Ranger / Beastmaster | debuff_stat -> summon_unit, tgt_aoe_adjacent -> tgt_aoe_cone |
| 37 | Heal Companion | Ranger / Beastmaster | heal_pctDmg -> heal_flat |
| 38 | Scatter Drive | Ranger / Beastmaster | disp_push -> disp_pull |
| 39 | Hunt as One | Ranger / Beastmaster | +transform_state, +summon_unit, -duplicate dmg_weapon |

**Total skills updated: 39** out of ~75 audited (52% improved with new types)

### Skills with no changes needed (gaps remain design-level, no new type helps):
- Wound Pride, Berserker's Bargain, Crimson Surge, Martyr's Blade, Hemorrhagic Frenzy (Blood Fury) -- gaps are self-damage/HP-cost mechanics
- Warpath Stride -- gaps are conditional CC immunity
- Jab, Cross, Iron Stance, Rising Uppercut, Body Blow, Hundred Fists, Dragon's Fist, Perfect Form, Thousand Strike Technique (Iron Fist) -- gaps are combo-point resource mechanics
- Step Aside, Water Stance, Fluid Step, Still Water, Current Strike, River's Fury (Flowing Water) -- gaps are counter-charge/reactive mechanics
- Ki Bolt, Focus, Ki Blast, Inner Flame (Inner Fire) -- no gaps or gaps are elemental overlay mechanics
- Mark Target, Flint Nock, Scope In, Cold Calculation, Ghost Bullet, One Shot One Soul (Dead Eye) -- no gaps or gaps are UI/LoS mechanics
- Prepared Ground (Trapper) -- gaps are cooldown-refund specifics
- Bond Strike, Flanking Fang, Arrow + Claw, Alpha Call, Primal Pact, Wild Volley (Beastmaster) -- gaps are pet-system mechanics
