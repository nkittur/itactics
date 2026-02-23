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
import { reachableHexes } from "@hex/HexPathfinding";
import { hexNeighbors } from "@hex/HexMath";

// Terrain generation helpers
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

function createDemoGrid(): HexGrid {
  const grid = new HexGrid();
  const width = 10;
  const height = 8;

  // Simple seeded pseudo-random for reproducible maps
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const roll = rand();
      let terrain: TerrainType;
      let elevation = 0;

      if (roll < 0.55) {
        terrain = TerrainType.Grass;
      } else if (roll < 0.75) {
        terrain = TerrainType.Forest;
      } else if (roll < 0.85) {
        terrain = TerrainType.Hills;
        elevation = 1;
      } else if (roll < 0.92) {
        terrain = TerrainType.Swamp;
      } else {
        terrain = TerrainType.Sand;
      }

      const config = TERRAIN_CONFIGS[terrain]!;
      grid.set(q, r, {
        q,
        r,
        elevation,
        occupant: null,
        ...config,
      });
    }
  }

  return grid;
}

function spawnUnit(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  team: "player" | "enemy",
  name: string,
  stats: { melee: number; defense: number; hp: number; initiative: number }
): EntityId {
  const id = world.createEntity();

  world.addComponent(id, {
    type: "position",
    q,
    r,
    elevation: grid.get(q, r)?.elevation ?? 0,
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
    level: 1,
    experience: 0,
  });

  world.addComponent(id, {
    type: "health",
    current: stats.hp,
    max: stats.hp,
    injuries: [],
  });

  world.addComponent(id, {
    type: "armor",
    head: null,
    body: { id: "leather_armor", currentDurability: 40, maxDurability: 40 },
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
    atlasKey: team,
    framePrefix: "idle",
    currentFrame: 0,
    tint: null,
  });

  // Tag for team identification
  world.addComponent(id, {
    type: "team",
    team,
    name,
  });

  if (team === "enemy") {
    world.addComponent(id, {
      type: "aiBehavior",
      aiType: "aggressive" as const,
      aggroRadius: 10,
      preferredRange: 1,
      fleeThreshold: 10,
    });
  }

  // Mark hex as occupied
  const tile = grid.get(q, r);
  if (tile) tile.occupant = id;

  return id;
}

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

  constructor(canvas: HTMLCanvasElement) {
    // Scene setup
    this.sceneManager = new SceneManager(canvas);
    this.camera = new CameraController(
      this.sceneManager.scene,
      this.sceneManager.engine
    );
    this.layout = createLayout(1.0);

    // Game state
    this.world = new World();
    this.grid = createDemoGrid();

    // Rendering
    this.tileRenderer = new TileRenderer(this.sceneManager.scene);
    this.tileRenderer.buildGrid(this.grid, this.layout);

    this.unitRenderer = new UnitRenderer(this.sceneManager.scene, this.layout);
    this.overlayRenderer = new OverlayRenderer(this.sceneManager.scene);

    // Spawn units
    this.spawnAllUnits();

    // Render units
    for (const id of [...this.playerIds, ...this.enemyIds]) {
      const pos = this.world.getComponent<{ type: "position"; q: number; r: number }>(id, "position")!;
      const teamComp = this.world.getComponent<TeamComponent>(id, "team")!;
      const unitTeam = teamComp.team === "player" ? UnitTeam.Player : UnitTeam.Enemy;
      this.unitRenderer.addUnit(id, pos.q, pos.r, unitTeam);
    }

    // UI
    this.uiManager = new UIManager(this.sceneManager.scene);
    this.actionBar = new ActionBar(this.uiManager.guiTexture);
    this.turnOrderBar = new TurnOrderBar(this.uiManager.guiTexture);
    this.unitInfoPanel = new UnitInfoPanel(this.uiManager.guiTexture);

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

    // Center camera on grid
    const center = hexToPixel(this.layout, 5, 4);
    this.camera.pan(center.x, center.y);

    // Handle resize
    window.addEventListener("resize", () => {
      this.sceneManager.resize();
      this.camera.updateOrtho();
    });
  }

  private spawnAllUnits(): void {
    // Player units (left side)
    this.playerIds.push(
      spawnUnit(this.world, this.grid, 1, 2, "player", "Swordsman", {
        melee: 70, defense: 15, hp: 60, initiative: 100,
      })
    );
    this.playerIds.push(
      spawnUnit(this.world, this.grid, 1, 4, "player", "Axeman", {
        melee: 65, defense: 10, hp: 70, initiative: 90,
      })
    );
    this.playerIds.push(
      spawnUnit(this.world, this.grid, 1, 6, "player", "Spearman", {
        melee: 60, defense: 20, hp: 55, initiative: 110,
      })
    );

    // Enemy units (right side)
    this.enemyIds.push(
      spawnUnit(this.world, this.grid, 8, 1, "enemy", "Brigand", {
        melee: 55, defense: 10, hp: 50, initiative: 95,
      })
    );
    this.enemyIds.push(
      spawnUnit(this.world, this.grid, 8, 4, "enemy", "Raider", {
        melee: 60, defense: 5, hp: 55, initiative: 85,
      })
    );
    this.enemyIds.push(
      spawnUnit(this.world, this.grid, 8, 6, "enemy", "Thug", {
        melee: 45, defense: 5, hp: 45, initiative: 80,
      })
    );
  }

  private wireEvents(): void {
    // Touch -> Combat
    this.touchManager.onHexTap = (q: number, r: number) => {
      const prevState = this.combat.playerTurnState;
      this.combat.handleHexTap(q, r);

      // If state didn't change from selectMoveTarget/selectAttackTarget,
      // the tap was outside valid range — cancel back to selectAction
      if (this.combat.playerTurnState === prevState) {
        if (prevState === "selectMoveTarget" || prevState === "selectAttackTarget") {
          this.combat.playerTurnState = "selectAction";
          this.overlayRenderer.clearOverlays();
        }
      } else if (this.combat.playerTurnState !== "selectMoveTarget" &&
                 this.combat.playerTurnState !== "selectAttackTarget") {
        this.overlayRenderer.clearOverlays();
      }

      this.refreshUI();
    };

    // Action bar -> Combat
    this.actionBar.onAction = (action) => {
      this.combat.handleAction(action);

      // Show overlays based on new state
      if (action === "move" && this.combat.playerTurnState === "selectMoveTarget") {
        this.showMoveOverlay();
      } else if (action === "attack" && this.combat.playerTurnState === "selectAttackTarget") {
        this.showAttackOverlay();
      } else {
        this.overlayRenderer.clearOverlays();
      }

      this.refreshUI();
    };

    // Combat callbacks -> Rendering
    this.combat.onUnitMoved = (entityId: EntityId, path: Array<{ q: number; r: number }>) => {
      if (path.length > 0) {
        const dest = path[path.length - 1]!;
        this.unitRenderer.updatePosition(entityId, dest.q, dest.r);
      }
      this.overlayRenderer.clearOverlays();
      this.refreshUI();
    };

    this.combat.onAttackResult = (_result, _attackerId, defenderId) => {
      if (_result.targetKilled) {
        this.unitRenderer.removeUnit(defenderId);
      }
      this.refreshUI();
    };

    this.combat.onPhaseChange = (phase) => {
      if (phase === "enemyTurn") {
        this.actionBar.setVisible(false);
        this.unitInfoPanel.hide();
        this.overlayRenderer.clearOverlays();
        // Enemy turn runs automatically from CombatManager.beginCurrentTurn()
        // Just update the UI after a delay
        setTimeout(() => {
          this.refreshUI();
        }, 300);
      } else if (phase === "playerTurn") {
        this.actionBar.setVisible(true);
        // Show selected unit info
        if (this.combat.selectedUnit) {
          this.unitRenderer.setSelected(this.combat.selectedUnit);
          this.showUnitInfo(this.combat.selectedUnit);
        }
        this.refreshUI();
      } else if (phase === "battleEnd") {
        this.actionBar.setVisible(false);
        this.unitInfoPanel.hide();
      }
    };

    this.combat.onTurnAdvance = (entityId: EntityId) => {
      this.unitRenderer.setSelected(entityId);
      this.showUnitInfo(entityId);
    };
  }

  private showMoveOverlay(): void {
    this.overlayRenderer.clearOverlays();
    if (!this.combat.selectedUnit) return;

    const pos = this.world.getComponent<PositionComponent>(this.combat.selectedUnit, "position");
    if (!pos) return;

    const range = reachableHexes(this.grid, { q: pos.q, r: pos.r }, 4);
    this.overlayRenderer.showMovementRange(range, this.layout);
  }

  private showAttackOverlay(): void {
    this.overlayRenderer.clearOverlays();
    if (!this.combat.selectedUnit) return;

    const pos = this.world.getComponent<PositionComponent>(this.combat.selectedUnit, "position");
    if (!pos) return;

    // Show adjacent hexes as attack targets
    const neighbors = hexNeighbors(pos.q, pos.r);
    const attackHexes = new Set<string>();
    for (const n of neighbors) {
      const tile = this.grid.get(n.q, n.r);
      if (tile?.occupant && tile.occupant !== this.combat.selectedUnit) {
        attackHexes.add(`${n.q},${n.r}`);
      }
    }
    if (attackHexes.size > 0) {
      this.overlayRenderer.showAttackRange(attackHexes, this.layout);
    }
  }

  private showUnitInfo(entityId: EntityId): void {
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    if (health && team) {
      this.unitInfoPanel.show(team.name, health.current, health.max);
    }
  }

  private refreshUI(): void {
    // Update turn order bar
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

    // Update action bar state
    const isPlayerTurn = this.combat.phase === "playerTurn";
    this.actionBar.setVisible(isPlayerTurn);

    if (isPlayerTurn && this.combat.selectedUnit) {
      this.actionBar.setEnabled("move", this.combat.playerTurnState === "selectAction");
      this.actionBar.setEnabled("attack", this.combat.playerTurnState === "selectAction");
      this.actionBar.setEnabled("wait", this.combat.playerTurnState === "selectAction");
      this.actionBar.setEnabled("endTurn", true);
    }
  }

  start(): void {
    this.combat.start();
    this.refreshUI();
    this.sceneManager.startRenderLoop();
  }

  dispose(): void {
    this.uiManager.dispose();
    this.sceneManager.dispose();
  }
}
