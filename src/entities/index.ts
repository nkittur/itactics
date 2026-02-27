// Core ECS types
export type { EntityId } from "./Entity";
export type { Component } from "./Component";
export type { System } from "./System";
export { World } from "./World";

// Components
export type { PositionComponent } from "./components/Position";
export { createPosition } from "./components/Position";

export type { StatsComponent } from "./components/Stats";
export { createStats } from "./components/Stats";

export type { HealthComponent } from "./components/Health";
export { createHealth } from "./components/Health";

export type { ArmorComponent, ArmorSlot } from "./components/Armor";
export { createArmor } from "./components/Armor";

export type { EquipmentComponent } from "./components/Equipment";
export { createEquipment } from "./components/Equipment";

export type { MoraleComponent, MoraleState } from "./components/Morale";
export { createMorale } from "./components/Morale";

export type { StaminaComponent } from "./components/Stamina";
export { createStamina } from "./components/Stamina";

export type { ManaComponent } from "./components/Mana";
export { createMana } from "./components/Mana";

export type { InitiativeComponent } from "./components/Initiative";
export { createInitiative } from "./components/Initiative";

export type { StatusEffectsComponent, StatusEffect } from "./components/StatusEffects";
export { createStatusEffects } from "./components/StatusEffects";

export type { AIBehaviorComponent, AIType } from "./components/AIBehavior";
export { createAIBehavior } from "./components/AIBehavior";

export type { SpriteRefComponent } from "./components/SpriteRef";
export { createSpriteRef } from "./components/SpriteRef";

export type { BackgroundComponent } from "./components/Background";
export { createBackground } from "./components/Background";

export type { PerksComponent } from "./components/Perks";
export { createPerks } from "./components/Perks";
