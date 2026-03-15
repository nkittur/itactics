# Untestable Skills and Game Engine Requirements

This document identifies **why** certain skills cannot be fully tested against their descriptions with the current engine, and collates those gaps into a single list of **game engine requirements**. Use this before writing description-driven tests: implement the requirements (or accept approximation) so that more skills become testable.

---

## 1. What “testable” means

A skill is **testable** if we can:

1. Run the ability through the engine (unit with ability, valid target, one execution).
2. Observe outcomes (damage, statuses, position, resources) via existing components and managers.
3. Assert that the **described** behavior occurred (e.g. “bleed 8 dmg/turn for 2 turns” → target has bleed, one tick deals 8 damage).

A skill is **untestable** if the description requires behavior the engine does not implement or expose, so we cannot assert the description even when the mapping runs without error.

---

## 2. Untestable categories and reasons

Below, each category lists **why** those skills are untestable and **example descriptions** (from skill_trees / DOC_CLASSES). The following section turns these into a single list of engine requirements.

### 2.1 Evasion / Dodge

**Why untestable:** Hit resolution does not use a dodge/evasion stat. We cannot assert “X% chance to dodge” or “gain 20% evasion” because the engine never rolls or applies evasion.

**Example descriptions:**

- “10% chance to dodge by briefly skipping forward in time”
- “While hasted, gain 20% evasion”
- “While hasted, leave a damaging afterimage on **dodge**”
- “Gain +20% dodge chance and reaction speed”
- “allies inside gain 20% evasion”
- “Automatically dodge the next attack that would deal more than 15% of your max HP”
- “When you successfully dodge an attack, automatically riposte…”
- “for 2 turns, you dodge all attacks automatically”

**Engine gap:** No dodge/evasion in hit resolution; no “attack was dodged” event for on-dodge effects.

---

### 2.2 Auras (persistent radius effects centered on caster)

**Why untestable:** There is no aura system. Descriptions like “enemies within 3 hexes take 8% more damage” require a persistent, moving zone or aura component that applies/refreshes effects each turn. We only have one-off zones (zone_persist) and no “center on caster and update each turn.”

**Example descriptions:**

- “Enemies within 3 hexes take 8% more damage from all sources” (Frailty Aura)
- “Enemies within 3 hexes lose 2% max HP per turn” (Rot Aura)
- “Enemies within 3 hexes deal 10% less damage” (Discordant Aura)
- “Enemies within 3 hexes periodically lose 1 action to hallucinations”
- “Nearby allies gain +10% physical damage while you are in melee combat”
- “Emit intense cold in a 2 hexes radius; enemy movement in this aura is halved”
- “Passively radiate dread; enemies within 3 hexes have a 15% chance to flinch on each attack”
- “Allies within 3 hexes gain 10% increased critical hit chance”

**Engine gap:** No aura (persistent, caster-centered, per-turn application of buff/debuff in radius).

---

### 2.3 Passives / reactives with triggers (when X, do Y)

**Why untestable:** Many passives are “when you do X” or “when X happens, Y.” The ruleset can define triggers, but (a) not all trigger types are wired (e.g. onTakeDamage, onDodge, onAllyBelowHP), and (b) trigger data is often not present in the built ruleset from the doc, so we cannot run “when you kill, extend haste” and assert it.

**Example descriptions:**

- “When an enemy dies with your DoTs, nearby enemies gain those DoTs at half duration”
- “When you would die, 50% chance to instead heal to 30% HP. Once per combat.”
- “When hit, 25% chance to root attacker for 1 turn”
- “When your HoTs overheal, store excess as a shield (max 20% HP)”
- “When you take a crit, emit a damaging pulse (3 hexes)”
- “When a construct dies, it explodes for AoE fire damage”
- “When you take damage, the attacker suffers 25% of the damage as psychic reflection”
- “When you switch Chants, all allies within range receive a 2 turns burst…”
- “On killing blow, passively capture a Soul Essence (max 10 stored)”
- “When you hold 10 Essence, your next ability is automatically cast at 150% power”
- “Trigger automatically when an ally drops below 10% HP; instantly transfer 20% of your HP to them”
- “When you drop below 15% HP, gain a 2 turns window of damage immunity (once per fight)”
- “When you are pulled or pushed, automatically redirect that force to a nearby enemy within 2 hexes”
- “When your Psi Ward absorbs a hit exceeding 20% of its capacity, reflect 40%…”

**Engine gap:** Triggers (onKill, onHit, onTakeDamage, onAllyBelowHP, etc.) must be (1) wired in combat flow, (2) storable in ruleset/mapping, and (3) fired with correct target (e.g. attacker for onTakeDamage).

---

### 2.4 Reactive: on take damage / on hit

**Why untestable:** “When you take damage” or “when hit” effects (reflect, root attacker, etc.) need a hook at damage application that fires passives/reactives and can apply an effect to the **attacker**. Without that, we cannot test “when hit, 25% chance to root attacker.”

**Example descriptions:**

- “When hit, 25% chance to root attacker for 1 turn”
- “Reflect 10% of melee damage taken back to attacker”
- “When you take damage, the attacker suffers 25% of the damage as psychic reflection”
- “When struck in melee, automatically sprout a quartz spike; deals 80% weapon damage to the attacker”
- “After a successful dodge in Water Stance, automatically counter-attack…”

**Engine gap:** `trg_onTakeDamage` (and optionally onHit) must be invoked when damage is applied, with (victimId, attackerId, amount); triggered effect must be applicable to attacker.

---

### 2.5 Custom resources (Fury, Rhythm, Essence, etc.)

**Why untestable:** Descriptions refer to resources that do not exist in the engine (no Fury, Rhythm, Soul Essence, etc.). We cannot assert “Spend 5 Fury” or “generate 1 Rhythm” or “store Essence on kill.”

**Example descriptions:**

- “Each enemy hit by your AoEs grants you +5% damage for 2 turns (stacks)” (implied resource or stacking buff)
- “A quick strike that initiates your combo chain; generates 1 Rhythm”
- “Consume all Rhythm; deal damage equal to 15x Rhythm stacks…”
- “On killing blow, passively capture a Soul Essence from the target (max 10 stored)”
- “Spend 1 Essence to hurl a condensed soul shard…”
- “Spend 2 Essence to wrap yourself in soul-energy; absorb the next instance of damage”
- “25% of all bleed damage you inflict is returned to you as **Fury**, and at 50+ Fury you gain 1% HP regeneration per second”

**Engine gap:** Resource system (define resources, grant/spend on actions, cap, UI optional for tests). Large scope; currently out of scope in main plan.

---

### 2.6 Rewind / undo (restore state to N turns ago)

**Why untestable:** “Restore self to HP/position from 1 turn ago” or “rewind the entire battlefield 2 turns” requires either (a) stored prior state (HP, position, buffs) per entity per turn, or (b) full replay. Engine does not store or restore prior state.

**Example descriptions:**

- “Restore self to HP/position from 1 turn ago, 5 turns cooldown”
- “Erase an enemy's last action (undo their last attack, heal, or buff)”
- “Rewind the entire battlefield 2 turns. All positions, HP. Only you retain memory (keep your buffs).”
- “Roll back your personal state by 2 turns; undo all damage taken and all actions made…”
- “When hit despite precognition for more than 25% HP damage, rewind 1 turn (only your position and HP; enemies retain their states) and dodge the attack properly”
- “Rewind your own position and HP to 1 turn ago; enemies lose your current position…”
- “Choose a point in the last 12 seconds and rewind the entire battlefield to that moment…”

**Engine gap:** State snapshots (per entity, per turn or per timestamp) and a rewind/restore API. Large scope; deferred.

---

### 2.7 Delayed / mark-and-burst effects

**Why untestable:** “Mark a target; after 3 turns, all damage they've taken from your DoTs is dealt again as a single burst” requires (a) recording damage-by-source over time, and (b) a delayed resolution (after N turns). Engine has no generic “mark + resolve later” or damage ledger.

**Example descriptions:**

- “Mark a target. for 3 turns, all damage they've taken from your DoTs is recorded, then dealt again as a single burst.” (Heat Death)
- “Select a target. A fungal infection grows on them over 3 turns. At full growth, it detonates: lethal to non-bosses, 40% max HP to bosses.”
- “Place a marker. after 2 turns, all damage dealt in the area during that time is repeated as AoE.”
- “Implant a psychic time bomb; after 2 turns the bomb detonates, dealing 200% psychic damage…”

**Engine gap:** Delayed effect resolution (schedule effect at “end of N turns”) and/or damage ledger per target per source.

---

### 2.8 Percentage of max HP (damage or heal)

**Why untestable:** Many descriptions use “X% max HP per turn” or “deal 40% max HP.” DoT and execute effects currently use flat or weapon-based values; we do not resolve “target’s max HP” in the effect params. We could approximate with a fixed target in tests, but the **mapping** would need to pass maxHP% and the engine would need to resolve it from the target at execution time.

**Example descriptions:**

- “Induce internal bleeding; apply a Bleed DoT dealing 3% max HP per turn for 2 turns.”
- “Enemies within 3 hexes lose 2% max HP per turn”
- “Regen 1% max HP per turn while not taking damage”
- “All allies regen 5% max HP/s”
- “Barkskin now also grants +15% max HP while active”
- “Trigger automatically when an ally drops below 10% HP; instantly transfer 20% of your HP to them”
- “At full growth, it detonates: lethal to non-bosses, 40% max HP to bosses”

**Engine gap:** Effect params or a modifier that resolves “target (or self) max HP” and applies percentage (e.g. dmgPerTurn as % of target max HP, or heal as % of target max HP). Small extension if we add one param (e.g. `pctMaxHp`) and resolve in executor.

---

### 2.9 DoT tick rate / “DoTs tick faster”

**Why untestable:** “Your DoTs tick 25% faster” implies a modifier on the **source** that changes how often or how much DoT ticks. Current tick is once per turn at a fixed rate; there is no per-source tick rate multiplier.

**Example descriptions:**

- “Your DoTs tick 25% faster” (Accelerate Rot)
- “Kills during haste extend haste by 1 turn” (extend buff on kill)

**Engine gap:** Tick rate multiplier (or equivalent: same duration, more damage per tick) keyed by DoT applier; “extend status on kill” for the killer.

---

### 2.10 Conditional damage (if target has 3+ DoTs, then…)

**Why untestable:** “If target has 3+ DoTs, deal burst damage equal to 2 ticks” requires the engine to (a) count distinct DoT types or stacks on target, and (b) gate an effect (e.g. dmg_execute or a special burst) on that condition. We have execute threshold by HP% but not “if target has N+ statuses of type DoT.”

**Example descriptions:**

- “If target has 3+ DoTs, deal burst damage equal to 2 ticks” (Dust to Dust)
- “Consume Poison stacks on target for burst damage”
- “Consume all Resonance stacks. Deal burst damage scaling with stacks consumed (big payoff at 5+)”

**Engine gap:** Conditional effect: “if target has at least N stacks (or N distinct DoTs), then apply effect.” Could be a param on dmg_execute (e.g. `requireDotStacks: 3`) or a dedicated condition check before applying a follow-up effect.

---

### 2.11 Spread / copy effects (DoTs or status to nearby)

**Why untestable:** “All DoTs on target spread to enemies within 4 hexes” or “when target dies, nearby enemies gain those DoTs at half duration” requires (a) enumerating DoTs on a unit, (b) finding units in radius, and (c) applying copies (possibly with reduced duration). No generic “spread status to radius” effect.

**Example descriptions:**

- “All DoTs on target spread to enemies within 4 hexes” (Pandemic)
- “When an enemy dies with your DoTs, nearby enemies gain those DoTs at half duration”
- “When you apply Resonance to a target, nearby enemies gain 1 stack too (1 hex radius)”
- “Infect target. If they die within 3 turns, a fungal minion rises from their corpse for 4 turns.”

**Engine gap:** Effect type or script: “spread status(es) from target to enemies in radius” with optional duration multiplier; or “on death of target, apply status to entities in radius.”

---

### 2.12 “Cannot be dodged / blocked” (hit guarantee)

**Why untestable:** Descriptions say “this attack cannot be dodged” or “ignores evasion.” To test that, we need (a) evasion to exist, and (b) a flag on the attack that bypasses evasion. Without (a), (b) is untestable.

**Example descriptions:**

- “for 3 turns, your attacks cannot be blocked, parried, or dodged”
- “Perform an instantaneous draw-and-fire that cannot be dodged”
- “Fire a single spirit-possessed arrow that cannot be blocked, phased, or dodged”
- “this attack ignores all damage reduction, cannot be blocked or dodged”

**Engine gap:** After evasion exists: “ignore dodge” / “true hit” flag on attack resolution.

---

### 2.13 Terrain / structure / environmental

**Why untestable:** “Destroy a structure,” “create rough ground,” “collapse after 2 turns dealing 200 damage to anyone underneath” require terrain or structure entities, placement, and delayed or trigger-based effects. Engine has terrain for movement/LoS but not first-class “structure” or “trap that triggers when enemy steps.”

**Example descriptions:**

- “Target a structure or terrain feature… after 2 turns, it collapses, dealing 200 damage to anyone underneath and creating rough ground.”
- “Summon a line of thorns (3 hexes). Enemies crossing take damage and are slowed 50% for 1 turn.”
- “Place a marker. after 2 turns, all damage dealt in the area during that time is repeated as AoE.”

**Engine gap:** Structures, terrain hazards, or “trap” entities that trigger on movement or after N turns; damage in area. Partially present (trap_place, zone_persist) but not full “structure + delayed collapse.”

---

### 2.14 Clone / copy / “repeat last action”

**Why untestable:** “Create a clone of yourself for 3 turns. It copies your attacks at 40% damage” and “Target repeats their last action involuntarily” require (a) spawning a second unit that mirrors or repeats the caster, or (b) recording and replaying the target’s last action. No clone or action-replay system.

**Example descriptions:**

- “Create a clone of yourself for 3 turns. It copies your attacks at 40% damage. If it dies, you take 20% of your max HP.”
- “Target repeats their last action involuntarily” (Deja Vu)
- “Repeat your last-used skill at 60% power, no cost” (Echo Cast — we approximate with AP refund, but “repeat last skill” is not implemented)

**Engine gap:** Clone/summon that mirrors caster’s actions at reduced power; or “store target’s last action and force re-apply” (large).

---

## 3. Collated game engine requirements

Use this list when deciding what to implement so that description-driven tests can be written. Items are ordered by dependency and impact; “Must” means many skills depend on it; “Should” means a meaningful subset; “Later” means out of scope for the current plan.

| # | Requirement | Why | Example skills | Phase in plan |
|---|--------------|-----|----------------|----------------|
| **R1** | **Evasion / dodge in hit resolution** | Descriptions: “X% dodge,” “gain evasion,” “on dodge do Y.” Without evasion, none of these are testable. | Time Slip, Blur, Afterimage, many others | Phase 1 |
| **R2** | **On-dodge event** | “When you dodge, riposte” etc. Requires engine to emit “attack was dodged” (e.g. when hit roll fails due to evasion). | Afterimage, Water Stance counter, Prescient Step | After R1 |
| **R3** | **Auras (persistent, caster-centered, radius)** | “Enemies within X hexes take Y% more damage” etc. Need apply/refresh each turn in radius. | Frailty Aura, Rot Aura, Discordant Aura, many auras | Phase 2 |
| **R4** | **Trigger data in ruleset + wiring** | Passives “when you kill / when hit / turn start” must be stored in mapping and fired by TriggerSystem. | Cascade, Thorn Coat, onKill extend haste | Phase 3 |
| **R5** | **On-take-damage (reactive)** | “When you take damage, reflect / root attacker.” Hook at damage application, fire trigger, apply effect to attacker. | Briar Lash, reflect passives, “when hit root” | Phase 4 |
| **R6** | **DoT tick rate modifier (source)** | “Your DoTs tick 25% faster.” Per-source multiplier on periodic damage. | Accelerate Rot | Phase 5 |
| **R7** | **Extend buff on kill** | “Kills during haste extend haste by 1 turn.” OnKill trigger + “extend_status” effect. | Cascade | Phase 5 |
| **R8** | **% max HP in effects** | “3% max HP per turn” bleed, “20% of your HP to ally.” Resolve target (or self) max HP and apply percentage. | Hemorrhage, Rot Aura, many heals | Small extension |
| **R9** | **Conditional effect: “if target has N+ DoTs/stacks”** | “If target has 3+ DoTs, deal burst.” Gate effect on status count or stack count. | Dust to Dust, consume-stack bursts | New effect or param |
| **R10** | **Spread status to radius (on condition or on death)** | “DoTs on target spread to enemies in 4 hexes”; “on death, nearby gain DoTs at half duration.” | Pandemic, Temporal Rot, infection-on-death | New effect type |
| **R11** | **Delayed / mark-and-burst** | “Mark target; after 3 turns deal stored DoT damage as burst.” Damage ledger or scheduled resolution. | Heat Death, fungal detonate, time bomb | Larger feature |
| **R12** | **“Ignore dodge” / true hit** | “This attack cannot be dodged.” Flag on attack that bypasses evasion. | Several ultimates, feint finishers | After R1 |
| **R13** | **Custom resources (Fury, Rhythm, Essence)** | “Spend Fury,” “generate Rhythm,” “store Essence on kill.” Resource definitions + grant/spend. | Many class-specific mechanics | Out of scope (later) |
| **R14** | **Rewind / state restore** | “Restore to HP/position 1 turn ago”; “rewind battlefield 2 turns.” State snapshots + restore. | Rewind, Grandfather, full rewind ultimates | Out of scope (later) |
| **R15** | **Clone / repeat last action** | “Clone copies your attacks”; “target repeats last action.” Clone AI or action replay. | Fork Reality, Deja Vu, Echo Cast (full) | Out of scope (later) |
| **R16** | **Structures / terrain hazards / traps (full)** | “Structure collapses after 2 turns”; “enemies crossing take damage.” Triggers and delayed area damage. | Seismologist Crumble, thorn line, rune wards | Partially present; extend |

---

## 4. How to use this doc

1. **Before writing description-driven tests**  
   For each ability, check if its description needs any of R1–R16. If it does and that requirement is not implemented, the skill is **untestable** as stated; either mark it “untestable until Rk” or add an approximation and document the gap.

2. **When implementing engine work**  
   Use the “Phase in plan” column and the existing `engine-support-all-mappings-plan.md` so that R1–R7 align with Phases 1–5. R8–R12 are small or medium extensions; R13–R16 are explicitly later/out of scope.

3. **Audit script**  
   Optionally, extend the audit script to tag abilities with “untestable_reason: R2, R3” (or similar) by matching description text to the categories in §2, so the list of untestable skills is generated from the doc and kept in sync.

---

## 5. Summary

- **Untestable** = description requires behavior the engine does not implement or expose.
- **Main blockers:** Evasion (R1), auras (R3), trigger wiring (R4), on-take-damage (R5), then DoT rate and extend-on-kill (R6–R7). Implementing R1–R7 makes a large subset of skills testable.
- **Smaller extensions:** % max HP (R8), conditional-on-stacks (R9), spread-to-radius (R10) — each unlocks a batch of skills.
- **Deferred:** Custom resources (R13), rewind (R14), clone/repeat (R15), full structures (R16). Skills that depend only on these can be listed as “untestable until later” or approximated for now.
