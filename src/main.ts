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
} from "@data/ruleset/RulesetLoader";
import { generateContracts } from "@data/ContractData";

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

function createNewGame(): SaveData {
  setAbilityRegistry({});

  return {
    version: 1,
    roster: [
      createStarterUnit("Aldric", "bladesinger", "short_sword", "swordsman"),
      createStarterUnit("Gunnar", "berserker", "axe", "knight-templar"),
      createStarterUnit("Erik", "echo_dancer", "dagger", "soldier"),
    ],
    currentScenarioIndex: 0,
    gold: 200,
    stash: [],
    abilityRegistry: {},
  };
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
  if (autoRun) {
    (window as unknown as { __autoRunBattle?: boolean }).__autoRunBattle = true;
  }

  let saveData: SaveData | null;
  if (demoBattle) {
    saveData = createNewGame();
    const contracts = generateContracts(1, saveData.roster.length, () => Math.random());
    saveData.pendingContract = contracts[0]!;
    saveData.availableContracts = contracts;
  } else {
    saveData = await loadGame().catch(() => null);
  }

  if (saveData) {
    setItemRegistry(saveData.itemRegistry ?? {});

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
