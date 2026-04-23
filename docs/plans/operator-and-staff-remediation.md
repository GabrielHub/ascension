# Operator And Staff Remediation

Implementation plan for:

- removing generic staff as a gameplay roster
- making presenters the only staff in the game
- simplifying room operation to locked/unlocked plus explicit blockers
- adding presenter HQ walkers and presenter tokens
- making presenter identity authoritative in narrative surfaces
- replacing operator combat kits with a unified block-package model

This document is for execution. Follow the checklist in order.

---

## 1. Locked Rules

### 1.1 Staff And Rooms

- [x] Generic staff are removed.
- [x] Presenters are the only staff in the game.
- [x] `world.staff` is removed as a long-term gameplay surface.
- [x] `sim/hire-staff` is removed.
- [x] `sim/assign-staff` is removed.
- [x] Dead `staff:*` tags are removed.
- [x] Rooms do not depend on staff assignment.
- [x] Rooms do not depend on presenter presence.
- [x] Rooms do not use a normal active/inactive toggle.
- [x] Normal room state is `locked` or `unlocked`.
- [x] If a room is unlocked and placed, it functions immediately.
- [x] Room impairment only comes from explicit blockers such as incidents, damage, or upgrade/construction state.
- [x] Do not keep staffing/load/operational busywork under a new name.

### 1.2 Presenter Unlocks

- [x] Mara is unlocked from the start.
- [x] Every other presenter unlocks from a room.
- [x] Presenter unlock is permanent.
- [x] Presenters are visual/narrative HQ actors after unlock.
- [x] Presenters do not mechanically power rooms.

Canonical unlock mapping:

- [x] Mara Cordero: start unlocked
- [x] Rafi Alvarez: `room/dining_area:tier_1`
- [x] Sloane Becker: `room/bar:tier_1`
- [x] Vicente Ortega: `room/fabrication_bay:tier_1`
- [x] Dr. June Park: `room/infirmary:tier_1`
- [x] Laura Bennett: `room/compliance_office:tier_1`

### 1.3 Presenter HQ Presence

- [x] Each presenter has one neutral/default HQ token.
- [x] Presenter tokens are visually distinct from operator tokens.
- [x] Each presenter has an authored allowed-room list.
- [x] A presenter appears in an HQ only if that HQ contains at least one allowed room.
- [x] Presenters can move between their allowed rooms.
- [x] Neutral presenter images are the render/art-style reference set for presenter-adjacent character assets.

Asset source of truth:

- [x] Presenter portrait raster assets live under `public/data/presenters/<presenter-folder>/`.
- [x] Presenter portrait metadata, prompt record, preserve list, allowed-room list, unlock room, domain summary, and voice brief are set in `content/templates/presenters.ts`.
- [x] The `PresenterTemplate` contract in `content/templates/shared.ts` is the schema authority for presenter metadata fields.
- [x] HQ environment placement metadata belongs in `content/data/hq-environment-index.json` when a runtime-facing HQ asset or actor-marker entry is needed.
- [x] `content/data/svg-asset-catalog.json` is generated output, not the source-of-truth place to author asset metadata.

Guild leader asset workflow:

- [ ] Any new guild leader asset generated in this slice uses two passes.
- [ ] Pass 1 locks face, body, proportions, and silhouette.
- [ ] Pass 2 locks clothing/armor on top of the approved base.
- [ ] Do not add the final guild leader asset to the official folder until both passes are approved.
- [ ] Use the neutral presenter images as the render/art-style reference set.
- [ ] Put any guild leader raster asset under `public/data/guild-leaders/<leader-id>/`.
- [ ] Record the approved prompt, preserve list, and any style-lock notes in the checked-in metadata file that defines that guild leader before treating the asset as final.

### 1.4 Presenter Narrative Authority

- [x] `presenterId` is required for presenter-backed narrative surfaces.
- [x] `presenterExpression` is required for presenter-backed narrative surfaces.
- [x] Presenter selection is resolved before UI render.
- [x] Presenter expression is resolved before UI render.
- [x] AI does not choose the presenter.
- [x] AI does not invent the expression.
- [x] AI prompt payloads include presenter metadata.
- [x] Expression affects both portrait and prose register.

### 1.5 Combat Loop

- [x] Combat uses one shared three-block loop.
- [x] Each basic action gives exactly `+1` block.
- [x] `+1` block is universal for all ranks and all future Unique operators.
- [x] Operators hold up to `3` blocks.
- [x] Basic output scales by block stage.
- [x] Normal basics remain offensive.
- [x] Support/control basics can have utility riders, but are not fully non-damaging.
- [x] On reaching `3` blocks, the next action automatically spends all `3` blocks.
- [x] Normal kits do not hold at `3`.
- [x] After the ultimate resolves, the operator returns to `0` blocks.
- [x] A normal ultimate can be offensive, defensive, or support-oriented, but it must be a strong 3-block payoff.

### 1.6 Stats, Traits, And Support Rules

- [ ] Traits are non-combat.
- [ ] Traits remain social/narrative/relationship-facing.
- [ ] Trainable physical stats remain Strength, Speed, Endurance, and Resilience.
- [ ] Perception and Intelligence remain fixed at recruitment.
- [ ] Support remains indirect.
- [ ] Normal support kits do not directly grant blocks to allies.
- [ ] Combat payload scaling is explicit and authored per payload.
- [ ] A normal payload scales from exactly one stat.
- [ ] Intelligence-based scaling is allowed when the kit calls for it.
- [ ] Do not add multi-stat scaling in this slice.

### 1.7 Combat Package Rules

- [x] Replace the old split combat-kit model with one unified combat package.
- [x] Each operator carries one `combatPackageId`.
- [x] Each combat package contains:
- [x] stage 1 basic payload
- [x] stage 2 basic payload
- [x] stage 3 basic payload
- [x] one ultimate payload
- [x] zero or one passive
- [x] allowed role tags
- [x] allowed attunement tags
- [x] allowed rank pool
- [x] Every normal package has exactly one ultimate payload.
- [x] Every normal package has at most one passive.
- [x] Each payload declares one scaling stat and coefficient.

### 1.8 Rank Rules

- [x] Rank changes package breadth and riders, not the loop.
- [x] F/E stay simple.
- [x] D adds more authored variation.
- [x] C is the first passive tier.
- [x] C passives stay simple.
- [x] B+ adds richer ultimate riders.
- [x] B/A normal-rank passives still stay simple.
- [x] Role and attunement define style.
- [x] Rank deepens style rather than replacing it.

### 1.9 Unique Rules

- [x] `U` means `Unique`.
- [x] Unique operators are deterministic and not randomly generated.
- [x] Unique operators still use:
- [x] one basic = `+1` block
- [x] automatic spend at `3`
- [x] one ultimate payload
- [x] Do not implement Unique acquisition goals in this slice.
- [x] Do not implement multi-stat scaling or broader passive contracts in this slice.

---

## 2. Work Order

Complete the phases in order.

### Phase 0. Audit

Files to inspect:

- [ ] `sim/runtime.ts`
- [ ] `sim/systems/commands.ts`
- [ ] `sim/systems/room-operations.ts`
- [ ] `sim/systems/economy.ts`
- [ ] `sim/systems/events.ts`
- [ ] `sim/systems/guidance-beats.ts`
- [ ] `sim/systems/incidents.ts`
- [ ] `sim/systems/encounter.ts`
- [ ] `sim/systems/encounter-types.ts`
- [ ] `save/types.ts`
- [ ] `save/codec.ts`
- [ ] `content/templates/rooms.ts`
- [ ] `content/templates/crafting.ts`
- [ ] `content/templates/index.ts`
- [ ] `content/templates/kits.ts`
- [ ] `content/bootstrap.ts`
- [ ] `lib/operator-combat.ts`
- [ ] `app/features/ai/prompts.ts`
- [ ] `app/features/ai/schemas.ts`
- [ ] `app/ui/interruption-host.tsx`
- [ ] `app/ui/presenter-panel.tsx`
- [ ] `app/ui/room-detail-panel.tsx`
- [ ] `app/ui/operator-combat-summary.tsx`
- [ ] `app/ui/_glossary.ts`

Audit tasks:

- [ ] List every generic-staff runtime surface that must be removed.
- [ ] List every `requiredStaffTag` / `staff:*` dependency that must be removed.
- [ ] List every room UI/copy surface that still teaches staffing or activation.
- [ ] List every presenter narrative surface that must receive authoritative presenter data.
- [ ] List every combat/save/template surface that still assumes `regularAttackId`, `skillId`, `ultimateId`, and `passiveIds`.

Phase done when:

- [ ] The implementation has a concrete file-level removal list.

### Phase 1. Remove Generic Staff And Simplify Rooms

Primary files:

- [x] `sim/runtime.ts`
- [x] `sim/systems/commands.ts`
- [x] `sim/systems/room-operations.ts`
- [x] `save/types.ts`
- [x] `save/codec.ts`
- [x] `content/templates/rooms.ts`
- [x] `content/templates/crafting.ts`
- [x] `content/templates/index.ts`
- [x] `content/bootstrap.ts`
- [x] `app/ui/room-detail-panel.tsx`

Tasks:

- [x] Remove generic staff hire flow.
- [x] Remove generic staff assignment flow.
- [x] Remove generic staff save data or migrate it away.
- [x] Remove room activation logic that only existed for staffing.
- [x] Remove room-operation checks that depended on assigned staff or `requiredStaffTag`.
- [x] Convert room function to unlocked/placed plus explicit blockers.
- [x] Remove dead `staff:*` tags.
- [x] Remove dead `room:staffing` semantics (migrated to `room:logistics`).
- [x] Update crafting and other room-gated systems to depend on room availability or explicit blockers.
- [x] Remove staffing/activation copy from room surfaces.

Phase done when:

- [x] Rooms function without generic staff.
- [x] The HQ no longer depends on a generic staff roster.

### Phase 2. Add Presenter HQ Actors And Tokens

Primary files/systems:

- [x] HQ/world render and actor placement code
- [x] presenter asset lookup / render metadata
- [x] relevant runtime actor state
- [x] `content/templates/presenters.ts`
- [x] `content/templates/shared.ts`
- [x] `content/data/hq-environment-index.json` when HQ actor-marker metadata is required
- [x] hover/focus UI for HQ actors

Tasks:

- [x] Add one neutral/default HQ token per presenter.
- [x] Keep presenter tokens readable at operator-token scale.
- [x] Differentiate presenter tokens with a consistent accent treatment.
- [x] Add deterministic presenter actor ids.
- [x] Add allowed-room lists for each presenter.
- [x] Store presenter metadata changes in `content/templates/presenters.ts`, not in ad hoc UI constants.
- [x] Update `content/templates/shared.ts` only if the `PresenterTemplate` schema itself must change.
- [x] Register any runtime-facing HQ asset placement metadata in `content/data/hq-environment-index.json` if the current placement system requires it.
- [x] Spawn Mara from the start.
- [x] Unlock the other presenters from the canonical room mapping.
- [x] Make presenter visibility depend on allowed-room availability.
- [x] Allow presenters to move between valid allowed rooms.
- [x] Keep placement save-safe.

Phase done when:

- [x] Presenters are visible in HQs where they should be visible.

### Phase 3. Make Presenter Narrative Inputs Authoritative

Primary files:

- [x] `sim/systems/guidance-beats.ts`
- [x] `sim/systems/incidents.ts`
- [x] `app/features/ai/prompts.ts`
- [x] `app/features/ai/schemas.ts`
- [x] interruption / narrative UI surfaces

Tasks:

- [x] Resolve `presenterId` before UI render.
- [x] Resolve `presenterExpression` before UI render.
- [x] Require presenter metadata in AI framing payloads.
- [x] Add presenter voice grounding to AI prompts.
- [x] Make expression affect prose register as well as portrait selection.
- [x] Remove presenter-agnostic AI paths for presenter-backed incidents.

Phase done when:

- [x] Presenter-backed narrative surfaces use authoritative presenter identity and expression.

### Phase 4. Replace Combat Kits With Combat Packages

Primary files:

- [x] `save/types.ts`
- [x] `save/codec.ts`
- [x] `content/templates/kits.ts` or replacement
- [x] `lib/operator-combat.ts`
- [x] `content/bootstrap.ts`

Tasks:

- [x] Add `combatPackageId` as the primary combat identity reference.
- [x] Define the combat package schema.
- [x] Remove the old split-kit schema as the primary authored contract.
- [x] Ensure each package defines stage 1, stage 2, stage 3, one ultimate, optional passive, role tags, attunement tags, and rank pool.
- [x] Ensure each payload declares one scaling stat and coefficient.
- [x] Ensure normal packages have exactly one ultimate.
- [x] Ensure normal packages have at most one passive.

Phase done when:

- [x] Combat content is package-based rather than split-kit-based.

### Phase 5. Refactor Encounter Runtime To The Block Loop

Primary files:

- [x] `sim/systems/encounter.ts`
- [x] `sim/systems/encounter-types.ts`
- [x] encounter runtime state
- [x] `sim/runtime.ts` if encounter serialization changes
- [x] combat UI summaries

Tasks:

- [x] Add explicit per-actor block state.
- [x] Resolve basics as stage 1, stage 2, or stage 3 based on block count.
- [x] Auto-spend on the next action at `3` blocks.
- [x] Reset block count after ultimate resolution.
- [x] Keep basics offensive on normal kits.
- [x] Keep support indirect on normal kits.
- [x] Prevent direct ally block grants on normal kits.
- [x] Stop encounter logic from bypassing authored package state with old default-kit behavior.

Phase done when:

- [x] Live combat follows `1 -> 2 -> 3 -> ultimate -> reset`.

### Phase 6. Apply Rank Pools, Bootstrap, And Save Migration

Primary files:

- [x] `lib/operator-combat.ts`
- [x] `content/bootstrap.ts`
- [x] recruit generation systems
- [x] `save/codec.ts`
- [x] tests covering generation and hydration

Tasks:

- [x] Add explicit rank-pool metadata to combat packages.
- [x] Make generated operators draw only from legal package pools.
- [x] Keep role/attunement as style-defining axes.
- [x] Keep rank as a depth/rider axis.
- [x] Preserve `U` as deterministic-only.
- [x] Add save migration from old combat schema to `combatPackageId`.

Phase done when:

- [x] Generated operators cannot pull packages from the wrong rank band.

### Phase 7. Cleanup UI, Copy, And Docs

Primary files:

- [x] `app/ui/room-detail-panel.tsx`
- [x] `app/ui/operator-combat-summary.tsx`
- [x] `app/ui/_glossary.ts`
- [x] interruption/presenter UI surfaces
- [x] `docs/product/gameplay-systems.md`
- [x] `docs/world/operators-and-staff.md`
- [x] other docs surfaced in Phase 0

Tasks:

- [x] Remove staffing-roster language.
- [x] Remove room activation/load/staffing-pressure language.
- [x] Update presenter-facing copy to match the new contract.
- [x] Update combat UI/copy to describe the 3-block model.
- [x] Remove stale split-kit language.
- [x] Keep `U` / Unique wording consistent.

Phase done when:

- [x] User-facing copy matches the shipped systems.

### Phase 8. Verify

Required tests:

- [x] save migration away from generic staff
- [x] room function without staffing/activation
- [x] presenter unlock and HQ visibility
- [x] presenter token differentiation from operators/visitors
- [x] presenter-backed narrative payloads carrying `presenterId` and `presenterExpression`
- [x] presenter expression affecting prose register
- [x] encounter block progression and reset
- [x] rank-gated combat-package generation

Required commands:

- [x] `vp check`
- [x] `vp test`
- [x] `vp build`

Phase done when:

- [x] All required tests pass.
- [x] All three commands pass.

---

## 3. Implementation Queries For Final Review

Use these checks after implementation is complete.

### Generic staff and room loop

- [x] `rg -n "hire-staff|assign-staff|requiredStaffTag|staff:" sim save content app` only returns intentional surviving non-gameplay strings or nothing relevant.
- [x] Unlocking and placing a room is enough for it to function in runtime.

### Presenters

- [x] Mara appears in a fresh game.
- [x] Rafi, Sloane, Vicente, June, and Laura unlock from the correct rooms.
- [x] Presenters do not appear in HQs without a valid allowed room.
- [x] Presenter tokens are clearly distinct from operators and visitors.

### Narrative

- [x] Presenter-backed narrative surfaces always carry `presenterId`.
- [x] Presenter-backed narrative surfaces always carry `presenterExpression`.
- [x] AI prompt payloads include presenter metadata and style grounding.

### Combat

- [x] No normal package has more than one ultimate.
- [x] No normal package has more than one passive.
- [x] No normal payload uses multi-stat scaling.
- [x] Every basic gives exactly `+1` block.
- [x] No normal kit holds at `3` blocks.
- [x] No normal kit directly grants blocks to allies.

### Unique

- [x] `U` is deterministic-only.
- [x] `U` still uses one basic = `+1` block.
- [x] `U` still uses one ultimate payload.

---

## 4. Done

This plan is complete when all phases are checked and all verification commands pass.
