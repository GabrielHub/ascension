# Guide Event Requirements

This file owns the authoring contract for guide objectives — the always-on persistent guide card and the blocking tutorial beats it can promote into. Read [Narrative Event Requirements](./narrative-events.md) for the parallel contract on AI-framed pressure events. Read [World Foundation](../world/index.md) for tone.

Guide events are the player's "what's next" surface. They drive the early game (zero-state opening through Unique tier), then taper. After taper, the long-tail goals are recruiting Unique operators and beating rivals.

## What Makes A Complete Guide Event

A guide event ships with:

1. **Identity** — id, presentation mode, presenter binding (when blocking).
2. **Action contract** — what the player must do, with progress counter when multi-action.
3. **Completion detector** — authoritative signal the simulation watches for.
4. **Reward bundle** — cash, reputation, or weapon-box payout sized to fund the next required step.
5. **Authored copy** — title, instruction, completion-flavor text. AI framing optional for variation.

## Identity

- `id`: stable id in the form `guide-event/{slug}` (e.g. `guide-event/recruit-three`).
- `presentationMode`: one of:
  - `persistent` — small always-visible card with the current objective. Default mode after the opening.
  - `blocking` — full-screen tutorial that physically prevents other actions until completed. Used for mandatory opening beats and any moment where letting the player wander would break the teach.
- `presenter`: required for `blocking` events. Bound following the domain ownership rules in [Operators And Staff](../world/operators-and-staff.md). Optional for `persistent` events; when bound, surfaces a small portrait crop on the card.

## Action Contract

- Single-action steps: declare a single completion predicate.
- Multi-action steps: declare a progress counter (`0/N`) over a chained set of identical actions. Examples: "recruit 3 operators", "kill 5 enemies", "equip 3 weapons". The card displays the counter.
- **No consecutive same-type steps.** If two adjacent steps would both be "recruit one operator," collapse them into a single multi-action step with `0/2`. The chain rule prevents the guide from feeling like spam.
- Predicates evaluate against authoritative ECS state, never UI state.

## Completion Detector

- Driven by typed gameplay events emitted by the simulation. Examples: `OperatorRecruited`, `ContractCompleted`, `BossDefeated`, `RoomTierUpgraded`, `WeaponEquipped`.
- The guide system must not infer completion by polling UI or scraping panel state.
- Already-satisfied conditions auto-complete on guide load (e.g. "buy first floor" auto-completes if the player already owns the floor — useful for save reloads).

## Reward Bundle

Reward sizing principle: **each reward almost exactly covers the next required spend**. Player feels constant forward motion, never sits on excess cash.

- `cash`: granted on every step. Sized to fund the next mandatory spend.
- `reputation`: granted only on steps where the *next* step requires significant reputation. This is a safeguard against the player having spent reputation down. Gameplay (contracts, raids) continuously generates reputation independent of guide rewards.
- `weaponBox`: optional, mid-to-late game only. A randomized weapon drop pulled from a per-rank loot table.

The mid-to-late game **grind transition point** is chosen by the `rewrite/guidance-system` executor. After that point, rewards stop fully covering the next spend; the player must run contracts to bridge the gap. Game must not feel harsh before this transition.

Rewards route through authoritative systems, save-safe, and deterministic. UI does not "grant" rewards directly.

## Authored Copy

Every guide event ships authored seed copy:

- `title`: short objective title (≤80 chars).
- `instruction`: 1–2 sentences explaining what to do *and why it matters now* in the world's voice.
- `completionFlavor`: one sentence on completion claim.

For `blocking` events, copy is in the bound presenter's voice at their current expression. AI framing may vary the prose at runtime; the structured payload (action, reward, completion detector) does not change.

## Mandatory Opening Beats

The first five beats are **locked authored content** and must ship as-is:

| # | Mode | Action | Reward Family |
|---|---|---|---|
| 1 | blocking | Welcome / guide intro | starting cash for next step |
| 2 | blocking | Recruit all 3 starter operators (`0/3`) | cash for next floor |
| 3 | blocking | Buy the floor that unlocks Operations Management + Team Staging | cash for first contract bid |
| 4 | blocking | Pick first contract → run raid → reach boss → COMMIT → win | cash + reputation |
| 5 | blocking | Buy the floor that unlocks the Workshop | cash for next floor |

The first raid is **unloseable** by design — starter operators ship pre-equipped with rank-F weapons and the dungeon is tuned to guarantee a win. The full opening implementation lives in `rewrite/guidance-system`.

## Sequence After The Opening

Order of subsequent room/floor unlocks is **narrative-driven** and authored in `rewrite/guidance-system`. The only hard constraint: a room must be unlocked before the guide can reference its feature.

## Save-Safety And Replay

- Completed guide events do not replay on save load.
- Pending guide events restore in the same state.
- A new game after a previous completion still runs the full guide. The opening beats are mandatory every campaign.
- Bad-state recovery (no operators left + insufficient cash) re-seeds free or near-free lower-rank visitors via the recruitment system, not via the guide. The guide picks up wherever the player is in the chain.

## Pointer Indicator

Blocked-tutorial steps render a hovering pointer above the room the player must click next, drawing attention on the canvas. This is part of the guide UI shell, not part of individual event authoring.

## Validation

The guide registry rejects any event that:

- has an unsupported presentation mode
- is `blocking` but missing presenter binding
- has multi-action progress with `N < 2`
- has consecutive identical steps that should have been chained
- has a reward bundle missing cash (every step grants at least cash)
- has rewards routed through UI rather than authoritative systems

## Authoring Workflow

1. Identify the player verb being taught and check the chain rule (no consecutive same-type).
2. Lock the action contract (single or multi-action with counter).
3. Define the completion detector against typed simulation events.
4. Size the reward to fund the next required spend.
5. Bind a presenter if `blocking`.
6. Write authored seed copy.
7. Slot into the authored chain in the order locked by `rewrite/guidance-system`.
8. Validate via `vp test`.
9. Promote into the guide registry.
