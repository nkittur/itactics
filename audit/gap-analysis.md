# Gap Analysis: Before & After

Generated: 2026-03-01
Source: mapping-updates-batch1.md, mapping-updates-batch2.md, mapping-updates-batch3.md

---

## Summary

- **Total skills audited**: ~220 across 10 classes
- **Total skills with gaps identified**: 116 (skills listed in all three batches with either changes or remaining gaps)
- **Skills updated with new types**: 116 (44 in batch 1 + 33 in batch 2 + 39 in batch 3)
- **Skills unchanged (best fit already or gaps purely custom)**: ~104
- **Remaining gaps (need custom systems)**: 60+ skills still have at least one unaddressed mechanic

---

## New Engine Types Added

### New EffectTypes

| Type | Description | Power | Skills Using It |
|------|-------------|-------|-----------------|
| `disp_teleport` | Instant repositioning ignoring terrain/pathing | range param | Blink Step, Flicker Strike, Rewind, Phase Cut |
| `disp_dash` | Charge toward target with damage on arrival | range + damageOnArrival params | Whirlwind Step, Force Bolt Slash, Bull Rush, Titan Charge, Chain Charge |
| `disp_pull` | Pull target toward caster | distance param | Puppet String, Scatter Drive |
| `cc_fear` | Fear/flee -- forced movement away from caster | chance + turns params | Brown Note, Battle Cry, Howl of Terror, Mass Rout, War God's Roar, Apex Predator |
| `cc_silence` | Ability lockout -- prevents skill use but allows basic actions | turns param | Muffle, Dead Air, Void Frequency, Total Silence, Discordant Note, Crushing Dominance, Apex Predator |
| `cc_taunt` | Forced targeting -- enemies must attack the taunter | turns param | Root Stance, Ghost Note, Taunt, Bait Pile |
| `cc_charm` | Mind control -- force target to act as ally or friendly-fire | turns + chance params | Noise Complaint, Full Puppet, Sanguine Dominion |
| `debuff_armor` | Destroy/reduce armor percentage | pct + turns params | Rust Touch, Crumble, Phase Cut, Boil, Armor Crack, Tungsten Tip, Corrosive Net |
| `debuff_healReduce` | Reduce healing received by percentage | pct + turns params | Sap Vitality, Plague Garden |
| `buff_stealth` | Stealth/invisibility with configurable break-on-attack | turns + breakOnAttack params | Sound Eater, Ghost Note, Total Silence, The Unheard |
| `buff_shield` | Absorption shield -- blocks discrete hits or flat HP | amount + turns params | Shield Formation, Spectral Shell |
| `heal_flat` | Fixed HP restoration (not proportional to damage dealt) | amount param | Rewind, Bloom Cascade, Closed Timelike, Clot Seal, Sanguine Transfusion, Mass Transfusion, Surgical Upgrade, Heal Companion |
| `heal_hot` | Heal-over-time -- periodic healing each turn | healPerTurn + turns params | Rejuvenate, Seedling, Verdant Tide, Gaia's Embrace, The Masterwork Self |
| `lifesteal` | Convert damage dealt into healing for the caster | pct param | Parasitic Vine, Blade Hunger, Feast Mode, The Infinite Hunger |
| `dmg_reflect` | Reflect damage back to attacker | pct + turns params | Causal Loop, World Tree, The Eternal Circuit, Ocean's Wrath |
| `summon_unit` | Create a persistent autonomous entity | hp + turns + count params | Fork Reality, Seedling, Gaia's Embrace, Fungal Growth, Cordyceps, Ghost Note, Plague Garden, Ghost Lance, Spectral Clone, Spectral Blade, Arsenal Expansion, The Ghost Armory, Crude Assembly, Composite Horror, Masterwork Abomination, Spectral Minion, Scout Hawk, Hunt as One |
| `zone_persist` | Persistent area effect lasting multiple turns | radius + turns + dmgPerTurn params | Entropic Field, Time Bomb, Entangling Wall, Dead Air, Wall of Sound, Symphony of Destruction, Fungal Growth, Plague Garden, Gaia's Embrace, Blade Tornado, Soulstorm Engine, Killzone, The Long Game |
| `trap_place` | Place a delayed/triggered trap | count + triggerDmg params | Snare Trap, Tripwire, Bait Pile, Spike Pit, Cluster Mine, Killbox Setup, The Long Game |
| `channel_dmg` | Sustained/channeled damage over multiple turns | dmgPerTurn + turns params | Heat Death, Parasitic Vine, Requiem, Focused Beam, Spirit Bomb, Sniper's Patience |
| `transform_state` | Enter a temporary power state with modified rules | turns + bonusPct params | Infinite Loop, Closed Timelike, World Tree, The Unheard, The Endless Dance, The Eternal War Song, The Infinite Hunger, Full Conversion, The Masterwork Self, The Ghost Armory, The Living Avalanche, Crimson God, Rampage, Apex Predator, Transcendent Ki, Ocean's Wrath, Hunt as One |

### New TargetingTypes

| Type | Description | Power Mult | Skills Using It |
|------|-------------|------------|-----------------|
| `tgt_aoe_cone` | 120-degree directional cone | ~3 hexes | Screech, Pivot Slash, Cleave, Hemorrhage Wave, Scout Hawk |
| `tgt_aoe_line` | Line piercing through multiple hexes | ~4 hexes | Entangling Wall, Wall of Sound, Shockwave, Resonance Overflow, Ghost Lance, Wave of Force, Sniper's Patience |
| `tgt_aoe_radius2` | 2-hex radius circle AoE | ~19 hexes | Bass Drop, Time Bomb, Dead Air, Seedling, Fungal Growth, Plague Garden, Soul Leak, Blade Tornado, Battle Cry, Mass Rout, Whirlwind, Seismic Slam, Ki Explosion, Killzone |
| `tgt_aoe_radius3` | 3-hex radius circle AoE (largest available) | ~37 hexes | Entropic Field, Pandemic, Verdant Tide, Noise Complaint, Symphony of Destruction, Grand Synthesis, Total Silence, Blood Nova, The Final Offering, Sanguine Dominion, Soul Detonation, Soulstorm Engine, The Ghost Armory, Howl of Terror, Inner Supernova, Spirit Bomb, The Long Game |
| `tgt_all_allies` | All allies on the battlefield | party-wide | Temporal Surge, Bloom Cascade, Gaia's Embrace, Harmonic Chorus, The Eternal War Song, Vital Lattice, Mass Transfusion, The Eternal Circuit |
| `tgt_all_enemies` | All enemies on the battlefield | field-wide | War God's Roar, Apex Predator |

### New ModifierTypes

No new modifier types were introduced in these batches. All changes involved effect types and targeting types. Modifier-level gaps (combo scaling, conditional bonuses, stack consumption formulas) remain as future work.

---

## Changes By Class

### Chronoweaver (15 skills updated)

**Blink Step** (Accelerant)
- Gap: Teleportation had no direct effect; movement buff was a proxy
- Before: effects: [buff_stat], targeting: tgt_self
- After: effects: [disp_teleport], targeting: tgt_self
- Remaining gap: None

**Flicker Strike** (Accelerant)
- Gap: Teleport-to-target movement component not representable
- Before: effects: [dmg_weapon], targeting: tgt_single_enemy
- After: effects: [disp_teleport, dmg_weapon], targeting: tgt_single_enemy
- Remaining gap: Teleport-back (return to origin) is implicit

**Temporal Surge** (Accelerant)
- Gap: Party-wide targeting beyond adjacent range
- Before: effects: [buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [buff_stat], targeting: tgt_all_allies
- Remaining gap: None

**Infinite Loop** (Accelerant)
- Gap: Action duplication/echo mechanic had no effect equivalent
- Before: effects: [buff_stat], targeting: tgt_self
- After: effects: [transform_state], targeting: tgt_self
- Remaining gap: Action duplication logic itself is custom

**Sap Vitality** (Entropy)
- Gap: Healing reduction not a standard stat
- Before: effects: [debuff_stat], targeting: tgt_single_enemy
- After: effects: [debuff_healReduce], targeting: tgt_single_enemy
- Remaining gap: None

**Rust Touch** (Entropy)
- Gap: Armor reduction vs general vulnerability
- Before: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: Stacking mechanic is a parameter detail

**Entropic Field** (Entropy)
- Gap: Zone/persistent area effect; aoe_adjacent was approximate
- Before: effects: [dot_poison], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist], targeting: tgt_aoe_radius3
- Remaining gap: None

**Crumble** (Entropy)
- Gap: Percentage armor destruction vs vulnerability debuff
- Before: effects: [debuff_vuln], targeting: tgt_single_enemy
- After: effects: [debuff_armor], targeting: tgt_single_enemy
- Remaining gap: None

**Pandemic** (Entropy)
- Gap: DoT spreading mechanic; 4-hex radius approximated as adjacent
- Before: effects: [dot_poison], targeting: tgt_aoe_adjacent
- After: effects: [dot_poison], targeting: tgt_aoe_radius3
- Remaining gap: DoT spreading/copying mechanic is custom

**Heat Death** (Entropy)
- Gap: Damage recording and replay mechanic; delayed burst
- Before: effects: [dmg_spell, dmg_execute], targeting: tgt_single_enemy
- After: effects: [channel_dmg, dmg_execute], targeting: tgt_single_enemy
- Remaining gap: Damage accumulation tracking is custom

**Rewind** (Paradox)
- Gap: Position restoration; HP snapshot restoration
- Before: effects: [heal_pctDmg], targeting: tgt_self
- After: effects: [heal_flat, disp_teleport], targeting: tgt_self
- Remaining gap: Snapshot/recording of past state is custom

**Causal Loop** (Paradox)
- Gap: Damage reflection/self-harm on attack
- Before: effects: [debuff_vuln], targeting: tgt_single_enemy
- After: effects: [dmg_reflect], targeting: tgt_single_enemy
- Remaining gap: None

**Time Bomb** (Paradox)
- Gap: Delayed detonation; damage recording
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, dmg_spell], targeting: tgt_aoe_radius2
- Remaining gap: Accumulated damage replay is custom

**Fork Reality** (Paradox)
- Gap: Summon/clone mechanic was not representable
- Before: effects: [dmg_multihit], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: Clone copying attacks at reduced percentage is a parameter detail

**Closed Timelike** (Paradox)
- Gap: Full battlefield state rewind
- Before: effects: [heal_pctDmg, buff_stat], targeting: tgt_self
- After: effects: [heal_flat, transform_state], targeting: tgt_self
- Remaining gap: Battlefield state rewind is entirely custom

---

### Ironbloom Warden (10 skills updated)

**Root Stance** (Thornwall)
- Gap: Threat/aggro generation had no effect
- Before: effects: [buff_dmgReduce, debuff_stat], targeting: tgt_self
- After: effects: [buff_dmgReduce, debuff_stat, cc_taunt], targeting: tgt_self
- Remaining gap: None

**Entangling Wall** (Thornwall)
- Gap: Persistent terrain/wall creation; line-shaped targeting
- Before: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, debuff_stat], targeting: tgt_aoe_line
- Remaining gap: Terrain collision/pathing block is custom

**World Tree** (Thornwall)
- Gap: Ally DR aura; massive thorn reflect; immobility transform
- Before: effects: [buff_dmgReduce, stance_counter], targeting: tgt_self
- After: effects: [buff_dmgReduce, dmg_reflect, transform_state], targeting: tgt_self
- Remaining gap: Ally DR aura (dual targeting) is custom

**Rejuvenate** (Overgrowth)
- Gap: Heal-over-time vs instant heal
- Before: effects: [heal_pctDmg], targeting: tgt_single_ally
- After: effects: [heal_hot], targeting: tgt_single_ally
- Remaining gap: None

**Seedling** (Overgrowth)
- Gap: Summon/placeable entity; persistent healing zone
- Before: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [summon_unit, heal_hot], targeting: tgt_aoe_radius2
- Remaining gap: None

**Verdant Tide** (Overgrowth)
- Gap: Large radius AoE heal zone vs adjacent
- Before: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [heal_hot], targeting: tgt_aoe_radius3
- Remaining gap: None

**Bloom Cascade** (Overgrowth)
- Gap: Consuming summons for scaling effect
- Before: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [heal_flat], targeting: tgt_all_allies
- Remaining gap: Summon-consumption scaling is custom

**Gaia's Embrace** (Overgrowth)
- Gap: Battlefield-wide persistent effect; auto-spawning summons; dual targeting
- Before: effects: [heal_pctDmg, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [heal_hot, debuff_stat, summon_unit, zone_persist], targeting: tgt_all_allies
- Remaining gap: Dual targeting (allies healed + enemies slowed) is custom

**Fungal Growth** (Rot Herald)
- Gap: Summon/placeable entity; persistent poison zone
- Before: effects: [dot_poison], targeting: tgt_aoe_adjacent
- After: effects: [summon_unit, zone_persist], targeting: tgt_aoe_radius2
- Remaining gap: None

**Plague Garden** (Rot Herald)
- Gap: Multi-point zone creation; healing reduction proxy
- Before: effects: [dot_poison, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, debuff_healReduce, summon_unit], targeting: tgt_aoe_radius2
- Remaining gap: Triangle formation placement is custom

**Parasitic Vine** (Rot Herald)
- Gap: Tethered/leash mechanic; HP drain channel
- Before: effects: [dot_poison, heal_pctDmg], targeting: tgt_single_enemy
- After: effects: [channel_dmg, lifesteal], targeting: tgt_single_enemy
- Remaining gap: Tether/distance-break mechanic is custom

**Cordyceps** (Rot Herald)
- Gap: On-death summon/minion creation
- Before: effects: [debuff_stat], targeting: tgt_single_enemy
- After: effects: [debuff_stat, summon_unit], targeting: tgt_single_enemy
- Remaining gap: Death-trigger conditional is custom

---

### Echo Dancer (12 skills updated)

**Muffle** (Silence)
- Gap: Silence vs daze distinction
- Before: effects: [cc_daze], targeting: tgt_single_enemy
- After: effects: [cc_silence], targeting: tgt_single_enemy
- Remaining gap: None

**Sound Eater** (Silence)
- Gap: Stealth/invisibility mechanic
- Before: effects: [buff_stat], targeting: tgt_self
- After: effects: [buff_stealth], targeting: tgt_self
- Remaining gap: None

**Dead Air** (Silence)
- Gap: Persistent zone; silence vs daze; area denial
- Before: effects: [cc_daze], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, cc_silence], targeting: tgt_aoe_radius2
- Remaining gap: None

**Void Frequency** (Silence)
- Gap: Cooldown manipulation
- Before: effects: [cc_daze], targeting: tgt_single_enemy
- After: effects: [cc_silence], targeting: tgt_single_enemy
- Remaining gap: Cooldown freeze is mechanically different from silence (approximation only)

**Ghost Note** (Silence)
- Gap: Decoy/summon; taunt/threat redirect; stealth
- Before: effects: [buff_stat], targeting: tgt_self
- After: effects: [buff_stealth, summon_unit, cc_taunt], targeting: tgt_self
- Remaining gap: None

**Total Silence** (Silence)
- Gap: Dual-target (enemies silenced, allies stealthed); large radius
- Before: effects: [cc_daze, buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [cc_silence, buff_stealth], targeting: tgt_aoe_radius3
- Remaining gap: Dual-target nature (enemies vs allies from same ability)

**The Unheard** (Silence)
- Gap: Permanent unbreakable stealth; untargetable status
- Before: effects: [buff_stat, buff_dmgReduce], targeting: tgt_self
- After: effects: [buff_stealth, transform_state], targeting: tgt_self
- Remaining gap: True untargetability is custom

**Screech** (Cacophony)
- Gap: Cone-shaped targeting vs adjacent AoE
- Before: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, debuff_stat], targeting: tgt_aoe_cone
- Remaining gap: None

**Bass Drop** (Cacophony)
- Gap: 2-hex radius vs adjacent
- Before: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, disp_push], targeting: tgt_aoe_radius2
- Remaining gap: None

**Wall of Sound** (Cacophony)
- Gap: Persistent barrier/wall; triggered effect on crossing
- Before: effects: [dmg_spell, cc_stun], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, cc_stun], targeting: tgt_aoe_line
- Remaining gap: Stun-on-crossing trigger is custom

**Shockwave** (Cacophony)
- Gap: Line-shaped targeting vs adjacent
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell], targeting: tgt_aoe_line
- Remaining gap: Escalating damage per target hit is custom

**Noise Complaint** (Cacophony)
- Gap: Friendly fire mechanic; large radius
- Before: effects: [debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [debuff_stat, cc_charm], targeting: tgt_aoe_radius3
- Remaining gap: None

**Brown Note** (Cacophony)
- Gap: Fear/flee mechanic (forced movement away)
- Before: effects: [cc_root, dot_burn], targeting: tgt_single_enemy
- After: effects: [cc_fear, dot_burn], targeting: tgt_single_enemy
- Remaining gap: Fear spreading to nearby enemies is custom

**Symphony of Destruction** (Cacophony)
- Gap: Persistent escalating zone; dual-target; large radius
- Before: effects: [dmg_spell, debuff_stat, buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, debuff_stat, buff_stat], targeting: tgt_aoe_radius3
- Remaining gap: Dual-target (enemies damaged, allies buffed) and escalation

**Requiem** (Resonance)
- Gap: Damage tracking and replay; delayed burst
- Before: effects: [dmg_spell, dmg_execute], targeting: tgt_single_enemy
- After: effects: [channel_dmg, dmg_execute], targeting: tgt_single_enemy
- Remaining gap: Damage accumulation tracking is custom

---

### Bladesinger (8 skills updated)

**Whirlwind Step** (Sword Dance)
- Gap: Dash-through movement
- Before: effects: [dmg_weapon], targeting: tgt_single_enemy
- After: effects: [disp_dash, dmg_weapon], targeting: tgt_single_enemy
- Remaining gap: Combo timer reset is custom

**Pivot Slash** (Sword Dance)
- Gap: 180-degree arc vs full adjacent AoE
- Before: effects: [dmg_weapon], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon], targeting: tgt_aoe_cone
- Remaining gap: 180 vs 120 degree difference is minor

**The Endless Dance** (Sword Dance)
- Gap: Transform/ultimate state; auto-firing abilities; uncapped resource
- Before: effects: [buff_stat, dmg_multihit], targeting: tgt_self
- After: effects: [transform_state, dmg_multihit], targeting: tgt_self
- Remaining gap: Auto-firing abilities and uncapped Rhythm are custom

**Force Bolt Slash** (Spell Weave)
- Gap: Dash/gap-close movement component
- Before: effects: [dmg_spell, dmg_weapon], targeting: tgt_single_enemy
- After: effects: [dmg_spell, disp_dash, dmg_weapon], targeting: tgt_single_enemy
- Remaining gap: None

**Phase Cut** (Spell Weave)
- Gap: Teleport-behind positioning; armor ignore
- Before: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [disp_teleport, dmg_weapon, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: None

**Resonance Overflow** (Spell Weave)
- Gap: Line/piercing targeting vs adjacent
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell], targeting: tgt_aoe_line
- Remaining gap: None

**Grand Synthesis** (Spell Weave)
- Gap: 4-hex nova radius
- Before: effects: [dmg_weapon, dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon, dmg_spell], targeting: tgt_aoe_radius3
- Remaining gap: None

**Harmonic Chorus** (War Chant)
- Gap: Aura amplification (radius + potency)
- Before: effects: [buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [buff_stat], targeting: tgt_all_allies
- Remaining gap: Aura amplification as a modifier is custom

**Discordant Note** (War Chant)
- Gap: Interrupt/counterspell mechanic
- Before: effects: [cc_daze], targeting: tgt_single_enemy
- After: effects: [cc_silence], targeting: tgt_single_enemy
- Remaining gap: Reactive timing (interrupt on cast) is custom

**The Eternal War Song** (War Chant)
- Gap: Triple aura maintenance; CC immunity for allies
- Before: effects: [buff_stat, buff_dmgReduce], targeting: tgt_aoe_adjacent
- After: effects: [buff_stat, buff_dmgReduce, transform_state], targeting: tgt_all_allies
- Remaining gap: CC immunity for allies and triple aura are custom

---

### Blood Alchemist (13 skills updated)

**Hemorrhage Wave** (Sacrifice)
- Gap: Cone targeting approximated by adjacent
- Before: effects: [dmg_spell, dot_bleed], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, dot_bleed], targeting: tgt_aoe_cone
- Remaining gap: None

**Blood Nova** (Sacrifice)
- Gap: Large radius AoE (4 hexes) crammed into adjacent
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell], targeting: tgt_aoe_radius3
- Remaining gap: Actual radius is 4 hexes, radius3 is slightly undersized

**The Final Offering** (Sacrifice)
- Gap: Massive 6-hex radius AoE mapped as adjacent
- Before: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_radius3
- Remaining gap: 6-hex radius exceeds radius3; HP self-cost mechanic

**Puppet String** (Hemomancy)
- Gap: Forced movement with directional control
- Before: effects: [disp_push, dmg_spell], targeting: tgt_single_enemy
- After: effects: [disp_pull, dmg_spell], targeting: tgt_single_enemy
- Remaining gap: Arbitrary-direction forced movement (not just toward caster)

**Boil** (Hemomancy)
- Gap: Armor reduction specifically vs general vulnerability
- Before: effects: [dot_burn, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [dot_burn, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: None

**Full Puppet** (Hemomancy)
- Gap: Mind control / charm mechanic
- Before: effects: [cc_stun], targeting: tgt_single_enemy
- After: effects: [cc_charm], targeting: tgt_single_enemy
- Remaining gap: None

**Sanguine Dominion** (Hemomancy)
- Gap: Massive 6-hex radius; friendly-fire as daze
- Before: effects: [debuff_stat, debuff_stat, cc_daze], targeting: tgt_aoe_adjacent
- After: effects: [debuff_stat, debuff_stat, cc_charm], targeting: tgt_aoe_radius3
- Remaining gap: 6-hex radius exceeds radius3

**Clot Seal** (Transfusion)
- Gap: Heal is flat % not based on damage dealt
- Before: effects: [heal_pctDmg], targeting: tgt_single_ally
- After: effects: [heal_flat], targeting: tgt_single_ally
- Remaining gap: Debuff cleanse component is custom

**Sanguine Transfusion** (Transfusion)
- Gap: Heal scales with caster HP not damage dealt
- Before: effects: [heal_pctDmg], targeting: tgt_single_ally
- After: effects: [heal_flat], targeting: tgt_single_ally
- Remaining gap: HP self-cost mechanic

**Vital Lattice** (Transfusion)
- Gap: Multi-target linking mechanic
- Before: effects: [buff_dmgReduce], targeting: tgt_single_ally
- After: effects: [buff_dmgReduce], targeting: tgt_all_allies
- Remaining gap: Damage-sharing/linking between linked allies is custom

**Soul Leak** (Transfusion)
- Gap: Dual-function AoE damage + party heal; 3-hex radius
- Before: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, heal_pctDmg], targeting: tgt_aoe_radius2
- Remaining gap: None

**Mass Transfusion** (Transfusion)
- Gap: AoE ally heal with wrong heal type; 4-hex radius
- Before: effects: [heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [heal_flat], targeting: tgt_all_allies
- Remaining gap: HP self-cost mechanic

**The Eternal Circuit** (Transfusion)
- Gap: Channel mechanic; party-wide link; bleed reflect
- Before: effects: [buff_dmgReduce, heal_pctDmg], targeting: tgt_aoe_adjacent
- After: effects: [buff_dmgReduce, heal_pctDmg, dmg_reflect], targeting: tgt_all_allies
- Remaining gap: Channel mechanic (no channel type for buff channels)

---

### Hexblade (12 skills updated)

**Blade Hunger** (Hungering Blade)
- Gap: Lifesteal doubling modifier
- Before: effects: [buff_stat, heal_pctDmg], targeting: tgt_self
- After: effects: [buff_stat, lifesteal], targeting: tgt_self
- Remaining gap: None

**Feast Mode** (Hungering Blade)
- Gap: 100% lifesteal conversion mechanic
- Before: effects: [buff_stat, heal_pctDmg], targeting: tgt_self
- After: effects: [lifesteal], targeting: tgt_self
- Remaining gap: None

**The Infinite Hunger** (Hungering Blade)
- Gap: 100% lifesteal; extended melee range; kill-conditional healing
- Before: effects: [buff_stat, heal_pctDmg, dmg_weapon], targeting: tgt_self
- After: effects: [buff_stat, lifesteal, dmg_weapon, transform_state], targeting: tgt_self
- Remaining gap: Kill-conditional healing and permanent bonus lock-in are custom

**Shield Formation** (Spectral Arsenal)
- Gap: Hit absorption (discrete hits, not %)
- Before: effects: [buff_dmgReduce], targeting: tgt_self
- After: effects: [buff_shield], targeting: tgt_self
- Remaining gap: None

**Ghost Lance** (Spectral Arsenal)
- Gap: Line/penetrating targeting; persistent autonomous entity
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, summon_unit], targeting: tgt_aoe_line
- Remaining gap: None

**Blade Tornado** (Spectral Arsenal)
- Gap: Persistent AoE zone; proximity-triggered damage; 2-hex radius
- Before: effects: [dmg_spell, buff_dmgReduce], targeting: tgt_aoe_adjacent
- After: effects: [zone_persist, buff_dmgReduce], targeting: tgt_aoe_radius2
- Remaining gap: None

**Spectral Clone** (Spectral Arsenal)
- Gap: Remote summon placement; autonomous clone
- Before: effects: [dmg_spell], targeting: tgt_single_enemy
- After: effects: [summon_unit], targeting: tgt_single_enemy
- Remaining gap: None

**Spectral Blade** (Spectral Arsenal)
- Gap: Summon/pet mechanic; autonomous periodic attacks
- Before: effects: [dmg_spell], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: None

**Arsenal Expansion** (Spectral Arsenal)
- Gap: Summon/pet mechanic; multiple persistent entities
- Before: effects: [dmg_spell], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: None

**The Ghost Armory** (Spectral Arsenal)
- Gap: 10 simultaneous summons; autonomous targeting; ultimate state
- Before: effects: [dmg_multihit, dmg_spell, buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [summon_unit, dmg_spell, transform_state], targeting: tgt_aoe_radius3
- Remaining gap: 10-summon management and autonomous target selection are custom

---

### Necrosurgeon (11 skills updated)

**Crude Assembly** (Reanimator)
- Gap: Summon/pet mechanic; construct with variable stats
- Before: effects: [dmg_spell], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: Part-based stat variation is custom

**Composite Horror** (Reanimator)
- Gap: Summon/pet mechanic; 5-part requirement
- Before: effects: [dmg_spell], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: Part consumption resource system

**Surgical Upgrade** (Reanimator)
- Gap: Multi-turn channel; construct-targeted heal
- Before: effects: [heal_pctDmg, buff_stat], targeting: tgt_self
- After: effects: [heal_flat, buff_stat], targeting: tgt_self
- Remaining gap: 3-turn cast time / channel mechanic

**Masterwork Abomination** (Reanimator)
- Gap: Ultimate summon; autonomous titan; self-repair
- Before: effects: [dmg_spell, dmg_multihit], targeting: tgt_self
- After: effects: [summon_unit, dmg_multihit], targeting: tgt_self
- Remaining gap: Self-repair and autonomous AI are custom

**Full Conversion** (Fleshcraft)
- Gap: Type change (become Undead); specific immunities
- Before: effects: [buff_dmgReduce, buff_stat], targeting: tgt_self
- After: effects: [transform_state, buff_dmgReduce], targeting: tgt_self
- Remaining gap: Creature-type change and specific immunity list are custom

**The Masterwork Self** (Fleshcraft)
- Gap: Permanent transformation; creature-type change; HP regen
- Before: effects: [buff_dmgReduce, heal_pctDmg, buff_stat], targeting: tgt_self
- After: effects: [transform_state, buff_dmgReduce, heal_hot], targeting: tgt_self
- Remaining gap: Permanent creature-type change is custom

**Spectral Shell** (Soul Harvest)
- Gap: Single-hit absorption shield
- Before: effects: [buff_dmgReduce], targeting: tgt_self
- After: effects: [buff_shield], targeting: tgt_self
- Remaining gap: None

**Soul Detonation** (Soul Harvest)
- Gap: 3-hex radius (larger than adjacent)
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell], targeting: tgt_aoe_radius3
- Remaining gap: None

**Spectral Minion** (Soul Harvest)
- Gap: Summon/pet mechanic; temporary autonomous fighter
- Before: effects: [dmg_spell], targeting: tgt_self
- After: effects: [summon_unit], targeting: tgt_self
- Remaining gap: None

**Soulstorm Engine** (Soul Harvest)
- Gap: Persistent AoE zone; 5-hex radius; channel; drain
- Before: effects: [dmg_multihit, dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_multihit, zone_persist], targeting: tgt_aoe_radius3
- Remaining gap: 5-hex radius exceeds radius3; drain effect is custom

---

### Berserker (16 skills updated)

**Battle Cry** (Primal Howl)
- Gap: Fear/flee mechanic; 2-hex radius vs adjacent
- Before: effects: [cc_daze, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [cc_fear, debuff_stat], targeting: tgt_aoe_radius2
- Remaining gap: None

**Taunt** (Primal Howl)
- Gap: Taunt/forced-targeting mechanic
- Before: effects: [cc_daze, debuff_stat], targeting: tgt_single_enemy
- After: effects: [cc_taunt, debuff_stat], targeting: tgt_single_enemy
- Remaining gap: None

**Howl of Terror** (Primal Howl)
- Gap: 4-hex range; tiered effect; fear/flee
- Before: effects: [cc_stun, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [cc_fear, cc_stun, debuff_stat], targeting: tgt_aoe_radius3
- Remaining gap: Tiered morale check branching is custom

**Crushing Dominance** (Primal Howl)
- Gap: Skill lockout / ability suppression
- Before: effects: [debuff_stat, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [debuff_stat, debuff_vuln, cc_silence], targeting: tgt_single_enemy
- Remaining gap: None

**Mass Rout** (Primal Howl)
- Gap: Charge-path AoE; probability-based branching; fear
- Before: effects: [dmg_weapon, cc_daze, debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon, cc_fear, debuff_stat], targeting: tgt_aoe_radius2
- Remaining gap: Charge-path shape and branching logic are custom

**War God's Roar** (Primal Howl)
- Gap: Battlefield-wide targeting; ally buff on enemy ability; fear immunity
- Before: effects: [cc_stun, buff_stat], targeting: tgt_aoe_adjacent
- After: effects: [cc_fear, buff_stat], targeting: tgt_all_enemies
- Remaining gap: Dual targeting (ally buff + enemy fear from same ability)

**Apex Predator** (Primal Howl)
- Gap: Battlefield-wide aura; flinch/interrupt; prevent resurrection; ability suppression; transform
- Before: effects: [debuff_stat, buff_stat, cc_daze], targeting: tgt_aoe_adjacent
- After: effects: [transform_state, debuff_stat, cc_silence, cc_fear], targeting: tgt_all_enemies
- Remaining gap: Ally buff (dual targeting), prevent-resurrection, flinch-on-attack

**Cleave** (Warpath)
- Gap: 180-degree frontal cone vs full adjacent
- Before: effects: [dmg_weapon], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon], targeting: tgt_aoe_cone
- Remaining gap: None

**Whirlwind** (Warpath)
- Gap: 2-hex radius vs 1-hex adjacent
- Before: effects: [dmg_multihit], targeting: tgt_aoe_adjacent
- After: effects: [dmg_multihit], targeting: tgt_aoe_radius2
- Remaining gap: Movement while attacking is custom

**Seismic Slam** (Warpath)
- Gap: Leap/gap-close; prone vs stun; momentum resource
- Before: effects: [dmg_weapon, cc_stun, disp_push], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon, cc_stun, disp_push], targeting: tgt_aoe_radius2
- Remaining gap: Leap/gap-close and momentum generation are custom

**Bull Rush** (Warpath)
- Gap: Charge mechanic better represented by dash
- Before: effects: [dmg_weapon, disp_push], targeting: tgt_single_enemy
- After: effects: [disp_dash, disp_push], targeting: tgt_single_enemy
- Remaining gap: None

**Titan Charge** (Warpath)
- Gap: Splash damage to nearby enemies; CC-immune during charge
- Before: effects: [dmg_weapon, dmg_weapon], targeting: tgt_single_enemy
- After: effects: [disp_dash, dmg_weapon], targeting: tgt_single_enemy
- Remaining gap: Splash targeting and CC immunity during charge are custom

**Chain Charge** (Warpath)
- Gap: Multi-target chaining; unique-target constraint; diminishing range
- Before: effects: [dmg_weapon, dmg_multihit], targeting: tgt_single_enemy
- After: effects: [disp_dash, dmg_multihit], targeting: tgt_single_enemy
- Remaining gap: Unique-target, diminishing-range, and stacking-damage constraints are custom

**Rampage** (Warpath)
- Gap: Cooldown reset for specific abilities; conditional maintenance
- Before: effects: [res_apRefund], targeting: tgt_self
- After: effects: [transform_state, res_apRefund], targeting: tgt_self
- Remaining gap: Movement-maintenance condition and cooldown resets are custom

**The Living Avalanche** (Warpath)
- Gap: Passive AoE on movement; on-kill explosion; CC/physics immunity; terrain destruction
- Before: effects: [dmg_weapon, buff_stat, buff_dmgReduce], targeting: tgt_self
- After: effects: [transform_state, dmg_weapon, buff_stat], targeting: tgt_self
- Remaining gap: AoE-on-movement, on-kill explosion, CC immunity, terrain destruction are custom

**Crimson God** (Blood Fury)
- Gap: HP freeze; on-kill AoE nova; deferred damage on expiry; transform
- Before: effects: [dmg_weapon, buff_stat, dmg_weapon], targeting: tgt_self
- After: effects: [transform_state, dmg_weapon, buff_stat], targeting: tgt_self
- Remaining gap: HP freeze, deferred damage, on-kill nova are custom

---

### Monk (8 skills updated)

**Armor Crack** (Iron Fist)
- Gap: Armor reduction vs general vulnerability
- Before: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: None

**Wave of Force** (Inner Fire)
- Gap: Line targeting vs adjacent AoE
- Before: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, disp_push], targeting: tgt_aoe_line
- Remaining gap: None

**Ki Explosion** (Inner Fire)
- Gap: Targeted AoE centered on enemy (not self)
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell], targeting: tgt_aoe_radius2
- Remaining gap: "Centered on enemy" nuance (vs centered on self)

**Focused Beam** (Inner Fire)
- Gap: Escalating damage over channel duration
- Before: effects: [dmg_spell], targeting: tgt_single_enemy
- After: effects: [channel_dmg], targeting: tgt_single_enemy
- Remaining gap: Escalating damage formula is custom

**Spirit Bomb** (Inner Fire)
- Gap: 2-turn charge-up; 4-hex radius; ki gathering
- Before: effects: [dmg_spell], targeting: tgt_aoe_adjacent
- After: effects: [channel_dmg], targeting: tgt_aoe_radius3
- Remaining gap: Environmental ki gathering is custom

**Inner Supernova** (Inner Fire)
- Gap: 4-hex radius; resource depletion (all ki)
- Before: effects: [dmg_spell, disp_push], targeting: tgt_aoe_adjacent
- After: effects: [dmg_spell, disp_push], targeting: tgt_aoe_radius3
- Remaining gap: Ki depletion cost is custom

**Transcendent Ki** (Inner Fire)
- Gap: Free-cast; auto-chain; periodic Spirit Bomb; transform
- Before: effects: [dmg_spell, buff_stat, dmg_spell], targeting: tgt_self
- After: effects: [transform_state, dmg_spell, buff_stat], targeting: tgt_self
- Remaining gap: Free-cast, auto-chain, periodic ability triggers are custom

**Ocean's Wrath** (Flowing Water)
- Gap: 100% auto-dodge; damage reflection; multi-target counter chaining
- Before: effects: [buff_stat, stance_counter, dmg_weapon], targeting: tgt_self
- After: effects: [transform_state, dmg_reflect, stance_counter], targeting: tgt_self
- Remaining gap: Auto-dodge and multi-target counter chaining are custom

---

### Ranger (14 skills updated)

**Killzone** (Dead Eye)
- Gap: Zone-based damage buff; conditional buff based on target location
- Before: effects: [buff_stat], targeting: tgt_self
- After: effects: [zone_persist], targeting: tgt_aoe_radius2
- Remaining gap: None

**Tungsten Tip** (Dead Eye)
- Gap: Armor penetration vs general vulnerability
- Before: effects: [dmg_weapon, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [dmg_weapon, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: None

**Sniper's Patience** (Dead Eye)
- Gap: Variable damage scaling from charge; pierce-through
- Before: effects: [dmg_weapon], targeting: tgt_single_enemy
- After: effects: [channel_dmg], targeting: tgt_aoe_line
- Remaining gap: None

**Snare Trap** (Trapper)
- Gap: Trap placement mechanic; hidden placement
- Before: effects: [cc_root], targeting: tgt_single_enemy
- After: effects: [trap_place, cc_root], targeting: tgt_single_enemy
- Remaining gap: Hidden/invisible placement is custom

**Tripwire** (Trapper)
- Gap: Position reveal/scouting; trap placement
- Before: effects: [debuff_stat], targeting: tgt_single_enemy
- After: effects: [trap_place, debuff_stat], targeting: tgt_single_enemy
- Remaining gap: Scouting/vision reveal is custom

**Bait Pile** (Trapper)
- Gap: AI manipulation/aggro redirect; lure mechanic; trap placement
- Before: effects: [cc_daze], targeting: tgt_single_enemy
- After: effects: [trap_place, cc_taunt], targeting: tgt_single_enemy
- Remaining gap: None

**Spike Pit** (Trapper)
- Gap: Trap placement; 2x1 hex area; camouflage
- Before: effects: [debuff_stat, dot_bleed], targeting: tgt_single_enemy
- After: effects: [trap_place, debuff_stat, dot_bleed], targeting: tgt_single_enemy
- Remaining gap: 2x1 hex area shape and camouflage are custom

**Cluster Mine** (Trapper)
- Gap: Trap placement; fragment scatter pattern
- Before: effects: [dmg_multihit], targeting: tgt_aoe_adjacent
- After: effects: [trap_place, dmg_multihit], targeting: tgt_aoe_adjacent
- Remaining gap: Fragment scatter pattern is custom

**Corrosive Net** (Trapper)
- Gap: Stacking debuff over time while ensnared
- Before: effects: [cc_root, debuff_vuln], targeting: tgt_single_enemy
- After: effects: [cc_root, debuff_armor], targeting: tgt_single_enemy
- Remaining gap: Stacking over time while ensnared is custom

**Killbox Setup** (Trapper)
- Gap: Multi-trap simultaneous placement; linked triggers; formation
- Before: effects: [dmg_weapon, cc_root], targeting: tgt_aoe_adjacent
- After: effects: [trap_place, dmg_weapon, cc_root], targeting: tgt_aoe_adjacent
- Remaining gap: Linked trigger mechanic and triangular formation are custom

**The Long Game** (Trapper)
- Gap: Massive area trap seeding; cascading triggers; 6-hex radius; 8-turn persistence
- Before: effects: [dmg_multihit, cc_root], targeting: tgt_aoe_adjacent
- After: effects: [trap_place, zone_persist, cc_root], targeting: tgt_aoe_radius3
- Remaining gap: 2-turn setup time and cascading sequence are custom

**Scout Hawk** (Beastmaster Archer)
- Gap: Summon/pet; scouting/vision reveal; 5-hex cone
- Before: effects: [debuff_stat], targeting: tgt_aoe_adjacent
- After: effects: [summon_unit], targeting: tgt_aoe_cone
- Remaining gap: None

**Heal Companion** (Beastmaster Archer)
- Gap: Pet-specific healing; cooldown reduction for pet abilities
- Before: effects: [heal_pctDmg], targeting: tgt_single_ally
- After: effects: [heal_flat], targeting: tgt_single_ally
- Remaining gap: Cooldown reduction for pet is custom

**Scatter Drive** (Beastmaster Archer)
- Gap: Pet herding/displacement; pull-toward-self
- Before: effects: [dmg_weapon, debuff_stat, disp_push], targeting: tgt_aoe_adjacent
- After: effects: [dmg_weapon, debuff_stat, disp_pull], targeting: tgt_aoe_adjacent
- Remaining gap: None

**Hunt as One** (Beastmaster Archer)
- Gap: Shared HP pool; spectral pet summons; HP redistribution; transform
- Before: effects: [buff_stat, dmg_weapon, dmg_weapon], targeting: tgt_self
- After: effects: [transform_state, buff_stat, summon_unit], targeting: tgt_self
- Remaining gap: Shared HP pool and HP redistribution on expiry are custom

---

## Remaining Gaps (Future Work)

### 1. Custom Resource Systems

**Affected skills**: Ki Bolt, Focus, Ki Blast, Inner Flame, Ki Explosion (ki cost/generation), Inner Supernova (ki depletion), Transcendent Ki (free-cast from ki); Tuning Strike, Shatter Point, Crystal Freq, Sonic Boom (Resonance stacking); Opening Step, Flowing Cut, Crescendo Strike (Rhythm/combo points); Jab, Cross, Rising Uppercut, Body Blow, Hundred Fists, Dragon's Fist, Perfect Form, Thousand Strike Technique (Monk combo points); Hemorrhagic Burst, Curse Explosion, Phantom Strike, Spectral Surge, Haunted Volley (stack-to-damage scaling)

**System needed**: A generic resource/stack framework that allows abilities to generate, consume, and scale off custom per-character resources (Ki, Resonance, Rhythm, Combo Points, Soul Essence, etc.). Would include: resource pool definition per class, generation rules, consumption rules, and scaling formulas.

### 2. HP Self-Cost Mechanics

**Affected skills**: Wound Pride, Berserker's Bargain, Crimson Surge, Martyr's Blade, Hemorrhagic Frenzy (Blood Fury); Sanguine Transfusion, Mass Transfusion, The Final Offering, Sanguine Dominion (Blood Alchemist Sacrifice/Transfusion broadly)

**System needed**: An HP-cost parameter on abilities that deducts caster HP as part of activation. Distinct from "damage to self" -- this is a deliberate resource trade. Would need: cost amount (flat or percentage), timing (before or after effect), and interaction with death/KO thresholds.

### 3. Cooldown Manipulation

**Affected skills**: Void Frequency (cooldown freeze on enemy), Rampage (cooldown reset for specific abilities), Exsanguinate (cooldown reset), Heal Companion (pet cooldown reduction), Prepared Ground (cooldown refund)

**System needed**: A cooldown modification system that can freeze, reset, reduce, or refund cooldowns on specific abilities or ability categories. Would need: target specification (self/enemy/ally), scope (specific ability vs category vs all), and modification type (reset/reduce/freeze).

### 4. Action Duplication / Echo

**Affected skills**: Infinite Loop (every action repeated for free), Echo Cast (copy last ally ability), Deja Vu (forced action repetition on enemy), Grandfather (action erasure/undo)

**System needed**: An action-replay system that records the last action taken and can duplicate, replay, or erase it. Would need: action recording, replay targeting (self/ally/enemy), replay fidelity (full copy vs reduced), and timing rules.

### 5. State Rewind / Snapshot

**Affected skills**: Closed Timelike (full battlefield state rewind), Rewind (personal position + HP snapshot restoration)

**System needed**: A state-snapshot system that records entity positions, HP, and buff/debuff states at a point in time, then restores them later. Would need: snapshot scope (single entity vs battlefield), snapshot contents (position, HP, buffs, cooldowns), and restoration rules.

### 6. Corpse Interaction / Part Harvesting

**Affected skills**: Harvest Limb, Mass Harvest (corpse resource gathering); Specialist Graft, Head Transplant, Optimal Configuration (part consumption / construct modification)

**System needed**: A corpse/part inventory system where killing enemies generates harvestable parts, which are stored and consumed by construction/modification abilities. Would need: part type taxonomy, harvest conditions, storage limits, and consumption recipes.

### 7. Combo Chain Sequencing

**Affected skills**: Flowing Cut, Blade Waltz (auto-combo-chaining); Jab -> Cross -> Rising Uppercut (Monk combo sequences); Dervish Protocol (movement-triggered AoE)

**System needed**: A combo-chain framework where using specific abilities in sequence unlocks enhanced versions or bonus effects. Would need: chain definitions (A -> B -> C), timing windows, bonus effects per chain step, and chain-break rules.

### 8. Pet Command / Positioning

**Affected skills**: Bond Strike, Flanking Fang, Arrow + Claw, Alpha Call, Primal Pact, Wild Volley (Beastmaster pet system); Scout Hawk (scouting behavior)

**System needed**: A pet AI and command system where players can issue orders to companion entities (attack target, move to position, use ability, return). Would need: pet entity management, command queue, autonomous behavior rules, and shared stat scaling.

### 9. Kill / Death Conditional Triggers

**Affected skills**: Soul Drink, Soul Snare (kill-conditional resource generation); Cordyceps (on-death minion creation); The Infinite Hunger (kill-conditional healing); Crimson God (on-kill AoE nova); The Living Avalanche (on-kill explosion); The Spreading (instakill + infection spread)

**System needed**: An event-trigger system that fires effects when specific combat events occur (kill, death, damage threshold, buff expiry). Would need: trigger event types, condition checks, triggered effect payloads, and scope rules.

### 10. Dual Targeting (Allies + Enemies from Same Ability)

**Affected skills**: War God's Roar (fear enemies + buff allies), Apex Predator (debuff enemies + buff allies), Total Silence (silence enemies + stealth allies), Symphony of Destruction (damage enemies + buff allies), Gaia's Embrace (heal allies + slow enemies), World Tree (self + ally DR aura)

**System needed**: A split-targeting system where a single ability applies different effects to allies and enemies simultaneously. Would need: per-effect target group assignment (ally effects vs enemy effects), separate targeting resolution, and combined animation/feedback.

### 11. Toggle / Stance Mechanics

**Affected skills**: Sanguine Pact (toggle on/off), Root Stance (stance with movement penalty), Iron Stance, Water Stance (stance modes), Counterpoint, Symphony of War (aura cycling)

**System needed**: A stance/toggle framework where abilities switch between persistent modes rather than having a one-shot effect. Would need: state machine per character, active stance tracking, on-enter/on-exit effects, and mutual exclusion rules.

### 12. Conditional / Scaling Formulas

**Affected skills**: Shatter Point (stack-consumption damage scaling), Crescendo Strike (Rhythm-to-damage formula), Hemorrhagic Burst (blood stack scaling), Splash damage on Titan Charge (reduced rate to nearby), Shockwave (escalating damage per target hit), Focused Beam (escalating damage over channel)

**System needed**: A formula/modifier system that allows effect power to scale based on runtime variables (stack count, HP percentage, distance, target count, channel duration). Would need: variable binding, scaling curves, and cap/floor rules.

### 13. Debuff Cleanse / Dispel

**Affected skills**: Clot Seal (cleanse portion), various implied cleanse needs

**System needed**: A cleanse/dispel effect type that removes specific debuff categories from allies or buff categories from enemies. Would need: target (ally/enemy), scope (specific debuff type vs category vs all), and count limits.

### 14. Equipment / Slot Modification

**Affected skills**: Auxiliary Limb (equipment slot expansion), Soul Forge (equipment crafting from souls)

**System needed**: A runtime equipment modification system that can add equipment slots or create new equipment during combat. This is a meta-system that modifies character build rules during play.

### 15. Tether / Leash Mechanics

**Affected skills**: Parasitic Vine (tether with distance break), Vital Lattice (damage-sharing link)

**System needed**: A tether/link system that creates persistent connections between entities with distance-based maintenance and shared-resource rules. Would need: link creation, distance tracking, break conditions, and shared-effect channeling.

### 16. Terrain / Environmental Interaction

**Affected skills**: The Living Avalanche (terrain destruction), Spirit Bomb (environmental ki gathering), various wall/barrier abilities (pathing modification)

**System needed**: A terrain modification system where abilities can create, destroy, or modify hex terrain types, affecting pathing, visibility, and environmental effects.

---

## Cross-Reference: New Type Usage Counts

| New Type | Batch 1 | Batch 2 | Batch 3 | Total |
|----------|---------|---------|---------|-------|
| `disp_teleport` | 4 | 0 | 0 | 4 |
| `disp_dash` | 2 | 0 | 5 | 7 |
| `disp_pull` | 0 | 1 | 1 | 2 |
| `cc_fear` | 1 | 0 | 6 | 7 |
| `cc_silence` | 5 | 0 | 2 | 7 |
| `cc_taunt` | 2 | 0 | 2 | 4 |
| `cc_charm` | 1 | 2 | 0 | 3 |
| `debuff_armor` | 3 | 1 | 4 | 8 |
| `debuff_healReduce` | 2 | 0 | 0 | 2 |
| `buff_stealth` | 4 | 0 | 0 | 4 |
| `buff_shield` | 0 | 2 | 0 | 2 |
| `heal_flat` | 3 | 4 | 1 | 8 |
| `heal_hot` | 4 | 1 | 0 | 5 |
| `lifesteal` | 1 | 3 | 0 | 4 |
| `dmg_reflect` | 2 | 1 | 1 | 4 |
| `summon_unit` | 6 | 8 | 2 | 16 |
| `zone_persist` | 9 | 2 | 2 | 13 |
| `trap_place` | 0 | 0 | 7 | 7 |
| `channel_dmg` | 3 | 0 | 3 | 6 |
| `transform_state` | 6 | 4 | 7 | 17 |
| `tgt_aoe_cone` | 2 | 1 | 2 | 5 |
| `tgt_aoe_line` | 4 | 1 | 2 | 7 |
| `tgt_aoe_radius2` | 6 | 2 | 6 | 14 |
| `tgt_aoe_radius3` | 7 | 4 | 4 | 15 |
| `tgt_all_allies` | 5 | 3 | 0 | 8 |
| `tgt_all_enemies` | 0 | 0 | 2 | 2 |
