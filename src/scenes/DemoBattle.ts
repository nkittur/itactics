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
import { hexNeighbors } from "@hex/HexMath";
import type { AttackResult } from "@combat/DamageCalculator";

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

function createDemoGrid(): HexGrid {
  const grid = new HexGrid();
  const width = 10;
  const height = 8;

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

function spawnUnit(
  world: World,
  grid: HexGrid,
  q: number,
  r: number,
  team: "player" | "enemy",
  name: string,
  stats: { melee: number; defense: number; hp: number; initiative: number }
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

  // ── Animation queue ──
  private animQueue: Array<(done: () => void) => void> = [];
  private animPlaying = false;

  // ── Speed toggle ──
  private speedMultiplier = 1;
  private speedBtn: HTMLButtonElement;

  private readonly BASE_MOVE_MS = 180;   // per hex step
  private readonly BASE_LUNGE_MS = 280;  // total lunge
  private readonly BASE_PAN_MS = 350;    // camera pan

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
    this.uiManager = new UIManager();
    this.actionBar = new ActionBar(this.uiManager.root);
    this.turnOrderBar = new TurnOrderBar(this.uiManager.root);
    this.unitInfoPanel = new UnitInfoPanel(this.uiManager.root);

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
    this.camera.centerOn(center.x, center.y);

    // Handle resize
    window.addEventListener("resize", () => {
      this.sceneManager.resize();
      this.camera.updateOrtho();
    });
  }

  private spawnAllUnits(): void {
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
    // Touch/Click -> Combat
    this.touchManager.onHexTap = (q: number, r: number) => {
      if (this.animPlaying) return; // ignore input during animations
      this.combat.handleHexTap(q, r);
    };

    // Action bar -> Combat
    this.actionBar.onAction = (action) => {
      if (this.animPlaying) return;
      this.combat.handleAction(action);
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
            if (result.targetKilled) {
              // Play death animation, then remove
              this.unitRenderer.playDeath(defenderId, () => {
                this.unitRenderer.removeUnit(defenderId);
                this.refreshUI();
                done();
              });
            } else if (result.hit) {
              // Play hurt animation (non-blocking)
              this.unitRenderer.playHurt(defenderId);
              this.refreshUI();
              done();
            } else {
              this.refreshUI();
              done();
            }
          }
        );
      });
    };

    // Action complete — start draining animation queue
    this.combat.onActionComplete = () => {
      if (this.animQueue.length > 0) {
        if (!this.animPlaying) this.drainQueue();
      } else {
        // No animations queued (e.g. enemy waited) — continue immediately
        this.combat.continueAfterAnimation();
      }
    };

    // Phase changed
    this.combat.onPhaseChange = (phase) => {
      if (phase === "enemyTurn") {
        this.actionBar.setVisible(false);
        this.unitInfoPanel.hide();
        this.overlayRenderer.clearOverlays();
      } else if (phase === "playerTurn") {
        if (this.combat.selectedUnit) {
          this.unitRenderer.setSelected(this.combat.selectedUnit);
          this.showUnitInfo(this.combat.selectedUnit);
        }
        this.refreshUI();
      } else if (phase === "battleEnd") {
        this.actionBar.setVisible(false);
        this.unitInfoPanel.hide();
        this.overlayRenderer.clearOverlays();
      }
    };

    // Turn advanced → select unit, pan camera
    this.combat.onTurnAdvance = (entityId: EntityId) => {
      this.unitRenderer.setSelected(entityId);
      this.showUnitInfo(entityId);
      this.panCameraToUnit(entityId);
    };

    // Player state changed → update overlays
    this.combat.onPlayerStateChange = (state) => {
      this.overlayRenderer.clearOverlays();

      if (state === "awaitingInput") {
        this.showMoveAndAttackOverlays();
      } else if (state === "postMove") {
        this.showAttackOverlay();
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
    const attackHexes = this.getAdjacentEnemyHexes(pos);
    if (attackHexes.size > 0) {
      this.overlayRenderer.showAttackRange(attackHexes, this.layout);
    }
  }

  private showAttackOverlay(): void {
    if (!this.combat.selectedUnit) return;
    const pos = this.world.getComponent<PositionComponent>(this.combat.selectedUnit, "position");
    if (!pos) return;

    const attackHexes = this.getAdjacentEnemyHexes(pos);
    if (attackHexes.size > 0) {
      this.overlayRenderer.showAttackRange(attackHexes, this.layout);
    }
  }

  private getAdjacentEnemyHexes(pos: PositionComponent): Set<string> {
    const hexes = new Set<string>();
    const neighbors = hexNeighbors(pos.q, pos.r);
    for (const n of neighbors) {
      const tile = this.grid.get(n.q, n.r);
      if (tile?.occupant && tile.occupant !== this.combat.selectedUnit) {
        const team = this.world.getComponent<TeamComponent>(tile.occupant, "team");
        if (team?.team === "enemy") {
          hexes.add(`${n.q},${n.r}`);
        }
      }
    }
    return hexes;
  }

  // ── UI helpers ──

  private panCameraToUnit(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;
    const worldPos = hexToPixel(this.layout, pos.q, pos.r);
    this.camera.panTo(worldPos.x, worldPos.y, this.panDuration());
  }

  private showDamagePopup(entityId: EntityId, result: AttackResult): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    const worldPos = hexToPixel(this.layout, pos.q, pos.r);
    const screenPos = this.camera.worldToScreen(worldPos.x, worldPos.y);

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
  }

  private showUnitInfo(entityId: EntityId): void {
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    const team = this.world.getComponent<TeamComponent>(entityId, "team");
    if (health && team) {
      this.unitInfoPanel.show(team.name, health.current, health.max);
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
      this.actionBar.setEnabled("undo", this.combat.canUndo);
      this.actionBar.setEnabled("wait", this.combat.playerTurnState === "awaitingInput");
      this.actionBar.setEnabled("endTurn", true);
    }
  }

  // ── Lifecycle ──

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
