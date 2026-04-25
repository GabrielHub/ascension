# Product Documentation

This folder owns **content tables and content requirements** for *Hazard-Pay: Dungeon Management*. Reference it when **creating content or assets** — what to build, in what order, with what requirements.

This folder is **not** for tone, voice, or lore (see `docs/world/`), implementation steps (see `docs/plans/`), or gameplay logic (see code).

## How Product Docs Are Organized

Two content shapes:

- **Enumerated tables.** Strict, named-entry tables for finite content: presenters, rooms, floors, unique operators, unique weapons, unique dungeons, individual rivals, visual effects pool, key guide events.
- **Pattern requirements.** Per-tier/per-rank requirement docs for content that expands infinitely following a pattern: regular operators by rank, regular weapons by tier, regular dungeons by rank, regular bosses, narrative event families.
- **Hybrid (both).** Operators, weapons, dungeons, and rivals get BOTH a roster table AND a requirements doc. Each individual rival is canonically authored, but the rival system is infinitely expandable.

## File Map

### Conventions

- [Content Taxonomy](./content-taxonomy.md) — IDs, tags, naming patterns, slash-delimited entity formats.
- [Image Generation Prompting Guide](./image-generation-prompting-guide.md) — repo-specific raster image generation rules.

### Pattern Requirements (in scope)

- [Narrative Event Requirements](./narrative-events.md) — what makes a valid narrative event family.
- [Guide Event Requirements](./guide-events.md) — what makes a valid guide objective.
- [Rival Guild Creation](./rival-guilds.md) — rival guild content packet requirements for the rewrite. Implementation lives in `rewrite/rival-loop` and `rewrite/rivals-catalog`.
- [Asset Pipeline Contract](./asset-pipeline.md) — asset family inventory, layer model, directory conventions, generation paths, workflow rules.
- [Visual / UI Direction](./ui-direction.md) — color palette, panel patterns, tooltip pattern, animation library, consolidation rules. Replicates the existing game's visual language.
- [Operator Rank Requirements](./operator-ranks.md) — stat envelopes, kit pool requirements, AI generation workflow, visual escalation per rank.
- [Weapon Tier Requirements](./weapon-tiers.md) — stat budgets per tier, mystical effect rules, base / dungeon-bound / unique weapon categories, naming and visual escalation.
- [Dungeon Rank Requirements](./dungeon-ranks.md) — dungeon structure, contract loop, boss complexity, enemy roster, loot model, theme bands, and visual escalation per rank.
- [Unique Operator Requirements](./unique-operators.md) — authoring packet shape (operator + paired boss + paired dungeon, with optional unique weapon follow-on), identity, stat envelope, unique kit rules, unlock chain composition, custom-logic allowance, behavior canon.
- [Unique Weapon Requirements](./unique-weapons.md) — stat budget, signature effect rules (paired-wielder lock), layered unlock chain after operator, equip behavior, custom-logic allowance, visual authoring.
- [Unique Dungeon Requirements](./unique-dungeons.md) — mythical theme, unique boss complexity, loot model, post-defeat re-raidability, access gating, custom-logic allowance.

### Enumerated Tables (in scope)

- [Rooms Catalog](./rooms-catalog.md) — every room with feature ownership, click behavior, tier mechanics.
- [Floors Catalog](./floors-catalog.md) — floor stack, prerequisite chains, and the Progression-Tier backbone.
- [Room Themes](./room-themes.md) — visual canon for asset authoring (themes + per-tier visual trajectories).
- [Presenters Catalog](./presenters-catalog.md) — room → presenter binding table and per-presenter beat ownership.
- [Visual Effects Pool](./visual-effects-pool.md) — the 5 enumerated VFX with attack-type mapping, per-rank scaling, and color override rules.

## Design Backlog (Blocked Product Docs)

These product docs do not exist yet because they require a design back-and-forth to lock first. **Remove the entry from this list when the discussion is complete and the resulting product doc is authored** — do not just check it off, delete the line entirely.

Order is rough priority. Items marked with **(gateway)** unblock multiple downstream items.

- **Unique operators / weapons / dungeons rosters** — once individual unique sub-plans start shipping, populate enumerated roster docs as a tracking surface for authored uniques. One roster doc per unique surface (operators / weapons / dungeons).
- **Morale & Loyalty system doc** — flagged during dungeon-ranks pass: morale is referenced across docs but lacks a focused contract for how it decays, recovers, and gates dispatch. Recommend either a small `morale.md` product doc or expansion of HR section in rooms-catalog + operator stats section in operators-and-staff.

## Cross-Doc Rules

- No layer duplicates content owned by another. World docs describe what something feels like; product docs link to that — they do not redescribe.
- Information that lives in code is referenced from docs and plans, not re-stated.
- When a sub-plan ships, its content table here gets a row marked `completed`. Tables track completion at a glance.
