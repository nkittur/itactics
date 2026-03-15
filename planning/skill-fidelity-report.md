# Skill fidelity report: description vs implementation

For each **mapped** skill, this report compares the design-doc description to the current engine behavior and notes any difference (even slight). Generated/manual audit; update when changing mappings or engine.

---

## Chronoweaver — Accelerant

| Skill | Description | Implementation | Difference |
|-------|-------------|----------------|------------|
| **Quicken** | Haste self for 2 turns, +30% action rate | `buff_stat` initiative +30, 2 turns | **Match.** Initiative 30 approximates 30% faster. |
| **Blink Step** | Short-range teleport, 3 turns cooldown | `disp_teleport` range 4 | Cooldown not in cost (engine uses default). |
| **Shared Haste** | Quicken now also affects nearest ally | `buff_stat` initiative +30, 2 turns on single ally | **Match.** |
| **Flicker Strike** | Teleport to target, strike, teleport back | `disp_teleport` + `dmg_weapon` (teleport to target, strike) | No "teleport back"; single teleport to target then strike. |
| **Time Slip** | 10% chance to dodge by briefly skipping forward in time | Passive: turn start → +10 dodge for 1 turn | **Approx.** Flat +10 dodge each turn; no RNG "10% chance" per hit. |
| **Overclock** | Double action rate for 1 turn, then 1 turn self-stun | `grant_ap` +9 (double AP this turn); `cc_stun` with `delay: "end_of_turn"` | **Match.** Spirit is double action *points*; we grant +9 AP (uncapped), then stun at end of turn. |
| **Cascade** | Kills during haste extend haste by 1 turn | `trg_onKill` → `extend_status` haste +1 turn; **condition** `has_status: haste` so only fires when hasted | **Match.** |
| **Blur** | While hasted, gain 20% evasion | Passive: turn start → +20 dodge for 1 turn; **condition** `has_status: haste` | **Match.** Engine supports "while [condition]" on triggers. |
| **Temporal Surge** | Party-wide haste, +50% speed for 3 turns, 10 turns cooldown | `buff_stat` initiative +50, 3 turns, all allies | Cooldown 10 not in cost; initiative 50 approximates 50% speed. |
| **Afterimage** | While hasted, leave a damaging afterimage on dodge | Not mapped (or theme fallback) | — |
| **Infinite Loop** | For 2 turns, every action you take is repeated once for free; 15 turns cooldown | `transform_state` 2 turns, bonusPct 100 | Action-doubling is conceptual (transform); no literal "repeat action." |

---

## Chronoweaver — Entropy

| Skill | Description | Implementation | Difference |
|-------|-------------|----------------|------------|
| **Rust Touch** | Melee hit applies Corrode: -5% armor for 2 turns, stacks 3x | `dmg_weapon` + `debuff_armor` pct 5, 2 turns | Stacks 3x not implemented (single application). |
| **Wither Bolt** | Ranged bolt + Decay (DoT, 2 turns) | `dmg_spell` + `dot_poison` | **Match** (Decay ≈ poison DoT). |
| **Sap Vitality** | Target heals 30% less for 3 turns | `debuff_healReduce` 30%, 3 turns | **Match.** |
| **Accelerate Rot** | Your DoTs tick 25% faster | Passive: turn start → `apply_status` accelerate_rot (1 turn); DoT tick rate 1.25× from source | **Match.** |
| **Frailty Aura** | Enemies within 3 hexes take 8% more damage | `debuff_vuln` bonusDmg 8, 1 turn, AoE radius 3; aura refresh | **Match.** |
| **Dust to Dust** | If target has 3+ DoTs, deal burst damage equal to 2 ticks | `dmg_execute` (vs low HP) + exploits DoTs | Conditional "3+ DoTs" and "2 ticks" damage not exact. |
| **Entropic Field** | 3 hexes zone: enemies gain Decay, 2 turns | `zone_persist` radius 3, 2 turns, dmgPerTurn 0 | Zone applies damage/heal per turn; "Decay" as DoT per turn. |
| **Crumble** | Destroy 50% of target's remaining armor (6 turns cooldown) | `debuff_armor` 50%, 1 turn | Cooldown not in cost. |
| **Pandemic** | All DoTs on target spread to enemies within 4 hexes | `dot_poison` AoE radius 3; exploits DoTs | "Spread" is AoE poison; 4 hexes vs 3 in targeting. |
| **Heat Death** | Channel + execute vs DoT targets | `channel_dmg` + `dmg_execute`; exploits DoTs | **Approx.** |

---

## Chronoweaver — Paradox

| Skill | Description | Implementation | Difference |
|-------|-------------|----------------|------------|
| **Rewind** | Heal + return to previous position | `heal_flat` amount 0 + `disp_teleport` range 99 | Zero heal override; "previous position" not stored. |
| **Deja Vu** | Stun from temporal echo | `cc_stun` | **Match.** |
| **Stutter** | Brief stun | `cc_stun` | **Match.** |
| **Closed Timelike** | Rewind battlefield 2 turns; only you keep buffs | `heal_flat` + `transform_state` (overrides 0) | Full rewind not implemented; placeholder effects. |

---

## Ironbloom Warden — Thornwall / Overgrowth / Rot Herald

| Skill | Description | Implementation | Difference |
|-------|-------------|----------------|------------|
| **Thorn Coat** | Reflect 10% of melee damage taken back to attacker | `trg_onTakeDamage` → `dmg_reflect` 10% | **Match.** |
| **Briar Lash** | When hit, 25% chance to root attacker for 1 turn | `trg_onTakeDamage` → `cc_root` 1 turn on attacker | **Difference:** 100% chance; no 25% RNG. |
| **Barkskin** | Defensive buff | `buff_dmgReduce` / `buff_stat` | — |
| **Rejuvenate** | Heal over time / regen | `heal_hot` | — |
| **Seedling** | Plant that pulses heals in 2 hexes, 3 turns | `summon_unit` + `heal_hot` | Override params (hp=0, healPerTurn=0) for placeholder. |
| **Gaia's Embrace** | Battlefield overgrown; allies regen, enemies slowed, seedlings | `heal_hot` + `debuff_stat` + `summon_unit` + `zone_persist` | Overrides for placeholders. |
| **Fungal Growth** | Plant that poisons in 2 hexes | `summon_unit` + `zone_persist` | — |

---

## Echo Dancer / Bladesinger / Blood Alchemist / Hexblade / etc.

For all other mapped skills, the same pattern applies:

- **Exact match:** Params and behavior align with the description (e.g. Thorn Coat, Cascade, Frailty Aura, Sap Vitality).
- **Param match, cooldown missing:** Many actives have "N turns cooldown" in the doc; engine cost often uses default (no cooldown) unless we add cost overrides.
- **Approximation:** Custom resources (Rhythm, Resonance, Fury, etc.) are not implemented; we map to closest effect (e.g. execute damage, vulnerability) and note "References custom resource system."
- **Override = 0 or special:** Some mappings use `effectParamOverrides` to zero out values (e.g. `heal_flat.amount=0`, `transform_state.bonusPct=0`) where the real behavior would require new systems (e.g. rewind, full transform).

---

## Summary of slight differences (quick reference)

| Topic | Description | Implementation | Note |
|-------|-------------|----------------|------|
| Quicken / Temporal Surge | +30% / +50% action rate | initiative +30 / +50 | Flat initiative approximates % action rate. |
| Time Slip | 10% chance to dodge | +10 dodge every turn | No per-hit RNG. |
| Blur / Cascade | While X / during haste | Trigger **condition** `has_status` | **Match.** |
| Overclock | Haste then stun | Effect **delay** `end_of_turn` | **Match.** |
| Briar Lash | 25% chance to root attacker | 100% root | No chance roll. |
| Flicker Strike | Teleport to target, strike, teleport back | Teleport to target + strike | No return teleport. |
| Cooldowns | "N turns cooldown" in many skills | Often default (0) in cost | Add cost overrides to match. |
| Stacks | "Stacks 3x", "per stack" | Single application or no stacking | Stacking mechanics not full. |

---

## How to update

1. When changing a mapping in `AbilityEffectMappings.ts`, update the corresponding row in this report.
2. When adding engine behavior (e.g. delayed effects, chance on trigger), fix the mapping and move the skill from "Difference" to "Match" or "Approx."
3. Re-run `npx ts-node scripts/audit-skill-descriptions.ts` to refresh the TSV; use it to find unmapped or low-score skills.
