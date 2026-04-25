# Narrative Event Requirements

This file owns the authoring contract for narrative events. Read [World Foundation](../world/index.md) for tone and presenter voice. Read [Content Taxonomy](./content-taxonomy.md) for ID and tag formats. Read [Rival Guild Creation](./rival-guilds.md) for rival-event authoring (rival moves are events too).

Narrative events are simulation-owned decision moments that pause the sim and ask the player to choose. They sit on top of pressure signals, not bolted-on UI popups. Every event is structured authored data; AI writes the prose wrapper but never picks the trigger, choices, or outcomes.

## What Makes A Complete Narrative Event

A narrative event is only complete when all four parts ship together:

1. **Identity** — id, family, presenter, subject binding rules.
2. **Trigger contract** — pressure source, weighted-selection inputs, cooldown, recency suppression, required runtime context.
3. **Choices** — 2 or 3 authored choices, each with a deterministic effect bundle, label, description, consequence summary, and resolution summary.
4. **AI framing slot** — the schema the AI fills in (title, briefing, per-choice prose) is allowed to vary, but the structured payload is fixed.

Identity plus choices alone is incomplete. An event without effects, presenter binding, or trigger context fails validation and cannot fire.

## Event Identity

- `id`: stable id in the form `event/{family}/{slug}` (e.g. `event/morale_collapse/sasha-shaken`).
- `family`: a `pressure:` or `event:` family tag. Current families:
  - `morale_collapse` — operator morale broke after a hard run
  - `loyalty_drift` — operator loyalty trending down
  - `team_friction` — persistent social tie went bad
  - `recovery_setback` — injury recovery hit a snag
  - `recruitment_pass` — visiting operator decided to leave the queue
  - `room_incident` — something went wrong in a specific room
  - `operator_death` — true death after end-of-raid cheat-death roll failed
  - `contract_complication` — active contract introduces a snag
  - (room-specific families authored as rooms catalog locks)
- `tags`: standard taxonomy tags for filtering and selection weight. Required tags: `event:*`, `presenter:{slug}`, optionally `room:{name}` if room-bound.

## Presenter Binding

- Every event must bind to exactly one presenter.
- The presenter is the in-world voice delivering the briefing. AI-framed prose honors the presenter's voice brief at their current expression (`neutral`, `concerned`, `serious`, `amused`).
- Domain ownership rules live in [Operators And Staff](../world/operators-and-staff.md). When two domains overlap, pick the presenter whose domain *caused* the beat to surface.
- `operator_death` events bind to the doctor or compliance officer presenter, depending on context.

## Subject Binding

- Events bind to one or more concrete runtime subjects: a specific operator, a specific room, a specific team, a specific contract.
- Subject ids resolve from runtime ECS state at trigger time. Authored events declare the subject *kind* required, not specific ids.
- Required subject kinds:
  - `operator_death` requires one or more dead operator ids
  - `team_friction` requires two operator ids on the same team with a notable tie
  - `room_incident` requires a room id
  - others as appropriate per family
- Events without their required subject kinds available cannot fire.

## Trigger Contract

- `pressureSource`: which simulation pressure feeds this event family. Accepted: `morale`, `loyalty`, `injury`, `team_cohesion`, `contract_pressure`, `recruitment_queue`, `raid_resolution`. (Public-pressure, faction-pressure, and room-culture sources are dropped from the new game; do not author against them.)
- `weight`: positive selection weight when the family fires.
- `cooldownTicks`: minimum ticks before this exact event can fire again.
- `recencyWindowTicks`: window during which a recent firing of the same family suppresses repeat triggers.
- `noveltyBonusTicks`: optional weight bump for events that have not fired in a long time.
- `requiredContext`: predicate the simulation evaluates on candidate runtime state (e.g. "operator's morale has dropped two thresholds in the last 3 days").

## Choices

- 2 or 3 choices per event. Never 1. Never 4 or more, except `operator_death` acknowledge-only events.
- Each choice has:
  - `choiceId`: stable per-event id
  - `label`: short button label (≤60 chars)
  - `description`: one-sentence managerial action description
  - `consequenceSummary`: one sentence summarizing the deterministic effects
  - `resolutionSummary`: one sentence past-tense aftermath (used in event log)
  - `effects`: at least one deterministic `EventEffect`
- All choice prose is rewritten by AI at trigger time, but the structured payload is the source of truth.

## Effect Kinds

Allowed effect kinds (target = `guild`, `team`, `operator:{id}`, or `room:{id}`):

- `morale_delta`
- `loyalty_delta`
- `treasury_delta`
- `reputation_delta`
- `team_cohesion_delta`
- `contract_pressure_delta`
- `injury_progress_delta`
- `recovery_progress_delta`
- `notable_tie_change` (creates, strengthens, weakens, or removes a persistent tie)

Dropped effect kinds — do not author against them: `intel_delta`, `public_pressure_delta`, `faction_relationship_delta`, `room_culture_delta`.

## AI Framing Contract

The structured payload locks. AI writes:

- `title` — ≤80 chars
- `briefing` — 2–4 sentences, ≤520 chars, in the bound presenter's voice at current expression
- per-choice `label` (≤60 chars), `description`, `consequenceSummary`, `resolutionSummary`

AI never invents new operators, rooms, choices, effects, or hidden state. AI never picks the presenter, family, trigger, or subject. AI is variation on top of fixed gameplay structure.

If AI generation fails or is disabled, the event falls back to authored seed copy stored alongside the event template.

## Save-Safety

- Pending events are save-safe. A reload restores the same unresolved event with the same choices and the same already-generated AI framing.
- Resolved events log to the event log with their `resolutionSummary`.

## Operator-Death Events

Operator-death events are a special case of the framework, not a separate system.

- Triggered at end-of-raid after the cheat-death roll fails for one or more operators.
- Bind to the dead operator(s) as subjects. Multiple deaths from the same raid may batch into one event with multiple subjects, or fire sequentially — implementation detail.
- Presenter binds to doctor or compliance officer.
- Choice mechanic is optional. "Acknowledge and continue" is the minimum interaction and may be a single acknowledge action with no gameplay effect. Authored events may instead add 2-3 memorial choices ("hold a service") with morale/loyalty effects.
- AI framing rules apply identically.

## Authoring Workflow

1. Identify the family and pressure source. If the family does not exist in §"Event Identity", propose adding it before authoring.
2. Lock the trigger contract (weight, cooldown, recency, required context, required subject kinds).
3. Lock 2 or 3 choices with deterministic effect bundles. Effects must use only allowed kinds.
4. Bind a presenter using the domain ownership rules.
5. Write authored seed copy (title + briefing + per-choice text) for the AI-disabled fallback.
6. Validate that the event fires, resolves, and saves through `vp test` coverage in `rewrite/narrative-events`.
7. Promote into the event registry.

## Validation

The event registry validation rejects any event that:

- has an unsupported family
- is missing presenter binding
- has fewer than two or more than three choices, unless it is an `operator_death` acknowledge-only event
- has a choice with no effects, unless it is the acknowledge action on an `operator_death` event
- has an effect using a dropped or unsupported kind
- has missing seed fallback copy
- has an empty or contradictory required-context predicate

## Cadence Rules

- Cadence is bounded by AI generation time. The narrative event system never fires faster than AI can produce framing (with AI-disabled fallback applying immediately).
- HR room tier upgrades reduce negative event frequency. This is the natural taper as the player moves into rival-driven endgame.
- Endgame mixes narrative events with rival random events. Both use the same framework.
