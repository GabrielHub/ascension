# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Current State

The Porter's-era gameplay baseline is shipped, and the Porter's HQ package is now grounded in real building-specific assets rather than bodega placeholders. Remaining HQ environment work should stay narrow and contract-driven instead of reopening broad package-grounding plans. The skyscraper HQ baseline, the first C-rank endgame-entry band, the four-step skyscraper floor expansion arc (Nightlife, Specialist Training, Executive, Penthouse), and the Executive Floor institutional-pressure slice are all shipped and folded back into the roadmap.

There are seven active checked-in plans right now:

- [Skyscraper HQ Asset Foundation](./skyscraper-hq-asset-foundation.md) — prerequisite work for the tower package: scene-builder support, shell sizing, and elevation-band definition before room-scene production
- [Rival Guild Definition And Asset Plan](./rival-guild-definition-and-asset-plan.md) — define the first rival guild packet, portrait/branding direction, and stable rival ids before the broader skyscraper rival-pressure gameplay refactor depends on them
- [Skyscraper Rival Pressure Refactor](./skyscraper-rival-pressure-refactor.md) — collapse tower-end public pressure into one lighter lane, promote rival guild leaders into the main endgame-pressure surface, and keep skyscraper pressure meaningfully room-gated
- [Operations UI Cascade Refactor](./operations-ui-cascade-refactor.md) — apply the same right-anchored cascading panel model to Contracts, Active, Opportunities, and History so Operations no longer depends on the older monolithic bottom-panel composition
- [Persistent Guidance And Rewarded Tutorial Plan](./persistent-guidance-tutorial-plan.md) — replace one-off onboarding with a modern idle-game-style, always-on, rewarded narrative objective system that teaches every major feature through the climb into the repeatable skyscraper endgame
- [Narrative Event Presenter Remediation](./narrative-event-presenter-remediation.md) — tighten presenter ownership so every narrative beat, including AI-framed incidents, resolves to a domain-correct presenter with presenter-specific voice rules
- [Operator And Staff Remediation](./operator-and-staff-remediation.md) — collapse generic staff into the presenter roster, add presenter HQ walkers, and refactor operator combat into a rank-gated block-chain model

The HQ UI Cascade Refactor shipped: HQ now uses one right-anchored cascading panel stack for rooms, people, management, teams, inventory, and market. Room slots, staff assignment, visitor recruitment/replace, and the floor switcher all run through the cascade or a floating HQ-world control, so the plan has been retired.

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Next Planning Trigger

Check in a new plan only when a concrete execution slice is ready to start beyond the current active stack, for example:

- a specific HQ backdrop-package cleanup tied to skyscraper elevation-band reuse
- a concrete B-rank or A-rank content packet after the C-rank bridge is stable
- a later narrow AI content-breadth pass on top of the shipped optional runtime layer

Do not add another broad umbrella plan when a narrower active execution slice is enough.

## Sequencing Notes

- Phase 4 midgame breadth is shipped and should now be treated as the baseline under test, not as an open-ended content queue.
- The retired midgame remediation pass was verification-first work: browser depth, readability fixes, and balance-table tuning rather than new mechanics or broad new content.
- Use browser automation as the primary fast regression surface for the canonical Porter's loop.
- Use deterministic reports and focused harnesses where browser coverage is too coarse to prove economy or reward-envelope stability.
- Treat Porter's follow-on HQ work as targeted room or contract cleanup, not as a still-missing package-grounding phase.
- Treat the skyscraper as the final headquarters. Later planning should deepen that building's floor expansion, rank ladder, and pressure loops rather than introduce a fourth HQ.
- Sequence the presenter-remediation plan after the remaining skyscraper expansion-floor consequence slices. It should tighten narrative ownership and AI framing once the current tower content surface is stable enough to audit in one pass.
