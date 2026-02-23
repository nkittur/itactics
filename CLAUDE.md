# iTactics - Development Guide

Battle Brothers-style tactical RPG for mobile browsers. Built with Babylon.js + TypeScript + Vite.

## Quick Reference

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # tsc + vite build → dist/
npm test             # vitest run
npx tsc --noEmit     # type-check only
```

**Live site**: https://nkittur.github.io/itactics/
**Repo**: https://github.com/nkittur/itactics

## Deployment

- Push to `main` triggers `.github/workflows/deploy.yml` (GitHub Actions → GitHub Pages)
- Can also trigger manually: `gh workflow run deploy.yml`
- GitHub Pages is configured as `build_type: workflow` (NOT legacy branch serving)
- Vite `base: "/itactics/"` in vite.config.ts — required for GitHub Pages subdirectory
- Build output goes to `dist/`

## Project Structure

```
src/
  main.ts                    # Entry point, creates DemoBattle
  scenes/DemoBattle.ts       # Wires all systems together for playable demo
  hex/                       # Pure hex math: coords, layout, pathfinding, LoS, FoV
  entities/                  # ECS: World, Entity, Component types
  combat/                    # CombatManager, TurnOrder, DamageCalculator, SimpleAI
  rendering/                 # Babylon.js: SceneManager, CameraController, TileRenderer,
                             #   UnitRenderer, OverlayRenderer
  input/TouchManager.ts      # Unified touch + pointer input (tap, pan, pinch, wheel)
  ui/                        # HTML overlay UI: UIManager, ActionBar, TurnOrderBar, UnitInfoPanel
  core/                      # StateMachine, EventBus, GameLoop
  utils/                     # RNG, MathUtils, PriorityQueue, IdGenerator
planning/                    # 8 detailed design docs (combat, classes, weapons, etc.)
tests/                       # Vitest tests for hex math, pathfinding, combat
```

### Path Aliases (tsconfig.json + vite.config.ts)

`@core/*`, `@hex/*`, `@combat/*`, `@entities/*`, `@data/*`, `@ui/*`, `@rendering/*`, `@input/*`, `@utils/*`

## Architecture Notes

### Rendering (Babylon.js v7)
- **Orthographic camera** looking straight down (rotation.x = PI/2, NO setTarget)
  - Using setTarget() causes gimbal lock drift when looking straight down. Always use fixed rotation.
  - Screen right = world +X, screen up = world +Z
- **Emissive materials** for visibility — diffuse colors aren't lit properly by hemispheric light in top-down view. Always use `mat.emissiveColor`, set `mat.diffuseColor = Color3.Black()`.
- **Scene autoClear must stay enabled** — disabling it causes hex trails when panning
- Engine uses `adaptToDeviceRatio: true` for sharp rendering on retina displays

### GUI (HTML Overlay)
- **UI uses HTML/CSS overlay** (`#gameUI` div in index.html), NOT Babylon.js AdvancedDynamicTexture. The Babylon.js GUI had persistent rendering issues on mobile due to DPI/texture scaling interactions with `adaptToDeviceRatio`. HTML overlay is guaranteed to work on all mobile browsers.
- `#gameUI` has `pointer-events: none`; child elements set `pointer-events: auto` so taps pass through to the canvas except on UI controls.
- CSS uses `env(safe-area-inset-*)` for notched phone compatibility.
- Styles are in `index.html` `<style>` block (not separate CSS file).

### Input (TouchManager.ts)
- **Touch events** handle mobile tap/pan/pinch; **pointer events** handle mouse/stylus
- Pointer events skip `pointerType === "touch"` to avoid double-handling
- Babylon.js calls `preventDefault()` on its own pointer events, which suppresses mouse events — must use pointer events (not mouse events) for desktop click detection
- **Hex picking uses math**, not `scene.pick()` — converts screen coords to world coords via orthographic projection bounds, then calls `pixelToHex`
- Pan converts screen delta to world delta: `worldDx = -dx * (orthoRight-orthoLeft)/canvasWidth`

### Combat UX
- **Tap-to-move/attack** without needing Move/Attack buttons
- States: `awaitingInput` (shows move+attack overlays) → `postMove` (shows attack overlays, undo available) → next turn
- ActionBar has: Undo / Wait / End Turn
- Undo reverts the last move (restores grid occupancy and position)

### Hex Grid
- Flat-top hex layout, axial coordinates (q, r)
- `hexToPixel` / `pixelToHex` in HexLayout.ts
- A* pathfinding with terrain movement costs in HexPathfinding.ts

## Known Issues / In Progress
- Mobile UI uses HTML overlay (resolved prior Babylon.js GUI visibility issues)
- Console.log diagnostic statements throughout (remove once stable)
- Enemy AI is minimal (SimpleAI: move toward nearest, attack if adjacent)
- No sprite art yet — units are colored circles, terrain is colored hexes

## Planning Docs
8 comprehensive design documents in `planning/` (~12,600 lines) covering:
01-combat-mechanics, 02-classes-and-perks, 03-weapons-and-equipment,
04-overworld, 05-enemies-and-ai, 06-battle-maps, 07-graphics-and-ui,
08-technical-architecture

## Phase 1 Status (Foundation)
Scaffolding, hex grid, ECS, rendering, input, combat, UI — all built and deployed.
Currently iterating on mobile playability (touch interaction, GUI visibility, camera controls).
