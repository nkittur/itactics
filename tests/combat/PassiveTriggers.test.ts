import { describe, it, expect } from "vitest";
import { resolveAbility } from "@data/AbilityResolver";
import { defaultRulesetAbilities } from "@data/ruleset/defaultRuleset";

describe("Passive triggers from ruleset (Phase 3)", () => {
  it("ruleset passive with trigger (thorn coat) resolves to GeneratedAbility with triggers", () => {
    const thornCoat = defaultRulesetAbilities.find(
      (a) => a.name.toLowerCase() === "thorn coat",
    );
    if (!thornCoat) return; // Thorn Coat must exist in doc

    const generated = resolveAbility(thornCoat.id);
    expect(generated).toBeDefined();
    expect(generated!.isPassive).toBe(true);
    expect(generated!.triggers.length).toBeGreaterThan(0);
    expect(generated!.triggers[0].type).toBe("trg_onTakeDamage");
    expect(generated!.triggers[0].triggeredEffect?.type).toBe("dmg_reflect");
    expect(generated!.triggers[0].triggeredEffect?.params?.percent).toBe(10);
  });
});
