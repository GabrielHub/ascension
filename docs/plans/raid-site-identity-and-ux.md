# Raid Site Identity And UX

Execution brief for making each dungeon read as a real place with its own visual identity, reward identity, and planning language without requiring a bespoke UI codepath per site.

## Why This Exists

The world foundation is clear that dungeon concept drives identity:

- concept drives visual style, enemies, hazards, and boss identity
- same-rank dungeons should still feel different because concept determines identity
- dungeon-themed loot should visibly carry cues from the source concept

The current raid UI is structurally solid, but it is still mostly generic. The game needs a site-identity layer on top of the common raid shell so the world reads as authored rather than abstract.

## Core Decision

Do not build one bespoke UI per dungeon.

Build one shared raid UI contract with theme slots that can be filled by site data.

That keeps interaction stable while allowing each dungeon to feel different through:

- map treatment
- icon family
- copy tone
- color accents
- enemy marker styling
- loot family styling
- boss identity surfaces
- contract-board presentation cards

## Shared Shell, Themed Slots

Keep one common raid-shell structure:

- operations contract card
- raid map
- bottom inspection surface
- right-side event rail
- interruption/modal layer

Expose a site-theme package that supplies:

- `siteConceptId`
- `themeLabel`
- `accentPalette`
- `fogTreatmentId`
- `markerStyleId`
- `featureIconFamilyId`
- `enemyPresentationFamilyId`
- `lootPresentationFamilyId`
- `bossPresentationId`
- `copyFragments`

The UI should read this package and skin the shared shell, not fork the component tree by dungeon.

## Required UI States

### 1. Contract bidding

Each posted contract card should communicate identity, not only stats.

Minimum fields:

- contract type
- site concept name
- neighborhood
- rank
- reward range
- intel confidence
- risk level
- known enemy/hazard hints
- expected loot family

This is where dungeon choice starts to matter.

### 2. Active dungeon

The base raid map should remain abstract and top-down, but the site should still read clearly through:

- themed fog and backdrop treatment
- concept-specific feature labels
- enemy marker family differences
- boss-site callouts
- concept-specific event text

### 3. Boss approach and boss defeat

When the boss becomes the focus, the site identity should sharpen.

- boss-approach interruption should foreground boss name, concept, and known dangers
- boss-defeat summary should foreground what was cleared, what was recovered, and what changed in the city-facing contract outcome

### 4. Post-contract review

The result surface should tie together:

- site concept
- operator outcome
- loot recovered
- boss defeated or contract lost
- next-contract choice

This is the bridge between one living place and the next.

## Dungeon Identity Data Model

Add a site concept template layer that owns authored identity instead of spreading it loosely across mission, loot, and presentation.

Recommended fields:

- `siteConceptId`
- `name`
- `districtPool`
- `worldSpaceLabel`
- `conceptSummary`
- `threatProfileTags`
- `hazardTags`
- `enemyFamilyIds`
- `bossFamilyId`
- `lootFamilyIds`
- `visualThemeId`
- `audioThemeId`
- `copyStyleTags`

Mission templates should still own objective logic. Site concept templates should own what the place is.

## Themed Loot And Gear Direction

Dungeon choice should shape what the guild brings home.

First-pass rules:

- each site concept owns one or more monster-part loot families
- boss loot always references the active site concept plus rank band
- site concepts can weight toward certain gear families or affix groups
- inventory and reward summaries should expose that source identity in names, icons, and tags

This should support emergent choice:

- choose the safer contract for reliable cash
- choose the specific dungeon because its loot family feeds the gear strategy you want

## Intel And Risk UX Direction

Intel and risk need both mechanical effect and presentation effect.

### Intel should control what the player knows

- known vs unknown site traits
- known boss hints
- known enemy family hints
- estimated reward range instead of exact confidence when intel is weak

### Risk should control what the player expects to lose

- injury pressure
- wipe pressure
- contract-failure pressure
- recovery burden after the run

The contract board should show both, but imperfectly:

- high intel means narrower, more trustworthy previews
- low intel means broader, less certain previews

## Implementation Order

1. Add site concept templates and theme package references.
2. Make contract postings reference a site concept directly.
3. Add known/hidden intel fields to contract postings.
4. Theme the contract board and active raid shell from site concept data.
5. Theme loot family naming and icon sourcing from site concept data.
6. Add boss-defeat and contract-loss summary surfaces that carry site identity through the result flow.

## Deliberately Deferred

- fully bespoke map layouts and UI choreography per site
- dynamic music systems beyond simple themed package selection
- procedural generation of complete dungeon fiction bundles

## Acceptance Criteria

- Two contracts with the same rank but different concepts feel visibly different in the board.
- The active raid map can change site identity without changing the shared interaction model.
- Loot and boss summaries clearly reference the dungeon concept they came from.
- Intel changes what the player knows before bidding.
- Risk changes both displayed expectations and actual outcomes.

## Test Coverage Needed

- Contract postings round-trip site concept and theme references
- Different site concepts produce different UI-facing theme payloads
- Reward summaries preserve source site identity
- Low-intel postings hide more site details than high-intel postings
