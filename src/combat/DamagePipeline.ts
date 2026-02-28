import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EventBus } from "@core/EventBus";
import type { StatusEffectManager } from "./StatusEffectManager";

// ── Damage Types (40+) ──

export type ExtendedDamageType =
  // Physical
  | "physical" | "piercing" | "slashing" | "blunt"
  // Elemental
  | "fire" | "ice" | "lightning" | "water" | "earth" | "wind" | "nature"
  // Magical
  | "magical" | "arcane" | "holy" | "dark" | "shadow" | "void"
  // Psychic
  | "psychic" | "fear" | "charm"
  // Exotic
  | "sonic" | "gravity" | "time" | "chaos" | "radiant"
  | "necrotic" | "poison" | "acid" | "bleed"
  // Special
  | "true"    // Ignores all defenses
  | "adaptive" // Finds lowest resistance
  | "heal";    // Used for healing "damage" (negative)

/**
 * Rich context object that flows through the damage pipeline.
 * Middleware handlers can read and modify any field.
 */
export interface DamageContext {
  // ── Identifiers ──
  attackerId: EntityId;
  defenderId: EntityId;
  source: string; // ability id, "melee", etc.
  world: World;

  // ── Damage values ──
  rawDamage: number;
  damageType: ExtendedDamageType | string;
  /** Final HP damage after all reductions. Set by pipeline. */
  finalDamage: number;

  // ── Hit resolution ──
  hit: boolean;
  hitChance: number;
  critical: boolean;
  critMultiplier: number;

  // ── Armor ──
  armorPiercing: number;
  armorIgnorePercent: number;
  armorReduction: number;

  // ── Modifiers applied ──
  damageMultiplier: number;
  flatDamageBonus: number;
  /** Vulnerability multiplier (1.0 = none, 1.2 = +20% incoming). */
  vulnerabilityMult: number;
  /** Damage reduction multiplier (1.0 = none, 0.8 = -20% incoming). */
  reductionMult: number;

  // ── Shield absorption ──
  shieldAbsorbed: number;
  /** Temporary HP shields in priority order. */
  shields: ShieldPool[];

  // ── Reflect/redirect ──
  reflectDamage: number;
  reflectTarget: EntityId | null;
  redirectTarget: EntityId | null;
  redirectPercent: number;

  // ── Post-damage ──
  lifestealPercent: number;
  lifestealAmount: number;
  resourceGenerated: { resourceId: string; amount: number }[];
  targetKilled: boolean;
  overkillDamage: number;

  // ── Status effects to apply ──
  effectsToApply: { targetId: EntityId; effectId: string; duration?: number }[];

  // ── Metadata ──
  /** Damage recording buffer for time manipulation replay. */
  recordedDamage: number;
  /** Flags set by middleware. */
  flags: Set<string>;
  /** Arbitrary middleware data. */
  metadata: Record<string, any>;
}

export interface ShieldPool {
  id: string;
  amount: number;
  priority: number;
  damageTypes?: string[]; // If set, only absorbs these types
  sourceId?: EntityId;
}

// ── Pipeline Stages ──

export type PipelineStage =
  | "pre_damage"      // Stage 1: Buffs, vulnerability, damage reduction
  | "reflect"         // Stage 2: Reflect/redirect checks
  | "shield"          // Stage 3: Shield absorption
  | "armor"           // Stage 4: Armor/resistance calculation
  | "apply_hp"        // Stage 5: Apply final damage to HP
  | "post_damage";    // Stage 6: Lifesteal, resource gen, kill processing

export interface PipelineHandler {
  stage: PipelineStage;
  priority: number; // Lower = earlier
  name: string;
  handler: (ctx: DamageContext) => void;
}

const STAGE_ORDER: PipelineStage[] = [
  "pre_damage", "reflect", "shield", "armor", "apply_hp", "post_damage",
];

/**
 * Middleware-based damage pipeline.
 * Replaces the linear DamageCalculator with a 6-stage chain.
 * New mechanics (damage recording, resource gen, etc.) are registered as handlers.
 */
export class DamagePipeline {
  private handlers: PipelineHandler[] = [];

  constructor(
    private eventBus: EventBus,
    private statusEffects: StatusEffectManager,
  ) {
    this.registerBuiltinHandlers();
  }

  /** Register a handler at a specific pipeline stage. */
  registerHandler(handler: PipelineHandler): () => void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => {
      const stageA = STAGE_ORDER.indexOf(a.stage);
      const stageB = STAGE_ORDER.indexOf(b.stage);
      if (stageA !== stageB) return stageA - stageB;
      return a.priority - b.priority;
    });
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  /**
   * Create a new damage context with defaults.
   */
  createContext(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
    rawDamage: number,
    damageType: ExtendedDamageType | string,
    source: string,
  ): DamageContext {
    return {
      attackerId,
      defenderId,
      source,
      world,
      rawDamage,
      damageType,
      finalDamage: 0,
      hit: true,
      hitChance: 0,
      critical: false,
      critMultiplier: 1.5,
      armorPiercing: 0,
      armorIgnorePercent: 0,
      armorReduction: 0,
      damageMultiplier: 1.0,
      flatDamageBonus: 0,
      vulnerabilityMult: 1.0,
      reductionMult: 1.0,
      shieldAbsorbed: 0,
      shields: [],
      reflectDamage: 0,
      reflectTarget: null,
      redirectTarget: null,
      redirectPercent: 0,
      lifestealPercent: 0,
      lifestealAmount: 0,
      resourceGenerated: [],
      targetKilled: false,
      overkillDamage: 0,
      effectsToApply: [],
      recordedDamage: 0,
      flags: new Set(),
      metadata: {},
    };
  }

  /**
   * Execute the full damage pipeline.
   * Returns the completed DamageContext with all results.
   */
  execute(ctx: DamageContext): DamageContext {
    if (!ctx.hit) {
      // Miss — emit dodge event, skip pipeline
      this.eventBus.emit("damage:dodged", {
        attackerId: ctx.attackerId,
        dodgerId: ctx.defenderId,
        source: ctx.source,
      });
      return ctx;
    }

    // Run all handlers in stage order
    for (const handler of this.handlers) {
      handler.handler(ctx);
      // Check if damage was fully prevented
      if (ctx.flags.has("cancel")) break;
    }

    // Emit damage event
    if (ctx.finalDamage > 0 || ctx.targetKilled) {
      this.eventBus.emit("damage:dealt", {
        attackerId: ctx.attackerId,
        defenderId: ctx.defenderId,
        damage: ctx.finalDamage,
        damageType: ctx.damageType,
        critical: ctx.critical,
        overkill: ctx.overkillDamage > 0,
        source: ctx.source,
      });
    }

    // Emit kill event
    if (ctx.targetKilled) {
      this.eventBus.emit("kill", {
        killerId: ctx.attackerId,
        killedId: ctx.defenderId,
        damageType: ctx.damageType,
        source: ctx.source,
      });
      this.eventBus.emit("death", {
        entityId: ctx.defenderId,
        killerId: ctx.attackerId,
      });
    }

    // Apply queued status effects
    for (const eff of ctx.effectsToApply) {
      this.statusEffects.apply(ctx.world, eff.targetId, eff.effectId, eff.duration, ctx.attackerId);
    }

    // Emit heal event for lifesteal
    if (ctx.lifestealAmount > 0) {
      this.eventBus.emit("heal", {
        sourceId: ctx.attackerId,
        targetId: ctx.attackerId,
        amount: ctx.lifestealAmount,
        overheal: 0,
      });
    }

    return ctx;
  }

  // ── Built-in Handlers ──

  private registerBuiltinHandlers(): void {
    // Stage 1: Pre-damage modifiers
    this.registerHandler({
      stage: "pre_damage",
      priority: 0,
      name: "base_modifiers",
      handler: (ctx) => {
        // Apply damage multiplier and flat bonus
        ctx.rawDamage = Math.floor(ctx.rawDamage * ctx.damageMultiplier) + ctx.flatDamageBonus;

        // Vulnerability from status effects
        const vuln = this.statusEffects.getVulnerabilityBonus(ctx.world, ctx.defenderId);
        if (vuln > 0) ctx.vulnerabilityMult = 1 + vuln;

        // Damage reduction from status effects
        const reduce = this.statusEffects.getDamageReduction(ctx.world, ctx.defenderId);
        if (reduce > 0) ctx.reductionMult = 1 - reduce;
      },
    });

    // Stage 2: Reflect/redirect
    this.registerHandler({
      stage: "reflect",
      priority: 0,
      name: "reflect_check",
      handler: (ctx) => {
        // Thorns effect
        if (this.statusEffects.hasEffect(ctx.world, ctx.defenderId, "thorns")) {
          ctx.reflectDamage = Math.floor(ctx.rawDamage * 0.2);
          ctx.reflectTarget = ctx.attackerId;
        }

        // Redirect handling
        if (ctx.redirectTarget && ctx.redirectPercent > 0) {
          const redirected = Math.floor(ctx.rawDamage * ctx.redirectPercent);
          ctx.rawDamage -= redirected;
          // Create a separate damage context for the redirect target
          ctx.metadata.redirectedDamage = redirected;
          ctx.metadata.redirectedTo = ctx.redirectTarget;
        }
      },
    });

    // Stage 3: Shield absorption
    this.registerHandler({
      stage: "shield",
      priority: 0,
      name: "shield_absorb",
      handler: (ctx) => {
        if (ctx.shields.length === 0) return;

        // Sort by priority (lower = absorbs first)
        ctx.shields.sort((a, b) => a.priority - b.priority);

        let remainingDamage = ctx.rawDamage;
        for (const shield of ctx.shields) {
          if (remainingDamage <= 0) break;
          // Check damage type filter
          if (shield.damageTypes && !shield.damageTypes.includes(ctx.damageType)) continue;

          const absorbed = Math.min(shield.amount, remainingDamage);
          shield.amount -= absorbed;
          ctx.shieldAbsorbed += absorbed;
          remainingDamage -= absorbed;

          // Shield broken
          if (shield.amount <= 0) {
            this.eventBus.emit("shield:break", {
              entityId: ctx.defenderId,
              shieldId: shield.id,
              breakerId: ctx.attackerId,
            });
          }
        }

        // Remove depleted shields
        ctx.shields = ctx.shields.filter(s => s.amount > 0);
        ctx.rawDamage = remainingDamage;
      },
    });

    // Stage 4: Armor/resistance
    this.registerHandler({
      stage: "armor",
      priority: 0,
      name: "armor_reduction",
      handler: (ctx) => {
        // True damage bypasses armor
        if (ctx.damageType === "true") {
          ctx.armorReduction = 0;
          return;
        }

        // Get resistance for this damage type
        const resistance = this.getResistance(ctx);

        // Apply armor piercing
        let effectiveArmor = Math.max(0, resistance - ctx.armorPiercing);
        if (ctx.armorIgnorePercent > 0) {
          effectiveArmor = Math.floor(effectiveArmor * (1 - ctx.armorIgnorePercent));
        }

        // Soft cap at 10
        const SOFT_CAP = 10;
        const DIMINISH_RATE = 0.5;
        if (effectiveArmor <= SOFT_CAP) {
          ctx.armorReduction = effectiveArmor;
        } else {
          ctx.armorReduction = SOFT_CAP + Math.floor((effectiveArmor - SOFT_CAP) * DIMINISH_RATE);
        }
      },
    });

    // Stage 5: Apply HP damage
    this.registerHandler({
      stage: "apply_hp",
      priority: 0,
      name: "apply_hp_damage",
      handler: (ctx) => {
        // Calculate final damage
        let final = Math.max(1, ctx.rawDamage - ctx.armorReduction);
        final = Math.floor(final * ctx.vulnerabilityMult);
        final = Math.floor(final * ctx.reductionMult);
        final = Math.max(0, final);

        ctx.finalDamage = final;
        ctx.recordedDamage = final;

        // Apply to HP
        const { HealthComponent } = getHealthComponent(ctx.world, ctx.defenderId);
        if (HealthComponent) {
          const prevHp = HealthComponent.current;
          HealthComponent.current = Math.max(0, HealthComponent.current - final);
          ctx.targetKilled = HealthComponent.current <= 0;
          ctx.overkillDamage = ctx.targetKilled ? Math.abs(HealthComponent.current - 0) + (final - prevHp) : 0;
          if (ctx.overkillDamage < 0) ctx.overkillDamage = 0;
        }
      },
    });

    // Stage 6: Post-damage processing
    this.registerHandler({
      stage: "post_damage",
      priority: 0,
      name: "post_damage_effects",
      handler: (ctx) => {
        // Lifesteal
        if (ctx.lifestealPercent > 0 && ctx.finalDamage > 0) {
          ctx.lifestealAmount = Math.floor(ctx.finalDamage * ctx.lifestealPercent);
          const { HealthComponent: attackerHealth } = getHealthComponent(ctx.world, ctx.attackerId);
          if (attackerHealth) {
            attackerHealth.current = Math.min(
              attackerHealth.max,
              attackerHealth.current + ctx.lifestealAmount,
            );
          }
        }

        // Lifesteal status effect check
        if (this.statusEffects.hasEffect(ctx.world, ctx.attackerId, "lifesteal") && ctx.finalDamage > 0) {
          const bonus = Math.floor(ctx.finalDamage * 0.2);
          const { HealthComponent: attackerHealth } = getHealthComponent(ctx.world, ctx.attackerId);
          if (attackerHealth) {
            attackerHealth.current = Math.min(attackerHealth.max, attackerHealth.current + bonus);
          }
          ctx.lifestealAmount += bonus;
        }

        // Apply reflect damage
        if (ctx.reflectDamage > 0 && ctx.reflectTarget) {
          const { HealthComponent: reflectHealth } = getHealthComponent(ctx.world, ctx.reflectTarget);
          if (reflectHealth) {
            reflectHealth.current = Math.max(0, reflectHealth.current - ctx.reflectDamage);
          }
        }
      },
    });
  }

  /** Get the resistance/armor value relevant to a damage type. */
  private getResistance(ctx: DamageContext): number {
    // Import components inline to avoid circular deps
    const stats = ctx.world.getComponent<any>(ctx.defenderId, "stats");
    const armor = ctx.world.getComponent<any>(ctx.defenderId, "armor");
    const equip = ctx.world.getComponent<any>(ctx.defenderId, "equipment");

    if (!stats) return 0;

    // Physical types use armor
    const physicalTypes = new Set(["physical", "piercing", "slashing", "blunt", "bleed"]);
    if (physicalTypes.has(ctx.damageType)) {
      const bodyArmor = armor?.body?.armor ?? 0;
      const headArmor = armor?.head?.armor ?? 0;
      let shieldArmor = 0;
      if (equip?.offHand) {
        // Shield armor
        shieldArmor = 3; // Default; real implementation resolves from ShieldData
      }
      return bodyArmor + headArmor + shieldArmor + (stats.bonusArmor ?? 0);
    }

    // Magical types use magic resist
    const magicalTypes = new Set(["magical", "arcane", "holy", "dark", "shadow", "void", "psychic", "chaos"]);
    if (magicalTypes.has(ctx.damageType)) {
      const bodyMR = armor?.body?.magicResist ?? 0;
      const headMR = armor?.head?.magicResist ?? 0;
      return bodyMR + headMR + (stats.magicResist ?? 0);
    }

    // Elemental types: average of physical armor and magic resist
    const elementalTypes = new Set(["fire", "ice", "lightning", "water", "earth", "wind", "nature", "sonic", "gravity", "radiant"]);
    if (elementalTypes.has(ctx.damageType)) {
      const physArmor = (armor?.body?.armor ?? 0) + (armor?.head?.armor ?? 0);
      const magRes = (armor?.body?.magicResist ?? 0) + (armor?.head?.magicResist ?? 0) + (stats.magicResist ?? 0);
      return Math.floor((physArmor + magRes) / 2);
    }

    // Poison/acid: use magic resist
    if (ctx.damageType === "poison" || ctx.damageType === "acid") {
      return stats.magicResist ?? 0;
    }

    // Default: no resistance
    return 0;
  }
}

// Helper to avoid import issues
function getHealthComponent(world: World, entityId: EntityId): { HealthComponent: any } {
  return { HealthComponent: world.getComponent(entityId, "health") };
}
