# Porter's Design Revision Plan

This plan is the follow-up design pass for Porter's differentiation. Run it after the mechanical room plans are stable enough that the UI, copy, and assets can describe shipped behavior instead of guessing at it.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/presentation.md`
- `docs/product/asset-production.md`
- `docs/world/index.md`
- `docs/world/headquarters-and-rooms.md`
- the active Porter's differentiation plan docs in this folder

## Goal

Revise Porter's UI, copy, and assets so the new room behaviors read clearly and tonally correctly, without bundling design work into the initial systems implementation.

## Locked Decisions

- Treat this as a follow-up pass after Plans 1 through 4 have stabilized their runtime contracts.
- Design changes must not become alternate gameplay authority. Mechanics stay in ECS, templates, and systems.
- Preserve the established visual language in `app/ui`, `app/app.css`, and shipped SVG assets.
- Any room-scene or prop asset work must obey the props-only isometric contract from `docs/product/asset-production.md`.
- If UI work is substantial, follow the repo UI-skill requirement from `AGENTS.md`.

## Primary Write Scope

- `app/ui/*`
- `app/app.css`
- Porter's room, upgrade, and presenter copy in content/templates or simulation-owned authored data
- Porter's scene/prop assets under `public/data/svg-environments/*` when needed
- docs updates in `docs/roadmap.md`, `docs/product/presentation.md`, and `docs/world/*` when canon wording materially changes

## Phase 1: Audit What The Systems Pass Actually Shipped

Owner: design/UI

Tasks:

1. Review the final player-facing outputs from Plans 1 through 4.
2. Identify where the UI still speaks in placeholder terms, generic room-family language, or outdated bodega carryover wording.
3. Identify which new mechanics still lack a clear visual or copy cue.

Done when:

- There is a concrete post-systems design punch list instead of speculative polish work.

## Phase 2: Revise Copy

Owner: content/design

Tasks:

1. Update room-detail, upgrade, contract-prep, and event-log copy to describe the real differentiated behaviors.
2. Keep tone aligned with the world foundation: workplace comedy under supernatural pressure.
3. Preserve the distinction between public rooms, private upstairs rooms, and waterfront rooms in naming and description.
4. Update any presenter or guidance copy that still undersells why Porter's is operationally different.

Done when:

- Porter's room and upgrade copy matches shipped behavior and the world foundation.

## Phase 3: Revise UI Hierarchy

Owner: UI

Tasks:

1. Rework Porter's-specific information density so new room benefits are visible without turning screens into stat dumps.
2. Improve emphasis for contract-prep, readiness, recovery, and waterfront outputs where the default UI hierarchy hides them.
3. Keep the work additive to the existing visual language instead of redesigning the entire shell.

Done when:

- The new Porter's mechanics are readable in normal play without a debugger or deep tooltip hunt.

## Phase 4: Revise Assets Where Needed

Owner: asset/design

Tasks:

1. Audit whether the differentiated rooms need additional props, room-state variations, or clearer room-scene storytelling.
2. Add or revise only the props needed to support the newly shipped behaviors.
3. Keep all room-scene SVGs props-only and isometric. Do not add walls, floors, or flat front-facing filler.

Done when:

- Porter's spaces look like the differentiated rooms they now are, not like generic placeholders.

## Phase 5: Review And Documentation Sync

Owner: design/QA

Tasks:

1. Capture browser screenshots for the final Porter's surfaces that changed.
2. Update roadmap or product/world docs only where the final shipped behavior changed future-facing wording.
3. Run `vp check`, plus `vp test` and `vp build` if the pass touched behavior or integration.

Done when:

- The design pass is closed with UI proof, copy alignment, and canon docs updated where needed.

## Parallel Rules

- Do not start this pass before the mechanics stabilize enough to avoid immediate rework.
- Do not let copy or assets invent behavior that the runtime does not implement.
- Do not use this pass to reopen core Porter's system design.
