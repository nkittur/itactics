# LLM Effect Mapping - Batch 2

Classes: Blood Alchemist, Hexblade, Necrosurgeon

---

## Blood Alchemist

### Archetype: Sacrifice

---

### Blood Alchemist / Sacrifice / Crimson Bolt (Attack)
Description: "Spend 5% max HP to fire a blood-fueled projectile dealing 180% of HP spent as magic damage."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [HP self-cost mechanic not representable]
- reasoning: "A ranged magic damage projectile. The HP cost is a resource mechanic outside the effect system; the core output is spell damage against a single target."

---

### Blood Alchemist / Sacrifice / Hemorrhage Wave (Active)
Description: "Spend 10% max HP to release a blood wave in a 3 hexes cone dealing damage and applying Bleed."

Mapping:
- effects: [dmg_spell, dot_bleed]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["bleed"], exploits: [] }
- paramOverrides: {}
- gaps: [HP self-cost mechanic; cone targeting (system only has adjacent AoE)]
- reasoning: "AoE damage plus bleed application. Cone is approximated by tgt_aoe_adjacent. Spell damage for the initial hit, plus bleed DoT."

---

### Blood Alchemist / Sacrifice / Vital Surge (Active)
Description: "Spend 20% max HP to instantly cast your next ability at double power with no cast time."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: { buff_stat: { stat: "critChance" } }
- gaps: [HP self-cost; "double power next ability" is a next-cast amplifier not directly representable; no cast time reduction effect]
- reasoning: "The closest mechanical analog is a self-buff. Using critChance as the stat proxy since it amplifies next damage output. The 'double power' modifier and cast time removal are unique mechanics with no direct mapping."

---

### Blood Alchemist / Sacrifice / Sanguine Pact (Toggle)
Description: "Toggle on to continuously lose 2% HP/s in exchange for +30% damage and +20% cast rate."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: [Toggle mechanic; continuous HP drain; cast rate increase not mappable; broad damage boost wider than single stat]
- reasoning: "A self-buff that increases damage output at an HP cost. meleeSkill is the closest stat proxy for general damage increase. The toggle and HP drain mechanics are outside the effect system."

---

### Blood Alchemist / Sacrifice / Blood Nova (Active)
Description: "Spend 30% max HP to detonate a 4 hexes blood nova dealing massive AoE damage equal to HP spent."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [HP self-cost; large radius AoE (4 hexes vs adjacent); damage scales with HP spent]
- reasoning: "Massive AoE spell damage. The radius exceeds 'adjacent' but tgt_aoe_adjacent is the closest AoE option. HP cost and HP-scaling damage are resource mechanics."

---

### Blood Alchemist / Sacrifice / Exsanguinate (Active)
Description: "Spend 40% max HP; reduce all active cooldowns to 0 instantly."

Mapping:
- effects: [res_apRefund]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [HP self-cost; cooldown reset is not the same as AP refund; no direct cooldown manipulation effect]
- reasoning: "Cooldown reset enables using abilities again immediately. res_apRefund is the closest analog -- both give you more actions. The HP cost is a resource mechanic outside the system."

---

### Blood Alchemist / Sacrifice / The Final Offering (Active)
Description: "Sacrifice yourself to 1 HP; in exchange, unleash a catastrophic Blood Cataclysm in a 6 hexes radius dealing damage equal to 500% of total HP sacrificed across the fight, then instantly restore to 50% max HP if the cast kills at least one enemy."

Mapping:
- effects: [dmg_spell, heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [HP self-cost to 1; damage scales with cumulative fight HP sacrificed; conditional heal on kill; massive 6-hex radius exceeds adjacent]
- reasoning: "Ultimate AoE nuke with conditional self-heal. dmg_spell covers the cataclysm, heal_pctDmg approximates the kill-conditional HP restore. The scaling with total fight sacrifice and the kill condition are unique mechanics."

---

### Archetype: Hemomancy

---

### Blood Alchemist / Hemomancy / Clot (Debuff)
Description: "Thicken a target's blood; reduce their movement by 30% and attack rate by 15% for 3 turns."

Mapping:
- effects: [debuff_stat, debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["clot"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: [Attack rate reduction has no direct stat; would need two separate debuff_stat entries with different stats]
- reasoning: "Movement reduction maps to debuff_stat on movementPoints. Attack rate reduction is approximated by a second debuff_stat (closest would be initiative or meleeSkill). Two debuff_stat effects needed."

---

### Blood Alchemist / Hemomancy / Hemorrhage (Debuff)
Description: "Induce internal bleeding; apply a Bleed DoT dealing 3% max HP per turn for 2 turns."

Mapping:
- effects: [dot_bleed]
- targeting: tgt_single_enemy
- conditions: { creates: ["bleed"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Clean 1:1 mapping. A bleed DoT applied to a single enemy. Straightforward dot_bleed effect."

---

### Blood Alchemist / Hemomancy / Blood Lock (CC)
Description: "Crystallize a target's blood; root them in place for 2 turns and increase their damage taken by 20%."

Mapping:
- effects: [cc_root, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["root", "vulnerable"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Root maps perfectly to cc_root, and increased damage taken maps perfectly to debuff_vuln. Clean mapping."

---

### Blood Alchemist / Hemomancy / Puppet String (Active)
Description: "Force a target to move 2 hexes in a direction of your choosing; they deal collision damage if hitting terrain."

Mapping:
- effects: [disp_push, dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Directional control of push; collision damage conditional on terrain]
- reasoning: "Forced movement maps to disp_push. The collision damage is a secondary effect approximated by dmg_spell. The directional choice aspect is a targeting nuance outside the effect system."

---

### Blood Alchemist / Hemomancy / Boil (Debuff)
Description: "Rapidly heat a target's blood; they take 5% max HP as fire damage per turn and lose 10% armor for 3 turns."

Mapping:
- effects: [dot_burn, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["burn", "vulnerable"], exploits: [] }
- paramOverrides: {}
- gaps: [Armor reduction specifically; debuff_vuln is a general "take more damage" proxy]
- reasoning: "Fire damage over time maps to dot_burn. Armor reduction increases effective damage taken, which maps to debuff_vuln as a close approximation."

---

### Blood Alchemist / Hemomancy / Full Puppet (CC)
Description: "Assume full control of a non-boss enemy for 2 turns; use them as a player-controlled pawn."

Mapping:
- effects: [cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["controlled"], exploits: [] }
- paramOverrides: {}
- gaps: [Mind control / charm mechanic -- enemy becomes player-controlled; cc_stun is a fallback that removes the enemy from acting on their own]
- reasoning: "No direct mind-control effect exists. cc_stun is the closest fallback since it removes the target from enemy control. The player-control aspect is a major gap -- the target should fight for you, not just be disabled."

---

### Blood Alchemist / Hemomancy / Hemorrhagic Burst (Active)
Description: "Detonate all active Bleed effects on a target simultaneously for a massive burst of damage."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["bleed"] }
- paramOverrides: {}
- gaps: [Consuming/detonating existing DoTs as a mechanic; damage scaling with number of bleed stacks]
- reasoning: "A burst damage ability that exploits existing bleed conditions. dmg_spell for the burst. The 'consumes bleeds for damage' interaction is noted in exploits but the consumption mechanic is a gap."

---

### Blood Alchemist / Hemomancy / Blood Tether (Active)
Description: "Link two enemies; any damage one receives is split 50/50 with the tethered partner for 3 turns."

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["tethered"], exploits: [] }
- paramOverrides: {}
- gaps: [Damage-sharing link between two targets; multi-target linking mechanic; targeting requires selecting two enemies]
- reasoning: "The closest effect is debuff_vuln -- the tether effectively makes damage more efficient since hitting one damages both. The two-target linking mechanic has no direct representation. Single target is a fallback."

---

### Blood Alchemist / Hemomancy / Vascular Override (Active)
Description: "Permanently afflict a target with a passive Bleed that stacks once every time they attack; stacks indefinitely."

Mapping:
- effects: [dot_bleed]
- targeting: tgt_single_enemy
- conditions: { creates: ["bleed"], exploits: [] }
- paramOverrides: {}
- gaps: [Permanent duration; stacking on enemy attack triggers; indefinite scaling]
- reasoning: "Core effect is applying a bleed. dot_bleed captures the fundamental mechanic. The auto-stacking-on-attack and permanent/indefinite aspects are unique escalation mechanics not representable."

---

### Blood Alchemist / Hemomancy / Sanguine Dominion (Active)
Description: "for 5 turns, assume passive hemomantic control over all bleeding enemies in a 6 hexes radius--they deal 50% reduced damage, move at 60% speed, and once per 2 turns you may force any one of them to attack a nearby ally of their own accord; cannot be cleansed."

Mapping:
- effects: [debuff_stat, debuff_stat, cc_daze]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["controlled"], exploits: ["bleed"] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: [Massive radius AoE (6 hexes); only affects bleeding enemies (conditional AoE); forced friendly-fire mechanic; uncleansable; damage reduction is broader than single stat; two different debuff_stat targets needed]
- reasoning: "Ultimate CC/debuff ability. Damage reduction maps to debuff_stat, movement reduction to another debuff_stat on movementPoints, and the forced-attack/turn-disruption aspect to cc_daze. Exploits bleed as a prerequisite. The full puppet and uncleansable aspects are gaps."

---

### Archetype: Transfusion

---

### Blood Alchemist / Transfusion / Life Draw (Heal)
Description: "Drain 8% HP from a target and transfer it to yourself or a chosen ally."

Mapping:
- effects: [dmg_spell, heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Heal can target self or a different ally; dual-target mechanic (damage enemy, heal ally)]
- reasoning: "Drain = damage + heal. dmg_spell for the HP removal from the enemy, heal_pctDmg for the health transfer. The choice of heal recipient (self vs ally) is a targeting nuance."

---

### Blood Alchemist / Transfusion / Clot Seal (Heal)
Description: "Seal a wound instantly; stop all Bleed effects on an ally and restore 5% of their max HP."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_single_ally
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Debuff removal / cleanse mechanic (removing bleed); heal is flat % not based on damage dealt]
- reasoning: "Primary function is healing an ally. heal_pctDmg is the closest heal effect. The bleed-cleanse aspect has no direct mapping -- there is no 'cleanse debuff' effect type."

---

### Blood Alchemist / Transfusion / Sanguine Transfusion (Active)
Description: "Transfer up to 25% of your own HP to a target ally as healing; no cooldown but shares your HP pool."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_single_ally
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Self-HP cost for healing; no cooldown mechanic; heal scales with caster HP not damage dealt]
- reasoning: "Core output is healing an ally. heal_pctDmg captures the heal. The self-HP-transfer mechanic is a resource cost outside the effect system."

---

### Blood Alchemist / Transfusion / Hemorrhage Harvest (Active)
Description: "Draw from an enemy's Bleed; convert their DoT damage into healing for you or an ally."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["bleed"] }
- paramOverrides: {}
- gaps: [Consuming enemy DoT to generate healing; heal target can be self or ally; DoT-to-heal conversion]
- reasoning: "Exploits existing bleed on an enemy to generate healing. heal_pctDmg captures the healing output. The bleed-consumption mechanic is a condition interaction noted in exploits."

---

### Blood Alchemist / Transfusion / Vital Lattice (Buff)
Description: "Create a blood web connecting 3 allies; whenever one takes damage, it's shared equally among all three for 4 turns."

Mapping:
- effects: [buff_dmgReduce]
- targeting: tgt_single_ally
- conditions: { creates: ["lattice"], exploits: [] }
- paramOverrides: {}
- gaps: [Multi-target linking mechanic; damage redistribution between linked allies; 3-ally targeting]
- reasoning: "Damage sharing effectively reduces the damage any one ally takes, mapping to buff_dmgReduce as the closest analog. The multi-target link is a major gap -- system only supports single ally targeting."

---

### Blood Alchemist / Transfusion / Soul Leak (Active)
Description: "Drain 15% HP from all enemies in a 3 hexes radius; evenly distribute the total among all allies."

Mapping:
- effects: [dmg_spell, heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Dual-function AoE damage + party-wide heal distribution; heal targets all allies not just caster]
- reasoning: "AoE damage to enemies with healing output. dmg_spell for the drain damage, heal_pctDmg for the life distribution. The party-wide heal split is a gap since healing typically targets one entity."

---

### Blood Alchemist / Transfusion / Mass Transfusion (Active)
Description: "Simultaneously apply Sanguine Transfusion to all allies in a 4 hexes radius; each receives 10% of your HP as healing."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [AoE ally heal (system AoE is enemy-focused); self-HP cost; heal scales with caster HP]
- reasoning: "AoE healing to allies. heal_pctDmg with tgt_aoe_adjacent as a proxy for multi-ally targeting. The system's AoE is typically enemy-targeted, so ally AoE healing is a gap."

---

### Blood Alchemist / Transfusion / The Eternal Circuit (Channel)
Description: "Channel for 1 turn to create a 6 turns blood circuit linking all allies: damage dealt to any member is redistributed evenly among all; healing any one member heals all by 50% of the amount; and any Bleed effect applied to you is reflected in full to the enemy who applied it."

Mapping:
- effects: [buff_dmgReduce, heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["circuit"], exploits: [] }
- paramOverrides: {}
- gaps: [Channel/cast time mechanic; party-wide link; damage redistribution; heal sharing; bleed reflect; massive radius (6 hexes); ally-targeted AoE]
- reasoning: "Ultimate support ability combining damage reduction (via redistribution), healing amplification, and bleed reflection. buff_dmgReduce covers the damage sharing, heal_pctDmg covers the heal sharing. Bleed reflection has no mapping. Channel mechanic is outside the effect system."

---

## Hexblade

### Archetype: Hungering Blade

---

### Hexblade / Hungering Blade / Hungry Strike (Attack)
Description: "Strike with the hungering blade; deals weapon damage and heals you for 8% of damage dealt (lifesteal)"

Mapping:
- effects: [dmg_weapon, heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Clean mapping. Weapon damage attack with lifesteal. dmg_weapon for the strike, heal_pctDmg for the percentage-of-damage healing."

---

### Hexblade / Hungering Blade / Drain Strike (Attack)
Description: "Perform a deep, draining slash; deals heavy damage and heals for 20% of damage dealt -- higher lifesteal but slower attack"

Mapping:
- effects: [dmg_weapon, heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Slower attack speed tradeoff not representable]
- reasoning: "Same core pattern as Hungry Strike but with higher multipliers. dmg_weapon for heavy damage, heal_pctDmg for the 20% lifesteal. The speed penalty is a tuning parameter."

---

### Hexblade / Hungering Blade / Blade Hunger (Active)
Description: "Activate the blade's feeding frenzy for 2 turns; all lifesteal is doubled and each strike heals for a bonus equal to 2% of target's max HP regardless of damage dealt"

Mapping:
- effects: [buff_stat, heal_pctDmg]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Lifesteal doubling modifier; bonus healing based on target max HP; duration-based activation]
- reasoning: "Self-buff that amplifies lifesteal. buff_stat as a general power-up, heal_pctDmg for the enhanced healing. The specific lifesteal-doubling and target-max-HP-based heal are tuning details."

---

### Hexblade / Hungering Blade / Soul Drink (Attack)
Description: "On kill, perform a soul drain -- restore 15% of your max HP instantly from the departing soul; can only trigger on the killing blow"

Mapping:
- effects: [dmg_weapon, heal_pctDmg]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Kill-conditional heal trigger; heal is % of own max HP not % of damage dealt]
- reasoning: "An attack that heals on kill. dmg_weapon for the strike, heal_pctDmg for the HP restore. The kill-conditional aspect means the heal only fires if the target dies, which is a conditional not directly captured."

---

### Hexblade / Hungering Blade / Hunger Madness (Active)
Description: "Temporarily lose control of the blade -- for 2 turns it attacks automatically at triple speed but hits the nearest target (friend or foe); lifesteal is quadrupled during madness"

Mapping:
- effects: [dmg_multihit, heal_pctDmg]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [Uncontrollable targeting (friend or foe); auto-attack mechanic; triple speed; quadrupled lifesteal]
- reasoning: "Rapid multi-hit attacks map to dmg_multihit. The friendly-fire and auto-targeting aspects are unique. tgt_aoe_adjacent approximates hitting nearby targets. heal_pctDmg covers the amplified lifesteal."

---

### Hexblade / Hungering Blade / Feast Mode (Active)
Description: "The blade demands a feast; for 3 turns all damage you deal is converted to 100% lifesteal (you heal instead of dealing direct damage -- but the healing is enormous and the targets still take damage); 10 turns cooldown"

Mapping:
- effects: [buff_stat, heal_pctDmg]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: [100% lifesteal conversion mechanic; long cooldown (10 turns); duration-based self-buff]
- reasoning: "Self-buff that converts all damage to lifesteal. buff_stat for the mode activation, heal_pctDmg for the massive healing. The 100% conversion is a tuning extreme of heal_pctDmg."

---

### Hexblade / Hungering Blade / The Infinite Hunger (Active)
Description: "Surrender fully to the blade's hunger for 4 turns -- the blade enters an absolute feeding state: all lifesteal is at 100% efficiency, Blood Feeding stacks gain at 3x speed, all kills restore 25% max HP, and the blade extends your melee range to 2 hexes as it reaches outward for more sustenance; when the state ends, the blade's permanent bonus is locked in at its current value"

Mapping:
- effects: [buff_stat, heal_pctDmg, dmg_weapon]
- targeting: tgt_self
- conditions: { creates: [], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: [100% lifesteal; accelerated stacking mechanic; extended melee range; kill-conditional healing; permanent bonus lock-in]
- reasoning: "Ultimate self-buff combining enhanced lifesteal, accelerated growth, kill healing, and range extension. buff_stat for the power increase, heal_pctDmg for the lifesteal, dmg_weapon for the enhanced attacks. Many sub-mechanics are unique to this ability."

---

### Archetype: Curse Mark

---

### Hexblade / Curse Mark / Hex: Weakness (Debuff)
Description: "Brand a Weakness hex on target; reduce their physical damage output by 15% for 3 turns"

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_weakness"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: [Physical damage output reduction is broader than a single stat; affects all physical damage not just accuracy]
- reasoning: "Reducing physical damage output maps to debuff_stat on meleeSkill as the closest proxy. The hex condition is tracked for combo interactions with other Curse Mark abilities."

---

### Hexblade / Curse Mark / Hex: Slowmark (Debuff)
Description: "Brand a Slowmark hex on target; reduce their movement by 30% for 3 turns"

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_slowmark"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: []
- reasoning: "Clean mapping. Movement reduction maps directly to debuff_stat on movementPoints."

---

### Hexblade / Curse Mark / Hex: Vulnerability (Debuff)
Description: "Brand a Vulnerability hex; target takes 20% more damage from all sources for 3 turns"

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_vulnerability"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Perfect mapping. 'Takes more damage from all sources' is exactly what debuff_vuln represents."

---

### Hexblade / Curse Mark / Hex: Misfortune (Debuff)
Description: "Brand a Misfortune hex; target has 25% chance for any ability they use to have a random negative side effect (miss, deal less damage, affect themselves)"

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_misfortune"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: [Random negative side effects; chance-based ability disruption; self-targeting backfire; affects all ability types]
- reasoning: "The misfortune effect causes missed and weakened attacks. debuff_stat on meleeSkill approximates the 'miss more, deal less damage' aspect. The random side effects and self-targeting backfire are unique mechanics."

---

### Hexblade / Curse Mark / Hex: Ruin (Debuff)
Description: "Brand a Ruin hex; reduce all of target's stats by 15% for 3 turns (comprehensive debilitation)"

Mapping:
- effects: [debuff_stat, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_ruin"], exploits: [] }
- paramOverrides: {}
- gaps: [All-stat reduction requires multiple debuff_stat entries or a global debuff; comprehensive stat reduction not representable as a single stat]
- reasoning: "Reducing all stats is approximated by debuff_stat (for offensive/defensive stats) combined with debuff_vuln (for the effective reduction in survivability). A comprehensive all-stat debuff is broader than the system supports in one effect."

---

### Hexblade / Curse Mark / Hex: Unraveling (Debuff)
Description: "Brand an Unraveling hex; the target's max HP decreases by 2% per turn for 2 turns as the curse degrades their vitality ceiling"

Mapping:
- effects: [dot_poison]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_unraveling"], exploits: [] }
- paramOverrides: {}
- gaps: [Max HP reduction mechanic; vitality ceiling degradation distinct from direct damage]
- reasoning: "dot_poison is the closest match since poison deals DoT and reduces stats. The max HP reduction is conceptually similar to poison's stat-degrading nature. Direct max HP manipulation is a gap."

---

### Hexblade / Curse Mark / Curse Explosion (Active)
Description: "Consume all hexes on a target simultaneously; deal burst damage equal to 20 per hex consumed and stun for 1 turn per hex consumed"

Mapping:
- effects: [dmg_spell, cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["hex_weakness", "hex_slowmark", "hex_vulnerability", "hex_misfortune", "hex_ruin", "hex_unraveling"] }
- paramOverrides: {}
- gaps: [Damage and stun duration scale with number of hexes consumed; hex consumption mechanic]
- reasoning: "Burst damage plus stun, both scaling with consumed hexes. dmg_spell for the burst, cc_stun for the disable. This is the payoff ability that exploits all hex conditions simultaneously."

---

### Hexblade / Curse Mark / Grand Hex (Active)
Description: "Apply 3 hexes of your choice simultaneously as a single action; the combined curse deals immediate damage equal to 10 per hex applied"

Mapping:
- effects: [dmg_spell, debuff_stat, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_weakness", "hex_slowmark", "hex_vulnerability"], exploits: [] }
- paramOverrides: {}
- gaps: [Player chooses which 3 hexes to apply; multi-hex application as single action]
- reasoning: "Applies multiple hexes plus immediate damage. dmg_spell for the burst damage, debuff_stat and debuff_vuln represent the hex debuffs applied. The specific hex choice is a targeting/selection nuance."

---

### Hexblade / Curse Mark / Absolute Curse (Active)
Description: "Brand target with the ultimate curse -- apply all 6 hex types simultaneously, all at double potency, and for 3 turns any hex that expires immediately reapplies at half potency automatically; the target is a walking catastrophe of layered misfortune for the encounter"

Mapping:
- effects: [debuff_stat, debuff_vuln, dot_poison, cc_daze]
- targeting: tgt_single_enemy
- conditions: { creates: ["hex_weakness", "hex_slowmark", "hex_vulnerability", "hex_misfortune", "hex_ruin", "hex_unraveling"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: [All 6 hexes at double potency; auto-reapplication on expiry; encounter-long duration; uncleansable implied]
- reasoning: "Ultimate debuff applying all hex types at once. debuff_stat for movement/offensive reduction, debuff_vuln for damage taken increase, dot_poison for the max HP degradation, cc_daze for the misfortune/disruption. The auto-reapply and double-potency aspects are unique scaling mechanics."

---

### Archetype: Spectral Arsenal

---

### Hexblade / Spectral Arsenal / Spectral Blade (Summon)
Description: "Summon 1 spectral blade that orbits you and attacks nearby enemies once per 1 turn; deals moderate damage and ignores physical armor"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["spectral_blade"], exploits: [] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; autonomous periodic attacks; armor penetration; persistent entity]
- reasoning: "Summons a persistent damage source. dmg_spell represents the magic damage output (ignores physical armor = magic damage). tgt_self since the blade orbits you. The autonomous attack pattern is a summon mechanic gap."

---

### Hexblade / Spectral Arsenal / Phantom Strike (Active)
Description: "Command all active spectral blades to simultaneously strike the same target; damage scales with number of blades (each blade fires once)"

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Damage scales with number of active summons; requires existing spectral blades]
- reasoning: "Multiple blades striking one target simultaneously maps to dmg_multihit. Exploits the spectral_blade condition since more blades = more hits."

---

### Hexblade / Spectral Arsenal / Arsenal Expansion (Summon)
Description: "Summon 2 additional spectral blades (max 5 total orbiting blades); they orbit faster with more blades present"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["spectral_blade"], exploits: [] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; multiple persistent entities; speed scaling with count; cap mechanic]
- reasoning: "Adds more spectral blades to the arsenal. dmg_spell represents the additional damage sources. Same pattern as Spectral Blade but summoning multiples."

---

### Hexblade / Spectral Arsenal / Shield Formation (Active)
Description: "Command spectral blades to defensive formation for 2 turns; they intercept incoming attacks (absorb up to 3 hits total before returning to offense)"

Mapping:
- effects: [buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Hit absorption (discrete hits blocked, not % reduction); requires existing spectral blades; temporary mode switch]
- reasoning: "Blades intercepting attacks is a damage reduction mechanic. buff_dmgReduce is the closest fit. The discrete hit-absorption (3 hits) differs from percentage reduction but serves the same protective purpose."

---

### Hexblade / Spectral Arsenal / Spectral Surge (Active)
Description: "Trigger a surge -- all spectral blades immediately fire at a target in rapid sequence over 1 turn, dealing their individual damage per blade"

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Damage scales with number of active summons]
- reasoning: "Rapid sequential blade strikes on one target maps cleanly to dmg_multihit. Very similar to Phantom Strike but delivered in rapid sequence rather than simultaneously."

---

### Hexblade / Spectral Arsenal / Ghost Lance (Summon)
Description: "Summon a unique spectral lance that fires a penetrating beam attack every 2 turns instead of a regular blade strike; the beam passes through all enemies in a line"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["spectral_lance"], exploits: [] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; line/penetrating targeting (not adjacent AoE); periodic autonomous attacks; unique summon variant]
- reasoning: "A summoned entity that deals AoE magic damage in a line. dmg_spell for the armor-ignoring beam damage, tgt_aoe_adjacent as the closest AoE proxy for line targeting."

---

### Hexblade / Spectral Arsenal / Haunted Volley (Active)
Description: "Launch all spectral blades outward in different directions simultaneously; each blade passes through all enemies in its path before circling back -- AoE coverage"

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Multi-directional projectiles; line-of-effect per blade; return mechanic; coverage based on blade count and enemy positions]
- reasoning: "Multiple blades hitting multiple enemies in different directions. dmg_multihit for the multi-hit nature, tgt_aoe_adjacent for the wide AoE coverage. The directional spread is a targeting nuance."

---

### Hexblade / Spectral Arsenal / Blade Tornado (Active)
Description: "Command all spectral blades to begin spinning rapidly around you for 2 turns; any enemy who comes within 2 hexes takes continuous spectral damage from the whirling barrier"

Mapping:
- effects: [dmg_spell, buff_dmgReduce]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Persistent AoE zone (2 turns); proximity-triggered damage; defensive barrier aspect; 2-hex radius zone]
- reasoning: "Spinning blade barrier that damages nearby enemies. dmg_spell for the continuous spectral damage, buff_dmgReduce for the implicit defensive barrier. tgt_aoe_adjacent for the area effect."

---

### Hexblade / Spectral Arsenal / Spectral Clone (Summon)
Description: "Summon a full spectral duplicate of your entire arsenal at a remote location for 3 turns; the duplicate fights independently at the target location while your primary arsenal continues fighting near you"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: ["spectral_clone"], exploits: ["spectral_blade"] }
- paramOverrides: {}
- gaps: [Remote summon placement; autonomous clone of existing summons; dual-location combat; duplicates entire arsenal state]
- reasoning: "Creates a remote copy of your spectral arsenal. dmg_spell represents the damage output of the clone. tgt_single_enemy for the remote target location. The duplication mechanic is a major gap."

---

### Hexblade / Spectral Arsenal / The Ghost Armory (Active)
Description: "for 4 turns, unlock the full Spectral Arsenal -- summon 10 spectral blades simultaneously (double the normal max), they split into groups of 3 to independently hunt different targets, Blade Tornado's radius expands to 3 hexes and deals triple damage, and once per 1 turn a spectral greatsword manifests to deliver a powerful area cleave across the entire battlefield"

Mapping:
- effects: [dmg_multihit, dmg_spell, buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["spectral_blade", "spectral_greatsword"], exploits: [] }
- paramOverrides: {}
- gaps: [10 simultaneous summons; autonomous target selection; enhanced Blade Tornado radius; battlefield-wide cleave; spectral greatsword periodic attack; duration-based ultimate state]
- reasoning: "Ultimate summoner ability. dmg_multihit for the 10 blades attacking multiple targets, dmg_spell for the spectral greatsword cleave, buff_stat for the overall power increase. The autonomous hunting, enhanced tornado, and battlefield cleave are all unique mechanics."

---

## Necrosurgeon

### Archetype: Reanimator

---

### Necrosurgeon / Reanimator / Harvest Limb (Utility)
Description: "Extract a usable part (arm, leg, torso, head) from a fresh corpse; stored in your Kit."

Mapping:
- effects: []
- targeting: tgt_single_enemy
- conditions: { creates: ["harvested_part"], exploits: [] }
- paramOverrides: {}
- gaps: [Corpse interaction; inventory/resource gathering; no combat effect; requires corpse target not enemy]
- reasoning: "Pure utility with no direct combat effect. No effect types apply -- this is a resource-gathering action targeting a corpse. The entire corpse-interaction and part-storage mechanic is outside the combat effect system."

---

### Necrosurgeon / Reanimator / Crude Assembly (Summon)
Description: "Stitch together a basic Shambler from 2 parts; its stats depend on part quality."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["construct"], exploits: ["harvested_part"] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; construct with variable stats based on parts; persistent autonomous entity; part consumption]
- reasoning: "Summons a combat entity. dmg_spell as a proxy for the construct's damage output. tgt_self since the construct appears near you. The modular stats-from-parts system is a major gap."

---

### Necrosurgeon / Reanimator / Specialist Graft (Active)
Description: "Attach a harvested arm to your construct, granting it a ranged attack or grab ability."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["harvested_part", "construct"] }
- paramOverrides: { buff_stat: { stat: "rangedSkill" } }
- gaps: [Construct modification; part consumption; granting new ability types to summons; ranged attack or grab choice]
- reasoning: "Upgrading a construct's capabilities. buff_stat on rangedSkill approximates granting ranged attack ability. The construct-modification and part-consumption aspects are outside the effect system."

---

### Necrosurgeon / Reanimator / Head Transplant (Active)
Description: "Replace your construct's head with a harvested one; grants it a unique passive aura."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["harvested_part", "construct"] }
- paramOverrides: {}
- gaps: [Construct modification; part consumption; granting passive aura to summon; variable aura based on head source]
- reasoning: "Another construct upgrade. buff_stat represents the general enhancement. The passive aura mechanic and head-dependent variability are unique to the construct system."

---

### Necrosurgeon / Reanimator / Composite Horror (Summon)
Description: "Assemble a large construct from 5 parts simultaneously; gains abilities from all sources."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["construct"], exploits: ["harvested_part"] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; 5-part requirement; abilities inherited from component parts; large construct variant]
- reasoning: "Upgraded summon requiring more parts. dmg_spell for the construct's damage. Same pattern as Crude Assembly but scaled up. The modular ability inheritance is the key gap."

---

### Necrosurgeon / Reanimator / Surgical Upgrade (Active)
Description: "Spend 3 turns operating on an existing construct to restore 50% HP and upgrade one of its parts."

Mapping:
- effects: [heal_pctDmg, buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["construct"] }
- paramOverrides: {}
- gaps: [Multi-turn channel/operation; construct-targeted heal; part upgrade on summon; 3-turn cast time]
- reasoning: "Heals and upgrades a construct. heal_pctDmg for the HP restore, buff_stat for the part upgrade. The 3-turn operation time is a channel mechanic. Target is the construct (approximated by tgt_self since it's your construct)."

---

### Necrosurgeon / Reanimator / Optimal Configuration (Active)
Description: "Rearrange all parts on your construct instantly for free; swap in stored parts mid-combat."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["construct", "harvested_part"] }
- paramOverrides: {}
- gaps: [Part rearrangement on construct; free action; inventory interaction mid-combat; modular reconfiguration]
- reasoning: "Reconfiguring a construct's parts to optimize it. buff_stat as a proxy for the stat changes from rearrangement. The modular part-swap mechanic is unique to the construct system."

---

### Necrosurgeon / Reanimator / Mass Harvest (Active)
Description: "Simultaneously harvest one part from every corpse in a 4 hexes radius after a battle."

Mapping:
- effects: []
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["harvested_part"], exploits: [] }
- paramOverrides: {}
- gaps: [Corpse interaction; AoE resource gathering; post-battle utility; no direct combat effect; corpse targeting]
- reasoning: "AoE resource gathering from corpses. No combat effects apply. Creates multiple harvested_part conditions. The corpse-targeting AoE and post-battle timing are outside the combat effect system."

---

### Necrosurgeon / Reanimator / Masterwork Abomination (Summon)
Description: "Spend 8 parts to assemble a Masterwork--a fully autonomous undead titan with combined abilities of all parts, self-repair, and an AoE slam that counts as your own attack for skill interaction purposes."

Mapping:
- effects: [dmg_spell, dmg_multihit]
- targeting: tgt_self
- conditions: { creates: ["construct"], exploits: ["harvested_part"] }
- paramOverrides: {}
- gaps: [8-part requirement; autonomous titan summon; self-repair on summon; AoE slam as owner's attack; combined abilities from all parts; ultimate summon tier]
- reasoning: "Ultimate construct summon. dmg_spell for the titan's base damage, dmg_multihit for the AoE slam capability. The self-repair, autonomous behavior, and skill-interaction passthrough are all major gaps."

---

### Archetype: Fleshcraft

---

### Necrosurgeon / Fleshcraft / Auxiliary Limb (Active)
Description: "Graft a third arm to your torso; wield an extra weapon or item simultaneously."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["graft_limb"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: [Extra equipment slot; dual/triple wielding; item slot expansion; persistent self-modification]
- reasoning: "Adding a third arm for combat is a permanent self-buff. buff_stat on meleeSkill approximates the extra weapon's combat benefit. The equipment slot mechanic is outside the effect system."

---

### Necrosurgeon / Fleshcraft / Venom Gland (Active)
Description: "Graft a harvested venom sac; spit corrosive acid (2 turns cooldown, applies AoE DoT)."

Mapping:
- effects: [dot_poison]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["poison", "graft_venom"], exploits: [] }
- paramOverrides: {}
- gaps: [Grants a new ability rather than being the ability itself; persistent graft modification; acid/corrosive damage type]
- reasoning: "Corrosive acid AoE DoT maps to dot_poison (poison includes stat reduction which fits corrosive/acid). tgt_aoe_adjacent for the AoE application. The graft-granting-ability pattern is a unique mechanic."

---

### Necrosurgeon / Fleshcraft / Full Conversion (Active)
Description: "Temporarily suppress all living tissue; become Undead-type for 6 turns (immune to life-drain, mind effects, and poison)."

Mapping:
- effects: [buff_dmgReduce, buff_stat]
- targeting: tgt_self
- conditions: { creates: ["undead_form"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: [Type change (become Undead); specific immunities (life-drain, mind, poison); category-based immunity rather than flat reduction]
- reasoning: "Becoming Undead grants immunities approximated by buff_dmgReduce (damage immunity aspects) and buff_stat on resolve (mind effect immunity proxy). The creature-type change and specific immunity categories are unique mechanics."

---

### Necrosurgeon / Fleshcraft / The Masterwork Self (Transform)
Description: "Complete your self-modification: permanently become a Flesh Construct--retain intelligence and class abilities, gain immunity to disease, poison, and fear, regenerate 2% HP/s, and each graft slot now holds two grafts simultaneously."

Mapping:
- effects: [buff_dmgReduce, heal_pctDmg, buff_stat]
- targeting: tgt_self
- conditions: { creates: ["flesh_construct_form"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "resolve" } }
- gaps: [Permanent transformation; creature-type change; specific immunities (disease, poison, fear); HP regeneration over time; doubled graft slot capacity; retaining class abilities]
- reasoning: "Ultimate transformation ability. buff_dmgReduce for the immunities, heal_pctDmg for the regeneration, buff_stat on resolve for fear immunity. The permanent type change and doubled graft slots are major gaps -- this is a fundamental character transformation."

---

### Archetype: Soul Harvest

---

### Necrosurgeon / Soul Harvest / Soul Snare (Utility)
Description: "On killing blow, passively capture a Soul Essence from the target (max 10 stored)."

Mapping:
- effects: []
- targeting: tgt_single_enemy
- conditions: { creates: ["soul_essence"], exploits: [] }
- paramOverrides: {}
- gaps: [Kill-triggered resource generation; resource storage with cap; no direct combat effect; passive trigger]
- reasoning: "Pure resource generation with no direct combat effect. Creates the soul_essence condition for other abilities to consume. The kill-trigger and storage mechanics are resource management outside the effect system."

---

### Necrosurgeon / Soul Harvest / Essence Bolt (Attack)
Description: "Spend 1 Essence to hurl a condensed soul shard; deals spirit damage, bypasses armor."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["soul_essence"] }
- paramOverrides: {}
- gaps: [Soul Essence resource cost]
- reasoning: "Spirit damage that bypasses armor maps cleanly to dmg_spell (magic damage). Single target ranged attack. The Essence cost is a resource mechanic."

---

### Necrosurgeon / Soul Harvest / Spectral Shell (Buff)
Description: "Spend 2 Essence to wrap yourself in soul-energy; absorb the next instance of damage."

Mapping:
- effects: [buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: ["spectral_shell"], exploits: ["soul_essence"] }
- paramOverrides: {}
- gaps: [Single-hit absorption shield (discrete, not percentage); Essence resource cost]
- reasoning: "Damage absorption shield maps to buff_dmgReduce. The single-instance absorption differs from percentage reduction but serves the same protective function."

---

### Necrosurgeon / Soul Harvest / Soul Tap (Active)
Description: "Drain 3 Essence from a weakened (below 25% HP) living target without killing them."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: ["soul_essence"], exploits: [] }
- paramOverrides: {}
- gaps: [HP threshold requirement (below 25%); Essence generation from living target; non-lethal drain mechanic]
- reasoning: "Draining essence from a weakened target. dmg_spell as a proxy for the soul-draining attack. The HP threshold condition and resource generation are unique mechanics. Non-lethal aspect is a gap."

---

### Necrosurgeon / Soul Harvest / Essence Infusion (Active)
Description: "Spend 3 Essence to empower a construct; it gains +30% damage and AoE for 5 turns."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: [], exploits: ["soul_essence", "construct"] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: [Construct-targeted buff; Essence resource cost; granting AoE capability to summon; requires existing construct]
- reasoning: "Buffing a construct's damage and granting AoE. buff_stat on meleeSkill approximates the damage increase. tgt_self since you're buffing your own construct. The AoE-granting aspect and construct targeting are gaps."

---

### Necrosurgeon / Soul Harvest / Soul Detonation (Active)
Description: "Spend 5 Essence; release a 3 hexes AoE explosion of spirit energy dealing heavy damage."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["soul_essence"] }
- paramOverrides: {}
- gaps: [Essence resource cost; 3-hex radius (larger than adjacent)]
- reasoning: "AoE spirit damage explosion. dmg_spell for the magic damage, tgt_aoe_adjacent for the area effect. Clean mapping -- this is a straightforward AoE nuke."

---

### Necrosurgeon / Soul Harvest / Spectral Minion (Summon)
Description: "Spend 4 Essence to manifest a soul as a temporary ghost fighter for 6 turns."

Mapping:
- effects: [dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["spectral_minion"], exploits: ["soul_essence"] }
- paramOverrides: {}
- gaps: [Summon/pet mechanic; temporary autonomous fighter; 6-turn duration; Essence resource cost]
- reasoning: "Summoning a temporary combat entity. dmg_spell as proxy for the minion's damage output. tgt_self since the minion spawns near you. The summon persistence and AI are outside the effect system."

---

### Necrosurgeon / Soul Harvest / Soul Forge (Active)
Description: "Spend 8 Essence to forge a Soul Weapon--a spectral blade wielded by your dominant construct."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["soul_weapon"], exploits: ["soul_essence", "construct"] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: [Construct weapon creation; Essence resource cost; requires existing construct; spectral weapon as equipment for summon]
- reasoning: "Creating a weapon for your construct. buff_stat on meleeSkill approximates the damage increase the Soul Weapon provides. The construct-equipment interaction is a unique mechanic."

---

### Necrosurgeon / Soul Harvest / Soulstorm Engine (Channel)
Description: "Channel for 1 turn, spending all stored Essence; for each point spent, launch a seeking soul shard that homes on the nearest enemy. At 10 Essence, trigger a Soulstorm--a 5 hexes tempest of spirit energy lasting 3 turns that continuously damages and drains all enemies within."

Mapping:
- effects: [dmg_multihit, dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["soul_essence"] }
- paramOverrides: {}
- gaps: [Channel/cast time; resource-scaling damage (more Essence = more shards); homing projectiles; threshold trigger at 10 Essence for enhanced mode; persistent AoE zone (3 turns); 5-hex radius; drain effect on enemies]
- reasoning: "Ultimate that spends all Essence for massive damage. dmg_multihit for the individual seeking shards (one per Essence), dmg_spell for the Soulstorm AoE. tgt_aoe_adjacent for the wide area. The Essence-scaling, homing, persistent zone, and drain are all unique mechanics."
