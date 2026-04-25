# Room Themes

Visual canon for the 18 rooms in the skyscraper. One-sentence theme + visual trajectory keywords per tier. Use this when authoring room art assets.

Pairs with [Rooms Catalog](./rooms-catalog.md) (mechanical features, click behavior, tier mechanics) and [Floors Catalog](./floors-catalog.md) (stack and prereqs). Read [World Foundation](../world/index.md) for tone and presenter voice.

## Asset Production Rules

- **Room shells start small at T1 and grow with tier upgrades.** The canvas grid footprint stays constant from T1 onward; the asset itself replaces with a larger version that fills more of the reserved space at each tier. Late-game rooms (Penthouse) may ship near-full assets at T1.
- **One canonical visual stage per mechanical tier** for any room that tiers up. Make sure each tier has a visible visual change, even if subtle (nicer chairs, an added screen, more organization).
- **Chibi tokens stay flat 2D**, contrasting the painted backdrop. Backdrops are raster; the floating floor scene hosts chibi movement.
- **Background removal is a manual step.** Generated backdrops are run through a background remover by the human after generation.

## Per-Room Themes

### Foundations Floor

#### Lobby *(no tier — intentional comedic anchor)*

- **Theme:** the guild's small front office where the assistant works and the guild's lifetime standing is tracked.
- **Visual:** budget reception. Folding table where Mara works, a cheap couch, the guild's name printed on paper taped to the wall.
- **Note:** Lobby never tiers up. Even at endgame, this room looks like it did day 1. The guild outgrew it but never bothered to upgrade — that's the joke.

#### Progression-Tier *(6 stages, one per PT level)*

- **Theme:** the growing office of the guild — where cash and reputation buy expansion across the building.
- **Visual:** T1 permits-on-wall corner → T2 small office with one desk → T3 cubicles (corporate office) → T4 open-plan corporate floor → T5 executive offices → T6 C-suite operations.

### Recruitment Floor

#### Recruitment *(4 stages)*

- **Theme:** a space that draws visitors from outside the guild in, lets them hang out, and creates repeat customers who eventually become operators.
- **Visual:** T1 job board → T2 small restaurant → T3 classy restaurant + bar → T4 fancy nightclub (with a dining section + bar inside).

### Operations Floor

#### Operations Management *(3 stages, meeting-room theme)*

- **Theme:** the contracts desk where the guild picks up new jobs and tracks the active site.
- **Visual:** T1 small meeting room with a paper-pinned board → T2 conference room with screens → T3 executive boardroom with full threat and contract displays.
- **Differentiation note:** Operations Management is **bright, glass-walled, conference-room energy.** Distinct from War Room's dim/strategic feel.

#### Team Staging *(3 stages)*

- **Theme:** where teams form up, prep their kits, and head out the door.
- **Visual:** T1 locker room → T2 staging area with pre-deployment table → T3 tactical readiness center with kit stations.

### Workshop Floor

#### Market *(3 stages)*

- **Theme:** where weapons get bought from the open market and sold off when the guild has too many.
- **Visual:** T1 procurement desk with weapon crates → T2 weapons showroom with display cases → T3 upscale weapons gallery.

#### Armory *(3 stages)*

- **Theme:** where the guild stores its weapons and operators pick up their loadouts before deployment.
- **Visual:** T1 open weapon rack → T2 organized cabinets with rank labels → T3 full armory with locked cases.

### HR Floor

#### HR *(3 stages)*

- **Theme:** where the human side of the guild gets handled — drama, morale, retention.
- **Visual:** T1 closet office with one desk → T2 proper HR office with a couch and private door → T3 full HR suite with conference room.

### Medical Floor

#### Medical *(3 stages)*

- **Theme:** where injured operators recover and get medical treatment between raids.
- **Visual:** T1 cots and first-aid → T2 clinic with exam tables → T3 trauma bay with imaging and surgical capability.

### Training Floor

#### Training *(3 stages)*

- **Theme:** where operators push their stats within rank caps. Sweating, sparring, drilling.
- **Visual:** T1 home gym → T2 full gym → T3 gym + combat sports arena (combined into one room).

### Memorial Floor

#### Hall of Honor *(3 stages, columbarium theme)*

- **Theme:** the wall that remembers operators who died for the guild, sorted by rank, capped to keep only the most notable.
- **Visual:** T1 small marble alcove with a few niches → T2 marble columbarium wall → T3 full columbarium hall.
- **Note:** **columbarium** = the structure with marble walls and niches for cremation remains, plaques with names. Use this terminology in asset prompts.

#### Raid Archive *(2 stages)*

- **Theme:** the institutional record of every raid the guild has run — searchable, browsable, the guild's memory.
- **Visual:** T1 manual filing cabinets → T2 digital server rack with screens.

#### Tribute Hall *(3 stages, war-memorial theme)*

- **Theme:** a space honoring the dead so their loss becomes ongoing support for the guild.
- **Visual:** T1 small alcove with engraved plaques → T2 memorial wall with names listed by rank → T3 full memorial hall with sectional plaques (military-memorial style).

### Scouting Floor

#### Scouting Room *(3 stages)*

- **Theme:** where the guild watches the competition before engaging them — the leaderboard and rival scouting surface.
- **Visual:** T1 clippings wall and pinned photos → T2 scouting office with files and digital boards → T3 surveillance hub with live tracking.

### War Floor

#### War Room *(3 stages)*

- **Theme:** where the institutional rivalry is fought — current rival, their HP, and the campaign against them.
- **Visual:** T1 dim planning table with one wall screen → T2 strategic command room with multiple screens → T3 war command center with predictive boards.
- **Differentiation note:** War Room is **dim, strategic, command-center energy.** Distinct from Operations Management's bright/conference feel. Both use screens but read very differently.

### Elite Recruitment Floor

#### Unique Operator *(2 stages)*

- **Theme:** an exclusive private space where the guild meets famous operators who are auditioning the player as much as the player auditions them.
- **Visual:** T1 private lounge with leather chairs and a fireplace → T2 luxury negotiation suite with multiple seating areas.

### Elite Workshop Floor

#### Unique Weapon *(2 stages, museum theme)*

- **Theme:** a vault of named weapons, each waiting for its specific unique operator to claim it through their own goal chain.
- **Visual:** T1 small museum with display cases → T2 grand museum gallery with sectioned exhibits.

### Penthouse Floor

#### Penthouse *(no tier)*

- **Theme:** the rooftop lounge that says "you live here now" to the unique operators the guild has courted.
- **Visual:** rooftop penthouse lounge — floor-to-ceiling windows with NYC skyline, bar, soft seating, atmospheric lived-in details (a sleeping dog, a chess set mid-game, a guitar leaning on a wall).
- **Note:** uniques walk here only — Unique Operator room, Unique Weapon room, and Penthouse are the only three rooms where uniques visually appear.

## Cross-Doc References

- Mechanical features per room: [Rooms Catalog](./rooms-catalog.md)
- Floor stack + prereqs: [Floors Catalog](./floors-catalog.md)
- Asset pipeline contract (raster + chibi rules): [Asset Pipeline Contract](./asset-pipeline.md)
- Operator-in-room behavior (uniques don't train, etc.): [Operators And Staff](../world/operators-and-staff.md), `rewrite/operator-model`, and `rewrite/operator-movement`
- Tone and presenter voice: [World Foundation](../world/index.md)
