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
import { generateArchetypeTree } from "@data/SkillTreeData";
import { getClassDef } from "@data/ClassData";
import "@data/classes/DesignDocClasses";

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

  // Generate skill tree from archetype structure
  const archetypeResult = generateArchetypeTree(classId, null, simpleRng);
  const skillTree = archetypeResult.tree;

  const classDef = getClassDef(classId);
  const base = classDef.baseStats;

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
    skillTheme: archetypeResult.themeId,
    secondarySkillTheme: archetypeResult.secondaryThemeId ?? undefined,
    archetypeId: archetypeResult.archetypeId,
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
      createStarterUnit("Aldric", "bladesinger", "short_sword", "swordsman"),
      createStarterUnit("Gunnar", "berserker", "axe", "knight-templar"),
      createStarterUnit("Erik", "echo_dancer", "dagger", "soldier"),
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
