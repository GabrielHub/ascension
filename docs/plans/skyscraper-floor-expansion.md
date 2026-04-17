# Skyscraper Floor Expansion

## Intent

Add the first repeatable expansion arc for the final HQ by authoring four named floor upgrades that grow the skyscraper from its baseline five-floor stack into the canonical nine-floor endgame footprint described in `docs/world/headquarters-and-rooms.md`.

This is the slice that turns the skyscraper from a final relocation target into the foundation of a permanent endgame.

## Why This Slice Exists

- The skyscraper is the final headquarters and must carry the rest of the game.
- The world foundation explicitly directs that endgame growth happens through floor acquisition inside one tower, not a fourth headquarters: _"After the move into the skyscraper, progression should come from acquiring more floors and fitting them out rather than relocating again."_
- The world foundation also names the room identities the tower is supposed to absorb (club, lounge, role-specific training, specialized ops, prestige), but none of them are shipped yet.
- The skyscraper template currently ships with `upgradeIds: []`. Relocation is the only progression beat the building offers right now.
- Porter's already proved a building-tier upgrade arc (5 upgrades, layout-stage swaps, room unlocks) with browser regression coverage. Reusing that idiom is faster, more consistent, and more debuggable than introducing a new ownership mechanism.

## Scope

- Add four named floor upgrades to the skyscraper that follow the existing Porter's idiom: each upgrade bumps `BuildingAuthority.activeBuildingTier`, costs explicit resources, and unlocks a new layout stage that includes the prior floors plus the new one.
- Each new floor has a deliberate identity drawn from world canon (Nightlife / Specialist Training / Executive / Penthouse).
- Each new floor ships with starter rooms via `startingTemplateId` so purchase is immediately legible, matching the baseline floor pattern.
- Author the new room templates these floors require and add canonical world copy for each.
- Surface the new upgrades in HQ management alongside Porter's-style building upgrades.
- Keep the floor _count_ bounded at eight total (five baseline + four expansion). The long-tail loop is delivered by the Prestige Pressure slice and later rank packets, not by stamping more floors.

## Non-Goals

- No per-floor ownership state or new save schema for floors. The existing `activeBuildingTier` + `appliedUpgradeIds` already covers this.
- No additive layout composition. `getActiveStage` already picks one stage by `minimumTier`; new stages just include the prior floors plus the new one, exactly like Porter's.
- No literal infinite procgen tower. No requirement to support 20+ simultaneously visible floors.
- No new rank band in this slice. The new floors should _prepare_ the player for B-rank and A-rank content but the rank packets ship later.
- No prestige incident systems, faction standing changes, or pressure hooks. The Executive Floor's room _exists_ in this slice; the Prestige Pressure slice authors the incidents and consequences that flow through it.
- No conflation of `elevationBandId` with content packaging. `elevationBandId` stays a per-floor visual/scene tag used by the scene builder and HQ environment rendering.
- No further changes to the recovery-floor crew lounge. The naming-conflict cleanup that renamed `room/lounge:tier_1` → `room/crew_lounge:tier_1` ("The Crew Lounge") shipped before this slice. The new high-end recruitment room is `room/sky_lounge:tier_1` ("The Sky Lounge").

## Floor Arc

The four expansion floors, in unlock order. Names and copy must be confirmed against the updated `docs/world/headquarters-and-rooms.md` before authoring.

### Tier 2 — Nightlife Floor

- **World basis:** Recruitment progression _counter → bar → club → lounge_. Club is the next step beyond Porter's bar.
- **Identity:** Loud, flashy, reputation-driven. Prospects come because the guild's name is on the marquee. Recruitment quality climbs into reliable C-tier and starts pulling B-tier prospects.
- **Starter rooms:**
  - `room/club:tier_1` — high-throughput recruitment space, reputation-sensitive
  - `room/green_room:tier_1` — backstage decompression for off-shift operators tied to the club's social cycle
- **Why first:** Better recruits before the player needs the training and institutional load that follows.

### Tier 3 — Specialist Training Floor

- **World basis:** "Role-specific training rooms. Field Lead Drill Floor, Scout Recon Course, Medic Clinic."
- **Identity:** The dojo on Recovery is general conditioning. This floor is for operators who already know their job and need to push their role's ceiling.
- **Starter rooms:**
  - `room/drill_floor:tier_1` — field-lead-specific training
  - `room/recon_course:tier_1` — scout-specific training
  - `room/trauma_bay:tier_1` — medic-specific training
- **Why second:** Once better recruits start arriving, the player needs somewhere to push them past the generic dojo ceiling.

### Tier 4 — Executive Floor

- **World basis:** "Specialized operations rooms. Bigger briefing, intel, and mission-planning spaces" plus the institutional pressure surface the Prestige Pressure slice needs.
- **Identity:** The player's name finally goes on a door. Faction reps, regulators, and the city's institutional eye all land here. The floor exists in this slice; the incidents and consequences land in the Prestige Pressure slice.
- **Starter rooms:**
  - `room/executive_office:tier_1` — the player's actual office; faction meetings; standing reception for institutional visitors
  - `room/compliance_office:tier_1` — regulator-facing paperwork and oversight; future pressure-hook surface
  - `room/war_room:tier_1` — high-end mission planning, deeper than the Operations situation room
- **Why third:** The institutional pressure layer arrives once the guild is visibly competent, not before.

### Tier 5 — Penthouse

- **World basis:** Recruitment progression capstone _counter → bar → club → lounge_. The exclusive, quiet, high-end room where prestigious people get convinced.
- **Identity:** Top of the tower below the rooftop. A-rank recruitment, signing meetings, prestige presentation.
- **Starter rooms:**
  - `room/sky_lounge:tier_1` — top-tier recruitment, exclusive, quiet
  - `room/private_cellar:tier_1` — supporting negotiation/signing room
- **Why last:** Endgame capstone. Pulls A-rank prospects once the institution has earned them.

## Layout Composition

- New floors join the existing `tower-core` `stackGroupId` so they render inside the same vertical stack as Lobby, Operations, Recovery, and Logistics.
- The Rooftop stays in its own `stackGroupId: "rooftop"` group and remains visually at the top.
- New floors take fresh `floorIndex` values (5 through 8) and use `stackLayer` to position visually between Logistics and Rooftop. Specific stack-layer order to be confirmed during implementation; suggested narrative order is Nightlife low, Specialist Training mid, Executive high, Penthouse top-of-core.
- Each new layout stage includes all baseline floors plus the new floor, following the Porter's idiom.

## Cost and Gating Envelope

- Costs scale beyond Porter's, drawn from the shipped C-rank `midgame-economy.v2` ledger and the C-rank craft and payout envelopes.
- Each upgrade requires the prior tier (`building_tier_min`) so the arc is sequential, like Porter's.
- Reputation gates align with the rank ladder. Suggested shape (final numbers to be tuned against the economy harness):
  - Nightlife: cash-forward, reputation at C threshold
  - Specialist Training: cash + reputation, slight intel cost (specialist trainers are hard to find)
  - Executive: heavy reputation, modest cash, gates aligned with B-rank readiness
  - Penthouse: top-end resource cost, reputation aligned with A-rank readiness
- Final numbers must be tuned against the existing economy harness, not invented from scratch.

## Likely Code Areas

- `content/building-layouts.ts` — add four new stages and four new floor layouts
- `content/templates/buildings.ts` — extend `building/skyscraper.upgradeIds`
- `content/templates/upgrades.ts` — author four new upgrade entries
- `content/templates/rooms.ts` — author the new room templates listed above
- `app/ui/management-panel.tsx` — verify the upgrade list renders the new entries (no redesign expected)
- `app/ui/management-panel.test.tsx` and other affected tests
- Save schema and migration code only if a new field is genuinely required (default expectation: no change)

## Asset Implications

- Each new room template needs a scene SVG following the HQ Isometric Contract in `docs/product/asset-production.md`: pre-composed, props only, isometric, no walls or floors.
- Asset work follows the standard six-stage pipeline (canon → brief → recipe preview → modules → production → review). It is **out of scope** for this code slice — gameplay can ship with placeholder or empty scene SVGs that satisfy the contract while final art is produced in parallel.
- New floors do not require new exterior backdrop work. The existing skyscraper `tower-core` and `rooftop` elevation bands cover them visually.

## Implementation Notes

- Treat this as Porter's, applied to the skyscraper. If a deliverable cannot be expressed in the Porter's idiom, stop and reconsider before inventing a new mechanism.
- Keep costs and gates deterministic and inspectable.
- Each floor's identity must make sense as future host space for prestige incidents, faction standing changes, and B/A-rank content. Coordinate with the Prestige Pressure plan: Executive Floor rooms in particular are designed to be the surfaces those systems plug into.
- Do not introduce an empty-slots-only floor. Empty floors break the legibility precedent set by every shipped skyscraper floor.
- Save migration is expected to be a no-op: existing skyscraper saves keep `activeBuildingTier = 1` and see the new upgrades as available actions in management. If implementation discovers a real migration need, escalate before adding migration code.
- Room copy and naming for the new templates must come from `docs/world/headquarters-and-rooms.md`, which is updated alongside this plan to lock the canonical skyscraper room list.

## Verification

- Add tests for each new upgrade: requirements evaluate correctly, applying the upgrade bumps tier, the new layout stage activates, and the new floor appears in `getBuildingFloors`.
- Add tests for each new room template: registry validation, starter-template wiring, and any room-effect simulation behavior introduced by the template.
- Add tests for save/load preserving the new tier and upgrade-id state across all four upgrades.
- Add browser coverage for at least one floor purchase + load round trip end to end.
- Run `vp check`.
- Run `vp test`.
- Run `vp build`.

## Done When

- The skyscraper exposes a four-step upgrade arc above its baseline five-floor stack (Nightlife → Specialist Training → Executive → Penthouse), surfaced in HQ management.
- Each new floor has a deliberate, world-grounded identity, starter rooms, and a clear place in the eventual prestige and rank-ladder picture.
- Purchased floors persist through save/load with no migration debt.
- The floor identities and starter-room choices give the Prestige Pressure plan concrete locations to author into without rework.
- The world doc `docs/world/headquarters-and-rooms.md` reflects the canonical eight-floor skyscraper layout that this plan ships.
