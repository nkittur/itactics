# Skill Audit Report

Generated: 2026-03-01T15:45:26.759Z

## Summary

- Total abilities audited: 360
- **Mismatches: 0**
- **Match rate: 100.0%**
- LLM-mapped abilities: 230
- Type-hint fallback: 4
- Passive (skipped): 126

## Chronoweaver / Accelerant

All abilities match expectations.

## Chronoweaver / Entropy

All abilities match expectations.

## Chronoweaver / Paradox

All abilities match expectations.

## Ironbloom Warden / Thornwall

All abilities match expectations.

## Ironbloom Warden / Overgrowth

All abilities match expectations.

## Ironbloom Warden / Rot Herald

All abilities match expectations.

## Echo Dancer / Resonance

All abilities match expectations.

## Echo Dancer / Silence

All abilities match expectations.

## Echo Dancer / Cacophony

All abilities match expectations.

## Bladesinger / Sword Dance

All abilities match expectations.

## Bladesinger / Spell Weave

All abilities match expectations.

## Bladesinger / War Chant

All abilities match expectations.

## Necrosurgeon / Reanimator

All abilities match expectations.

## Necrosurgeon / Fleshcraft

All abilities match expectations.

## Necrosurgeon / Soul Harvest

All abilities match expectations.

## Blood Alchemist / Sacrifice

All abilities match expectations.

## Blood Alchemist / Hemomancy

All abilities match expectations.

## Blood Alchemist / Transfusion

All abilities match expectations.

## Hexblade / Hungering Blade

All abilities match expectations.

## Hexblade / Curse Mark

All abilities match expectations.

## Hexblade / Spectral Arsenal

All abilities match expectations.

## Berserker / Blood Fury

All abilities match expectations.

## Berserker / Warpath

All abilities match expectations.

## Berserker / Primal Howl

All abilities match expectations.

## Monk / Iron Fist

All abilities match expectations.

## Monk / Flowing Water

All abilities match expectations.

## Monk / Inner Fire

All abilities match expectations.

## Ranger / Dead Eye

All abilities match expectations.

## Ranger / Trapper

All abilities match expectations.

## Ranger / Beastmaster Archer

All abilities match expectations.

## All Abilities (compact)

| Class | Archetype | Ability | Doc Type | Generated Effects | Targeting | Source | Match |
|---|---|---|---|---|---|---|---|
| Chronoweaver | Accelerant | Quicken | Buff | buff_stat | tgt_self | llm | OK |
| Chronoweaver | Accelerant | Tempo Tap | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Accelerant | Blink Step | Movement | disp_teleport | tgt_self | llm | OK |
| Chronoweaver | Accelerant | Shared Haste | Buff | buff_stat | tgt_single_ally | llm | OK |
| Chronoweaver | Accelerant | Flicker Strike | Attack | disp_teleport, dmg_weapon | tgt_single_enemy | llm | OK |
| Chronoweaver | Accelerant | Time Slip | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Accelerant | Overclock | Buff | buff_stat, cc_stun | tgt_self | llm | OK |
| Chronoweaver | Accelerant | Cascade | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Accelerant | Blur | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Accelerant | Temporal Surge | Ultimate | buff_stat | tgt_all_allies | llm | OK |
| Chronoweaver | Accelerant | Afterimage | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Accelerant | Infinite Loop | Ultimate | transform_state | tgt_self | llm | OK |
| Chronoweaver | Entropy | Rust Touch | Attack | dmg_weapon, debuff_armor | tgt_single_enemy | llm | OK |
| Chronoweaver | Entropy | Wither Bolt | Attack | dmg_spell, dot_poison | tgt_single_enemy | llm | OK |
| Chronoweaver | Entropy | Sap Vitality | Debuff | debuff_healReduce | tgt_single_enemy | llm | OK |
| Chronoweaver | Entropy | Accelerate Rot | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Entropy | Frailty Aura | Aura |  | tgt_self | passive | OK |
| Chronoweaver | Entropy | Dust to Dust | Attack | dmg_execute, cc_daze | tgt_single_enemy | llm | OK |
| Chronoweaver | Entropy | Entropic Field | AoE | zone_persist | tgt_aoe_radius3 | llm | OK |
| Chronoweaver | Entropy | Age of Ruin | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Entropy | Crumble | Attack | debuff_armor | tgt_single_enemy | llm | OK |
| Chronoweaver | Entropy | Pandemic | Active | dot_poison | tgt_aoe_radius3 | llm | OK |
| Chronoweaver | Entropy | Temporal Rot | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Entropy | Heat Death | Ultimate | channel_dmg, dmg_execute | tgt_single_enemy | llm | OK |
| Chronoweaver | Paradox | Rewind | Heal | heal_flat, disp_teleport | tgt_self | llm | OK |
| Chronoweaver | Paradox | Deja Vu | Debuff | cc_stun | tgt_single_enemy | llm | OK |
| Chronoweaver | Paradox | Stutter | CC | cc_stun | tgt_single_enemy | llm | OK |
| Chronoweaver | Paradox | Split Timeline | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Paradox | Causal Loop | Debuff | dmg_reflect | tgt_single_enemy | llm | OK |
| Chronoweaver | Paradox | Echo Cast | Active | res_apRefund | tgt_self | llm | OK |
| Chronoweaver | Paradox | Schrodinger | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Paradox | Time Bomb | Attack | zone_persist, dmg_spell | tgt_aoe_radius2 | llm | OK |
| Chronoweaver | Paradox | Fork Reality | Active | summon_unit | tgt_self | llm | OK |
| Chronoweaver | Paradox | Grandfather | Active | debuff_stat | tgt_single_enemy | llm | OK |
| Chronoweaver | Paradox | Instability | Passive |  | tgt_self | passive | OK |
| Chronoweaver | Paradox | Closed Timelike | Ultimate | heal_flat, transform_state | tgt_self | llm | OK |
| Ironbloom Warden | Thornwall | Barkskin | Buff | buff_dmgReduce | tgt_self | llm | OK |
| Ironbloom Warden | Thornwall | Thorn Coat | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Root Stance | Stance | buff_dmgReduce, debuff_stat, cc_taunt | tgt_self | llm | OK |
| Ironbloom Warden | Thornwall | Ironwood | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Briar Lash | Reactive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Living Fortress | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Splinter Burst | Active | dmg_spell | tgt_aoe_adjacent | llm | OK |
| Ironbloom Warden | Thornwall | Petrified Bark | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Entangling Wall | Active | zone_persist, debuff_stat | tgt_aoe_line | llm | OK |
| Ironbloom Warden | Thornwall | Martyrwood | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | Thorn King | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Thornwall | World Tree | Ultimate | buff_dmgReduce, dmg_reflect, transform_state | tgt_self | llm | OK |
| Ironbloom Warden | Overgrowth | Rejuvenate | Heal | heal_hot | tgt_single_ally | llm | OK |
| Ironbloom Warden | Overgrowth | Photosynthesis | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Seedling | Summon | summon_unit, heal_hot | tgt_aoe_radius2 | llm | OK |
| Ironbloom Warden | Overgrowth | Deep Roots | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Overgrowth | Active | heal_pctDmg | tgt_aoe_adjacent | llm | OK |
| Ironbloom Warden | Overgrowth | Sap Blood | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Verdant Tide | Heal | heal_hot, dot_bleed | tgt_aoe_radius3 | llm | OK |
| Ironbloom Warden | Overgrowth | Regrowth | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Symbiosis | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Ancient Growth | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Overgrowth | Bloom Cascade | Active | heal_flat | tgt_all_allies | llm | OK |
| Ironbloom Warden | Overgrowth | Gaia's Embrace | Ultimate | heal_hot, debuff_stat, summon_unit, zone_persist | tgt_all_allies | llm | OK |
| Ironbloom Warden | Rot Herald | Spore Shot | Attack | dmg_weapon, dot_poison | tgt_single_enemy | llm | OK |
| Ironbloom Warden | Rot Herald | Fungal Growth | Summon | summon_unit, zone_persist | tgt_aoe_radius2 | llm | OK |
| Ironbloom Warden | Rot Herald | Toxic Skin | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Rot Herald | Mycelium Net | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Rot Herald | Virulent Strain | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Rot Herald | Decompose | Active | dmg_execute | tgt_single_enemy | llm | OK |
| Ironbloom Warden | Rot Herald | Plague Garden | Active | zone_persist, debuff_healReduce, summon_unit | tgt_aoe_radius2 | llm | OK |
| Ironbloom Warden | Rot Herald | Parasitic Vine | Attack | channel_dmg, lifesteal | tgt_single_enemy | llm | OK |
| Ironbloom Warden | Rot Herald | Necrotic Bloom | Passive |  | tgt_self | passive | OK |
| Ironbloom Warden | Rot Herald | Cordyceps | Debuff | debuff_stat, summon_unit | tgt_single_enemy | llm | OK |
| Ironbloom Warden | Rot Herald | Rot Aura | Aura |  | tgt_self | passive | OK |
| Ironbloom Warden | Rot Herald | The Spreading | Ultimate | dmg_execute, dot_poison | tgt_single_enemy | llm | OK |
| Echo Dancer | Resonance | Tuning Strike | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Echo Dancer | Resonance | Harmonic Blade | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Pitch Perfect | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Shatter Point | Attack | dmg_execute | tgt_single_enemy | llm | OK |
| Echo Dancer | Resonance | Sympathetic Vibe | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Overtone | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Crystal Freq | Active | debuff_vuln | tgt_single_enemy | llm | OK |
| Echo Dancer | Resonance | Feedback Loop | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Glass Cannon | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Sonic Boom | Active | dmg_spell | tgt_aoe_adjacent | llm | OK |
| Echo Dancer | Resonance | Perfect Pitch | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Resonance | Requiem | Ultimate | channel_dmg, dmg_execute | tgt_single_enemy | llm | OK |
| Echo Dancer | Silence | Muffle | Debuff | cc_silence | tgt_single_enemy | llm | OK |
| Echo Dancer | Silence | Sound Eater | Stealth | buff_stealth | tgt_self | llm | OK |
| Echo Dancer | Silence | Dampening Field | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Silence | Dead Air | Debuff | zone_persist, cc_silence | tgt_aoe_radius2 | llm | OK |
| Echo Dancer | Silence | Ambush | Attack | dmg_weapon, cc_stun | tgt_single_enemy | llm | OK |
| Echo Dancer | Silence | Whisper Step | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Silence | Anechoic | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Silence | Void Frequency | Debuff | cc_silence | tgt_single_enemy | llm | OK |
| Echo Dancer | Silence | Ghost Note | Active | buff_stealth, summon_unit, cc_taunt | tgt_self | llm | OK |
| Echo Dancer | Silence | Total Silence | Active | cc_silence, buff_stealth | tgt_aoe_radius3 | llm | OK |
| Echo Dancer | Silence | Erasure | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Silence | The Unheard | Ultimate | buff_stealth, transform_state | tgt_self | llm | OK |
| Echo Dancer | Cacophony | Screech | Attack | dmg_spell, debuff_stat | tgt_aoe_cone | llm | OK |
| Echo Dancer | Cacophony | Bass Drop | Attack | dmg_spell, disp_push | tgt_aoe_radius2 | llm | OK |
| Echo Dancer | Cacophony | Tinnitus | Debuff | debuff_stat | tgt_single_enemy | llm | OK |
| Echo Dancer | Cacophony | Wall of Sound | Active | zone_persist, cc_stun | tgt_aoe_line | llm | OK |
| Echo Dancer | Cacophony | Discordant Aura | Aura |  | tgt_self | passive | OK |
| Echo Dancer | Cacophony | Shockwave | Attack | dmg_spell | tgt_aoe_line | llm | OK |
| Echo Dancer | Cacophony | Noise Complaint | Active | debuff_stat, cc_charm | tgt_aoe_radius3 | llm | OK |
| Echo Dancer | Cacophony | Feedback Shriek | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Cacophony | Amp It Up | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Cacophony | Brown Note | Active | cc_fear, dot_burn | tgt_single_enemy | llm | OK |
| Echo Dancer | Cacophony | Sound & Fury | Passive |  | tgt_self | passive | OK |
| Echo Dancer | Cacophony | Symphony of | Ultimate | transform_state, dmg_weapon | tgt_aoe_adjacent | type-hint | OK |
| Bladesinger | Sword Dance | Opening Step | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Bladesinger | Sword Dance | Flowing Cut | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Bladesinger | Sword Dance | Pivot Slash | Attack | dmg_weapon | tgt_aoe_cone | llm | OK |
| Bladesinger | Sword Dance | Dancer's Cadence | Passive |  | tgt_self | passive | OK |
| Bladesinger | Sword Dance | Whirlwind Step | Movement | disp_dash, dmg_weapon | tgt_single_enemy | llm | OK |
| Bladesinger | Sword Dance | Rising Flourish | Attack | dmg_weapon, cc_stun | tgt_single_enemy | llm | OK |
| Bladesinger | Sword Dance | Crescendo Strike | Active | dmg_execute | tgt_single_enemy | llm | OK |
| Bladesinger | Sword Dance | Phantom Echo | Passive |  | tgt_self | passive | OK |
| Bladesinger | Sword Dance | Blade Waltz | Stance | buff_stat | tgt_self | llm | OK |
| Bladesinger | Sword Dance | Perfect Form | Passive |  | tgt_self | passive | OK |
| Bladesinger | Sword Dance | Dervish Protocol | Active | dmg_weapon, buff_stat | tgt_self | llm | OK |
| Bladesinger | Sword Dance | The Endless Dance | Transform | transform_state, dmg_multihit | tgt_self | llm | OK |
| Bladesinger | Spell Weave | Arcane Edge | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Bladesinger | Spell Weave | Spark Slash | Attack | dmg_weapon, dmg_spell | tgt_single_enemy | llm | OK |
| Bladesinger | Spell Weave | Interrupt Weave | Passive |  | tgt_self | passive | OK |
| Bladesinger | Spell Weave | Force Bolt Slash | Active | dmg_spell, disp_dash, dmg_weapon | tgt_single_enemy | llm | OK |
| Bladesinger | Spell Weave | Arcane Loop | Passive |  | tgt_self | passive | OK |
| Bladesinger | Spell Weave | Spell Parry | Reactive |  | tgt_self | passive | OK |
| Bladesinger | Spell Weave | Runic Barrage | Active | dmg_multihit | tgt_single_enemy | llm | OK |
| Bladesinger | Spell Weave | Spellblade Mastery | Passive |  | tgt_self | passive | OK |
| Bladesinger | Spell Weave | Phase Cut | Attack | disp_teleport, dmg_weapon, debuff_armor | tgt_single_enemy | llm | OK |
| Bladesinger | Spell Weave | Resonance Overflow | Active | dmg_spell | tgt_aoe_line | llm | OK |
| Bladesinger | Spell Weave | Infinite Weave | Passive |  | tgt_self | passive | OK |
| Bladesinger | Spell Weave | Grand Synthesis | Active | dmg_weapon, dmg_spell | tgt_aoe_radius3 | llm | OK |
| Bladesinger | War Chant | Chant of Iron | Aura |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Verse of Swiftness | Aura |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Battle Refrain | Passive |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Chant of the Storm | Aura |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Counterpoint | Active | buff_stat | tgt_self | llm | OK |
| Bladesinger | War Chant | Warchanter's Vigor | Passive |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Chant of Ruin | Aura |  | tgt_self | passive | OK |
| Bladesinger | War Chant | Harmonic Chorus | Active | buff_stat | tgt_all_allies | llm | OK |
| Bladesinger | War Chant | Discordant Note | Active | cc_silence | tgt_single_enemy | llm | OK |
| Bladesinger | War Chant | Symphony of War | Active | buff_stat | tgt_self | llm | OK |
| Bladesinger | War Chant | Grand Crescendo | Passive |  | tgt_self | passive | OK |
| Bladesinger | War Chant | The Eternal War Song | Toggle | buff_stat, buff_dmgReduce, transform_state | tgt_all_allies | llm | OK |
| Necrosurgeon | Reanimator | Harvest Limb | Utility | buff_stat, res_apRefund | tgt_self | type-hint | OK |
| Necrosurgeon | Reanimator | Crude Assembly | Summon | summon_unit | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Field Suture | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Reanimator | Specialist Graft | Active | buff_stat, dot_bleed | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Head Transplant | Active | buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Redundant Systems | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Reanimator | Composite Horror | Summon | summon_unit | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Surgical Upgrade | Active | heal_flat, buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Part Catalog | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Reanimator | Optimal Configuration | Active | buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Reanimator | Mass Harvest | Active | dmg_weapon, dmg_spell | tgt_single_enemy | type-hint | OK |
| Necrosurgeon | Reanimator | Masterwork Abomination | Summon | summon_unit, dmg_multihit | tgt_self | llm | OK |
| Necrosurgeon | Fleshcraft | Bone Plating | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Necrotic Fist | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Dead Nerve Cluster | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Auxiliary Limb | Active | buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Fleshcraft | Venom Gland | Active | dot_poison | tgt_aoe_adjacent | llm | OK |
| Necrosurgeon | Fleshcraft | Muscle Splice | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Dead Man's Eyes | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Reflex Nerve Web | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Organ Reservoir | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | Full Conversion | Active | transform_state, buff_dmgReduce | tgt_self | llm | OK |
| Necrosurgeon | Fleshcraft | Adaptive Carapace | Reactive |  | tgt_self | passive | OK |
| Necrosurgeon | Fleshcraft | The Masterwork Self | Transform | transform_state, buff_dmgReduce, heal_hot | tgt_self | llm | OK |
| Necrosurgeon | Soul Harvest | Soul Snare | Utility | buff_stat, res_apRefund | tgt_self | type-hint | OK |
| Necrosurgeon | Soul Harvest | Essence Bolt | Attack | dmg_spell | tgt_single_enemy | llm | OK |
| Necrosurgeon | Soul Harvest | Spectral Shell | Buff | buff_shield | tgt_self | llm | OK |
| Necrosurgeon | Soul Harvest | Soul Tap | Active | dmg_spell | tgt_single_enemy | llm | OK |
| Necrosurgeon | Soul Harvest | Essence Infusion | Active | buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Soul Harvest | Resonant Collection | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Soul Harvest | Soul Detonation | Active | dmg_spell | tgt_aoe_radius3 | llm | OK |
| Necrosurgeon | Soul Harvest | Spectral Minion | Summon | summon_unit | tgt_self | llm | OK |
| Necrosurgeon | Soul Harvest | Essence Overload | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Soul Harvest | Grand Harvester | Passive |  | tgt_self | passive | OK |
| Necrosurgeon | Soul Harvest | Soul Forge | Active | buff_stat | tgt_self | llm | OK |
| Necrosurgeon | Soul Harvest | Soulstorm Engine | Channel | dmg_multihit, zone_persist | tgt_aoe_radius3 | llm | OK |
| Blood Alchemist | Sacrifice | Blood Price | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Sacrifice | Crimson Bolt | Attack | dmg_spell | tgt_single_enemy | llm | OK |
| Blood Alchemist | Sacrifice | Pain Threshold | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Sacrifice | Hemorrhage Wave | Active | dmg_spell, dot_bleed | tgt_aoe_cone | llm | OK |
| Blood Alchemist | Sacrifice | Vital Surge | Active | buff_stat | tgt_self | llm | OK |
| Blood Alchemist | Sacrifice | Defiant Ichor | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Sacrifice | Sanguine Pact | Toggle | buff_stat | tgt_self | llm | OK |
| Blood Alchemist | Sacrifice | Blood Nova | Active | dmg_spell | tgt_aoe_radius3 | llm | OK |
| Blood Alchemist | Sacrifice | Red Mist | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Sacrifice | Martyr's Conviction | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Sacrifice | Exsanguinate | Active | res_apRefund | tgt_self | llm | OK |
| Blood Alchemist | Sacrifice | The Final Offering | Active | dmg_spell, heal_pctDmg | tgt_aoe_radius3 | llm | OK |
| Blood Alchemist | Hemomancy | Clot | Debuff | debuff_stat, debuff_stat | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Hemorrhage | Debuff | dot_bleed | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Sanguine Sense | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Hemomancy | Blood Lock | CC | cc_root, debuff_vuln | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Puppet String | Active | disp_pull, dmg_spell | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Boil | Debuff | dot_burn, debuff_armor | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Full Puppet | CC | cc_charm | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Hemorrhagic Burst | Active | dmg_spell | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Blood Tether | Active | debuff_vuln | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Cascade Control | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Hemomancy | Vascular Override | Active | dot_bleed | tgt_single_enemy | llm | OK |
| Blood Alchemist | Hemomancy | Sanguine Dominion | Active | debuff_stat, debuff_stat, cc_charm | tgt_aoe_radius3 | llm | OK |
| Blood Alchemist | Transfusion | Life Draw | Heal | dmg_spell, heal_pctDmg | tgt_single_enemy | llm | OK |
| Blood Alchemist | Transfusion | Clot Seal | Heal | heal_flat | tgt_single_ally | llm | OK |
| Blood Alchemist | Transfusion | Blood Bond | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Transfusion | Sanguine Transfusion | Active | heal_flat | tgt_single_ally | llm | OK |
| Blood Alchemist | Transfusion | Hemorrhage Harvest | Active | heal_pctDmg | tgt_single_enemy | llm | OK |
| Blood Alchemist | Transfusion | Vital Lattice | Buff | buff_dmgReduce | tgt_all_allies | llm | OK |
| Blood Alchemist | Transfusion | Emergency Infusion | Reactive |  | tgt_self | passive | OK |
| Blood Alchemist | Transfusion | Soul Leak | Active | dmg_spell, heal_pctDmg | tgt_aoe_radius2 | llm | OK |
| Blood Alchemist | Transfusion | Vitae Overflow | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Transfusion | Mass Transfusion | Active | heal_flat | tgt_all_allies | llm | OK |
| Blood Alchemist | Transfusion | Blood Economy | Passive |  | tgt_self | passive | OK |
| Blood Alchemist | Transfusion | The Eternal Circuit | Channel | buff_dmgReduce, heal_pctDmg, dmg_reflect | tgt_all_allies | llm | OK |
| Hexblade | Hungering Blade | Hungry Strike | Attack | dmg_weapon, heal_pctDmg | tgt_single_enemy | llm | OK |
| Hexblade | Hungering Blade | Blood Feeding | Passive |  | tgt_self | passive | OK |
| Hexblade | Hungering Blade | Voracious | Passive |  | tgt_self | passive | OK |
| Hexblade | Hungering Blade | Drain Strike | Attack | dmg_weapon, heal_pctDmg | tgt_single_enemy | llm | OK |
| Hexblade | Hungering Blade | Blade Hunger | Active | buff_stat, lifesteal | tgt_self | llm | OK |
| Hexblade | Hungering Blade | Living Weapon | Passive |  | tgt_self | passive | OK |
| Hexblade | Hungering Blade | Soul Drink | Attack | dmg_weapon, heal_pctDmg | tgt_single_enemy | llm | OK |
| Hexblade | Hungering Blade | Overfed | Passive |  | tgt_self | passive | OK |
| Hexblade | Hungering Blade | Hunger Madness | Active | dmg_multihit, heal_pctDmg | tgt_aoe_adjacent | llm | OK |
| Hexblade | Hungering Blade | Feast Mode | Active | lifesteal | tgt_self | llm | OK |
| Hexblade | Hungering Blade | Satiated Power | Passive |  | tgt_self | passive | OK |
| Hexblade | Hungering Blade | The Infinite Hunger | Active | buff_stat, lifesteal, dmg_weapon, transform_state | tgt_self | llm | OK |
| Hexblade | Curse Mark | Hex: Weakness | Debuff | debuff_stat | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Hex: Slowmark | Debuff | debuff_stat | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Curse Reader | Passive |  | tgt_self | passive | OK |
| Hexblade | Curse Mark | Hex: Vulnerability | Debuff | debuff_vuln | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Hex: Misfortune | Debuff | debuff_stat | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Compound Curse | Passive |  | tgt_self | passive | OK |
| Hexblade | Curse Mark | Hex: Ruin | Debuff | debuff_stat, debuff_vuln | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Hex: Unraveling | Debuff | dot_poison | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Curse Explosion | Active | dmg_spell, cc_stun | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | Grand Hex | Active | dmg_spell, debuff_stat, debuff_vuln | tgt_single_enemy | llm | OK |
| Hexblade | Curse Mark | The Withering | Passive |  | tgt_self | passive | OK |
| Hexblade | Curse Mark | Absolute Curse | Active | debuff_stat, debuff_vuln, dot_poison, cc_daze | tgt_single_enemy | llm | OK |
| Hexblade | Spectral Arsenal | Spectral Blade | Summon | summon_unit | tgt_self | llm | OK |
| Hexblade | Spectral Arsenal | Phantom Strike | Active | dmg_multihit | tgt_single_enemy | llm | OK |
| Hexblade | Spectral Arsenal | Ethereal Steel | Passive |  | tgt_self | passive | OK |
| Hexblade | Spectral Arsenal | Arsenal Expansion | Summon | summon_unit | tgt_self | llm | OK |
| Hexblade | Spectral Arsenal | Shield Formation | Active | buff_shield | tgt_self | llm | OK |
| Hexblade | Spectral Arsenal | Spectral Surge | Active | dmg_multihit | tgt_single_enemy | llm | OK |
| Hexblade | Spectral Arsenal | Ghost Lance | Summon | dmg_spell, summon_unit | tgt_aoe_line | llm | OK |
| Hexblade | Spectral Arsenal | Haunted Volley | Active | dmg_multihit | tgt_aoe_adjacent | llm | OK |
| Hexblade | Spectral Arsenal | Spectral Bonding | Passive |  | tgt_self | passive | OK |
| Hexblade | Spectral Arsenal | Blade Tornado | Active | zone_persist, buff_dmgReduce | tgt_aoe_radius2 | llm | OK |
| Hexblade | Spectral Arsenal | Spectral Clone | Summon | summon_unit | tgt_single_enemy | llm | OK |
| Hexblade | Spectral Arsenal | The Ghost Armory | Active | summon_unit, dmg_spell, transform_state | tgt_aoe_radius3 | llm | OK |
| Berserker | Blood Fury | Bloodletting | Passive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Pain Conversion | Passive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Wound Pride | Attack | dot_bleed, buff_stat | tgt_self | llm | OK |
| Berserker | Blood Fury | Berserker's Bargain | Active | buff_stat | tgt_self | llm | OK |
| Berserker | Blood Fury | Crimson Surge | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Berserker | Blood Fury | Vital Hemorrhage | Passive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Last Breath Surge | Reactive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Martyr's Blade | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Berserker | Blood Fury | Hemorrhagic Frenzy | Toggle | dot_bleed, dmg_weapon | tgt_single_enemy | llm | OK |
| Berserker | Blood Fury | Death's Door Mastery | Passive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Undying Rage | Reactive |  | tgt_self | passive | OK |
| Berserker | Blood Fury | Crimson God | Transform | transform_state, dmg_weapon, buff_stat | tgt_self | llm | OK |
| Berserker | Warpath | Bull Rush | Movement | disp_dash, disp_push | tgt_single_enemy | llm | OK |
| Berserker | Warpath | Cleave | Attack | dmg_weapon | tgt_aoe_cone | llm | OK |
| Berserker | Warpath | Momentum | Passive |  | tgt_self | passive | OK |
| Berserker | Warpath | Titan Charge | Movement | disp_dash, dmg_weapon | tgt_single_enemy | llm | OK |
| Berserker | Warpath | Whirlwind | Attack | dmg_multihit | tgt_aoe_radius2 | llm | OK |
| Berserker | Warpath | Battering Ram | Passive |  | tgt_self | passive | OK |
| Berserker | Warpath | Warpath Stride | Stance | buff_stat, buff_dmgReduce | tgt_self | llm | OK |
| Berserker | Warpath | Chain Charge | Movement | disp_dash, dmg_multihit | tgt_single_enemy | llm | OK |
| Berserker | Warpath | Seismic Slam | Attack | dmg_weapon, cc_stun, disp_push | tgt_aoe_radius2 | llm | OK |
| Berserker | Warpath | Unstoppable Force | Passive |  | tgt_self | passive | OK |
| Berserker | Warpath | Rampage | Active | transform_state, res_apRefund | tgt_self | llm | OK |
| Berserker | Warpath | The Living Avalanche | Transform | transform_state, dmg_weapon, buff_stat | tgt_self | llm | OK |
| Berserker | Primal Howl | Battle Cry | Active | cc_fear, debuff_stat | tgt_aoe_radius2 | llm | OK |
| Berserker | Primal Howl | Primal Presence | Aura |  | tgt_self | passive | OK |
| Berserker | Primal Howl | Taunt | CC | cc_taunt, debuff_stat | tgt_single_enemy | llm | OK |
| Berserker | Primal Howl | Howl of Terror | Active | cc_fear, cc_stun, debuff_stat, dot_bleed | tgt_aoe_radius3 | llm | OK |
| Berserker | Primal Howl | Pack Breaker | Passive |  | tgt_self | passive | OK |
| Berserker | Primal Howl | Imposing Stature | Passive |  | tgt_self | passive | OK |
| Berserker | Primal Howl | Crushing Dominance | Debuff | debuff_stat, debuff_vuln, cc_silence | tgt_single_enemy | llm | OK |
| Berserker | Primal Howl | Mass Rout | Active | dmg_weapon, cc_fear, debuff_stat | tgt_aoe_radius2 | llm | OK |
| Berserker | Primal Howl | Berserker's Legend | Passive |  | tgt_self | passive | OK |
| Berserker | Primal Howl | Alpha Presence | Aura |  | tgt_self | passive | OK |
| Berserker | Primal Howl | War God's Roar | Active | cc_fear, buff_stat | tgt_all_enemies | llm | OK |
| Berserker | Primal Howl | Apex Predator | Transform | transform_state, debuff_stat, cc_silence, cc_fear | tgt_all_enemies | llm | OK |
| Monk | Iron Fist | Jab | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Cross | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Iron Stance | Stance | buff_stat, debuff_stat | tgt_self | llm | OK |
| Monk | Iron Fist | Rising Uppercut | Attack | dmg_weapon, cc_stun | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Body Blow | Attack | dmg_weapon, debuff_stat | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Combo Mastery | Passive |  | tgt_self | passive | OK |
| Monk | Iron Fist | Hundred Fists | Attack | dmg_multihit | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Armor Crack | Attack | dmg_weapon, debuff_armor | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Steel Body | Passive |  | tgt_self | passive | OK |
| Monk | Iron Fist | Dragon's Fist | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Monk | Iron Fist | Perfect Form | Buff | buff_stat | tgt_self | llm | OK |
| Monk | Iron Fist | Thousand Strike Technique | Active | dmg_multihit, dmg_weapon | tgt_aoe_adjacent | llm | OK |
| Monk | Flowing Water | Step Aside | Movement | buff_stat | tgt_self | llm | OK |
| Monk | Flowing Water | Redirect | Reactive |  | tgt_self | passive | OK |
| Monk | Flowing Water | Water Stance | Stance | buff_stat | tgt_self | llm | OK |
| Monk | Flowing Water | Flow Counter | Reactive |  | tgt_self | passive | OK |
| Monk | Flowing Water | Fluid Step | Movement | buff_stat | tgt_self | llm | OK |
| Monk | Flowing Water | Like Water | Passive |  | tgt_self | passive | OK |
| Monk | Flowing Water | Whirlpool Counter | Reactive |  | tgt_self | passive | OK |
| Monk | Flowing Water | Still Water | Active | buff_dmgReduce, stance_counter | tgt_self | llm | OK |
| Monk | Flowing Water | Current Strike | Attack | dmg_multihit | tgt_single_enemy | llm | OK |
| Monk | Flowing Water | River's Fury | Active | stance_counter, dmg_weapon | tgt_self | llm | OK |
| Monk | Flowing Water | Perfect Flow | Passive |  | tgt_self | passive | OK |
| Monk | Flowing Water | Ocean's Wrath | Active | transform_state, dmg_reflect, stance_counter | tgt_self | llm | OK |
| Monk | Inner Fire | Ki Bolt | Attack | dmg_spell | tgt_single_enemy | llm | OK |
| Monk | Inner Fire | Ki Aura | Aura |  | tgt_self | passive | OK |
| Monk | Inner Fire | Focus | Active | buff_stat | tgt_self | llm | OK |
| Monk | Inner Fire | Ki Blast | Attack | dmg_spell | tgt_single_enemy | llm | OK |
| Monk | Inner Fire | Inner Flame | Buff | buff_stat, dot_burn | tgt_self | llm | OK |
| Monk | Inner Fire | Wave of Force | Attack | dmg_spell, disp_push | tgt_aoe_line | llm | OK |
| Monk | Inner Fire | Ki Explosion | Active | dmg_spell | tgt_aoe_radius2 | llm | OK |
| Monk | Inner Fire | Focused Beam | Channel | channel_dmg | tgt_single_enemy | llm | OK |
| Monk | Inner Fire | Ki Resonance | Passive |  | tgt_self | passive | OK |
| Monk | Inner Fire | Spirit Bomb | Channel | channel_dmg | tgt_aoe_radius3 | llm | OK |
| Monk | Inner Fire | Inner Supernova | Active | dmg_spell, disp_push | tgt_aoe_radius3 | llm | OK |
| Monk | Inner Fire | Transcendent Ki | Transform | transform_state, dmg_spell, buff_stat | tgt_self | llm | OK |
| Ranger | Dead Eye | Steady Breath | Passive |  | tgt_self | passive | OK |
| Ranger | Dead Eye | Mark Target | Active | debuff_vuln | tgt_single_enemy | llm | OK |
| Ranger | Dead Eye | Flint Nock | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Ranger | Dead Eye | Scope In | Stance | buff_stat, debuff_stat | tgt_self | llm | OK |
| Ranger | Dead Eye | Vital Line | Passive |  | tgt_self | passive | OK |
| Ranger | Dead Eye | Tungsten Tip | Attack | dmg_weapon, debuff_armor | tgt_single_enemy | llm | OK |
| Ranger | Dead Eye | Headshot Protocol | Passive |  | tgt_self | passive | OK |
| Ranger | Dead Eye | Killzone | Utility | zone_persist | tgt_aoe_radius2 | llm | OK |
| Ranger | Dead Eye | Cold Calculation | Buff | buff_stat | tgt_self | llm | OK |
| Ranger | Dead Eye | Sniper's Patience | Channel | channel_dmg | tgt_aoe_line | llm | OK |
| Ranger | Dead Eye | Ghost Bullet | Attack | dmg_weapon | tgt_single_enemy | llm | OK |
| Ranger | Dead Eye | One Shot, One Soul | Active | dmg_weapon, dmg_execute | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Snare Trap | Utility | trap_place, cc_root | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Tripwire | Utility | trap_place, debuff_stat | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Bait Pile | Utility | trap_place, cc_taunt | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Spike Pit | Active | trap_place, debuff_stat, dot_bleed | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Cluster Mine | Utility | trap_place, dmg_multihit | tgt_aoe_adjacent | llm | OK |
| Ranger | Trapper | Marked Ground | Passive |  | tgt_self | passive | OK |
| Ranger | Trapper | Chain Reaction | Passive |  | tgt_self | passive | OK |
| Ranger | Trapper | Corrosive Net | CC | cc_root, debuff_armor | tgt_single_enemy | llm | OK |
| Ranger | Trapper | Prepared Ground | Buff | res_apRefund | tgt_self | llm | OK |
| Ranger | Trapper | Killbox Setup | Active | trap_place, dmg_weapon, cc_root | tgt_aoe_adjacent | llm | OK |
| Ranger | Trapper | Phantom Traps | Passive |  | tgt_self | passive | OK |
| Ranger | Trapper | The Long Game | Active | trap_place, zone_persist, cc_root | tgt_aoe_radius3 | llm | OK |
| Ranger | Beastmaster Archer | Bond Strike | Attack | dmg_weapon, dmg_weapon | tgt_single_enemy | llm | OK |
| Ranger | Beastmaster Archer | Scout Hawk | Summon | summon_unit | tgt_aoe_cone | llm | OK |
| Ranger | Beastmaster Archer | Pack Instinct | Passive |  | tgt_self | passive | OK |
| Ranger | Beastmaster Archer | Flanking Fang | Active | debuff_vuln, dmg_weapon | tgt_single_enemy | llm | OK |
| Ranger | Beastmaster Archer | Shared Senses | Passive |  | tgt_self | passive | OK |
| Ranger | Beastmaster Archer | Heal Companion | Heal | heal_flat, dot_bleed | tgt_single_ally | llm | OK |
| Ranger | Beastmaster Archer | Arrow + Claw | Active | dmg_weapon, debuff_vuln | tgt_single_enemy | llm | OK |
| Ranger | Beastmaster Archer | Alpha Call | Buff | buff_stat | tgt_single_ally | llm | OK |
| Ranger | Beastmaster Archer | Scatter Drive | Active | dmg_weapon, debuff_stat, disp_pull | tgt_aoe_adjacent | llm | OK |
| Ranger | Beastmaster Archer | Primal Pact | Toggle | buff_stat | tgt_self | llm | OK |
| Ranger | Beastmaster Archer | Wild Volley | Channel | dmg_multihit, cc_root | tgt_single_enemy | llm | OK |
| Ranger | Beastmaster Archer | Hunt as One | Transform | transform_state, buff_stat, summon_unit | tgt_self | llm | OK |
