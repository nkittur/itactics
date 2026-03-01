# Mapping Updates - Batch 2

Blood Alchemist, Hexblade, Necrosurgeon -- corrections using new effect/targeting types.

Only skills with actionable changes are listed. Skills where gaps remain purely mechanical
(HP self-cost, toggle mechanics, kill conditionals, corpse interaction, part consumption,
resource costs, etc.) and have no better type available are omitted.

---

## Blood Alchemist

### Hemorrhage Wave (Blood Alchemist / Sacrifice)
**Gap**: Cone targeting -- was approximated by tgt_aoe_adjacent but the description says "3 hexes cone".
**Before**: effects: [dmg_spell, dot_bleed], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, dot_bleed], targeting: tgt_aoe_cone
**Rationale**: `tgt_aoe_cone` (120 degree cone) is a direct match for "blood wave in a 3 hexes cone". Adjacent AoE was a workaround; cone targeting now exists.

```ts
"hemorrhage wave": {
  effects: ["dmg_spell", "dot_bleed"],
  targeting: "tgt_aoe_cone",
  conditions: { creates: ["bleed"], exploits: [] },
},
```

---

### Blood Nova (Blood Alchemist / Sacrifice)
**Gap**: Large radius AoE (4 hexes) was crammed into tgt_aoe_adjacent.
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell], targeting: tgt_aoe_radius3
**Rationale**: `tgt_aoe_radius3` (3-hex radius) is the closest available size for a 4-hex detonation. Still slightly undersized but far better than adjacent-only.

```ts
"blood nova": {
  effects: ["dmg_spell"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: [] },
},
```

---

### The Final Offering (Blood Alchemist / Sacrifice)
**Gap**: Massive 6-hex radius AoE was mapped as tgt_aoe_adjacent.
**Before**: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_radius3
**Rationale**: `tgt_aoe_radius3` is the largest AoE radius available. The 6-hex description exceeds it, but radius-3 is a significant improvement over adjacent.

```ts
"the final offering": {
  effects: ["dmg_spell", "heal_pctDmg"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: [] },
},
```

---

### Puppet String (Blood Alchemist / Hemomancy)
**Gap**: Forced movement with directional control -- was using disp_push but the description says "move in a direction of your choosing", which is closer to pull (toward caster).
**Before**: effects: [disp_push, dmg_spell], targeting: tgt_single_enemy
**After**: effects: [disp_pull, dmg_spell], targeting: tgt_single_enemy
**Rationale**: `disp_pull` ("pull target toward caster") better represents the caster-controlled forced movement of "Puppet String" than a generic push. The caster is choosing to yank the target in their direction. The collision damage remains approximated by dmg_spell.

```ts
"puppet string": {
  effects: ["disp_pull", "dmg_spell"],
  targeting: "tgt_single_enemy",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { disp_pull: { distance: 2 } },
},
```

---

### Boil (Blood Alchemist / Hemomancy)
**Gap**: Armor reduction specifically -- debuff_vuln was a general proxy.
**Before**: effects: [dot_burn, debuff_vuln], targeting: tgt_single_enemy
**After**: effects: [dot_burn, debuff_armor], targeting: tgt_single_enemy
**Rationale**: `debuff_armor` ("destroy armor percentage") is an exact match for "lose 10% armor for 3 turns". Replaces the generic debuff_vuln with the precise armor reduction mechanic.

```ts
"boil": {
  effects: ["dot_burn", "debuff_armor"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["burn"], exploits: [] },
  effectParamOverrides: { debuff_armor: { pct: 10, turns: 3 } },
},
```

---

### Full Puppet (Blood Alchemist / Hemomancy)
**Gap**: Mind control / charm mechanic -- cc_stun was a fallback since no charm existed.
**Before**: effects: [cc_stun], targeting: tgt_single_enemy
**After**: effects: [cc_charm], targeting: tgt_single_enemy
**Rationale**: `cc_charm` ("mind control") is an exact match for "assume full control of a non-boss enemy for 2 turns; use them as a player-controlled pawn". This replaces the cc_stun fallback entirely.

```ts
"full puppet": {
  effects: ["cc_charm"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["controlled"], exploits: [] },
  effectParamOverrides: { cc_charm: { turns: 2, chance: 100 } },
},
```

---

### Sanguine Dominion (Blood Alchemist / Hemomancy)
**Gap**: Massive 6-hex radius AoE; forced friendly-fire mapped as cc_daze.
**Before**: effects: [debuff_stat, debuff_stat, cc_daze], targeting: tgt_aoe_adjacent
**After**: effects: [debuff_stat, debuff_stat, cc_charm], targeting: tgt_aoe_radius3
**Rationale**: Two changes: (1) `tgt_aoe_radius3` is the largest available AoE, better than adjacent for a 6-hex radius. (2) `cc_charm` replaces cc_daze because "force any one of them to attack a nearby ally" is mind control / forced targeting, not a daze. cc_charm captures the friendly-fire mechanic.

```ts
"sanguine dominion": {
  effects: ["debuff_stat", "debuff_stat", "cc_charm"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["controlled"], exploits: ["bleed"] },
  effectParamOverrides: {
    debuff_stat: { stat: "movementPoints" },
    cc_charm: { turns: 5, chance: 100 },
  },
},
```

---

### Clot Seal (Blood Alchemist / Transfusion)
**Gap**: Heal is flat % not based on damage dealt; heal_pctDmg was a proxy.
**Before**: effects: [heal_pctDmg], targeting: tgt_single_ally
**After**: effects: [heal_flat], targeting: tgt_single_ally
**Rationale**: `heal_flat` ("flat HP heal") is correct for "restore 5% of their max HP". This is a fixed amount heal, not proportional to damage dealt. heal_pctDmg was the wrong type.

```ts
"clot seal": {
  effects: ["heal_flat"],
  targeting: "tgt_single_ally",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 5 } },
},
```

---

### Sanguine Transfusion (Blood Alchemist / Transfusion)
**Gap**: Heal scales with caster HP not damage dealt; heal_pctDmg was wrong.
**Before**: effects: [heal_pctDmg], targeting: tgt_single_ally
**After**: effects: [heal_flat], targeting: tgt_single_ally
**Rationale**: "Transfer up to 25% of your own HP to a target ally as healing" is a flat heal based on a fixed HP percentage, not damage-proportional. `heal_flat` is the correct type.

```ts
"sanguine transfusion": {
  effects: ["heal_flat"],
  targeting: "tgt_single_ally",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 25 } },
},
```

---

### Vital Lattice (Blood Alchemist / Transfusion)
**Gap**: Multi-target linking mechanic; single ally targeting was a workaround.
**Before**: effects: [buff_dmgReduce], targeting: tgt_single_ally
**After**: effects: [buff_dmgReduce], targeting: tgt_all_allies
**Rationale**: `tgt_all_allies` ("party-wide allies") represents the 3-ally damage-sharing web much better than tgt_single_ally. The lattice connects multiple allies.

```ts
"vital lattice": {
  effects: ["buff_dmgReduce"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["lattice"], exploits: [] },
},
```

---

### Soul Leak (Blood Alchemist / Transfusion)
**Gap**: Dual-function AoE damage + party-wide heal distribution; 3-hex radius.
**Before**: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_radius2
**Rationale**: `tgt_aoe_radius2` (2-hex radius) better approximates the "3 hexes radius" drain area than adjacent-only. The dual damage/heal nature is already well captured by the existing effects.

```ts
"soul leak": {
  effects: ["dmg_spell", "heal_pctDmg"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: [], exploits: [] },
},
```

---

### Mass Transfusion (Blood Alchemist / Transfusion)
**Gap**: AoE ally heal -- system AoE was enemy-focused; 4-hex radius.
**Before**: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [heal_flat], targeting: tgt_all_allies
**Rationale**: Two changes: (1) `heal_flat` replaces heal_pctDmg because "each receives 10% of your HP as healing" is a fixed amount, not proportional to damage. (2) `tgt_all_allies` replaces tgt_aoe_adjacent because this targets allies in an area, not enemies -- party-wide ally targeting is the correct semantic.

```ts
"mass transfusion": {
  effects: ["heal_flat"],
  targeting: "tgt_all_allies",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { heal_flat: { amount: 10 } },
},
```

---

### The Eternal Circuit (Blood Alchemist / Transfusion)
**Gap**: Channel mechanic; party-wide link; bleed reflect; massive 6-hex radius; ally-targeted AoE.
**Before**: effects: [buff_dmgReduce, heal_pctDmg], targeting: tgt_aoe_adjacent
**After**: effects: [buff_dmgReduce, heal_pctDmg, dmg_reflect], targeting: tgt_all_allies
**Rationale**: Three changes: (1) `dmg_reflect` captures "any Bleed effect applied to you is reflected in full to the enemy who applied it". (2) `tgt_all_allies` replaces tgt_aoe_adjacent because this links all allies, not hits enemies in an area. (3) The channel gap remains (no channel type), but the core effects are now fully represented.

```ts
"the eternal circuit": {
  effects: ["buff_dmgReduce", "heal_pctDmg", "dmg_reflect"],
  targeting: "tgt_all_allies",
  conditions: { creates: ["circuit"], exploits: [] },
  effectParamOverrides: { dmg_reflect: { pct: 100, turns: 6 } },
},
```

---

## Hexblade

### Blade Hunger (Hexblade / Hungering Blade)
**Gap**: Lifesteal doubling modifier; duration-based activation -- heal_pctDmg was generic.
**Before**: effects: [buff_stat, heal_pctDmg], targeting: tgt_self
**After**: effects: [buff_stat, lifesteal], targeting: tgt_self
**Rationale**: `lifesteal` ("damage to healing") with a pct parameter is a more precise representation of "all lifesteal is doubled and each strike heals" than the generic heal_pctDmg. The ability specifically amplifies the lifesteal mechanic.

```ts
"blade hunger": {
  effects: ["buff_stat", "lifesteal"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { lifesteal: { pct: 200 } },
},
```

---

### Feast Mode (Hexblade / Hungering Blade)
**Gap**: 100% lifesteal conversion mechanic; duration-based self-buff.
**Before**: effects: [buff_stat, heal_pctDmg], targeting: tgt_self
**After**: effects: [lifesteal], targeting: tgt_self
**Rationale**: "All damage you deal is converted to 100% lifesteal" is precisely `lifesteal` at pct: 100. The buff_stat was unnecessary filler; the entire ability is a lifesteal mode. heal_pctDmg was a proxy for what `lifesteal` now directly represents.

```ts
"feast mode": {
  effects: ["lifesteal"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: { lifesteal: { pct: 100 } },
},
```

---

### The Infinite Hunger (Hexblade / Hungering Blade)
**Gap**: 100% lifesteal; extended melee range; kill-conditional healing; permanent bonus.
**Before**: effects: [buff_stat, heal_pctDmg, dmg_weapon], targeting: tgt_self
**After**: effects: [buff_stat, lifesteal, dmg_weapon, transform_state], targeting: tgt_self
**Rationale**: Two replacements: (1) `lifesteal` replaces heal_pctDmg for the "100% efficiency lifesteal". (2) `transform_state` captures the 4-turn ultimate transformation with permanent bonus lock-in -- this is a state transformation, not just a buff.

```ts
"the infinite hunger": {
  effects: ["buff_stat", "lifesteal", "dmg_weapon", "transform_state"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: [] },
  effectParamOverrides: {
    buff_stat: { stat: "meleeSkill" },
    lifesteal: { pct: 100 },
    transform_state: { turns: 4, bonusPct: 300 },
  },
},
```

---

### Shield Formation (Hexblade / Spectral Arsenal)
**Gap**: Hit absorption (discrete hits blocked, not % reduction).
**Before**: effects: [buff_dmgReduce], targeting: tgt_self
**After**: effects: [buff_shield], targeting: tgt_self
**Rationale**: `buff_shield` ("absorption shield") is a direct match for "absorb up to 3 hits" -- a finite-absorption barrier rather than a percentage damage reduction.

```ts
"shield formation": {
  effects: ["buff_shield"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: ["spectral_blade"] },
  effectParamOverrides: { buff_shield: { amount: 3, turns: 2 } },
},
```

---

### Ghost Lance (Hexblade / Spectral Arsenal)
**Gap**: Line/penetrating targeting was approximated by tgt_aoe_adjacent.
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell, summon_unit], targeting: tgt_aoe_line
**Rationale**: Two changes: (1) `tgt_aoe_line` ("line piercing") directly matches "penetrating beam attack... passes through all enemies in a line". (2) `summon_unit` is added since this is a persistent summoned entity that attacks autonomously every 2 turns.

```ts
"ghost lance": {
  effects: ["dmg_spell", "summon_unit"],
  targeting: "tgt_aoe_line",
  conditions: { creates: ["spectral_lance"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
},
```

---

### Blade Tornado (Hexblade / Spectral Arsenal)
**Gap**: Persistent AoE zone (2 turns); proximity-triggered damage; 2-hex radius zone.
**Before**: effects: [dmg_spell, buff_dmgReduce], targeting: tgt_aoe_adjacent
**After**: effects: [zone_persist, buff_dmgReduce], targeting: tgt_aoe_radius2
**Rationale**: Two changes: (1) `zone_persist` ("persistent area effect") directly captures "spinning rapidly around you for 2 turns; any enemy who comes within... takes continuous spectral damage". (2) `tgt_aoe_radius2` matches the "2 hexes" radius described.

```ts
"blade tornado": {
  effects: ["zone_persist", "buff_dmgReduce"],
  targeting: "tgt_aoe_radius2",
  conditions: { creates: [], exploits: ["spectral_blade"] },
  effectParamOverrides: { zone_persist: { radius: 2, turns: 2, dmgPerTurn: 0 } },
},
```

---

### Spectral Clone (Hexblade / Spectral Arsenal)
**Gap**: Remote summon placement; autonomous clone.
**Before**: effects: [dmg_spell], targeting: tgt_single_enemy
**After**: effects: [summon_unit], targeting: tgt_single_enemy
**Rationale**: `summon_unit` captures "summon a full spectral duplicate... the duplicate fights independently". This is fundamentally a summon, not direct spell damage. The target location determines where the clone appears.

```ts
"spectral clone": {
  effects: ["summon_unit"],
  targeting: "tgt_single_enemy",
  conditions: { creates: ["spectral_clone"], exploits: ["spectral_blade"] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: 3, count: 1 } },
},
```

---

### Spectral Blade (Hexblade / Spectral Arsenal)
**Gap**: Summon/pet mechanic; autonomous periodic attacks; persistent entity.
**Before**: effects: [dmg_spell], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: `summon_unit` is the correct type for "summon 1 spectral blade that orbits you and attacks nearby enemies once per 1 turn". This is a persistent autonomous entity, not a one-time spell damage.

```ts
"spectral blade": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["spectral_blade"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
},
```

---

### Arsenal Expansion (Hexblade / Spectral Arsenal)
**Gap**: Summon/pet mechanic; multiple persistent entities.
**Before**: effects: [dmg_spell], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: Same reasoning as Spectral Blade -- "summon 2 additional spectral blades" is a summon, not spell damage.

```ts
"arsenal expansion": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["spectral_blade"], exploits: [] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 2 } },
},
```

---

### The Ghost Armory (Hexblade / Spectral Arsenal)
**Gap**: 10 simultaneous summons; autonomous target selection; duration-based ultimate state.
**Before**: effects: [dmg_multihit, dmg_spell, buff_stat], targeting: tgt_aoe_adjacent
**After**: effects: [summon_unit, dmg_spell, transform_state], targeting: tgt_aoe_radius3
**Rationale**: Three changes: (1) `summon_unit` replaces dmg_multihit for the 10 summoned blades. (2) `transform_state` replaces buff_stat since this is a 4-turn ultimate mode ("unlock the full Spectral Arsenal"). (3) `tgt_aoe_radius3` replaces tgt_aoe_adjacent for the "battlefield-wide cleave" area of effect.

```ts
"the ghost armory": {
  effects: ["summon_unit", "dmg_spell", "transform_state"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: ["spectral_blade", "spectral_greatsword"], exploits: [] },
  effectParamOverrides: {
    summon_unit: { hp: 0, turns: 4, count: 10 },
    transform_state: { turns: 4, bonusPct: 300 },
  },
},
```

---

## Necrosurgeon

### Crude Assembly (Necrosurgeon / Reanimator)
**Gap**: Summon/pet mechanic; construct with variable stats; persistent entity.
**Before**: effects: [dmg_spell], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: `summon_unit` is the correct type for "stitch together a basic Shambler from 2 parts". This creates a persistent entity, not spell damage.

```ts
"crude assembly": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["construct"], exploits: ["harvested_part"] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
},
```

---

### Composite Horror (Necrosurgeon / Reanimator)
**Gap**: Summon/pet mechanic; 5-part requirement; large construct variant.
**Before**: effects: [dmg_spell], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: Same as Crude Assembly but scaled up. `summon_unit` is the correct type for an upgraded construct summon.

```ts
"composite horror": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["construct"], exploits: ["harvested_part"] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
},
```

---

### Surgical Upgrade (Necrosurgeon / Reanimator)
**Gap**: Multi-turn channel/operation; construct-targeted heal; 3-turn cast time.
**Before**: effects: [heal_pctDmg, buff_stat], targeting: tgt_self
**After**: effects: [heal_flat, buff_stat, channel_dmg], targeting: tgt_self
**Rationale**: Two changes: (1) `heal_flat` replaces heal_pctDmg because "restore 50% HP" on a construct is a fixed heal, not damage-proportional. (2) `channel_dmg` (repurposed as a channel indicator) captures the "3 turns operating" channel mechanic. The dmgPerTurn can be set to 0 since this is a heal/buff channel, not a damage channel.

```ts
"surgical upgrade": {
  effects: ["heal_flat", "buff_stat"],
  targeting: "tgt_self",
  conditions: { creates: [], exploits: ["construct"] },
  effectParamOverrides: { heal_flat: { amount: 50 } },
},
```

---

### Masterwork Abomination (Necrosurgeon / Reanimator)
**Gap**: Ultimate summon tier; autonomous titan; self-repair; AoE slam.
**Before**: effects: [dmg_spell, dmg_multihit], targeting: tgt_self
**After**: effects: [summon_unit, dmg_multihit], targeting: tgt_self
**Rationale**: `summon_unit` replaces dmg_spell because this creates "a fully autonomous undead titan". The dmg_multihit remains for the AoE slam capability.

```ts
"masterwork abomination": {
  effects: ["summon_unit", "dmg_multihit"],
  targeting: "tgt_self",
  conditions: { creates: ["construct"], exploits: ["harvested_part"] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: -1, count: 1 } },
},
```

---

### Full Conversion (Necrosurgeon / Fleshcraft)
**Gap**: Type change (become Undead); specific immunities -- buff_dmgReduce + buff_stat was a workaround.
**Before**: effects: [buff_dmgReduce, buff_stat], targeting: tgt_self
**After**: effects: [transform_state, buff_dmgReduce], targeting: tgt_self
**Rationale**: `transform_state` captures "become Undead-type for 6 turns" -- this is a temporary state transformation, not just a stat buff. buff_dmgReduce remains for the immunity aspect (reduced incoming damage).

```ts
"full conversion": {
  effects: ["transform_state", "buff_dmgReduce"],
  targeting: "tgt_self",
  conditions: { creates: ["undead_form"], exploits: [] },
  effectParamOverrides: { transform_state: { turns: 6, bonusPct: 0 } },
},
```

---

### The Masterwork Self (Necrosurgeon / Fleshcraft)
**Gap**: Permanent transformation; creature-type change; HP regeneration over time.
**Before**: effects: [buff_dmgReduce, heal_pctDmg, buff_stat], targeting: tgt_self
**After**: effects: [transform_state, buff_dmgReduce, heal_hot], targeting: tgt_self
**Rationale**: Three changes: (1) `transform_state` replaces buff_stat because "permanently become a Flesh Construct" is a permanent transformation. (2) `heal_hot` replaces heal_pctDmg because "regenerate 2% HP/s" is heal-over-time, not damage-proportional healing. (3) buff_dmgReduce remains for the immunities.

```ts
"the masterwork self": {
  effects: ["transform_state", "buff_dmgReduce", "heal_hot"],
  targeting: "tgt_self",
  conditions: { creates: ["flesh_construct_form"], exploits: [] },
  effectParamOverrides: {
    transform_state: { turns: -1, bonusPct: 0 },
    heal_hot: { healPerTurn: 2, turns: -1 },
  },
},
```

---

### Spectral Shell (Necrosurgeon / Soul Harvest)
**Gap**: Single-hit absorption shield (discrete, not percentage).
**Before**: effects: [buff_dmgReduce], targeting: tgt_self
**After**: effects: [buff_shield], targeting: tgt_self
**Rationale**: `buff_shield` ("absorption shield") is a direct match for "absorb the next instance of damage". This is a finite absorption barrier, not a percentage reduction.

```ts
"spectral shell": {
  effects: ["buff_shield"],
  targeting: "tgt_self",
  conditions: { creates: ["spectral_shell"], exploits: ["soul_essence"] },
  effectParamOverrides: { buff_shield: { amount: 1, turns: -1 } },
},
```

---

### Soul Detonation (Necrosurgeon / Soul Harvest)
**Gap**: 3-hex radius (larger than adjacent).
**Before**: effects: [dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_spell], targeting: tgt_aoe_radius3
**Rationale**: `tgt_aoe_radius3` (3-hex radius) is an exact match for "3 hexes AoE explosion".

```ts
"soul detonation": {
  effects: ["dmg_spell"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: ["soul_essence"] },
},
```

---

### Spectral Minion (Necrosurgeon / Soul Harvest)
**Gap**: Summon/pet mechanic; temporary autonomous fighter; 6-turn duration.
**Before**: effects: [dmg_spell], targeting: tgt_self
**After**: effects: [summon_unit], targeting: tgt_self
**Rationale**: `summon_unit` is the correct type for "manifest a soul as a temporary ghost fighter for 6 turns". This is a summon, not spell damage.

```ts
"spectral minion": {
  effects: ["summon_unit"],
  targeting: "tgt_self",
  conditions: { creates: ["spectral_minion"], exploits: ["soul_essence"] },
  effectParamOverrides: { summon_unit: { hp: 0, turns: 6, count: 1 } },
},
```

---

### Soulstorm Engine (Necrosurgeon / Soul Harvest)
**Gap**: Persistent AoE zone (3 turns); 5-hex radius; channel/cast time; drain effect.
**Before**: effects: [dmg_multihit, dmg_spell], targeting: tgt_aoe_adjacent
**After**: effects: [dmg_multihit, zone_persist], targeting: tgt_aoe_radius3
**Rationale**: Two changes: (1) `zone_persist` replaces dmg_spell because the Soulstorm creates "a tempest lasting 3 turns that continuously damages and drains all enemies within" -- a persistent area effect, not a one-shot. (2) `tgt_aoe_radius3` replaces tgt_aoe_adjacent; while the described 5-hex radius exceeds radius-3, it is the largest available option.

```ts
"soulstorm engine": {
  effects: ["dmg_multihit", "zone_persist"],
  targeting: "tgt_aoe_radius3",
  conditions: { creates: [], exploits: ["soul_essence"] },
  effectParamOverrides: { zone_persist: { radius: 3, turns: 3, dmgPerTurn: 0 } },
},
```

---

## Summary

| # | Skill | Class / Archetype | Key Change |
|---|-------|-------------------|------------|
| 1 | Hemorrhage Wave | Blood Alchemist / Sacrifice | tgt_aoe_adjacent -> tgt_aoe_cone |
| 2 | Blood Nova | Blood Alchemist / Sacrifice | tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 3 | The Final Offering | Blood Alchemist / Sacrifice | tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 4 | Puppet String | Blood Alchemist / Hemomancy | disp_push -> disp_pull |
| 5 | Boil | Blood Alchemist / Hemomancy | debuff_vuln -> debuff_armor |
| 6 | Full Puppet | Blood Alchemist / Hemomancy | cc_stun -> cc_charm |
| 7 | Sanguine Dominion | Blood Alchemist / Hemomancy | cc_daze -> cc_charm, tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 8 | Clot Seal | Blood Alchemist / Transfusion | heal_pctDmg -> heal_flat |
| 9 | Sanguine Transfusion | Blood Alchemist / Transfusion | heal_pctDmg -> heal_flat |
| 10 | Vital Lattice | Blood Alchemist / Transfusion | tgt_single_ally -> tgt_all_allies |
| 11 | Soul Leak | Blood Alchemist / Transfusion | tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 12 | Mass Transfusion | Blood Alchemist / Transfusion | heal_pctDmg -> heal_flat, tgt_aoe_adjacent -> tgt_all_allies |
| 13 | The Eternal Circuit | Blood Alchemist / Transfusion | +dmg_reflect, tgt_aoe_adjacent -> tgt_all_allies |
| 14 | Blade Hunger | Hexblade / Hungering Blade | heal_pctDmg -> lifesteal |
| 15 | Feast Mode | Hexblade / Hungering Blade | buff_stat + heal_pctDmg -> lifesteal |
| 16 | The Infinite Hunger | Hexblade / Hungering Blade | heal_pctDmg -> lifesteal, +transform_state |
| 17 | Shield Formation | Hexblade / Spectral Arsenal | buff_dmgReduce -> buff_shield |
| 18 | Ghost Lance | Hexblade / Spectral Arsenal | +summon_unit, tgt_aoe_adjacent -> tgt_aoe_line |
| 19 | Blade Tornado | Hexblade / Spectral Arsenal | dmg_spell -> zone_persist, tgt_aoe_adjacent -> tgt_aoe_radius2 |
| 20 | Spectral Clone | Hexblade / Spectral Arsenal | dmg_spell -> summon_unit |
| 21 | Spectral Blade | Hexblade / Spectral Arsenal | dmg_spell -> summon_unit |
| 22 | Arsenal Expansion | Hexblade / Spectral Arsenal | dmg_spell -> summon_unit |
| 23 | The Ghost Armory | Hexblade / Spectral Arsenal | dmg_multihit -> summon_unit, buff_stat -> transform_state, tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 24 | Crude Assembly | Necrosurgeon / Reanimator | dmg_spell -> summon_unit |
| 25 | Composite Horror | Necrosurgeon / Reanimator | dmg_spell -> summon_unit |
| 26 | Surgical Upgrade | Necrosurgeon / Reanimator | heal_pctDmg -> heal_flat |
| 27 | Masterwork Abomination | Necrosurgeon / Reanimator | dmg_spell -> summon_unit |
| 28 | Full Conversion | Necrosurgeon / Fleshcraft | +transform_state, removed buff_stat |
| 29 | The Masterwork Self | Necrosurgeon / Fleshcraft | buff_stat -> transform_state, heal_pctDmg -> heal_hot |
| 30 | Spectral Shell | Necrosurgeon / Soul Harvest | buff_dmgReduce -> buff_shield |
| 31 | Soul Detonation | Necrosurgeon / Soul Harvest | tgt_aoe_adjacent -> tgt_aoe_radius3 |
| 32 | Spectral Minion | Necrosurgeon / Soul Harvest | dmg_spell -> summon_unit |
| 33 | Soulstorm Engine | Necrosurgeon / Soul Harvest | dmg_spell -> zone_persist, tgt_aoe_adjacent -> tgt_aoe_radius3 |

**33 skills updated out of ~75 total across the three classes.**

### Remaining gaps (no new type available)
- HP self-cost mechanics (Sacrifice archetype broadly)
- Cooldown reset (Exsanguinate)
- Toggle mechanics (Sanguine Pact)
- Kill-conditional triggers (Soul Drink, Soul Snare)
- Corpse interaction / resource gathering (Harvest Limb, Mass Harvest)
- Part consumption / construct modification (Specialist Graft, Head Transplant, Optimal Configuration)
- Stacking/scaling with resource counts (Hemorrhagic Burst, Curse Explosion, Phantom Strike, Spectral Surge, Haunted Volley)
- Debuff cleanse (Clot Seal -- cleanse portion only)
- Multi-hex-application-as-single-action (Grand Hex, Absolute Curse)
- Equipment slot expansion (Auxiliary Limb, Soul Forge)
