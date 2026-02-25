import { get, set, del } from "idb-keyval";
import type { StatKey } from "@data/TalentData";

const SAVE_KEY = "itactics-save";

export interface RosterMember {
  name: string;
  classId?: string;
  level: number;
  experience: number;
  stats: {
    hitpoints: number;
    fatigue: number;
    resolve: number;
    initiative: number;
    meleeSkill: number;
    rangedSkill: number;
    meleeDefense: number;
    rangedDefense: number;
    movementPoints: number;
  };
  maxHp: number;
  talentStars: Record<StatKey, number>;
  perks: { unlocked: string[]; availablePoints: number };
  equipment: {
    mainHand: string | null;
    offHand: string | null;
    shieldDurability: number | null;
    accessory: string | null;
    bag: string[];
  };
  armor: {
    body: { id: string; currentDurability: number; maxDurability: number } | null;
    head: { id: string; currentDurability: number; maxDurability: number } | null;
  };
  spriteType?: string;
  backgroundId?: string;
  traits?: string[];
}

export interface BattleState {
  scenarioId: string;
  /** Serialized World (all entities + components). */
  worldSnapshot: object;
  /** Serialized turn order queue. */
  turnOrderState: string[];
  playerIds: string[];
  enemyIds: string[];
  killCount: number;
  rngState: number;
}

export interface SaveData {
  version: 1;
  roster: RosterMember[];
  currentScenarioIndex: number;
  battleInProgress?: BattleState;
}

export async function saveGame(data: SaveData): Promise<void> {
  await set(SAVE_KEY, data);
}

export async function loadGame(): Promise<SaveData | null> {
  const data = await get<SaveData>(SAVE_KEY);
  if (data && data.version === 1) return data;
  return null;
}

export async function deleteSave(): Promise<void> {
  await del(SAVE_KEY);
}
