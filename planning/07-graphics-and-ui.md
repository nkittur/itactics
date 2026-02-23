# 07 - Graphics, Art Direction, and UI/UX Design

## Table of Contents

1. [Art Style and Visual Direction](#1-art-style-and-visual-direction)
2. [Character Visuals](#2-character-visuals)
3. [Battle Map Visuals](#3-battle-map-visuals)
4. [Overworld Visuals](#4-overworld-visuals)
5. [Portrait Mode UI Layout](#5-portrait-mode-ui-layout)
6. [Touch Controls](#6-touch-controls)
7. [Camera System](#7-camera-system)
8. [Feedback Systems](#8-feedback-systems)
9. [Sound Design](#9-sound-design)
10. [Babylon.js Implementation Notes](#10-babylonjs-implementation-notes)

---

## 1. Art Style and Visual Direction

### Core Aesthetic

The game's visual identity is rooted in **dark medieval, low fantasy** illustration. The world is not one of gleaming knights and soaring castles; it is mud, rust, fraying cloth, and dried blood. Every visual element should feel as though it was painted by a chronicler embedded within a mercenary company, recording their grim deeds in a leather-bound journal by candlelight.

The overarching metaphor is the **"mercenary company journal"**: a battered manuscript filled with hand-drawn maps, annotated portraits of comrades (many crossed out), pressed flowers from battlefields, splattered ink, and marginal notes. This metaphor informs not just the art but the entire UI framework---menus are parchment pages, stats are handwritten ledger entries, the overworld is a hand-drawn cartographic map.

### Illustration Style

- **Hand-painted digital illustration.** Visible brushwork, textured edges, and deliberate imperfection. Nothing should look procedurally clean or digitally sterile.
- **Linework:** Bold, slightly uneven ink outlines with variable weight. Heavier lines for foreground elements, thinner for background details. Crosshatching for shadow areas, particularly on character portraits and equipment.
- **Shading:** Painterly with limited value range. Shadows are deep and warm (burnt umber, raw sienna). Highlights are muted and rare---reserved for metal edges, wet surfaces, and eyes.
- **Textures:** Every surface should have visual texture. Leather is cracked, metal is pitted and scratched, cloth is threadbare, skin is weathered. Background textures of parchment grain, ink blots, and foxing stains bleed through UI elements.

### Color Palette

The palette is deliberately narrow and desaturated, evoking aged manuscripts and oil paintings darkened by centuries of varnish.

#### Primary Palette (Environment and Base)

| Color           | Hex       | Usage                                      |
|-----------------|-----------|---------------------------------------------|
| Parchment Cream | `#D4C5A0` | UI backgrounds, map base, text panels       |
| Aged Parchment  | `#B8A67E` | Darker parchment areas, panel borders        |
| Ink Black       | `#2B2520` | Text, outlines, linework                     |
| Mud Brown       | `#5C4A3A` | Terrain base, leather, wood                  |
| Deep Earth      | `#3E3228` | Deep shadows, cave floors, dark interiors    |
| Slate Gray      | `#6B6560` | Stone, metal, overcast skies                 |
| Dark Olive      | `#3A4A2E` | Forests, grass, cloth dye                    |
| Muddy Yellow    | `#8B7D3C` | Dry grass, wheat fields, lantern light       |
| Desaturated Red | `#7A3B3B` | Dried blood, rust, worn leather              |

#### Accent Palette (Signals and Effects)

| Color             | Hex       | Usage                                          |
|-------------------|-----------|-------------------------------------------------|
| Blood Red         | `#8B1A1A` | Active blood, critical hits, health bars, danger |
| Fresh Blood       | `#A02020` | Blood splatter effects, killing blows            |
| Gold Coin         | `#C4A243` | Currency, valuable items, legendary borders      |
| Bright Gold       | `#D4B24A` | Coin sparkle, reward highlights                  |
| Sickly Green      | `#5A7A3A` | Poison, disease, corruption, nausea              |
| Bile Green        | `#6B8B3A` | Toxic clouds, infected wounds                    |
| Cold Blue         | `#4A6080` | Night tinting, frost, morale debuffs             |
| Pale Fire         | `#C4843A` | Torchlight, fire effects, warm highlights        |
| Steel Glint       | `#8A9098` | Metal reflections, weapon edges                  |

#### UI Signal Colors

| Color              | Hex       | Usage                                        |
|--------------------|-----------|-----------------------------------------------|
| Selection Blue     | `#4A7A9A` | Selected unit highlight, active hex ring       |
| Movement Teal     | `#3A7A6A` | Valid movement hexes overlay                   |
| Attack Orange      | `#9A5A2A` | Valid attack target hexes overlay              |
| Danger Red         | `#8B3A3A` | Threat range, low HP warning                   |
| Heal Green         | `#4A7A4A` | Healing effects, positive status               |
| Disabled Gray      | `#6A6A6A` | Unavailable actions, exhausted skills          |

### Visual Hierarchy Rules

1. **Interactive elements** are always more saturated than decorative ones.
2. **Actionable UI** has subtle warm glow or ink-stroke emphasis.
3. **Danger and urgency** are communicated through red spectrum shifts.
4. **Positive outcomes** use restrained gold or green, never bright/cheerful tones.
5. **Depth** is conveyed through value (darker = farther or lower), not through color saturation.

### Texture and Material Language

Every material in the game world has a specific visual treatment:

- **Leather:** Dark brown with visible grain, scuff marks, stitching holes. Leather items darken with use.
- **Iron/Steel:** Blue-gray with orange-brown rust spots. Pitting on cheaper weapons. Clean metal reserved for quality items.
- **Cloth/Linen:** Off-white to muddy gray. Visible weave texture. Fraying edges. Patches and repairs visible on worn gear.
- **Wood:** Warm brown with prominent grain. Axe marks, cracks, and weathering. Darkened by oil or smoke near handles.
- **Bone:** Yellowed ivory with hairline cracks. Used for cheap amulets, orc decorations, undead elements.
- **Flesh:** Variable skin tones with visible pores at close range. Scars are raised pink-white or angry red. Bruises fade through purple-yellow spectrum.
- **Blood:** Bright arterial red when fresh (during combat effects), darkening to brown-black within seconds. Dried blood on equipment and bodies is nearly black.
- **Parchment (UI):** Cream to tan gradient. Visible fiber texture. Foxing spots (age stains). Torn or singed edges on damaged documents.

---

## 2. Character Visuals

### Portrait System

Every mercenary in the company is represented primarily through a **2D bust portrait** displayed at chest-up level from a three-quarter view (approximately 30-40 degrees off center-facing). Portraits are the player's primary emotional connection to their characters and receive the highest art quality in the game.

#### Portrait Specifications

- **Base resolution:** 512x512 pixels per portrait.
- **Viewable crop:** Chest up, showing shoulders, neck, and full head. Slight asymmetry in the three-quarter view reveals one ear and both eyes.
- **Background:** Transparent or solid dark tone (muted brown-gray). No environmental context in the portrait itself.
- **Lighting:** Single key light from upper-left, warm-toned (as if by candlelight or overcast sky). Fill light is minimal---deep shadows on the far side of the face.
- **Expression:** Neutral to grim by default. Characters may have subtle expression shifts based on morale (slight smile when confident, wide eyes when panicked, blank stare when wavering).

#### Layered Paper-Doll Equipment System

Portraits are not static images. They are composited in real time from multiple ordered layers, allowing equipment changes to visually alter the character's appearance. Each layer is a separate texture that is drawn in sequence.

**Layer Stack (bottom to top):**

1. **Body Base:** Naked torso and neck. Skin tone and body build are baked into this layer. Includes collarbone, shoulder shape, and neck musculature.
2. **Skin Detail Overlay:** Tattoos, birthmarks, and baseline skin texturing. This layer is semi-transparent and blends with the body base.
3. **Undergarment/Padding Layer:** Gambeson, padded shirt, or bare skin depending on armor type. This layer is visible at the collar, sleeves, and any gaps in outer armor.
4. **Body Armor Layer:** The primary torso armor piece. Chainmail, leather vest, plate cuirass, ragged tunic, etc. This is the most visually dominant equipment layer.
5. **Cloak/Tabard Layer:** Cloaks, tabards, scarves, fur mantles. Draped over the armor layer. Partially transparent at edges to show armor beneath.
6. **Neck/Gorget Layer:** Neck protection pieces---mail coif visible at the collar, plate gorget, leather neck guard.
7. **Injury/Scar Layer:** Accumulated scars and active injuries rendered as semi-transparent overlays on the face and visible body. This layer updates permanently as the character sustains wounds.
8. **Head/Face Base:** The character's face, including facial structure, eyes, nose, mouth, ears. This is unique per character and is never changed.
9. **Facial Hair Layer:** Beards, mustaches, stubble. Can change (shaved off by events, grown over time). Different styles per character background.
10. **Hair Layer:** Hairstyle rendered behind and around the helmet layer. Hair can be partially hidden by helmets (tucked under a coif, flowing from beneath a kettle helm).
11. **Helmet/Headgear Layer:** The topmost layer. Full helms cover most of the face (with eye slits visible). Open-face helms show the character beneath. Hoods, hats, bandanas, and crowns also occupy this layer.

**Layer Rendering Rules:**

- When no helmet is equipped, hair is fully visible.
- Closed-face helmets (great helm, sallet with visor down) obscure layers 8-10 entirely, showing only the helmet art. The player can toggle a "visor up" view in the character screen to see the face beneath.
- Light headgear (bandana, leather cap) reveals most of the face and hair.
- Injuries on the face (lost eye, broken nose, jaw scar) are always visible unless covered by a closed-face helmet.
- Equipment condition affects the layer's appearance: damaged armor shows dents, scratches, and missing pieces. This is handled by swapping to a "damaged" variant of the armor texture.

#### Character Diversity

The game's mercenary company draws from a broad world, and the roster must reflect this.

**Face Variation:**
- Minimum 30 unique base face templates, varying in bone structure, nose shape, eye spacing, lip thickness, and jaw definition.
- Each template supports multiple skin tones: pale (northern), olive (central), brown (southern/eastern), dark (far southern). Skin tone is independent of facial structure---any combination is valid.
- Ages range from late teens to late fifties. Age manifests as wrinkles (crow's feet, forehead lines, nasolabial folds), graying hair, and weathered skin texture.

**Facial Hair Variation:**
- Clean-shaven, stubble, short beard, full beard, braided beard, mustache-only, mutton chops. At least 10 distinct styles.
- Color matches hair or is independently generated (red beard on brown hair is common).

**Hair Variation:**
- Bald, shaved, short cropped, medium length, long, braided, ponytail, topknot, receding. At least 12 distinct styles.
- Hair color: black, dark brown, light brown, auburn, blond, gray, white. Dirty or unkempt variants of each.

**Scar and Injury System:**

Scars are **permanent** visual markers of a character's combat history. When a character sustains a serious injury (as defined by the injury system in the combat design document), a corresponding scar is added to their portrait's injury layer.

| Injury Type            | Visual Scar                                              |
|------------------------|------------------------------------------------------------|
| Slashed Cheek          | Diagonal scar line across one cheek                        |
| Broken Nose            | Crooked nose bridge, slight swelling                       |
| Lost Eye               | Eye replaced with scarred closed lid or eye patch          |
| Split Lip              | Vertical scar through upper or lower lip                   |
| Burned Face            | Mottled pink-red burn texture over affected area           |
| Fractured Jaw          | Asymmetric jaw, slight droop on one side                   |
| Missing Ear            | Ear replaced with scarred stump                            |
| Neck Wound             | Horizontal scar across throat, partially hidden by collar  |
| Skull Fracture         | Dented forehead with scar line, possibly with metal plate  |
| Arrow Scar             | Small circular entry scar, radiating stitch marks          |

Scars accumulate. A veteran character may have 3-5 visible scars on their portrait, each telling a story. The injury layer composites all active scars together.

#### Named and Legendary Item Art

Standard equipment uses shared art across items of the same type (all "Chainmail Hauberks" look the same, with minor color tinting for variety). However, **named items** (unique, hand-crafted weapons and armor with special stats and lore) receive bespoke artwork.

- Named weapons have unique silhouettes, engravings, or material treatments (a black-bladed sword, a mace with a skull pommel, a bow wrapped in serpent leather).
- Named armor pieces have distinct ornamentation, color schemes, or material composition (gold-trimmed plate, bear-pelt cloak, armor with embedded arrowheads left from a famous battle).
- Named items are visually distinct even at small sprite scale on the battle map, using unique color accents or shape variations.

---

## 3. Battle Map Visuals

### Hex Grid Design

The tactical battle map uses a **hex-based grid** viewed from an **elevated isometric angle** (approximately 50-55 degrees from horizontal, a compromise between the clarity of top-down and the depth of true isometric). This angle allows terrain elevation differences to be visible while keeping hex shapes regular enough for clean tap targets on mobile.

#### Hex Tile Specifications

- **Hex orientation:** Flat-top hexagons (horizontal edges at top and bottom). This orientation works better with portrait-mode vertical scrolling.
- **Hex size on screen:** Approximately 60-72 pixels across (flat edge to flat edge) at default zoom on a standard mobile screen (1080p width). This ensures each hex is a comfortable tap target (meeting the 44dp minimum).
- **Grid line rendering:** Grid lines are **subtle and integrated** into the art rather than rendered as geometric overlays. They appear as faint scored lines in dirt, cracks in stone, slight color shifts at tile boundaries, or gaps between wooden planks. The grid should feel like a natural feature of the terrain, not a game abstraction.
- **Hex highlight overlays:** When a unit is selected, valid movement hexes show a semi-transparent teal overlay (`#3A7A6A` at 30% opacity). Attack range hexes show an orange overlay (`#9A5A2A` at 30% opacity). The currently hovered/tapped hex shows a brighter selection ring in blue (`#4A7A9A`).

#### Terrain Art

Each terrain type has a distinct visual treatment that is immediately readable at a glance:

| Terrain Type    | Visual Treatment                                                                                                   |
|-----------------|--------------------------------------------------------------------------------------------------------------------|
| Grass/Plains    | Short, scrubby grass in muted yellow-green. Occasional wildflowers, rocks, or tufts. Base terrain.                 |
| Forest          | Dark canopy overhead partially obscuring the hex. Tree trunks at hex edges. Leaf litter and roots on the ground.    |
| Swamp           | Dark water pooling in the hex center. Reeds and cattails at edges. Mud texture with standing puddles.               |
| Sand/Desert     | Pale tan with wind-ripple texture. Occasional small stones or dried scrub.                                          |
| Snow            | White-gray with blue shadows. Footprint impressions. Sparse dead grass poking through.                              |
| Mud             | Dark brown, reflective wet sheen. Churned earth with boot impressions and wheel ruts.                               |
| Stone/Road      | Gray flagstones or cobbles with mortar lines. Worn smooth in the center, cracked at edges.                          |
| Shallow Water   | Semi-transparent blue-gray over visible riverbed stones. Slight ripple animation.                                   |
| Deep Water      | Opaque dark blue-gray. Not traversable. Wave-line texture.                                                          |
| Hills/Elevation | Hex appears raised above neighbors with visible side faces. Grass or rock texture on top. Shadow cast on lower hexes.|
| Ruins           | Broken stone walls partially occupying the hex. Rubble, fallen columns. Provides cover.                            |
| Campsite        | Trampled grass with fire pit, scattered supplies, tent stakes. Battlefield flavor.                                  |

#### Elevation and Pseudo-3D

Elevation is one of the most important visual and tactical features. The game does not use true 3D terrain meshes; instead, it creates a **pseudo-3D layered effect** where elevated hexes are drawn higher on the screen and include visible "cliff face" side panels.

**Elevation rendering rules:**

1. Each elevation level raises the hex position by approximately 15-20 pixels upward on screen.
2. The side face of an elevated hex is visible as a cliff, slope, or retaining wall, drawn as a separate art piece connecting the elevated hex to its lower neighbors.
3. Shadows are cast from elevated hexes onto adjacent lower hexes, darkening them on the side away from the light source (upper-left by default).
4. Characters on elevated hexes appear above characters on lower hexes, reinforcing the spatial hierarchy.
5. Maximum elevation difference displayed is 3 levels. Maps generally use 0-2 levels of elevation.

**Elevation side-face art by terrain:**
- Grass on dirt: Brown earth cross-section with grass on top, exposed roots and stones.
- Rock: Layered stone strata with cracks and moss.
- Snow on rock: Same as rock but with snow capping and icicles.
- Sand: Sloped sand bank with visible layering.

#### Battlefield Props and Obstacles

Hexes may contain props that provide cover, block movement, or add visual flavor:

- **Boulders:** Large rocks occupying part of a hex. Provides half cover.
- **Tree stumps:** Remnants of cleared forest. Low obstacle.
- **Wooden fences/walls:** Half-height barriers. Provides cover, destructible.
- **Stone walls:** Waist-high ruins or constructed walls. Full cover, durable.
- **Barrels/crates:** Battlefield supplies. Destructible, may scatter contents.
- **Corpse piles:** Pre-existing dead from prior battles. Difficult terrain, morale effect.
- **Campfires:** Light source, difficult terrain. Burns units that end turn on it.
- **Stakes/palisades:** Sharpened wooden stakes. Damages units moving through.

Props are drawn on top of the hex terrain and beneath character sprites. They cast small shadows consistent with the global light direction.

### Character Sprites on the Battle Map

Characters on the tactical map are rendered as **"paper cutout" flat miniatures**---a deliberate stylistic choice that reinforces the "tabletop game played on a parchment map" aesthetic.

#### Sprite Design

- **Style:** 2D hand-painted sprites with bold outlines, matching the portrait illustration style. Each sprite is a full-body figure viewed from the same isometric angle as the map.
- **Size:** Each sprite occupies approximately 60-80% of a hex's width and extends above the hex by 30-50% of a hex height (characters should loom slightly above their hex, like miniatures standing on a board).
- **Base shadow:** A small elliptical shadow is drawn on the hex beneath each sprite, grounding them on the terrain.
- **Facing:** Sprites have at least 2 facing directions (left and right), achieved by horizontal flipping. Some key sprites (player characters) may have 4 facings (front-left, front-right, back-left, back-right) for greater visual fidelity. Sprites face toward the nearest enemy or toward their last movement direction.
- **Equipment visibility:** Sprites reflect equipped weapon and shield. A character with a two-handed axe holds it differently from one with sword and shield. Armor type changes the sprite's silhouette (bulky for heavy plate, lean for leather). Helmets and cloaks are visible.
- **Team distinction:** Player characters have a subtle colored base marker or banner (blue-tinted shadow or small pennant). Enemy units have a red-tinted equivalent. Allies are green-tinted.

#### Sprite Variants by Unit Type

Each enemy type and character archetype needs distinct sprite art:

**Human enemies:** Brigands (ragged, mismatched armor), militia (simple gear, shields), knights (full plate, heraldry), assassins (dark leather, hooded), archers (bow drawn, quiver visible).

**Undead:** Skeletons (exposed bones, rusted armor remnants, green-glowing eye sockets), zombies (bloated, decayed, shambling pose), ghosts/wraiths (translucent, tattered robes, spectral glow).

**Beasts:** Wolves (low stance, bared teeth), direwolves (larger, scarred), spiders (multi-legged, dark carapace), lindwurm (serpentine, massive, occupies multiple hexes visually even if single hex mechanically).

**Greenskins:** Goblins (small, hunched, crude weapons), orcs (massive, green-gray skin, heavy crude armor, tusked), orc warriors (even larger, trophy bones).

### Animation System

Animation is **limited and purposeful**, prioritizing visual impact and readability over smooth motion. The paper-cutout aesthetic justifies simplified animation---these are miniatures moving on a board, not fully animated characters.

#### Animation Types

**Idle Animation:**
- Extremely subtle. A slight rhythmic bob (1-2 pixels up and down over a 2-3 second cycle). Occasional blink on portraits. Weapon may sway slightly.
- Purpose: Prevents the battlefield from looking frozen. Communicates that units are alive and active.
- Implementation: Simple sine-wave Y-offset on the sprite. No frame animation needed.

**Movement Animation:**
- Characters "hop" from hex to hex. The sprite lifts slightly (5-10 pixels up), translates to the target hex over 200-300ms, then lands with a subtle bounce.
- For multi-hex movement, the unit hops through each intermediate hex in sequence with brief pauses (100ms per intermediate hex).
- A small dust puff particle effect triggers at the landing point on dirt/grass. Splash effect on water.
- Purpose: Clear visual communication of unit repositioning. The hop is readable on a small screen and feels satisfying.

**Attack Animation:**
- The attacking sprite leans/lunges toward the target (15-25 pixel shift toward the target hex) over 150ms.
- A weapon-specific swing arc or thrust is rendered as a 2-3 frame animation overlaid on the sprite:
  - **Sword:** Diagonal slash arc (upper-left to lower-right).
  - **Axe:** Overhead chop arc.
  - **Mace/Hammer:** Overhead smash with brief pause at apex.
  - **Spear:** Forward thrust with retraction.
  - **Bow/Crossbow:** Brief draw-back, then projectile spawns and arcs toward target.
  - **Dagger:** Quick forward jab, two frames.
- The sprite snaps back to center position over 100ms after the swing.
- Total attack animation duration: 400-600ms.

**Hit Reaction Animation:**
- The target sprite flashes white for 1 frame (50ms).
- The sprite recoils away from the attacker (10-15 pixel shift) over 100ms, then returns.
- A blood splatter particle spawns at the point of impact (see attack effects below).
- Armor damage: If the hit damages armor but not HP, sparks fly instead of blood, and a metallic impact sound plays.
- Heavy hits (critical, etc.): The recoil is exaggerated (20-30 pixels), the sprite hangs at maximum recoil for 100ms before returning, and the screen shakes subtly (2-3 pixel displacement over 100ms).

**Death Animation:**
- Death animations are **dramatic and memorable**, befitting the brutal tone of the game.
- **Standard death:** The sprite collapses downward, shrinking vertically as if crumpling, over 400ms. A blood pool spreads beneath the sprite.
- **Decapitation** (triggered by killing blow with edged weapon + RNG chance): The head separates from the body as a small sprite piece, arcing away with a blood trail. The body collapses. The head lands 1-2 hexes away as a small prop.
- **Impalement** (triggered by spear killing blow): The sprite is knocked backward slightly, then freezes in a leaning-back pose as if pinned.
- **Crushing blow** (triggered by blunt weapon killing blow): The sprite flattens downward with an exaggerated squash effect, and a burst of bone/debris particles.
- **Arrow death:** The sprite staggers back, an arrow sprite appears embedded in the body, and the unit slowly topples sideways.
- **Duration:** 500-800ms per death animation.

**Corpse Persistence:**
- After the death animation completes, a **corpse sprite** remains on the hex for the duration of the battle. Corpse sprites are a simplified, flattened version of the unit's sprite (collapsed pose, blood pool). They do not animate.
- Corpses are rendered below living unit sprites but above terrain.
- If another unit moves through a corpse hex, the corpse sprite remains visible beneath them.
- Hexes with corpses may be designated as difficult terrain (optional, per game design).

### Attack Visual Effects

Every attack produces visual feedback that communicates what happened:

**Weapon Trails:**
- Melee attacks generate a brief arc trail in the weapon's swing path. The trail is a semi-transparent gradient from steel-gray (for blades) or brown (for wood) that fades over 200ms.
- The trail is 2-3 pixels wide and follows a curved path matching the weapon swing animation.

**Blood Splatter:**
- On HP damage to flesh targets, a blood splatter particle effect triggers at the impact point.
- Splatter consists of 3-8 small red droplet sprites that burst outward from the impact in a cone pattern away from the attacker.
- Droplets are between 2-6 pixels in size, travel 10-30 pixels over 200-300ms, and fade to transparency.
- Blood drops that land on terrain create small persistent stains (darkened red-brown spots on the hex) that remain for the duration of the battle.

**Sparks on Armor:**
- When an attack damages armor but not HP, orange-white spark particles burst from the impact point.
- 4-8 spark sprites, 1-3 pixels each, radiating outward and fading rapidly (100-150ms).
- Accompanied by a metallic clang sound.

**Miss/Whiff Effect:**
- A miss generates a "whiff" visual: 2-3 thin white speed lines in the swing arc that fade rapidly, accompanied by a whooshing sound.
- No blood, no sparks, no screen shake.
- The defending sprite may play a subtle dodge animation (slight lean away from the swing).

**Projectile Visuals:**
- Arrows are small elongated sprites that arc from attacker to target over 300-400ms with a slight parabolic trajectory.
- Crossbow bolts travel in a flatter arc with faster speed (200ms).
- Thrown weapons (javelins, throwing axes) tumble/rotate during flight.
- Projectiles that miss fly past the target and embed in the terrain as small persistent props.

**Skill-Specific Effects:**
- Shield bash: A burst of force lines (white concentric arcs) at the impact point, plus a stronger knockback on the target.
- Rally (morale skill): A golden glow pulse emanating outward from the user, with a brief banner or horn icon flash.
- Poison application: Green mist tendrils swirling around the weapon before the strike.
- Rotation/Swap: Two units briefly ghost (become semi-transparent) and slide through each other to swap positions.

---

## 4. Overworld Visuals

### Cartographic Map Design

The overworld is presented as a **top-down parchment-style cartographic map**, reinforcing the "mercenary company journal" aesthetic. The entire map looks as though it was drawn by hand on aged parchment, using ink, watercolor washes, and careful illustration.

#### Map Base

- The base layer is a parchment texture (`#D4C5A0` to `#B8A67E` gradient) with visible fiber texture, foxing spots (small brown age stains), and slight warping/wrinkling at edges.
- Map borders are darkened and slightly torn, as if the parchment has been handled extensively.
- A subtle compass rose is drawn in one corner (decorative, non-functional).
- Scale bars and cartographic annotations appear as hand-written ink labels.

#### Terrain Rendering

All terrain is drawn in a **medieval cartographic illustration style**, as if rendered by a mapmaker using ink and watercolor:

**Mountains:**
- Drawn in **profile view** (side elevation) even though the map is top-down. This is a deliberate nod to medieval cartography conventions.
- Mountains appear as triangular peaks with cross-hatched shadow on one side and snow-white caps.
- Mountain ranges form chains of overlapping peaks, with height conveyed by peak size.
- Foothills are rendered as smaller, rounder bumps leading up to major peaks.

**Forests:**
- Rendered as **clusters of individual tree icons** viewed from slightly above. Deciduous trees are round-topped, conifers are triangular.
- Dense forests overlap significantly, creating a canopy mass. Sparse forests show individual trees with gaps.
- Forest color varies by region: dark green for temperate, yellow-green for autumn areas, dark blue-green for pine forests.
- Small paths may be visible cutting through forest areas, drawn as thin dotted lines.

**Water:**
- Rivers are drawn as flowing ink lines with subtle wave markings along the banks. River width varies (thin tributary to wide major river).
- Lakes are bounded by a dark ink outline with interior fill of pale blue-gray watercolor wash. Horizontal wave lines provide texture.
- Ocean/sea (if visible at map edges) has more elaborate wave patterns and may include illustrated sea creatures or ships at the margins.
- Swamps are indicated by clustered reed illustrations and patches of blue-gray water amidst green terrain.

**Plains/Grasslands:**
- The lightest terrain, appearing as barely-tinted parchment with subtle grass-stroke texturing (short, light green-brown ink hatching).
- Farmland areas show tiny parallel lines (plowed fields) and occasionally a small farmhouse icon.

**Roads:**
- Thin solid or dashed ink lines connecting settlements. Major roads are thicker with milestone dots. Minor paths are thin and dotted.
- Road conditions can be indicated by line style: solid for maintained roads, broken for deteriorated, dotted for trails.

**Bridges:**
- Small illustrated bridge icons where roads cross rivers. Stone bridges are arched; wooden bridges are flat with visible planking.

#### Settlements

Settlements are rendered as **illustrated building clusters** appropriate to their size and type:

| Settlement Type   | Visual Rendering                                                                                      |
|-------------------|--------------------------------------------------------------------------------------------------------|
| Village           | 3-5 small house icons (peaked roofs, simple shapes) clustered around a crossroads. A church spire.     |
| Town              | 8-12 buildings including a market square, walls partially visible, a prominent tower or church.         |
| City              | Dense cluster of 20+ buildings behind a full wall circuit. Towers, cathedral spire, castle keep.       |
| Castle/Fortress   | A single large fortification icon with thick walls, towers at corners, a gate. May be on a hill.       |
| Camp              | 2-3 tents with a campfire. Used for temporary locations (bandit camps, mercenary camps).               |
| Ruins             | Broken building outlines, crumbling walls, rubble dots. Darkened or reddened parchment beneath.        |
| Monastery         | Walled compound with a cross-topped chapel and garden plots.                                           |
| Mine              | A dark entrance icon (arch shape) in a hillside or mountain, with a cart track leading to it.          |

Settlement icons are interactive tap targets. When no settlement is selected, all settlements show their name in small hand-lettered text beneath the icon.

#### Party and NPC Icons

**Player Party:**
- Represented as a **banner icon**: a small heraldic pennant on a pole, using the company's chosen colors (or a default blood-red and black).
- The banner casts a tiny shadow on the map and has a subtle flutter animation (2-3 frame cycle).
- A thin dotted line trails behind the banner showing the last few days of travel (fades over distance).
- When moving, the banner glides smoothly along the road or terrain toward the destination.

**Enemy Parties:**
- Rendered as **distinct silhouette icons** appropriate to their type:
  - Brigands: Crossed swords icon, dark.
  - Undead: Skull icon, pale.
  - Orcs: Tusked face icon, dark green.
  - Beasts: Paw print or beast head silhouette.
  - Noble army: Shield with heraldry.
  - Caravan (neutral): Covered wagon icon.
- Enemy icons may pulse subtly or have a small exclamation marker when they have detected the player.
- Destroyed/defeated parties leave a small crossed-swords-on-ground icon that fades after a day.

#### Fog of War

Fog of war is rendered as **undrawn parchment**---areas the player has not explored appear as blank, slightly darker parchment with no terrain features drawn on them. This is thematically consistent: the company's cartographer has not yet mapped these regions.

- **Unexplored areas:** Blank parchment, slightly darker than explored areas. May have faint "here be dragons" style decorative swirls at the boundary.
- **Previously explored but not currently visible:** Terrain is drawn but slightly faded/desaturated, as if the ink has aged. No enemy party icons or dynamic features are visible. Settlements remain visible (you remember where the town is, even if you cannot see current events there).
- **Currently visible (within party sight range):** Full-color, full-detail terrain with all dynamic elements (enemy parties, caravans, events) visible.
- **Fog boundary:** The edge between visible and fog areas is a soft, feathered gradient rather than a hard line. It looks like the edge of watercolor wash bleeding into dry parchment.

#### Day/Night Cycle

The overworld features a full **day/night cycle** that affects the map's visual presentation:

**Dawn (early morning):**
- The map tints warm orange-pink from the east side. Long shadows stretch westward from mountain and settlement icons.
- A subtle gradient from warm (east) to cool (west) overlays the parchment.
- Fog/mist patches may appear in low-lying areas (valleys, river banks), rendered as pale gray watercolor washes.

**Midday:**
- Neutral, full-brightness lighting. The parchment appears at its lightest and clearest.
- Shadows are short and directly below objects.
- This is the "default" visual state.

**Afternoon:**
- Warm golden tint begins from the west. Shadows lengthen eastward.
- Slightly warmer overall color temperature than midday.

**Dusk (evening):**
- Deep amber to red-orange tint. The map darkens significantly. Shadows are very long.
- Settlement icons begin showing tiny warm light dots (windows/torches).
- The western horizon of the map has a red-orange glow.

**Night:**
- The map is overlaid with a dark blue-gray filter (`#2A3040` at 50-60% opacity). Parchment texture is barely visible.
- Settlements glow warmly: a small halo of yellow-orange light around each building cluster, representing torch and firelight. Larger settlements glow more brightly.
- The player party icon gains a small campfire light circle if stationary, or a torch glow if moving.
- Stars may be faintly visible as tiny white dots on the darkened parchment (decorative only).
- The visible range (fog of war radius) is reduced at night.

**Transitions:**
- Transitions between phases are gradual, taking approximately 3-5 real-time seconds per phase shift (or instant if the player fast-forwards time).
- Implemented as animated shader uniforms controlling tint color, tint opacity, and shadow direction.

---

## 5. Portrait Mode UI Layout

All UI is designed for **portrait (vertical) orientation** on mobile devices. The screen is taller than it is wide. All interactive elements are positioned to be reachable by thumbs in a natural one-handed or two-handed grip.

### 5.1 Battle UI

The battle screen is the most complex and performance-critical UI state in the game.

#### Screen Zones

```
+-------------------------------------------+
|  Turn Order Bar (Compact Portraits)       |  <- Top 8-10%
|-------------------------------------------|
|                                           |
|                                           |
|          Hex Battlefield                  |  <- Center 50-65%
|          (Pannable, Zoomable)             |
|                                           |
|                                           |
|-------------------------------------------|
|  Selected Unit Info (Collapsible)         |  <- Variable, 0-15%
|-------------------------------------------|
|  Action Bar (Skill Icons)                 |  <- Bottom 12-15%
|  [Move][Atk][Skill1][Skill2][...]  [End]  |
|  [Wait][Rotate][Item]  ... scrollable     |
+-------------------------------------------+
```

#### Turn Order Bar

- **Position:** Top edge of screen, full width.
- **Height:** 40-48dp (accommodates small square portraits plus a thin active-turn indicator).
- **Content:** A horizontal row of small square portraits (32x32dp each) showing all units in initiative order for the current round.
- **Active unit:** The leftmost portrait is the currently active unit, highlighted with a gold border and slightly enlarged (36x36dp). A small downward-pointing arrow or glow beneath it indicates "your turn" or "enemy turn."
- **Player vs enemy distinction:** Player unit portraits have a blue bottom border. Enemy portraits have a red bottom border.
- **Status indicators:** Tiny icons overlaid on portraits show critical status (stunned = stars, poisoned = green dot, fleeing = red arrow).
- **Scrolling:** If more than ~8 units, the bar scrolls horizontally. The active unit is always visible.
- **Tap interaction:** Tapping a portrait in the turn order bar centers the camera on that unit's position on the battlefield.

#### Hex Battlefield

- **Position:** Center of the screen, occupying 50-65% of screen height.
- **Behavior:** This is the 3D Babylon.js rendered viewport. The hex map, unit sprites, terrain, and all visual effects are rendered here.
- **Interaction:** Direct touch interaction with the hex grid (see Touch Controls section).
- **Overlay elements:** Floating damage numbers, hit chance indicators, and contextual prompts render above the 3D viewport but are part of the Babylon.js GUI layer (AdvancedDynamicTexture in fullscreen mode).

#### Selected Unit Info Panel

- **Position:** Between the battlefield and action bar. Appears when a unit is selected, collapses when deselected.
- **Height:** 60-80dp when visible. Collapsed to 0dp when hidden.
- **Content (when showing a friendly unit):**
  - Small portrait (48x48dp) on the left.
  - Name and class/background text.
  - HP bar (red) and Armor bar (gray) with numeric values.
  - Fatigue bar (yellow/orange) with numeric value.
  - Morale state icon.
  - 2-3 most critical status effect icons.
- **Content (when showing an enemy unit):**
  - Enemy type name and level.
  - Estimated HP bar (exact values hidden unless scouted).
  - Known status effects.
- **Expand gesture:** Tapping the info panel or swiping up expands it into a **detailed slide-up panel** that covers the lower 40-50% of the screen, showing full stats, all status effects with descriptions, and equipment summary. This panel has a handle bar at the top for grabbing and a semi-transparent dark background behind it.
- **Collapse gesture:** Swiping down or tapping the battlefield area collapses the panel back.

#### Action Bar

- **Position:** Bottom of the screen, anchored. Always visible during the player's turn.
- **Height:** 56-64dp.
- **Layout:** Horizontal row of square skill/action icons (48x48dp each) with 4-6dp spacing.
- **Content:** All available actions for the currently selected unit:
  - **Move** (boot icon): Always first. Highlights valid movement hexes when tapped.
  - **Attack** (weapon icon reflecting equipped weapon): Second slot. Highlights valid attack targets.
  - **Skills** (unique icons per skill): Remaining slots for character-specific skills (shield bash, rally, aimed shot, etc.).
  - **Wait** (hourglass icon): Delays the unit's turn.
  - **Rotate** (circular arrow icon): Changes facing without moving.
  - **End Turn** (checkmark or flag icon): Ends the current unit's action. Positioned at the far right and visually distinct (different color or border).
  - **Items** (pouch icon): Opens a quick-access item panel (bandages, potions).
- **Scrolling:** If a unit has more actions than fit on screen, the bar scrolls horizontally. A subtle fade gradient at the right edge indicates more content.
- **Disabled states:** Actions that cannot be performed (not enough AP, wrong range, etc.) are shown with reduced opacity (40%) and a lock icon overlay. Tapping a disabled action shows a brief tooltip explaining why it is unavailable.
- **Cooldown display:** Skills on cooldown show a small numeric overlay (turns remaining) and a darkened fill sweeping across the icon.
- **Thumb reach:** The action bar is positioned within the natural thumb arc for both one-handed and two-handed grips. On devices with gesture navigation bars, the action bar is padded above the system gesture area.

#### Contextual Slide-Up Panel

For actions requiring additional information (selecting a skill target, viewing detailed tooltips, checking combat odds), a slide-up panel emerges from the bottom:

- **Trigger:** Long press on a skill icon, or tap on a skill that requires target selection.
- **Content varies by context:**
  - **Skill details:** Skill name, description, AP cost, damage range, hit chance modifiers, status effects applied.
  - **Attack preview:** Before confirming an attack, shows: hit chance %, expected damage range, armor vs HP damage split, any special effects. "Confirm" and "Cancel" buttons at the bottom.
  - **Combat log:** Scrollable text log of all combat events in the current battle. Accessed via a small "log" button in the corner.
- **Dismissal:** Swipe down, tap outside the panel, or tap a "close" button.

#### End-of-Battle Summary

After a battle concludes, a full-screen panel slides up:

- **Top section:** Victory or Defeat banner in appropriate style (gold-trimmed parchment for victory, blood-stained torn parchment for defeat).
- **Casualty report:** List of all characters with their status (uninjured, injured with injury name, dead). Dead characters are shown with a red X over their portrait and name struck through.
- **Loot section:** Scrollable grid of acquired items with rarity-colored borders.
- **XP gained:** Per-character XP bars showing progress toward next level.
- **Continue button:** Large, bottom-center. Returns to overworld.

### 5.2 Overworld UI

#### Screen Zones

```
+-------------------------------------------+
|  Resource Bar                             |  <- Top 6-8%
|  [Gold] [Food] [Tools] [Meds] [Day/Time] |
|-------------------------------------------|
|                                           |
|                                           |
|          Parchment Map                    |  <- Center 70-78%
|          (Pannable, Zoomable)             |
|                                           |
|                                           |
|-------------------------------------------|
|  Character Roster Strip                   |  <- Bottom 12-16%
|  [Port1][Port2][Port3][Port4] ... scroll  |
+-------------------------------------------+
```

#### Resource Bar

- **Position:** Top of screen, full width.
- **Height:** 36-44dp.
- **Background:** Dark parchment strip with ink border at bottom.
- **Content (left to right):**
  - **Gold:** Coin icon + numeric value (e.g., "342"). Gold color text.
  - **Food:** Bread/meat icon + numeric value + days remaining estimate (e.g., "24 (~6d)"). Turns red when below 3 days.
  - **Tools:** Hammer/wrench icon + numeric value. Used for equipment repair.
  - **Medicine:** Bandage/herb icon + numeric value. Used for treating injuries.
  - **Date/Time:** Sun or moon icon showing current time of day + day count or calendar date (e.g., "Day 47, Afternoon"). The icon changes to reflect the day/night state.
- **Tap interaction:** Tapping any resource opens a tooltip with detailed information (food consumption rate, tool usage history, etc.).

#### Parchment Map

- **Position:** Center of screen, filling the space between resource bar and roster strip.
- **Behavior:** This is the primary Babylon.js viewport for the overworld. The parchment map, terrain, icons, fog of war, and day/night lighting are rendered here.
- **Interaction:** Tap to select destinations, enemy parties, or settlements. Pan and zoom via touch gestures.
- **Settlement tooltip:** When a settlement is tapped, a parchment tooltip panel appears near the settlement (positioned to avoid covering the settlement itself), showing:
  - Settlement name and type.
  - Available services (shop, tavern, temple, blacksmith).
  - Available contracts (count, brief descriptions).
  - "Enter" button to visit the settlement.
- **Movement path:** When a destination is tapped, a dotted line path is drawn from the party to the destination. An estimated travel time is shown alongside the path. A "Travel" confirmation button appears. Tapping elsewhere cancels.

#### Character Roster Strip

- **Position:** Bottom of screen, full width.
- **Height:** 64-80dp.
- **Content:** Horizontally scrollable row of character portraits.
  - Each portrait is 56x56dp in a square frame.
  - Below or overlaid on each portrait: a thin HP bar and armor bar.
  - Injured characters have a red medical cross icon overlaid.
  - Dead characters are removed from the strip (or shown as grayed-out memorial if within the last day, giving the player a chance to notice).
  - Morale icons overlaid (happy, neutral, unhappy face).
- **Tap interaction:** Tapping a portrait opens that character's detail screen (inventory, stats, perks).
- **Long press:** Shows a quick-info tooltip with name, class, current HP/armor, active injuries, and morale.
- **Drag behavior:** Horizontal swipe scrolls through the roster. If the company has more than 6-7 members, scrolling is necessary.

#### Overworld Menu Access

- A small **menu button** (three horizontal lines or a journal icon) in the top-left or top-right corner opens the main menu:
  - Save/Load
  - Company Roster (full list view)
  - Inventory/Stash
  - Company Log (narrative events history)
  - Settings
  - Retire (end campaign)

### 5.3 Inventory Screen

#### Layout

```
+-------------------------------------------+
|  [Back]    CHARACTER NAME     [Prev][Next] |  <- Top nav 6%
|-------------------------------------------|
|          Character Portrait               |  <- 25-30%
|     [Helm]                                |
| [WeaponL]  [Armor]  [WeaponR/Shield]     |
|     [Accessory1]  [Accessory2]            |
|     [Bag Slot 1]  [Bag Slot 2]           |
|-------------------------------------------|
|  Equipment Stats Summary                  |  <- 8-10%
|  Total Armor: 120  Fatigue Penalty: 18   |
|-------------------------------------------|
|  Company Stash / Ground Loot              |  <- Remaining 40-50%
|  [item][item][item][item][item]           |
|  [item][item][item][item][item]           |
|  [item][item][item]     ... scrollable    |
+-------------------------------------------+
```

#### Character Portrait Section

- The character's bust portrait (from the paper-doll system) is displayed large at the top, reflecting currently equipped gear.
- Equipment slots are arranged around or below the portrait:
  - **Helmet slot** above or at the head.
  - **Armor slot** at the center of the torso area.
  - **Left hand** (weapon) slot to the left.
  - **Right hand** (weapon or shield) slot to the right.
  - **Accessory slots** (amulet, ring) below the armor.
  - **Bag slots** (2 quick-access inventory slots for potions, bandages) at the bottom.
- Each slot shows the item icon within it, or a dimmed silhouette placeholder if empty.
- **Equipped item interaction:** Tapping an equipped item highlights it and shows its stats in a tooltip. A second tap or an "Unequip" button removes it to the stash.

#### Stash Grid

- Below the equipment section, a scrollable grid displays all items in the company stash.
- Items are displayed as icons in a grid (5 columns on most phones).
- Items are color-bordered by rarity: gray (common), white (uncommon), blue (rare), gold (named/legendary).
- **Equip flow:** Tap an item in the stash to select it. If it can be equipped on the current character, the valid equipment slot(s) highlight. Tap the slot to equip. This **tap-to-select, tap-to-equip** flow replaces drag-and-drop, which is unreliable on mobile.
- **Alternative drag-and-drop:** For players who prefer it, items can also be dragged from stash to equipment slot. But the tap-tap flow is the primary designed interaction.
- **Item tooltip:** Long press on any item (equipped or in stash) shows a detailed tooltip: item name, type, stats, durability, special properties, flavor text. The tooltip has "Equip," "Sell" (if in a shop), and "Destroy" buttons.

#### Navigation

- **Back button** (top-left) returns to the previous screen (overworld or roster).
- **Prev/Next arrows** (top-right) cycle through company members without returning to the roster.

### 5.4 Perk Tree Screen

#### Layout

```
+-------------------------------------------+
|  [Back]    CHARACTER NAME    Level: 7      |
|-------------------------------------------|
|  Available Perk Points: 1                 |
|-------------------------------------------|
|  TIER 1 (Level 1-3)                      |
|  [Perk][Perk][Perk][Perk][Perk] ...      |
|                                           |
|  TIER 2 (Level 4-6)                      |
|  [Perk][Perk][Perk][Perk][Perk] ...      |
|                                           |
|  TIER 3 (Level 7-9)                      |
|  [Perk][Perk][Perk][Perk] ...            |
|                                           |
|  TIER 4 (Level 10-11)                    |
|  [Perk][Perk][Perk] ...                  |
|                                           |
|  ... scrollable vertically                |
+-------------------------------------------+
```

#### Perk Display

- **Tiers** are arranged **top to bottom**, with Tier 1 at the top of the scrollable area and higher tiers below.
- Within each tier, perks are arranged **horizontally** in a row. If more perks exist than fit on screen width, the row scrolls horizontally (or wraps to a second line if preferred).
- Each perk is displayed as a **square icon** (56x56dp) with a name label below it.
- **Available perks** (can be taken now, have unspent perk points, meet tier requirements): Full opacity, glowing border.
- **Taken perks:** Full opacity, gold checkmark overlay, golden border.
- **Locked perks** (insufficient level or prerequisite not met): Reduced opacity (40%), locked icon overlay.
- **Tap interaction:** Tapping a perk opens a detail panel showing: perk name, full description, stat modifications, prerequisites, and a "Learn" button (if available). The Learn button requires a confirmation tap ("Are you sure? This cannot be undone.").
- **Prerequisite lines:** If perks have prerequisites (e.g., "requires 2 perks from Tier 2"), thin connecting lines are drawn between tiers, and the prerequisite text is shown clearly in the detail panel.

### 5.5 Event Screen

Events are narrative encounters (finding a shrine, a deserter asking for mercy, a mysterious merchant) that present the player with choices.

#### Layout

```
+-------------------------------------------+
|                                           |
|          Event Illustration               |  <- Top 30-35%
|          (Full-width, cropped)            |
|                                           |
|-------------------------------------------|
|                                           |
|  Narrative Text                           |  <- Middle 30-35%
|  (Scrollable if long)                     |
|                                           |
|  "You come upon a burning village.        |
|   Survivors beg for help, but the         |
|   raiders may still be nearby..."         |
|                                           |
|-------------------------------------------|
|  [Choice 1: Help the survivors        ]   |  <- Bottom 25-30%
|  [Choice 2: Search for loot           ]   |
|  [Choice 3: Leave immediately         ]   |
|  [Choice 4: Set an ambush (Tactics 5) ]   |
+-------------------------------------------+
```

#### Event Illustration

- The top section displays a **hand-painted illustration** relevant to the event. These are pre-rendered 2D images in the game's art style.
- Illustrations are full-width, cropped to fit the allocated vertical space (letterboxed if aspect ratio does not match).
- Examples: a burning village, a crossroads shrine, a shadowy cave entrance, a noble's court, a battlefield aftermath.
- Illustrations may be reused across similar event types, with palette shifts or overlay variations (day vs night, rain vs clear) to add variety.
- If no specific illustration exists for an event, a generic category illustration is used (generic "road encounter," generic "town event," etc.).

#### Narrative Text

- Displayed on a parchment-textured panel with slight padding.
- **Font:** A readable serif font that evokes hand-lettering without sacrificing legibility. Size 16-18sp for body text.
- Text may include inline indicators like character names in **bold**, skill checks in *italics*, or stat requirements in [brackets].
- If text is longer than the visible area, it scrolls vertically within its panel. A subtle scroll indicator (fade gradient at bottom) signals more content.

#### Choice Buttons

- **Full-width buttons** stacked vertically at the bottom of the screen.
- Each button is a parchment-styled panel with ink border, containing the choice text.
- Button height: 48-56dp minimum.
- Buttons that require a stat check show the requirement inline (e.g., "[Tactics 5+]" or "[Cost: 50 gold]"). If the player meets the requirement, the text is normal. If not, it is red and the button is dimmed (but still tappable---the game explains why it fails on selection, or it may be hidden entirely depending on design preference).
- **Tap behavior:** Tapping a choice triggers the outcome. For irreversible choices, a brief confirmation may appear ("Are you sure?"), though this should be used sparingly to maintain narrative flow.

### 5.6 Contract Screen

Contracts are job offers available at settlements, providing the primary mission structure.

#### Layout

```
+-------------------------------------------+
|  [Back]    CONTRACT BOARD / NPC NAME       |
|-------------------------------------------|
|                                           |
|  NPC Portrait        Contract Title       |  <- Top 20-25%
|  (Bust, 96x96dp)    "Clear the Brigands  |
|                       from the Old Mill"  |
|                      Posted by: Elder Hm  |
|-------------------------------------------|
|                                           |
|  Contract Narrative                       |  <- Middle 30-35%
|  (Scrollable parchment)                   |
|                                           |
|  "The brigands came three nights ago.     |
|   They took our grain stores and killed   |
|   young Tomas when he tried to stop them. |
|   We cannot pay much, but..."             |
|                                           |
|-------------------------------------------|
|  Payment & Details                        |  <- 15-20%
|  Base Pay: 200 gold                       |
|  Advance: 80 gold (negotiable)            |
|  Difficulty: Moderate (skull icons)       |
|  Distance: ~2 days travel                 |
|  Time Limit: 7 days                       |
|-------------------------------------------|
|  [Negotiate]  [Accept]  [Decline]         |  <- Bottom 10-12%
+-------------------------------------------+
```

#### NPC Portrait

- The contract giver is shown as a bust portrait in the same style as character portraits.
- NPCs have unique or semi-unique faces (drawn from a smaller pool than mercenary faces, reused across settlements with palette swaps).
- NPC expressions may vary: desperate villager, haughty noble, grizzled militia captain.

#### Contract Narrative

- Flavor text describing the job, written in second person or as dialogue from the NPC.
- Styled on parchment with the same font as event text.
- Scrollable if longer than the visible area.

#### Payment and Details

- Clearly laid out in a structured format:
  - **Base Pay:** Total gold upon completion.
  - **Advance:** Gold paid upfront (often negotiable).
  - **Difficulty:** Shown as skull icons (1 skull = easy, 3 skulls = deadly) plus a text descriptor.
  - **Distance:** Estimated travel time to the contract location.
  - **Time Limit:** Days before the contract expires or the situation changes.
  - **Special conditions:** Any notable modifiers ("Enemy has archers," "Must capture alive," "Night battle").

#### Negotiation

- Tapping "Negotiate" opens a sub-panel where the player can attempt to increase pay or advance.
- Negotiation is a simple interface: a slider or +/- buttons to adjust the requested amount, with a success chance percentage displayed.
- The success chance is based on the company's renown and the specific character assigned as spokesperson (if applicable).
- Outcome: "The elder reluctantly agrees to pay 250 gold" or "The elder is insulted by your greed and withdraws the offer" (on critical failure).

#### Action Buttons

- **Negotiate:** Opens negotiation sub-panel.
- **Accept:** Takes the contract. Gold advance is paid immediately.
- **Decline:** Returns to the settlement screen / contract board.
- All three are large, tappable buttons at the bottom of the screen within thumb reach.

---

## 6. Touch Controls

### Core Touch Interactions

The game must feel natural and responsive on touch screens. Every interaction should be achievable within 1-3 taps. Complex actions that would require keyboard shortcuts on PC are mapped to contextual gestures.

#### Single Tap

| Context                  | Action                                                                 |
|--------------------------|------------------------------------------------------------------------|
| Tap on own unit          | Selects the unit. Shows info panel and action bar.                     |
| Tap on hex (unit selected, Move active) | If valid movement hex: unit moves there. If invalid: deselects.  |
| Tap on enemy (Attack active) | Initiates attack on that enemy. Shows attack preview first.       |
| Tap on hex (no unit selected) | Shows hex terrain info tooltip.                                  |
| Tap on skill icon        | Activates that skill. Valid targets/hexes highlight.                   |
| Tap on settlement (overworld) | Shows settlement tooltip.                                        |
| Tap on enemy party (overworld) | Shows enemy info tooltip with estimated strength.                |
| Tap on destination (overworld) | Plots travel path. Shows confirmation.                           |
| Tap on UI button         | Activates that button's function.                                      |

#### Double Tap

| Context                  | Action                                                                 |
|--------------------------|------------------------------------------------------------------------|
| Double tap on battlefield | Centers camera on the tapped location.                               |
| Double tap on settlement  | Enters the settlement directly (skips tooltip).                      |
| Double tap on own unit    | Centers camera on unit and selects.                                  |

#### Long Press (500ms hold)

| Context                    | Action                                                               |
|----------------------------|----------------------------------------------------------------------|
| Long press on own unit     | Shows detailed stat tooltip (full stats, all effects).               |
| Long press on enemy unit   | Shows detailed enemy info (type, estimated stats, known abilities).  |
| Long press on hex          | Shows terrain details (type, elevation, cover, movement cost).       |
| Long press on skill icon   | Shows skill tooltip (description, cost, cooldown, effect details).   |
| Long press on item         | Shows item tooltip (stats, description, actions).                    |
| Long press on status icon  | Shows status effect description and remaining duration.              |
| Long press on perk         | Shows perk detail panel.                                             |

#### Pinch-to-Zoom

- **Two fingers moving apart:** Zoom in on the battlefield or overworld map.
- **Two fingers moving together:** Zoom out.
- **Zoom range (battle):** 0.5x to 2.0x of default zoom. Default shows approximately 8-10 hexes across.
- **Zoom range (overworld):** 0.5x to 3.0x. Default shows the player party and surrounding area within a day's travel.
- **Zoom behavior:** Smooth, inertial. Zooms toward the center point between the two fingers.

#### Two-Finger Drag (Pan)

- **Two fingers moving in the same direction:** Pans the camera across the battlefield or overworld map.
- **Single-finger drag** on empty battlefield hexes also pans the camera (since single-finger drag on units selects them).
- **Inertia:** After lifting fingers, the pan continues briefly with deceleration (momentum scrolling).
- **Bounds:** Camera pan is bounded to the map area plus a small margin. The camera cannot be panned to show only empty space.

#### Hold-to-Preview

- When a skill with an area of effect (AoE) is selected and the player holds their finger on a target hex, the AoE area highlights on the map without committing the action.
- Example: A fireball skill---holding on a hex shows the 3-hex-radius blast zone in semi-transparent red.
- Lifting the finger without moving cancels. Tapping the same hex confirms the action.

#### Undo Movement

- After a unit moves but before performing an attack or ending the turn, an **"Undo Move"** button appears in the action bar (or as a floating button near the unit).
- Tapping "Undo Move" returns the unit to its previous position at no cost.
- Undo is only available for movement, not for attacks or skill uses.
- This is critical on mobile where accidental taps are more likely than on PC.

### Tap Target Sizing

All interactive elements adhere to platform accessibility guidelines:

- **Minimum tap target size:** 44x44dp (iOS Human Interface Guidelines) to 48x48dp (Material Design).
- **This applies to:** Skill icons, hex tiles, portraits, buttons, menu items, list rows, toggle controls.
- **Spacing between targets:** Minimum 8dp between adjacent tappable elements to prevent misregistration.
- **Edge targets:** Buttons near screen edges have at least 16dp padding from the physical edge.
- **Hit area extension:** For small visual elements (status icons, small text links), the tappable hit area extends beyond the visible boundary to meet the 44dp minimum.

### Haptic Feedback

The game uses the device's haptic engine (Taptic Engine on iOS, vibration motor on Android) to reinforce key actions:

| Event                    | Haptic Type                                     |
|--------------------------|--------------------------------------------------|
| Selecting a unit         | Light tap (10ms, low intensity)                  |
| Confirming movement      | Medium tap (15ms, medium intensity)              |
| Landing an attack (hit)  | Heavy impact (25ms, high intensity)              |
| Critical hit             | Double heavy impact (two pulses, 25ms each)      |
| Kill                     | Heavy impact followed by medium (30ms + 15ms)    |
| Miss                     | Soft tap (10ms, very low intensity)              |
| Taking damage            | Medium impact (20ms, medium intensity)           |
| Character death          | Long rumble (100ms, medium-high intensity)        |
| Equipping item           | Light click (10ms, low intensity)                |
| Error/invalid action     | Three rapid light taps (10ms x 3, low intensity) |
| Level up                 | Rising pattern: light, medium, heavy (3 pulses)  |

Haptic feedback must be user-togglable in settings (off, light, full).

---

## 7. Camera System

### Battle Camera

The battle camera uses a **fixed isometric angle** with no rotation, ensuring consistent visual readability and simplifying touch interaction (hex positions always correspond to the same screen positions regardless of camera state).

#### Camera Type

- **Babylon.js camera:** `ArcRotateCamera` locked at a fixed alpha (rotation) and beta (elevation) angle, with zoom controlled by the radius parameter. Alternatively, an `UniversalCamera` positioned at a fixed offset.
- **Recommended alternative:** An **orthographic camera** may provide cleaner pixel-aligned rendering for the 2D sprite aesthetic. The orthographic projection eliminates perspective distortion, making hex tiles uniform across the screen. This is the preferred option.
  - Set `camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA`.
  - Control zoom by adjusting `camera.orthoTop`, `camera.orthoBottom`, `camera.orthoLeft`, `camera.orthoRight`.

#### Fixed Angle

- **Elevation angle (beta):** Fixed at approximately 50-55 degrees from horizontal (0 degrees would be top-down, 90 degrees would be side-on). This angle provides good terrain readability while showing elevation differences.
- **Rotation angle (alpha):** Fixed. The map is oriented so that "north" points toward the upper-left or upper-right of the screen. This maximizes the use of portrait-mode vertical space for the hex grid.
- **No rotation controls.** The player cannot rotate the camera. This is a deliberate design decision to keep the UI simple and prevent disorientation on mobile.

#### Scrolling (Pan)

- The camera pans freely across the battlefield via touch drag gestures (see Touch Controls).
- Pan speed is proportional to zoom level: when zoomed in, panning moves slower (in world units) for fine control; when zoomed out, panning moves faster for quick traversal.
- Pan boundaries are set to the battlefield extents plus a 2-hex margin on each side.
- Pan uses inertial deceleration: after the player lifts their finger, the camera continues moving briefly, decelerating to a stop over 200-400ms.

#### Zoom

- Zoom in/out via pinch gesture.
- **Minimum zoom (closest):** Shows approximately 4-5 hexes across the screen width. Individual hex art is clearly visible. Character sprites show equipment detail.
- **Maximum zoom (farthest):** Shows the entire battlefield. Individual character details are not readable, but unit positions and health bars are visible.
- **Default zoom:** Shows approximately 8-10 hexes across the screen width. This is the comfortable gameplay zoom where hexes are large enough to tap and unit sprites are identifiable.
- Zoom is smooth and continuous, with inertial deceleration.

#### Auto-Center

- When a new unit's turn begins, the camera smoothly pans to center on that unit over 300-500ms (ease-in-out interpolation).
- If the unit is already on screen (within the central 60% of the viewport), the camera does not move. This prevents annoying small adjustments.
- Auto-center can be disabled in settings for advanced players who prefer manual camera control.
- During enemy turns, the camera follows the active enemy unit, centering on it before showing its action.

#### Animation Camera

- During attack animations, the camera may optionally zoom in slightly (5-10%) toward the action and zoom back out after the animation completes. This is subtle and should not disrupt gameplay flow.
- Screen shake (for heavy hits) is implemented as rapid small offsets to the camera position (2-4 pixel displacement, 3-4 oscillations over 100-200ms), not as actual camera movement in world space.

### Overworld Camera

The overworld camera follows similar principles:

- **Type:** Orthographic, top-down.
- **Angle:** Directly overhead (or very nearly so, with a slight tilt of 5-10 degrees to give the map a hint of dimensionality for mountain and settlement icons).
- **Pan:** Free scrolling across the map via touch drag.
- **Zoom:** Pinch-to-zoom with wider range than battle camera.
  - Minimum zoom: Shows a small region around the party (1-2 day travel radius).
  - Maximum zoom: Shows the entire game world (if the world map is not too large) or a large regional overview.
- **Auto-center:** The camera starts centered on the player party. When the party moves, the camera follows. A "recenter on party" button (small compass or target icon) is available as a floating button if the player has panned away.
- **Smooth movement:** The party icon and camera both move smoothly along the travel path during movement sequences.

---

## 8. Feedback Systems

Clear, immediate feedback for all game events is essential on mobile, where players cannot hover for tooltips and may miss subtle cues.

### Floating Damage Numbers

When any unit takes damage, floating numbers appear above the unit and drift upward before fading:

- **Armor damage:** Gray text, slightly smaller font. Shows the amount of armor reduced. Format: "-15" in gray.
- **Health damage:** Red text, larger and bolder. Shows HP lost. Format: "-23" in blood red.
- **Combined display:** If both armor and HP are damaged in one hit, armor damage appears first (slightly left) and HP damage appears second (slightly right), both floating upward.
- **Healing:** Green text, upward float. Format: "+12" in heal green.
- **Miss:** "MISS" in white/gray italic text, floating upward.
- **Graze:** "GRAZE" in light orange text, with reduced damage number.
- **Critical hit:** Damage number is 50% larger, in bright red, with an exclamation mark or starburst effect. Format: "42!" with visual emphasis.
- **Overkill/Kill:** The final damage number that kills a unit may have a brief screen shake accompanying it.

**Animation:** Numbers spawn at the unit's head position, drift upward by 30-50 pixels over 800ms, and fade from full opacity to 0 over the final 400ms. Numbers have a slight random horizontal scatter to prevent stacking when multiple hits occur in sequence.

### Hit Chance Display

Before the player commits to an attack, the expected hit chance is displayed:

- **Trigger:** When the player selects an attack action and hovers (holds finger on) an enemy target.
- **Display:** A percentage value appears floating near the enemy unit or in the attack preview panel. Format: "73%" in white text with dark outline for readability.
- **Color coding:**
  - 75-100%: White or light green (good odds).
  - 50-74%: Yellow (moderate odds).
  - 25-49%: Orange (poor odds).
  - 0-24%: Red (terrible odds).
- **Additional info (in preview panel):** Expected damage range, armor vs HP split, any relevant modifiers listed (height advantage, flanking, etc.).

### Miss/Hit/Graze Audio-Visual Feedback

Each attack outcome has a distinct combined audio-visual signature so the player immediately knows what happened:

| Outcome       | Visual                                              | Audio                                        |
|---------------|------------------------------------------------------|----------------------------------------------|
| Solid Hit     | Blood splatter, recoil animation, red damage number  | Meaty impact thud + grunt                    |
| Hit (armor)   | Sparks, minimal recoil, gray damage number           | Metallic clang + scrape                      |
| Critical Hit  | Large blood spray, heavy recoil, screen shake, big number | Loud crunch + scream or gasp              |
| Graze         | Small blood flick, slight flinch, orange damage text | Light scrape + soft grunt                    |
| Miss          | Whiff speed lines, dodge lean, "MISS" text           | Whoosh sound + silence (no impact)           |
| Block (shield)| Shield flash, pushback, "BLOCKED" text               | Heavy shield bang + wood/metal groan         |

### Morale State Icons

Each unit's current morale state is indicated by a small icon visible above or near their sprite:

| Morale State   | Icon                          | Visual Treatment                          |
|----------------|-------------------------------|-------------------------------------------|
| Confident      | Green upward chevron          | Subtle green glow on unit base            |
| Steady         | (No icon - default state)     | Normal appearance                         |
| Wavering       | Yellow horizontal dash        | Unit sprite slightly desaturated          |
| Breaking       | Orange downward chevron       | Unit sprite jitters subtly (1px shake)    |
| Fleeing        | Red double downward chevron   | Unit sprite at 80% opacity, moving away   |

Morale icons are small (12-16dp) and positioned consistently (upper-right of the unit sprite) so they do not clutter the battlefield but are visible at default zoom.

### Status Effect Icons

Active status effects are shown as small icons near the unit sprite and in the unit info panel:

- Icons are 16x16dp on the battlefield, 24x24dp in the info panel.
- Each status effect has a unique icon:
  - **Poisoned:** Green droplet.
  - **Bleeding:** Red droplets.
  - **Stunned:** Yellow stars circling.
  - **Rooted/Netted:** Brown chain links.
  - **Shielded/Buffed:** Blue upward arrow.
  - **Weakened/Debuffed:** Red downward arrow.
  - **On fire:** Orange flame.
  - **Frightened:** Purple ghost face.
- **Duration indicator:** A small number overlaid on the icon shows remaining turns.
- **Tooltip (long press):** Shows effect name, description, source, remaining duration, and stat modifications.
- **Stacking:** If a unit has more than 3 active effects, the battlefield shows the 3 most critical, with a "+2" indicator. The info panel shows all.

### Combat Log

A detailed combat log records every game event with precise numeric data for players who want to understand exactly what happened:

- **Access:** A small scroll/book icon button in the corner of the battle screen opens the combat log as a slide-up panel.
- **Content:** Chronological entries for every action:
  ```
  [Turn 3] Markus attacks Brigand Thug #2 with Longsword
    Hit roll: 73% chance, rolled 45 - HIT
    Damage: 28 (base 22 + 6 bonus) vs 12 armor
    Armor absorbed: 12 damage, armor reduced to 38
    HP damage: 16, HP reduced to 44/60

  [Turn 3] Brigand Thug #2 - Morale check triggered (ally killed)
    Resolve: 35, required: 40 - FAILED
    Status: Wavering -> Breaking
  ```
- **Scrollable:** Full history of the current battle, scrollable from most recent (top) to oldest (bottom).
- **Font:** Monospaced or small serif font for readability. Dark ink on parchment background.
- **Filter options:** Toggle to show only player actions, enemy actions, or all.

---

## 9. Sound Design

### Music

The musical score establishes the game's dark medieval atmosphere and shifts dynamically based on context.

#### Overworld Music

- **Instruments:** Acoustic and period-appropriate. Primary instruments: lute (finger-picked melodies), hurdy-gurdy (droning chords and sustained notes), frame drums (soft rhythmic pulse), wooden flutes (haunting melodies), bowed strings (viola da gamba or similar, for low sustained tones).
- **Mood:** Melancholic, contemplative, with moments of quiet beauty. The music evokes long marches through rain, campfires in the wilderness, and the weariness of a life spent fighting.
- **Tempo:** Slow to moderate (60-80 BPM). Relaxed pacing that does not create urgency.
- **Structure:** Looping tracks of 3-5 minutes with seamless loop points. Multiple tracks that cycle or crossfade based on map region, time of day, or company state.
- **Dynamic variation:**
  - **Daytime:** Slightly brighter instrumentation. Lute melodies more prominent.
  - **Night:** Lower register, more drone elements. Hurdy-gurdy and bowed strings dominant. Quieter overall.
  - **Dangerous territory:** Minor key shift. Drum pattern becomes more insistent. Dissonant intervals on strings.
  - **Near settlements:** Warmer tone. Tavern-like elements may blend in (distant laughter, clinking).

#### Combat Music

- **Instruments:** Same medieval palette but with much stronger percussion. War drums (large frame drums, bodhran-style), timpani-like low thuds, aggressive bowed strings, hurdy-gurdy at higher intensity with more grinding tone.
- **Mood:** Tense, visceral, driving. The music should make each battle feel dangerous and consequential without becoming generic "epic battle" music. Think: the desperate rhythm of soldiers bracing for a charge, not a Hollywood superhero theme.
- **Tempo:** Moderate to fast (100-130 BPM). The tempo may increase as the battle progresses or as more units die.
- **Structure:** Layered stems that intensify based on battle state:
  - **Pre-battle / Round 1:** Sparse. Drums only, building tension.
  - **Active combat:** Full instrumentation. Aggressive melody lines. Percussion at full intensity.
  - **Winning (majority of enemies down):** Music maintains intensity but shifts to a more triumphant key.
  - **Losing (multiple friendlies down):** Music becomes more frantic. Higher-pitched strings, faster drum patterns. Dissonance increases.
  - **Last enemy standing:** Music drops to tension---sparse, anticipatory.
- **Transition:** Crossfade between overworld and combat music over 2-3 seconds when entering/exiting battle.

#### Event Music

- For narrative events, the music shifts to a context-appropriate short piece or ambient bed:
  - **Tavern events:** Warm, slightly boisterous lute and percussion.
  - **Dark/horror events:** Drone-heavy, atonal strings, no melody.
  - **Noble court:** More refined: harpsichord-like elements, measured pace.
  - **Religious events:** Choral drone or organ-like sustained tones.

#### Menu/Camp Music

- Quiet, ambient. Campfire crackle underlaying a simple lute melody.
- This plays during inventory management, character screens, and between events.

### Sound Effects

#### Combat SFX

Every weapon and armor interaction has distinct audio:

**Weapon impacts on flesh:**
- **Sword slash:** Sharp cutting sound with wet undertone. Higher pitched for lighter swords, deeper for greatswords.
- **Axe chop:** Heavy thudding crack with wood splintering. Meaty.
- **Mace/hammer hit:** Deep, resonant crunch. Bone-breaking undertone.
- **Spear thrust:** Quick piercing sound. Sharp inhale from the victim.
- **Dagger stab:** Quick, wet, quiet. Personal and intimate.
- **Arrow impact:** Thunk of wood and stone piercing flesh. Higher pitched for crossbow bolts.

**Weapon impacts on armor:**
- **Blade on metal:** Ringing metallic clash. Sparking scrape sound. Volume and pitch vary by weapon size.
- **Blade on leather:** Dull thud with scratching. Less dramatic than metal.
- **Blunt on metal:** Heavy, echoing gong-like impact. Deformation sound.
- **Blade on shield (wood):** Hard wooden bang with splintering crack.
- **Blade on shield (metal):** Bright, loud metallic clash.

**Miss sounds:**
- Whooshing air. The sound of the weapon cutting empty space. Higher pitched for faster weapons, lower for heavy weapons.

**Movement sounds:**
- Footsteps vary by terrain: squelch on mud, crunch on gravel, thud on wood, splash on water, creak on snow.
- Armor jingle and clank during movement (heavier armor = louder).

**Death sounds:**
- A pained grunt, cry, or scream depending on the death type. Varied per character (randomized from a pool).
- Falling body impact (thud on ground, clatter of dropped equipment).
- Occasional dramatic death sounds for named enemies or critical kills.

#### Monster Sounds

Each enemy type has a distinct audio signature:

- **Undead:** Dry rattling (skeletons), wet moaning (zombies), ethereal wailing (ghosts).
- **Orcs:** Guttural roaring, heavy breathing, war cries (deep, guttural).
- **Goblins:** High-pitched cackling, chittering, shrieks when dying.
- **Wolves/Beasts:** Growling, snarling, howling (distant for ambiance, close for combat).
- **Lindwurm/Large beasts:** Deep, rumbling roars. Ground-shaking footsteps.

Each monster type has variants for: idle/ambient, detection/aggro, attack, hit reaction, death.

#### Ambient Overworld Audio

Environmental ambient soundscapes layer beneath the music:

- **Open plains:** Wind (varying intensity), distant bird calls, grass rustling.
- **Forest:** Bird songs (more varied), wind through leaves, occasional branch creak or snap.
- **Mountains:** Strong wind, distant echoes, occasional rockfall.
- **Swamp:** Insect buzzing, frog croaking, water bubbling.
- **Settlement:** Distant voices, hammering (blacksmith), animal sounds (horses, chickens), creaking signs.
- **Night:** Crickets, owl hoots, distant wolf howls, crackling campfire (when party is camping).
- **Rain:** Steady rainfall with occasional thunder. Muffles other ambient sounds.

Ambient layers crossfade as the player moves between terrain types.

#### UI Audio

- **Button tap:** Soft, tactile click. Parchment-textured sound (like tapping a book page).
- **Menu open/close:** Quiet paper unfolding/folding.
- **Item equip:** Metal-on-leather fitting sound. Click of a buckle.
- **Item drop:** Soft thud or clatter depending on item type.
- **Coin sounds:** Metallic jingling when spending or receiving gold.
- **Level up:** Rising chime or horn fanfare (brief, 1-2 seconds).
- **Error/invalid:** Low, muted wooden knock. Not harsh---does not punish the player.
- **Notification:** Soft bell or chime.

### Mobile Audio Implementation

Mobile browsers have specific constraints around audio playback:

- **Autoplay restrictions:** Most mobile browsers require a user gesture before audio can play. The game must handle this by:
  1. Showing a "Tap to Start" or title screen that requires user interaction before any audio context is created.
  2. Creating the `AudioContext` (or Babylon.js `Engine.audioEngine`) only after this first interaction.
  3. Resuming the audio context if it becomes suspended (e.g., when the app is backgrounded and foregrounded).
- **Audio format:** Use `.mp3` for maximum compatibility. `.ogg` as fallback for browsers that prefer it. Babylon.js `Sound` objects handle format fallback automatically.
- **Audio sprite sheets:** For short SFX (impacts, UI clicks), pack multiple sounds into a single audio file and use time offsets to play specific sounds. This reduces HTTP requests and load time.
- **Volume management:** Separate volume sliders for Music, SFX, and Ambient in the settings menu. A master mute toggle.
- **Background behavior:** When the browser tab loses focus or the app is backgrounded, audio should pause (or at minimum, music should pause; SFX can stop immediately). Resume when focus returns.
- **Memory management:** Unload combat music during overworld play and vice versa. Keep only the currently needed audio tracks in memory.

---

## 10. Babylon.js Implementation Notes

### Rendering Architecture

The game uses **Babylon.js** as its rendering engine, running in a mobile browser context. The following outlines the technical approach for each visual system.

#### Engine Setup

```javascript
// Engine creation with mobile-optimized settings
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
    adaptToDeviceRatio: true, // Handles high-DPI screens
});

// Target WebGL 2 for better performance and features
// Babylon.js will fall back to WebGL 1 automatically if needed
```

- **WebGL 2 target:** WebGL 2 provides better texture compression support, instanced rendering, and shader features. The game should be designed to work on WebGL 2 with graceful fallback to WebGL 1 (disabling advanced features like instanced rendering).
- **Device pixel ratio:** Use `adaptToDeviceRatio: true` but consider capping the internal rendering resolution on very high-DPI devices (3x, 4x) to maintain performance. A 2x cap is reasonable for most content.

### Character Sprites: SpriteManager

Character sprites on the battle map are rendered using Babylon.js `SpriteManager` and `Sprite` objects:

```javascript
// Create a SpriteManager for player characters
const playerSpriteManager = new BABYLON.SpriteManager(
    "playerSprites",
    "assets/sprites/player-spritesheet.png",
    maxPlayerUnits, // Maximum number of concurrent player sprites
    { width: 128, height: 192 }, // Individual frame size in pixels
    scene
);

// Create a sprite for a specific unit
const unitSprite = new BABYLON.Sprite("unit_markus", playerSpriteManager);
unitSprite.position = hexToWorldPosition(hexCoord);
unitSprite.width = 1.0;  // World units
unitSprite.height = 1.5; // Taller than wide (full body sprite)
```

**Sprite Sheet Organization:**
- Each character class/equipment combination has a row in the sprite sheet.
- Columns represent animation frames: idle (2 frames), walk (4 frames), attack (3-4 frames), hit (2 frames), death (3-4 frames).
- Facing is handled by `sprite.invertU = true` for horizontal flipping.
- Separate sprite sheets for each major enemy type.

**Animation Playback:**
```javascript
// Play attack animation
unitSprite.playAnimation(attackStartFrame, attackEndFrame, false, 100);
// Parameters: start frame, end frame, loop, delay between frames (ms)
```

### Hex Tiles: ThinInstances or ExtrudePolygon

Hex tiles can be rendered using one of two approaches:

#### Approach A: ThinInstances (Recommended for Performance)

Create a single hex mesh and render all tiles as thin instances with per-instance data:

```javascript
// Create base hex mesh
const hexShape = [
    new BABYLON.Vector3(0.5, 0, -0.866),
    new BABYLON.Vector3(1.0, 0, 0),
    new BABYLON.Vector3(0.5, 0, 0.866),
    new BABYLON.Vector3(-0.5, 0, 0.866),
    new BABYLON.Vector3(-1.0, 0, 0),
    new BABYLON.Vector3(-0.5, 0, -0.866),
];

const hexMesh = BABYLON.MeshBuilder.ExtrudePolygon("hex", {
    shape: hexShape,
    depth: 0.1,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
}, scene);

// Use thin instances for performance
const matricesData = new Float32Array(numHexes * 16);
for (let i = 0; i < numHexes; i++) {
    const matrix = BABYLON.Matrix.Translation(
        hexPositions[i].x,
        hexPositions[i].y * elevationScale,
        hexPositions[i].z
    );
    matrix.copyToArray(matricesData, i * 16);
}
hexMesh.thinInstanceSetBuffer("matrix", matricesData, 16);
```

- ThinInstances provide excellent draw call reduction: all hexes of the same terrain type render in a single draw call.
- Per-terrain-type materials are needed (one hex mesh per terrain type, each with its own texture and thin instance buffer).
- Elevation is handled by the Y component of the translation matrix.

#### Approach B: ExtrudePolygon Per Hex

For simpler implementation with fewer hexes (small maps under 100 hexes):

```javascript
// Create individual hex meshes
for (const hex of battleMap.hexes) {
    const mesh = BABYLON.MeshBuilder.ExtrudePolygon(`hex_${hex.id}`, {
        shape: hexShape,
        depth: 0.1 + hex.elevation * elevationScale,
    }, scene);
    mesh.position = hexToWorldPosition(hex.coord);
    mesh.material = terrainMaterials[hex.terrainType];
    mesh.metadata = { hexData: hex }; // For hit detection
}
```

- Simpler code but more draw calls. Acceptable for maps with fewer than 200 hexes.
- Each mesh stores hex data in its `metadata` for easy access during pick operations.

#### Recommended: Hybrid

Use ThinInstances for the hex floor tiles (grouped by terrain type) and individual meshes only for elevated hex side-faces and special props that need unique geometry.

### Camera Setup

```javascript
// Orthographic camera for battle (preferred for 2D sprite aesthetic)
const camera = new BABYLON.FreeCamera("battleCamera",
    new BABYLON.Vector3(0, 20, -20), scene);
camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;

// Calculate ortho bounds based on screen aspect ratio
const aspectRatio = engine.getAspectRatio(camera);
const orthoSize = 10; // World units visible vertically
camera.orthoTop = orthoSize;
camera.orthoBottom = -orthoSize;
camera.orthoLeft = -orthoSize * aspectRatio;
camera.orthoRight = orthoSize * aspectRatio;

camera.setTarget(BABYLON.Vector3.Zero());

// Disable default camera controls (we handle touch input ourselves)
camera.inputs.clear();
```

```javascript
// Alternative: ArcRotateCamera locked at fixed angle
const camera = new BABYLON.ArcRotateCamera("battleCamera",
    -Math.PI / 4,       // alpha: rotation around Y axis
    Math.PI / 3.5,       // beta: ~51 degrees from top
    30,                   // radius: distance from target
    BABYLON.Vector3.Zero(),
    scene
);

// Lock rotation
camera.lowerAlphaLimit = camera.alpha;
camera.upperAlphaLimit = camera.alpha;
camera.lowerBetaLimit = camera.beta;
camera.upperBetaLimit = camera.beta;

// Allow zoom via radius
camera.lowerRadiusLimit = 15;
camera.upperRadiusLimit = 50;

// Enable pinch zoom, disable rotation
camera.inputs.removeByType("ArcRotateCameraPointersInput");
camera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());
camera.inputs.attached.pointers.panningSensibility = 50;
camera.pinchPrecision = 20;
```

### UI Rendering: AdvancedDynamicTexture

The HUD (health bars, damage numbers, action bar, etc.) is rendered using Babylon.js GUI:

```javascript
// Fullscreen GUI overlay for HUD elements
const guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
    "battleHUD", true, scene
);

// Example: Floating damage number
function showDamageNumber(worldPosition, damage, isHP) {
    const text = new BABYLON.GUI.TextBlock();
    text.text = `-${damage}`;
    text.color = isHP ? "#8B1A1A" : "#6B6560";
    text.fontSize = isHP ? 28 : 22;
    text.fontWeight = "bold";
    text.outlineWidth = 2;
    text.outlineColor = "#000000";

    guiTexture.addControl(text);
    text.linkWithMesh(targetMesh); // Attach to world position
    text.linkOffsetY = -50;

    // Animate upward and fade out
    let elapsed = 0;
    const duration = 800;
    scene.onBeforeRenderObservable.add(() => {
        elapsed += engine.getDeltaTime();
        const progress = elapsed / duration;
        text.linkOffsetY = -50 - (progress * 60);
        text.alpha = 1 - Math.max(0, (progress - 0.5) * 2);
        if (progress >= 1) {
            text.dispose();
        }
    });
}
```

**GUI Layout for Action Bar:**

```javascript
// Action bar container at bottom of screen
const actionBar = new BABYLON.GUI.StackPanel();
actionBar.isVertical = false;
actionBar.height = "64px";
actionBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
actionBar.paddingBottom = "16px"; // Safe area for gesture navigation
guiTexture.addControl(actionBar);

// Skill button
function createSkillButton(iconUrl, skillId) {
    const button = BABYLON.GUI.Button.CreateImageOnlyButton(
        `skill_${skillId}`, iconUrl
    );
    button.width = "48px";
    button.height = "48px";
    button.paddingLeft = "4px";
    button.paddingRight = "4px";
    button.thickness = 2;
    button.color = "#5C4A3A";
    button.onPointerUpObservable.add(() => {
        onSkillSelected(skillId);
    });
    actionBar.addControl(button);
    return button;
}
```

### Sprite Atlases for Performance

All 2D art assets should be packed into **sprite atlases** (texture atlases) to minimize draw calls and texture swaps:

- **Character sprite atlas:** All animation frames for all character types packed into atlas sheets.
- **Terrain texture atlas:** All hex terrain textures packed into a single atlas. UV coordinates select the correct terrain.
- **UI icon atlas:** All skill icons, status effect icons, and UI decoration graphics in a single atlas.
- **Effect atlas:** Particle effect sprites (blood drops, sparks, speed lines) in a single small atlas.

**Atlas sizing:** Maximum **2048x2048 pixels** per atlas texture. This is the safe upper limit for virtually all mobile GPUs. Some older devices may struggle with textures above this size. Use 1024x1024 where possible for lower-tier device support.

Tool recommendation: Use TexturePacker or a similar tool to generate atlas images and JSON metadata files (frame coordinates, sizes) at build time.

### Texture Compression: KTX2/Basis Universal

To reduce texture memory and download size on mobile:

```javascript
// Enable KTX2 texture support in Babylon.js
BABYLON.KhronosTextureContainer2.URLConfig = {
    jsDecoderModule: "assets/libs/basis_transcoder.js",
    wasmURI: "assets/libs/basis_transcoder.wasm",
};

// Load compressed texture
const material = new BABYLON.StandardMaterial("terrainMat", scene);
material.diffuseTexture = new BABYLON.Texture(
    "assets/textures/terrain-atlas.ktx2", scene
);
```

**Compression strategy:**
- **KTX2 with Basis Universal** encoding: Transcodes at runtime to the GPU's native compressed format (ETC2 on most mobile GPUs, ASTC on newer devices, BC on desktop).
- **Compression ratio:** Typically 6-8x reduction in GPU memory compared to uncompressed RGBA.
- **All atlas textures** should be distributed in KTX2 format with an uncompressed fallback for devices that lack support.
- **Mipmap generation:** Include mipmaps in compressed textures for proper filtering at different zoom levels.

### Hex Hit Detection: scene.pick()

Touch interaction with hex tiles uses Babylon.js built-in picking:

```javascript
// On pointer/touch down event
scene.onPointerDown = (evt, pickResult) => {
    if (pickResult.hit) {
        const mesh = pickResult.pickedMesh;
        if (mesh.metadata && mesh.metadata.hexData) {
            const hex = mesh.metadata.hexData;
            handleHexTap(hex, evt);
        }
    }
};

// For ThinInstance-based hexes, use thin instance picking
scene.onPointerDown = (evt, pickResult) => {
    if (pickResult.hit && pickResult.thinInstanceIndex !== undefined) {
        const hexIndex = pickResult.thinInstanceIndex;
        const hex = battleMap.hexes[hexIndex];
        handleHexTap(hex, evt);
    }
};
```

**Picking optimization:**
- Use `scene.pick()` with a predicate to only test hex meshes, skipping sprites and UI elements.
- For performance, consider using a simpler invisible collision mesh (flat hexagonal prisms without terrain detail) for picking, overlaid on the detailed visual terrain.
- On mobile, picking should be responsive within 16ms (one frame) to feel instant.

```javascript
// Optimized picking with predicate
const pickResult = scene.pick(
    scene.pointerX, scene.pointerY,
    (mesh) => mesh.metadata && mesh.metadata.isHexTile, // Only pick hex tiles
    false, // fastCheck: false for accuracy
    null   // Use active camera
);
```

### HTML/CSS Overlay for Complex UI Screens

For UI screens that are text-heavy, require complex layouts, or benefit from standard web UI patterns (inventory management, perk trees, event screens, contract screens), consider using **HTML/CSS overlays** instead of Babylon.js GUI:

**Rationale:**
- Babylon.js GUI (`AdvancedDynamicTexture`) is excellent for in-game HUD elements (damage numbers, health bars, action bar) but becomes cumbersome for complex, scrollable, text-rich interfaces.
- HTML/CSS provides: native text rendering and font support, CSS flexbox/grid layouts, native scrolling with momentum, accessibility features (screen readers, text scaling), easier styling and iteration.
- The Babylon.js canvas renders the 3D/2D game world. HTML elements are layered above the canvas using CSS `position: absolute` and `z-index`.

**Implementation pattern:**

```html
<!-- Game canvas (bottom layer) -->
<canvas id="renderCanvas"></canvas>

<!-- UI overlay (top layer, pointer-events: none by default) -->
<div id="ui-overlay">
    <!-- Inventory screen (hidden by default) -->
    <div id="inventory-screen" class="ui-panel hidden">
        <!-- Complex HTML layout here -->
    </div>

    <!-- Event screen -->
    <div id="event-screen" class="ui-panel hidden">
        <!-- Event illustration, text, choices -->
    </div>
</div>
```

```css
#renderCanvas {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0; left: 0;
    z-index: 0;
}

#ui-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 10;
    pointer-events: none; /* Pass through to canvas by default */
}

.ui-panel {
    pointer-events: auto; /* Capture events when visible */
    position: absolute;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6); /* Semi-transparent backdrop */
}

.ui-panel.hidden {
    display: none;
}
```

**When to use Babylon.js GUI vs HTML/CSS:**

| Element                    | Recommended Renderer     | Reason                                    |
|----------------------------|--------------------------|-------------------------------------------|
| Floating damage numbers    | Babylon.js GUI           | Needs world-space anchoring               |
| Health bars above units    | Babylon.js GUI           | Linked to 3D positions                    |
| Action bar (battle)        | Babylon.js GUI           | Tight integration with game state         |
| Turn order portraits       | Babylon.js GUI or HTML   | Either works; HTML if complex interaction |
| Attack preview panel       | HTML/CSS                 | Text-heavy, complex layout                |
| Inventory screen           | HTML/CSS                 | Scrollable grid, drag-drop, text          |
| Perk tree                  | HTML/CSS                 | Complex scrollable layout                 |
| Event screen               | HTML/CSS                 | Image + text + buttons layout             |
| Contract screen            | HTML/CSS                 | Text-heavy, negotiation UI                |
| Settings menu              | HTML/CSS                 | Standard form controls                    |
| Combat log                 | HTML/CSS                 | Scrollable text log                       |

**Communication between HTML UI and Babylon.js:**

The game state manager (JavaScript) serves as the bridge. HTML UI elements dispatch events or call state manager methods, which in turn update the Babylon.js scene:

```javascript
// Example: Player selects a skill from the HTML UI
document.getElementById("skill-fireball").addEventListener("click", () => {
    gameState.selectSkill("fireball");
    // This updates the Babylon.js scene to show AoE targeting
    battleScene.enterTargetingMode("fireball");
    // And hides the HTML skill detail panel
    hidePanel("skill-detail");
});
```

### Performance Budget

Target performance on mid-range mobile devices (2022-2024 smartphones):

| Metric                     | Target                                           |
|----------------------------|--------------------------------------------------|
| Frame rate                 | 30 FPS minimum, 60 FPS target                    |
| Draw calls per frame       | Under 50 (battle), under 30 (overworld)          |
| Texture memory             | Under 128MB total loaded textures                |
| Mesh count (battle)        | Under 500 total meshes (using ThinInstances)     |
| Sprite count               | Under 40 animated sprites simultaneously         |
| Initial load time          | Under 5 seconds to first interactive frame        |
| Total asset download       | Under 50MB for core game, lazy-load rest         |
| JavaScript bundle          | Under 2MB gzipped                                |
| Audio in memory            | Under 20MB simultaneously                        |

**Performance optimization strategies:**

1. **Frustum culling:** Babylon.js performs this automatically. Ensure all meshes have correct bounding info.
2. **Level of detail:** At maximum zoom-out, switch to simplified sprite frames (smaller resolution, fewer animation frames).
3. **Object pooling:** Reuse sprite objects, particle systems, and GUI elements rather than creating and destroying them.
4. **Render loop throttling:** When the game is idle (waiting for player input, no animations playing), reduce the render loop to 15 FPS or pause rendering entirely, updating only on input events.
5. **Offscreen pause:** When the browser tab is not visible, pause all rendering and audio.
6. **Texture streaming:** Load only the textures needed for the current screen/battle. Unload textures for screens that are not active.
7. **Particle system limits:** Cap particle counts at 200 simultaneously. Reuse particle systems via object pool.
8. **Shader complexity:** Use `StandardMaterial` or `PBRMaterial` with minimal features for mobile. Avoid complex custom shaders. Disable HDR and bloom unless the device supports them without frame drops.

---

## Appendix A: Asset Production Pipeline

### Art Asset Workflow

1. **Concept sketches** in pencil/ink style (matching the game's aesthetic even at concept stage).
2. **Digital painting** in Photoshop/Procreate/Krita at 2x final resolution.
3. **Export** at final resolution with transparency where needed.
4. **Atlas packing** using TexturePacker or similar tool. Output: PNG atlas + JSON metadata.
5. **Compression** using `basisu` CLI tool to generate KTX2/Basis Universal versions.
6. **Integration** into the asset loading pipeline with fallback to uncompressed PNG.

### Naming Conventions

```
assets/
  sprites/
    characters/
      player-spritesheet-swordsman.png
      player-spritesheet-archer.png
      enemy-spritesheet-brigand.png
      enemy-spritesheet-skeleton.png
    portraits/
      face-base-01.png through face-base-30.png
      hair-style-01.png through hair-style-12.png
      beard-style-01.png through beard-style-10.png
      helmet-kettle.png, helmet-greathelm.png, ...
      armor-chainmail.png, armor-leather.png, ...
      scar-cheek-slash.png, scar-lost-eye.png, ...
  textures/
    terrain/
      terrain-atlas.png (and .ktx2)
    ui/
      ui-atlas.png
      parchment-bg.png
      parchment-bg-dark.png
  maps/
    overworld-base.png (parchment map base)
    overworld-terrain-overlay.png
  audio/
    music/
      overworld-day-01.mp3
      overworld-night-01.mp3
      combat-01.mp3
      combat-intense-01.mp3
    sfx/
      sword-hit-flesh.mp3
      sword-hit-armor.mp3
      ...
    ambient/
      wind-plains.mp3
      forest-birds.mp3
      ...
```

### Responsive Design Considerations

The game must handle a range of mobile screen sizes and aspect ratios:

- **Target aspect ratios:** 16:9 (standard), 18:9 (modern), 19.5:9 (tall), 20:9 (very tall).
- **Safe area:** All critical UI elements must be within the safe area (avoiding notches, rounded corners, and system gesture zones). Use CSS `env(safe-area-inset-top)` etc. for HTML overlay elements.
- **Scaling strategy:** The Babylon.js viewport fills the full screen. UI elements scale based on screen density (dp units, not pixels). The hex grid and game world scale uniformly---more of the world is visible on larger screens, not larger hexes.
- **Minimum supported resolution:** 720x1280 (720p portrait).
- **Maximum tested resolution:** 1440x3200 (QHD+ portrait).
- **Orientation lock:** The game locks to portrait mode. If the device is rotated to landscape, a "Please rotate your device" message is displayed, or the game adapts by letterboxing.

---

## Appendix B: Accessibility Considerations

- **Color-blind modes:** Provide alternative color schemes for movement/attack hex overlays that do not rely solely on red-green distinction (use blue-orange, or add pattern overlays like stripes/dots to differentiate).
- **Text scaling:** All text respects the device's system font size settings within reasonable bounds (1x to 1.5x).
- **Haptic alternatives:** All haptic feedback has a corresponding visual and/or audio cue, so players with haptics disabled lose no information.
- **Reduced motion:** A setting to disable screen shake, reduce animation intensity, and disable parallax effects for players with motion sensitivity.
- **High contrast mode:** A toggle that increases contrast on UI elements, thickens borders, and uses bolder text for players with low vision.
- **Touch target sizing:** Already addressed in the Touch Controls section---all targets meet 44-48dp minimum.
