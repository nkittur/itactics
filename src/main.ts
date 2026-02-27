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
import { pickTheme } from "@data/ThemeData";
import { generateSkillTree } from "@data/SkillTreeData";
import type { CharacterClass } from "@data/ClassData";

function simpleRng(): number {
  return Math.random();
}

function createStarterUnit(
  name: string,
  classId: string,
  weapon: string,
  sprite: string,
  meleeSkill: number,
  dodge: number,
  hp: number,
): RosterMember {
  const bodyArmor = getArmorDef("linen_tunic");
  const headArmor = getArmorDef("hood");

  // Generate skill tree
  const theme = pickTheme(classId as CharacterClass, simpleRng);
  const skillTree = generateSkillTree(theme, simpleRng);

  return {
    name,
    classId,
    level: 1,
    experience: 0,
    stats: {
      hitpoints: hp,
      stamina: 100,
      mana: 20,
      resolve: 45,
      initiative: 95,
      meleeSkill,
      rangedSkill: 30,
      dodge,
      magicResist: 0,
      movementPoints: 8,
    },
    maxHp: hp,
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
    skillTheme: theme.id,
    abilities: skillTree.nodes.map(n => n.abilityUid),
    skillTree,
    unlockedNodes: [],
    nodeStacks: {},
    classPoints: 0,
  };
}

function createNewGame(): SaveData {
  // Initialize registries so generated abilities are captured
  const abilityRegistry: Record<string, import("@data/AbilityData").GeneratedAbility> = {};
  setAbilityRegistry(abilityRegistry);

  return {
    version: 1,
    roster: [
      createStarterUnit("Aldric", "fighter", "short_sword", "swordsman", 48, 4, 12),
      createStarterUnit("Gunnar", "spearman", "spear", "knight-templar", 45, 5, 10),
      createStarterUnit("Erik", "rogue", "dagger", "soldier", 42, 3, 9),
    ],
    currentScenarioIndex: 0,
    gold: 200,
    stash: [],
    abilityRegistry,
  };
}

async function init() {
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element #gameCanvas not found");
  }

  const saveData = await loadGame().catch(() => null);

  if (saveData) {
    setItemRegistry(saveData.itemRegistry ?? {});
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
