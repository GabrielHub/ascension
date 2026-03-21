# Ascension Product Plan

This document is future-facing only. Implemented behavior belongs in code and tests.

## Premise

Ascension is a management sim about building a dungeon-clearing guild in near-future New York City. The player starts with a shabby improvised headquarters and grows toward civic, commercial, and supernatural relevance. The fantasy is not direct combat. The fantasy is recognition, leverage, logistics, and upward mobility.

## Core Fantasy

The game should make the player feel all of the following:

- I found talent before richer guilds did.
- I turned an embarrassing little operation into a serious institution.
- My building reflects my ambition.
- I send autonomous people into danger and live with the consequences.
- New York feels like a real place distorted by a supernatural labor market.

## Pillars

- Management over action. The player shapes conditions and policy, not moment-to-moment combat.
- Place matters. This should read as New York, not generic urban fantasy.
- Social recruitment is gameplay. Public-facing rooms should matter because they change who shows up and who stays.
- Upward mobility is visible. Moving from bodega to larger headquarters should feel emotionally legible.
- Autonomy creates stories. Operators should remain understandable but not fully obedient.
- People remember treatment. Long-term trust, retention, and relationship consequences should matter.

## Future Product Priorities

- Finish the visual vertical slice before broadening systems further: the bodega, its rooms, and the first raid spaces should exist as real authored environments.
- Deepen the bodega loop until multiple early strategies are viable and failure states are legible.
- Expand from one headquarters tier into larger buildings that change spatial and staffing decisions, not just numbers.
- Grow external pressure through reputation, regulation, competition, and factional response.
- Push operator social memory, injury, recovery, and retention further so roster management stays central.
- Increase mission and event variety without losing the observational, non-direct-control identity.

## Visual And Asset Direction

- The project needs real authored environment assets for headquarters rooms, props, fixtures, and first-pass raid spaces, not only schematic placeholders.
- The bodega should be presented as a world-first full-screen space with overlay UI, not as a boxed map widget surrounded by primary chrome.
- HQ and raid base views should render lightweight in-world actor tokens or chibi markers that resolve into portrait/detail overlays when focused.
- HQ should visibly show operators and staff moving between rooms according to the simulation, rather than only describing those state changes in side panels.
- Operators should move toward modular authored assembly from parts such as head shape, hair, eyes, face details, and body silhouette.
- Deterministic seeded assembly is the near-term goal. LLM-assisted character generation remains a later extension, not a dependency for finishing the slice.
- Lighting should begin with practical 2D presentation techniques such as baked shading, shadow layers, emissive accents, and simple masks. A full lighting shader should wait until the art language, camera behavior, and room composition rules are stable.

## Raid Presentation Direction

- Raids should use a full-screen canvas dungeon map with React overlays above it, matching the HQ world-first presentation model.
- The base raid view should stay in the Towns-like minimap spirit: teams are lightweight dots or markers exploring the dungeon.
- Multiple operator teams may exist in the same active dungeon at once.
- Fog of war should reveal explored space as teams move through the dungeon.
- For Phase 1, there is only one active raid dungeon at a time.
- Once that dungeon is fully explored, it is no longer raidable.
- Clicking a team enters a focused overlay mode that reveals portraits, enemy visuals when currently fighting, and the event log.
- Raid rendering should stay lighter and more abstract than HQ rendering, even when the underlying assets are authored and real.

## Approval Loop

- Visual assets must pass through the SVG playground or asset viewer before promotion into canonical asset directories.
- Audio cues and ambience layers must pass through an audio playground before promotion into the default experience.
- Human review is required before assets or sounds are treated as approved slice content.

## Future Constraints

- Do not pivot into a direct-control combat game.
- Do not make runtime AI a hard dependency for the core loop.
- Do not treat the bodega slice as the final shape of building progression.
- Do not overbuild tower-scale or prestige content before the midgame proves itself.

## Open Questions

- What should the first post-bodega building change mechanically beyond simple capacity growth?
- How much of future pressure should come from city institutions versus rival guilds versus the dungeon economy itself?
- Which operator-facing systems should deepen first after the current slice: loyalty, pairwise relationships, injuries, or training and growth?
- How much future visual variety should come from authored asset breadth versus more flexible composition rules?
