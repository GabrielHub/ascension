# Phase 1 Bodega Vertical Slice Manager Plan

This replaces the completed preproduction plan.

Preproduction was verified complete on 2026-03-20 against:

- the completion state recorded in the former preproduction plan
- passing `vp check`
- passing `vp test`
- passing `vp build`

## Execution Status

### File Locks

- manager: `docs/plans/phase-1-bodega-manager.md`
- design-owned SVG exploration track: `docs/plans/phase-1-bodega-design.md`
  Reported exact exploration locks for the current operator SVG wave: `render/operator-detail-svg.tsx`
  No temporary exploration route or sandbox lock has been reported yet
- runtime track: `docs/plans/phase-1-bodega-runtime.md`
  Reported active locks: none; runtime remains released for this SVG planning wave
- save track: `docs/plans/phase-1-bodega-save.md`
  Reported active locks: none; save remains released for this SVG planning wave
- non-operator design surfaces: released; no active manager-approved SVG exploration lock outside `render/operator-detail-svg.tsx`

### In Progress

- manager coordination for the first real operator-only SVG style-exploration wave
- tracking the current design-owned exploration lock and requiring an exact temporary-route or sandbox lock before the wave expands

### Blocked

- the temporary operator SVG exploration route or sandbox does not exist yet in a design-owned route or UI surface
- a consistent operator SVG language has not been chosen yet, so reusable operator catalog expansion remains blocked
- production SVG work for rooms, buildings, enemies, and environments remains explicitly out of scope for this wave

### Done

- reviewed `AGENTS.md`
- reviewed `CLAUDE.md`
- reviewed [plans index](./index.md)
- reviewed [Planning Conventions](./planning-conventions.md)
- reviewed [Phase 1 Bodega Manager Plan](./phase-1-bodega-manager.md)
- reviewed [Phase 1 Contract Lock](./phase-1-bodega-contract-lock.md)
- reviewed [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
- reviewed [Phase 1 Save and Outcomes](./phase-1-bodega-save.md)
- reviewed [Phase 1 Design](./phase-1-bodega-design.md)
- confirmed the contract-lock serial gate deliverable exists
- cleared Parallel Wave A to launch within the locked contracts
- updated this manager plan to reflect the next safe ownership split
- replaced the broad file-lock placeholders with the current runtime, save, and design reports
- confirmed no contract-change handoff has been published yet
- reviewed the completed first Wave A pass and recorded the raid-autonomy pivot that supersedes manual dispatch work
- recorded the current correction-wave ownership map, unresolved handoffs, and join-point state after the autonomy pivot
- confirmed the join point was not ready until the stale blocker notes were reconciled and the review wave could be launched safely
- verified the current repo state directly with passing `vp check`, `vp test`, and `vp build`
- reconciled the stale save and design blocker notes against the actual runtime contract surface in `sim/runtime.ts` and `sim/commands.ts`
- cleared the correction-wave implementation locks for runtime, save, and design
- advanced the project to review-wave readiness
- updated this manager plan for the active review wave after the autonomy-pivot correction pass
- recorded that runtime, save, and design have released implementation ownership but have not yet published exact review-fix locks
- recorded the current per-track review status as awaiting findings or explicit clean reports before join-point clearance
- received the completed runtime, save, and design review outcomes
- confirmed the repo still passes `vp check`, `vp test`, and `vp build` after the review wave
- narrowed the remaining post-review work to one save-contract follow-up and one design-wiring follow-up
- completed manager triage of the review reports into a narrow post-review targeted-fix wave
- reviewed the current save targeted-fix status in `docs/plans/phase-1-bodega-save.md`
- reviewed the current design targeted-fix status in `docs/plans/phase-1-bodega-design.md`
- confirmed the save durability gap is still open because `familiarity` and `recentSharedOutcome` are still outside the implemented save contract
- confirmed the design wiring gap is still open because HQ and social surfaces still do not map the existing operator and social snapshot data
- updated this manager plan's execution status for the active targeted-fix wave and kept finished manager items out of `In Progress`
- confirmed the save targeted fix completed with schema version `4`, preserved relationship memory on reload, and passed repo verification
- confirmed the design targeted fix completed and now wires operator, staff, visitor, and relationship data into the HQ surfaces
- updated the contract-lock doc to include `operatorRelationships[].familiarity` and `operatorRelationships[].recentSharedOutcome`
- cleared the post-review targeted-fix wave and advanced the project to integration-wave readiness
- audited the current app-facing runtime glue in `app/features/runtime/session.ts` and `app/features/runtime/use-runtime-session.ts`
- audited the current design-facing integration surfaces in `app/ui/game-shell.tsx`, `app/ui/hq-panel.tsx`, `app/ui/bodega-floor.tsx`, `app/ui/room-detail-panel.tsx`, `app/ui/roster-panel.tsx`, and `app/ui/raid-panel.tsx`
- confirmed the simulation already exposes stable Phase 1 command dispatch in `sim/runtime.ts` and `sim/commands.ts`
- confirmed the app-facing runtime glue is still load-only and does not yet publish a UI-consumable command bridge
- confirmed the current design surfaces render authoritative HQ and raid-watch data but still leave actionable controls inert
- updated this manager plan's execution status for the active integration wave and moved completed manager triage items to `Done`
- confirmed the runtime or app integration track completed a typed session-owned command bridge, post-command refresh, save-backed persistence, and shell auto-ticking
- confirmed the design integration track wired room, upgrade, recruitment, staffing, time-advance, and observational operations surfaces onto the app-facing command bridge
- confirmed the repo still passes `vp check`, `vp test`, and `vp build` after the integration wave
- advanced the project to post-integration polish and bug-fix readiness
- reviewed the live worktree status for the active runtime/app polish and design polish tracks
- recorded the exact active post-integration polish locks from the current worktree
- recorded the first bounded cross-track polish issue: `app/ui/game-shell.tsx` still mutates runtime via `session.simulation.dispatch()` instead of the new session-owned `commands` and `state` surface
- updated this manager plan's execution status for the active post-integration polish wave and moved finished manager bookkeeping into `Done`
- confirmed the bounded `game-shell` join issue still exists in the live worktree even though the repo is green
- confirmed the runtime/app session bridge is already sufficient for the shell cleanup because `RuntimeSession` exposes stable `commands` and `state` surfaces
- narrowed the active final join lock to design-owned `app/ui/game-shell.tsx` and released the broader runtime/app and multi-file design polish locks
- confirmed the direct `session.simulation.dispatch()` path is still present in `app/ui/game-shell.tsx` and the shell also still pulls `phase1View` and `worldSnapshot` straight from `session.simulation`
- updated the manager recommendation from broad polish-wave wording to one final tiny bugfix pass before user testing or a new feature wave
- confirmed the final design-owned join fix landed in `app/ui/game-shell.tsx`
- confirmed the shell now consumes the session-owned `commands` and `state` bridge instead of mutating runtime directly
- confirmed the repo still passes `vp check`, `vp test`, and `vp build` after the final join fix
- cleared the last bounded implementation lock and advanced the project to user-testing and bug-bash readiness
- reviewed [docs/technical-rendering-and-assets.md](../technical-rendering-and-assets.md) for the SVG temporary-route-first requirement
- reviewed [docs/style-guide.md](../style-guide.md) for the current visual baseline
- confirmed the current SVG wave must stay operator-only and must not expand into rooms, buildings, enemies, or environments
- confirmed the repo still relies on preview SVG composition and placeholder operator-detail parts rather than a locked operator production language
- confirmed no temporary operator SVG exploration route or sandbox currently exists under `app/routes/`
- checked the live worktree and recorded the current exact operator SVG exploration lock as `render/operator-detail-svg.tsx`
- updated this manager plan for the first real operator-only SVG exploration wave and moved finished manager triage items to `Done`

## 2026-03-20 Autonomy Pivot

Phase 1 should not be built around manual raid dispatch.

Correct target:

- operators decide whether to pursue raid opportunities
- operators form groups through simulation logic
- the player manages the guild, conditions, incentives, and readiness
- raid watch remains observational

Superseded assumptions from the first Wave A pass:

- player-facing raid dispatch as a core loop
- manual operator selection for raids
- direct raid-launch UI as a Phase 1 requirement

Correction rule:

- runtime, save, and design must treat any manual-dispatch implementation from the first Wave A pass as superseded work that needs corrective follow-up before integration

Current correction status:

- runtime reports the command surface corrected for autonomy and no `sim/dispatch-raid` lock remains active
- save reports dispatch-shaped persistence assumptions corrected inside `save/`
- design replaced the superseded dispatch-centric UI with observational autonomous-operations surfaces
- the runtime-facing data and command contracts needed by save and design are now present in the repo and verified through the green check, test, and build pass

## Manager Role

The manager owns:

- sequencing
- contract lock before parallel work
- agent assignment
- merge order
- join-point review
- scope control against roadmap drift

Execution rule:

- agents do not invent new architecture during Phase 1
- the manager must stop work that crosses ownership boundaries without an explicit handoff
- the manager may record contract or ownership corrections here, but must hand them off instead of editing implementation directly

## Current Gate Status

The contract-lock serial gate is complete.

Active now:

- manager coordination for the first real SVG style-exploration wave
- the wave is limited to operator SVG exploration only
- the only exact exploration lock currently reported to this manager is `render/operator-detail-svg.tsx`
- runtime, save, content, and non-operator design implementation remain released for this wave

Not launchable yet:

- reusable operator SVG catalog expansion beyond exploration
- any production SVG work for rooms, buildings, enemies, or environments
- any broad `render/**` or route-surface expansion without an exact lock note from the design agent
- style-lock signoff; there is not yet enough side-by-side exploration evidence to choose a consistent operator SVG language

Manager rule for this wave:

- require a temporary route or sandbox before treating the operator SVG exploration as review-ready
- keep the exploration intentionally side-by-side and operator-only
- do not authorize production asset work until the operator style language is explicitly judged ready

## Operator SVG Exploration Wave

Scope for this wave:

- operators only
- temporary-route or sandbox style exploration
- side-by-side comparison of silhouette, line weight, palette, and shape language
- iterative review of exploration variants, not production catalog growth

Out of scope for this wave:

- reusable SVG catalog expansion beyond the narrow exploration surface
- room, building, enemy, or environment SVG production
- gameplay, save, content, or router ownership changes

Current route status:

- no temporary operator SVG exploration route or sandbox surface is currently present in `app/routes/`
- the repo still exposes preview SVG composition and placeholder operator-detail parts only

Current style-lock status:

- operator SVG style remains exploratory
- no consistent operator SVG language has been chosen yet

## Operator SVG Exploration Ownership Map

Active owners:

- manager owner: `docs/plans/phase-1-bodega-manager.md`
- design-owned SVG exploration owner: `docs/plans/phase-1-bodega-design.md`
  Reported exact exploration locks: `render/operator-detail-svg.tsx`
  Required next exact lock before iterative review: one temporary operator exploration route or sandbox file in a design-owned `app/routes/**` or `app/ui/**` surface
- runtime owner: [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
  Reported exact exploration locks: none; released for this wave
- save owner: [Phase 1 Save and Outcomes](./phase-1-bodega-save.md)
  Reported exact exploration locks: none; released for this wave

Manager enforcement rules:

- treat `render/operator-detail-svg.tsx` as the only active operator SVG exploration implementation lock currently visible to the manager
- do not expand into `render/svg-parts.ts`, `render/index.ts`, or any broader `render/**` surface until the design agent publishes exact additional locks
- do not reopen gameplay, save, or runtime implementation under the SVG exploration wave

## Exploration Readiness

Temporary exploration route exists:

- no

Operator SVG exploration route ready for iterative review:

- not yet; the required temporary route or sandbox with side-by-side operator variants is still missing

Consistent operator SVG language chosen:

- no; the category is still exploratory and not ready to lock

Clearance rule:

- the design agent must first publish a temporary route or sandbox and show multiple controlled operator variations side by side
- the manager can only mark the wave review-ready after that comparison surface exists
- reusable operator catalog, tagging, and composition work stay blocked until the operator style language is explicitly chosen

## Next Wave Recommendation

Current recommendation:

- complete the operator-only exploration route and iterative review inside the current design-owned SVG surface
- after this wave clears, run a narrow operator style-lock decision and only then authorize a bounded operator catalog, tagging, and composition wave

Reason:

- the required temporary route or sandbox does not exist yet
- the current operator SVG language is still exploratory
- the rendering docs explicitly block production asset work until the exploration pass is complete

## Ownership Boundaries

Current ownership boundaries for the next wave:

- manager orchestration and status tracking: `docs/plans/phase-1-bodega-manager.md`
- contract definition and lock-note work: `docs/plans/phase-1-bodega-contract-lock.md`
- design-owned operator SVG exploration: `render/operator-detail-svg.tsx`
- next required design-owned route or sandbox lock: one exact file in `app/routes/**` or `app/ui/**` once published by the design agent
- runtime and content remain released: `sim/` and `content/`
- save remains released: `save/`
- non-operator render work remains released and out of scope

Overlap prevention rules:

- do not assign the same file or registry surface to multiple agents at once
- do not assign another agent to `render/operator-detail-svg.tsx` while the SVG exploration owner holds that lock
- do not reopen `sim/**`, `save/**`, `content/**`, `render/svg-parts.ts`, `render/index.ts`, or broader `render/**` surfaces without a new exact lock note
- do not launch room, building, enemy, or environment SVG work during this operator-only wave
- treat Playwright or browser automation as a single-owner shared resource; do not launch overlapping browser-test agents without explicit coordination
- route any needed contract-name or ownership change back through this manager plan as a handoff note
- preserve the architecture split from `AGENTS.md`: ECS owns mutable gameplay state, templates own static configuration, systems own behavior, UI owns presentation and typed intents only, and save serializes state without inventing outcomes

## Design-Agent Ownership Rule

Design agents own all design-facing work, including code work when the task is design-led.

Design-owned areas:

- `app/ui`
- route presentation in `app/routes`
- `app/app.css`
- `render/`
- user-facing writing, copy, labels, narrative phrasing, and other presentation text
- SVG part search, composition, tagging, and focused-detail presentation
- canvas readability, world-surface layout, motion, and styling
- mixed visual-code tasks where splitting would cause churn

Non-design agents own:

- `sim/`
- `content/`
- `save/`
- non-visual validation and tests

Boundary rule:

- UI, SVG, and design work should be separated from runtime and save work whenever practical
- if player-facing prose lives in `content/`, runtime owns the schema and ids while design owns the prose once the contract is locked
- if a task cannot be split cleanly, the whole task should be assigned to a design agent and the required runtime or save interface should be locked first

## Execution Order

### 1. Serial gate: contract lock

No broad parallel work starts until [Phase 1 Contract Lock](./phase-1-bodega-contract-lock.md) is complete.

Required evidence to clear this gate:

- a published lock note covering approved component names
- approved ids and id prefixes for the playable Phase 1 slice
- approved command names
- approved save fields
- required validation and test gates
- manager confirmation that ownership boundaries are still clean and non-overlapping

### 2. Parallel Wave A

The serial gate is cleared. The manager may now launch:

- [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
- [Phase 1 Save and Outcomes](./phase-1-bodega-save.md)
- [Phase 1 Design](./phase-1-bodega-design.md)

Wave A launch rule:

- start with one owner per track
- do not split runtime further until its first owner declares exact file locks and stabilizes selector and command surfaces promised to other tracks
- do not launch review agents into any Wave A files until the active implementation owner releases those locks

### 3. Join point

Manager review before the next wave:

- commands are stable
- selectors and view-model contracts are stable enough for design work
- save fields cover new authoritative runtime state
- no gameplay rules leaked into UI or render code

Evidence required at the join point:

- runtime names and commands are unchanged from the contract lock or have an explicit manager-approved follow-up
- save ownership covers every new authoritative runtime owner introduced in Wave A
- design-facing selectors or view models map to locked runtime contracts rather than inventing new ones
- any ownership conflict discovered during Wave A is resolved in planning before integration work expands

### 4. Integration wave

After the join point, the manager can assign narrower integration tasks for:

- playable loop wiring
- test hardening
- balance-safe content adjustments
- bug fixing from cross-track integration

## Phase 1 Target

The next shipped milestone is the first playable bodega management loop from the roadmap, not a generic systems demo.

Minimum outcome:

- one playable bodega building instance
- room and upgrade progression through generic templates
- visitors, recruitment, staffing, and room activation
- lightweight morale and loyalty pressure
- a small mission and event pool
- autonomous raid opportunity claiming, saved outcomes, and readable watch surfaces

## Manager Checklist

- keep contract lock as the only active implementation gate until the lock note exists
- clear runtime, save, and design only within the locked contracts and narrow ownership split above
- do not start parallel implementation before lock approval
- keep design agents on all UI, SVG, and broader design-facing work
- prefer narrow file ownership and avoid giant shared registries or system files
- require tests or validation whenever new runtime owners or save fields are introduced
- require a temporary route or sandbox before operator SVG exploration can be judged review-ready
- keep the current SVG wave operator-only until the manager records a style-lock decision
- block production SVG catalog expansion for operators, rooms, buildings, enemies, and environments until the relevant category completes style exploration
- route any ownership dispute back through architecture docs before code continues
