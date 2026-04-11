# Phase 4 Midgame Crafting Plan

This plan adds the real midgame gear economy. It builds on the shipped inventory and loot systems, keeps monster parts and site-specific materials as stackable inventory, and introduces durable gear crafting through a dedicated Porter's workshop.

## Goal

Turn Porter's from a loot-and-market midpoint into a real midgame equipment workshop:

- one dedicated workshop room
- authored durable crafting recipes
- district-linked rare material sourcing
- role- and site-specific D-rank gear upgrades
- deterministic economy validation for the new loop

## Depends On

- `docs/plans/phase-4-midgame-contract-lock-plan.md`
- `docs/plans/phase-4-midgame-city-pressure-plan.md`
- `docs/plans/phase-4-midgame-content-remediation-plan.md`

## Locked Decisions

- The workshop room is `room/workshop:tier_1`.
- The unlock upgrade is `upgrade/building/porters:machine_shop`.
- The workshop requires `staff:logistics` support to operate.
- Crafting outputs are durable `weapon/*`, `outfit-overlay/*`, and `accessory/*` items, not consumables.
- Phase 4 crafting output caps at D-rank because Porter's still caps contracts at D-rank.
- Rare materials are inventory items under `loot/*`, not new guild resources.
- Prep recipes remain consumable-only. Durable gear recipes use `CraftRecipeTemplate`.

## Planned File Targets

- `content/templates/crafting.ts`
- `content/templates/items.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `content/templates/index.ts`
- `content/templates/shared.ts`
- `sim/systems/inventory.ts`
- `sim/systems/market.ts`
- `sim/systems/room-operations.ts`
- `sim/systems/commands.ts`
- `sim/systems/index.ts`
- `sim/runtime.ts`
- `app/ui/view-models.ts`
- `app/ui/inventory-panel.tsx`
- `app/ui/item-surface.tsx`
- `app/ui/management-panel.tsx`
- `app/ui/dev-console-commands.ts`
- `sim/tools/early-campaign-economy-ledger.ts`
- `sim/tools/midgame-economy-ledger.ts`

## Recipe Structure

Ship three recipe families first:

- `craft-family/field-lead-breach`
- `craft-family/scout-recon`
- `craft-family/medic-stabilization`

Each family must include:

- one weapon recipe
- one outfit recipe
- one accessory recipe

Each recipe must consume:

- common monster parts
- one district-tagged rare material
- one cash sink paid at craft time

## Implementation Sequence

### 1. Add Workshop Content And Unlock Path

- Add `room/workshop:tier_1` with tags:
  - `room:specialized`
  - `ops:crafting`
  - `staff:logistics`
- Add `upgrade/building/porters:machine_shop`.
- Make `machine_shop` require:
  - `resource/cash` minimum `1250`
  - `resource/reputation` minimum `95`
  - `building_tier_min` for `building/porters` set to `5`

### 2. Add Durable Crafting Contracts And Commands

- Add durable craft recipe data to `content/templates/crafting.ts`.
- Add runtime commands for:
  - recipe availability
  - craft execution
  - room staffing validation
- Charge inventory, cash, and staffing requirements before a craft succeeds.

### 3. Expand Item And Material Authoring

- Add district-tagged rare material items.
- Add the first nine crafted D-rank gear outputs across the three locked recipe families.
- Update relevant site drop tables so D-rank sites can source the new district materials.

### 4. Integrate Market And Inventory Surfaces

- Extend inventory and item surfaces to distinguish:
  - ordinary loot
  - craft inputs
  - crafted gear
- Keep the market able to sell crafted outputs and surplus materials, but do not let it sell the rare district materials directly in Phase 4.
- Show recipe requirements and blockers clearly in the UI.

### 5. Add Midgame Economy Verification

- Add `sim/tools/midgame-economy-ledger.ts` with:
  - material source envelope
  - craft cost envelope
  - expected crafted-gear value envelope
  - market fallback value
- Keep the early-campaign ledger focused on the bodega opening.
- Add tests for recipe validation, input consumption, crafted output production, and workshop staff gating.

## Rules

- Do not add per-copy item uniqueness, durability, or random affixes.
- Do not let crafting bypass the shared inventory stack model.
- Do not introduce C-rank craft output in Porter's.
- Do not let the market trivialize district material sourcing by directly selling every rare input.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- Porter's supports durable gear crafting through a staffed workshop
- district-tagged rare materials matter to recipe access
- the crafted gear loop is valuable enough to compete with pure market purchase without replacing it
- a deterministic midgame economy ledger exists for tuning

## Execution Status

### File Locks

- None until earlier slices merge.

### In Progress

- Blocked pending earlier slices.

### Blocked

- `phase-4-midgame-contract-lock-plan`
- `phase-4-midgame-city-pressure-plan`
- `phase-4-midgame-content-remediation-plan`

### Done

- None.
