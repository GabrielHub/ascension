# Skyscraper HQ Asset Foundation

Action checklist for turning the shipped skyscraper gameplay stack into a real HQ asset package.

This plan is ready to execute when the next goal is HQ visual and asset foundation. It does not implement the remaining gameplay consequence slices for Nightlife recruitment, Specialist Training role training, or Penthouse A-rank recruitment.

## Locked Scope

- [ ] Do not add a fourth headquarters.
- [ ] Do not add a Market Intelligence floor or room.
- [ ] Do not change gameplay authority. ECS, templates, and systems remain authoritative for gameplay state and consequences.
- [ ] Do not put walls, floors, tile grids, labels, room outlines, or structural elements inside production room-scene SVGs.
- [ ] Do not register placeholder assets. Add entries to `content/data/hq-environment-index.json` only after real SVG files exist.
- [ ] Do not mark full-room reference fixtures as runtime room scenes. Reference fixtures stay under `reference/`; production room scenes go under `recipes/`.
- [ ] Keep the current skyscraper layout footprint: every shipped skyscraper floor uses the runtime `12x8` shell from `content/building-layouts.ts`.
- [ ] Keep the current canonical room-scene frame: origin `[200, 100]`, viewBox `20 0 420 310`, footprint `4x3`.
- [ ] Use the current asset-facing elevation bands: `ground-floor`, `mid-tower`, and `rooftop`.
- [ ] Keep Penthouse on `mid-tower` for this plan. A separate `upper-tower` or `penthouse` band is out of scope.

## Current Code Reality

- [x] `building/skyscraper` is a shipped building template with five baseline floors.
- [x] Relocation from Porter's to the skyscraper is implemented and tested.
- [x] The four-step tower expansion arc is implemented: Nightlife, Specialist Training, Executive, Penthouse.
- [x] The full canonical nine-floor stack is represented in `content/building-layouts.ts`.
- [x] All 21 skyscraper room templates exist in `content/templates/rooms.ts`.
- [x] Expansion-floor upgrades unlock their starter rooms and seed room instances.
- [x] C-rank contracts, C-rank craft recipes, and Fabrication Bay crafting are wired.
- [x] Public pressure is save/runtime-owned.
- [x] Compliance Office unlocks the public-pressure management surface and cooling.
- [x] Executive Office contributes to competitive/public-pressure support.
- [x] War Room unlocks named rival pressure and mitigates rival moves.
- [ ] `public/data/svg-environments/hq/skyscraper/` does not exist.
- [ ] `content/data/hq-environment-index.json` still points `building/skyscraper` asset roots at bodega directories.
- [ ] `building/skyscraper` has zero registered HQ parts, scenes, shell assets, or backdrop assets.
- [ ] Scene Builder exposes only `building/bodega` and `building/porters`.
- [ ] SVG Playground exposes only `building/bodega` and `building/porters`.
- [ ] `render/hq-scene-data.ts` has exterior scene data only for bodega and Porter's.
- [ ] `lib/svg-asset-contract.ts` has no skyscraper room-scene bindings.
- [ ] `render/hq-world.ts` still uses generic low-rise corridor, wall, perimeter, and fallback room palettes for rooms without skyscraper-specific scene art.

## Room Inventory

Baseline rooms:

- [ ] Lobby - `room/lobby:tier_1`, `slot/lobby`, floor `0`, `ground-floor`.
- [ ] Front Desk - `room/reception:tier_1`, `slot/reception`, floor `0`, `ground-floor`.
- [ ] Bullpen - `room/bullpen:tier_1`, `slot/bullpen`, floor `1`, `mid-tower`.
- [ ] Situation Room - `room/situation_room:tier_1`, `slot/situation-room`, floor `1`, `mid-tower`.
- [ ] Clinic - `room/clinic:tier_1`, `slot/clinic`, floor `2`, `mid-tower`.
- [ ] Dojo - `room/dojo:tier_1`, `slot/dojo`, floor `2`, `mid-tower`.
- [ ] Crew Lounge - `room/crew_lounge:tier_1`, `slot/lounge`, floor `2`, `mid-tower`.
- [ ] Supply Hall - `room/supply_hall:tier_1`, `slot/supply-hall`, floor `3`, `mid-tower`.
- [ ] Fabrication Bay - `room/fabrication_bay:tier_1`, `slot/fabrication-bay`, floor `3`, `mid-tower`.
- [ ] Helipad - `room/rooftop_helipad:tier_1`, `slot/helipad`, floor `4`, `rooftop`.
- [ ] Sky Garden - `room/sky_garden:tier_1`, `slot/sky-garden`, floor `4`, `rooftop`.

Expansion rooms:

- [ ] Club - `room/club:tier_1`, `slot/club`, floor `5`, `mid-tower`.
- [ ] Green Room - `room/green_room:tier_1`, `slot/green-room`, floor `5`, `mid-tower`.
- [ ] Drill Floor - `room/drill_floor:tier_1`, `slot/drill-floor`, floor `6`, `mid-tower`.
- [ ] Recon Course - `room/recon_course:tier_1`, `slot/recon-course`, floor `6`, `mid-tower`.
- [ ] Trauma Bay - `room/trauma_bay:tier_1`, `slot/trauma-bay`, floor `6`, `mid-tower`.
- [ ] Executive Office - `room/executive_office:tier_1`, `slot/executive-office`, floor `7`, `mid-tower`.
- [ ] Compliance Office - `room/compliance_office:tier_1`, `slot/compliance-office`, floor `7`, `mid-tower`.
- [ ] War Room - `room/war_room:tier_1`, `slot/war-room`, floor `7`, `mid-tower`.
- [ ] Sky Lounge - `room/sky_lounge:tier_1`, `slot/sky-lounge`, floor `8`, `mid-tower`.
- [ ] Private Cellar - `room/private_cellar:tier_1`, `slot/private-cellar`, floor `8`, `mid-tower`.

Priority rooms for pilot approval:

- [ ] Lobby, because it proves the ground-floor entry read.
- [ ] Fabrication Bay, because it owns the C-rank crafting surface.
- [ ] Executive Office, because it owns sponsor/institutional prestige read.
- [ ] Compliance Office, because it owns the public-pressure surface.
- [ ] War Room, because it owns current-rival pressure and counter-briefing.
- [ ] Sky Lounge, because it proves the upper-prestige recruitment read while still using the current `mid-tower` band.

## Phase 1 - Package Roots And Index Contract

- [ ] Create `public/data/svg-environments/hq/skyscraper/parts/`.
- [ ] Create `public/data/svg-environments/hq/skyscraper/parts/background/`.
- [ ] Create `public/data/svg-environments/hq/skyscraper/parts/shell/`.
- [ ] Create `public/data/svg-environments/hq/skyscraper/recipes/`.
- [ ] Create `public/data/svg-environments/hq/skyscraper/reference/`.
- [ ] Update `content/data/hq-environment-index.json` so `building/skyscraper.paths.partsRoot` is `/data/svg-environments/hq/skyscraper/parts`.
- [ ] Update `content/data/hq-environment-index.json` so `building/skyscraper.paths.referenceRoot` is `/data/svg-environments/hq/skyscraper/reference`.
- [ ] Update `content/data/hq-environment-index.json` so `building/skyscraper.paths.recipesRoot` is `/data/svg-environments/hq/skyscraper/recipes`.
- [ ] Keep `building/skyscraper.parts` empty until real SVG files exist.
- [ ] Keep the existing skyscraper `composition.sceneSystem` values.
- [ ] Add tests proving `getLoadedEnvPartsIndex("building/skyscraper")` returns `skyscraper-midtown-isometric` and the skyscraper roots.
- [ ] Add tests proving `getHqEnvironmentRenderConfigForBuilding("building/skyscraper")` does not resolve bodega asset roots.
- [ ] Run `vp check`.

Exit criteria:

- [ ] Skyscraper package roots resolve to skyscraper directories.
- [ ] Empty skyscraper asset coverage is explicit and testable.

## Phase 2 - Runtime Presentation Contract

Room scenes are props-only, so the runtime structure must read as skyscraper-native before any room scene is approved.

- [ ] Add a skyscraper structural palette in `render/hq-world.ts` for engine-rendered floors, corridors, shell walls, empty slots, and inactive rooms.
- [ ] Apply the skyscraper structural palette when `buildingId === "building/skyscraper"`.
- [ ] Keep bodega and Porter's palettes unchanged.
- [ ] Update skyscraper perimeter rendering so tower-core and rooftop views do not imply sidewalks, street clutter, alley, dock, pier, water, or harbor context.
- [ ] Keep ground-entry perimeter treatment minimal and subordinate to the tower read.
- [ ] Add tests proving skyscraper floor tiles, wall segments, and perimeter tiles use the skyscraper-specific contract.
- [ ] Add tests proving bodega and Porter's perimeter behavior is unchanged.
- [ ] Run `vp check`.
- [ ] Run `vp test` because this changes rendering behavior.

Exit criteria:

- [ ] Skyscraper HQ snapshots render over skyscraper-native structure.
- [ ] Low-rise street or waterfront context is not the default skyscraper read.

## Phase 3 - Tooling Enablement

- [ ] Add `{ id: "building/skyscraper", label: "Skyscraper" }` to the Scene Builder building selector.
- [ ] Add `{ id: "building/skyscraper", label: "Skyscraper" }` to the SVG Playground HQ Environment building selector.
- [ ] Add `SKYSCRAPER_EXTERIOR_PLACEMENTS` as an empty placement array in `render/hq-scene-data.ts`.
- [ ] Add `SKYSCRAPER_EXTERIOR_SCENE` in `render/hq-scene-data.ts`.
- [ ] Register `"building/skyscraper": SKYSCRAPER_EXTERIOR_SCENE` in `EXTERIOR_SCENES`.
- [ ] Update `render/hq-scene-data.test.ts` to include `building/skyscraper` in exterior-scene resolution coverage.
- [ ] Add Scene Builder coverage proving skyscraper stages and floors are selectable.
- [ ] Add SVG Playground or environment-parts coverage proving the skyscraper index loads even before parts exist.
- [ ] Run `vp check`.
- [ ] Run `vp test` because this changes UI/tooling behavior.

Exit criteria:

- [ ] Scene Builder can switch through the baseline, Nightlife, Specialist Training, Executive, and Penthouse skyscraper stages.
- [ ] Scene Builder can select every currently unlocked skyscraper floor for the selected stage.
- [ ] SVG Playground can display the skyscraper HQ Environment package without falling back to bodega roots.

## Phase 4 - Shell And Backdrop Foundation

Use `docs/world/headquarters-and-rooms.md`, `docs/product/asset-production.md`, and `docs/product/presentation.md` as the production brief sources.

- [ ] Produce a whole-building reference fixture for the skyscraper shell and skyline context.
- [ ] The reference fixture must read as a high-altitude midtown tower: mirrored glass, neighboring towers, haze, clouds, rooftop machinery, air-traffic cues, and city glow below.
- [ ] The reference fixture must not use ordinary sidewalk clutter, dock props, harbor dressing, or street-level filler as the primary skyscraper identity.
- [ ] Extract the approved shell/perimeter SVG from the reference fixture into `public/data/svg-environments/hq/skyscraper/parts/shell/`.
- [ ] Produce at least one approved background SVG for the `ground-floor` band.
- [ ] Produce at least one approved background SVG for the `mid-tower` band.
- [ ] Produce at least one approved background SVG for the `rooftop` band.
- [ ] Register approved shell/background SVGs under `building/skyscraper.parts` in `content/data/hq-environment-index.json`.
- [ ] Populate `building/skyscraper.backdrop.phases.*.zones` with shell-relative asset ids that exist in `building/skyscraper.parts`.
- [ ] Run `pnpm catalog:svg` after adding SVG files.
- [ ] Run `pnpm svg:validate` for approved SVG files.
- [ ] Add asset-contract coverage proving registered skyscraper shell/background assets resolve to real files.
- [ ] Review the shell/backdrop in Scene Builder.
- [ ] Review the shell/backdrop in the in-game HQ composition.
- [ ] Run `vp check`.
- [ ] Run `vp test` because this changes asset registration and rendering.

Exit criteria:

- [ ] The skyscraper reads as a high-altitude midtown tower before room scenes are approved.
- [ ] Backdrop composition is shell-relative and uses existing runtime backdrop zones.
- [ ] Every registered shell/background asset exists in `content/data/svg-asset-catalog.json`.

## Phase 5 - Room Scene Binding Matrix

This phase prepares runtime bindings without registering non-existent room scenes.

- [ ] Build the 21-room binding matrix from the Room Inventory section and `content/building-layouts.ts`.
- [ ] For each room, record `buildingId`, `templateId`, expected `roomStateId`, `slotId`, `floorIndex`, slot `cols`, slot `rows`, and elevation band.
- [ ] Use the room-state ids already emitted by runtime room-instance creation for skyscraper rooms.
- [ ] Use `room-state/<room-slug>:1` only where that is the current runtime room-state id.
- [ ] For canonical or near-canonical slots, use the shared scene frame.
- [ ] For non-canonical slot sizes, define explicit `sceneFootprint`, `sceneViewBox`, and `sceneOrigin` in the binding when the scene SVG is added.
- [ ] Do not add `HQ_ROOM_SCENE_BINDINGS` entries for skyscraper scenes until the corresponding SVG file exists.
- [ ] Add tests or table coverage proving the pilot rooms map to the correct slot and floor:
  - Lobby.
  - Fabrication Bay.
  - Executive Office.
  - Compliance Office.
  - War Room.
  - Sky Lounge.
  - Helipad or Sky Garden.
- [ ] Add centering coverage for one non-canonical skyscraper slot size.
- [ ] Run `vp check`.
- [ ] Run `vp test` because this changes binding coverage.

Exit criteria:

- [ ] The room-to-slot binding matrix is complete before SVG production starts.
- [ ] The plan does not require runtime scene bindings for missing files.

## Phase 6 - Pilot Room Scene Pack

Do not start full 21-room production until Phases 1 through 5 are complete.

For each pilot room, perform this exact sequence:

- [ ] Produce the full-room reference fixture first.
- [ ] Validate the reference fixture against the engine-rendered room footprint.
- [ ] Extract a props-only production scene SVG.
- [ ] Verify the production scene SVG contains no walls, floors, room outlines, grids, labels, or structural elements.
- [ ] Place the production scene SVG under `public/data/svg-environments/hq/skyscraper/recipes/`.
- [ ] Register the scene in `content/data/hq-environment-index.json`.
- [ ] Run `pnpm catalog:svg`.
- [ ] Add the matching room-scene binding in `lib/svg-asset-contract.ts`.
- [ ] Add `resolveHqRoomSceneAssetUrl` coverage.
- [ ] Review the room scene over engine-rendered walls and floors.
- [ ] Review the room scene next to neighboring rooms in a tower-core view.

Pilot rooms:

- [ ] Lobby.
- [ ] Fabrication Bay.
- [ ] Executive Office.
- [ ] Compliance Office.
- [ ] War Room.
- [ ] Sky Lounge.

Exit criteria:

- [ ] The pilot pack proves ground-floor, logistics/crafting, executive pressure, public pressure, rival pressure, and prestige recruitment identities.
- [ ] Every pilot scene is props-only, registered, bound, cataloged, tested, and reviewed in context.

## Phase 7 - Full Room Scene Production

Do not start this phase until the pilot pack passes review.

For each remaining room, use the same reference-fixture-to-props-only sequence from Phase 6.

Baseline package:

- [ ] Front Desk.
- [ ] Bullpen.
- [ ] Situation Room.
- [ ] Clinic.
- [ ] Dojo.
- [ ] Crew Lounge.
- [ ] Supply Hall.
- [ ] Helipad.
- [ ] Sky Garden.

Expansion package:

- [ ] Club.
- [ ] Green Room.
- [ ] Drill Floor.
- [ ] Recon Course.
- [ ] Trauma Bay.
- [ ] Private Cellar.

Per-room acceptance checklist:

- [ ] Reference fixture shows the full room box first.
- [ ] Production scene SVG is props-only.
- [ ] No walls, floors, room outlines, grids, labels, or structural elements are included in the production scene SVG.
- [ ] Every intended floor-plane edge follows the canonical 2:1 isometric axes.
- [ ] Upright edges stay vertical.
- [ ] Circular forms on top or floor planes read as isometric ellipses.
- [ ] Props preserve circulation and wall clearance for the actual slot footprint.
- [ ] The room works when snapped beside neighboring rooms in the tower layout.
- [ ] No broad oval drop shadows or fuzzy detached shadow pads carry grounding.
- [ ] Scene metadata is registered in `content/data/hq-environment-index.json`.
- [ ] Scene binding is added in `lib/svg-asset-contract.ts`.
- [ ] `content/data/svg-asset-catalog.json` includes the scene SVG.
- [ ] Asset-contract tests pass.

Exit criteria:

- [ ] All 21 skyscraper rooms have approved props-only scene SVGs.
- [ ] The runtime renders the tower with skyscraper-native room art instead of fallback or bodega-derived visuals.

## Phase 8 - Verification

Run these checks before marking the plan complete:

- [ ] Run `vp check`.
- [ ] Run `vp test`.
- [ ] Run `vp build`.
- [ ] Run SVG validation for approved SVG files.
- [ ] Review `/scene-builder` with `building/skyscraper` selected at baseline tier.
- [ ] Review `/scene-builder` with `building/skyscraper` selected at Penthouse tier.
- [ ] Review `/svg-playground` HQ Environment with `building/skyscraper` selected.
- [ ] Review an in-game skyscraper save at baseline tier.
- [ ] Review an in-game skyscraper save at fully expanded tier.
- [ ] Capture screenshots under `playwright/screenshots/` for baseline tower-core.
- [ ] Capture screenshots under `playwright/screenshots/` for expanded tower-core.
- [ ] Capture screenshots under `playwright/screenshots/` for rooftop.
- [ ] Capture screenshots under `playwright/screenshots/` for Executive Office, Compliance Office, and War Room.

Completion checklist:

- [ ] Skyscraper package roots resolve to skyscraper directories.
- [ ] Scene Builder exposes skyscraper building, stage, and floor choices.
- [ ] SVG Playground exposes the skyscraper HQ Environment package.
- [ ] Skyscraper runtime structure uses skyscraper-native floors, walls, perimeter, and backdrop behavior.
- [ ] Shell/backdrop assets read as high-altitude midtown, not street-level low-rise.
- [ ] All approved room scenes are props-only.
- [ ] All approved room scenes pass asset-contract coverage.
- [ ] Priority rooms have approved art: Lobby, Fabrication Bay, Executive Office, Compliance Office, War Room, and Sky Lounge.
- [ ] All 21 skyscraper rooms have approved art before the plan is complete.
