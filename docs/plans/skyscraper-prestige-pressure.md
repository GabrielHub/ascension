# Skyscraper Prestige Pressure

## Intent

Turn the Executive Floor into a real institutional-pressure surface so endgame difficulty comes from being a visible institution — regulators, rival guilds, faction sponsors, and public exposure — not just bigger raid numbers.

This slice wires the consequences of already-shipped Executive Floor rooms (Executive Office, Compliance Office, War Room) into the existing city-pressure, faction, and incident systems, and adds the first skyscraper-gated incident templates that layer on top.

## Why This Slice Exists

- The skyscraper is the final headquarters. Endgame difficulty has to come from somewhere the building actually owns.
- The Floor Expansion slice shipped the Executive Floor rooms as empty shells in `content/templates/rooms.ts`. They carry ops/admin tags but no simulation consequences yet.
- The faction, city-pressure, and incident systems already support building-gated incidents (`requiredBuildingIds`), room-preferred incidents (`preferredRoomTemplateIds`), institutional trigger families (`compliance_pressure`, `faction_pressure`, `sponsor_demand`, `district_fallout`), and a scandal category set (`licensing_audit`, `labor_safety`, `regulatory_scrutiny`, `borough_hearing`, `district_backlash`). Zero skyscraper-gated incidents exist today — every current `requiredBuildingIds` value is `"building/bodega"`.
- The world foundation names the Executive Floor as _"where the guild deals with the institutional pressure that comes with being a recognized player."_ This slice delivers on that framing.

## Scope

- **New skyscraper-gated incident templates** that reuse existing `triggerFamily` values (`compliance_pressure`, `faction_pressure`, `sponsor_demand`, `district_fallout`, `rival_poaching`) and existing scandal categories. Each sets `requiredBuildingIds: ["building/skyscraper"]`.
- **New pressure tags** added to the existing `pressure:*` vocabulary: `pressure:rivalry`, `pressure:exposure`, `pressure:prestige`. Not a parallel system.
- **Extend `ConsequenceKind`** with `faction_standing_delta` and `faction_scrutiny_delta`. Broaden `ConsequenceEffect.targetRef` to accept a `"faction:<id>"` form. Route writes through the existing `applyCityPressureOutcome` delta code in `city-pressure.ts` so faction snapshot shape is unchanged.
- **Executive Floor room consequence wiring** in the Porter's hardcoded-template-id idiom:
  - `room/executive_office:tier_1` — when operational, multiplies faction-standing gains from contract outcomes (applied in `raids.ts` alongside the existing `applyCityPressureOutcome` call); serves as `preferredRoomTemplateIds` anchor for sponsor-demand incidents.
  - `room/compliance_office:tier_1` — when operational, applies bounded per-tick passive scrutiny decay in `city-pressure.ts`; softens scandal incidents via the selection filter in `incidents.ts` (reduces effective weight; does not hard-skip).
  - `room/war_room:tier_1` — when operational, stacks an additional intel/prep multiplier on top of the existing Porter's Briefing Room bonus in `raids.ts`. Intentional endgame payoff for running both.
- **Derived "Visible Institution" view** — a read-only UI metric computed from current `guild.reputation`, average `faction.standing` across the five factions, and `building.activeBuildingTier`. Display and gating only; no new save state.
- **Extend `CityPressureSummaryCard`** in `management-panel.tsx` with a skyscraper-only section showing the Visible Institution band, the incident families currently threatening to fire, and which Executive Floor rooms are actively offsetting pressure.

## Non-Goals

- No new save schema. `requiredBuildingIds`, `preferredRoomTemplateIds`, district snapshots, and faction snapshots cover every storage need this slice has. Widening `ConsequenceKind` is a TypeScript union change, not a save migration.
- No room-effect registry. Each room's consequence lives in the relevant simulation system as a hardcoded template-ID check, matching Porter's rooms (`PORTERS_OFFICE_TEMPLATE_ID`, etc. in `raids.ts`, `morale.ts`).
- No Nightlife Floor recruitment wiring. `room/club`, `room/green_room` consequence wiring is a separate follow-up slice.
- No Penthouse A-rank recruitment wiring. `room/sky_lounge`, `room/private_cellar` and any recruit-ceiling lift for the skyscraper are a separate follow-up slice.
- No Specialist Training role-specific training wiring. `room/drill_floor`, `room/recon_course`, `room/trauma_bay` extensions to the Porter's training-readiness loop are a separate follow-up slice.
- No new faction templates. The five existing factions cover every institutional-pressure axis this slice needs.
- No new `triggerFamily` values. Compose new incidents from the existing list.
- No standalone `prestige` save quantity. Prestige is a derived view over already-authoritative reputation and faction state.
- No B/A/S rank packets. This slice prepares the pressure shape; rank content lands after.
- No simulated rival interiors.
- No broad AI narrative overhaul. Presentation stays inside the already-shipped incident-framing AI surface if anything.

## Authored Incident Shape

Each new incident template must:

- Set `requiredBuildingIds: ["building/skyscraper"]`.
- Pick a `triggerFamily` from the existing union — no new families.
- Include at least one new pressure tag (`pressure:rivalry` | `pressure:exposure` | `pressure:prestige`) and at least one existing pressure tag so selection integrates with current threshold math.
- Set `preferredRoomTemplateIds` to one of `room/executive_office:tier_1`, `room/compliance_office:tier_1`, `room/war_room:tier_1` when the incident is framed in that room.
- Define 2–4 `choices`, with at least one choice carrying a `faction_standing_delta` or `faction_scrutiny_delta` effect.

Target coverage for this slice:

- **Licensing audit** (`compliance_pressure`, category `licensing_audit`, `pressure:regulatory` + `pressure:exposure`) — compliance office softens selection; choices trade treasury for scrutiny.
- **Sponsor demand** (`sponsor_demand`, `pressure:prestige` + `pressure:reputation`) — executive office rewards accepting with standing; refusing accrues scrutiny with the sponsor faction.
- **Rival poaching at visible scale** (`rival_poaching`, `pressure:rivalry` + `pressure:loyalty`) — war room enables a counter-op choice; otherwise falls back to existing poaching resolution.
- **Borough hearing** (`district_fallout`, category `borough_hearing`, `pressure:regulatory` + `pressure:reputation`) — compliance office unlocks a plea-deal choice.
- **Press exposure** (`faction_pressure`, `pressure:exposure` + `pressure:reputation`) — explicit tradeoff between scrutiny and standing.

Numbers (`weight`, `pressureThreshold`, `cooldownMinutes`, `noveltyWeight`) are tuned in implementation against the existing incident-cadence and city-pressure harnesses, not invented from scratch.

## Room Consequence Contracts

Follow the Porter's pattern: declare template-ID constants at the top of the owning system, gate logic on `hasOperationalRoomTemplate()`.

- **`sim/systems/raids.ts`**
  - Add `SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID` and `SKYSCRAPER_WAR_ROOM_TEMPLATE_ID`.
  - At the existing `applyCityPressureOutcome` call sites, scale positive standing deltas when the executive office is operational.
  - Extend the current briefing bonus so the war-room multiplier stacks on top when operational. Briefing alone keeps its current behavior; war room alone is a no-op; both compound.
- **`sim/systems/city-pressure.ts`**
  - Add `SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID`.
  - During the per-tick city-pressure pass, apply a bounded scrutiny decay across all factions when the compliance office is operational. The decay must respect faction cooldowns and must not exceed the existing scrutiny gain cap.
  - Expose new entry points the incident system can use to apply `faction_standing_delta` / `faction_scrutiny_delta` effects without reimplementing delta logic.
- **`sim/systems/incidents.ts`**
  - Widen `ConsequenceKind` to include `faction_standing_delta` and `faction_scrutiny_delta`.
  - Widen `ConsequenceEffect.targetRef` union with `` `faction:${string}` ``.
  - Add a scandal-suppression filter: when the compliance office is operational, reduce the selection weight (not hard-skip) of incidents in `SCANDAL_INCIDENT_CATEGORIES`. Document the multiplier.
  - Respect `preferredRoomTemplateIds` during selection so executive/war-room/compliance-office framing is picked when the relevant room is operational.

## Derived Visible Institution Metric

View-model-only, defined alongside `CityPressureView` in `app/ui/view-models.ts`.

- Input: current `guild.reputation`, average `faction.standing` across the five factions, `building.activeBuildingTier`.
- Output: a band (`"emerging" | "recognized" | "prestige"`), a compact numeric score, and the list of factions currently in scrutiny cooldown.
- Consumers: `CityPressureSummaryCard` today. Future B/A-rank content pressure gates can consume the same derivation.

Authoritative state stays in `CityState`. The metric is display and gating only.

## Likely Code Areas

- `sim/systems/incidents.ts` — new incident templates, `ConsequenceKind` widening, `ConsequenceEffect.targetRef` widening, scandal-suppression filter
- `sim/systems/city-pressure.ts` — scrutiny decay, faction-effect entry points
- `sim/systems/raids.ts` — executive office standing multiplier, war-room intel stacking
- `app/ui/view-models.ts` — Visible Institution derivation
- `app/ui/management-panel.tsx` — skyscraper-only section inside `CityPressureSummaryCard`
- `app/ui/room-detail-panel.tsx` — surface each Executive Floor room's consequence contract in its detail copy
- `content/templates/index.test.ts` — extend ConsequenceKind validation
- `sim/systems/incidents.test.ts`, `city-pressure.test.ts`, `raids.test.ts` — coverage for the new behavior

## Implementation Notes

- Keep gameplay authority in simulation. UI owns presentation and typed intents only.
- Do not broaden `requiredBuildingIds` to existing incidents. Only the new skyscraper-specific templates set it; existing incidents stay building-agnostic so lower-tier runs keep their coverage.
- `ConsequenceKind` widening is a TypeScript union change. Existing saves never stored the new strings, so there is no migration. Update content validation in `content/templates/index.test.ts`.
- Scrutiny decay from the compliance office must be bounded per tick. Tune against existing faction cooldown and city-pressure deltas so compliance alone cannot zero out regulator pressure. An operational compliance office should feel like slack, not immunity.
- The war-room + briefing-room bonus compounds intentionally. It is the endgame payoff for running both rooms and is visible in the verification harness.
- Save migration expected to be a no-op.
- Tone: workplace comedy under real institutional pressure. Incidents read like a regulator actually showing up, not a flavor flash.

## Verification

- Unit tests for each new incident template: selects only when active building is the skyscraper, picks the correct preferred room, applies faction deltas on each choice.
- Unit tests for scandal-suppression: named scandal categories have reduced selection weight when the compliance office is operational; unaffected when not operational.
- Unit tests for `city-pressure.ts` scrutiny decay: faction scrutiny decreases per tick when compliance office operational, bounded, stops at zero.
- Unit tests for `raids.ts` multipliers: standing gains scale when executive office operational; briefing bonus stacks with war-room bonus when both operational.
- Deterministic pressure harness fixture (checked in) comparing expected faction scrutiny/standing trajectories across: (a) skyscraper with no Executive Floor rooms operational, (b) skyscraper with all three operational. The delta is the shipped measurement for this slice.
- Browser regression: one end-to-end skyscraper run that triggers at least one new institutional incident, resolves it, and confirms faction state persists through save/load.
- Run `vp check`.
- Run `vp test`.
- Run `vp build`.

## Done When

- The skyscraper fires at least five authored institutional incidents that the bodega and Porter's cannot see.
- Executive Office, Compliance Office, and War Room each have a distinct mechanical consequence in simulation code.
- Faction standing and scrutiny move through incident choices as well as contract outcomes.
- A Visible Institution surface in the management panel makes skyscraper-scale pressure legible.
- The pressure model is the surface future B-rank and A-rank content can plug into without rework.

## Sequencing With Related Work

- **Depends on** Skyscraper Floor Expansion (shipped) — Executive Floor rooms exist as template shells ready to wire.
- **Independent of** consequence wiring for Nightlife Floor (`club`, `green_room`), Specialist Training Floor (`drill_floor`, `recon_course`, `trauma_bay`), and Penthouse (`sky_lounge`, `private_cellar`). Each is its own narrow follow-up slice.
- **Feeds** future B-rank and A-rank content packets, which consume the Visible Institution metric and the skyscraper-gated incident shape.
