# Playtest Regression Test Plan

This document defines the next full validation pass after the remediation work. It is not only a test checklist. It is also the operating contract for the agent running the pass.

Primary companion file:

- [Playtest Regression Findings](./playtest-regression-findings.md)

## Mission

- Re-test the full shipped game surface, not just the previous bug list.
- Fix bounded issues immediately when the change is local, low-risk, and clearly correct.
- Verify each bounded fix through Playwright before moving on.
- For blockers, hard problems, likely refactors, or design-sensitive issues, write them into the findings file instead of forcing a risky patch.
- Critique the game itself, not just technical correctness: confusing UI, poor flow, pacing friction, unclear affordances, weak feedback, and how the slice feels to play should all be recorded.

## Entry Criteria

- The relevant remediation code is merged.
- `vp check` passes before the playtest begins.
- If runtime behavior, save behavior, or app integration changed, `vp test` and `vp build` pass before the playtest begins.
- Any required dev server is already running before Playwright starts.
- One agent owns the Playwright session for the whole pass.

## Execution Rules

- Prefer normal player flow first.
- Use the dev menu only after the real flow has been validated or when a rare state is otherwise too expensive to reach.
- Treat Playwright as the source of verification for UI/runtime fixes made during the pass.
- After each bounded fix, re-run the smallest Playwright path that proves the issue is resolved.
- Do not leave a fix unverified if the relevant Playwright path is available.
- When an issue needs a larger refactor, crosses ownership boundaries, depends on missing product decisions, or is too risky to patch during test execution, record it in the findings file and continue.
- Capture artifacts under `playwright/screenshots/`, `playwright/logs/`, and `playwright/artifacts/` when they materially help explain a failure.
- Record exact in-game day/time for pacing observations after the timing fix.
- Never mark an area as covered if it was only glanced at. If it was not meaningfully exercised, mark it untested.

## Fix-As-You-Go Policy

Attempt an immediate fix when all of the following are true:

- the issue is reproducible now
- the root cause is local and understandable
- the fix is bounded
- the fix does not need a new design decision
- the fix can be verified in the same session

Do not attempt an immediate fix when any of the following are true:

- the issue suggests a larger sim or save refactor
- multiple systems are implicated and the root cause is still uncertain
- the fix would likely destabilize nearby behavior
- the issue is really a design question, balance question, or UX direction change

Those go into [Playtest Regression Findings](./playtest-regression-findings.md).

## Coverage Matrix

### Start Screen And Session Entry

- Verify empty-slot `new` flow from the start screen.
- Verify occupied-slot `load` flow.
- Verify occupied-slot `delete` flow, including confirmation, deletion, and slot refresh.
- Verify sandbox entry from the start screen.
- Verify SVG tools link still routes correctly.
- Verify return-to-home from an active session reflects latest save metadata.
- Verify no obvious start-screen clarity issues around slot state, actions, or footer links.

### Session And Persistence

- Verify a new save is created in the selected slot only.
- Verify auto-save updates an occupied slot after meaningful play.
- Verify explicit load-after-save, not just home-screen metadata.
- Verify load restores:
  - resources
  - in-game time/day
  - room placement and upgrades
  - active/inactive room state
  - staff roster and assignments
  - visitors
  - inventory and equipment
  - recurring teams
  - room culture
  - active raids
  - raid history
  - event-log continuity where applicable
- Verify save/load around an active raid, not only from an idle HQ state.

### Shell, Navigation, And General UI

- Verify HQ and Operations tab switching.
- Verify category-pill behavior in each tab.
- Verify focused world selections open the expected inspection surfaces.
- Verify top-bar resources, time, and capacity indicators stay readable and correct during play.
- Verify exit/home flow does not create obvious confusion or stale state.

### HQ Rooms And Building Progression

- Verify room focus from both world click and HQ panel selection.
- Verify room activation and deactivation behavior.
- Verify building-upgrade purchase flow.
- Verify room-upgrade purchase flow.
- Verify room placement from empty slots once unlocked.
- Verify newly placed rooms appear correctly in HQ UI and world composition.
- Verify operational status, staffing requirements, load percentage, and room-culture surfaces stay coherent after room changes.

### Recruitment, Visitors, And Staffing

- Verify visitors only appear when a recruitment room is operational.
- Verify visitor concurrency follows the intended rule after remediation.
- Verify visitors appear in the actual recruitment room in the HQ world.
- Verify visitor arrival cadence feels legible after the time fix.
- Verify accept-recruit flow with available operator capacity.
- Verify reject-recruit flow removes the visitor cleanly from both UI and world state.
- Verify recruit flow is blocked cleanly when operator capacity is full.
- Verify recruit flow is blocked cleanly when the recruitment room is inactive.
- Verify staff hiring across all exposed roles, not just admin.
- Verify assign and unassign staff for valid rooms.
- Verify staff assignment respects room role requirements and room capacity.
- Verify staffing changes update room operational state and any visible feedback.

### Economy, Inventory, And Market

- Record starting cash, passive income, payroll, first raid reward, and first-contract timeline.
- Verify daily-ledger cadence after timing normalization.
- Verify market buy flow, including unaffordable states.
- Verify market sell flow.
- Verify inventory stack updates after buy/sell/loot changes.
- Verify auto-assign accessory flow.
- Verify unequip flow for each supported slot.
- Verify empty equipment slots are visibly represented.
- Verify loadout reason text remains understandable.
- Verify economy policy for negative treasury and raid launching.
- Record any economy behavior that is technically correct but still feels punishing, opaque, or degenerate.

### Raid Loop

- Verify opportunity generation and visibility.
- Verify autonomous team formation and launch.
- Verify active-raid presentation on the operations map.
- Verify focused raid details and recent event feed.
- Verify raid return and reward application.
- Verify history logging for success, mixed, and failure outcomes when reachable.
- Verify boss-defeat state and contract closure.
- Verify contract-loss state.
- Verify event-log navigation into raid surfaces where applicable.
- Verify the loop still reads as management-over-action rather than hidden chaos.

### Social, Morale, And Fallout

- Verify injuries affect roster/readiness surfaces.
- Verify recurring teams form and persist.
- Verify damaged-team state can be observed after losses.
- Verify room-culture surfaces still update and render.
- Verify morale, loyalty, and autonomy warnings appear when thresholds are crossed.
- Verify at least one departure or refusal path if reachable through normal or assisted setup.
- Verify death/departure fallout persists correctly through subsequent play and save/load when reachable.

### Event Log And Feedback

- Verify event-log unread counts, expand/collapse, and auto-scroll behavior.
- Verify clickable event entries navigate to the intended HQ or operations surface.
- Verify event timestamps look believable after the time fix.
- Verify events no longer disappear into multi-day dead zones from one manual hour click.
- Verify the game communicates important state changes without requiring the player to stare at one panel constantly.

### World Presentation

- Verify operator, staff, and visitor marker placement in HQ.
- Verify recruitment-room visitor placement specifically.
- Verify common-case label readability in HQ and raid views.
- Verify no major panel-overlap regressions between bottom panels and the event log.
- Verify camera/focus interactions still feel intentional and readable during active play.

### Critical Playtest Review

This is required even if the functional pass is clean.

- Identify confusing UI labels, panels, or badges.
- Identify places where the game hides important consequences.
- Identify flows that feel tedious, awkward, or overly passive.
- Identify pacing that feels too slow, too abrupt, or too opaque.
- Identify places where the simulation feels impressive but difficult to understand.
- Identify places where the game technically works but does not feel good to play.

These observations belong in the findings file even when they are not strict bugs.

## Required Output In The Findings File

Write all results into [Playtest Regression Findings](./playtest-regression-findings.md).

For each issue encountered, classify it into one of these buckets:

- fixed and verified in run
- blocked or deferred
- design or UX critique
- untested area

Every blocked or deferred item should include:

- severity
- reproduction steps
- why it was not fixed immediately
- likely owner or subsystem
- recommended next action

Every design or UX critique should include:

- what the player experiences
- why it is confusing, weak, or unpleasant
- whether it seems like copy, UI, systems, pacing, or broader design

## Explicit Gaps From The Previous Playtest

The prior session did not adequately prove these and this pass must call them out explicitly:

- start-screen delete flow
- explicit load-after-save verification
- sandbox route
- room placement
- multi-role staff hiring
- market buy flow
- unequip flow
- active-raid save/load persistence
- boss-defeat and contract-loss end states
- visitor world placement and room-based constraints
- critical UX and game-feel review beyond bug hunting

## Completion Condition

The pass is only complete when all of the following are true:

- every coverage area is marked passed, failed, or untested
- all bounded fixes attempted during the pass were re-verified in Playwright
- blockers and hard problems were written into the findings file
- a critical UX/game-feel review was written into the findings file

Do not end with "no findings" unless the findings file also makes it explicit which rare areas were truly exercised.
