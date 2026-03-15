# Chronomancer (Chronoweaver) skill audit: description spirit vs. actual effects

This audit evaluates each Chronoweaver ability against the **spirit** of its description: the intended player fantasy and mechanical feel, not just keyword matching. Use it to prioritize fixes and new engine support.

**Legend**
- **Spirit match:** Good = implementation delivers the fantasy; Partial = some of the spirit, clear gaps; Missing = unmapped or placeholder; Wrong = implementation contradicts or undermines the spirit.

---

## Accelerant (Speed / Haste / Tempo)

*Identity: "Pure speed fantasy. You act more, allies act more, enemies feel slow."*

| Skill | Description | Spirit (intent) | Implementation | Spirit match | Notes |
|-------|-------------|-----------------|----------------|--------------|--------|
| **Quicken** | "Haste self for 2 turns, +30% action rate" | You get more turns/actions over 2 turns. | `apply_status` haste 2 turns (haste = +30% AP at turn start, initiative, movement). | **Good** | Haste status grants +30% AP at start of each turn for 2 turns; spirit of "30% more actions" is met. |
| **Tempo Tap** | "Basic attacks grant 2% action rate, stacks 5x" | Hitting with basics builds a resource that makes you faster (up to 10% action rate). | Not mapped. | **Missing** | Would need: per-basic-hit stacking buff (action rate or AP-like), max 5 stacks. Engine has no "action rate" stat or stacking-on-hit for this. |
| **Blink Step** | "Short-range teleport, 3 turns cooldown" | Reposition without walking; limited by cooldown. | `disp_teleport` range 4, costOverrides cooldown 3. | **Good** | Teleport + cooldown match spirit. |
| **Shared Haste** | "Quicken now also affects nearest ally" | Extend your haste fantasy to one ally. | `apply_status_self` + `apply_status` haste 2 turns (self + targeted ally). | **Good** | Same haste as Quicken on self and chosen ally; both get +30% AP at turn start for 2 turns. |
| **Flicker Strike** | "Teleport to target, strike, teleport back" | Hit and return to safety (strike from nowhere, then retreat). | `disp_teleport` (to empty hex adjacent to target) + `dmg_weapon` + `returnToStoredPositionAfterExecute`. | **Good** | Teleport to adjacent hex, strike, then caster is moved back to pre-cast position; spirit matches. |
| **Time Slip** | "10% chance to dodge by briefly skipping forward in time" | Occasionally evade attacks via time-skip flavor. | Passive: turn start → +10 dodge for 1 turn. | **Partial** | We give flat +10 dodge every turn (always on). Spirit is *probabilistic* dodge (10% per attack). Result is similar power level but different feel; no "skip forward" moment. |
| **Overclock** | "Double action rate for 1 turn, then 1 turn self-stun" | Burn out for a double turn now, pay with lost next turn. | `grant_ap` +9, `cc_stun` delay end_of_turn. | **Good** | Double AP this turn, then stun at end of turn. Spirit of "double actions, then pay" is met. |
| **Cascade** | "Kills during haste extend haste by 1 turn" | Staying in haste by getting kills while hastened. | `trg_onKill` → `extend_status` haste +1; condition `has_status: haste`. | **Good** | Only when hasted, kills extend haste. Spirit matches. |
| **Blur** | "While hasted, gain 20% evasion" | When you're in haste, you're harder to hit. | Turn start → +20 dodge for 1 turn; condition `has_status: haste`. | **Good** | Conditional evasion while hasted. Spirit matches. |
| **Temporal Surge** | "Party-wide haste, +50% speed for 3 turns, 10 turns cooldown" | Big team speed steroid, rare use. | `apply_status` temporal_surge 3 turns, tgt_all_allies (engine applies to each ally), cooldown 10. | **Good** | Party-wide +50% AP for 3 turns via temporal_surge status; all allies get it; cooldown in cost. |
| **Afterimage** | "While hasted, leave a damaging afterimage on dodge" | When you dodge while fast, the attacker gets hurt (phantom counter). | `trg_onDodge` → `dmg_to_attacker` amount 20; condition `has_status: haste`. | **Good** | While hastened, on dodge the attacker takes 20 flat damage; spirit matches. |
| **Infinite Loop** | "For 2 turns, every action you take is repeated once for free; 15 turns cooldown" | Every action doubles (cast twice, move twice, etc.). | `transform_state` 2 turns, bonusPct 100. | **Partial** | We give a generic stat transform, not literal action doubling. Spirit is "each action happens twice." Would need engine support for "repeat last action at 0 cost" or similar. |

---

## Entropy (Decay / DoT / Erosion)

*Identity: "Patient destroyer. You wither enemies over time, aging armor and flesh."*

| Skill | Description | Spirit (intent) | Implementation | Spirit match | Notes |
|-------|-------------|-----------------|----------------|--------------|--------|
| **Rust Touch** | "Melee hit applies Corrode: -5% armor for 2 turns, stacks 3x" | Melee applies stacking armor shred (up to 3× -5%). | `dmg_weapon` + `debuff_armor` 5%, 2 turns. | **Partial** | Single application matches; "stacks 3x" not implemented. Spirit of compounding armor rot is only one stack. |
| **Wither Bolt** | "Ranged bolt dealing low damage + Decay (DoT, 2 turns)" | Ranged hit + DoT (decay/aging). | `dmg_spell` + `dot_poison`. | **Good** | Low damage + DoT with duration. Decay ≈ poison DoT; spirit matches. |
| **Sap Vitality** | "Target heals 30% less for 3 turns" | Weaken their sustain. | `debuff_healReduce` 30%, 3 turns. | **Good** | Spirit and numbers match. |
| **Accelerate Rot** | "Your DoTs tick 25% faster" | Your decay/DoTs are more aggressive. | Turn start → `apply_status` accelerate_rot (1 turn); DoT tick rate 1.25× from source. | **Good** | Your DoTs tick 25% faster when you have this. Spirit matches. |
| **Frailty Aura** | "Enemies within 3 hexes take 8% more damage from all sources" | Zone of vulnerability around you. | `debuff_vuln` 8%, 1 turn, AoE 3; aura refresh. | **Good** | Radius and effect match; spirit of "enemies near you take more damage" is met. |
| **Dust to Dust** | "If target has 3+ DoTs, deal burst damage equal to 2 ticks" | Execute on heavily DoT'd targets with a burst tied to your DoTs. | `dmg_execute` (vs low HP) + exploits DoTs. | **Partial** | We have execute + DoT exploit, but not "if 3+ DoTs" gate or "2 ticks" burst formula. Spirit of "payoff when target is stacked with your rot" is approximated, not exact. |
| **Entropic Field** | "3 hexes zone: all enemies inside gain Decay, lasts 2 turns" | Place a zone that applies your decay to everyone in it. | `zone_persist` radius 3, 2 turns, dmgPerTurn 5. | **Good** | Zone applies ongoing decay (5 dmg/turn); spirit matches. |
| **Age of Ruin** | "Your DoTs reduce enemy healing received by 5% per stack" | More DoTs = more healing reduction. | Not mapped. | **Missing** | Would need: healing-received reduction that scales with your DoT stacks on target. debuff_healReduce exists but not per-DoT stacking. |
| **Crumble** | "Destroy 50% of target's remaining armor (6 turns cooldown)" | Big armor strip, limited use. | `debuff_armor` 50%, 1 turn; costOverrides cooldown 6. | **Good** | 50% armor strip + 6-turn cooldown; "remaining" approximated by flat 50%. |
| **Pandemic** | "All DoTs on target spread to enemies within 4 hexes" | Spread your rot to nearby enemies. | `dot_poison` AoE radius 3; exploits DoTs. | **Partial** | We apply poison in AoE and exploit DoTs; "spread all DoTs" would mean copying bleed/burn/poison to others. Currently one poison AoE; radius 3 vs doc 4. Spirit of "spread the rot" is partial. |
| **Temporal Rot** | "When an enemy dies with your DoTs, nearby enemies gain those DoTs at half duration" | Your rot spreads on kill. | Not mapped. | **Missing** | Would need: on death of DoT'd enemy, copy those DoT(s) to nearby enemies at half duration. Engine has no "on enemy death copy statuses to nearby." |
| **Heat Death** | "Mark a target. For 3 turns, all damage they've taken from your DoTs is recorded, then dealt again as a single burst. 15 turns cooldown." | DoT damage is banked and then detonated. | `channel_dmg` + `dmg_execute`; exploits DoTs. | **Partial** | We have channel + execute vs DoT targets; we don't "record" DoT damage and re-deal it as a burst. Spirit of "bank then burst" is not implemented; we approximate with channel/execute. |

---

## Paradox (Reality-bending / High-risk)

*Identity: "Chaotic time wizard. Powerful but unpredictable, warping cause & effect."*

| Skill | Description | Spirit (intent) | Implementation | Spirit match | Notes |
|-------|-------------|-----------------|----------------|--------------|--------|
| **Rewind** | "Restore self to HP/position from 1 turn ago, 5 turns cooldown" | Undo your last turn of damage and movement. | `heal_flat` 0 + `disp_teleport` range 99. | **Wrong** | We don't store prior HP/position; we have placeholder (no heal, long teleport). Spirit is full "undo last turn for self." Requires snapshot/rewind system. |
| **Deja Vu** | "Target repeats their last action involuntarily" | Force them to do the same thing again (e.g. waste an action or hit their ally). | `cc_stun`. | **Partial** | We stun instead of "repeat last action." Spirit is control/chaos (they repeat); we only deny turn. True implementation would need "replay last action" targeting. |
| **Stutter** | "Freeze target in time for 1 turn (stun)" | Time-stop on one enemy. | `cc_stun`. | **Good** | Stun = freeze for 1 turn. Spirit matches. |
| **Split Timeline** | "15% chance any skill activates twice" | Random double-cast. | Not mapped. | **Missing** | Would need: on skill use, 15% chance to apply effect again. No "chance to duplicate last cast" in engine. |
| **Causal Loop** | "Target takes damage equal to damage they deal for 2 turns" | Punish them for dealing damage (thorns on their actions). | `dmg_reflect` 100%, 2 turns (on target?). | **Partial** | Spirit: "damage they deal comes back at them." We have reflect on *us* (we reflect damage we take). Applying "reflect" to the *target* so they take their own damage would be a different effect (they take = damage they deal). Need to confirm: is our dmg_reflect on the debuff target (enemy) so when they hit someone they take that much? If we apply reflect to enemy, they'd take reflected damage when we hit them—wrong direction. So Causal Loop likely needs "when this unit deals damage, they take equal damage" (new effect type). |
| **Echo Cast** | "Repeat your last-used skill at 60% power, no cost" | Free, weaker copy of your previous cast. | `res_apRefund`. | **Wrong** | We only refund AP; we don't repeat the last skill at 60%. Spirit is "cast again at reduced power." Would need "repeat last ability at X% power, no cost." |
| **Schrodinger** | "When you would die, 50% chance to instead heal to 30% HP. Once per combat." | Cheat death once, randomly. | Not mapped. | **Missing** | Would need: on lethal damage, 50% chance to set HP to 30% and cancel death; once per combat. |
| **Time Bomb** | "Place a marker. After 2 turns, all damage dealt in the area during that time is repeated as AoE." | Zone that records damage then re-deals it. | `zone_persist` + `dmg_spell` AoE. | **Partial** | We have zone + spell; we don't "record damage for 2 turns then repeat as AoE." Spirit is delayed burst from accumulated damage. |
| **Fork Reality** | "Create a clone for 3 turns. It copies your attacks at 40% damage. If it dies, you take 20% max HP." | Summon that mirrors your attacks; death punishes you. | `summon_unit` (hp 0, 3 turns). | **Partial** | We have a summon; no "copies your attacks at 40%" or "if clone dies you take 20% HP." Clone behavior and penalty are missing. |
| **Grandfather** | "Erase an enemy's last action (undo their last attack, heal, or buff). 8 turns cooldown." | Turn back their last action (heal undoing, move undoing, etc.). | `debuff_stat` resolve. | **Wrong** | We apply a resolve debuff; we don't undo their last action. Spirit is pure "undo last thing they did." Would need action history + revert. |
| **Instability** | "All your skills have +20% damage but +15% variance (over/underperform)" | Higher upside, less consistency. | Not mapped. | **Missing** | Would need: global damage modifier + variance/rng on your skills. |
| **Closed Timelike** | "Rewind the entire battlefield 2 turns. All positions, HP. Only you retain memory (keep your buffs). 15 turns cooldown." | Full battlefield rewind; you keep buffs, everyone else resets. | `heal_flat` 0 + `transform_state` 0. | **Wrong** | Placeholder only. Spirit is massive: rewind all units' HP and positions 2 turns; only caster keeps buffs. Would need full rewind/snapshot system. |

---

## Summary by spirit match

| Match | Count | Skills |
|-------|--------|--------|
| **Good** | 16 | Quicken, Blink Step, Shared Haste, Flicker Strike, Overclock, Cascade, Blur, Temporal Surge, Afterimage, Wither Bolt, Sap Vitality, Accelerate Rot, Frailty Aura, Entropic Field, Crumble, Stutter |
| **Partial** | 11 | Time Slip, Infinite Loop, Rust Touch, Dust to Dust, Pandemic, Heat Death, Deja Vu, Causal Loop, Time Bomb, Fork Reality |
| **Missing** | 6 | Tempo Tap, Age of Ruin, Temporal Rot, Split Timeline, Schrodinger, Instability |
| **Wrong** | 4 | Rewind, Echo Cast, Grandfather, Closed Timelike |

---

## Recommended next steps (by impact)

1. **Quicken / Temporal Surge / Shared Haste:** Document clearly that "action rate" is implemented as initiative (turn order), not extra AP; or add optional small `grant_ap` for spirit of "act more."
2. **Flicker Strike:** Add "teleport back" (return to previous hex) if engine supports a second displacement or stored position.
3. **Afterimage:** Add effect "deal damage to attacker on dodge" and map with condition has_status haste.
4. **Echo Cast:** Implement "repeat last-used ability at X% power, no cost" (or closest: grant_ap + note "recast" is manual).
5. **Causal Loop:** Clarify: spirit is "target takes damage equal to damage they deal." Implement as debuff on target that causes them to take equal damage when they deal damage (new effect or reflect-on-dealer).
6. **Rewind / Closed Timelike:** Leave as placeholder until snapshot/rewind system exists; document in audit.
7. **Cooldowns:** Add cost overrides (cooldown turns) for Blink Step, Crumble, Temporal Surge, Grandfather, etc., so spirit of "limited use" is visible.
