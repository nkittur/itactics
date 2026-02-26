/**
 * Demo battle scene: 10x8 hex grid, 3 player units vs 3 enemies.
 * Wires together all systems for a playable tactical combat prototype.
 */

import { World } from "@entities/World";
import { HexGrid, TerrainType } from "@hex/HexGrid";
import type { HexTile } from "@hex/HexGrid";
import { createLayout, hexToPixel } from "@hex/HexLayout";
import type { HexLayout } from "@hex/HexLayout";
import { CombatManager } from "@combat/CombatManager";
import { SceneManager } from "@rendering/SceneManager";
import { CameraController } from "@rendering/CameraController";
import { TileRenderer } from "@rendering/TileRenderer";
import { UnitRenderer, UnitTeam } from "@rendering/UnitRenderer";
import { OverlayRenderer } from "@rendering/OverlayRenderer";
import { TouchManager } from "@input/TouchManager";
import { UIManager } from "@ui/UIManager";
import { ActionBar } from "@ui/ActionBar";
import { TurnOrderBar } from "@ui/TurnOrderBar";
import { UnitInfoPanel } from "@ui/UnitInfoPanel";
import type { EntityId } from "@entities/Entity";
import type { HealthComponent } from "@entities/components/Health";
import type { PositionComponent } from "@entities/components/Position";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { hasLineOfSight } from "@hex/HexLineOfSight";
import type { AttackResult } from "@combat/DamageCalculator";
import { getZoCDangerHexes } from "@combat/ZoneOfControl";
import { UNARMED } from "@data/WeaponData";
import { resolveWeapon, resolveShield, resolveArmor, resolveItemName, setItemRegistry } from "@data/ItemResolver";
import { setAbilityRegistry } from "@data/AbilityResolver";
import { createAbilities } from "@entities/components/Abilities";
import { createAbilityCooldowns } from "@entities/components/AbilityCooldowns";
import { SCENARIOS, type ScenarioDef } from "@data/ScenarioData";
import { generateBattle } from "@data/BattleGenerator";
import { generateContracts } from "@data/ContractData";
import { generateRecruits, getPartyLevel } from "@data/RecruitData";
import { TILT_SIN } from "@rendering/CameraController";
import { LAYER_HEIGHT } from "@rendering/TileRenderer";
import { EnemyDetailPanel, type EnemyDetailData } from "@ui/EnemyDetailPanel";
import { AttackPreviewPanel } from "@ui/AttackPreviewPanel";
import { UndoButton } from "@ui/UndoButton";
import { skillAPCost, skillRange } from "@data/SkillData";
import { getClassDef, type CharacterClass } from "@data/ClassData";
import { getItemCategory } from "@data/ItemData";
import { generateTalentStars, type StatKey } from "@data/TalentData";
import { canLevelUp, xpForNextLevel } from "@data/LevelData";
import { createTalentStars } from "@entities/components/TalentStars";
import type { TalentStarsComponent } from "@entities/components/TalentStars";
import { createPerks } from "@entities/components/Perks";
import type { PerksComponent } from "@entities/components/Perks";
import { calculateBattleXP, type XPAward } from "@combat/XPCalculator";
import { calculateBattleCP, type CPAward } from "@combat/CPCalculator";
import { BattleEndScreen } from "@ui/BattleEndScreen";
import { LevelUpModal, type LevelUpResult } from "@ui/LevelUpModal";
import { calculateGoldReward } from "@data/StoreData";
import { saveGame, loadGame, deleteSave, type SaveData, type BattleState } from "@save/SaveManager";
import { entitiesToRoster } from "@save/RosterUtils";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import type { FatigueComponent } from "@entities/components/Fatigue";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { ArmorComponent } from "@entities/components/Armor";
import type { StatsComponent } from "@entities/components/Stats";
import type { MoraleComponent } from "@entities/components/Morale";
import type { AIType } from "@entities/components/AIBehavior";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { SpriteRefComponent } from "@entities/components/SpriteRef";

// ── Terrain configs ──

const TERRAIN_CONFIGS: Record<TerrainType, Omit<HexTile, "q" | "r" | "elevation" | "occupant">> = {
  [TerrainType.Grass]: { terrain: TerrainType.Grass, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Forest]: { terrain: TerrainType.Forest, blocksLoS: true, movementCost: 2, defenseBonusMelee: 0, defenseBonusRanged: 10 },
  [TerrainType.Swamp]: { terrain: TerrainType.Swamp, blocksLoS: false, movementCost: 3, defenseBonusMelee: -10, defenseBonusRanged: 0 },
  [TerrainType.Hills]: { terrain: TerrainType.Hills, blocksLoS: false, movementCost: 2, defenseBonusMelee: 5, defenseBonusRanged: 5 },
  [TerrainType.Mountains]: { terrain: TerrainType.Mountains, blocksLoS: true, movementCost: Infinity, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Sand]: { terrain: TerrainType.Sand, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Snow]: { terrain: TerrainType.Snow, blocksLoS: false, movementCost: 2, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Water]: { terrain: TerrainType.Water, blocksLoS: false, movementCost: Infinity, defenseBonusMelee: 0, defenseBonusRanged: 0 },
  [TerrainType.Road]: { terrain: TerrainType.Road, blocksLoS: false, movementCost: 1, defenseBonusMelee: 0, defenseBonusRanged: 0 },
};

export interface TeamComponent {
  readonly type: "team";
  team: "player" | "enemy";
  name: string;
}

// ── Grid + spawn helpers ──

function createGridFromScenario(scenario: ScenarioDef): HexGrid {
  const grid = new HexGrid();

  // Fill with grass
  for (let r = 0; r < scenario.gridHeight; r++) {
    for (let q = 0; q < scenario.gridWidth; q++) {
      const config = TERRAIN_CONFIGS[TerrainType.Grass]!;
      grid.set(q, r, { q, r, elevation: 0, occupant: null, ...config });
    }
  }

  // Apply scenario terrain overrides
  for (const tile of scenario.tiles) {
    const config = TERRAIN_CONFIGS[tile.terrain]!;
    grid.set(tile.q, tile.r, {
      q: tile.q,
      r: tile.r,
      elevation: tile.elevation,
      occupant: null,
      ...config,
    });
  }

  return grid;
}

/** Find a free passable hex starting from (q, r), checking neighbors if occupied. */
function findFreeHex(grid: HexGrid, q: number, r: number): { q: number; r: number } {
  const tile = grid.get(q, r);
  if (tile && tile.occupant === null && tile.movementCost < Infinity) {
    return { q, r };
  }
  // Search neighbors
  for (const n of hexNeighbors(q, r)) {
    const nt = grid.get(n.q, n.r);
    if (nt && nt.occupant === null && nt.movementCost < Infinity) {
      return { q: n.q, r: n.r };
    }
  }
  return { q, r }; // fallback
}

interface UnitEquipment {
  weapon?: string;
  shield?: string;
  bodyArmor?: string;
  headArmor?: string;
}

function spawnUnit(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  team: "player" | "enemy",
  name: string,
  stats: { melee: number; defense: number; hp: number; initiative: number; mp?: number },
  equip?: UnitEquipment,
  aiType?: AIType,
  sprite?: SpriteCharType,
  classId?: CharacterClass,
  bag?: string[],
): EntityId {
  // Ensure no overlap
  const pos = findFreeHex(grid, q, r);

  const id = world.createEntity();

  world.addComponent(id, {
    type: "position",
    q: pos.q,
    r: pos.r,
    elevation: grid.get(pos.q, pos.r)?.elevation ?? 0,
    facing: 0,
  });

  world.addComponent(id, {
    type: "stats",
    hitpoints: stats.hp,
    fatigue: 100,
    resolve: 50,
    initiative: stats.initiative,
    meleeSkill: stats.melee,
    rangedSkill: 30,
    meleeDefense: stats.defense,
    rangedDefense: 10,
    movementPoints: stats.mp ?? (classId ? getClassDef(classId).baseMP : 8),
    level: 1,
    experience: 0,
  });

  world.addComponent(id, {
    type: "health",
    current: stats.hp,
    max: stats.hp,
    injuries: [],
  });

  // Build armor from data registry
  const bodyDef = equip?.bodyArmor ? resolveArmor(equip.bodyArmor) : undefined;
  const headDef = equip?.headArmor ? resolveArmor(equip.headArmor) : undefined;
  world.addComponent(id, {
    type: "armor",
    head: headDef
      ? { id: headDef.id, currentDurability: headDef.durability, maxDurability: headDef.durability }
      : null,
    body: bodyDef
      ? { id: bodyDef.id, currentDurability: bodyDef.durability, maxDurability: bodyDef.durability }
      : null,
  });

  const shieldId = equip?.shield ?? null;
  const shieldDef = shieldId ? resolveShield(shieldId) : undefined;
  world.addComponent(id, {
    type: "equipment",
    mainHand: equip?.weapon ?? null,
    offHand: shieldId,
    shieldDurability: shieldDef ? shieldDef.durability : null,
    accessory: null,
    bag: bag ?? [],
  });

  world.addComponent(id, {
    type: "fatigue",
    current: 0,
    max: 100,
    recoveryPerTurn: 15,
  });

  world.addComponent(id, {
    type: "initiative",
    base: stats.initiative,
    effective: stats.initiative,
  });

  world.addComponent(id, {
    type: "morale",
    current: 70,
    state: "steady" as const,
  });

  world.addComponent(id, {
    type: "statusEffects",
    effects: [],
  });

  world.addComponent(id, {
    type: "spriteRef",
    atlasKey: sprite ?? (team === "player" ? "soldier" : "orc"),
    framePrefix: "idle",
    currentFrame: 0,
    tint: null,
  });

  world.addComponent(id, {
    type: "team",
    team,
    name,
  });

  if (classId) {
    world.addComponent(id, {
      type: "characterClass",
      classId,
    } as CharacterClassComponent);
  }

  if (team === "player") {
    world.addComponent(id, createTalentStars(generateTalentStars(Math.random)));
    world.addComponent(id, createPerks());
  }

  if (team === "enemy") {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType: (aiType ?? "aggressive") as AIType,
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }

  const tile = grid.get(pos.q, pos.r);
  if (tile) tile.occupant = id;

  return id;
}

// ── DemoBattle ──

export class DemoBattle {
  private sceneManager: SceneManager;
  private camera: CameraController;
  private tileRenderer: TileRenderer;
  private unitRenderer: UnitRenderer;
  private overlayRenderer: OverlayRenderer;
  private touchManager: TouchManager;
  private uiManager: UIManager;
  private actionBar: ActionBar;
  private turnOrderBar: TurnOrderBar;
  private unitInfoPanel: UnitInfoPanel;

  private world: World;
  private grid: HexGrid;
  private layout: HexLayout;
  private combat: CombatManager;

  private playerIds: EntityId[] = [];
  private enemyIds: EntityId[] = [];

  // ── Enemy detail panel (long-press) ──
  private enemyDetailPanel: EnemyDetailPanel;
  private enemyDetailOpen = false;
  private detailEntityId: EntityId | null = null;

  // ── Attack preview (tap-to-confirm) ──
  private attackPreviewPanel: AttackPreviewPanel;
  private undoButton: UndoButton;
  private attackPreviewTarget: { q: number; r: number; entityId: EntityId } | null = null;

  // ── Animation queue ──
  private animQueue: Array<(done: () => void) => void> = [];
  private animPlaying = false;

  // ── Battle end / level-up / store ──
  private battleEndScreen: BattleEndScreen;
  private levelUpModal: LevelUpModal;
  private saveData: SaveData | null = null;
  private scenarioId: string = "";

  // ── AI mode ──
  private aiMode = false;
  private aiBtn: HTMLButtonElement = null!;
  private aiTurnTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Speed toggle ──
  private speedMultiplier = 1;
  private speedBtn: HTMLButtonElement;

  private readonly BASE_MOVE_MS = 180;   // per hex step
  private readonly BASE_LUNGE_MS = 280;  // total lunge
  private readonly BASE_PAN_MS = 350;    // camera pan

  private incomingSaveData: SaveData | null;

  constructor(canvas: HTMLCanvasElement, saveDataOrIndex: SaveData | number = 0) {
    // Scene setup
    this.sceneManager = new SceneManager(canvas);
    this.camera = new CameraController(
      this.sceneManager.scene,
      this.sceneManager.engine
    );
    this.layout = createLayout(1.0);

    // Resolve scenario from SaveData (contract) or legacy index
    let scenario: ScenarioDef;
    if (typeof saveDataOrIndex === "number") {
      // Legacy path: direct scenario index
      scenario = SCENARIOS[saveDataOrIndex % SCENARIOS.length]!;
      this.incomingSaveData = null;
    } else {
      this.incomingSaveData = saveDataOrIndex;
      // Initialize item registry for generated items
      if (saveDataOrIndex.itemRegistry) {
        setItemRegistry(saveDataOrIndex.itemRegistry);
      }
      // Initialize ability registry for generated abilities
      if (saveDataOrIndex.abilityRegistry) {
        setAbilityRegistry(saveDataOrIndex.abilityRegistry);
      }
      if (saveDataOrIndex.pendingContract) {
        scenario = generateBattle(
          saveDataOrIndex.pendingContract,
          saveDataOrIndex.roster,
          () => Math.random(),
        );
      } else {
        scenario = SCENARIOS[0]!;
      }
    }
    this.scenarioId = scenario.id;

    // Game state
    this.world = new World();
    this.grid = createGridFromScenario(scenario);

    // Rendering
    this.tileRenderer = new TileRenderer(this.sceneManager.scene);
    this.tileRenderer.buildGrid(this.grid, this.layout);

    this.unitRenderer = new UnitRenderer(this.sceneManager.scene, this.layout);
    this.unitRenderer.setGrid(this.grid);
    this.overlayRenderer = new OverlayRenderer(this.sceneManager.scene);
    this.overlayRenderer.setGrid(this.grid);

    // Spawn units from scenario
    this.spawnFromScenario(scenario);

    // Add ability components for player units from roster data
    if (this.incomingSaveData?.roster) {
      for (let i = 0; i < this.playerIds.length && i < this.incomingSaveData.roster.length; i++) {
        const pid = this.playerIds[i]!;
        const member = this.incomingSaveData.roster[i]!;
        // Filter abilities by skill tree unlock state (or fall back to legacy level-based)
        let unlockedAbilities: string[];
        if (member.skillTree) {
          const unlockedNodes = new Set(member.unlockedNodes ?? []);
          unlockedAbilities = member.skillTree.nodes
            .filter(n => unlockedNodes.has(n.nodeId))
            .map(n => n.abilityUid);
        } else {
          // Legacy: level-based unlock
          unlockedAbilities = (member.abilities ?? []).filter(uid => {
            const unlockLvl = member.abilityUnlockLevels?.[uid] ?? 0;
            return member.level >= unlockLvl;
          });
        }
        this.world.addComponent(pid, createAbilities(unlockedAbilities));
        this.world.addComponent(pid, createAbilityCooldowns());
      }
    }

    // Render units with tint indices for visual differentiation
    for (let i = 0; i < this.playerIds.length; i++) {
      const id = this.playerIds[i]!;
      const pos = this.world.getComponent<{ type: "position"; q: number; r: number }>(id, "position")!;
      const spriteRef = this.world.getComponent<SpriteRefComponent>(id, "spriteRef");
      this.unitRenderer.addUnit(id, pos.q, pos.r, UnitTeam.Player, spriteRef?.atlasKey as SpriteCharType | undefined, i);
    }
    for (let i = 0; i < this.enemyIds.length; i++) {
      const id = this.enemyIds[i]!;
      const pos = this.world.getComponent<{ type: "position"; q: number; r: number }>(id, "position")!;
      const spriteRef = this.world.getComponent<SpriteRefComponent>(id, "spriteRef");
      this.unitRenderer.addUnit(id, pos.q, pos.r, UnitTeam.Enemy, spriteRef?.atlasKey as SpriteCharType | undefined, i);
    }

    // UI
    this.uiManager = new UIManager();
    this.actionBar = new ActionBar(this.uiManager.root);
    this.turnOrderBar = new TurnOrderBar(this.uiManager.root);
    this.unitInfoPanel = new UnitInfoPanel(this.uiManager.root);

    this.undoButton = new UndoButton(this.uiManager.root);
    this.enemyDetailPanel = new EnemyDetailPanel(this.uiManager.root);
    this.enemyDetailPanel.onDismiss = () => this.hideEnemyDetail();
    this.enemyDetailPanel.onSwapEquipment = (eid, bagIdx, slot) => {
      if (this.combat.swapEquipment(eid, bagIdx, slot)) {
        this.refreshDetailPanel();
        this.refreshAfterEquipAction(eid);
      }
    };
    this.enemyDetailPanel.onUnequipToBag = (eid, slot) => {
      if (this.combat.unequipToBag(eid, slot)) {
        this.refreshDetailPanel();
        this.refreshAfterEquipAction(eid);
      }
    };
    this.enemyDetailPanel.onUseConsumable = (eid, bagIdx) => {
      if (this.combat.useConsumable(eid, bagIdx)) {
        this.refreshDetailPanel();
        this.refreshAfterEquipAction(eid);
      }
    };
    this.attackPreviewPanel = new AttackPreviewPanel(this.uiManager.root);
    this.battleEndScreen = new BattleEndScreen(this.uiManager.root);
    this.levelUpModal = new LevelUpModal(this.uiManager.root);


    // Speed toggle
    this.speedBtn = document.createElement("button");
    this.speedBtn.className = "speed-toggle";
    this.speedBtn.textContent = "x1";
    this.speedBtn.addEventListener("pointerup", () => {
      if (this.speedMultiplier === 1) this.speedMultiplier = 2;
      else if (this.speedMultiplier === 2) this.speedMultiplier = 4;
      else this.speedMultiplier = 1;
      this.speedBtn.textContent = `x${this.speedMultiplier}`;
    });
    this.uiManager.root.appendChild(this.speedBtn);

    // AI mode toggle (left of speed toggle)
    this.aiBtn = document.createElement("button");
    this.aiBtn.className = "ai-toggle";
    this.aiBtn.textContent = "AI";
    this.aiBtn.addEventListener("pointerup", () => {
      this.aiMode = !this.aiMode;
      this.aiBtn.classList.toggle("ai-active", this.aiMode);
      // If toggled on during a player turn, auto-play immediately
      if (this.aiMode && this.combat.phase === "playerTurn"
          && this.combat.playerTurnState === "awaitingInput") {
        this.scheduleAITurn();
      }
    });
    this.uiManager.root.appendChild(this.aiBtn);

    // Settings gear button (top-left)
    this.createSettingsButton();

    // Input
    this.touchManager = new TouchManager(
      canvas,
      this.sceneManager.scene,
      this.camera,
      this.layout
    );

    // Combat
    this.combat = new CombatManager(this.world, this.grid, 42);

    // Wire up events
    this.wireEvents();

    // Center camera on grid, offset for bottom-heavy UI
    // Bottom UI (action bar + info panel) ≈ 220px, top UI (turn order) ≈ 40px
    // Shift camera target down-screen so grid appears centered in usable area
    const center = hexToPixel(this.layout, Math.floor(scenario.gridWidth / 2), Math.floor(scenario.gridHeight / 2));
    this.camera.centerOn(center.x, center.y - this.uiPanOffset);

    // Handle resize
    window.addEventListener("resize", () => {
      this.sceneManager.resize();
      this.camera.updateOrtho();
    });
  }

  private spawnFromScenario(scenario: ScenarioDef): void {
    for (const unit of scenario.units) {
      const id = spawnUnit(
        this.world, this.grid,
        unit.q, unit.r,
        unit.team, unit.name, unit.stats,
        {
          weapon: unit.weapon,
          shield: unit.shield,
          bodyArmor: unit.bodyArmor,
          headArmor: unit.headArmor,
        },
        unit.aiType,
        unit.sprite,
        unit.classId,
        unit.bag,
      );
      if (unit.team === "player") {
        this.playerIds.push(id);
      } else {
        this.enemyIds.push(id);
      }
    }
  }

  // ── Animation queue ──

  private queueAnim(fn: (done: () => void) => void): void {
    this.animQueue.push(fn);
    // Don't auto-start — drainQueue is triggered by onActionComplete
  }

  private drainQueue(): void {
    if (this.animQueue.length === 0) {
      this.animPlaying = false;
      // All animations done — continue the game flow
      this.combat.continueAfterAnimation();
      // Auto-save after each completed action
      if (this.combat.phase !== "battleEnd") {
        this.autoSave();
      }
      return;
    }
    this.animPlaying = true;
    const next = this.animQueue.shift()!;
    next(() => this.drainQueue());
  }

  private moveDuration(): number { return this.BASE_MOVE_MS / this.speedMultiplier; }
  private lungeDuration(): number { return this.BASE_LUNGE_MS / this.speedMultiplier; }
  private panDuration(): number { return this.BASE_PAN_MS / this.speedMultiplier; }

  // ── Event wiring ──

  private wireEvents(): void {
    // Touch/Click -> Combat (with attack preview interception)
    this.touchManager.onHexTap = (q: number, r: number) => {
      if (this.animPlaying) return;

      // If enemy detail panel is open, close it and consume the tap
      if (this.enemyDetailOpen) {
        this.hideEnemyDetail();
        return;
      }

      // If attack preview is showing, handle confirm/cancel
      if (this.attackPreviewTarget) {
        if (q === this.attackPreviewTarget.q && r === this.attackPreviewTarget.r) {
          this.confirmAttackPreview();
        } else {
          this.cancelAttackPreview();
          if (this.combat.canAttackHex(q, r)) {
            this.showAttackPreview(q, r);
          } else {
            this.combat.handleHexTap(q, r);
          }
        }
        return;
      }

      // Check if this tap would be an attack — show preview instead
      if (this.combat.canAttackHex(q, r)) {
        this.showAttackPreview(q, r);
        return;
      }

      // Self-targeting skill: show stance preview on own hex
      if (this.combat.playerTurnState === "skillTargeting"
          && this.combat.pendingSkill?.targetType === "self") {
        const targetHexes = this.combat.getSkillTargetHexes();
        if (targetHexes.has(`${q},${r}`)) {
          this.showStancePreview(q, r);
          return;
        }
      }

      // Normal handling (move, etc.)
      this.combat.handleHexTap(q, r);
    };

    // Long-press -> Enemy detail panel (stays open until next tap)
    this.touchManager.onHexLongPress = (q: number, r: number) => {
      if (this.animPlaying) return;
      this.showEnemyDetail(q, r);
    };
    this.touchManager.onLongPressEnd = () => {
      // No-op: panel stays open until next tap
    };

    // Action bar -> Combat
    this.actionBar.onAction = (action) => {
      if (this.animPlaying) return;
      this.combat.handleAction(action);
    };

    // Skill button -> activate skill targeting
    this.actionBar.onSkillSelect = (skill) => {
      if (this.animPlaying) return;
      this.cancelAttackPreview();
      this.combat.activateSkill(skill);
    };

    // Undo button
    this.undoButton.onUndo = () => {
      if (this.animPlaying) return;
      this.combat.handleUndo();
    };

    // ── Combat callbacks ──

    // Unit moved (animate)
    this.combat.onUnitMoved = (entityId: EntityId, path: Array<{ q: number; r: number }>) => {
      if (path.length === 0) return;
      this.queueAnim((done) => {
        this.unitRenderer.animateMove(entityId, path, this.moveDuration(), () => {
          // Ensure final position is exact
          const dest = path[path.length - 1]!;
          this.unitRenderer.updatePosition(entityId, dest.q, dest.r);
          if (this.combat.selectedUnit === entityId) {
            this.unitRenderer.setSelected(entityId);
          }
          done();
        });
      });
    };

    // Unit teleported (instant — e.g. undo)
    this.combat.onUnitTeleported = (entityId: EntityId, q: number, r: number) => {
      this.unitRenderer.updatePosition(entityId, q, r);
      if (this.combat.selectedUnit === entityId) {
        this.unitRenderer.setSelected(entityId);
      }
    };

    // Attack resolved (animate lunge, then show result)
    this.combat.onAttackResult = (result: AttackResult, attackerId: EntityId, defenderId: EntityId) => {
      // Capture defender position now (before potential death removal)
      const defPos = this.world.getComponent<PositionComponent>(defenderId, "position");
      const defWorld = defPos ? hexToPixel(this.layout, defPos.q, defPos.r) : null;

      this.queueAnim((done) => {
        if (!defWorld) { done(); return; }

        this.unitRenderer.animateLunge(
          attackerId,
          defWorld.x,
          defWorld.y,
          this.lungeDuration(),
          () => {
            this.showDamagePopup(defenderId, result);

            const health = this.world.getComponent<HealthComponent>(defenderId, "health");
            if (health) {
              this.unitRenderer.updateHealthBar(defenderId, health.current, health.max);
            }
            this.updateArmorBarForUnit(defenderId);
            if (result.targetKilled) {
              // Play death animation, then remove
              this.unitRenderer.playDeath(defenderId, () => {
                this.unitRenderer.removeUnit(defenderId);
                this.refreshUI();
                done();
              });
            } else if (result.hit) {
              // Play hurt animation, then continue
              this.unitRenderer.playHurt(defenderId, () => {
                this.refreshUI();
                done();
              });
            } else {
              this.refreshUI();
              done();
            }
          }
        );
      });
    };

    // ZoC free attack (animate same as normal attack)
    this.combat.onZoCAttack = (result: AttackResult, attackerId: EntityId, defenderId: EntityId) => {
      const defPos = this.world.getComponent<PositionComponent>(defenderId, "position");
      const defWorld = defPos ? hexToPixel(this.layout, defPos.q, defPos.r) : null;

      this.queueAnim((done) => {
        if (!defWorld) { done(); return; }

        this.unitRenderer.animateLunge(
          attackerId,
          defWorld.x,
          defWorld.y,
          this.lungeDuration(),
          () => {
            this.showDamagePopup(defenderId, result);

            const health = this.world.getComponent<HealthComponent>(defenderId, "health");
            if (health) {
              this.unitRenderer.updateHealthBar(defenderId, health.current, health.max);
            }
            this.updateArmorBarForUnit(defenderId);
            if (result.targetKilled) {
              this.unitRenderer.playDeath(defenderId, () => {
                this.unitRenderer.removeUnit(defenderId);
                this.refreshUI();
                done();
              });
            } else if (result.hit) {
              this.unitRenderer.playHurt(defenderId, () => {
                this.refreshUI();
                done();
              });
            } else {
              this.refreshUI();
              done();
            }
          }
        );
      });
    };

    // Bleed tick popup
    this.combat.onBleedTick = (result) => {
      this.showTextPopup(result.entityId, `-${result.damage} bleed`, "#cc4444");
      const health = this.world.getComponent<HealthComponent>(result.entityId, "health");
      if (health) {
        this.unitRenderer.updateHealthBar(result.entityId, health.current, health.max);
      }
      if (result.killed) {
        this.unitRenderer.playDeath(result.entityId, () => {
          this.unitRenderer.removeUnit(result.entityId);
        });
      }
    };

    // Morale change popup
    this.combat.onMoraleChange = (result) => {
      const stateLabels: Record<string, string> = {
        wavering: "Wavering!",
        breaking: "Breaking!",
        fleeing: "Fleeing!",
        confident: "Confident!",
      };
      const label = stateLabels[result.newState];
      if (label) {
        const color = result.newState === "confident" ? "#44cc44" : "#cccc44";
        this.showTextPopup(result.entityId, label, color);
      }
    };

    // Status effect applied popup
    this.combat.onStatusApplied = (entityId, effectId) => {
      const labels: Record<string, string> = {
        stun: "Stunned!",
        bleed: "Bleeding!",
        daze: "Dazed!",
      };
      const label = labels[effectId];
      if (label) {
        this.showTextPopup(entityId, label, "#cc8844");
      }
    };

    // Passive trigger popup
    this.combat.onPassiveTriggered = (entityId, passiveName, effect) => {
      this.showTextPopup(entityId, `${effect} (${passiveName})`, "#44ddaa");
    };

    // Turn skipped popup
    this.combat.onTurnSkipped = (entityId, reason) => {
      this.showTextPopup(entityId, reason, "#999999");
    };

    // Action complete — start draining animation queue
    this.combat.onActionComplete = () => {
      if (this.animQueue.length > 0) {
        if (!this.animPlaying) this.drainQueue();
      } else {
        // No animations queued (e.g. enemy waited) — continue immediately
        this.combat.continueAfterAnimation();
        // Auto-save after each completed action
        if (this.combat.phase !== "battleEnd") {
          this.autoSave();
        }
      }
    };

    // Phase changed
    this.combat.onPhaseChange = (phase) => {
      if (phase === "enemyTurn") {
        this.actionBar.setVisible(false);
        this.actionBar.clearSkills();
        this.undoButton.setVisible(false);
        this.unitInfoPanel.hide();
        this.overlayRenderer.clearOverlays();
        this.hideEnemyDetail();
        this.cancelAttackPreview();
      } else if (phase === "playerTurn") {
        if (this.combat.selectedUnit) {
          this.unitRenderer.setSelected(this.combat.selectedUnit);
          this.showUnitInfo(this.combat.selectedUnit);
        }
        this.refreshUI();
      } else if (phase === "battleEnd") {
        this.actionBar.setVisible(false);
        this.actionBar.clearSkills();
        this.undoButton.setVisible(false);
        this.unitInfoPanel.hide();
        this.overlayRenderer.clearOverlays();
        this.hideEnemyDetail();
        this.cancelAttackPreview();
      }
    };

    // Battle end → show XP / level-up flow
    this.combat.onBattleEnd = (victory: boolean) => {
      this.handleBattleEnd(victory);
    };

    // Turn advanced → select unit, pan camera
    this.combat.onTurnAdvance = (entityId: EntityId) => {
      this.unitRenderer.setSelected(entityId);
      this.showUnitInfo(entityId);
      this.panCameraToUnit(entityId);
    };

    // Player state changed → update overlays + action bar skills
    this.combat.onPlayerStateChange = (state) => {
      this.overlayRenderer.clearOverlays();
      this.hideEnemyDetail();
      this.cancelAttackPreview();

      if (state === "awaitingInput") {
        this.showMoveAndAttackOverlays();
        this.populateActionBarSkills();
        this.actionBar.setSkillActive(null);
        // AI mode: auto-play the turn
        if (this.aiMode) {
          this.scheduleAITurn();
        }
      } else if (state === "skillTargeting") {
        this.showSkillTargetOverlays();
        this.actionBar.setSkillActive(this.combat.pendingSkill?.id ?? null);
      }

      this.refreshUI();
    };
  }

  // ── Overlays ──

  private showMoveAndAttackOverlays(): void {
    if (!this.combat.selectedUnit || !this.combat.moveRange) return;

    this.overlayRenderer.showMovementRange(this.combat.moveRange, this.layout);

    const pos = this.world.getComponent<PositionComponent>(this.combat.selectedUnit, "position");
    if (!pos) return;

    // ZoC danger overlay — highlight hexes that trigger free attacks
    const zocDanger = getZoCDangerHexes(
      this.world, this.grid, this.combat.selectedUnit,
      pos.q, pos.r,
    );
    if (zocDanger.size > 0) {
      this.overlayRenderer.showZoCDanger(zocDanger, this.layout);
    }

    const attackHexes = this.getAttackableEnemyHexes(pos);
    if (attackHexes.size > 0) {
      this.overlayRenderer.showAttackRange(attackHexes, this.layout);
    }

  }

  private getAttackableEnemyHexes(pos: PositionComponent): Set<string> {
    const hexes = new Set<string>();
    if (!this.combat.selectedUnit) return hexes;

    const skill = this.combat.getActiveSkill();
    const weapon = this.combat.selectedUnit
      ? (this.world.getComponent<EquipmentComponent>(this.combat.selectedUnit, "equipment")?.mainHand
        ? resolveWeapon(this.world.getComponent<EquipmentComponent>(this.combat.selectedUnit, "equipment")!.mainHand!)
        : UNARMED)
      : UNARMED;
    const range = skillRange(skill, weapon);
    const isRanged = skill.rangeType === "ranged";

    if (isRanged) {
      // Scan all enemies within range + LoS
      const allCombatants = this.world.query("health", "position", "team");
      for (const eid of allCombatants) {
        if (eid === this.combat.selectedUnit) continue;
        const team = this.world.getComponent<TeamComponent>(eid, "team");
        if (team?.team !== "enemy") continue;
        const health = this.world.getComponent<HealthComponent>(eid, "health");
        if (!health || health.current <= 0) continue;
        const ep = this.world.getComponent<PositionComponent>(eid, "position");
        if (!ep) continue;
        const dist = hexDistance(pos, ep);
        if (dist <= range && hasLineOfSight(this.grid, pos, ep)) {
          hexes.add(`${ep.q},${ep.r}`);
        }
      }
    } else {
      // Melee: check neighbors within weapon range
      const neighbors = hexNeighbors(pos.q, pos.r);
      for (const n of neighbors) {
        const tile = this.grid.get(n.q, n.r);
        if (tile?.occupant && tile.occupant !== this.combat.selectedUnit) {
          const team = this.world.getComponent<TeamComponent>(tile.occupant, "team");
          if (team?.team === "enemy") {
            if (hexDistance(pos, { q: n.q, r: n.r }) <= range) {
              hexes.add(`${n.q},${n.r}`);
            }
          }
        }
      }
    }
    return hexes;
  }

  // ── Enemy detail panel (long-press) ──

  private showEnemyDetail(q: number, r: number): void {
    const tile = this.grid.get(q, r);
    if (!tile?.occupant) return;

    this.cancelAttackPreview();

    const entityId = tile.occupant;
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    const stats = this.world.getComponent<StatsComponent>(entityId, "stats");
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const armor = this.world.getComponent<ArmorComponent>(entityId, "armor");
    const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
    const morale = this.world.getComponent<MoraleComponent>(entityId, "morale");
    if (!health || !team || !stats) return;

    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    const shield = equip?.offHand ? resolveShield(equip.offHand) : undefined;

    // Body/head armor labels
    let bodyArmorLabel: string | undefined;
    let headArmorLabel: string | undefined;
    if (armor?.body) {
      const def = resolveArmor(armor.body.id);
      bodyArmorLabel = `Body: ${def?.name ?? armor.body.id} ${armor.body.currentDurability}/${armor.body.maxDurability}`;
    }
    if (armor?.head) {
      const def = resolveArmor(armor.head.id);
      headArmorLabel = `Head: ${def?.name ?? armor.head.id} ${armor.head.currentDurability}/${armor.head.maxDurability}`;
    }

    // Morale state label
    let moraleLabel: string | undefined;
    const moraleState = this.combat.morale.getState(this.world, entityId);
    if (moraleState) {
      moraleLabel = moraleState.charAt(0).toUpperCase() + moraleState.slice(1);
    }

    // Status effects
    const statusEffects = this.combat.statusEffects.getActiveEffects(this.world, entityId);

    // Class info
    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    const unitClassDef = cc ? getClassDef(cc.classId) : undefined;
    const classPassives: string[] = [];
    if (unitClassDef) {
      for (const p of unitClassDef.passives) {
        switch (p.type) {
          case "armor_mp_reduction":
            classPassives.push(`Armor MP penalty -${p.value}`);
            break;
          case "ap_discount":
            classPassives.push(`${(p.qualifier ?? "").charAt(0).toUpperCase() + (p.qualifier ?? "").slice(1)} AP -${p.value}`);
            break;
          case "damage_bonus":
            classPassives.push(`${p.qualifier ?? ""} damage +${p.value}%`);
            break;
          case "hit_bonus":
            classPassives.push(`${(p.qualifier ?? "").charAt(0).toUpperCase() + (p.qualifier ?? "").slice(1)} hit +${p.value}`);
            break;
        }
      }
    }

    const isPlayer = team.team === "player";
    const data: EnemyDetailData = {
      name: team.name,
      currentHp: health.current,
      maxHp: health.max,
      className: unitClassDef?.name,
      classPassives: classPassives.length > 0 ? classPassives : undefined,
      weaponName: weapon.name,
      weaponDamage: `${weapon.minDamage}-${weapon.maxDamage}`,
      shieldName: shield?.name,
      bodyArmor: bodyArmorLabel,
      headArmor: headArmorLabel,
      moraleState: moraleLabel,
      moraleCurrent: morale?.current,
      fatigue: fatigue ? { current: fatigue.current, max: fatigue.max } : undefined,
      statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
      meleeSkill: stats.meleeSkill,
      meleeDefense: stats.meleeDefense,
      resolve: stats.resolve,
      initiative: stats.initiative,
      // Interactive fields — only for the active player unit
      isActivePlayerUnit: isPlayer && entityId === this.combat.selectedUnit,
      entityId: isPlayer ? entityId : undefined,
      currentAP: isPlayer ? this.combat.apRemaining : undefined,
      bagItems: isPlayer && equip ? equip.bag.map(id => ({ id, name: resolveItemName(id), category: getItemCategory(id) })) : undefined,
    };

    this.detailEntityId = entityId;
    this.enemyDetailPanel.show(data);
    this.enemyDetailOpen = true;
  }

  private hideEnemyDetail(): void {
    this.enemyDetailPanel.hide();
    this.enemyDetailOpen = false;
    this.detailEntityId = null;
  }

  /** Refresh the detail panel in-place (after equipment actions). */
  private refreshDetailPanel(): void {
    if (this.detailEntityId == null || !this.enemyDetailOpen) return;
    const pos = this.world.getComponent<PositionComponent>(this.detailEntityId, "position");
    if (!pos) return;
    // Rebuild data and refresh without hiding/showing
    const entityId = this.detailEntityId;
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    const stats = this.world.getComponent<StatsComponent>(entityId, "stats");
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const armor = this.world.getComponent<ArmorComponent>(entityId, "armor");
    const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
    const morale = this.world.getComponent<MoraleComponent>(entityId, "morale");
    if (!health || !team || !stats) return;

    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    const shield = equip?.offHand ? resolveShield(equip.offHand) : undefined;

    let bodyArmorLabel: string | undefined;
    let headArmorLabel: string | undefined;
    if (armor?.body) {
      const def = resolveArmor(armor.body.id);
      bodyArmorLabel = `Body: ${def?.name ?? armor.body.id} ${armor.body.currentDurability}/${armor.body.maxDurability}`;
    }
    if (armor?.head) {
      const def = resolveArmor(armor.head.id);
      headArmorLabel = `Head: ${def?.name ?? armor.head.id} ${armor.head.currentDurability}/${armor.head.maxDurability}`;
    }

    let moraleLabel: string | undefined;
    const moraleState = this.combat.morale.getState(this.world, entityId);
    if (moraleState) {
      moraleLabel = moraleState.charAt(0).toUpperCase() + moraleState.slice(1);
    }

    const statusEffects = this.combat.statusEffects.getActiveEffects(this.world, entityId);

    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    const unitClassDef = cc ? getClassDef(cc.classId) : undefined;
    const classPassives: string[] = [];
    if (unitClassDef) {
      for (const p of unitClassDef.passives) {
        switch (p.type) {
          case "armor_mp_reduction":
            classPassives.push(`Armor MP penalty -${p.value}`);
            break;
          case "ap_discount":
            classPassives.push(`${(p.qualifier ?? "").charAt(0).toUpperCase() + (p.qualifier ?? "").slice(1)} AP -${p.value}`);
            break;
          case "damage_bonus":
            classPassives.push(`${p.qualifier ?? ""} damage +${p.value}%`);
            break;
          case "hit_bonus":
            classPassives.push(`${(p.qualifier ?? "").charAt(0).toUpperCase() + (p.qualifier ?? "").slice(1)} hit +${p.value}`);
            break;
        }
      }
    }

    const isPlayer = team.team === "player";
    const data: EnemyDetailData = {
      name: team.name,
      currentHp: health.current,
      maxHp: health.max,
      className: unitClassDef?.name,
      classPassives: classPassives.length > 0 ? classPassives : undefined,
      weaponName: weapon.name,
      weaponDamage: `${weapon.minDamage}-${weapon.maxDamage}`,
      shieldName: shield?.name,
      bodyArmor: bodyArmorLabel,
      headArmor: headArmorLabel,
      moraleState: moraleLabel,
      moraleCurrent: morale?.current,
      fatigue: fatigue ? { current: fatigue.current, max: fatigue.max } : undefined,
      statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
      meleeSkill: stats.meleeSkill,
      meleeDefense: stats.meleeDefense,
      resolve: stats.resolve,
      initiative: stats.initiative,
      isActivePlayerUnit: isPlayer && entityId === this.combat.selectedUnit,
      entityId: isPlayer ? entityId : undefined,
      currentAP: isPlayer ? this.combat.apRemaining : undefined,
      bagItems: isPlayer && equip ? equip.bag.map(id => ({ id, name: resolveItemName(id), category: getItemCategory(id) })) : undefined,
    };

    this.enemyDetailPanel.refresh(data);
  }

  /** After an equipment action, refresh the unit info bar and skill affordability. */
  private refreshAfterEquipAction(entityId: EntityId): void {
    this.showUnitInfo(entityId);
    this.updateSkillAffordability();
  }

  // ── Attack preview (tap-to-confirm) ──

  private showAttackPreview(q: number, r: number): void {
    const tile = this.grid.get(q, r);
    if (!tile?.occupant || !this.combat.selectedUnit) return;

    const entityId = tile.occupant;
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    if (!team) return;

    const cs = this.combat.pendingSkill;
    const skillDef = cs?.skillDef ?? this.combat.getActiveSkill();
    const preview = this.combat.damageCalc.previewSkillAttack(
      this.world, this.combat.selectedUnit, entityId, skillDef,
    );

    this.attackPreviewTarget = { q, r, entityId };
    this.unitInfoPanel.hide();
    this.attackPreviewPanel.show({ targetName: team.name, preview, skill: skillDef });
  }

  private showStancePreview(q: number, r: number): void {
    const cs = this.combat.pendingSkill;
    if (!cs || !this.combat.selectedUnit) return;
    const skillDef = cs.skillDef;
    if (!skillDef) return;

    this.attackPreviewTarget = { q, r, entityId: this.combat.selectedUnit };
    this.unitInfoPanel.hide();
    this.attackPreviewPanel.showStance({ skill: skillDef });
  }

  private confirmAttackPreview(): void {
    if (!this.attackPreviewTarget) return;
    const { q, r } = this.attackPreviewTarget;
    this.attackPreviewTarget = null;
    this.attackPreviewPanel.hide();
    this.combat.handleHexTap(q, r);
  }

  private cancelAttackPreview(): void {
    if (!this.attackPreviewTarget) return;
    this.attackPreviewTarget = null;
    this.attackPreviewPanel.hide();
    if (this.combat.selectedUnit && this.combat.phase === "playerTurn") {
      this.showUnitInfo(this.combat.selectedUnit);
    }
  }

  // ── UI helpers ──

  /** World-Z offset to shift camera target up-screen, compensating for bottom-heavy UI. */
  private get uiPanOffset(): number {
    const canvas = this.sceneManager.engine.getRenderingCanvas();
    const canvasH = canvas?.clientHeight || 700;
    const bottomUI = 220;
    const topUI = 40;
    return ((bottomUI - topUI) / 2 / canvasH) * this.camera.orthoSize * 2 / TILT_SIN;
  }

  private panCameraToUnit(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;
    const worldPos = hexToPixel(this.layout, pos.q, pos.r);
    this.camera.panTo(worldPos.x, worldPos.y - this.uiPanOffset, this.panDuration());
  }

  private showTextPopup(entityId: EntityId, text: string, color: string): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    const worldPos = hexToPixel(this.layout, pos.q, pos.r);
    const tileElev = (this.grid.get(pos.q, pos.r)?.elevation ?? 0) * LAYER_HEIGHT;
    const screenPos = this.camera.worldToScreen(worldPos.x, worldPos.y, tileElev);

    const popup = document.createElement("div");
    popup.className = "damage-popup";
    popup.textContent = text;
    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y - 20}px`;
    popup.style.color = color;

    this.uiManager.root.appendChild(popup);
    popup.addEventListener("animationend", () => popup.remove());
  }

  private showDamagePopup(entityId: EntityId, result: AttackResult): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    const worldPos = hexToPixel(this.layout, pos.q, pos.r);
    const tileElev = (this.grid.get(pos.q, pos.r)?.elevation ?? 0) * LAYER_HEIGHT;
    const screenPos = this.camera.worldToScreen(worldPos.x, worldPos.y, tileElev);

    const popup = document.createElement("div");
    popup.className = "damage-popup";

    if (!result.hit) {
      popup.textContent = "Miss";
      popup.classList.add("miss");
    } else if (result.targetKilled) {
      popup.textContent = `-${result.hpDamage} KILLED`;
      popup.classList.add("kill");
    } else {
      popup.textContent = `-${result.hpDamage}`;
    }

    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y}px`;

    this.uiManager.root.appendChild(popup);
    popup.addEventListener("animationend", () => popup.remove());

    // Armor damage popup (blue, offset below HP popup)
    if (result.hit && result.armorDamage > 0) {
      const armorPopup = document.createElement("div");
      armorPopup.className = "damage-popup armor";
      armorPopup.textContent = `-${result.armorDamage} armor`;
      armorPopup.style.left = `${screenPos.x}px`;
      armorPopup.style.top = `${screenPos.y + 20}px`;
      this.uiManager.root.appendChild(armorPopup);
      armorPopup.addEventListener("animationend", () => armorPopup.remove());
    }
  }

  private updateArmorBarForUnit(entityId: EntityId): void {
    const armor = this.world.getComponent<ArmorComponent>(entityId, "armor");
    if (!armor) return;
    const bodyDur = armor.body?.currentDurability ?? 0;
    const bodyMax = armor.body?.maxDurability ?? 0;
    const headDur = armor.head?.currentDurability ?? 0;
    const headMax = armor.head?.maxDurability ?? 0;
    this.unitRenderer.updateArmorBar(entityId, bodyDur, bodyMax, headDur, headMax);
  }

  private showUnitInfo(entityId: EntityId): void {
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    if (!health || !team) return;

    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    const isCurrentPlayer = this.combat.selectedUnit === entityId && this.combat.phase === "playerTurn";

    const moraleState = this.combat.morale.getState(this.world, entityId);
    const statusEffects = this.combat.statusEffects.getActiveEffects(this.world, entityId);
    // Add active stances to status display
    const stanceTypes = this.combat.skillExecutor.getActiveStanceTypes(this.world, entityId);
    for (const s of stanceTypes) {
      statusEffects.push(s.charAt(0).toUpperCase() + s.slice(1));
    }

    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    const displayName = cc ? `${team.name} (${getClassDef(cc.classId).name})` : team.name;

    this.unitInfoPanel.show(
      displayName,
      health.current,
      health.max,
      isCurrentPlayer ? this.combat.apRemaining : undefined,
      isCurrentPlayer ? this.combat.mpRemaining : undefined,
      isCurrentPlayer ? this.combat.mpMaximum : undefined,
      fatigue ? { current: fatigue.current, max: fatigue.max } : undefined,
      weapon.name,
      moraleState ?? undefined,
      statusEffects.length > 0 ? statusEffects : undefined,
    );
  }

  private populateActionBarSkills(): void {
    const skills = this.combat.getAvailableSkills();
    this.actionBar.setSkills(skills);
    this.updateSkillAffordability();
  }

  private updateSkillAffordability(): void {
    if (!this.combat.selectedUnit) return;
    const skills = this.combat.getAvailableSkills();
    const affordable = new Set<string>();
    for (const cs of skills) {
      if (cs.isBasicAttack) continue;
      const apCost = this.combat.getCombatSkillAPCost(cs);
      if (this.combat.apRemaining >= apCost) {
        affordable.add(cs.id);
      }
    }
    this.actionBar.updateSkillAffordability(affordable);
  }

  private showSkillTargetOverlays(): void {
    const targetHexes = this.combat.getSkillTargetHexes();
    if (targetHexes.size === 0) return;

    const isSelf = this.combat.pendingSkill?.targetType === "self";
    if (isSelf) {
      // Gold overlay at renderingGroupId 3 (above unit sprites)
      this.overlayRenderer.showSelfTargetRange(targetHexes, this.layout);
    } else {
      this.overlayRenderer.showAttackRange(targetHexes, this.layout);
    }
    // Thick gold ring outline on all skill targets
    this.overlayRenderer.showTargetRings(targetHexes, this.layout);
  }

  private refreshOverlays(): void {
    this.overlayRenderer.clearOverlays();
    if (this.combat.phase === "playerTurn") {
      if (this.combat.playerTurnState === "awaitingInput") {
        this.showMoveAndAttackOverlays();
      } else if (this.combat.playerTurnState === "skillTargeting") {
        this.showSkillTargetOverlays();
      }
    }
  }

  private refreshUI(): void {
    const entries = this.combat.turnOrder.getOrder();
    const currentEntry = this.combat.turnOrder.current();
    this.turnOrderBar.update(
      entries,
      currentEntry?.entityId ?? null,
      (id: string) => {
        const team = this.world.getComponent<TeamComponent>(id, "team");
        return team?.team ?? "enemy";
      }
    );

    const showActionBar =
      this.combat.phase === "playerTurn" &&
      this.combat.playerTurnState !== "animating";
    this.actionBar.setVisible(showActionBar);

    if (showActionBar) {
      const isInputState = this.combat.playerTurnState === "awaitingInput" || this.combat.playerTurnState === "skillTargeting";
      this.actionBar.setEnabled("wait", isInputState);
      this.actionBar.setEnabled("endTurn", true);
    }

    // Undo button: visible only when canUndo and in player turn
    this.undoButton.setVisible(
      this.combat.phase === "playerTurn" &&
      this.combat.canUndo &&
      this.combat.playerTurnState !== "animating",
    );

    // Update unit info panel with current AP
    if (this.combat.selectedUnit && this.combat.phase === "playerTurn") {
      this.showUnitInfo(this.combat.selectedUnit);
      this.updateSkillAffordability();
    }
  }

  // ── Save / Load ──

  /** Fire-and-forget auto-save after each player action. */
  private autoSave(): void {
    if (!this.saveData) return;

    const battleState: BattleState = {
      scenarioId: this.scenarioId,
      worldSnapshot: this.world.serialize(),
      turnOrderState: this.combat.turnOrder.serialize() as unknown as string[],
      playerIds: [...this.playerIds],
      enemyIds: [...this.enemyIds],
      killCount: this.combat.killCount,
      rngState: 0,
    };

    this.saveData.battleInProgress = battleState;
    saveGame(this.saveData).catch((err) => console.warn("Auto-save failed:", err));
  }

  /** Create initial save data from current state. */
  private initSaveData(): void {
    if (this.incomingSaveData) {
      this.saveData = this.incomingSaveData;
    } else {
      const roster = entitiesToRoster(this.world, this.playerIds);
      this.saveData = {
        version: 1,
        roster,
        currentScenarioIndex: 0,
        gold: 0,
        stash: [],
      };
    }
    // Save as pre-battle snapshot
    saveGame(this.saveData).catch((err) => console.warn("Initial save failed:", err));
  }

  // ── Battle end flow ──

  private handleBattleEnd(victory: boolean): void {
    // Disable AI mode
    this.aiMode = false;
    this.aiBtn.classList.remove("ai-active");
    if (this.aiTurnTimer) { clearTimeout(this.aiTurnTimer); this.aiTurnTimer = null; }

    // Wait for animations to finish, then show results
    const showResults = () => {
      const survivors = this.playerIds.filter((id) => {
        const h = this.world.getComponent<HealthComponent>(id, "health");
        return h && h.current > 0;
      });

      if (victory) {
        const awards = calculateBattleXP(true, this.combat.killCount, survivors, this.world);
        const contractReward = this.saveData?.pendingContract?.reward ?? 0;
        const goldEarned = contractReward > 0 ? contractReward : calculateGoldReward(this.combat.killCount, 0);
        if (this.saveData) {
          this.saveData.gold = (this.saveData.gold ?? 0) + goldEarned;
        }

        // Calculate CP awards per unit
        const survivorInfo = survivors.map(id => {
          const team = this.world.getComponent<{ type: "team"; team: string; name: string }>(id, "team");
          return { entityId: id, name: team?.name ?? id };
        });
        const cpAwards = calculateBattleCP(true, this.combat.actionTracker, survivorInfo);

        // Apply CP to save data
        if (this.incomingSaveData) {
          for (const cp of cpAwards) {
            const idx = this.playerIds.indexOf(cp.entityId);
            if (idx >= 0 && this.incomingSaveData.roster[idx]) {
              this.incomingSaveData.roster[idx]!.classPoints =
                (this.incomingSaveData.roster[idx]!.classPoints ?? 0) + cp.cpEarned;
            }
          }
        }

        this.battleEndScreen.show(true, awards, goldEarned, cpAwards);
        this.battleEndScreen.onContinue = () => {
          this.battleEndScreen.hide();
          this.processLevelUps(awards);
        };
      } else {
        this.battleEndScreen.show(false, []);
        // Retry: keep pendingContract, reload to replay the same battle
        this.battleEndScreen.onContinue = () => {
          this.battleEndScreen.hide();
          if (this.saveData) {
            this.saveData.battleInProgress = undefined;
            // Keep pendingContract so reload starts the same fight
            saveGame(this.saveData).catch(() => {});
          }
          window.location.reload();
        };
        // Forfeit: clear contract, go back to management
        this.battleEndScreen.onForfeit = () => {
          this.battleEndScreen.hide();
          if (this.saveData) {
            this.saveData.battleInProgress = undefined;
            this.saveData.pendingContract = undefined;
            saveGame(this.saveData).catch(() => {});
          }
          window.location.reload();
        };
      }
    };

    // If animations are still playing, wait for them
    if (this.animPlaying || this.animQueue.length > 0) {
      const checkDone = setInterval(() => {
        if (!this.animPlaying && this.animQueue.length === 0) {
          clearInterval(checkDone);
          showResults();
        }
      }, 100);
    } else {
      showResults();
    }
  }

  /** Process level-ups sequentially for all units that leveled up. */
  private processLevelUps(awards: XPAward[]): void {
    const levelUps = awards.filter((a) => a.leveledUp);

    if (levelUps.length === 0) {
      this.postVictoryFinalize();
      return;
    }

    let index = 0;
    const processNext = () => {
      if (index >= levelUps.length) {
        this.postVictoryFinalize();
        return;
      }

      const award = levelUps[index]!;
      const stats = this.world.getComponent<StatsComponent>(award.entityId, "stats");
      const talents = this.world.getComponent<TalentStarsComponent>(award.entityId, "talentStars");
      if (!stats || !talents) {
        index++;
        processNext();
        return;
      }

      this.levelUpModal.show({
        entityId: award.entityId,
        name: award.name,
        oldLevel: stats.level,
        newLevel: stats.level + 1,
        currentStats: {
          hitpoints: stats.hitpoints,
          fatigue: stats.fatigue,
          resolve: stats.resolve,
          initiative: stats.initiative,
          meleeSkill: stats.meleeSkill,
          rangedSkill: stats.rangedSkill,
          meleeDefense: stats.meleeDefense,
          rangedDefense: stats.rangedDefense,
        },
        talentStars: talents.stars,
      });

      this.levelUpModal.onComplete = (result: LevelUpResult) => {
        // Apply stat increases
        this.applyLevelUp(result);
        index++;
        processNext();
      };
    };

    processNext();
  }

  /** Apply a level-up result to the unit's stats. */
  private applyLevelUp(result: LevelUpResult): void {
    const stats = this.world.getComponent<StatsComponent>(result.entityId, "stats");
    if (!stats) return;

    stats.level++;

    for (const [key, increase] of Object.entries(result.increases)) {
      const k = key as StatKey;
      if (k in stats && increase != null) {
        (stats as unknown as Record<string, number>)[k]! += increase;
      }
    }

    // Update max HP if hitpoints increased
    if (result.increases.hitpoints) {
      const health = this.world.getComponent<HealthComponent>(result.entityId, "health");
      if (health) {
        health.max += result.increases.hitpoints;
        health.current += result.increases.hitpoints;
      }
    }

    // Award perk point
    const perks = this.world.getComponent<PerksComponent>(result.entityId, "perks");
    if (perks) {
      perks.availablePoints += result.perkPointsAwarded;
    }
  }

  /** After level-ups: update roster from survivors and go to management. */
  private postVictoryFinalize(): void {
    if (!this.saveData) {
      this.finalizeBattleEnd();
      return;
    }

    // Build updated roster from surviving entities (post-level-up)
    const survivors = this.playerIds.filter((id) => {
      const h = this.world.getComponent<HealthComponent>(id, "health");
      return h && h.current > 0;
    });
    const newRoster = entitiesToRoster(this.world, survivors);

    // Merge non-ECS fields (skill tree, CP, theme) from incoming save data
    if (this.incomingSaveData) {
      for (let si = 0; si < survivors.length; si++) {
        const entityId = survivors[si]!;
        const rosterIdx = this.playerIds.indexOf(entityId);
        if (rosterIdx >= 0 && rosterIdx < this.incomingSaveData.roster.length) {
          const original = this.incomingSaveData.roster[rosterIdx]!;
          const updated = newRoster[si]!;
          updated.skillTree = original.skillTree;
          updated.unlockedNodes = original.unlockedNodes;
          updated.nodeStacks = original.nodeStacks;
          updated.classPoints = original.classPoints;
          updated.skillTheme = original.skillTheme;
          updated.abilities = original.abilities;
        }
      }
    }

    this.saveData.roster = newRoster;
    this.finalizeBattleEnd();
  }

  /** After store/level-ups: clear battle state, generate new contracts/recruits, save, reload to management. */
  private finalizeBattleEnd(): void {
    if (this.saveData) {
      this.saveData.battleInProgress = undefined;
      this.saveData.pendingContract = undefined;
      // Clear shop so fresh items generate on return to management
      this.saveData.shopState = undefined;
      // Regenerate contracts and recruits for next management visit
      const partyLevel = getPartyLevel(this.saveData.roster);
      this.saveData.availableContracts = generateContracts(partyLevel, this.saveData.roster.length, () => Math.random());
      this.saveData.availableRecruits = generateRecruits(partyLevel, () => Math.random());
      saveGame(this.saveData).catch(() => {});
    }

    // Reload to management screen
    setTimeout(() => window.location.reload(), 500);
  }

  // ── Settings menu ──

  private createSettingsButton(): void {
    const btn = document.createElement("button");
    btn.className = "settings-btn";
    btn.textContent = "\u2699";
    btn.addEventListener("pointerup", () => this.showSettingsMenu());
    this.uiManager.root.appendChild(btn);
  }

  private settingsBackdrop: HTMLDivElement | null = null;

  private showSettingsMenu(): void {
    if (this.settingsBackdrop) return;

    const backdrop = document.createElement("div");
    backdrop.className = "settings-backdrop";
    backdrop.addEventListener("pointerup", (e) => {
      if (e.target === backdrop) this.hideSettingsMenu();
    });

    const panel = document.createElement("div");
    panel.className = "settings-panel";
    panel.addEventListener("pointerup", (e) => e.stopPropagation());

    const title = document.createElement("div");
    title.className = "settings-title";
    title.textContent = "Settings";
    panel.appendChild(title);

    // Restart Game button
    const restartBtn = document.createElement("button");
    restartBtn.className = "settings-option";
    restartBtn.textContent = "Restart Game";
    restartBtn.addEventListener("pointerup", () => {
      deleteSave().then(() => window.location.reload()).catch(() => window.location.reload());
    });
    panel.appendChild(restartBtn);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "settings-option settings-close";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("pointerup", () => this.hideSettingsMenu());
    panel.appendChild(closeBtn);

    backdrop.appendChild(panel);
    this.uiManager.root.appendChild(backdrop);
    this.settingsBackdrop = backdrop;
  }

  private hideSettingsMenu(): void {
    if (this.settingsBackdrop) {
      this.settingsBackdrop.remove();
      this.settingsBackdrop = null;
    }
  }

  // ── AI mode ──

  private scheduleAITurn(): void {
    if (this.aiTurnTimer) clearTimeout(this.aiTurnTimer);
    this.aiTurnTimer = setTimeout(() => {
      this.aiTurnTimer = null;
      if (this.aiMode && this.combat.phase === "playerTurn"
          && this.combat.playerTurnState === "awaitingInput"
          && !this.animPlaying) {
        this.combat.runPlayerTurnAsAI();
      }
    }, 200);
  }

  // ── Lifecycle ──

  async start(): Promise<void> {
    // Try to load save data
    try {
      this.saveData = await loadGame();
    } catch {
      this.saveData = null;
    }

    if (!this.saveData) {
      // First play: create initial save from current state
      this.initSaveData();
    }

    this.combat.start();
    this.refreshUI();
    this.sceneManager.startRenderLoop();

    // Auto-save after first turn setup
    this.autoSave();
  }

  dispose(): void {
    this.uiManager.dispose();
    this.sceneManager.dispose();
  }
}
