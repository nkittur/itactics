# Ironbloom Warden skill audit: description spirit vs. actual effects

Spirit-focused audit for Ironbloom Warden (Thornwall, Overgrowth, Rot Herald). Use with [Skill fix guide](skill-fix-guide.md).

**Legend:** Good = spirit delivered; Partial = some gaps; Missing = unmapped or placeholder; Wrong = contradicts spirit.

---

## Thornwall (Defensive / Reactive)

*Identity: The immovable object. You want to be hit. Every blow grows your power.*

| Skill | Description | Spirit | Implementation | Match | Notes |
|-------|-------------|--------|-----------------|-------|--------|
| **Barkskin** | "+20% damage reduction for 2 turns" | Strong DR buff, 2 turns. | `buff_dmgReduce` (default 20%, 2t). | **Good** | Params match with explicit overrides. |
| **Thorn Coat** | "Reflect 10% of melee damage taken back to attacker" | Melee hits on you hurt the attacker. | `trg_onTakeDamage` → `dmg_reflect` 10%. | **Partial** | Reflect works; "melee" only not distinguished (all damage). |
| **Root Stance** | "Immobile but +30% damage reduction, +threat generation" | Can't move, tankier, enemies want to hit you. | `buff_dmgReduce`, `debuff_stat` movementPoints, `cc_taunt`. | **Good** | 30% DR + immobile + taunt; override percent/turns. |
| **Ironwood** | "Barkskin now also grants +15% max HP while active" | When you have Barkskin, you have more max HP. | Not mapped. | **Missing** | Needs "while has barkskin" → buff max HP or similar. |
| **Briar Lash** | "When hit, 25% chance to root attacker for 1 turn" | Sometimes attackers get rooted. | `trg_onTakeDamage` → `cc_root` 1 turn. | **Partial** | Root on attacker works; we use 100% (no RNG). |
| **Living Fortress** | "+2% damage reduction per enemy targeting you (max 5)" | More aggro = tankier. | Not mapped. | **Missing** | Needs "enemies targeting you" count → DR scaling. |
| **Splinter Burst** | "Shatter Barkskin early to deal AoE damage based on damage absorbed" | Consume Barkskin for burst. | `dmg_spell` AoE, exploits barkskin. | **Partial** | AoE + exploit; no "damage absorbed" formula. |
| **Petrified Bark** | "Below 30% HP, gain 50% damage reduction" | Low HP = big defense. | `trg_turnStart` + condition `below_hp_percent: 30` → apply_status `petrified_bark` (50% DR, 1t). | **Good** | Status `petrified_bark`; getDamageReduction considers all _reducePct effects. |
| **Entangling Wall** | "Summon a line of thorns (3 hexes). Enemies crossing take damage and are slowed 50% for 1 turn." | Zone: damage + slow. | `zone_persist` + `debuff_stat` movementPoints. | **Partial** | Zone + slow; set dmgPerTurn and slow amount (50%). |
| **Martyrwood** | "20% of damage to nearby allies redirected to you. You heal 5% of damage redirected." | Tank for allies, get some heal back. | Not mapped. | **Missing** | Needs damage redirect + heal from redirected. |
| **Thorn King** | "Thorn Coat reflection to 30%. Reflected damage now applies Bleed (1 turn)." | Stronger reflect + bleed. | Not mapped. | **Missing** | Would need Thorn Coat upgrade or second passive. |
| **World Tree** | "3 turns: immobile, +80% DR, allies within 4 hexes +30% DR, massive thorn damage. 15 turns cooldown." | Ultimate tank + ally DR + thorns. | `buff_dmgReduce`, `dmg_reflect`, `transform_state`; self only. | **Partial** | 80% DR + reflect + 3t; cooldown 15 added; allies-in-4-hexes DR not implemented. |

---

## Overgrowth (Healing / Regeneration)

*Identity: Unkillable regenerator. You outlast everything through constant growth.*

| Skill | Description | Spirit | Implementation | Match | Notes |
|-------|-------------|--------|-----------------|-------|--------|
| **Rejuvenate** | "HoT on self or ally, heals over 3 turns" | Heal over time, 3 turns. | `heal_hot` tgt_single_ally, turns 3, healPerTurn 0. | **Partial** | Set healPerTurn (e.g. 8–10) so it actually heals. |
| **Photosynthesis** | "Regen 1% max HP per turn while not taking damage" | Sustain when safe. | Not mapped. | **Missing** | Needs "when didn't take damage this round" trigger. |
| **Seedling** | "Plant a seedling that pulses minor heals in 2 hexes for 3 turns" | Placeable HoT zone. | `summon_unit` + `heal_hot` radius 2, 3t, healPerTurn 0. | **Partial** | Set healPerTurn so it pulses; radius/duration match. |
| **Deep Roots** | "Rejuvenate now also grants +10% damage reduction" | Rejuvenate gives DR too. | Not mapped. | **Missing** | Rejuvenate would need second effect (buff_dmgReduce). |
| **Overgrowth** | "Instantly grow all active Seedlings, doubling their radius and healing" | Buff existing seedlings. | `heal_pctDmg` AoE, exploits seedling. | **Partial** | Exploit seedling; no "double radius/healing" on summons. |
| **Sap Blood** | "15% of damage you deal heals you" | Lifesteal. | Not mapped. | **Missing** | Map to lifesteal 15% (we have lifesteal effect). |
| **Verdant Tide** | "AoE heal-over-time in 3 hexes radius, 3 turns duration" | Zone HoT. | `heal_hot` tgt_aoe_radius3, turns 3, healPerTurn 0. | **Partial** | Set healPerTurn. |
| **Regrowth** | "When your HoTs overheal, store excess as a shield (max 20% HP)" | Overheal → shield. | Not mapped. | **Missing** | Needs overheal tracking and shield cap. |
| **Symbiosis** | "While near a Seedling, gain +15% to all healing done" | Healing bonus near seedling. | Not mapped. | **Missing** | Needs "near seedling" condition + healing modifier. |
| **Ancient Growth** | "Your HoTs can critically heal (2x) with 15% chance" | Random crit heals. | Not mapped. | **Missing** | Needs heal crit RNG. |
| **Bloom Cascade** | "Consume all Seedlings. Each consumed heals all allies in its radius for a large burst." | Consume seedlings → burst heal allies. | `heal_flat` tgt_all_allies, amount 0, exploits seedling. | **Partial** | Exploit seedling; no consume/burst formula. |
| **Gaia's Embrace** | "4 turns: battlefield overgrown. Allies regen 5% max HP/s. Enemies slowed 30%. Seedlings every 1 turn. 15 turns cooldown." | Ultimate zone + ally regen + slow + seedlings. | `heal_hot`, `debuff_stat`, `summon_unit`, `zone_persist`; all_allies. | **Partial** | Cooldown 15; regen/slow/seedling spawn approximated. |

---

## Rot Herald (Offensive Nature / Poison / Fungal)

*Identity: Nature's dark side. You weaponize decay, spores, and parasites.*

| Skill | Description | Spirit | Implementation | Match | Notes |
|-------|-------------|--------|-----------------|-------|--------|
| **Spore Shot** | "Ranged attack that applies Poison (DoT, 2 turns)" | Ranged + poison 2t. | `dmg_weapon` + `dot_poison` (default 3t). | **Good** | Override dot_poison turns 2. |
| **Fungal Growth** | "Plant a fungal node that poisons enemies in 2 hexes radius" | Zone that applies poison/damage. | `summon_unit` + `zone_persist` radius 2, dmgPerTurn 0. | **Partial** | Set dmgPerTurn (e.g. 4) so zone damages; duration. |
| **Toxic Skin** | "Attackers gain a stack of Poison on melee hit" | Melee attackers get poisoned. | `trg_onTakeDamage` → `apply_status_to_attacker` poison 2t. | **Good** | New trigger effect; applies to attacker when you take damage (melee/ranged not distinguished). |
| **Mycelium Net** | "Fungal nodes link. Enemies near any node slowed 20%." | Multi-node slow aura. | Not mapped. | **Missing** | Needs "near fungal node" check + slow. |
| **Virulent Strain** | "Poison deals 30% more damage" | Your poison stronger. | Not mapped. | **Missing** | DoT damage modifier from source (like accelerate_rot). |
| **Decompose** | "Consume Poison stacks on target for burst damage" | Execute vs poisoned. | `dmg_execute` exploits dot_poison. | **Good** | Execute + exploit poison; "consume stacks" approximated. |
| **Plague Garden** | "Plant 3 fungal nodes in a triangle. Zone: constant poison damage, 40% healing reduction." | Zone: DoT + heal reduce. | `zone_persist`, `debuff_healReduce`, `summon_unit`; turns 0. | **Partial** | Set dmgPerTurn, healReduce 40%, duration (e.g. 3t). |
| **Parasitic Vine** | "Latch onto target. Drains HP to you over 2 turns. Breaks if you move too far." | Channel lifesteal, range break. | `channel_dmg` + `lifesteal`. | **Partial** | Lifesteal + channel; "break if move" not implemented. |
| **Necrotic Bloom** | "Enemies that die while poisoned explode in a poison AoE" | On death of poisoned → AoE poison. | Not mapped. | **Missing** | trg_onKill (your poison on target) → AoE poison. |
| **Cordyceps** | "Infect target. If they die within 3 turns, a fungal minion rises for 4 turns." | Doom + summon on death. | `debuff_stat` resolve + `summon_unit`. | **Partial** | Placeholder; no "if die within 3t → summon" logic. |
| **Rot Aura** | "Enemies within 3 hexes lose 2% max HP per turn" | Aura DoT (max HP%). | Not mapped. | **Missing** | Aura + % max HP drain per turn. |
| **The Spreading** | "Target: infection grows over 3 turns. At full growth, detonate: lethal to non-bosses, 40% max HP to bosses. Spreads at 50% on detonation. 15 turns cooldown." | Delayed lethal execute + spread. | `dmg_execute` + `dot_poison`. | **Partial** | Execute + DoT; no growth timer, spread, or cooldown. |

---

## Summary by spirit match

| Match | Count | Skills |
|-------|--------|--------|
| **Good** | 6 | Barkskin, Root Stance, Spore Shot, Decompose, Petrified Bark, Toxic Skin |
| **Partial** | 16 | Thorn Coat, Briar Lash, Splinter Burst, Entangling Wall, World Tree, Rejuvenate, Seedling, Overgrowth, Verdant Tide, Bloom Cascade, Gaia's Embrace, Fungal Growth, Plague Garden, Parasitic Vine, Cordyceps, The Spreading |
| **Missing** | 14 | Ironwood, Living Fortress, Martyrwood, Thorn King, Photosynthesis, Deep Roots, Sap Blood, Regrowth, Symbiosis, Ancient Growth, Mycelium Net, Virulent Strain, Necrotic Bloom, Rot Aura |
| **Wrong** | 0 | — |

---

## Recommended fixes (from guide patterns)

1. **Params and cooldowns:** Barkskin 20% 2t; Root Stance 30% DR + immobile; World Tree cooldown 15; Gaia's Embrace cooldown 15; Entangling Wall dmgPerTurn + slow 50%; Rejuvenate/Verdant/Seedling healPerTurn; Spore Shot poison 2t; Fungal Growth/Plague Garden dmgPerTurn and duration.
2. **Petrified Bark:** trg_turnStart + condition `below_hp_percent: 30` → apply_status with 50% DR (add status if needed).
3. **Sap Blood:** Map to lifesteal 15%.
4. **Toxic Skin:** trg_onTakeDamage → apply poison to attackerId (new or reuse effect).
5. **Thorn Coat:** Ensure dmg_reflect uses `percent: 10` (already in trigger).
