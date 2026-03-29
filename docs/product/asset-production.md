# Asset Production Contract

This file owns the future-facing asset-production contract for authored content. It exists to prevent asset generation from starting as isolated prompts with missing world, theme, composition, or alignment context.

Use the world foundation for lore, tone, naming, and thematic rules. Use the product plan for gameplay-facing structure. Use this file for the workflow that turns those inputs into repeatable asset and content production.

When an approved asset family uses raster image generation, also read `image-generation-prompting-guide.md` for prompt structure, consistency rules, and repo-specific style defaults.

## Core Rule

- Asset work does not start from "make the SVG" or "make the room."
- Asset work starts from canon, then a brief, then a recipe preview, then modular production, then review, then promotion.
- If any of those stages are skipped, the work is exploratory only and must not be treated as approved production output.

## Shared Workflow Stages

Every asset family follows the same six-stage pipeline:

1. Canon grounding
2. Asset brief
3. Recipe preview
4. Module breakdown
5. Asset production
6. Assembly, review, and promotion

## Stage 1: Canon Grounding

Before asset authoring begins, the owner must confirm the canon inputs:

- world identity from [World Foundation Reference](../world-foundation.md)
- gameplay role from [Gameplay Systems](./gameplay-systems.md)
- naming, IDs, and tags from [Content Taxonomy](./content-taxonomy.md)
- visual target from [Presentation Direction](./presentation.md)
- rollout scope from [Roadmap](../roadmap.md)

If the lore, tier, theme, or intended role is still vague, stop here and define it before art production starts.

## Stage 2: Asset Brief

Every production asset needs an explicit brief packet. The brief is the minimum input required before recipe work starts.

Required brief fields:

- asset family
- canonical ID or ID reservation
- gameplay role
- world/lore anchor
- tier or rank
- location or site context
- mood and tone
- materials, palette, and finish direction
- required readable affordances
- forbidden directions
- expected neighboring assets or composition context

If a creator cannot answer those fields clearly, the brief is not ready.

## Stage 3: Recipe Preview

Before modular asset generation begins, create a preview or recipe artifact that shows the full intended composition.

- The recipe preview is mandatory for HQ buildings, surroundings, room families, room recipes, raid sites, and any environment asset that will later be decomposed into parts.
- The preview is allowed to be rough.
- The preview is not the final shippable asset.
- The preview exists to lock composition, angle, footprint, adjacency, and silhouette before the team spends time generating or polishing pieces.

The recipe preview must answer:

- what the whole thing looks like
- what the camera sees
- which planes are visible
- how the asset fits into its neighbors
- where the major openings, anchors, and circulation paths are
- which parts must become reusable modules later

## Stage 4: Module Breakdown

After the recipe preview is accepted, break it into the actual production parts.

Common module classes:

- shell/perimeter
- structural kit (engine-rendered walls, floors, corners, thresholds)
- room scene SVGs (pre-composed props-only layer per room — the approved production target for room interiors)
- background/surroundings
- markers/icons
- audio layers

For HQ rooms, the module breakdown does not split furniture into individual prop sprites. Instead, the approved output is one pre-composed scene SVG per room that contains all furniture, fixtures, and decorations as a hand-arranged composition. Individual prop SVGs remain for non-room uses.

This breakdown is where parallel work begins. The recipe owner defines the boundaries so other workers can build parts without drifting from the composition target.

## Stage 5: Asset Production

Only after the recipe preview and module breakdown are locked should individual assets be built.

- Production assets must match the approved recipe preview.
- Individual pieces must not silently redefine angle, palette, footprint, scale, or mood.
- If the asset build reveals a recipe flaw, update the recipe first or in the same pass rather than letting individual modules fork the direction.

## Stage 6: Assembly, Review, And Promotion

- Reassemble the produced parts in the viewer or playground.
- Confirm composition, readability, and alignment in-context.
- Require human review before promotion into canonical asset locations.
- Remove stale explorations and invalidated directions instead of preserving them as implicit alternatives.

## Global Invariants

These rules apply across asset families.

- World and lore come first. Assets are manifestations of the world model, not replacements for it.
- Recipe previews come before modular production for any environment or composite asset.
- Approved production work must be compositional, not accidental.
- Tier changes must preserve the composition model while changing theme, finish, density, and scale.
- New assets must describe how they fit into the current slice, not only what they look like in isolation.

## HQ Isometric Contract

The HQ pipeline has stricter rules because the room system only works if every asset shares the same spatial language.

- The HQ uses one canonical angled/isometric presentation language.
- All floor edges, wall edges, openings, props, and facing directions must align to the same tile axes.
- Door, threshold, window, and wall anchors must be defined against the shared room footprint, not eyeballed per SVG.
- Recipe previews for HQ rooms must show the full room box, not only floating props.
- Room interior props are authored as pre-composed scene SVGs — a single SVG per room containing all furniture, fixtures, and decorations hand-arranged for composition quality.
- Scene SVGs must contain props only. Walls, floors, tile grids, and structural elements are engine-rendered and must never be duplicated inside scene SVGs.
- Scene SVGs use a canonical coordinate system aligned to the shared isometric grid (origin, viewBox, and tile dimensions defined in the render engine) so the engine can place them correctly within the building.
- Full monolithic room SVGs that include their own walls and floors remain valid as exploration/reference artifacts but are not approved production output.
- Individual prop SVGs still exist as a fallback for rooms that have not been upgraded to scene-based composition, and for non-room uses (exterior/background props).

If an HQ asset does not align to the shared tile and facing rules, it is not production-ready even if it looks good in isolation.

## Environment Metadata Surfaces

The production contract is backed by two runtime-facing environment indexes that track approved and exploratory parts:

- `content/data/hq-environment-index.json` — modular tile-based HQ composition. Tracks shell, structure, prop, scene, background, and actor-marker parts against the canonical 96x48 isometric grid. The file also owns the shipped asset roots (`parts`, `reference`, `recipes`) plus the canonical room-scene placement numbers (tile size, wall height, scene origin, viewBox, room footprint). Each entry carries `category`, `tags`, `scale`, `roomFamily`, and `status` (approved or exploration).
- `content/data/raid-environment-index.json` — dungeon minimap composition. Tracks tile, feature, fog-treatment, marker, and enemy parts for the top-down raid map language. Each entry carries `category`, `tags`, `scale`, `concept`, and `status`.

For the current bodega slice, the HQ index also owns the live backdrop metadata contract: profile id, optional elevation-band id, four canonical time-of-day phase profiles, and shell-relative zone lists. Zone population is still partial in the shipped bodega, so renderer-authored fallback scenery remains acceptable until approved backdrop packages fully replace it.

New environment parts must be registered in the relevant index before promotion. Parts with `status: "exploration"` are not yet approved for canonical use and must pass through the full review pipeline before promotion to `status: "approved"`.

For the current shipped HQ slice, `content/data/hq-environment-index.json` is the runtime source of truth for the bodega room/building asset pipeline. Docs define workflow and constraints; they should not restate runtime paths or placement numbers in a second location. Runtime code should consume the index rather than duplicating those values in renderer constants.

## Exact Workflows By Asset Family

### 1. Lore And Theme Workflow

This is the gate before any other asset work.

1. Start from the world foundation and identify the exact narrative role.
2. State the location, tone, business reality, and tier.
3. Define what makes this asset family feel like Ascension instead of generic fantasy or generic cyberpunk.
4. Lock the intended "what it should feel like at this point in progression" answer.
5. Only then write the asset brief.

This stage is especially important for buildings, room families, dungeon concepts, and prestige-tier content.

### 2. HQ Building And Theme Workflow

Use this for a headquarters tier such as the starting bodega or a later high-rise.

1. Define the building fantasy in progression terms.
2. Define the real-world site context and the surrounding city read.
3. Define the building theme/style spec: materials, wear level, palette, signage tone, and socioeconomic read.
4. Produce a whole-building recipe preview that shows shell, cutaway, and the relationship between the building and the street context.
5. Break the result into shell/perimeter, structural kit, room anchors, and surroundings/background.
6. Produce the modular pieces.
7. Reassemble and review the final building composition in-context.

The bodega and the future high-rise must differ in theme and surrounding read, but they must still follow the same overall workflow.

### 3. HQ Surroundings And Background Workflow

The surroundings are not filler. They establish scale, neighborhood identity, and the player's sense of being embedded in a city block.

1. Define the site context in writing first: adjacent massing, skyline visibility, enclosure, signage language, traffic or airspace clutter, and how exposed or hemmed-in the headquarters feels at the intended elevation.
2. Produce a background recipe preview that shows the intended framing around the building shell.
3. Lock the shell-relative composition zones: what lives in front of the shell, to either side, behind it, above it, and below it.
4. If the building can support multiple floors, lock reusable elevation bands before production starts. Do not jump straight to bespoke art for exact floor numbers unless the outside read genuinely changes.
5. Break the scene into reusable backdrop layers.
6. Build and review those layers in the actual HQ framing.

Do not generate surroundings as generic city filler after the HQ is already built. The surroundings are part of the site recipe.

### 4. Room Family Workflow

Use this when defining a room family such as recovery, staffing, training, social, or operations.

1. Start from gameplay role and world identity.
2. Define what this room says about the guild at the current tier.
3. Define the room's required readable affordances: beds, desks, public-facing surfaces, storage, training space, and so on.
4. Produce a room-family recipe preview showing the room box, furniture density, circulation, and tone.
5. Lock what is structural versus what is recipe-driven versus what is prop-driven.
6. Then build the needed pieces.

The room family is the concept. The room recipe is the concrete layout instance.

### 5. Room Recipe Workflow

Use this for the actual layout that a specific room definition instantiates.

1. Start from an approved room family brief and HQ footprint.
2. Produce a recipe preview (reference fixture) showing walls, openings, floor treatment, furniture anchors, circulation, and focal surfaces.
3. Confirm every object orientation follows the canonical tile axes and isometric 2:1 projection.
4. Author a props-only scene SVG from the approved recipe preview: extract all furniture, fixtures, and decorations into a single SVG that contains no walls, floors, or structural elements.
5. Wire the scene SVG into the room recipe via `SceneAssetSpec` so the engine places it over engine-rendered structure.
6. Test the room next to neighboring rooms before approval.

The reference fixture (full room with walls and floor) remains as an exploration/preview artifact. The props-only scene SVG is the approved production output.

If the room only works as a standalone illustration and breaks when snapped beside another room, the recipe is not valid.

### 6. Structural Kit Workflow

Use this for floors, walls, corners, thresholds, doors, and windows.

1. Start from the approved building and room recipe previews.
2. Define the minimal reusable part set that can reproduce the approved recipes.
3. Lock shared anchors, edge directions, and footprint rules.
4. Produce structural modules.
5. Validate them by rebuilding the approved recipes from modules rather than from bespoke one-off art.

Structural kits exist to preserve composition discipline, not to maximize abstract reuse for its own sake.

### 7. Prop And Fixture Workflow

Use this for furniture, lighting, signage, clutter, plants, cabinets, desks, beds, and decorative fixtures.

1. Start from approved room recipes and reference fixtures.
2. Define each prop by role, not only silhouette.
3. Confirm orientation rules against the tile axes — all props must be isometric, including wall-adjacent items. Flat camera-facing rectangles are never valid.
4. Author props directly inside the room's pre-composed scene SVG rather than as isolated individual sprites. Hand-arrange placement, layering, and overlap for composition quality.
5. Validate the scene SVG in the actual game engine over engine-rendered walls and floors, not only in isolation.

Props should finish the room recipe. They should not be responsible for inventing the room identity after the fact. Individual prop SVGs are still produced for non-room uses (exterior/background elements) and as a fallback for rooms without scene SVGs.

### 8. Operator Visual Workflow

Use this for portraits, body-language silhouettes, and any future operator-facing asset families.

1. Start from the world foundation and operator identity rules.
2. Define role, personality, rank, focus, and social read before drawing parts.
3. Produce a character recipe specifying silhouette, posture, face/hair direction, clothing language, and notable details.
4. Build from modular parts where appropriate.
5. Validate the portrait language and the in-world body-language read together.

Operator assets are identity-first. They should not drift into raid-gear HQ presentation or generic rarity-coded anime shorthand.

### 9. Gear, Loot, And Item Workflow

Use this for weapons, outfit overlays, accessories, loot icons, and inventory-facing item families.

1. Start from gameplay role, rank, and item family.
2. Define the base item brief: silhouette, grip or wear orientation, material family, rank read, and intended operator or loot context.
3. Produce a base recipe preview or base SVG that locks the family proportions and anchor points.
4. Approve the base item before creating variants.
5. Derive variants by iterating on the approved base recipe or base SVG rather than restarting from scratch.
6. Keep inventory-view, equip-overlay, and in-portrait anchors aligned across the family.
7. Review the result both in isolation and in the actual inventory, portrait, or overlay context where it will appear.

Weapon-variation rule:

- Variations on an existing weapon should visibly read as the same weapon family becoming cleaner, rarer, more specialized, or more intimidating.
- A weapon variant should inherit its approved base silhouette, orientation, and key structural cues before detail polish is added.
- If a variant no longer reads as part of the same family, it is a new base item and needs its own brief and base recipe.

Loot-item rule:

- Stackable loot needs icon clarity at small sizes and must still read cleanly when paired with quantity text.
- Early monster-part loot should be themed by dungeon concept and rank, but it should stay readable as trade goods rather than bespoke hero props.
- New loot items must be authored as part of the enemy-family content packet: site concept + boss + enemy family + themed loot items + per-family and per-boss drop tables.
- The minimum deliverable for a new dungeon enemy family is 2 themed monster parts (one common, one uncommon) with sell prices in the F-rank envelope (6-12 cash).

#### Base Weapon SVG Recipe

A base weapon SVG defines the canonical silhouette for an entire weapon family. All rank variants within that family inherit from it.

Required properties for a base weapon recipe:

- family ID following the taxonomy pattern `weapon/{name}` (see content taxonomy)
- grip or mount orientation locked to one of: right-hand, left-hand, two-hand, back-slung, hip-mounted
- proportions defined relative to the operator portrait viewBox (currently 0 0 120 160)
- anchor point for portrait-overlay placement (x, y offset within the portrait viewBox)
- anchor point for inventory-icon framing (center of the weapon's readable silhouette)
- material family and color palette baseline at the lowest rank (rank F)
- silhouette complexity budget: the base recipe should read cleanly at 32x32 inventory icon size

The base SVG is the single source of truth for the family. Do not start variant work until the base recipe passes review in both the portrait overlay context and the inventory icon context.

#### Rank-Variant Derivation

Rank variants (F through S) iterate on the approved base weapon SVG. They do not restart from scratch.

Progression rules for rank variants:

- **F rank** — raw, improvised, or scavenged. Minimal detail. Visible wear or crude construction. The silhouette carries the weapon identity alone.
- **E rank** — functional and maintained. Cleaner edges, basic material upgrade (e.g., rough steel to forged steel). Same silhouette.
- **D rank** — professional grade. Refined proportions, one accent detail (wrapped grip, etched blade, reinforced guard). Palette shift toward richer tones.
- **C rank and above** — specialist or prestige. Visible craftsmanship additions (inlays, glow accents, distinctive finish). The silhouette may gain minor embellishments but must still read as the same weapon family at a glance.

Each variant must be validated against the base silhouette before approval. If the variant no longer reads as the same family at inventory-icon size, it has drifted too far.

#### Loot Icon Production

Loot icons appear in inventory grids, reward summaries, and trade interfaces. They must prioritize readability at small sizes over detail fidelity.

Loot icon rules:

- target rendered size: 32x32 to 48x48 pixels
- silhouette must be identifiable without relying on color alone
- quantity text overlay area must remain unobstructed (bottom-right corner reserved)
- dungeon-themed loot should carry one visual cue from its source concept (e.g., school-themed loot reads as school supplies or equipment, not generic fantasy gems)
- stackable loot icons should use a consistent framing template across the family so mixed inventory grids look coherent
- review loot icons at actual inventory grid scale, not in isolation at full SVG resolution

#### Accessory And Overlay Portrait Integration

Accessories and outfit overlays render as SVG layers composited onto the operator portrait. They must align with the modular portrait system defined in `content/data/operator-parts-index.json`.

Integration rules:

- every accessory and overlay part must declare `bodyCompatibility` (broad, medium, lean) and `poseCompatibility` (currently: standing) in the parts index
- anchor placement must respect the portrait viewBox (0 0 120 160) and the body-type proportions of compatible silhouettes
- accessories that attach to the head region (visors, earpieces, scarves) must not occlude eyes or key face-detail features unless that occlusion is the design intent
- outfit overlays must layer cleanly over the body-silhouette part without clipping or z-order conflicts
- test every accessory and overlay against all declared compatible body types before approval, not only against the body type used during authoring
- rarity tiers (common, uncommon, rare) should be visually distinguishable through detail density and accent treatment, not through palette-breaking color shifts

### 10. Building, Room, Upgrade, Operator, And Event Content Workflow

Not all asset creation is visual. Content definitions also need a locked workflow.

1. Start from lore and gameplay role.
2. Reserve the ID and tags using the canonical taxonomy.
3. For raid-site content, reserve the paired site-and-boss packet together: a `site/*` id plus the attached `boss/*` id it will ship with.
4. Define the gameplay purpose and progression slot.
5. State whether the work is data-only or requires new engine support.
6. If it needs visuals or audio, attach the relevant asset brief and recipe dependency.
7. Add the template or data entry only after the concept is clear.
8. Validate through content tests and runtime review.

This is the workflow for new operators, new upgrades, new buildings, new rooms, and new events.

### 11. Raid Site And Dungeon Workflow

1. Start from the dungeon concept as defined by the world rules.
2. Define the real-world location that has gone wrong.
3. Attach the specific boss that anchors the site before production starts. A raid site without a concrete boss is incomplete and must not advance.
4. Produce a site brief covering map read, theme corruption, hazards, points of interest, and that attached boss identity.
5. Produce a top-down recipe preview for the base map, not an HQ-style isometric room scene.
6. Break the work into map tiles, fog treatments, markers, icons, and encounter indicators.
7. Review the site and attached boss as one content packet before promotion, even if their assets land in different files.
8. Review for exploration readability first.

The dungeon concept is the creative seed. The map assets exist to express that seed clearly.

### 12. UI Marker And Icon Workflow

1. Start from the interaction role.
2. Define what must be readable at a glance in the world-first UI.
3. Produce a small icon or marker family preview.
4. Validate against actual HQ or raid backgrounds, not on blank canvases.

These assets are subordinate to world readability, not independent branding exercises.

### 13. Audio Workflow

1. Start from the same lore and theme brief as the related visual asset.
2. Define the emotional function: ambience, tension, confirmation, warning, loss, recovery, or comic release.
3. Produce a layered audio sketch before polishing final cues.
4. Validate in the audio playground.
5. Promote only after human review in context.

Audio must support the same location, tier, and tone logic as the visual assets it accompanies.

## Parallel Production Model

Once the brief and recipe preview are approved, work can split safely across:

- content/template authoring
- gear and loot family production
- shell and surroundings
- structural kit production
- room recipe implementation
- prop/fixture families
- operator identity assets
- raid map kit assets
- audio layers
- review and promotion

The shared dependency is the approved brief plus recipe preview. Parallel workers should not invent those contracts independently.

## Approval Standard

An asset is ready for canonical promotion only when all of the following are true:

- it matches canon
- it matches the approved brief
- it matches the approved recipe preview
- it aligns with the required composition model
- it has been reviewed in the relevant viewer or playground
- it has passed human review

If any of those are missing, the work is still exploration.

## Quick-Reference Checklist

Minimum required inputs before production can start, by asset family.

| Asset Family       | Canon Gate                             | Brief Fields                                                   | Recipe Preview                                               | Module Split                                         | Composition Metadata          |
| ------------------ | -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------- |
| HQ Building        | world foundation, tier, site context   | building fantasy, materials, palette, wear level, signage tone | whole-building cutaway with shell, rooms, and street context | shell, structural kit, room anchors, surroundings    | `hq-environment-index.json`   |
| HQ Surroundings    | site context, neighborhood identity    | street corner, adjacent buildings, skyline, enclosure read     | background framing around building shell with scale cues     | backdrop layers                                      | `hq-environment-index.json`   |
| Room Family        | gameplay role, world identity, tier    | room function, readable affordances, furniture density         | room box with circulation and tone                           | structural vs recipe vs prop split                   | `hq-environment-index.json`   |
| Room Recipe        | approved room family, HQ footprint     | walls, openings, floor treatment, furniture anchors            | reference fixture with adjacency test                        | structural choices, props-only scene SVG             | `hq-environment-index.json`   |
| Structural Kit     | approved building + room recipes       | minimal reusable part set, shared anchors, edge rules          | (derived from building/room recipes)                         | floor, wall, corner, threshold, door, window modules | `hq-environment-index.json`   |
| Props/Fixtures     | approved room recipes                  | role, orientation, room language fit                           | (authored inside room scene SVGs)                            | scene SVG per room; individual SVGs for non-room use | `hq-environment-index.json`   |
| Operator Visual    | world foundation, operator identity    | role, personality, rank, focus, social read                    | character recipe (silhouette, posture, clothing)             | modular parts (head, hair, eyes, face, body, gear)   | `operator-parts-index.json`   |
| Weapon Family      | gameplay role, rank, item family       | silhouette, grip orientation, material family, rank read       | base SVG with portrait + inventory anchor points             | base recipe, then rank variants (F through S)        | `operator-parts-index.json`   |
| Outfit Overlay     | gameplay role, rank, archetype         | body coverage, layering order, body compatibility              | overlay SVG on all compatible body types                     | per-body-type validation                             | `operator-parts-index.json`   |
| Accessory          | gameplay role, rank, attachment zone   | anchor region (head/neck/ear), occlusion rules                 | accessory SVG on all compatible body types                   | per-body-type validation                             | `operator-parts-index.json`   |
| Loot Icon          | dungeon concept, rank, item type       | silhouette at 32-48px, source-concept visual cue               | icon family preview at inventory grid scale                  | stackable framing template per family                | (content templates)           |
| Raid Site          | dungeon concept, world rules           | map read, theme corruption, hazards, attached boss identity    | top-down base map preview                                    | tiles, fog, markers, icons, encounter indicators     | `raid-environment-index.json` |
| UI Markers/Icons   | interaction role, world UI context     | glance readability, background contrast                        | marker family preview on actual backgrounds                  | (single-pass, no module split)                       | relevant environment index    |
| Audio              | lore/theme brief, related visual asset | emotional function, location, tier, tone                       | layered audio sketch                                         | ambient, event, UI layers                            | (none)                        |
| Content Definition | lore, gameplay role, progression slot  | ID reservation, tags, data-only vs engine support              | (none for data-only; attach visual brief if needed)          | template entry + content tests                       | (content templates)           |
