# Management Policy Surfaces Plan

This is the second active implementation plan. It adds standing management decisions that shape autonomous behavior without turning the game into direct tactics control.

## Run This After Opening Campaign Remediation

Do not start this plan until `opening-campaign-remediation-plan.md` has locked the canonical first campaign and the first-board envelope.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/presentation.md`
- `docs/world/headquarters-and-rooms.md`

## Locked Decisions

- Incidents are escalation surfaces, not the main management layer.
- Policies live in ordinary HQ management surfaces, not only in interruptions.
- Policies must influence autonomous systems; they must not replace them with per-operator tactics.
- UI exposes typed intents only. Runtime state owns the active policy.

## Phase 1: Define The Policy Contract

Owner: gameplay/design
**Status: Complete.** Deliverable: [Management Policy Contract](./management-policy-contract.md).

Tasks:

1. Lock the first required policy families:
   - contract posture
   - contract objective bias
   - recovery triage
   - staffing priority
   - roster flow
2. Define the runtime data shape, defaults, persistence rules, and player-facing explanation for each policy.
3. Decide whether a lightweight social lever is needed now or deferred pending playtest.

Done when:

- Each policy has a clear effect, a clear owner system, and a clear UI surface.

## Phase 2: Wire Policies Into Runtime Systems

Owner: gameplay/ECS

Tasks:

1. Route policy effects into raid autonomy, recovery rules, staffing logic, and roster flow.
2. Keep all policy outcomes deterministic and inspectable.
3. Prevent React state or routing state from becoming the policy authority.

Done when:

- Changing a policy creates observable differences in autonomous outcomes and event-log feedback.

## Phase 3: Add HQ Management Surfaces

Owner: UI/gameplay integration

Tasks:

1. Place policy controls in existing HQ card patterns.
2. Show the current policy, expected tradeoff, and any cooldown or commitment rule before the player confirms.
3. Add event-log and roster feedback that explains what changed because of the selected policy.

Done when:

- A player can discover, change, and understand each shipped policy without opening a debug surface.

## Phase 4: Pressure-Test The Decision Layer

Owner: gameplay/QA

Tasks:

1. Verify that early bad runs point back to adjustable policy choices, not only to raw stat deficits.
2. Verify that policies matter between incidents.
3. Verify that incidents still feel like escalations on top of standing management.

Done when:

- The game reads as a management sim with standing policy decisions, not as a passive simulator with occasional interruptions.

## Parallel Rules

- Policy-definition work can run in parallel with the static ledger work from the balance harness.
- Do not add optional social policy until the required policy set has been tested.
- Do not add combat micro-controls under the label of policy.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.
