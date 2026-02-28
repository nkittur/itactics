import { describe, it, expect } from "vitest";
import "../src/data/classes/DesignDocClasses";
import { generateArchetypeTree } from "../src/data/SkillTreeData";
import { getClassDefNew, getAllClassDefs } from "../src/data/ClassDefinition";
import { resolveAbility, setAbilityRegistry } from "../src/data/AbilityResolver";
import type { GeneratedAbility } from "../src/data/AbilityData";

function makeRng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe("generateArchetypeTree", () => {
  it("produces valid archetype trees for all enabled classes", () => {
    const allClasses = getAllClassDefs();
    expect(allClasses.length).toBe(10);

    for (const classDef of allClasses) {
      const registry: Record<string, GeneratedAbility> = {};
      setAbilityRegistry(registry);

      const rng = makeRng(42);
      const result = generateArchetypeTree(classDef.id, null, rng);

      // Should NOT be fallback
      expect(result.archetypeId, `${classDef.id} fell back to unknown`).not.toBe("unknown");

      // Should have a valid theme
      expect(result.themeId).toBeTruthy();

      const tree = result.tree;
      expect(tree.nodes.length).toBeGreaterThan(0);

      // Check 5 tiers are present
      const tiers = new Set(tree.nodes.map(n => n.tier));
      expect(tiers.size, `${classDef.id} has ${tiers.size} tiers: ${[...tiers]}`).toBe(5);
      expect(tiers.has(5)).toBe(true);

      // Check active/passive split (~1/3 active)
      const activeCount = tree.nodes.filter(n => n.isActive).length;
      const passiveCount = tree.nodes.filter(n => !n.isActive).length;
      expect(activeCount).toBeGreaterThanOrEqual(1);
      expect(passiveCount).toBeGreaterThanOrEqual(1);

      // All abilities should resolve
      for (const node of tree.nodes) {
        const ability = resolveAbility(node.abilityUid);
        expect(ability, `Node ${node.nodeId} ability ${node.abilityUid} not resolvable`).toBeDefined();
        expect(ability!.name).toBeTruthy();
      }

      // Edges should reference valid node IDs
      const nodeIds = new Set(tree.nodes.map(n => n.nodeId));
      for (const [parent, child] of tree.edges) {
        expect(nodeIds.has(parent), `Edge parent ${parent} not in nodes`).toBe(true);
        expect(nodeIds.has(child), `Edge child ${child} not in nodes`).toBe(true);
      }

      // Prerequisites should match edges
      for (const node of tree.nodes) {
        for (const prereq of node.prerequisites) {
          expect(nodeIds.has(prereq), `Prereq ${prereq} of ${node.nodeId} not in nodes`).toBe(true);
        }
      }

      // CP costs should match tier
      for (const node of tree.nodes) {
        const expectedCosts: Record<number, number> = {1:100, 2:150, 3:200, 4:250, 5:300};
        expect(node.cpCost).toBe(expectedCosts[node.tier]);
      }

      console.log(`  ${classDef.id}: archetype=${result.archetypeId}, theme=${result.themeId}, nodes=${tree.nodes.length} (${activeCount}A/${passiveCount}P), tiers=${[...tiers].sort().join(",")}`);
    }
  });

  it("picks all 3 archetypes for a class across multiple seeds", () => {
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const rng = makeRng(seed);
      const result = generateArchetypeTree("bladesinger", null, rng);
      seen.add(result.archetypeId);
    }
    expect(seen.size).toBe(3);
    console.log(`  Bladesinger archetypes seen: ${[...seen].join(", ")}`);
  });

  it("generates different tree structures for different archetypes of same class", () => {
    const trees = [];
    for (let i = 0; i < 3; i++) {
      const registry: Record<string, GeneratedAbility> = {};
      setAbilityRegistry(registry);
      const rng = makeRng(42);
      const result = generateArchetypeTree("bladesinger", i, rng);
      trees.push({ id: result.archetypeId, nodeIds: result.tree.nodes.map(n => n.nodeId) });
    }
    // All 3 archetypes should have different IDs and different node IDs
    expect(trees[0]!.id).not.toBe(trees[1]!.id);
    expect(trees[1]!.id).not.toBe(trees[2]!.id);
    expect(trees[0]!.nodeIds).not.toEqual(trees[1]!.nodeIds);
    console.log(`  Archetype 0: ${trees[0]!.id} → ${trees[0]!.nodeIds.length} nodes: ${trees[0]!.nodeIds.slice(0, 4).join(", ")}...`);
    console.log(`  Archetype 1: ${trees[1]!.id} → ${trees[1]!.nodeIds.length} nodes: ${trees[1]!.nodeIds.slice(0, 4).join(", ")}...`);
    console.log(`  Archetype 2: ${trees[2]!.id} → ${trees[2]!.nodeIds.length} nodes: ${trees[2]!.nodeIds.slice(0, 4).join(", ")}...`);
  });

  it("abilities have design-doc names from skill_trees.txt", () => {
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const rng = makeRng(42);
    const result = generateArchetypeTree("chronoweaver", 0, rng);

    // Chronoweaver Accelerant archetype should have design-doc ability names
    const abilityNames = result.tree.nodes.map(n => resolveAbility(n.abilityUid)!.name);
    console.log(`  Chronoweaver Accelerant abilities: ${abilityNames.join(", ")}`);

    // These exact names come from skill_trees.txt
    expect(abilityNames).toContain("Quicken");
    expect(abilityNames).toContain("Tempo Tap");
    expect(abilityNames).toContain("Blink Step");
    expect(abilityNames).toContain("Infinite Loop");
  });
});
