# Ascension Rendering and Assets

## Rendering Model

Ascension uses a deliberate hybrid renderer:

- Canvas 2D for building floors, city map, and raid watch world-scale views
- live SVG for focused operator detail views and richer inspection contexts

Important constraint:

- the world renderer should not become a DOM-heavy scene graph
- the detail renderer is where richer composition and animation belong

This document defines rendering behavior and information exposure, not final styling, spacing, or exact component composition.

## SVG Asset Strategy

Do not rely on runtime full-character SVG generation.

Use a modular parts library:

- hair
- body bases and silhouettes
- faces and facial details
- clothing layers
- accessories
- role signifiers
- palette variants
- pose-ready templates

Runtime flow:

1. generate operator metadata
2. search the local SVG-part library through a tool
3. return tagged candidate parts
4. select from those candidates
5. assemble the final visual locally

## Tagged Asset Search

Each reusable part should store searchable metadata such as:

- `id`
- `category`
- `tags`
- `paletteTags`
- `roleTags`
- `bodyCompatibility`
- `poseCompatibility`
- `rarity`

Caching should exist at two levels:

- part index/search cache
- assembled visual cache

Validation should reject:

- missing required tags
- incompatible body or pose mappings
- duplicate ids
- duplicate low-signal tags that make search noisy

## Operator Visual Selection

Selection is hybrid:

- silhouette-defining core choices are deterministic from metadata
- secondary accents and accessories come from constrained variation pools

This keeps operators recognizable while still allowing variety.

The selected visual recipe should be treated as derived structured data, not hand-built ad hoc in UI code.

## Equipment Visibility Scope

Mechanically, more gear can exist than is shown visually.

Recommended MVP visible equipment scope:

- weapon
- outfit or armor overlay
- one accessory layer

Other equipment slots may exist mechanically without distinct visible representation yet.

## Appearance Contexts

Operators should have two presentation contexts:

- casual/base appearance for HQ and other non-raid contexts
- raid appearance assembled from equipped visible gear when deployed

This keeps everyday world rendering simpler while still letting raid preparation and progression show up visually where it matters.

## Animation Priorities

Animation should prioritize readability and feedback over spectacle.

Priority order:

1. state-change effects
2. raid-watch readability
3. room and UI feedback
4. richer profile/detail animation
5. only then more elaborate world-actor animation

## Raid Watch Rendering

Base raid watch mode should stay minimal:

- teams and enemy groups read as abstract markers first
- dots, markers, lightweight labels, and status marks are enough

When the player clicks a team marker:

- the view shifts into a focused inspection state
- richer portraits, grouped threat cards, status details, and readable logs appear
- the player remains a pure observer

Threats stay grouped even when focused. A boss is still a group of one.

Rendering rule:

- raid-watch rendering consumes structured simulation/view data
- it should not invent gameplay state on the rendering side

## World View vs Detail View

Recommended rule:

- HQ/world views use casual/base appearance
- focused raid/detail views resolve visible raid gear

That is enough for MVP and avoids overbuilding the world renderer.
