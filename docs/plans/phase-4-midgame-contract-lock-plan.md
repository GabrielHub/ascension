# Phase 4 Midgame Contract Lock Plan

This is the required serial gate for Phase 4. Do not begin broad implementation until this contract lands. Its job is to lock the shared data model, stable ids, save schema additions, and room and content contracts that every later slice depends on.

## Goal

Add the Phase 4 shared contracts without introducing broad gameplay behavior yet:

- first-class districts
- first-class external factions
- first-class city-pressure save state
- first-class durable gear crafting recipe contracts
- first-class rank-escalation metadata for authored content
- a dedicated Porter's workshop room and unlock path

## Canon Inputs

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/content-taxonomy.md`
- `docs/world/attunement-and-ranks.md`
- `docs/world/guilds-and-dungeons.md`
- `docs/world/content-rules.md`

## Locked Decisions

- District ids stay aligned with the shipped district labels:
  - `district/lower-east-side`
  - `district/queens-railyard`
  - `district/bronx-overpass`
  - `district/red-hook-waterfront`
  - `district/harlem-substation`
- The initial faction ids are:
  - `faction/city-licensing`
  - `faction/labor-safety`
  - `faction/emergency-management`
  - `faction/borough-contracts`
  - `faction/rival-guild-market`
- `FactionTemplate.kind` is locked to `"institution" | "rival_guild"`.
- Durable gear crafting ships through a new `CraftRecipeTemplate` registry. Do not overload `PrepRecipeTemplate`.
- Crafting uses inventory items as inputs and outputs. No new global crafting currency is added in Phase 4.
- The dedicated crafting room is `room/workshop:tier_1`.
- The workshop unlock upgrade is `upgrade/building/porters:machine_shop`.
- `upgrade/building/porters:machine_shop` requires Porter's tier 5, which places it after `upgrade/building/porters:waterfront`.
- `rankTone` metadata becomes a first-class authored contract for site concepts, bosses, items, and operators. Use:
  - `grounded`
  - `heightened`
  - `surreal`
  - `mythic`
- City pressure state gets its own singleton component and typed save block. Do not bury it inside `GuildState` or the generic `BuildingAuthority.pressure` number.

## Stable API And Type Names

- `DistrictTemplate`
- `FactionTemplate`
- `FactionKind`
- `DistrictPressureSnapshot`
- `FactionStandingSnapshot`
- `CityPressureSnapshot`
- `CityState`
- `CraftRecipeTemplate`
- `RankTone`
- `CityPressureView`
- `DistrictPressureView`
- `FactionStandingView`

## Planned File Targets

- `content/templates/shared.ts`
- `content/templates/index.ts`
- `content/templates/districts.ts`
- `content/templates/factions.ts`
- `content/templates/crafting.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `sim/components/index.ts`
- `sim/components/city-state.ts`
- `save/types.ts`
- `save/codec.ts`
- `save/codec.test.ts`
- `sim/runtime.ts`
- `app/ui/view-models.ts`
- `app/ui/_glossary.ts`

## Required Data Contracts

### DistrictTemplate

Each district entry must include:

- `id`
- `name`
- `borough`
- `tags`
- `description`
- `siteConceptIds`
- `primaryFactionIds`
- `pressureBias`
- `rewardBias`
- `rareMaterialDropTags`

### FactionTemplate

Each faction entry must include:

- `id`
- `name`
- `kind`
- `tags`
- `description`
- `preferredDistrictIds`
- `incidentCategoryBias`
- `contractModifierProfile`
- `pressureResponseProfile`

### CityPressureSnapshot

The save block must include:

- one record per district id with:
  - `attention`
  - `trust`
  - `containmentDebt`
  - `recentContractCount`
  - `lastResolvedTick`
- one record per faction id with:
  - `standing`
  - `scrutiny`
  - `leverage`
  - `cooldownUntilTick`

### CraftRecipeTemplate

Each durable recipe must include:

- `id`
- `family`
- `name`
- `description`
- `requiredRoomId`
- `requiredStaffTag`
- `minimumBuildingId`
- `minimumBuildingTier`
- `outputItemId`
- `outputQuantity`
- `inputItems`
- `requiredDistrictTags`
- `requiredFactionStanding`

## Work Sequence

### 1. Extend Shared Template Types

- Add `DistrictTemplate`, `FactionTemplate`, `CraftRecipeTemplate`, and `RankTone`.
- Extend `TemplateRegistry` and validation categories to include districts, factions, and craft recipes.

### 2. Add Canonical Data Files

- Add `content/templates/districts.ts`.
- Add `content/templates/factions.ts`.
- Add `content/templates/crafting.ts`.
- Add `room/workshop:tier_1` to `content/templates/rooms.ts`.
- Add `upgrade/building/porters:machine_shop` to `content/templates/upgrades.ts`.

### 3. Add Save And Runtime Contract Fields

- Add `cityPressure?: CityPressureSnapshot | null` to `WorldSnapshot`.
- Add normalization and round-trip support in `save/codec.ts`.
- Add `CityState` under `sim/components/`.
- Thread default city-pressure state through `sim/runtime.ts`.

### 4. Add View-Model And Glossary Placeholders

- Add city-pressure view model types to `app/ui/view-models.ts`.
- Add district and faction label helpers to `app/ui/_glossary.ts`.
- Stop here. Do not implement behavior in this plan.

## Rules

- Do not implement contract generation logic in this plan.
- Do not implement incidents, crafting behavior, or encounter behavior in this plan.
- Do not add filler ids beyond the locked Phase 4 set.
- Do not store city pressure in generic untyped blobs once the typed snapshot exists.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- districts, factions, city-pressure state, workshop ids, and craft-recipe contracts all exist as typed shared contracts
- save/load covers the new city-pressure block
- later plans can reference locked ids and file paths without reopening naming

## Execution Status

### File Locks

- `content/templates/shared.ts`
- `content/templates/index.ts`
- `content/templates/districts.ts`
- `content/templates/factions.ts`
- `content/templates/crafting.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `sim/components/index.ts`
- `sim/components/city-state.ts`
- `save/types.ts`
- `save/codec.ts`
- `save/codec.test.ts`
- `sim/runtime.ts`
- `app/ui/view-models.ts`
- `app/ui/_glossary.ts`

### In Progress

- Lock shared Phase 4 ids, types, and save fields.

### Blocked

- `phase-4-midgame-city-pressure-plan`
- `phase-4-midgame-content-remediation-plan`
- `phase-4-midgame-crafting-plan`
- `phase-4-midgame-social-incident-plan`
- `phase-4-midgame-encounter-plan`

### Done

- None.
