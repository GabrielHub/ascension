# Presenters Catalog

The canonical room → presenter binding table. Owns operational mappings for which presenter speaks for events fired in which room. Voice canon (name, age, background, voice rules, default mode, expressions) lives in [Operators And Staff](../world/operators-and-staff.md) — this doc references that for voice.

## Roster Quick Reference

| Presenter | ID | Function | Primary Rooms |
|---|---|---|---|
| Mara Cordero | `presenter/assistant` | Operations | Lobby, Operations Management, Team Staging, Training, Raid Archive |
| Rafi Alvarez | `presenter/cook` | People-care | HR, Penthouse |
| Sloane Becker | `presenter/bartender` | Front-of-house | Recruitment, Unique Operator |
| Vicente Ortega | `presenter/vicente-ortega` | Workshop | Market, Armory, Unique Weapon |
| Dr. June Park | `presenter/dr-june-park` | Medical | Medical, Hall of Honor, Tribute Hall |
| Laura Bennett | `presenter/compliance-officer` | Institutional | Progression-Tier, Scouting Room, War Room |

## Per-Presenter Ownership

### Mara Cordero — `presenter/assistant`

- **Function:** Operations.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#mara-cordero) — composed, dry, efficient, treats supernatural disaster like bad paperwork.
- **Primary rooms:**
  - Lobby — guild lifetime summary, the assistant's home base.
  - Operations Management — contract bidding, active contract status, threat hints.
  - Team Staging — team formation, idle roster, team detail.
  - Training — training readiness, "how do we keep them sharp."
  - Raid Archive — past raid records, the guild's institutional memory.
- **Secondary domains:**
  - War Room (tactical operations side, when the issue is mission planning rather than institutional rivalry).
  - Fallback voice for any room without a more specific domain presenter.
- **Beat ownership:**
  - Contracts, bidding, result review, general operations framing.
  - Training drills and readiness.
  - Raid result records and "how the run actually went."
  - Catch-all guide events when no other presenter's domain caused the beat.

### Rafi Alvarez — `presenter/cook`

- **Function:** People-care.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#rafi-alvarez) — blunt, tired, protective. Clipped statements with dry humor under fatigue.
- **Primary rooms:**
  - HR — workplace drama, morale, retention.
  - Penthouse — hosting unique operators, lounge atmosphere.
- **Secondary domains:**
  - Recruitment for food/dining-specific beats at T2+ (small restaurant, classy restaurant + bar). Sloane is primary on Recruitment overall; Rafi covers the kitchen/dining angle.
  - Hall of Honor for comfort-during-loss beats (the "feeding the team after they took it badly" angle), when June's medical framing isn't the right voice.
- **Beat ownership:**
  - HR drama, morale slumps, retention worries.
  - Recovery-through-comfort beats where the emphasis is care, hospitality, or workplace welfare rather than medicine.
  - Hosting beats in the Penthouse — unique operators settling in.

### Sloane Becker — `presenter/bartender`

- **Function:** Front-of-house.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#sloane-becker) — cool, observational, unsentimental. Speaks with economy.
- **Primary rooms:**
  - Recruitment (all tiers — job board, restaurant, restaurant + bar, nightclub).
  - Unique Operator — high-end private recruitment.
- **Secondary domains:**
  - None (her domain is tightly bound to recruitment surfaces).
- **Beat ownership:**
  - Visitor reads, "I watched them walk in, here's what I saw."
  - Front-of-house intake pressure, nightlife and social pressure beats.
  - High-end negotiation reads for unique operators.

### Vicente Ortega — `presenter/vicente-ortega`

- **Function:** Workshop.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#vicente-ortega) — fast-talking terminally-online teen-prodigy register that drops to clipped focus when operators are in danger.
- **Primary rooms:**
  - Market — weapon buy/sell, market refresh framing.
  - Armory — equip flow teaching, loadout pressure.
  - Unique Weapon — vault/museum framing for authored uniques.
- **Secondary domains:**
  - None.
- **Beat ownership:**
  - Gear readiness, loadouts, equip teaching.
  - Loot triage, manual selling, loot-filter teaching.
  - Stock pressure, market refresh, weapon-quality reads.

### Dr. June Park — `presenter/dr-june-park`

- **Function:** Medical.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#dr-june-park) — clinical, direct, economical, with a dry exasperated edge.
- **Primary rooms:**
  - Medical — recovery management, injury triage.
  - Hall of Honor — death framing on the medical / "what actually happened" side.
  - Tribute Hall — memorial / honoring beats.
- **Secondary domains:**
  - Training for medical-side training beats (overtraining injuries, fatigue, "your gym is going to break someone").
  - Operator-death narrative events (medical-side framing — "here's what happened, here's how bad it was").
- **Beat ownership:**
  - Injury, recovery, treatment beats.
  - Operator-death medical framing.
  - Memorial / "this is who we lost" beats.

### Laura Bennett — `presenter/compliance-officer`

- **Function:** Institutional.
- **Voice canon:** [Operators And Staff](../world/operators-and-staff.md#laura-bennett) — precise, controlled, professionally merciless.
- **Primary rooms:**
  - Progression-Tier — executive spending decisions, "this is what it costs."
  - Scouting Room — rival scouting, watching the competition.
  - War Room — institutional rivalry framing, the campaign against the current rival.
- **Secondary domains:**
  - HR for policy beats (Rafi is primary on HR for human-care; Laura covers "this isn't a crisis yet, but it becomes one if we ignore it").
  - Tribute Hall for institutional honoring beats ("what their loss bought us, on paper").
  - Operator-death narrative events (oversight-paperwork side — "we have to file this").
- **Beat ownership:**
  - Executive spending decisions, "are we sure we want to commit to this."
  - Rival scouting, institutional rivalry, oversight paperwork.
  - Paperwork-side of consequence beats — the part that comes after the medical or social beat is over.

## Room → Presenter Coverage Matrix

| Room | Primary | Secondary / Co-owns |
|---|---|---|
| Lobby | Mara | — |
| Progression-Tier | Laura | Mara (operations side) |
| Recruitment | Sloane | Rafi (food/dining beats T2+) |
| Operations Management | Mara | — |
| Team Staging | Mara | — |
| Market | Vicente | — |
| Armory | Vicente | — |
| HR | Rafi | Laura (policy beats) |
| Medical | June | — |
| Training | Mara | June (medical-side training beats) |
| Hall of Honor | June | Laura (paperwork side of death), Rafi (comfort-during-loss) |
| Raid Archive | Mara | — |
| Tribute Hall | June | Laura (institutional honoring) |
| Scouting Room | Laura | — |
| War Room | Laura | Mara (tactical operations side) |
| Unique Operator | Sloane | — |
| Unique Weapon | Vicente | — |
| Penthouse | Rafi | — |

## Selection Rules

- **Every event must bind exactly one presenter.** One voice per beat. Never anonymous narrator copy.
- **When multiple presenters could plausibly speak, pick the one whose domain *caused* the beat to surface** — not the one nearest in physical space. (e.g. an operator-death event where the medical cause is the focus → June. An operator-death event where the institutional cost is the focus → Laura.)
- **Fallback to Mara** if no specific presenter applies. She is the assistant fallback by canon.
- **Voice rules apply at the bound presenter's current expression** (`neutral`, `concerned`, `serious`, `amused`). AI-framed prose honors the voice brief at that expression. See world doc for voice canon.
- **Tragedy mode overrides comedy registers.** When an operator dies, raid wipes, or major loss occurs, every presenter's humor recedes regardless of their default mode. Vicente's brainrot register and June's clinical deadpan are load-bearing only in comedy mode.

## Cross-Doc References

- Voice canon (name, age, background, voice rules, default mode, expressions): [Operators And Staff](../world/operators-and-staff.md)
- Room features and click behavior: [Rooms Catalog](./rooms-catalog.md)
- Narrative event family + presenter binding rules: [Narrative Event Requirements](./narrative-events.md)
- Guide event presenter binding (blocking-mode events): [Guide Event Requirements](./guide-events.md)
- Rival event presenter binding: [Rival Guild Creation](./rival-guilds.md)
