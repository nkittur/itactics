# LLM Effect Mapping - Batch 3: Berserker, Monk, Ranger

Generated: 2026-02-28

---

## Berserker

### Blood Fury

---

### Berserker / Blood Fury / Wound Pride (Attack)
Description: "Slash yourself for 5% of max HP to enter a frenzied state for 3 seconds where all your attacks deal bonus bleed damage equal to 50% of your self-inflicted wound."

Mapping:
- effects: [dot_bleed, buff_stat]
- targeting: tgt_self
- conditions: { creates: ["bleed", "frenzy"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["self-damage cost mechanic not representable"]
- reasoning: "Primary output is applying bleed on future attacks and entering a buffed state. Mapped as a self-targeted buff that enables bleed. The self-damage HP cost is a gap -- no 'cost HP' effect exists."

---

### Berserker / Blood Fury / Berserker's Bargain (Active)
Description: "Reduce your own max HP by 15% permanently for this combat; in exchange, immediately gain 30% damage increase and 20% attack rate that also scales with Bloodletting."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["damage_buff"], exploits: ["low_hp"] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["permanent max HP reduction as cost", "attack rate increase not a listed stat"]
- reasoning: "Core mechanical output is a large self-buff to damage. The HP cost is a design-level trade-off with no direct effect match. Attack rate maps closest to a stat buff. Kept to a single buff_stat since the core fantasy is 'sacrifice HP for power.'"

---

### Berserker / Blood Fury / Crimson Surge (Attack)
Description: "A massive strike fueled by desperation; deals 150% weapon damage plus 3% of your MISSING HP as bonus damage; most powerful at 10-20% HP."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["low_hp"] }
- paramOverrides: {}
- gaps: ["missing HP scaling not directly representable; approximated as high-multiplier weapon damage"]
- reasoning: "A single powerful melee strike with a high weapon damage multiplier. The missing-HP bonus is a scaling mechanic best handled by the passive system (Bloodletting). The strike itself maps cleanly to dmg_weapon at an elevated multiplier."

---

### Berserker / Blood Fury / Martyr's Blade (Attack)
Description: "Spend 10% of current HP to charge this strike for 1 second; the attack deals damage equal to 500% of the HP spent plus normal weapon damage -- at low HP this is brutally efficient."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["low_hp"] }
- paramOverrides: {}
- gaps: ["HP-spending as a cost/scaling mechanic"]
- reasoning: "Another heavy single-target strike. Despite the HP-cost flavor, the mechanical output is a large burst of weapon damage against one enemy. The HP cost and HP-based scaling are thematic modifiers that the passive system handles."

---

### Berserker / Blood Fury / Hemorrhagic Frenzy (Toggle)
Description: "Toggle on: your attacks stack Hemorrhage on enemies (5 stacks = spontaneous rupture dealing massive damage) but you take 1% max HP per turn from sympathetic bleeding; the rupture damage scales with your missing HP."

Mapping:
- effects: [dot_bleed, dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["bleed", "hemorrhage_stacks"], exploits: ["low_hp", "bleed"] }
- paramOverrides: {}
- gaps: ["stacking mechanic with rupture threshold", "self-damage-per-turn cost"]
- reasoning: "The toggle adds bleed stacking to attacks with an eventual burst (rupture). Mapped as dot_bleed for the stacking bleeds and dmg_weapon for the rupture payoff. The self-damage cost and 5-stack threshold are design-level mechanics beyond the effect system."

---

### Berserker / Blood Fury / Crimson God (Transform)
Description: "For 12 seconds enter the ultimate Blood Fury form: your HP is frozen at its current value (cannot drop further), all missing HP bonuses are calculated as if you have 1 HP remaining (maximum Bloodletting), and your attacks deal additional damage equal to 1% of your MAX HP per hit; each kill during this form triggers a blood nova dealing 150% weapon damage to all enemies in 2 hexes; when the form ends, take damage equal to all the HP that would have been lost during the form."

Mapping:
- effects: [dmg_weapon, buff_stat, dmg_weapon]
- targeting: tgt_self
- conditions: { creates: ["blood_fury_form", "blood_nova_on_kill"], exploits: ["low_hp"] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["HP freeze mechanic", "on-kill AoE nova", "deferred damage on form expiry", "transform state management"]
- reasoning: "The transform's core outputs are: massive damage buff (max Bloodletting), bonus damage per hit, and AoE on kills. Mapped as self-buff plus weapon damage. The HP freeze and deferred damage are unique transform mechanics with no effect equivalent."

---

### Warpath

---

### Berserker / Warpath / Bull Rush (Movement)
Description: "Charge forward in a straight line up to 3 hexes; deal moderate damage to the first enemy hit and knock them back 1 hex."

Mapping:
- effects: [dmg_weapon, disp_push]
- targeting: tgt_single_enemy
- conditions: { creates: ["displaced"], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "Clean mapping: a charge that deals weapon damage and pushes the target back. Both effects are directly supported."

---

### Berserker / Warpath / Cleave (Attack)
Description: "A wide horizontal sweep hitting all enemies in a 180-degree arc in front of you for 80% weapon damage each."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["180-degree frontal cone vs full adjacent AoE -- directional targeting not supported"]
- reasoning: "An AoE melee attack hitting multiple adjacent enemies. tgt_aoe_adjacent is the closest match even though the game description implies a frontal arc rather than full surround."

---

### Berserker / Warpath / Titan Charge (Movement)
Description: "Charge up to 4 hexes with unstoppable momentum; cannot be stopped or redirected mid-charge; deal 150% weapon damage to the primary target and 75% to all enemies within 1 hex of the impact point."

Mapping:
- effects: [dmg_weapon, dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["splash damage to nearby enemies at reduced rate -- needs both single-target and AoE simultaneously", "unstoppable/CC-immune during charge"]
- reasoning: "Primary target takes full weapon damage; nearby enemies take splash. Mapped as dmg_weapon twice: once for the primary hit, once for the splash. The CC immunity during movement is a passive-like property."

---

### Berserker / Warpath / Whirlwind (Attack)
Description: "Spin in place dealing 60% weapon damage to all enemies within 2 hexes repeatedly for 2 seconds (approximately 4 hits); you can move slowly while spinning."

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["2-hex radius vs 1-hex adjacent", "movement while attacking"]
- reasoning: "Multiple hits against all nearby enemies maps cleanly to dmg_multihit with tgt_aoe_adjacent. The extended radius and slow-movement are flavor details."

---

### Berserker / Warpath / Warpath Stride (Stance)
Description: "Enter Warpath Stance: you cannot be stopped, slowed, or knocked back while moving; all movement-based attacks deal 40% bonus damage; attacks you make while moving gain cleave range (hit 1 hex wider arc); lasts until you stop moving for 2 seconds."

Mapping:
- effects: [buff_stat, buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: ["warpath_stance"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "movementPoints" } }
- gaps: ["CC immunity while moving", "conditional cleave range expansion", "stance auto-ends on stillness"]
- reasoning: "A movement-oriented stance that buffs damage and grants CC immunity. The damage increase maps to buff_stat, and CC immunity is approximated by buff_dmgReduce (reducing effective disruption). The movement-conditional nature is a gap."

---

### Berserker / Warpath / Chain Charge (Movement)
Description: "Charge at one target; on hit immediately charge the next nearest enemy within 3 hexes for 75% damage; continue chaining up to 3 times with diminishing range but stacking damage (+25% per chain); cannot hit the same target twice."

Mapping:
- effects: [dmg_weapon, dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["multi-target chaining with unique-target constraint", "diminishing range per chain", "stacking damage bonus per chain"]
- reasoning: "A charge that hits multiple enemies in sequence. The initial hit is dmg_weapon; the chaining is best approximated by dmg_multihit since each chain is a separate hit. The unique-target and diminishing-range mechanics are design-level details."

---

### Berserker / Warpath / Seismic Slam (Attack)
Description: "Leap into the air and crash down with both fists; creates a shockwave in a 2 hexes radius dealing 200% weapon damage and knocking enemies prone for 1.5 seconds; generates massive Momentum for the next attack."

Mapping:
- effects: [dmg_weapon, cc_stun, disp_push]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["stunned", "momentum"], exploits: [] }
- paramOverrides: {}
- gaps: ["leap/gap-close mechanic", "prone vs stun distinction", "momentum resource generation"]
- reasoning: "A leap-slam with AoE damage and a knock-prone effect. Prone is mapped to cc_stun (lose turn). The knockback from shockwave maps to disp_push. Momentum generation is a resource mechanic outside the effect system."

---

### Berserker / Warpath / Rampage (Active)
Description: "Enter a 10-second rampage state where Bull Rush, Chain Charge, and Titan Charge all reset their cooldowns every 2.5 seconds; during Rampage you must keep charging -- if you stand still for more than 1 second, the rampage ends prematurely."

Mapping:
- effects: [res_apRefund]
- targeting: tgt_self
- conditions: { creates: ["rampage_state"], exploits: [] }
- paramOverrides: {}
- gaps: ["cooldown reset mechanic for specific abilities", "conditional maintenance (must keep moving)"]
- reasoning: "The core mechanical output is enabling repeated use of charge abilities by resetting cooldowns. The closest match is res_apRefund since it effectively gives you more actions. The specific cooldown-reset and movement-requirement are design-level mechanics."

---

### Berserker / Warpath / The Living Avalanche (Transform)
Description: "For 15 seconds, become a force of nature -- your size increases by 30%, you gain complete immunity to all CC and physics effects, and every step you take deals AoE damage in a 1 hex radius; charge cooldowns become 1 second; each charge deals 300% weapon damage and travels through obstacles; enemies killed by charges explode dealing 100% of their max HP as physical damage to nearby survivors; the battlefield itself trembles -- terrain features crack and collapse under your passage."

Mapping:
- effects: [dmg_weapon, buff_stat, buff_dmgReduce]
- targeting: tgt_self
- conditions: { creates: ["avalanche_form", "aoe_on_move"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "movementPoints" } }
- gaps: ["passive AoE damage on movement", "on-kill explosion mechanic", "CC/physics immunity", "terrain destruction", "transform state management"]
- reasoning: "The transform grants massive damage output, CC immunity, and movement-based AoE. Core outputs mapped as dmg_weapon (charge damage), buff_stat for movement enhancement, and buff_dmgReduce for the effective invulnerability. The on-kill explosions and terrain destruction are significant gaps."

---

### Primal Howl

---

### Berserker / Primal Howl / Battle Cry (Active)
Description: "Unleash a terrifying war cry in a 2 hexes radius; enemies with low morale flee for 2 seconds (fear), all others suffer -15% attack damage for 5 seconds from intimidation."

Mapping:
- effects: [cc_daze, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["feared", "intimidated"], exploits: ["low_morale"] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["fear/flee mechanic (forced movement away)", "morale-conditional branching"]
- reasoning: "Fear (flee) is mapped to cc_daze as the closest CC that degrades enemy effectiveness without full stun. The intimidation debuff maps to debuff_stat reducing attack power. The morale-conditional branching is a design detail."

---

### Berserker / Primal Howl / Taunt (CC)
Description: "Single-target intimidation that forces one enemy to attack only you for 4 seconds; while taunted, the enemy attacks with -20% effectiveness."

Mapping:
- effects: [cc_daze, debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["taunted"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["taunt/forced-targeting mechanic"]
- reasoning: "Taunt forces the enemy to target you and reduces their effectiveness. cc_daze represents the loss of target choice (reduced agency), and debuff_stat covers the -20% attack reduction. The forced-targeting aspect is a gap."

---

### Berserker / Primal Howl / Howl of Terror (Active)
Description: "A piercing primal howl that travels 4 hexes; all enemies in range must make a morale check -- weaker enemies flee for 4 seconds, mid-tier enemies are stunned for 1.5 seconds, strong enemies suffer -20% to all stats for 6 seconds."

Mapping:
- effects: [cc_stun, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["feared", "stunned", "debuffed"], exploits: ["low_morale"] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["4-hex range vs adjacent", "tiered effect based on enemy strength/morale", "fear/flee mechanic"]
- reasoning: "The most impactful outputs are stun (for mid-tier) and stat reduction (for strong enemies). cc_stun covers the hard CC branch and debuff_stat covers the stat-reduction branch. The morale-check branching and flee mechanic are design-level complexities."

---

### Berserker / Primal Howl / Crushing Dominance (Debuff)
Description: "Target one enemy and psychologically crush them for 10 seconds; they cannot use morale-based or bravery-requiring skills (charges, big cooldowns), attack with -25% effectiveness, and suffer 30% increased damage from you."

Mapping:
- effects: [debuff_stat, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["dominated", "vulnerable"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["skill lockout / ability suppression mechanic"]
- reasoning: "Two clear mechanical outputs: reduced attack effectiveness (debuff_stat) and increased damage taken (debuff_vuln at 30%). The skill lockout is a unique mechanic with no direct effect match."

---

### Berserker / Primal Howl / Mass Rout (Active)
Description: "Charge forward roaring; every enemy within 2 hexes of your path has a 60% chance to immediately flee for 3 seconds; any that stand firm take 150% weapon damage from the charge; morale recovered enemies re-enter with 20% reduced stats."

Mapping:
- effects: [dmg_weapon, cc_daze, debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["feared", "debuffed"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["charge-path AoE targeting", "probability-based fear vs damage branching", "post-fear stat reduction"]
- reasoning: "Combines a charge attack with fear. Enemies either flee (cc_daze) or take damage (dmg_weapon). Those who recover from fear get debuffed (debuff_stat). The path-based targeting and probability branching are design details."

---

### Berserker / Primal Howl / War God's Roar (Active)
Description: "Release a thunderous roar that simultaneously fears ALL enemies on the battlefield for 2 seconds and buffs ALL allies with +25% damage and immunity to fear for 8 seconds; the roar is so powerful it briefly shakes the terrain, knocking flying or jumping enemies out of the air."

Mapping:
- effects: [cc_stun, buff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["feared", "ally_damage_buff"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["battlefield-wide targeting (beyond adjacent)", "ally buff component on an enemy-targeting ability (dual targeting)", "fear immunity for allies", "anti-air knockdown"]
- reasoning: "Two major outputs: fear all enemies (cc_stun as a short hard CC) and buff all allies (+25% damage as buff_stat). The dual-targeting (enemies get CC, allies get buff) is a significant gap -- the system would need two separate effect applications. Mapped with the enemy-facing effects as primary."

---

### Berserker / Primal Howl / Apex Predator (Transform)
Description: "For 15 seconds become the embodiment of primal terror -- your Primal Presence aura fills the entire battlefield; all enemies permanently suffer -30% to all stats, cannot use morale-requiring abilities, and have a 25% chance to flinch (interrupt their own attacks) per hit they make; enemies who die while under your Apex Predator aura cannot be resurrected or rallied; your own allies gain +50% damage from witnessing your supremacy; when the form ends, release a final apocalyptic howl that resets all fear cooldowns and fears every surviving enemy for 3 seconds."

Mapping:
- effects: [debuff_stat, buff_stat, cc_daze]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["apex_predator_form", "global_debuff", "ally_buff"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: ["battlefield-wide aura", "flinch/interrupt-on-attack mechanic", "prevent resurrection", "ally buff (dual targeting)", "on-expiry fear burst", "ability suppression", "transform state management"]
- reasoning: "The transform's outputs are: massive enemy stat debuff, ally damage buff, and ongoing disruption (flinch). Mapped as debuff_stat for enemy stats, buff_stat for ally power, and cc_daze for the disruption/flinch. Many unique mechanics (anti-resurrect, on-expiry howl) are gaps."

---

## Monk

### Iron Fist

---

### Monk / Iron Fist / Jab (Attack)
Description: "A fast light punch dealing low damage but generating 1 Combo Point; lowest cooldown of all strikes"

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["combo_point"], exploits: [] }
- paramOverrides: {}
- gaps: ["combo point resource generation"]
- reasoning: "A simple low-damage melee strike. Maps directly to dmg_weapon with a low multiplier. Combo Point generation is a resource mechanic outside the effect system."

---

### Monk / Iron Fist / Cross (Attack)
Description: "A straight powerful punch dealing moderate damage and generating 2 Combo Points"

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["combo_points"], exploits: [] }
- paramOverrides: {}
- gaps: ["combo point resource generation"]
- reasoning: "A moderate-damage melee strike. Straightforward dmg_weapon mapping. Combo Point generation is tracked as a condition created but handled by the resource system."

---

### Monk / Iron Fist / Iron Stance (Stance)
Description: "Enter Iron Stance; all strike damage is increased by 10% but movement is reduced by 10%"

Mapping:
- effects: [buff_stat, debuff_stat]
- targeting: tgt_self
- conditions: { creates: ["iron_stance"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" }, debuff_stat: { stat: "movementPoints" } }
- gaps: []
- reasoning: "A trade-off stance: +damage, -movement. Both map cleanly to stat modifications. buff_stat for the damage increase (meleeSkill) and self-applied debuff_stat for the movement reduction."

---

### Monk / Iron Fist / Rising Uppercut (Attack)
Description: "A rising strike that launches the target slightly airborne for 1 turn, dealing good damage and generating 3 Combo Points"

Mapping:
- effects: [dmg_weapon, cc_stun]
- targeting: tgt_single_enemy
- conditions: { creates: ["combo_points", "airborne"], exploits: [] }
- paramOverrides: {}
- gaps: ["airborne state (functionally similar to stun but distinct)"]
- reasoning: "A strong melee hit that launches the target (effectively stunning them for 1 turn). dmg_weapon for the damage and cc_stun for the airborne/incapacitation effect. Airborne is functionally equivalent to stun in this system."

---

### Monk / Iron Fist / Body Blow (Attack)
Description: "Strike the torso, dealing moderate damage and applying a 15% damage reduction debuff to the target for 3 turns"

Mapping:
- effects: [dmg_weapon, debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["weakened"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "meleeSkill" } }
- gaps: []
- reasoning: "Clean mapping: a melee strike (dmg_weapon) that reduces the target's damage output (debuff_stat on meleeSkill). The 15% damage reduction debuff maps directly."

---

### Monk / Iron Fist / Hundred Fists (Attack)
Description: "Spend 4 Combo Points to deliver a 10-hit flurry in 1 turn, each hit dealing moderate damage"

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["combo_points"] }
- paramOverrides: {}
- gaps: ["combo point spending mechanic"]
- reasoning: "A rapid multi-hit attack against a single target. Maps perfectly to dmg_multihit. The Combo Point cost is a resource mechanic."

---

### Monk / Iron Fist / Armor Crack (Attack)
Description: "Spend 3 Combo Points for a precise strike that reduces the target's physical armor by 25% for 4 turns"

Mapping:
- effects: [dmg_weapon, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["armor_broken"], exploits: ["combo_points"] }
- paramOverrides: {}
- gaps: ["armor reduction vs general vulnerability -- no armor-specific stat"]
- reasoning: "A strike that reduces armor. The armor reduction makes the target take more physical damage, which maps to debuff_vuln. dmg_weapon covers the strike itself. Armor isn't a listed stat, so debuff_vuln (increased damage taken) is the closest match."

---

### Monk / Iron Fist / Dragon's Fist (Attack)
Description: "Spend all Combo Points to deliver a single catastrophic blow dealing damage multiplied by Combo Points spent (max 10x)"

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["combo_points"] }
- paramOverrides: {}
- gaps: ["variable multiplier based on resource spent"]
- reasoning: "A single massive hit whose power scales with accumulated Combo Points. Maps to dmg_weapon with a very high multiplier. The variable scaling is a resource mechanic."

---

### Monk / Iron Fist / Perfect Form (Buff)
Description: "Enter perfect iron form for 4 turns; all attacks generate double Combo Points and Finisher damage is increased by 50%"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["perfect_form"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["double resource generation", "finisher-specific damage bonus"]
- reasoning: "A self-buff that enhances Combo Point generation and Finisher damage. The damage increase maps to buff_stat. The resource acceleration is a design-level mechanic."

---

### Monk / Iron Fist / Thousand Strike Technique (Active)
Description: "Channel your life's training into a 2 turns burst of absolute striking mastery; you execute 30 perfectly placed strikes in sequence against up to 3 targets, each hit generating Combo Points that are immediately spent on Finishers, creating a chain of Finishers that deals cascading damage, and culminating in a single Dragon's Fist using all accumulated points simultaneously"

Mapping:
- effects: [dmg_multihit, dmg_weapon]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: ["combo_points"] }
- paramOverrides: {}
- gaps: ["auto-spending resources on finishers mid-ability", "cascading damage chain", "multi-target sequential striking", "culminating single-target finisher"]
- reasoning: "An ultimate burst of multi-hit damage across multiple targets, ending with a massive finisher. dmg_multihit covers the 30-strike flurry, dmg_weapon covers the culminating Dragon's Fist. The auto-resource-spend chain is a unique mechanic."

---

### Flowing Water

---

### Monk / Flowing Water / Step Aside (Movement)
Description: "Dodge an incoming attack by stepping 1 hex to the side; the dodge generates no cooldown and costs only stamina"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["dodged"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["reactive movement/repositioning as a non-reactive ability type"]
- reasoning: "A dodge-movement ability. The mechanical output is avoiding an attack, which maps to buff_stat on dodge. The repositioning aspect is inherent to movement-type abilities."

---

### Monk / Flowing Water / Water Stance (Stance)
Description: "Enter Water Stance; gain +20% dodge chance and all successful dodges generate a Counter Charge"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["water_stance", "counter_charge_on_dodge"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["counter charge resource generation on dodge"]
- reasoning: "A defensive stance that boosts dodge. Maps to buff_stat on dodge. The Counter Charge generation is a resource mechanic tracked as a condition."

---

### Monk / Flowing Water / Fluid Step (Movement)
Description: "Chain up to 3 quick directional steps in rapid succession, evading multiple attacks in sequence"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["evasion_chain"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["multi-step chained movement", "sequential attack evasion"]
- reasoning: "Multiple rapid evasive movements. The mechanical output is enhanced evasion, mapped to buff_stat on dodge. The chaining mechanic is a movement detail."

---

### Monk / Flowing Water / Still Water (Active)
Description: "Become perfectly still for 1 turn; all attacks aimed at you during this time generate maximum Counter Charges but deal only 30% damage"

Mapping:
- effects: [buff_dmgReduce, stance_counter]
- targeting: tgt_self
- conditions: { creates: ["counter_charges", "damage_reduction"], exploits: [] }
- paramOverrides: {}
- gaps: ["maximum counter charge generation per hit"]
- reasoning: "A defensive active that reduces incoming damage and builds counter resources. buff_dmgReduce covers the 70% damage reduction, and stance_counter represents the counter-charge buildup. The 'perfectly still' requirement is implicit in the 1-turn channel."

---

### Monk / Flowing Water / Current Strike (Attack)
Description: "Spend 3 Counter Charges to release them in a rapid fluid combo that hits the target 5 times with perfect precision"

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["counter_charges"] }
- paramOverrides: {}
- gaps: ["counter charge spending mechanic"]
- reasoning: "A 5-hit combo against a single target, spending accumulated Counter Charges. Maps directly to dmg_multihit. The resource cost is a design mechanic."

---

### Monk / Flowing Water / River's Fury (Active)
Description: "for 3 turns, every attack aimed at you automatically generates a Counter Charge and triggers an immediate counter-strike at 80% damage"

Mapping:
- effects: [stance_counter, dmg_weapon]
- targeting: tgt_self
- conditions: { creates: ["auto_counter", "counter_charges"], exploits: [] }
- paramOverrides: {}
- gaps: ["automatic counter-attack on every incoming attack"]
- reasoning: "Enters a sustained counter-attack state. stance_counter covers the counter-attack readiness, and dmg_weapon represents the counter-strike damage. The automatic triggering on every incoming attack is a reactive mechanic."

---

### Monk / Flowing Water / Ocean's Wrath (Active)
Description: "Enter a 4 turns state of absolute fluidity; all enemy attacks are automatically dodged and converted into Counter Charges, all Counter Charges are spent as immediate counter-strikes that deal the original attack's full damage back to the attacker, and you flow freely between all enemies in range using their own force to chain between targets -- the more enemies attack, the more devastation you redirect"

Mapping:
- effects: [buff_stat, stance_counter, dmg_weapon]
- targeting: tgt_self
- conditions: { creates: ["oceans_wrath_form", "auto_dodge", "auto_counter"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "dodge" } }
- gaps: ["100% auto-dodge", "damage reflection at full value", "multi-target counter chaining", "enemy-attack-count scaling"]
- reasoning: "The ultimate counter-stance: auto-dodge everything, reflect all damage back. buff_stat (dodge) for the auto-dodge, stance_counter for the counter-attack readiness, dmg_weapon for the reflected damage. The scaling with number of attackers is a unique mechanic."

---

### Inner Fire

---

### Monk / Inner Fire / Ki Bolt (Attack)
Description: "Project a focused bolt of ki energy at a target, dealing moderate damage at range"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "A ranged ki/energy projectile. Maps perfectly to dmg_spell as a magic/energy damage ability at range."

---

### Monk / Inner Fire / Focus (Active)
Description: "Spend 1 turn in meditation to fully restore your Ki Gauge and gain a brief +20% ki damage bonus"

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["ki_restored", "ki_damage_buff"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["resource restoration mechanic (Ki Gauge)"]
- reasoning: "A self-buff that restores resources and boosts damage. The damage bonus maps to buff_stat. The Ki Gauge restoration is a resource mechanic outside the effect system."

---

### Monk / Inner Fire / Ki Blast (Attack)
Description: "Release a larger ki projectile dealing heavy damage to a single target at range"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "A heavy ranged ki projectile. Maps cleanly to dmg_spell at a higher multiplier than Ki Bolt."

---

### Monk / Inner Fire / Inner Flame (Buff)
Description: "Ignite your ki into a visible flame; for 4 turns all ki attacks deal bonus fire damage and your melee strikes burn the target"

Mapping:
- effects: [buff_stat, dot_burn]
- targeting: tgt_self
- conditions: { creates: ["inner_flame", "burn_on_hit"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["adding elemental damage type to existing attacks"]
- reasoning: "A self-buff that adds fire damage to all attacks. buff_stat covers the ki damage increase, and dot_burn represents the burn application on melee strikes. The elemental-overlay mechanic is a gap."

---

### Monk / Inner Fire / Wave of Force (Attack)
Description: "Release a forward ki wave hitting all enemies in a 3 hexes line for moderate damage and pushing them back 1 hex"

Mapping:
- effects: [dmg_spell, disp_push]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["displaced"], exploits: [] }
- paramOverrides: {}
- gaps: ["line targeting vs adjacent AoE"]
- reasoning: "A ki wave that damages and pushes enemies. dmg_spell for the ki damage and disp_push for the knockback. The linear targeting pattern is approximated by tgt_aoe_adjacent."

---

### Monk / Inner Fire / Ki Explosion (Active)
Description: "Concentrate ki to a point on an enemy then detonate it for heavy AoE damage in a 2 hexes radius"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["targeted AoE centered on enemy (not self)"]
- reasoning: "An AoE ki detonation. Maps to dmg_spell with tgt_aoe_adjacent. The ability centers on an enemy rather than the caster, which is a targeting nuance."

---

### Monk / Inner Fire / Focused Beam (Channel)
Description: "Channel a continuous ki beam for up to 2 turns, dealing escalating damage each second it connects to the same target"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_single_enemy
- conditions: { creates: ["escalating_damage"], exploits: [] }
- paramOverrides: {}
- gaps: ["escalating damage over channel duration", "channeled ability mechanics"]
- reasoning: "A sustained damage beam that increases over time. Maps to dmg_spell at a high multiplier (representing average output over channel). The escalation mechanic is a design detail."

---

### Monk / Inner Fire / Spirit Bomb (Channel)
Description: "Charge for 2 turns to gather ki from your surroundings then release a massive ki sphere dealing catastrophic damage in a 4 hexes radius"

Mapping:
- effects: [dmg_spell]
- targeting: tgt_aoe_adjacent
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["2-turn charge-up requirement", "4-hex radius vs adjacent", "environmental ki gathering"]
- reasoning: "A massive charged AoE ki attack. Maps to dmg_spell with tgt_aoe_adjacent at a very high multiplier. The charge-up time and huge radius are design-level parameters."

---

### Monk / Inner Fire / Inner Supernova (Active)
Description: "Release all ki energy in an omnidirectional burst from your body, dealing heavy AoE damage to all enemies within 4 hexes and launching them outward"

Mapping:
- effects: [dmg_spell, disp_push]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["displaced"], exploits: [] }
- paramOverrides: {}
- gaps: ["4-hex radius vs adjacent", "resource depletion (all ki)"]
- reasoning: "A massive AoE burst centered on self with knockback. dmg_spell for the ki damage and disp_push for launching enemies outward. The 4-hex range is beyond adjacent but uses the same targeting type."

---

### Monk / Inner Fire / Transcendent Ki (Transform)
Description: "Achieve ki transcendence for 5 turns; your body becomes a living ki reactor -- all ki attacks are free-cast and automatically chain to nearby enemies, your Ki Aura expands to 4 hexes and deals significant damage per turn, your melee strikes each release a ki bolt as bonus damage, and every 2 turns your ki overflows in a Spirit Bomb release that costs nothing; the transcendence ends with a final ki nova that deals massive damage to all enemies on the field"

Mapping:
- effects: [dmg_spell, buff_stat, dmg_spell]
- targeting: tgt_self
- conditions: { creates: ["transcendent_form", "auto_chain", "free_cast", "periodic_spirit_bomb"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["free-cast mechanic (no resource cost)", "auto-chain to nearby enemies", "periodic automatic Spirit Bomb", "ki bolt on melee strikes", "on-expiry nova", "transform state management"]
- reasoning: "The ultimate ki form grants free casting, auto-chaining, melee+ranged hybrid damage, and periodic AoE. Mapped as dmg_spell (primary ki output), buff_stat (enhanced damage), and a second dmg_spell for the periodic Spirit Bomb/nova. Many unique mechanics are gaps."

---

## Ranger

### Dead Eye

---

### Ranger / Dead Eye / Mark Target (Active)
Description: "Paint an enemy; your next shot against them deals +20% damage and reveals their health bar."

Mapping:
- effects: [debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["marked"], exploits: [] }
- paramOverrides: {}
- gaps: ["health bar reveal/scouting"]
- reasoning: "Marking a target to take bonus damage maps directly to debuff_vuln. The health bar reveal is a UI/scouting mechanic outside the effect system."

---

### Ranger / Dead Eye / Flint Nock (Attack)
Description: "A fast standard shot with no windup, establishing baseline ranged DPS."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: []
- reasoning: "A basic ranged attack. Maps perfectly to dmg_weapon as a straightforward shot."

---

### Ranger / Dead Eye / Scope In (Stance)
Description: "Toggle: slows movement by 40% but increases effective range and crit chance by 15%."

Mapping:
- effects: [buff_stat, debuff_stat]
- targeting: tgt_self
- conditions: { creates: ["scoped_in"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "critChance" }, debuff_stat: { stat: "movementPoints" } }
- gaps: ["range increase mechanic"]
- reasoning: "A trade-off stance: +crit chance, -movement. Both map cleanly to stat modifications. The range increase is a gap -- no range stat exists in the system."

---

### Ranger / Dead Eye / Tungsten Tip (Attack)
Description: "A single heavy shot that ignores 30% of armor; longer draw time required."

Mapping:
- effects: [dmg_weapon, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["armor_pierced"], exploits: [] }
- paramOverrides: {}
- gaps: ["armor penetration vs general vulnerability"]
- reasoning: "A heavy armor-piercing shot. dmg_weapon for the shot damage, debuff_vuln for the armor-ignoring effect (functionally the target takes more damage). The draw time is a cooldown/cost parameter."

---

### Ranger / Dead Eye / Killzone (Utility)
Description: "Designate a 2 hexes radius area; all shots fired into it gain +25% damage for 3 turns."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["killzone_area"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "rangedSkill" } }
- gaps: ["zone-based damage buff (area designation)", "conditional buff based on target location"]
- reasoning: "Designating an area for bonus damage. The closest match is buff_stat on rangedSkill since it effectively increases your ranged damage output. The zone-placement mechanic is a gap."

---

### Ranger / Dead Eye / Cold Calculation (Buff)
Description: "After standing still for 1 turn, next shot is guaranteed critical and ignores dodge/evasion rolls."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["guaranteed_crit"], exploits: ["stationary"] }
- paramOverrides: { buff_stat: { stat: "critChance" } }
- gaps: ["guaranteed crit (100% crit chance)", "dodge/evasion bypass"]
- reasoning: "A conditional buff granting guaranteed crit. Mapped to buff_stat on critChance (effectively setting it to 100%). The dodge bypass and stillness requirement are design conditions."

---

### Ranger / Dead Eye / Sniper's Patience (Channel)
Description: "Hold to charge for up to 1 turn; release for a shot scaling 100-350% damage based on charge, piercing one enemy."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["variable damage scaling based on charge duration", "pierce-through mechanic"]
- reasoning: "A charged shot with scaling damage. Maps to dmg_weapon at a high multiplier (representing the fully-charged value for mapping purposes). The charge mechanic and piercing are design details."

---

### Ranger / Dead Eye / Ghost Bullet (Attack)
Description: "A shot that passes through terrain once; deals full damage regardless of cover, with a 6 turns cooldown."

Mapping:
- effects: [dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: [] }
- paramOverrides: {}
- gaps: ["terrain/cover penetration mechanic"]
- reasoning: "A shot that ignores cover. Maps to dmg_weapon since the mechanical output is ranged damage. The terrain-piercing property is a targeting/LoS mechanic outside the effect system."

---

### Ranger / Dead Eye / One Shot, One Soul (Active)
Description: "after 1 turn of aim, fire a shot that executes enemies below 25% HP outright; above that threshold deals 600% weapon damage to a single target. 8 turns cooldown."

Mapping:
- effects: [dmg_weapon, dmg_execute]
- targeting: tgt_single_enemy
- conditions: { creates: [], exploits: ["low_hp"] }
- paramOverrides: {}
- gaps: ["instant-kill threshold mechanic (below 25%)"]
- reasoning: "The ultimate sniper shot with an execute mechanic. dmg_weapon for the massive base damage (600%) and dmg_execute for the low-HP kill threshold. This is one of the cleanest execute mappings in the system."

---

### Trapper

---

### Ranger / Trapper / Snare Trap (Utility)
Description: "Place a hidden root trap; triggers on enemy contact, rooting for 1 turn."

Mapping:
- effects: [cc_root]
- targeting: tgt_single_enemy
- conditions: { creates: ["rooted", "trap_placed"], exploits: [] }
- paramOverrides: {}
- gaps: ["trap placement mechanic (delayed/triggered effect)", "hidden/invisible placement"]
- reasoning: "A trap that roots enemies. The mechanical output is cc_root. The trap-placement and trigger mechanics are design-level details -- the effect itself is a root."

---

### Ranger / Trapper / Tripwire (Utility)
Description: "A wire that triggers an audible click and reveals the tripping enemy's position for 2 turns."

Mapping:
- effects: [debuff_stat]
- targeting: tgt_single_enemy
- conditions: { creates: ["revealed", "trap_placed"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "dodge" } }
- gaps: ["position reveal/scouting mechanic", "trap placement mechanic"]
- reasoning: "A detection trap. The reveal mechanic has no direct effect match. The closest approximation is debuff_stat on dodge (the target is easier to hit because their position is known). This is a significant abstraction gap."

---

### Ranger / Trapper / Bait Pile (Utility)
Description: "Place a lure that pulls weak AI enemies toward it and distracts distracted players for 1 turn."

Mapping:
- effects: [cc_daze]
- targeting: tgt_single_enemy
- conditions: { creates: ["lured", "trap_placed"], exploits: [] }
- paramOverrides: {}
- gaps: ["AI manipulation/aggro redirection", "lure/pull mechanic", "trap placement mechanic"]
- reasoning: "A lure that distracts enemies. The distraction effect is closest to cc_daze (loss of effective action). The AI manipulation and pull mechanics are significant gaps."

---

### Ranger / Trapper / Spike Pit (Active)
Description: "Dig a camouflaged 2x1 hex pit; enemies who step in are slowed 60% and take bleed damage per turn."

Mapping:
- effects: [debuff_stat, dot_bleed]
- targeting: tgt_single_enemy
- conditions: { creates: ["slowed", "bleeding", "trap_placed"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: ["trap placement mechanic", "2x1 hex area trap", "camouflage/hidden placement"]
- reasoning: "A trap that slows and bleeds. The slow maps to debuff_stat on movementPoints (60% reduction) and the bleed maps to dot_bleed. Clean effect mapping despite the trap delivery mechanism being a gap."

---

### Ranger / Trapper / Cluster Mine (Utility)
Description: "A pressure mine that detonates into 5 smaller fragments on trigger, each dealing moderate damage in a small radius."

Mapping:
- effects: [dmg_multihit]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["trap_placed"], exploits: [] }
- paramOverrides: {}
- gaps: ["trap placement mechanic", "fragment scatter pattern"]
- reasoning: "A mine that deals multiple hits of AoE damage. The 5 fragments map to dmg_multihit and the AoE nature maps to tgt_aoe_adjacent. The trap trigger mechanic is a delivery gap."

---

### Ranger / Trapper / Corrosive Net (CC)
Description: "Launch a weighted net that ensnares the target, applying a stacking armor-reduction debuff every second while they struggle."

Mapping:
- effects: [cc_root, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["ensnared", "armor_degrading"], exploits: [] }
- paramOverrides: {}
- gaps: ["stacking debuff over time while ensnared"]
- reasoning: "A net that immobilizes and degrades armor. cc_root covers the ensnare (can't move) and debuff_vuln covers the armor reduction (target takes more damage). The stacking-over-time mechanic is a design detail."

---

### Ranger / Trapper / Prepared Ground (Buff)
Description: "Activate to instantly recall all placed traps, refund 50% of their cooldowns, and reset your trap limit counter."

Mapping:
- effects: [res_apRefund]
- targeting: tgt_self
- conditions: { creates: ["traps_reset"], exploits: [] }
- paramOverrides: {}
- gaps: ["trap recall mechanic", "cooldown refund for specific abilities", "trap limit counter reset"]
- reasoning: "A utility that resets trap resources. The closest match is res_apRefund since it effectively gives you back action economy (trap cooldowns and limits). The specific trap-recall and limit-reset mechanics are gaps."

---

### Ranger / Trapper / Killbox Setup (Active)
Description: "Place three linked traps simultaneously in a triangular formation; any enemy entering the triangle triggers all three at once."

Mapping:
- effects: [dmg_weapon, cc_root]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["trap_placed", "killbox_zone"], exploits: [] }
- paramOverrides: {}
- gaps: ["multi-trap simultaneous placement", "linked trap trigger mechanic", "triangular formation", "trap placement mechanic"]
- reasoning: "Three linked traps that trigger simultaneously. The combined output is AoE damage (dmg_weapon) and crowd control (cc_root from snare-type traps). The formation and linking mechanics are significant gaps."

---

### Ranger / Trapper / The Long Game (Active)
Description: "over 2 turns, seed the entire local area (6 hexes radius) with 12 concealed micro-traps that persist for 8 turns; any enemy moving through the area triggers a cascading sequence. 10 turns cooldown."

Mapping:
- effects: [dmg_multihit, cc_root]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["trap_field", "cascading_traps"], exploits: [] }
- paramOverrides: {}
- gaps: ["massive area trap seeding", "cascading trigger sequence", "6-hex radius zone", "8-turn persistence", "2-turn setup time", "12 individual trap placements"]
- reasoning: "The ultimate trap ability: a huge zone of cascading micro-traps. The cascading triggers map to dmg_multihit (multiple damage instances) and cc_root for the movement-punishing nature of the trap field. The scale, persistence, and cascade mechanics are major gaps."

---

### Beastmaster Archer

---

### Ranger / Beastmaster Archer / Bond Strike (Attack)
Description: "Command your pet to attack the same target you are shooting; next shot deals +15% damage if pet struck that target this second."

Mapping:
- effects: [dmg_weapon, dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["pet_coordinated"], exploits: [] }
- paramOverrides: {}
- gaps: ["pet command mechanic", "conditional damage bonus based on pet hit timing"]
- reasoning: "A coordinated attack: your shot plus pet attack on the same target. Two instances of dmg_weapon (one for the shot, one for the pet). The timing-conditional bonus is a design detail."

---

### Ranger / Beastmaster Archer / Scout Hawk (Summon)
Description: "Summon a hawk that flies ahead, revealing terrain and enemy positions in a 5 hexes cone."

Mapping:
- effects: [debuff_stat]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["scouted", "hawk_active"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "dodge" } }
- gaps: ["summon/pet mechanic", "scouting/vision reveal", "5-hex cone targeting"]
- reasoning: "A scouting summon that reveals enemies. No direct effect match for summoning or vision. The closest fallback is debuff_stat on dodge (revealed enemies are easier to hit). This is a significant abstraction gap -- the ability is primarily utility/scouting."

---

### Ranger / Beastmaster Archer / Flanking Fang (Active)
Description: "Direct your pet to circle behind the target; your next arrow deals +30% damage as the enemy is distracted."

Mapping:
- effects: [debuff_vuln, dmg_weapon]
- targeting: tgt_single_enemy
- conditions: { creates: ["flanked", "distracted"], exploits: [] }
- paramOverrides: {}
- gaps: ["pet positioning/flanking mechanic"]
- reasoning: "Pet flanks the target, enabling a stronger shot. The distraction/flanking maps to debuff_vuln (target takes more damage) and the arrow is dmg_weapon. The pet movement is a delivery gap."

---

### Ranger / Beastmaster Archer / Heal Companion (Heal)
Description: "Channel for 1 turn to restore 40% of your pet's max HP; reduces pet cooldown timers by 1 turn."

Mapping:
- effects: [heal_pctDmg]
- targeting: tgt_single_ally
- conditions: { creates: ["pet_healed"], exploits: [] }
- paramOverrides: {}
- gaps: ["pet-specific healing", "cooldown reduction for pet abilities"]
- reasoning: "Healing the pet companion. Maps to heal_pctDmg targeted at an ally (the pet). The cooldown reduction is a resource mechanic outside the effect system."

---

### Ranger / Beastmaster Archer / Arrow + Claw (Active)
Description: "Simultaneously fire a shot and direct a pet lunge at the same target; both hits apply a stacking vulnerability debuff."

Mapping:
- effects: [dmg_weapon, debuff_vuln]
- targeting: tgt_single_enemy
- conditions: { creates: ["vulnerable_stacking"], exploits: [] }
- paramOverrides: {}
- gaps: ["simultaneous dual-source attack (player + pet)", "stacking vulnerability"]
- reasoning: "A coordinated attack with a vulnerability debuff. dmg_weapon covers the combined shot+lunge damage, and debuff_vuln covers the stacking vulnerability. The simultaneous dual-source nature is a pet mechanic gap."

---

### Ranger / Beastmaster Archer / Alpha Call (Buff)
Description: "Let out a rallying call; your pet grows 20% larger, gains bonus HP, and deals 40% more damage for 3 turns."

Mapping:
- effects: [buff_stat]
- targeting: tgt_single_ally
- conditions: { creates: ["alpha_buffed"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["pet-specific buff", "HP increase (not a listed stat)", "size increase"]
- reasoning: "A buff that empowers the pet companion. Maps to buff_stat targeting the ally (pet) with meleeSkill for the damage increase. The HP increase and size change are gaps."

---

### Ranger / Beastmaster Archer / Scatter Drive (Active)
Description: "Your pet herds enemies toward you while you volley shots into the cluster; applies a 1 turn slow to all enemies caught in between."

Mapping:
- effects: [dmg_weapon, debuff_stat, disp_push]
- targeting: tgt_aoe_adjacent
- conditions: { creates: ["slowed", "herded"], exploits: [] }
- paramOverrides: { debuff_stat: { stat: "movementPoints" } }
- gaps: ["pet herding/displacement mechanic", "pull-toward-self displacement"]
- reasoning: "Pet herds enemies while you shoot them. dmg_weapon for the volley damage, debuff_stat on movementPoints for the slow, and disp_push for the herding/displacement (closest to forced movement, though it's a pull rather than push). The coordinated pet+player action is a gap."

---

### Ranger / Beastmaster Archer / Primal Pact (Toggle)
Description: "Enter a merged-senses state: your pet mirrors your movement direction and automatically attacks your attack target; both of you deal 20% more damage."

Mapping:
- effects: [buff_stat]
- targeting: tgt_self
- conditions: { creates: ["primal_pact", "pet_mirroring"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "meleeSkill" } }
- gaps: ["pet movement mirroring", "automatic pet attack on your target", "dual-unit damage buff"]
- reasoning: "A toggle that synchronizes you with your pet and buffs both. The core mechanical output is a damage increase, mapped to buff_stat. The pet-mirroring and auto-attack mechanics are unique to the pet system."

---

### Ranger / Beastmaster Archer / Wild Volley (Channel)
Description: "Channel for 1 turn while your pet pins the target; release for a 5-arrow fan, each arrow homing slightly toward the pinned enemy."

Mapping:
- effects: [dmg_multihit, cc_root]
- targeting: tgt_single_enemy
- conditions: { creates: ["pinned"], exploits: [] }
- paramOverrides: {}
- gaps: ["pet pinning mechanic", "homing projectiles", "channeled ability mechanics"]
- reasoning: "Pet pins the target while you fire a multi-arrow volley. dmg_multihit for the 5-arrow fan and cc_root for the pet's pinning effect (target can't move). The homing and channel mechanics are design details."

---

### Ranger / Beastmaster Archer / Hunt as One (Transform)
Description: "for 4 turns, you and your pet share a single HP pool (combined), gain shared speed boosts, and every arrow fired summons a spectral duplicate of your pet that also attacks the target. On expiry, split HP is redistributed. 10 turns cooldown."

Mapping:
- effects: [buff_stat, dmg_weapon, dmg_weapon]
- targeting: tgt_self
- conditions: { creates: ["hunt_as_one_form", "shared_hp_pool", "spectral_duplicates"], exploits: [] }
- paramOverrides: { buff_stat: { stat: "movementPoints" } }
- gaps: ["shared HP pool mechanic", "spectral pet summons on arrow fire", "HP redistribution on expiry", "transform state management"]
- reasoning: "The ultimate beastmaster transform: shared HP, speed boost, and spectral pet duplicates on every shot. buff_stat covers the speed boost, first dmg_weapon for your arrow damage, second dmg_weapon for the spectral pet attack. The shared HP pool and pet-summoning mechanics are major gaps unique to the pet system."
