# Audio Remediation Plan

This is the fifth active implementation plan. It remediates and expands the shipped audio layer from the current browser-first baseline instead of starting from zero.

The repo already contains:

- an audio engine, settings volume controls, and an audio playground
- a starter synthesized SFX catalog
- a global intermittent music scheduler
- cue emission from shell navigation, runtime-session command diffs, and simulation-owned raid/event systems

This plan exists to turn that starter layer into a complete, state-owned, reviewable audio contract for the shipped bodega and shipped Porter's entry slice.

## Start After These Surfaces Are Stable

Do not start this plan until these surfaces are stable enough that audio hooks will not churn every pass:

- opening guidance and interruption payload shapes
- contract lifecycle states: bidding, active site, resolved review
- boss-threshold, boss-commitment, and live encounter handoff
- relocation flow into Porter's and Porter's starter-room layout
- current HQ floor-selection and room-state presentation hooks

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/presentation.md`
- `docs/product/gameplay-systems.md`
- `docs/product/asset-production.md`
- `docs/world/premise-and-tone.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/guilds-and-dungeons.md`
- `docs/world/operators-and-staff.md`

## Locked Decisions

- Audio should increase legibility, mood, and memory, not noise.
- Music stays intimate, simple, and cohesive with the game tone.
- State changes should sound related; boss escalation should not feel imported from a different game.
- The top-level cue namespace stays locked: `hq.*`, `room.*`, `staff.*`, `operator.*`, `raid.*`, `event.*`, `ambience.*`.
- Add new leaf ids under those families only. Do not invent new top-level audio families.
- Long-lived music and ambience must be derived from shipped shell and runtime state. Audio never owns gameplay authority.
- Debug-only controls may stay silent unless they mirror a real player-facing state change.
- First-pass coverage must include shipped Porter's and relocation surfaces, not only the original bodega slice.
- All new cues, ambience layers, and music states must pass through the audio playground and human review before default promotion.

## Current Baseline And Likely Gaps

Treat these as the current baseline unless the Phase 1 audit proves otherwise:

- The shipped starter catalog is discrete SFX only. The engine supports `ambience.*`, but no approved long-lived ambience cues ship yet.
- The current music layer is global and non-stateful. It does not yet distinguish HQ, operations, raids, boss tension, or result review.
- Existing cue coverage is strongest for room placement, staffing, recruitment resolution, raid lifecycle, boss encounter beats, visitor arrival/dismissal, and pressure events.
- Existing cue coverage is thin or absent for contract-board actions, floor switching, inventory and market actions, consumable prep, relocation beats, generic incident/guidance/interruption presentation, and other Porter's-specific management surfaces.

## Phase 1: Build The Coverage Matrix

Owner: audio/runtime

Tasks:

1. Build one audio coverage matrix row for every current player-facing surface.
2. Each row must include:
   - surface name
   - trigger owner
   - trigger source file or system
   - current cue or music state, if any
   - required informational cue, optional flavor cue, long-lived ambience or music, or intentionally silent
   - proposed cue id or ambience id
   - priority
   - test owner
   - silence rationale when the row is intentionally silent
3. Audit HQ shell and HQ management surfaces:
   - entering HQ and leaving HQ via shell tab changes
   - room placement, room activation and deactivation, and room upgrade purchase
   - building upgrade purchase
   - floor switching in multi-floor HQs
   - visitor arrival, timeout departure, defer, reject, dismiss, accept, and replace
   - staff hire and assignment changes
   - inventory and market actions: buy, sell, auto-assign accessory, unequip
   - prep-consumable actions in Porter's
   - relocation readiness, relocation offer, relocation confirmation, and relocation landing beats
4. Audit operations and raid surfaces:
   - contract bidding, contract secured, contract result review, and advance-to-next-cycle actions
   - new raid opportunity surfacing
   - raid launch, active raid exploration, retreat or failure return, and successful return
   - boss threshold, boss commitment, boss retreat choice, encounter start, phase shift, summon, victory, and failure
   - post-encounter or post-contract decompression states
5. Audit event and interruption surfaces:
   - pressure-event surfacing
   - generic incident open, resolve, and dismiss beats
   - guidance and presenter-backed interruption beats
   - boss-commitment interruption open and resolve
6. Cross-check the matrix against the current trigger owners in:
   - `app/ui/game-shell.tsx`
   - `app/features/runtime/session.ts`
   - `sim/systems/visitors.ts`
   - `sim/systems/events.ts`
   - `sim/systems/raids.ts`
   - `sim/systems/encounter-commands.ts`

Done when:

- Every current player-facing audio-relevant surface is listed exactly once with one owner.
- No row is left as "decide later" or "probably silent."
- The team has a real gap list instead of a vague sense that audio feels thin.

## Phase 2: Lock The Runtime Audio Contract

Owner: audio/runtime integration

Tasks:

1. Define a selector-owned audio state model with:
   - discrete one-shot cues
   - one primary long-lived music state
   - one optional state-derived ambience layer
   - optional short stingers or accent overlays
2. Keep ownership explicit:
   - shell-owned navigation and context cues stay shell-owned
   - runtime-session diff cues stay runtime-session-owned
   - autonomous raid, encounter, event, and interruption consequences stay simulation-owned
3. Lock namespace usage for future expansion:
   - `hq.*` for HQ shell, management, market, relocation, and other HQ-wide surfaces
   - `room.*` for room placement, activation, and room-scoped structural changes
   - `staff.*` and `operator.*` for personnel outcomes
   - `raid.*` for contract lifecycle, raid lifecycle, boss escalation, and result beats
   - `event.*` for pressure, incidents, guidance, and interruption alerts
   - `ambience.*` for long-lived beds, music states, and accent layers
4. Define the first-pass long-lived state family for:
   - HQ home and management
   - operations board and result-review context
   - active raid exploration
   - boss-threshold tension
   - live boss encounter
   - return or decompression state
5. Keep shared-state coverage ahead of flavor depth:
   - lock shared HQ, operations, raid, and boss states first
   - layer building identity, time-of-day identity, and site-concept identity only after shared states work
6. Lock silence rules now:
   - settings volume changes stay silent
   - no-op and failed commands stay silent
   - encounter pause, resume, step, and other dev-only debug controls stay silent unless they become player-facing later

Done when:

- Every one-shot family and every long-lived state has one owner and one namespace.
- The implementer does not need to guess where a new cue id belongs.
- The audio layer still reacts to state; it does not decide state.

## Phase 3: Remediate Required SFX

Owner: sound design/runtime

Tasks:

1. Revise any shipped starter cue that fails legibility, tone, or fatigue review.
2. Fill required missing SFX in this order:
   - contract board and result-review actions
   - HQ management actions with real consequence
   - recruitment and staffing funnel actions
   - inventory, market, equip, and prep actions
   - interruption, incident, and relocation beats
   - raid launch, return, failure, death, and boss escalation beats
   - boss-encounter transitions and outcomes
3. Use silence deliberately:
   - if the event log already carries enough information, silence can win
   - but that silence must be recorded in the matrix, not left implicit

Done when:

- Every required matrix row has a cue id and a trigger owner.
- Major gameplay actions and consequences have reliable audible feedback.
- High-salience negative outcomes are never silent by accident.

## Phase 4: Author The First Music And Ambience Family

Owner: composition

Tasks:

1. Define instrumentation limits, motif rules, harmony rules, loop or phrase targets, and transition rules.
2. Replace the current global non-stateful music behavior with state-aware playback for the locked long-lived states.
3. Author the first shared family for:
   - HQ
   - operations
   - raid exploration
   - boss tension and boss encounter
   - post-result decompression
4. Only after the shared family works, add small accent layers for:
   - bodega versus Porter's identity
   - sunrise, day, sunset, and night presentation states
   - site-concept raid color when it helps rather than distracts

Done when:

- The game sounds meaningfully different in HQ, operations, raids, boss fights, and result review without breaking tonal cohesion.
- Building-specific and time-of-day accents enrich the shared family instead of replacing it.

## Phase 5: Verification And Mix

Owner: QA/audio review

Tasks:

1. Verify every coverage-matrix row on the real browser path.
2. Verify all promoted sounds in the audio playground before default rollout.
3. Add or update automated tests for any new cue-owner path:
   - shell-owned cue or music selectors
   - runtime-session diff cues
   - simulation-owned autonomous cues
4. Verify save safety:
   - cue queues are never persisted
   - long-lived music and ambience states are re-derived from restored runtime state rather than saved directly
5. Verify long-session comfort, fatigue, relative mix, and transition quality across:
   - bodega HQ
   - Porter's HQ
   - operations board
   - raid exploration
   - boss encounter
6. If browser automation is used, store artifacts under `playwright/`.

Done when:

- Audio coverage is closed against the Phase 1 matrix.
- Audio supports long sessions and makes major state changes easier to read.
- The implementation is save-safe and browser-verified.

## Implementation Rules

- Do not author a broad cue library before the runtime audio contract exists.
- Do not start building-specific or site-specific flourish work before shared lifecycle coverage is complete.
- Do not leave contract-board, inventory, prep, relocation, or interruption surfaces out of scope just because the starter cue catalog did.
- Do not create a second audio taxonomy outside the locked root namespaces.
- Do not put gameplay branching in audio selectors.
- Do not require Tauri validation unless a change actually touches desktop-host behavior. Browser mode remains the primary audio regression surface.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior or app integration.
- Store browser automation artifacts under `playwright/`.
