# Audit: skill_trees.txt vs Game Engine Fidelity

This document compares the skills and mechanics described in `skills/skill_trees.txt` (and its parsed form in `SkillTreeContent.ts`) with what the game engine actually implements and executes.

---

## 1. Executive Summary

| Metric | Value |
|--------|--------|
| **Design-doc abilities** (parsed) | ~3,744 (104 classes × 3 archetypes × ~12 each) |
| **Explicit effect mappings** | ~230 (in `AbilityEffectMappings.ts`) |
| **Coverage** | ~6% of abilities have a dedicated mapping; the rest get a **fallback**: `dmg_weapon` only + `notFullyImplemented: true` |
| **Engine effect types** | 35+ (damage, DoTs, CC, buffs, debuffs, displacement, summons, zones, etc.) — see §3 |
| **Verdict** | The engine can execute a **subset** of design-doc ideas faithfully when a mapping exists. Many design-doc mechanics (custom resources, auras, reactive triggers, “repeat action”, “undo”, etc.) have **no or only partial** support, so those abilities either fall back to basic weapon damage or approximate the fantasy loosely. |

---

## 2. How Abilities Get From Design Doc to Execution

1. **Source:** `skills/skill_trees.txt` is parsed (e.g. via `parse-skill-trees.ts`) into `DOC_CLASSES` in `SkillTreeContent.ts` (class → archetype → ability name, type, description, tier).
2. **Ruleset build:** `buildRulesetFromDoc.ts` builds the default ruleset. For each doc ability it looks up **`ABILITY_EFFECT_MAPPINGS[abilityName.toLowerCase()]`** in `AbilityEffectMappings.ts`.
3. **If a mapping exists:** The ability gets that mapping’s `effects` (engine `EffectType`s) and `targeting`. Default params come from `defaultEffectParams.ts`; overrides come from the mapping.
4. **If no mapping exists:** The ability gets `notFullyImplemented: true`, targeting `tgt_single_enemy`, and a single effect `dmg_weapon` (multiplier 1). So **unmapped abilities still run** but only as “basic weapon hit” with no special behavior.
5. **At runtime:** `AbilityResolver` turns ruleset abilities into `GeneratedAbility`; `CombatManager` uses `AbilityExecutor` to run each effect. So **only** the effect types implemented in `AbilityExecutor.executeEffect()` are actually executed.

So “faithful” execution means: the ability has a mapping whose effect types match the design, and the engine implements those effect types and parameters in line with the doc (e.g. duration, radius, damage formula).

---

## 3. Engine Effect Types (What the Engine Can Do)

The following are implemented in `AbilityExecutor` and `AbilityData` (effect types + targeting). Design-doc concepts that map cleanly are noted.

| Effect type | Engine support | Design-doc analogue |
|-------------|----------------|---------------------|
| **Damage** | | |
| `dmg_weapon` | ✅ Full | Basic / scaled weapon attacks |
| `dmg_execute` | ✅ Full | Execute / bonus vs low HP |
| `dmg_multihit` | ✅ Full | Multi-hit attacks |
| `dmg_spell` | ✅ Full | Spell/magic damage |
| `dmg_reflect` | ✅ Full | Reflect damage (e.g. Causal Loop) |
| **DoTs** | | |
| `dot_bleed` | ✅ Full | Bleed |
| `dot_burn` | ✅ Full | Burn |
| `dot_poison` | ✅ Full | Poison / Decay (design “Decay” often mapped here) |
| **Displacement** | | |
| `disp_push` | ✅ Full | Knockback |
| `disp_pull` | ✅ Full | Pull |
| `disp_dash` | ✅ Full | Dash/charge (optional damage on arrival) |
| `disp_teleport` | ✅ Full | Teleport / Blink |
| **Crowd control** | | |
| `cc_stun` | ✅ Full | Stun |
| `cc_root` | ✅ Full | Root |
| `cc_daze` | ✅ Full | Daze (AP loss) |
| `cc_fear` | ✅ Full | Fear (flee) |
| `cc_silence` | ✅ Full | Silence |
| `cc_taunt` | ✅ Full | Taunt |
| `cc_charm` | ✅ Full | Charm |
| **Debuffs** | | |
| `debuff_stat` | ✅ Full | Stat reduction (armor, accuracy, etc.) |
| `debuff_vuln` | ✅ Full | Vulnerability (bonus damage taken) |
| `debuff_armor` | ✅ Full | Armor shred / Corrode |
| `debuff_healReduce` | ✅ Full | Healing reduction (e.g. Sap Vitality) |
| **Buffs** | | |
| `buff_stat` | ✅ Full | Stat buff (e.g. initiative for “haste”) |
| `buff_dmgReduce` | ✅ Full | Damage reduction (e.g. Barkskin) |
| `buff_stealth` | ✅ Full | Stealth (break-on-attack option) |
| `buff_shield` | ✅ Full | Absorb shield |
| **Stances** | | |
| `stance_counter` | ✅ Full | Counter-attack stance |
| `stance_overwatch` | ✅ Full | Overwatch stance |
| **Resources / utility** | | |
| `res_apRefund` | ✅ Full | AP refund (e.g. on kill) |
| `heal_flat` | ✅ Full | Flat heal |
| `heal_hot` | ✅ Full | Heal over time |
| `heal_pctDmg` / `lifesteal` | ✅ Full | Lifesteal |
| **Summons / zones / traps** | | |
| `summon_unit` | ✅ Full | Summon (via SummonManager) |
| `zone_persist` | ✅ Full | Persistent zone (ZoneManager) |
| `trap_place` | ✅ Full | Trap |
| **Other** | | |
| `channel_dmg` | ✅ Partial | Channeled damage (simplified) |
| `transform_state` | ✅ Partial | Temporary stat/behavior change (used for ults, “repeat action” approximated) |
| `cleanse` | ✅ Full | Remove debuffs |
| `cooldown_reset` | ✅ Full | Reset cooldowns |

**Targeting:** The engine supports single enemy/ally/self, AoE (adjacent, cone, line, radius 2/3), and all-allies / all-enemies. That covers most “single target” and “small AoE” skills in the doc; very large radii (e.g. “20m”) are typically scaled down to radius2/3 in mappings.

---

## 4. Design-Doc Mechanics With No or Partial Engine Support

These appear repeatedly in `skill_trees.txt` but either have no dedicated effect type or are only approximated.

| Mechanic | In design doc | Engine reality |
|----------|----------------|-----------------|
| **Action speed / haste** | Quicken, Overclock, Temporal Surge: “+30% action speed”, “double action rate” | Mapped to `buff_stat` (initiative). Initiative affects turn order, not true “extra actions” or “faster ticks”. So **partial**: feels like “go sooner” more than “act twice”. |
| **Evasion / dodge %** | Time Slip, Blur: “10% dodge”, “20% evasion while hasted” | No engine effect for “grant X% dodge/evasion”. Could be approximated by a defensive stat modifier if such a stat existed. **Missing.** |
| **“Repeat last action” / Echo** | Echo Cast, Deja Vu, Infinite Loop | No “repeat previous skill” or “target repeats last action”. Infinite Loop mapped to `transform_state` (bonus%); Echo Cast to `res_apRefund`. **Not faithful.** |
| **Undo / rewind** | Rewind, Grandfather, Closed Timelike Curve | Rewind → heal + teleport (position reset only). Grandfather → debuff. No “undo last action” or “rewind battlefield state”. **Partial or missing.** |
| **Passives (stacking, conditions)** | Tempo Tap, Cascade, Blur, Afterimage, Accelerate Rot, Age of Ruin, etc. | Passives are in the ruleset but **trigger-based passives** (on hit, on kill, on dodge, “while hasted”) need PassiveResolver/TriggerSystem and data. Many passives have **no mapping** and thus no trigger data; they fall back to dmg_weapon. **Mostly missing.** |
| **Auras (persistent AoE buff/debuff)** | Frailty Aura, Primal Presence, Discordant Aura, Chant of Iron, etc. | No “aura” effect type. Can approximate with `zone_persist` or repeated application; most aura abilities are **unmapped**. **Missing.** |
| **Reactive (on hit / on take damage)** | Thorn Coat, Briar Lash, Last Breath Surge, Spell Parry, etc. | `dmg_reflect` exists; true “when hit, do X” or “when you take damage, trigger Y” is in TriggerSystem but not wired to most design-doc reactives. **Partial.** |
| **Custom resources** | Fury, Rhythm, Resonance, Blood, etc. | ResourceManager and resource defs exist, but abilities that “build Fury”, “spend Rhythm”, “apply Resonance stacks” are not fully wired. Mappings often use a generic buff/debuff instead. **Partial.** |
| **DoT tick rate / duration modifiers** | “Your DoTs tick 25% faster”, “extend haste by 1 turn on kill” | No engine knob for “DoT tick rate” or “extend buff on kill”. **Missing.** |
| **Conditional damage (e.g. “if 3+ DoTs”)** | Dust to Dust | Mapped to `dmg_execute` with synergy tags; exploit bonus is applied. So **partially faithful** if target has DoTs. |
| **“On dodge” / “on miss” effects** | Afterimage | No “when you dodge, deal damage” trigger. **Missing.** |
| **Lethal / execute vs non-boss** | Heat Death, The Spreading (lethal to non-bosses, % to bosses) | No “lethal below X%” or “different effect vs boss” in effect params. **Missing.** |
| **Cooldown manipulation** | “Cooldowns reset every 2.5s”, “cooldowns frozen” | `cooldown_reset` exists for self; no “freeze target’s cooldowns” or “reduce all cooldowns by X”. **Partial.** |

---

## 5. Fidelity When a Mapping Exists

For the **~230 mapped abilities**:

- **Targeting and cost** are respected (AP, stamina, mana, cooldown, turn-ending) from the ruleset.
- **Effect execution** is faithful **to the mapped effect types**, not necessarily to the full design text. Examples:
  - **Quicken:** Doc says “haste self, +30% action speed”. Mapping: `buff_stat` (initiative). Engine does not have “action speed”; it has initiative. So behavior is “move earlier in turn order”, not “more actions per turn”. **Approximation.**
  - **Rust Touch:** Doc says “Corrode: -5% armor, stacks 3x”. Mapping: `dmg_weapon` + `debuff_armor` (pct, turns). Engine applies armor debuff; stacking behavior depends on status effect def. **Largely faithful.**
  - **Flicker Strike:** “Teleport to target, strike, teleport back”. Mapping: `disp_teleport` + `dmg_weapon`. Engine does teleport + damage; “teleport back” is not implemented (no second teleport). **Partial.**
  - **Closed Timelike Curve:** Doc: “Rewind entire battlefield 6s”. Mapping: `heal_flat` + `transform_state` with overrides to 0. Implemented as a placeholder; no real rewind. **Not faithful.**

So: **the engine faithfully runs the effect list in the mapping**; it does **not** automatically implement every nuance in the design doc (e.g. “teleport back”, “rewind battlefield”, “only you retain memory”).

---

## 6. Recommendations

1. **Increase mappings for high-impact abilities**  
   Prioritize one or two classes or archetypes and add mappings so they play close to the doc (e.g. Chronoweaver Entropy, Ironbloom Thornwall). That improves perceived fidelity even if the rest still fall back to `dmg_weapon`.

2. **Extend the engine for the most repeated gaps**  
   - **Evasion / dodge:** Either a stat modifier (e.g. “dodge” in stats) or a status that influences hit chance.  
   - **Auras:** An “aura” effect type or a convention using `zone_persist` + onStandEffect that applies a debuff/buff in an area around the caster.  
   - **Passives:** Ensure PassiveResolver and TriggerSystem are wired to ruleset passives (trg_onHit, trg_onKill, trg_turnStart, etc.) and that unmapped passives get at least a trigger definition when possible.

3. **Document approximations**  
   Keep a short “design → engine” note for major approximations (e.g. “haste = initiative buff”, “Infinite Loop = transform_state”) so future work can either implement true behavior or accept the approximation explicitly.

4. **Use existing audit script**  
   `scripts/audit-skill-descriptions.ts` (and its TSV output) already compares doc descriptions to mappings. Run it periodically and use it to find “NOT MAPPED” and “needs custom system” rows when deciding what to map or implement next.

---

## 7. Summary Table

| Category | Design doc | Mapped | Engine support | Fidelity |
|----------|------------|--------|-----------------|----------|
| Direct damage (weapon/spell/execute/multihit) | Many | Many | Full | High when mapped |
| DoTs (bleed/burn/poison) | Many | Many | Full | High when mapped |
| CC (stun/root/silence/fear/etc.) | Many | Many | Full | High when mapped |
| Buffs/debuffs (stat, armor, vuln, heal reduce) | Many | Many | Full | High when mapped |
| Displacement (push/pull/dash/teleport) | Many | Many | Full | High (except “teleport back”) |
| Summons / zones / traps | Many | Some | Full | High when mapped |
| Haste / action speed | Several | As initiative buff | Partial | Approximation |
| Passives (on hit/kill/dodge, while X) | Very many | Few | Partial | Mostly missing |
| Auras | Many | Few | Missing | Missing |
| Reactive (on hit / on damage) | Many | Few | Partial | Partial |
| Custom resources (Fury, Rhythm, etc.) | Many | Approximated | Partial | Partial |
| “Repeat action” / “undo” / rewind | Several | Placeholder | Missing | Not faithful |

Overall: **the engine is capable of faithfully executing a wide range of skills (damage, DoTs, CC, buffs, debuffs, displacement, summons, zones)** when the ruleset assigns the right effect types and params. **Fidelity is limited by:** (1) only ~6% of abilities having a dedicated mapping, and (2) several design-doc concepts (haste as true speed, evasion, auras, complex passives, rewind/undo) having no or only approximate implementation.
