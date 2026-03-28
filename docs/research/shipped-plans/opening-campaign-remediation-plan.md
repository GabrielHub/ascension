# Opening Campaign Remediation Plan

This was the first implementation plan. It turned the shipped guidance framework into the canonical player-facing first campaign instead of a thin tutorial layer beside the real game.

Status: implemented. This file remains only as a reference input for shipped opening and economy tooling; it is not an active execution plan.

## Run This Plan First

Do not start `bodega-closure-plan.md`, `management-policy-surfaces-plan.md`, or the dynamic portions of `economy-and-balance-harness-plan.md` until this plan has locked the opening path.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/presentation.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/premise-and-tone.md`

## Locked Decisions

- Keep onboarding authority in ECS and runtime state.
- Keep interruption-backed narrative beats inside the existing interruption layer.
- Keep preview and sandbox flows separate from the canonical `new game` path.
- Teach the real bodega loop: contract board, HQ consequences, autonomous raids, incidents, staffing pressure, upgrades, and failure recovery.

## Phase 1: Define The Canonical Opening Arc

Owner: gameplay/design

Tasks:

1. Define the first `5-8` contract arc for a real new campaign.
2. Lock the starter envelope for operators, staff, visitors, inventory, and first-board contracts.
3. Define the first guaranteed management beats:
   - first contract choice
   - first roster-condition explanation
   - first room explanation
   - first autonomous raid explanation
   - first incident
   - first staffing or roster-pressure decision
   - first upgrade decision
   - first setback recovery path
4. Write the acceptance criteria for each beat in observable terms.

Done when:

- A reviewer can describe the entire first campaign flow without referencing preview-mode assumptions.
- The opening path has an explicit first-board envelope and recovery-safe fallback path.

## Phase 2: Audit The Shipped Guidance Stack

Owner: gameplay/UI

Tasks:

1. Compare the shipped guidance sequence against the Phase 1 beat list.
2. Record missing beats, mistimed beats, duplicate beats, and beats that teach the wrong flow.
3. Remove any dependence on dev-only density, seeded active-contract shortcuts, or preview-only affordances.

Done when:

- Every opening milestone is either already covered or has a concrete remediation task.

## Phase 3: Align New-Game Data And Runtime Beats

Owner: gameplay/data

Tasks:

1. Split canonical `new game` seed data from preview/dev seed data.
2. Tune the opening roster, staff, visitors, room availability, and contract board to match the canonical arc.
3. Add or retune runtime-owned guidance beats and interruption beats so they trigger against the actual campaign state.
4. Keep copy grounded in the world docs and keep instructional authority out of React-only state.

Done when:

- Starting a normal campaign reliably enters the intended first-board state.
- Preview mode still supports fast verification, but no longer defines the canonical opening.

## Phase 4: Save-Safe Verification

Owner: gameplay/QA

Tasks:

1. Verify refresh and save/load behavior at multiple opening beats.
2. Verify that unresolved opening interruptions restore correctly.
3. Verify that the active beat always matches the restored campaign state.
4. Add browser coverage for the canonical first-run path once the flow is stable enough to automate.

Done when:

- The opening path survives refresh and save/load without skipping or duplicating beats.

## Parallel Rules

- Phase 1 and the static audit work in the economy harness may run in parallel.
- Do not implement standing policy surfaces until Phase 1 has locked the player-facing early campaign.
- Do not broaden content to solve onboarding problems that should be fixed by seed data, sequencing, or guidance.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.
- Use browser automation for browser-facing regression once the opening path is stable enough to test end to end.
