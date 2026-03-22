# Product Presentation Direction

This file owns future-facing visual, presentation, and approval-loop direction for the product plan.

## Visual And Asset Direction

- The project needs real authored environment assets for headquarters rooms, props, fixtures, and first-pass raid spaces, not only schematic placeholders.
- Headquarters environment assets should use an angled interior presentation language with readable floor planes, wall planes, corners, thresholds, and furnished room layouts.
- The HQ target is closer to connected isometric room-box composition than to flat top-down plans, side elevations, or simple cross-section slices.
- HQ room kits must be tileable modules on a shared isometric grid so the runtime can compose connected floor plans inside the bodega shell rather than showing standalone diorama rooms at arbitrary coordinates.
- Raid base-map assets are a separate visual family: flat top-down minimap surfaces, tiles, fog, markers, and feature icons optimized for readable exploration and team movement.
- Environment assets must read as inhabitable rooms with walkable space and believable furniture placement, not as abstract symbols placed on a room card.
- Flat top-down room diagrams, pure side-view cutaways, and simple wall-slice cross-sections are not valid target styles for approved HQ environment work.
- The bodega should be presented as a world-first full-screen space with overlay UI, not as a boxed map widget surrounded by primary chrome.
- HQ and raid base views should render lightweight in-world actor tokens or chibi markers that resolve into portrait/detail overlays when focused.
- HQ should visibly show operators and staff moving between rooms according to the simulation, rather than only describing those state changes in side panels.
- HQ actor renders should match the portrait language, but they should derive from the same identity source rather than requiring a separate operator metadata branch.
- HQ presentation should stay casual: operators are not shown wearing raid armor or carrying deployed weapons while moving around the bodega.
- The opening slice should begin with a small starter roster of operators and a broader authored recruit pool, with roughly twenty intentionally designed operator identities available across the starting content set.
- Operators should move toward modular authored assembly from parts such as head shape, hair, eyes, face details, and body silhouette.
- Deterministic seeded assembly is the near-term goal. LLM-assisted character generation remains a later extension, not a dependency for finishing the slice.
- Lighting should begin with a small shared render-effects abstraction using practical 2D techniques such as baked shading, shadow layers, emissive accents, and simple masks.
- Custom shader work should remain a later implementation behind that shared abstraction, once the art language, camera behavior, and room composition rules are stable.

## HQ Environment Presentation Language

- Canonical HQ direction is angled/isometric interior presentation with a visible room box, not a flat plan or side cutaway.
- HQ room modules must share one canonical footprint and one canonical isometric grid so adjacent rooms can snap together cleanly inside the building shell.
- HQ visual composition must be layered rather than monolithic:
  - shell/perimeter assets own the building envelope and cutaway silhouette
  - structural assets own floor modules, wall segments, corners, thresholds, doors, and windows
  - room recipes choose structural openings and place furniture/fixture anchors
  - prop assets provide the actual desks, chairs, cabinets, beds, lights, signage, plants, and similar room contents
  - building theme/style specs provide material and palette families such as bodega surfaces now and future tower/interior finishes later
- Each HQ room should read through three layers at minimum:
  - floor plane
  - enclosing wall planes
  - furnished contents and fixtures
- Doors, windows, and thresholds should feel like openings in a room box, not icons pasted onto a flat wall strip.
- Furniture should be composed as room layout, with clear circulation space and readable occupancy, rather than as isolated hero props floating in empty space.
- Reusable HQ parts should support composition, but the approved target is a connected floor plan built from tileable room modules and room recipes, not a set of interchangeable standalone diorama rooms.
- Floors, wall angles, corners, and doorway anchors must align across neighboring rooms so the runtime can place multiple rooms side by side without visible geometric drift.
- Room-definition assets must not each own their full floor and wall box when they are intended to be composed into one building. Monolithic room-scene SVGs are valid exploration only, not approved target architecture.
- The intended future building pipeline should support swapping structural/theme families, such as bodega finishes now and office-tower or luxury finishes later, without redefining the room-composition model itself.
- Operators and their attachments already have a satisfactory style direction. This HQ environment-language correction applies to rooms, room props, environmental fixtures, and shells.

## Raid Presentation Direction

- Raids should use a full-screen map-first presentation in React/Tailwind UI, matching the HQ world-first presentation model without requiring a canvas renderer.
- The base raid view should stay in the Towns-like minimap spirit: teams are lightweight dots or markers exploring a flat top-down dungeon map.
- Canvas is an implementation option, not a product requirement. The approved base raid view is a readable top-down map UI with lightweight markers and focused portrait/detail overlays.
- The raid base view is not an isometric room-scene presentation and should not inherit HQ room-box composition rules.
- Raid authored assets for the base view should be top-down map tiles, fog treatments, feature icons, marker shapes, and encounter indicators optimized for exploration readability.
- In the current gameplay scope, the guild secures one government clearance contract at a time.
- That secured contract determines the one active dungeon currently available to raid.
- Multiple operator teams may exist in that same contracted dungeon at once.
- Fog of war should reveal explored space as teams move through the dungeon.
- Raid teams should enter dungeons with explicit autonomous goals such as looting, exploring, gathering intel, hunting threats, or attempting the boss.
- Teams should autonomously decide when to leave, regroup, scout, or escalate to a boss attempt instead of always pushing to completion in one trip.
- Ordinary enemies should continue to respawn in the dungeon over time.
- The active dungeon remains the guild's contract focus until its boss is defeated or the contract is lost.
- Early contract loss should be possible and survivable; later layers can escalate failure into more severe organizational consequences.
- Clicking a team enters a focused overlay mode that reveals portraits, enemy visuals when currently fighting, and the event log.
- Raid rendering should stay lighter and more abstract than HQ rendering, even when the underlying assets are authored and real.
- If raids later use richer focus backdrops or encounter scenes, those are secondary overlays, not the canonical base-map language.

## Approval Loop

- Visual assets must pass through generalized SVG experimentation tooling or an asset viewer before promotion into canonical asset directories.
- Audio cues and ambience layers must pass through an audio playground before promotion into the default experience.
- Human review is required before assets or sounds are treated as approved slice content.
- When a visual direction is invalidated, stale assets, manifests, viewer references, and doc references should be removed rather than preserved as backward-compatible legacy examples.
