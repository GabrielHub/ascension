# Skyscraper Rival Pressure Refactor

Scope: replace the current skyscraper endgame-pressure framing with a simpler two-track model centered on public pressure and rival guild pressure. This plan covers the gameplay-direction refactor only. It does not commit the project to immediate rival-battle combat or a fourth headquarters. It does commit the project to replacing the legacy `city-pressure` model with the new global `public pressure` backbone.

Prerequisite: start [Rival Guild Definition And Asset Plan](./rival-guild-definition-and-asset-plan.md) first and do not wire rival gameplay against placeholders. Rival gameplay work should only depend on rivals that are already marked `ready-to-wire`.

## Goal

Refocus skyscraper pressure around the thing that is most legible, characterful, and expandable:

- the city and public institutions watching the guild
- rival guilds actively trying to outmaneuver it

The current shipped Executive Floor institutional-pressure slice proved that skyscraper pressure can be room-gated and mechanically real, but it spread the endgame surface across too many thin institutional actors. The refactor target is a cleaner endgame loop:

- `public pressure` carries regulator / sponsor / press / “the city is watching” pressure in one simpler lane
- `rival pressure` becomes the dramatic long-tail system, with authored rival guild leaders as recurring pressure carriers
- skyscraper rooms gate how the guild absorbs, counters, or escalates that pressure
- the player can see where their guild stands in a broader competitive ladder once the guild becomes an official tower-scale operator

Reference rule: this refactor should remove complexity that does not create strong drama. It must not remove the endgame feeling that the player has become visible, judged, and worth attacking.

## Why Reframe It

The shipped institutional-pressure slice has real implementation value:

- it proved room-gated skyscraper consequences
- it proved that incidents can write faction-level pressure state
- it gave the management panel a legible skyscraper-pressure summary

But it is not the cleanest long-term endgame surface.

Current problems:

- too many institutional actors compete for attention without becoming memorable antagonists
- several incidents differ more in paperwork flavor than in strategic shape
- faction standing / scrutiny detail is heavier than the player-facing drama it creates
- the most interesting shipped incident is already the rival-poaching one because it points toward a durable enemy instead of an abstract regulator

The skyscraper should feel like the point where the guild stops being a weird local shop and becomes a real market participant. Rival guilds are the clearest expression of that change.

## Design Pillars

1. **Two pressure tracks only.** Skyscraper endgame pressure should be reducible to `public pressure` and `rival pressure`.
2. **Public pressure stays light.** It remains mechanically real, but it is not a separate strategy game.
3. **Rivals carry the drama.** Rival guild leaders should become recurring faces, not one-off event wrappers.
4. **Rooms matter.** Skyscraper pressure should stay meaningfully gated by the rooms the player has unlocked and placed.
5. **Rivals begin only after a room unlock.** Skyscraper arrival alone is not enough; the player must unlock the room that exposes the system.
6. **The rivalry ladder escalates with guild status.** As the guild improves, its active rivals should change.
7. **New features arrive through room unlock beats.** If a pressure feature is new to the player, the room that unlocks it should also introduce it through guidance / narrative framing.
8. **Rooms should stay narrow.** Do not overload one room with several unrelated endgame systems just because the room already exists.
9. **Future rival battles are enabled, not required now.** The first pass should support future escalation without forcing encounter-authority work into this refactor.
10. **Room upgrades deepen features.** Building/floor unlocks and room unlocks introduce a feature family; room upgrades should deepen that feature family instead of backporting tower systems into earlier HQs.

## Target Pressure Model

### Public Pressure

Public pressure replaces the current broader institutional spread globally. It is the new authoritative external-pressure model across the whole game, not a skyscraper-only overlay.

It represents:

- regulators
- borough and sponsor expectations
- press visibility
- general public scandal / legitimacy pressure

Public pressure should be surfaced as one compact state, not a network of equally weighted faction mini-games.

Candidate shape:

- one meter or banded state such as `quiet`, `watched`, `exposed`, `crackdown`
- one or two supporting tags on active incidents or contracts when flavor needs specificity

Public pressure should drive only a small number of outcomes:

- contract reward / risk modifiers
- reputation drag after bad outcomes
- occasional forced narrative events
- temporary constraints on particularly visible work

Public pressure should absorb most of the current skyscraper “institutional incident” themes:

- audits
- hearings
- sponsor demands
- press exposure

Those beats still matter, but they should mostly live as narrative-event framing and a single pressure lane rather than as several parallel standing/scrutiny relationships.

### Global Replacement Rule

`Public pressure` replaces the current `city-pressure` model across the full campaign.

Implementation rule:

- `Bodega` uses the thinnest surface of the new system
- `Porter's` uses a somewhat louder but still simple surface
- `Skyscraper` unlocks the advanced room-gated public-pressure and rival-pressure features

This means there should not be a permanent long-term split between:

- legacy global `city-pressure`
- skyscraper-only `public pressure`

The campaign should have one external-pressure backbone, with deeper features gated by progression and rooms.

### UI Retirement Rule

Retire the current `Visible Institution` model and management surface completely as part of this refactor.

Rules:

- do not keep `Visible Institution` as a parallel skyscraper-pressure card
- do not keep its old hardcoded threat labels
- do not preserve a second prestige-facing summary surface beside `Public Pressure`, `Current Rival`, and the later `Guild Leaderboard`

Any prestige or legitimacy value worth preserving should be absorbed into the new competitive-score formula or room-specific outcomes rather than kept alive as a separate user-facing model.

### Authoritative Public Pressure Data Model

The first-pass replacement model should keep one compact global state plus district-local state.

```ts
type PublicPressureSource = "regulator" | "press" | "sponsor" | "public";

interface PublicPressureState {
  score: number; // 0-100, global external pressure
  dominantSource: PublicPressureSource | null;
  cooldownsBySource: Record<PublicPressureSource, number>;
  lastMajorShiftTick: number;
  districts: Record<string, DistrictPublicPressureState>;
}

interface DistrictPublicPressureState {
  districtId: string;
  standing: number; // 0-100, local goodwill / trust
  heat: number; // 0-100, visibility / scrutiny / attention
  containment: number; // 0-100, unresolved local danger / fallout
  recentContractCount: number;
  lastResolvedTick: number;
}
```

Derived-only read:

- `quiet` for `0-24`
- `watched` for `25-49`
- `exposed` for `50-74`
- `crackdown` for `75-100`

The band is presentation and rules shorthand derived from `score`, not a separate stored field.

### Surviving And Retired Fields

District-facing values survive in simplified form:

- `district.trust` -> `district.standing`
- `district.attention` -> `district.heat`
- `district.containmentDebt` -> `district.containment`
- `district.recentContractCount` survives
- `district.lastResolvedTick` survives

The following faction-level fields do not survive as first-class long-term external-pressure state:

- per-faction `standing`
- per-faction `scrutiny`
- per-faction `leverage`

Rival pressure does not stay inside public pressure:

- legacy `faction/rival-guild-market` pressure data should migrate toward the separate rival system
- rival-facing pressure should not remain hidden inside public-pressure internals once the rival system is live

### Read Rules

Public-pressure systems should read the model like this:

- global `score` drives broad contract risk, payout pressure, and event severity
- `dominantSource` drives event flavor and which rooms are most relevant
- `cooldownsBySource` prevents repetitive regulator / press / sponsor spam
- district `standing` drives local contract friendliness
- district `heat` drives local visibility, danger, and event frequency
- district `containment` drives local instability and urgency

### Migration Rule

The migration from legacy `city-pressure` should collapse the old data model into the new one instead of trying to preserve a permanent compatibility layer.

Migration guidance:

- institutional scrutiny / poor standing should raise global `score`
- whichever institutional lane is currently strongest should become `dominantSource`
- faction cooldown-like behavior should collapse into `cooldownsBySource`
- district state should map directly into `standing`, `heat`, and `containment`
- rival leverage should seed later rival-pressure migration work, not remain a permanent public-pressure field

### Rival Pressure

Rival pressure becomes the primary skyscraper endgame system.

Instead of abstract pressure mostly arriving from regulators, the player should increasingly feel pressure from specific competing guilds with:

- faces
- names
- operating identities
- room-aware tactics
- persistent history with the player

Rival pressure should be authored around rival guild leaders first, not around anonymous rival organizations.

Each rival leader should own:

- a stable portrait / asset package
- a guild identity and presentation language
- a pressure style
- a small set of recurring moves
- a stance or relationship state toward the player guild

Examples of rival moves:

- contest a contract lane
- leak or amplify a scandal
- pressure a sponsor relationship
- force a public comparison against the player guild
- challenge the guild’s claim to a district or specialty niche
- capitalize on one of the player’s own departures or missed hires

The system should read as “this rival is making a move” rather than “another generic pressure incident fired.”

### Repeatable Rival Event Rule

Rival events must be authored to survive repetition.

Do not write them as one-time plot twists that collapse after the first reveal. Instead, write them as repeatable “move families” with variable payload:

- contract challenge
- public comparison
- sponsor interference
- district incursion
- ex-operator resurfacing
- media needling
- recruitment-market loss

Each move family should have:

- a stable mechanical shape
- rival-specific framing drawn from that rival’s metadata
- run-specific payload drawn from current guild state, room state, and recent history

The player should think “this rival keeps pulling this kind of move” rather than “why am I seeing the same cutscene again?”

## Room-Gated Pressure Contract

The skyscraper refactor should preserve the good part of the current Executive Floor slice: rooms matter because pressure at tower scale should not be globally abstract.

### Room Scope Rule

Do not make a single room responsible for too many features.

The skyscraper has effectively expandable vertical space. Use that. If the pressure model keeps growing, prefer adding another narrow room over turning one existing room into a catch-all unlock for leaderboard, rivals, public pressure, recruitment competition, sponsor management, and future battles all at once.

Target rule:

- one room should usually unlock one major feature family
- one room may modify or strengthen adjacent systems
- one room should not become the owner of every tower-end meta-system
- room upgrades are allowed to deepen a room's feature family once the room exists

This is especially important in the skyscraper because new rooms can be introduced one at a time as authored progression beats.

Target room roles:

- `Executive Office`: converts wins into prestige and sponsor leverage
- `Compliance Office`: absorbs or cools public pressure and softens government / press fallout
- `War Room`: unlocks the strongest response option against active rival pressure

Feature-unlock rule:

- the room that introduces a new pressure surface should also unlock the first narrative / guidance beat that explains it
- the player should not silently start receiving rival or leaderboard logic with no room-backed introduction

Feature-deepening rule:

- building / floor unlocks introduce new feature families
- room unlocks make those feature families real
- room upgrades deepen those feature families after introduction
- do not use earlier-building room upgrades to backport core rival systems before skyscraper-era unlocks

Recommended first-pass unlock split:

- skyscraper baseline: no rival system yet
- `Compliance Office`: unlocks the public-pressure lane and its first explanatory beat
- `Executive Office`: unlocks prestige-facing sponsor and legitimacy handling, but not every competitive system by default
- `War Room`: unlocks the active-rival system, the first rival brief, and the strongest response option against rival pressure
- `Market Intelligence Office`: unlocks the leaderboard, nearby-guild read, and the “you are now being ranked against real competitors” beat

Recommended first-pass upgrade split:

- `Compliance Office` upgrades: deepen public-pressure handling and mitigation after the lane is unlocked
- `War Room` upgrades: improve the strength, efficiency, or payoff of the strongest rival response after rival pressure is unlocked
- `Market Intelligence Office` upgrades: broaden leaderboard visibility, future-rival preview, previous-rival history, or richer market-read surfaces after the room is unlocked

Preferred follow-up pattern if the first pass proves too dense:

- add a dedicated public-relations / press-facing room instead of making `Compliance Office` own every public-pressure branch
- add nightlife or recruitment-competition rooms later for talent-market pressure instead of pushing all labor-market rivalry into the War Room forever

Rule: the right answer to “this room is doing too much” is usually “add another room,” not “hide more systems behind the same room.”

### Defined New Room: Market Intelligence Office

Define the leaderboard room now as:

- **Name:** `Market Intelligence Office`
- **Role:** competitive analysis, guild standings, nearby-rival read, and historical leaderboard context
- **Primary feature family:** leaderboard and market-position visibility only
- **First unlock beat:** “the guild is now large enough to be tracked, compared, and forecast against its peers”

The room should feel like:

- terminals, wall displays, pinned district maps, contract boards, rival dossiers, printed market reports, and somebody's attempt to turn competitive paranoia into an organized workflow
- part research bullpen, part media-monitoring room, part market-watch office
- a place where the guild stops guessing who matters and starts seeing the competitive field in plain terms

What it unlocks:

- visible `Guild Leaderboard`
- current position and nearby guild read
- future-rival preview
- previous-rival history
- lighter read on which guilds are rising, slipping, or newly relevant

What it does not own:

- public-pressure mitigation
- sponsor negotiation
- regulator handling
- active rival counter-ops
- recruitment-room competition directly

Those remain in other rooms. The Market Intelligence Office is for seeing the field, not fighting every battle inside the same room.

### War Room Simplicity Rule

Do not turn the `War Room` into a second layered rival-management system.

First-pass ownership:

- when rival pressure is live, `War Room` unlocks the strongest response choice
- that response should be materially better than the baseline no-room response
- the room may improve the payoff or reduce the cost of answering a rival move

Do not additionally make the first pass War Room responsible for:

- leaderboard visibility
- passive market-read systems
- a separate rival-intel minigame
- forecasting several future rival moves

Those reads belong in the `Market Intelligence Office` or later systems if they prove necessary.

### Defined New Floor: Market Intelligence Floor

The `Market Intelligence Office` should not be squeezed into the current Executive Floor.

Decision:

- add a new later skyscraper expansion floor for competitive / market systems

Reason:

- the shipped Executive Floor already has a coherent three-room identity
- the skyscraper has expandable vertical space and does not need to overload existing rooms
- leaderboard and competitor-read systems are large enough to justify a dedicated unlock beat

Target floor identity:

- **Name:** `Market Intelligence Floor`
- **Purpose:** competitor tracking, leaderboard visibility, rival dossiers, market-read tooling, and later competitive-analysis support rooms if needed
- **Primary starter room:** `Market Intelligence Office`

This floor should be treated as a later skyscraper expansion step beyond the current canonical nine-floor stack, not as a retrofit forced into the Executive band.

The refactor should also leave room for later expansion-floor wiring:

- `Club` / `Green Room`: recruitment-facing rival pressure and social competition
- `Drill Floor` / `Recon Course` / `Trauma Bay`: roster-preparedness gates that help withstand stronger rivals
- `Sky Lounge` / `Private Cellar`: top-tier prestige pressure, private sponsor negotiations, and late-stage recruitment competition

The skyscraper should treat those later rooms as real feature unlock opportunities, not only as passive modifiers on systems already owned somewhere else.

Rule: room gating should not be cosmetic. If a room is listed as pressure-relevant, it should either:

- unlock an option the player otherwise does not get
- reduce the cost of absorbing a pressure hit
- increase the quality of a successful response

## Rival Start Condition

Full rival pressure should begin only after the guild moves into the skyscraper and unlocks the room that exposes the rival system.

Reason:

- before the tower, the guild is still climbing into legitimacy
- after the tower, the guild becomes an official, visible, market-shaping actor
- but features in this game should still arrive through rooms, not silently through location alone

That does not mean rivals are lore-invisible before then. It means the game should not spend real mechanical bandwidth on them until the player can respond with skyscraper infrastructure.

Suggested progression:

- `Bodega`: no formal rival system
- `Porter's`: no formal rival system and no required foreshadowing surface
- `Skyscraper baseline`: no active rival yet
- `Executive` / `War Room` unlock band: rivalry begins to become a real management surface through explicit feature-unlock beats
- `Market Intelligence Floor`: leaderboard and competitor read become visible as a separate later floor and room unlock
- later dedicated skyscraper rooms may continue splitting competitive systems into narrower unlocks instead of overloading the first executive rooms forever

Early-building rule:

- bodega and Porter's may use the lighter global `public pressure` surface
- bodega and Porter's do not need a dedicated rival-foreshadowing layer
- incidental narrative mention of already-established guilds is acceptable, but it should not become a semi-live pre-skyscraper system
- bodega and Porter's should not unlock the real rival system through room upgrades
- true rival ownership begins in the skyscraper and deepens through skyscraper room upgrades only

## Rival Progression And Ladder

Rivals should change as the guild improves.

The endgame should not lock the player into one static rival forever. The current rival should depend on where the guild stands in the tower-era pecking order.

Target surface:

- no leaderboard before its room unlock
- a visible `Guild Leaderboard` once the relevant room exposes it
- one `primary rival` at a time
- future rivals above the player
- previous rivals the player has already overtaken or neutralized
- occasional non-primary guild pressure beats as background market noise, not full secondary rival ownership

The leaderboard should do three jobs:

1. make endgame pressure legible
2. preview who is next
3. make rival churn feel like a climb through a real market, not random event rotation

### Ranking Signal

The leaderboard should not be driven by raw reputation alone.

It also should not be driven by a naive linear “average hired operator rank” value. That would be gameable and would distort roster decisions in bad ways:

- benching strong operators could become optimal to dodge a rival
- hiring utility or recovery specialists could look weaker than intended
- the system could overvalue combat numbers and undervalue public legitimacy

Locked first-pass target:

- a visible leaderboard rank once unlocked
- a mostly hidden match-strength score used to decide which rival is active or pressing hardest

The hidden competitive score should be built from exactly three inputs:

- `roster rank score`
- `contract tier score`
- `reputation / prestige score`

#### Roster Rank Score

Roster strength should come from operator rank, but not through a linear rank ladder.

Use non-linear rank weights so high-rank operators matter disproportionately more than low-rank operators.

Provisional weight table:

- `F = 1`
- `E = 2`
- `D = 4`
- `C = 7`
- `B = 11`
- `A = 16`
- `S = 22`

The guild's roster rank score should be derived from the weighted average of active operator ranks using that non-linear table or a very close tuned variant.

Rules:

- do not use a simple `F=1, E=2, D=3...` mapping
- do not use highly precise hidden combat-stat averages
- the system should care that a small number of high-rank operators matter more than an equivalent count of low-rank operators

#### Contract Tier Score

Contract seriousness should be represented simply by the operational contract tier band available to the guild.

The score should read from the rank of meaningful work available to the guild rather than from every detailed posting modifier.

This keeps the formula simple while still reflecting the fact that a guild eligible for higher-tier work belongs in a stronger competitive bracket.

#### Reputation / Prestige Score

The third term should combine:

- existing reputation
- any new prestige-facing logic explicitly preserved during the refactor

Do not keep the old `Visible Institution` model alive as a competing prestige system. If prestige logic survives, it should survive only inside the new competitive-score contract.

If the project wants more transparency, expose the leaderboard rank and maybe one coarse guild-status label, but keep the exact competitive-score formula hidden.

Leaderboard rule: if the leaderboard starts forcing too much system ownership onto `Executive Office` or `War Room`, move it to a dedicated later room rather than making one room the owner of every competitive readout.
This plan now treats that dedicated room and floor as required: the `Market Intelligence Office` on the `Market Intelligence Floor`.

## Rival Leader Content Contract

Rival leaders should be treated as durable authored content, not only as system ids.

Each rival package should include:

- leader name
- guild name
- short guild pitch or public reputation
- pressure style
- presentation notes for portrait / silhouette / costume language
- default move families
- favored contract lane, district, or sponsor type when relevant
- branding / visual-language notes

These are authored metadata packages first.

At skyscraper-era room unlock, the run should instantiate them as ECS-backed rival entities with seeded state, such as:

- ladder position
- strength band
- aggression bias
- favored move weighting
- rise / slide status in the current season

That keeps rival identity authored while still making the active competitive field vary run to run.

### Rival Authority Contract

Rival ownership is split like this:

- authored templates own static rival definition
- ECS owns live rival instances and mutable rivalry state
- save/load persists the ECS-backed rival state

Static authored template fields include:

- leader name
- guild name
- branding / visual-language notes
- pressure style
- default move families
- portrait / asset references
- favored contract lane, district, or sponsor style when relevant

Simulation-owned rival entity state includes:

- current ladder position
- current strength band
- current rivalry intensity
- aggression bias
- current rise / slide status
- whether the rival is the current primary rival
- any later continuity links to departed operators, missed prospects, or other mutable rivalry hooks

Rule:

- do not keep active rivals as a loose UI-only or runtime-only side table if they are meant to be persistent simulation actors
- if the game can react to a rival over time, that rival belongs in ECS-owned state

First-pass simplification:

- authored templates stay lightweight
- active rival entities may still be few in number
- this does not require full rival-headquarters simulation or live rival raids on day one
- but it does mean the rivalry system is built on the same authority layer as the rest of the game's mutable systems

The first pass should stay narrow.

Do not author a whole city full of rivals immediately. Start with two or three rival leaders with sharply different pressure identities, for example:

- a prestige / media rival
- a labor-market / talent-pipeline rival
- a political / sponsor-network rival

That is enough to prove the system and give the leaderboard real texture.

### Departure And Missed-Hire Continuity

Do not center the first rival system on active poaching incidents.

Better rule:

- when operators leave through the existing morale / loyalty / pressure systems, some of them can later appear attached to other guilds
- when the player passes on or misses a prospect, that prospect can later appear in rival-facing surfaces

This keeps rivalry grounded in existing gameplay consequences:

- “I mishandled this operator and now they strengthened somebody else”
- “I let this recruit go and now they are part of a rival’s climb”

That is stronger and more systemic than constant active-poaching beats.

Migration rule:

- do not keep the old active-poaching incident around once this direction is adopted
- remove the old incident template and its supporting assumptions rather than preserving compatibility content that will confuse future implementation work
- replacement rival move families should be authored directly against the new rivalry contract

## Locked System Remap

This refactor should explicitly remap the shipped skyscraper institutional slice instead of letting old and new pressure models overlap indefinitely.

Proposed remap:

- `Licensing Bureau Audit` -> public-pressure narrative event
- `Sponsor Prestige Demand` -> public-pressure narrative event with Executive Office modifiers
- `Borough Contracts Hearing` -> public-pressure narrative event with Compliance Office modifiers
- `Press Exposure Story` -> public-pressure narrative event with Executive / Compliance framing
- `Rival Guild Poaching Push` -> retire entirely; do not preserve as compatibility content once the refactor lands

Existing room consequences should be preserved where they still fit:

- Executive Office standing / prestige amplification stays, but is retargeted toward public legitimacy and leaderboard climb
- Compliance Office scrutiny decay becomes simpler public-pressure cooling
- War Room remains the anti-rival response room first and the premium briefing room second

## UI Surface Direction

This refactor should avoid adding another giant dashboard.

Target player-facing surfaces:

- management summary shows compact `Public Pressure`
- management summary shows current rival and current rivalry intensity once the rival room is unlocked
- leaderboard panel shows current position, nearby guilds, and notable previous rivals once the `Market Intelligence Floor` / `Market Intelligence Office` is unlocked
- incidents and narrative events carry the human-readable drama

The player should understand:

- who is currently pressuring them
- why that rival is the current threat
- which room or room upgrade would give them a better response next time
- which room unlock introduced the system they are now interacting with

## Feature-Unlock Narrative Contract

This refactor must integrate with the persistent-guidance / rewarded-tutorial work rather than inventing a second feature-introduction path.

Rules:

- a new pressure system is not live for the player until the room that owns it is unlocked
- the unlock should fire a narrative / guidance beat explaining what changed and why it matters
- the first rival or leaderboard exposure should be introduced as a deliberate authored beat, not as a background state flip
- later repeatable pressure events can then reuse the unlocked system cleanly
- when a feature starts to feel too large for its current room, split it into a new room unlock instead of adding more hidden subrules to the existing room

Sequencing rule:

- the feature and its first unlock beat ship in the same implementation phase
- do not treat guidance as a later wrapper around an already-live pressure feature
- if a feature is not ready to ship with its unlock beat, that feature is not ready to be considered live

The intended rhythm is:

- buy or unlock room
- receive blocking or focused introduction beat
- gain management-surface visibility
- begin seeing repeatable rival or public-pressure events

After introduction, the next rhythm can be:

- upgrade the room
- receive a narrower follow-up beat explaining the stronger or broader version
- gain access to the deeper response / visibility / mitigation surface

## Implementation Checklist

### Phase 0 — Pressure Audit

- [ ] Inventory all legacy `city-pressure`, skyscraper-pressure, incident, raid, save, and UI callsites touched by this refactor.
- [ ] Confirm the locked migration target:
  - global `PublicPressureState`
  - district `standing / heat / containment`
  - retired faction `standing / scrutiny / leverage`
  - retired `Visible Institution`
- [ ] Write the concrete migration map from current save/runtime fields into the locked replacement model.
- [ ] Enumerate every shipped incident or UI label that still names the old institutional-pressure framing.

Exit criteria:

- the project has a concrete remap from current institutional pressure to the new two-track model
- the project has a concrete retirement plan for the old `Visible Institution` model and UI

### Phase 1 — Public Pressure Collapse

- [ ] Replace the authoritative legacy `city-pressure` state with the locked global `public pressure` model.
- [ ] Migrate district trust / attention / containment debt reads and writes into `standing / heat / containment`.
- [ ] Remove faction-level `standing / scrutiny / leverage` as first-class external-pressure state.
- [ ] Rewire raid, contract, and event systems to read from the new global pressure model.
- [ ] Collapse government / sponsor / press institutional mechanics into one public-pressure lane plus narrative-event flavor.
- [ ] Author and ship the first public-pressure introduction beat in the same phase as the first live public-pressure surface.

Exit criteria:

- public pressure is one coherent lane
- the player no longer needs to reason about several thin institutional antagonists at once
- the first live public-pressure surface does not exist without its room-backed introduction beat

### Phase 2 — Rival Framework

- [ ] Confirm the prerequisite [Rival Guild Definition And Asset Plan](./rival-guild-definition-and-asset-plan.md) has produced enough rivals that are marked `ready-to-wire`, with stable ids / asset references exposed through the aggregate rival-record export.
- [ ] Author rival template data for the first rival set:
  - leader identity
  - guild identity
  - pressure style
  - move families
  - shipped asset references
- [ ] Add ECS-backed rival entities and save/load support for mutable rival state.
- [ ] Implement one hidden competitive-score formula built from:
  - roster rank score using the locked non-linear rank table
  - contract tier score
  - reputation / prestige score
- [ ] Define primary-rival assignment and replacement rules using leaderboard position and competitive score.
- [ ] Add the continuity hooks for departed operators and missed prospects to later surface through rival content.
- [ ] Remove the old `Rival Guild Poaching Push` incident template and its supporting assumptions instead of carrying compatibility content.
- [ ] Ship the first active-rival introduction beat in the same phase as the first room-backed rival unlock.

Exit criteria:

- the game can name the active rival and explain why that rival is current
- active rivals are simulation-owned rather than UI-only or incidental runtime state
- the first room-backed rival feature does not exist without its introduction beat

### Phase 3 — Room-Gated Counterplay

- [ ] Wire `Compliance Office` into public-pressure visibility, mitigation, and cooling.
- [ ] Wire `Executive Office` into prestige / sponsor-facing payoff and competitive-score support.
- [ ] Wire `War Room` into the strongest rival-response option only, keeping it narrow.
- [ ] Add the `Market Intelligence Floor` and `Market Intelligence Office` as the later leaderboard unlock.
- [ ] Define the first room-upgrade path for each feature-owning room:
  - deeper public-pressure handling
  - stronger rival response
  - broader leaderboard visibility and rival history
- [ ] Author and ship each room's first unlock beat alongside the feature it introduces.
- [ ] Author and ship each major room-upgrade follow-up beat alongside the deeper version of that feature.
- [ ] Audit room ownership and split any overloaded feature family into a new room instead of adding hidden subrules.

Exit criteria:

- skyscraper room investment changes how the player handles both public and rival pressure
- the player does not encounter a new pressure feature before the room-backed introduction beat
- no single room has become an incoherent owner for several unrelated endgame systems
- room upgrades deepen feature families cleanly without backporting tower-end rivalry into earlier HQs
- room-backed features and beats are authored together rather than stitched together later

### Phase 4 — Rival Content Pass

- [ ] Integrate the approved rivals produced by the prerequisite [Rival Guild Definition And Asset Plan](./rival-guild-definition-and-asset-plan.md) that are already marked `ready-to-wire`, consuming the slim ready-to-wire definitions rather than any in-progress authoring notes.
- [ ] Add portraits, visual direction, interruption hooks, and branding surfaces for those rivals where the gameplay/UI implementation now consumes them.
- [ ] Author repeatable rival move families with rival-specific framing and variable payload.
- [ ] Add enough event variation that rivals feel persistent rather than random or one-off.

Exit criteria:

- at least two or three rivals are memorable and mechanically distinct

### Phase 5 — UI And Verification

- [ ] Replace legacy management pressure summaries with the new `Public Pressure` and `Current Rival` surfaces.
- [ ] Add the `Guild Leaderboard` surface behind the `Market Intelligence Office` unlock.
- [ ] Remove stale institutional-pressure and `Visible Institution` terminology from the UI.
- [ ] Verify the full tower progression:
  - skyscraper entry without active rivals
  - room-backed public-pressure unlock
  - room-backed rival unlock
  - later leaderboard unlock
- [ ] Update roadmap / product wording only after the implementation direction is stable.

Exit criteria:

- the player can read current pressure without parsing legacy institutional scaffolding

## Risks

- **Overcorrecting into pure flavor.** If public pressure becomes only text, it loses gameplay meaning.
- **Overbuilding rival simulation too early.** The first pass needs rival leaders and recurring moves, not fully simulated rival headquarters or rival raids.
- **Bad ranking incentives.** A naive “operator overall” score will distort roster behavior and make the ladder feel unfair or exploitable.
- **Room drift.** If room gating is only described in docs and not expressed in choices or outcomes, the refactor will flatten skyscraper progression instead of sharpening it.
- **Dual-system confusion.** The old institutional model and the new rival model cannot both remain first-class for long without making the endgame harder to read.

## Out Of Scope

- direct-control rival battles
- full rival raid simulation
- rival headquarters interiors
- a fourth headquarters tier
- a deeper non-pressure redesign of unrelated Bodega / Porter's gameplay loops

## Deliverables

- `docs/plans/skyscraper-rival-pressure-refactor.md`
- a follow-up implementation slice that names the first room-gated public-pressure contract
- a follow-up implementation slice that names the first rival leader set and leaderboard substrate
- a follow-up building / room / world-doc update that extends the current skyscraper floor canon to include the `Market Intelligence Floor`
- later roadmap / product-doc updates once the direction is approved tightly enough to replace the current institutional-pressure wording

## Completion Notes

When this plan is implemented:

- retire or fold back the current “Executive Floor institutional pressure” wording in roadmap and product docs
- retire the old `Visible Institution` model and management-panel surface completely
- describe the skyscraper endgame as a two-track pressure model centered on public visibility and rival guilds
- explicitly record rival battles as a later expansion path if the new rival system proves strong enough to justify that escalation
