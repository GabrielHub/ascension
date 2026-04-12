# Phase 4 Midgame Manager Plan

This is the active manager plan for the next roadmap section: Phase 4 midgame systems and content. It keeps the work ordered, keeps ownership boundaries clear, and prevents Phase 4 from turning into another broad foundation rewrite.

## Goal

Make the world push back on the shipped Porter's baseline through deterministic city pressure, real midgame content breadth, richer gear crafting, heavier social fallout, and deeper encounters.

Phase 4 is complete when Porter's no longer feels like a passive capacity increase and the player is managing a real midgame guild under outside pressure.

## Canon Inputs

- `docs/roadmap.md`
- `docs/product/index.md`
- `docs/product/gameplay-systems.md`
- `docs/product/content-taxonomy.md`
- `docs/world/index.md`
- `docs/world/premise-and-tone.md`
- `docs/world/attunement-and-ranks.md`
- `docs/world/guilds-and-dungeons.md`
- `docs/world/operators-and-staff.md`
- `docs/world/content-rules.md`

## Locked Phase Decisions

- Phase 4 stays inside the shipped Porter's campaign tier. Do not start the next headquarters tier here.
- ECS, templates, and save code own every new gameplay rule. UI only owns presentation and typed intents.
- Districts become first-class content and save state.
- External actors use one `FactionTemplate` registry. City institutions and rival guild pressure share the same external-pressure contract.
- Reputation remains the single public-facing guild credibility resource. Do not add a separate public-opinion meter.
- Midgame crafting uses stackable inventory materials and authored recipe families. Do not add a new guild-wide crafting currency in Phase 4.
- Durable gear crafting requires a dedicated Porter's workshop room. The Prep Room remains the consumable and staging room.
- Porter's needs a dedicated content-remediation pass. Existing D-rank footholds in data are not enough to count as a real midgame content layer.
- Rank escalation needs a locked tonal and visual progression rule: grounded and local at F/E, stranger and less physically plausible by C/B, and fully spectacular by A/S.
- AI remains out of scope for execution until the deterministic payloads in this phase are stable.

## Required Order

Phase 4 landed in this order:

1. `phase-4-midgame-contract-lock-plan.md` (done)
2. `phase-4-midgame-city-pressure-plan.md` (done)
3. `phase-4-midgame-content-remediation-plan.md` (done)
4. `phase-4-midgame-crafting-plan.md`
5. `phase-4-midgame-social-incident-plan.md`
6. `phase-4-midgame-encounter-plan.md`

Current remaining order:

1. `phase-4-midgame-social-incident-plan.md`
2. `phase-4-midgame-encounter-plan.md`

## Why This Order Is Locked

- Contract lock is first because districts, factions, workshop ids, save fields, and recipe contracts are shared across every later slice.
- City pressure is second because contracts, incidents, and district-linked rewards all need a stable external-pressure state model.
- Content remediation is third because the rest of Phase 4 needs real midgame operators, dungeons, bosses, loot families, and tonal progression targets to build against.
- Crafting is fourth because it should consume the real midgame site and material content instead of placeholders.
- Social fallout is fifth because it should react to the real district, faction, casualty, and workshop-era states.
- Encounter expansion is last because it should target the final reward and content model, not a moving baseline.

## Ownership Map

- Manager ownership:
  - `docs/plans/phase-4-midgame-manager-plan.md`
  - `docs/plans/index.md`
  - merge order
  - lock tracking
- Contract lock ownership:
  - shared template ids and types
  - save and runtime contract fields
  - stable naming and file targets
- City pressure ownership:
  - district and faction templates
  - city-pressure ECS state
  - contract-board generation and UI
- Content remediation ownership:
  - midgame site concepts
  - enemy families
  - bosses
  - operator breadth
  - recruitment weight tables
  - non-crafted item breadth
  - tonal and visual escalation contract
- Crafting ownership:
  - workshop room and upgrade
  - durable recipe families
  - district-material loop
  - economy verification
- Social ownership:
  - events
  - incidents
  - social fallout
  - interruption and event-log surfaces
- Encounter ownership:
  - raid and encounter runtime
  - intervention library
  - transcript/debug tooling

## Merge Rules

- Do not merge any slice that changes template ids, save fields, or runtime-facing type names before the contract-lock plan lands.
- Do not start broad content authoring before city pressure lands. District and faction tags must be real before new content packets are authored against them.
- Do not let encounter work invent reward or material assumptions that conflict with the crafting plan.
- Do not let content work define authority fields in UI files.

## Verification Gates

- After each merged slice: `vp check`
- After any slice that changes runtime behavior, saves, or integration: `vp test`
- After any slice that changes app/runtime integration: `vp build`

## Exit Criteria

- District and faction state materially shape contract generation and fallout.
- Porter's has a real midgame content layer instead of isolated higher-tier templates.
- The rank ladder has a locked visual and tonal progression from grounded to surreal.
- Porter's supports durable gear crafting through a staffed workshop.
- Social fallout reacts to deaths, contract failures, district scrutiny, and room culture with real gameplay consequences.
- Boss and encounter content breadth is materially larger, with better deterministic debug coverage.

## Execution Status

### File Locks

- None. This manager plan should not take broad feature-file locks.

### In Progress

- None.

### Blocked

- `phase-4-midgame-social-incident-plan`
- `phase-4-midgame-encounter-plan`

### Done

- `phase-4-midgame-contract-lock-plan`
- `phase-4-midgame-city-pressure-plan`
- `phase-4-midgame-content-remediation-plan`
- `phase-4-midgame-crafting-plan`
