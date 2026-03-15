/**
 * Skill fidelity pass 1: one test per (testable) ability.
 * Each test runs the ability through the engine with a unit + target and asserts
 * that every effect produces the exact outcome described by the ability's params
 * (e.g. bleed applies with dmgPerTurn X, and one tick deals exactly X damage).
 * Failures indicate the engine does not fully support that skill; pass 2 will fix.
 */

import { describe, it, expect, afterAll } from "vitest";
import { defaultRulesetAbilities } from "@data/ruleset/defaultRuleset";
import {
  runSkillFidelityTest,
  isTestableForFidelity,
  type SkillFidelityResult,
} from "./skillFidelityRunner";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const AUDIT_DIR = resolve(process.cwd(), "audit");
const AUDIT_FILE = resolve(AUDIT_DIR, "skill-fidelity.log");

const results: SkillFidelityResult[] = [];

describe("Skill fidelity (pass 1)", () => {
  const testable = defaultRulesetAbilities.filter(isTestableForFidelity);

  for (const ability of testable) {
    it(`${ability.name} (${ability.id})`, () => {
      const result = runSkillFidelityTest(ability);
      results.push(result);
      expect(result.passed, result.summary).toBe(true);
    });
  }
});

afterAll(() => {
  try {
    mkdirSync(AUDIT_DIR, { recursive: true });
  } catch {
    // ignore
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const lines: string[] = [
    "# Skill fidelity audit (pass 1)",
    `# Run: ${new Date().toISOString()}`,
    `# Total testable: ${results.length}`,
    `# Passed: ${passed}`,
    `# Failed: ${failed.length}`,
    "",
  ];
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    lines.push(`## ${status} ${r.skillName} (${r.skillId})`);
    for (const c of r.checks) {
      const cStatus = c.passed ? "ok" : "FAIL";
      lines.push(`  - ${cStatus} ${c.name}`);
      if (!c.passed && c.expected != null && c.actual != null) {
        lines.push(`      expected: ${c.expected}`);
        lines.push(`      actual: ${c.actual}`);
      }
    }
    if (!r.passed) {
      lines.push(`  summary: ${r.summary}`);
    }
    lines.push("");
  }
  lines.push("# End of audit");
  try {
    writeFileSync(AUDIT_FILE, lines.join("\n"), "utf8");
  } catch (e) {
    console.warn("Could not write skill-fidelity.log:", e);
  }
});
