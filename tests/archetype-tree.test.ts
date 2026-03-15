import { describe, it, expect } from "vitest";
import { getClasses, getArchetypeAbilitySlots, buildSkillTreeFromArchetype, getAbility } from "../src/data/ruleset/RulesetLoader";
import { getAllCharacterClasses } from "@data/ClassData";
import { CP_COST_BY_TIER } from "../src/data/SkillTreeData";

describe("ruleset skill trees", () => {
  it("all ruleset classes have 3 archetypes with ability slots", () => {
    const classes = getClasses();
    expect(classes.length).toBeGreaterThan(0);

    for (const cls of classes) {
      expect(cls.archetypes.length).toBe(3);
      for (const arch of cls.archetypes) {
        expect(arch.abilitySlots.length).toBeGreaterThan(0);
      }
    }
  });

  it("buildSkillTreeFromArchetype returns valid trees for each archetype", () => {
    const classes = getClasses();
    const chronoweaver = classes.find((c) => c.id === "chronoweaver");
    expect(chronoweaver).toBeDefined();

    for (const arch of chronoweaver!.archetypes) {
      const tree = buildSkillTreeFromArchetype("chronoweaver", arch.id);
      expect(tree).not.toBeNull();
      expect(tree!.nodes.length).toBe(arch.abilitySlots.length);

      const tiers = new Set(tree!.nodes.map((n) => n.tier));
      expect(tiers.size).toBeGreaterThan(0);

      for (const node of tree!.nodes) {
        expect(node.cpCost).toBe(CP_COST_BY_TIER[node.tier]);
        const ability = getAbility(node.abilityUid);
        expect(ability, `Ability ${node.abilityUid} should resolve`).toBeDefined();
      }
    }
  });

  it("chronoweaver Accelerant has design-doc ability names", () => {
    const slots = getArchetypeAbilitySlots("chronoweaver", "chronoweaver_accelerant");
    const names = slots.map((s) => getAbility(s.abilityId)?.name).filter(Boolean);

    expect(names).toContain("Quicken");
    expect(names).toContain("Tempo Tap");
    expect(names).toContain("Blink Step");
    expect(names).toContain("Infinite Loop");
  });

  it("getAllCharacterClasses returns ruleset class ids", () => {
    const ids = getAllCharacterClasses();
    expect(ids).toContain("chronoweaver");
    expect(ids).toContain("bladesinger");
    expect(ids).toContain("berserker");
    expect(ids.length).toBeGreaterThan(50);
  });
});
