import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { ArmorComponent } from "@entities/components/Armor";
import type { PerksComponent } from "@entities/components/Perks";
import type { TalentStarsComponent } from "@entities/components/TalentStars";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import type { SpriteRefComponent } from "@entities/components/SpriteRef";
import type { RosterMember } from "./SaveManager";

/**
 * Extract surviving player entities from the world into serializable RosterMember objects.
 */
export function entitiesToRoster(world: World, playerIds: string[]): RosterMember[] {
  const roster: RosterMember[] = [];

  for (const entityId of playerIds) {
    const health = world.getComponent<HealthComponent>(entityId as EntityId, "health");
    if (!health || health.current <= 0) continue;

    const stats = world.getComponent<StatsComponent>(entityId as EntityId, "stats");
    if (!stats) continue;

    const team = world.getComponent<{ readonly type: "team"; team: string; name: string }>(entityId as EntityId, "team");
    const equip = world.getComponent<EquipmentComponent>(entityId as EntityId, "equipment");
    const armor = world.getComponent<ArmorComponent>(entityId as EntityId, "armor");
    const perks = world.getComponent<PerksComponent>(entityId as EntityId, "perks");
    const talents = world.getComponent<TalentStarsComponent>(entityId as EntityId, "talentStars");
    const charClass = world.getComponent<CharacterClassComponent>(entityId as EntityId, "characterClass");
    const sprite = world.getComponent<SpriteRefComponent>(entityId as EntityId, "spriteRef");

    const member: RosterMember = {
      name: team?.name ?? entityId,
      classId: charClass?.classId,
      level: stats.level,
      experience: stats.experience,
      stats: {
        hitpoints: stats.hitpoints,
        stamina: stats.stamina,
        mana: stats.mana,
        resolve: stats.resolve,
        initiative: stats.initiative,
        meleeSkill: stats.meleeSkill,
        rangedSkill: stats.rangedSkill,
        dodge: stats.dodge,
        magicResist: stats.magicResist,
        movementPoints: stats.movementPoints,
      },
      maxHp: health.max,
      talentStars: talents?.stars ?? {
        hitpoints: 0, stamina: 0, resolve: 0, initiative: 0,
        meleeSkill: 0, rangedSkill: 0, dodge: 0,
      },
      perks: {
        unlocked: perks?.unlocked ?? [],
        availablePoints: perks?.availablePoints ?? 0,
      },
      equipment: {
        mainHand: equip?.mainHand ?? null,
        offHand: equip?.offHand ?? null,
        accessory: equip?.accessory ?? null,
        bag: equip?.bag ?? [],
      },
      armor: {
        body: armor?.body ? { ...armor.body } : null,
        head: armor?.head ? { ...armor.head } : null,
      },
      spriteType: sprite?.atlasKey,
    };

    roster.push(member);
  }

  return roster;
}
