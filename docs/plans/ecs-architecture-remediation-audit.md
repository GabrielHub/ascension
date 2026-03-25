# ECS Architecture Remediation Audit

Date: 2026-03-24

This document is an execution-focused audit of the current ECS/runtime/render/UI split against the repo rules in `AGENTS.md`, the product plan, and the implemented scope called out in [Roadmap](../roadmap.md).

## Summary

The core gameplay authority is still mostly in the right place:

- ECS owns mutable guild, roster, room, raid, event, encounter, and contract state.
- The main player-facing UI usually sends typed commands instead of mutating runtime state directly.
- Save/load appears to serialize, validate, and migrate state rather than inventing outcomes.

The architecture is still drifting in a few important places, though:

- some authoritative simulation transitions are being sequenced in React
- simulation contracts live in renderer-owned types
- renderer code depends on `app/ui`
- UI depends on `sim/systems/*` internals instead of stable runtime contracts
- presentation formulas and fallback builders are duplicating gameplay knowledge

Those leaks are manageable now, but they will get worse as Union Hall, multi-floor HQs, and deeper encounter content land.

## Findings

### P0: UI owns a gameplay-authoritative boss-encounter handoff

Files:

- [app/ui/game-shell.tsx](/Users/OngFa/Documents/ascension/app/ui/game-shell.tsx#L85)

Evidence:

- `resolveInterruptionAction()` special-cases `raid_boss_commitment`.
- The UI resolves the interruption and then separately dispatches `sim/encounter-start`.
- Dev-mode pause behavior is also layered into this UI flow.

Why this is wrong:

- The choice-to-encounter transition is gameplay authority, not UI orchestration.
- Any other surface that resolves interruptions would need to know this hidden rule.
- Tests and save-safe behavior become harder to reason about because the full transition is not owned by simulation.

Required refactor:

- Replace the two-command UI sequence with one gameplay intent.
- Preferred shape: let `sim/interruption-resolve` own the follow-up when the resolved choice is `commit`, or add a single command like `sim/commit-boss-encounter`.
- UI should only submit the chosen intent and render the resulting state.

### P0: Core sim contracts currently depend on renderer-owned types

Files:

- [sim/navigation.ts](/Users/OngFa/Documents/ascension/sim/navigation.ts#L1)
- [sim/runtime.ts](/Users/OngFa/Documents/ascension/sim/runtime.ts#L153)
- [sim/systems/raids.ts](/Users/OngFa/Documents/ascension/sim/systems/raids.ts#L57)
- [render/hq-world.ts](/Users/OngFa/Documents/ascension/render/hq-world.ts#L2)
- [render/types.ts](/Users/OngFa/Documents/ascension/render/types.ts#L23)

Evidence:

- `sim/navigation.ts` imports `NavigationGraph` and related types from `render/types`.
- `sim/runtime.ts` and `sim/systems/raids.ts` import and re-export `RaidTeamGoal` from `render/types`.
- `render/hq-world.ts` imports `buildNavigationGraph` from `sim/navigation`.

Why this is wrong:

- The ECS layer should never depend on renderer ownership for domain contracts.
- The renderer also should not have to reach into `sim/` for presentation-only nav graph assembly.
- This is a dependency cycle disguised as type sharing.

Required refactor:

- Move shared contracts out of `render/types.ts`.
- Split them into:
  - simulation/domain contracts such as `RaidTeamGoal`
  - presentation/pathing contracts such as `NavigationGraph`
- Put those in `sim/contracts` or `lib/` depending on whether they are gameplay or pure presentation.
- Move purely presentational actor-motion pathing out of `sim/` once the contract move is done.

### P1: Renderer depends on UI modules

Files:

- [render/actor-tokens.ts](/Users/OngFa/Documents/ascension/render/actor-tokens.ts#L1)
- [render/world-canvas.tsx](/Users/OngFa/Documents/ascension/render/world-canvas.tsx#L41)

Evidence:

- `render/actor-tokens.ts` imports portrait recipe helpers and shared SVG data from `app/ui/*`.
- `render/world-canvas.tsx` imports raid drawing helpers from `app/ui/raid-world`.

Why this is wrong:

- `render/` is no longer a standalone presentation layer.
- UI is acting as an unowned dependency bucket for renderer implementation details.
- Reusing the renderer outside the current React shell becomes harder.

Required refactor:

- Move portrait recipe resolution and actor token composition into `render/` or a shared presentation package.
- Move raid canvas drawing helpers out of `app/ui/raid-world` into `render/raid-world`.
- Keep `app/ui` limited to React surfaces and typed focus/callback wiring.

### P1: UI depends on `sim/systems/*` internals instead of stable simulation contracts

Files:

- [app/ui/encounter-surface.tsx](/Users/OngFa/Documents/ascension/app/ui/encounter-surface.tsx#L3)
- [app/ui/interruption-host.tsx](/Users/OngFa/Documents/ascension/app/ui/interruption-host.tsx#L1)
- [app/ui/game-shell.tsx](/Users/OngFa/Documents/ascension/app/ui/game-shell.tsx#L842)

Evidence:

- Encounter UI imports `EncounterView`, action records, intervention ids, and definitions from `sim/systems/encounter-types`.
- Interruption UI imports interruption payload types from `sim/systems/interruptions`.
- `game-shell.tsx` casts a string to `import("sim/systems/encounter-types").InterventionId`.

Why this is wrong:

- UI is coupled to internal system modules instead of a stable app-facing contract.
- Internal simulation refactors will ripple through React surfaces.
- The cast is a warning sign that the public API is incomplete.

Required refactor:

- Export encounter/interruption view contracts from the top-level `sim` package or from a dedicated stable contract module.
- Expose intervention definitions through a stable presentation-facing API.
- Remove all `app/ui` imports from `sim/systems/*`.

### P1: UI is duplicating gameplay formulas

Files:

- [app/ui/game-shell.tsx](/Users/OngFa/Documents/ascension/app/ui/game-shell.tsx#L383)
- [sim/systems/commands.ts](/Users/OngFa/Documents/ascension/sim/systems/commands.ts#L981)

Evidence:

- The visitor overlay computes `estimatedMorale` and `estimatedLoyalty` in React.
- The same recruit-starting values are computed authoritatively in `sim/accept-recruit`.

Why this is wrong:

- The formula happens to match right now, but it is still duplicated authority.
- A future tuning pass can silently desync the UI from the runtime.
- UI should render an ECS-provided preview or a clearly labeled non-authoritative description.

Required refactor:

- Add recruit-preview data to the runtime view or a dedicated preview command.
- Remove gameplay-number derivation from React components.

### P2: `sim/runtime.ts` is a boundary-smearing god module with circular-dependency workarounds

Files:

- [sim/runtime.ts](/Users/OngFa/Documents/ascension/sim/runtime.ts#L23)

Evidence:

- The file is 2562 lines long.
- It contains explicit comments about type-only re-declarations to avoid circular dependencies through the systems barrel.
- It owns bootstrap normalization, ECS entity creation, snapshot restoration, command dispatch, phase 1 view construction, and phase 2 view construction.

Why this is wrong:

- Large cross-cutting files are how architecture rules decay without anyone noticing.
- The circular-dependency workaround is already telling us the module graph is unhealthy.
- Future work will keep landing in this file because it is the path of least resistance.

Required refactor:

- Split `sim/runtime.ts` into narrower modules:
  - bootstrap/hydration
  - world snapshot export
  - phase 1 view assembly
  - phase 2 view assembly
  - encounter restore/serialization helpers
  - simulation shell / dispatch wiring
- Remove the systems barrel cycle instead of coding around it with duplicated types.

### P2: Legacy snapshot-to-view builders preserve a second truth path

Files:

- [app/ui/view-models.ts](/Users/OngFa/Documents/ascension/app/ui/view-models.ts#L1024)

Evidence:

- `view-models.ts` still contains legacy `WorldSnapshot` builders with fallback values and compatibility logic.
- The current shell already uses `buildHqViewFromPhase1()` and `buildOpsViewFromPhase1()` for the main path.

Why this is wrong:

- It keeps two UI data-shaping pipelines alive.
- Fallback-heavy mapping can hide missing ECS view fields instead of failing loudly.
- It encourages continued `save -> UI` coupling when the preferred path is `sim view -> UI`.

Required refactor:

- Delete the legacy builders once remaining tests and tooling migrate.
- Make the runtime view contract the only supported path for gameplay UI.

### P2: Runtime session still reaches upward into UI helpers

Files:

- [app/features/runtime/session.ts](/Users/OngFa/Documents/ascension/app/features/runtime/session.ts#L45)

Evidence:

- `session.ts` imports `visitorQualityToRank` from `app/ui/view-models`.

Why this is wrong:

- Runtime/session glue should not depend on UI modules.
- Even if the helper is presentation-only, the dependency direction is inverted.

Required refactor:

- Move shared presentation helpers like visitor-rank formatting to `lib/` or `render/`.
- Keep `app/ui` leaf-like.

## What Looks Good

- The stable command surface is real and broad enough to cover most gameplay mutations.
- Save/load round-tripping appears runtime-authored and state-safe.
- Router ownership still looks shell-only.
- I did not find React components directly mutating ECS component arrays or save payloads.

## Recommended Refactor Order

1. Fix the boss-commitment flow so ECS fully owns interruption-to-encounter transitions.
2. Extract shared contracts out of `render/types.ts` and remove sim-to-render imports.
3. Move renderer implementation helpers out of `app/ui`.
4. Publish stable encounter/interruption view contracts from `sim` and remove `sim/systems/*` imports from UI.
5. Replace React-side recruit formulas with simulation-owned preview data.
6. Break up `sim/runtime.ts` and remove circular-dependency workarounds.
7. Delete legacy `WorldSnapshot` UI builders once their tests are migrated.

## Suggested Target State

- `sim/`
  - ECS state, systems, commands, stable runtime view contracts, gameplay-authoritative transitions
- `render/`
  - geometry composition, actor token rendering, world canvases, raid-map drawing, pure presentation helpers
- `app/features/runtime/`
  - session lifecycle, persistence orchestration, typed command plumbing, no UI helper imports
- `app/ui/`
  - React presentation, local interaction state, typed intents only
- `lib/`
  - shared pure helpers with no ownership inversion

## Verification Notes

- `vp check` currently fails because the repo has pre-existing formatting issues in many files.
- I did not change runtime code as part of this audit; this document is the remediation brief for the next implementation pass.
