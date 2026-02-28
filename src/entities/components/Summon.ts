import type { Component } from "../Component";
import type { EntityId } from "../Entity";

/** AI behavior type for summoned entities. */
export type SummonAIType =
  | "follow_owner"     // Stay near owner, attack nearby enemies
  | "aggressive"       // Seek and attack nearest enemy
  | "stationary"       // Don't move (turrets, plants)
  | "mirror_owner"     // Copy owner's movements
  | "self_replicate"   // Attempt to create copies of itself
  | "guard_zone"       // Guard a specific area
  | "support"          // Stay near allies, use support abilities
  | "kamikaze";        // Rush enemies and self-destruct

/** Component attached to summoned entities. */
export interface SummonComponent extends Component {
  readonly type: "summon";
  /** Entity ID of the owner/summoner. */
  ownerId: EntityId;
  /** Template id for this summon type. */
  templateId: string;
  /** AI behavior type. */
  aiType: SummonAIType;
  /** Remaining lifetime in turns. -1 = permanent. */
  lifetime: number;
  /** Max distance from owner before being recalled. -1 = unlimited. */
  tetherRange: number;
  /** Whether this summon can be sacrificed by the owner. */
  sacrificeEligible: boolean;
  /** Whether this summon can merge with the owner. */
  mergeEligible: boolean;
  /** Effects triggered when this summon is destroyed. */
  onDeathEffects: string[];
  /** The hex this summon guards (for guard_zone AI). */
  guardPosition: { q: number; r: number } | null;
}

export function createSummon(params: {
  ownerId: EntityId;
  templateId: string;
  aiType: SummonAIType;
  lifetime?: number;
  tetherRange?: number;
  sacrificeEligible?: boolean;
  mergeEligible?: boolean;
  onDeathEffects?: string[];
  guardPosition?: { q: number; r: number } | null;
}): SummonComponent {
  return {
    type: "summon",
    ownerId: params.ownerId,
    templateId: params.templateId,
    aiType: params.aiType,
    lifetime: params.lifetime ?? -1,
    tetherRange: params.tetherRange ?? -1,
    sacrificeEligible: params.sacrificeEligible ?? false,
    mergeEligible: params.mergeEligible ?? false,
    onDeathEffects: params.onDeathEffects ?? [],
    guardPosition: params.guardPosition ?? null,
  };
}

/** Component attached to entities that own summons. */
export interface SummonOwnerComponent extends Component {
  readonly type: "summonOwner";
  /** Active summon entity IDs. */
  summonIds: EntityId[];
  /** Maximum number of summons this entity can have. */
  maxSummons: number;
}

export function createSummonOwner(params?: {
  summonIds?: EntityId[];
  maxSummons?: number;
}): SummonOwnerComponent {
  return {
    type: "summonOwner",
    summonIds: params?.summonIds ?? [],
    maxSummons: params?.maxSummons ?? 4,
  };
}
