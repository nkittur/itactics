/**
 * iTactics — Entry point
 * Routes between management screen and battle based on save state.
 */

import { DemoBattle } from "./scenes/DemoBattle";
import { loadGame, saveGame, type SaveData, type RosterMember } from "@save/SaveManager";
import { ManagementScreen } from "@ui/ManagementScreen";
import { generateTalentStars } from "@data/TalentData";
import { getArmorDef } from "@data/ArmorData";
import { setItemRegistry } from "@data/ItemResolver";
import { setAbilityRegistry } from "@data/AbilityResolver";
import { getClassDef, getAllCharacterClasses } from "@data/ClassData";
import { deleteSave } from "@save/SaveManager";
import {
  getClass as getRulesetClass,
  getArchetypeAbilitySlots,
  buildSkillTreeFromArchetype,
  setRulesetById,
  PLAYABLE_CLASS_IDS,
} from "@data/ruleset/RulesetLoader";
import { generateContracts } from "@data/ContractData";
import { getScenario } from "@data/ScenarioData";

function simpleRng(): number {
  return Math.random();
}

function createStarterUnit(
  name: string,
  classId: string,
  weapon: string,
  sprite: string,
): RosterMember {
  const bodyArmor = getArmorDef("linen_tunic");
  const headArmor = getArmorDef("hood");
  const classDef = getClassDef(classId);
  const base = classDef.baseStats;

  const rulesetClass = getRulesetClass(classId);
  let skillTree: RosterMember["skillTree"];
  let abilities: string[];
  let archetypeId: string | undefined;

  if (rulesetClass && rulesetClass.archetypes.length > 0) {
    const arch = rulesetClass.archetypes[0]!;
    archetypeId = arch.id;
    const slots = getArchetypeAbilitySlots(classId, arch.id);
    abilities = slots.map((s) => s.abilityId);
    skillTree = buildSkillTreeFromArchetype(classId, arch.id) ?? undefined;
  } else {
    abilities = [];
    skillTree = undefined;
  }

  return {
    name,
    classId,
    level: 1,
    experience: 0,
    stats: {
      hitpoints: base.hitpoints,
      stamina: base.stamina,
      mana: base.mana,
      resolve: base.resolve,
      initiative: base.initiative,
      meleeSkill: base.meleeSkill,
      rangedSkill: base.rangedSkill,
      dodge: base.dodge,
      magicResist: base.magicResist,
      movementPoints: base.movementPoints,
    },
    maxHp: base.hitpoints,
    talentStars: generateTalentStars(simpleRng),
    perks: { unlocked: [], availablePoints: 0 },
    equipment: {
      mainHand: weapon,
      offHand: null,
      accessory: null,
      bag: [],
    },
    armor: {
      body: bodyArmor
        ? { id: bodyArmor.id, armor: bodyArmor.armor, magicResist: bodyArmor.magicResist }
        : null,
      head: headArmor
        ? { id: headArmor.id, armor: headArmor.armor, magicResist: headArmor.magicResist }
        : null,
    },
    spriteType: sprite,
    archetypeId,
    abilities,
    skillTree,
    unlockedNodes: skillTree ? skillTree.nodes.map((n) => n.nodeId) : [],
    nodeStacks: {},
    classPoints: 0,
  };
}

/** Starter roster: always these three playable classes (no Berserker/Bladesinger). */
const STARTER_CLASS_IDS = [
  "chronoweaver",
  "ironbloom_warden",
  "echo_dancer",
] as const;

function createNewGame(): SaveData {
  setAbilityRegistry({});

  return {
    version: 1,
    roster: [
      createStarterUnit("Aldric", STARTER_CLASS_IDS[0], "short_sword", "swordsman"),
      createStarterUnit("Gunnar", STARTER_CLASS_IDS[1], "hand_axe", "knight-templar"),
      createStarterUnit("Erik", STARTER_CLASS_IDS[2], "dagger", "soldier"),
    ],
    currentScenarioIndex: 0,
    gold: 200,
    stash: [],
    abilityRegistry: {},
  };
}

const PLAYABLE_SET = new Set<string>(PLAYABLE_CLASS_IDS);

/** Replace non-playable class IDs in roster with playable ones and rebuild skill tree. Returns true if any member was changed. */
function migrateRosterToPlayableClasses(saveData: SaveData): boolean {
  let changed = false;
  for (let i = 0; i < saveData.roster.length; i++) {
    const m = saveData.roster[i]!;
    const classId = m.classId ?? "";
    if (!classId || PLAYABLE_SET.has(classId)) continue;

    const playableId = PLAYABLE_CLASS_IDS[i % PLAYABLE_CLASS_IDS.length]!;
    const rulesetClass = getRulesetClass(playableId);
    if (!rulesetClass?.archetypes.length) continue;

    const arch = rulesetClass.archetypes[0]!;
    const newClassId = rulesetClass.id;
    const skillTree = buildSkillTreeFromArchetype(newClassId, arch.id);
    const slots = getArchetypeAbilitySlots(newClassId, arch.id);

    saveData.roster[i] = {
      ...m,
      classId: newClassId,
      archetypeId: arch.id,
      abilities: slots.map((s) => s.abilityId),
      skillTree: skillTree ?? m.skillTree,
      unlockedNodes: skillTree ? [] : (m.unlockedNodes ?? []),
    };
    changed = true;
  }
  return changed;
}

/** Set every roster member's unlockedNodes to all node IDs (for ?debug=1 testing). */
function applyDebugUnlockAllSkills(saveData: SaveData): void {
  for (const m of saveData.roster) {
    if (m.skillTree?.nodes.length) {
      m.unlockedNodes = m.skillTree.nodes.map((n) => n.nodeId);
    }
  }
}

async function init() {
  setRulesetById("default");

  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element #gameCanvas not found");
  }

  const urlParams = new URLSearchParams(window.location.search);
  const demoBattle = urlParams.get("demoBattle") === "1";
  const autoRun = urlParams.get("auto") === "1";
  /** Load a specific scenario by ID, e.g. ?scenario=barrow_creek_1 */
  const scenarioParam = urlParams.get("scenario");
  /** When true, all roster members get every skill in their tree unlocked (for testing). Use ?debug=1 */
  const debugUnlockAllSkills = urlParams.get("debug") === "1";
  if (autoRun) {
    (window as unknown as { __autoRunBattle?: boolean }).__autoRunBattle = true;
  }

  let saveData: SaveData | null;
  if (scenarioParam) {
    // Direct scenario play: load a specific scenario by ID (e.g. ?scenario=barrow_creek_1)
    const scenario = getScenario(scenarioParam);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioParam}`);
    }
    // Create a fake contract that points to this scenario's dimensions
    saveData = createNewGame();
    saveData.pendingContract = {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      difficulty: "normal",
      enemyCount: scenario.units.filter((u) => u.team === "enemy").length,
      enemyLevel: 1,
      reward: 200,
      mapWidth: scenario.gridWidth,
      mapHeight: scenario.gridHeight,
    };
    // Override: DemoBattle will use the scenario directly since it matches by ID
    saveData.availableContracts = [];
  } else if (demoBattle) {
    saveData = createNewGame();
    const contracts = generateContracts(1, saveData.roster.length, () => Math.random());
    saveData.pendingContract = contracts[0]!;
    saveData.availableContracts = contracts;
  } else {
    saveData = await loadGame().catch(() => null);
  }

  if (saveData) {
    setItemRegistry(saveData.itemRegistry ?? {});

    // Migrate roster: replace non-playable classes with playable ones (fixes old saves)
    const didMigrate = migrateRosterToPlayableClasses(saveData);
    if (didMigrate) await saveGame(saveData);

    // Debug: unlock all skills for every roster member so they have full trees in battle
    if (debugUnlockAllSkills) {
      applyDebugUnlockAllSkills(saveData);
    }

    // Check save compatibility — detect stale class IDs
    const validClasses = new Set(getAllCharacterClasses());
    const staleClasses = new Set<string>();
    for (const m of saveData.roster) {
      if (m.classId && !validClasses.has(m.classId)) staleClasses.add(m.classId);
    }
    for (const r of saveData.availableRecruits ?? []) {
      if (r.classId && !validClasses.has(r.classId)) staleClasses.add(r.classId);
    }

    if (staleClasses.size > 0) {
      const names = [...staleClasses].join(", ");
      const msg = `Incompatible save data detected.\n\nYour save references classes that no longer exist: ${names}.\n\nDelete save and start fresh?`;
      if (confirm(msg)) {
        await deleteSave();
        window.location.reload();
        return;
      }
      // User declined — proceed but things may break
    }
  }

  if (!saveData) {
    // New game: create starter roster + show management
    const starterSave = createNewGame();
    migrateRosterToPlayableClasses(starterSave);
    if (debugUnlockAllSkills) applyDebugUnlockAllSkills(starterSave);
    await saveGame(starterSave);
    canvas.style.display = "none";
    new ManagementScreen(starterSave);
    return;
  }

  if (saveData.pendingContract) {
    // Battle mode: start DemoBattle with contract
    const demo = new DemoBattle(canvas, saveData);
    await demo.start();
    window.addEventListener("beforeunload", () => demo.dispose());
  } else {
    // Management mode
    canvas.style.display = "none";
    new ManagementScreen(saveData);
  }
}

init();
