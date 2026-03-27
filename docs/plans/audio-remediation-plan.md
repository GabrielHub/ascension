# Audio Remediation Plan

This is the fifth active implementation plan. It expands the audio layer after the player-facing state model is stable enough to score and verify cleanly.

## Start After Bodega States Are Stable

Do not start this plan until the opening flow, contract lifecycle, boss commitment flow, and major HQ management states are stable enough that audio hooks will not churn every pass.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/presentation.md`
- `docs/product/gameplay-systems.md`
- `docs/world/premise-and-tone.md`

## Locked Decisions

- Audio should increase legibility, mood, and memory, not noise.
- Music stays intimate, simple, and cohesive with the game tone.
- State changes should sound related; boss escalation should not feel imported from a different game.

## Phase 1: Audit The Current Audio Surface

Owner: audio/runtime

Tasks:

1. Build the current cue and state matrix for HQ, operations, raid exploration, boss threshold, boss commitment, boss fight, and result review.
2. Mark each state change or action as one of:
   - required informational cue
   - optional flavor cue
   - intentionally silent
3. Identify missing high-salience consequence cues first.

Done when:

- The team has a gap list instead of a vague sense that audio feels thin.

## Phase 2: Lock The Runtime Audio Contract

Owner: audio/runtime integration

Tasks:

1. Define the music-state machine for:
   - HQ ambient
   - operations ambient
   - raid explore ambient
   - boss threshold
   - boss fight
   - result or return
2. Define trigger ownership, transition rules, layering rules, and stinger rules.
3. Keep gameplay authority in runtime state. Audio reacts to state; it does not decide state.

Done when:

- Every shipped long-lived audio state has one owner and one transition contract.

## Phase 3: Remediate Required SFX

Owner: sound design

Tasks:

1. Add or revise the required informational cues first.
2. Prioritize:
   - contract board actions
   - staffing and hiring actions
   - inventory actions
   - interruption open and resolve
   - raid launch, retreat, and return
   - boss threshold, commit, phase, victory, and failure
   - severe injury and death
3. Remove redundant or fatiguing cues where silence is the better choice.

Done when:

- Major gameplay actions and consequences have reliable audible feedback.

## Phase 4: Author The First Music Family

Owner: composition

Tasks:

1. Define instrumentation limits, motif rules, harmony rules, loop length targets, and transition rules.
2. Author the first cohesive cue family for the locked music states.
3. Add small site-concept accent layers only after the shared state family works.

Done when:

- The game sounds meaningfully different in HQ, operations, raids, and boss fights without breaking tonal cohesion.

## Phase 5: Verification And Mix

Owner: QA/audio review

Tasks:

1. Verify trigger correctness and transition quality.
2. Verify long-session comfort and fatigue.
3. Verify default mix levels across the real browser path.

Done when:

- Audio supports long sessions and makes major state changes easier to read.

## Parallel Rules

- Phase 1 can run while late bodega closure work stabilizes.
- Do not author a broad cue library before the runtime audio contract exists.
- Do not start site-specific flourish work before shared state coverage is complete.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior or app integration.
- Store browser automation artifacts under `playwright/`.
