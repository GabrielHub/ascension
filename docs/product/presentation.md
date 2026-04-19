# Product Presentation Direction

This file owns future-facing visual, presentation, and approval-loop direction for the product plan. Use [Asset Production Contract](./asset-production.md) for the locked workflow that turns canon into repeatable asset production.

## Visual And Asset Direction

- The project needs real authored environment assets for headquarters rooms, props, fixtures, and first-pass raid spaces, not only schematic placeholders.
- Headquarters environment assets should use an angled interior presentation language with readable floor planes, wall planes, corners, thresholds, and furnished room layouts.
- The HQ target is closer to connected isometric room-box composition than to flat top-down plans, side elevations, or simple cross-section slices.
- HQ room kits must be tileable modules on a shared isometric grid so the runtime can compose connected floor plans inside the bodega shell rather than showing standalone diorama rooms at arbitrary coordinates.
- Raid base-map assets are a separate visual family: flat top-down minimap surfaces, tiles, fog, markers, and feature icons optimized for readable exploration and team movement.
- Environment assets must read as inhabitable rooms with walkable space and believable furniture placement, not as abstract symbols placed on a room card.
- Flat top-down room diagrams, pure side-view cutaways, and simple wall-slice cross-sections are not valid target styles for approved HQ environment work.
- The bodega should be presented as a world-first full-screen space with overlay UI, not as a boxed map widget surrounded by primary chrome.
- Overlay UI should use glass-like translucent panels that preserve visibility into the world behind them instead of boxing the scene away behind opaque chrome.
- HQ and raid base views should render lightweight in-world actor tokens or chibi markers that resolve into portrait/detail overlays when focused.
- HQ should visibly show operators and staff moving between rooms according to the simulation, rather than only describing those state changes in side panels.
- HQ actor renders should match the portrait language, but they should derive from the same identity source rather than requiring a separate operator metadata branch.
- HQ presentation should stay casual: operators are not shown wearing raid armor or carrying deployed weapons while moving around the bodega.
- The opening slice should begin with a small starter roster of operators and a broader authored recruit pool, with roughly twenty intentionally designed operator identities available across the starting content set.
- Operators should move toward modular authored assembly from parts such as head shape, hair, eyes, face details, and body silhouette.
- Deterministic seeded assembly is the near-term goal. LLM-assisted character generation remains a later extension, not a dependency for finishing the slice.
- Lighting should begin with a small shared render-effects abstraction using practical 2D techniques such as baked shading, shadow layers, emissive accents, and simple masks.
- Custom shader work should remain a later implementation behind that shared abstraction, once the art language, camera behavior, and room composition rules are stable.
- HQ exteriors should support a clock-driven four-state day-night cycle: `sunrise`, `day`, `sunset`, and `night`.
- The HQ day-night cycle is presentation-facing only by default. It changes the backdrop, skyline, exterior lighting, and decorative street dressing around the building shell; it does not add hidden gameplay modifiers on its own.
- HQ exterior composition should be shell-relative, not permanently ground-level. The core framing contract is the building shell in the center plus authored zones around it, not a fixed promise of sidewalk, street, and alley semantics.
- The current shipped bodega slice uses the unified static HQ scene contract for non-actor SVG placement: the active phase, tint/fog/shadow values, shell-relative backdrop metadata, room scenes, exterior modules, and fallback room props are all grid-anchored through the same runtime placement path.

## Overlay UI Direction

- HQ and raid screens should expose only one primary management category at a time rather than leaving multiple large control surfaces open simultaneously.
- The top edge should own compact category buttons or tabs that swap the active management card set without obscuring the world-first base view.
- The right edge should be reserved for the persistent event log in both HQ and raid contexts. That rail is the always-on notice surface and should not be displaced by unrelated management panes.
- The bottom edge should hold the currently active card stack for the selected category, focused world target, or clicked event-log item.
- World focus, category switches, and event-log clicks should all converge on the same active-card system rather than spawning disconnected parallel panels.
- Event-log entries should be actionable when possible: clicking a room, operator, team, or completed raid entry should open or focus the relevant card or summary surface.
- The event log should capture every player-noticeable state change worth reacting to, including departures, returns, injuries, deaths, morale or loyalty threshold shifts, staffing changes, resource swings, active-event changes, and lightweight raid-result updates.
- The event log is the passive notice rail, not the only event surface. Major incidents should be allowed to take over the screen with a blocking modal when the player must make a decision before simulation continues.
- Blocking modals should freeze the simulation through one shared runtime pause contract rather than relying on visual overlays alone. That contract now supports settings, incidents, boss-commitment beats, and future top-priority interruption states.
- Incident modals should render structured runtime payloads and choice buttons, not bespoke one-off copy blocks. They sit above ordinary HQ and raid management overlays, with the world dimmed beneath them.
- Interruption-backed narrative surfaces may optionally render an authored presenter portrait and name beside the existing text-and-choice payload. When no presenter is bound, the layout must fall back cleanly to the current text-only presentation.
- Raid boss commitment is a shipped use case for this interruption layer. When a team commits to the boss, the presentation can stop the game, foreground that team and site, and pull the player into the moment instead of burying it in the right-rail log.
- The layout target is modern and minimal, but not empty: the world stays readable behind the glass UI while the player still has a stable place to look for what just changed.
- Category selection is toggle-dismissible: clicking the already-active category pill collapses the bottom panel and returns to the full world view.
- Shell chrome surfaces use shared CSS classes (`.glass-panel`, `.glass-panel-subtle`) to keep opacity and blur values consistent across header, nav, bottom panel, and event log rail.

## HQ Environment Presentation Language

- Canonical HQ direction is angled/isometric interior presentation with a visible room box, not a flat plan or side cutaway.
- HQ room modules must share one canonical footprint and one canonical isometric grid so adjacent rooms can snap together cleanly inside the building shell.
- HQ management overlays should favor a top-nav plus bottom-card arrangement, with the event log fixed on the right, so room, staff, operator, and roster management do not sprawl across several competing panes.
- HQ visual composition must be layered rather than monolithic:
  - shell/perimeter assets own the building envelope and cutaway silhouette
  - structural assets own floor modules, wall segments, corners, thresholds, doors, and windows — these are engine-rendered, not part of room scene SVGs
  - room recipes choose structural openings and provide a pre-composed scene SVG containing all furniture, fixtures, and decorative props for that room
  - pre-composed scene SVGs contain props only — no walls, floors, tile grids, or structural elements — so they layer cleanly over the engine-rendered structure
  - building theme/style specs provide material and palette families such as bodega surfaces now and future tower/interior finishes later
- Each HQ room should read through three layers at minimum:
  - floor plane
  - enclosing wall planes
  - furnished contents and fixtures
- Doors, windows, and thresholds should feel like openings in a room box, not icons pasted onto a flat wall strip.
- Furniture should be composed as room layout, with clear circulation space and readable occupancy, rather than as isolated hero props floating in empty space. Pre-composed scene SVGs are the mechanism: props are hand-arranged as a single authored scene rather than individually sprite-placed by the engine.
- Reusable HQ parts should support composition, but the approved target is a connected floor plan built from tileable room modules and room recipes, not a set of interchangeable standalone diorama rooms.
- Floors, wall angles, corners, and doorway anchors must align across neighboring rooms so the runtime can place multiple rooms side by side without visible geometric drift.
- Room-definition assets must not each own their full floor and wall box when they are intended to be composed into one building. Pre-composed scene SVGs that contain only props (furniture, fixtures, decorations) are the approved production target for room interiors. Scene SVGs must never include walls, floors, tile grids, or structural elements — those remain engine-rendered. Full monolithic room SVGs that include their own walls and floors are exploration/reference artifacts only.
- The intended future building pipeline should support swapping structural/theme families, such as bodega finishes now and office-tower or luxury finishes later, without redefining the room-composition model itself.
- Operators and their attachments already have a satisfactory style direction. This HQ environment-language correction applies to rooms, room props, environmental fixtures, and shells.
- Exterior backdrop packages are part of the building-theme contract. Every headquarters building or setting must ship one approved exterior set for each canonical time-of-day state: `sunrise`, `day`, `sunset`, and `night`.
- Those exterior sets should own the sky treatment, neighboring-building read, exterior emissives, and street-level decorative dressing around the HQ shell. They should not duplicate the engine-rendered room structure or interior scene SVG responsibilities.
- Exterior packages should attach to abstract shell-relative zones such as `fore`, `left-flank`, `right-flank`, `rear`, `above-shell`, and `below-shell`, so the same composition model works for a bodega, Porter's, and a late-game tower.
- Taller buildings should also support reusable elevation bands rather than exact one-off floor numbers. The preferred future contract is floor-aware but reusable: several nearby floors can share the same surrounding package when their outside read is materially similar.
- The skyscraper should not inherit low-rise exterior assumptions. Its normal packages should read as very high above ground level: neighboring towers, clouds, haze, rooftop machinery, aircraft or air-traffic cues, and distant city-glow below. Street clutter, sidewalks, or waterfront props belong only to deliberate ground-entry views, not to the ordinary tower package.
- The skyscraper should read as massive. The isometric framing should let the tower shell and its giant square floor plates dominate more of the composition than the low-rise headquarters do.
- Multi-floor tower navigation is its own presentation problem. A late-game skyscraper that keeps acquiring floors should not rely on the same viewing and floor-switching assumptions used for Porter's. The product needs a dedicated tower navigation and floor-context model.

## Raid Presentation Direction

- Raids should use a full-screen map-first presentation in React/Tailwind UI, matching the HQ world-first presentation model without requiring a canvas renderer.
- The base raid view should stay in the Towns-like minimap spirit: teams are lightweight dots or markers exploring a flat top-down dungeon map.
- Canvas is an implementation option, not a product requirement. The approved base raid view is a readable top-down map UI with lightweight markers and focused portrait/detail overlays.
- Raid overlays should follow the same interaction model as HQ: one active bottom-card surface at a time, with the persistent event log anchored on the right.
- The raid base view is not an isometric room-scene presentation and should not inherit HQ room-box composition rules.
- Raid authored assets for the base view should be top-down map tiles, fog treatments, feature icons, marker shapes, and encounter indicators optimized for exploration readability.
- In the current gameplay scope, the guild secures one government clearance contract at a time.
- Contract flow should surface three explicit operations states: contract result review, contract bidding, and active contract execution.
- The result beat should be a dedicated operations-state surface or equivalent blocking interruption, not a silent handoff hidden in the event rail.
- The bidding board should compare a small set of posted contracts and foreground site concept, neighborhood, rank, reward, intel, risk, known threat or hazard hints, and expected loot identity.
- Starting a normal new campaign should open on that bidding board after the initial posted-contract set has been generated, rather than dropping the player into an empty operations state or auto-securing the first site.
- That secured contract determines the one active dungeon currently available to raid.
- Preview and dev-only entry points may intentionally fast-forward into a seeded active contract so map, fog, and encounter surfaces can be inspected immediately. That shortcut should stay clearly separate from the canonical player-facing flow.
- Multiple operator teams may exist in that same contracted dungeon at once.
- Fog of war should reveal explored space as teams move through the dungeon.
- Raid teams should enter dungeons with explicit autonomous goals such as looting, exploring, gathering intel, hunting threats, or attempting the boss.
- Teams should autonomously decide when to leave, regroup, scout, or escalate to a boss attempt instead of always pushing to completion in one trip.
- When a team escalates from exploration to a boss attempt, the product can treat that as a top-priority interruption beat rather than only as passive map-state drift. The player can be pulled into the encounter moment and focus the boss site deliberately.
- A committed boss confrontation now hands off into a dedicated runtime-owned encounter surface. That surface is a secondary overlay mode above the canonical raid map, not a replacement for the base raid presentation language.
- Development and verification tooling can pause and single-step an active encounter without changing the canonical player-facing authority model.
- Ordinary enemies should continue to respawn in the dungeon over time.
- The active dungeon remains the guild's contract focus until its boss is defeated or the contract is lost.
- Early contract loss should be possible and survivable; later layers can escalate failure into more severe organizational consequences.
- Once a contract closes, the active-site reference should clear; the old result summary and the next posted board should carry the inter-contract state instead.
- Clicking a team enters a focused overlay mode that syncs the active bottom card to that team while leaving the event log visible on the right.
- Raid rendering should stay lighter and more abstract than HQ rendering, even when the underlying assets are authored and real.
- If raids use richer boss encounter backdrops or encounter scenes, those are secondary overlays, not the canonical base-map language.
- The implementation medium for a boss encounter surface is not locked here. React, canvas, or hybrid approaches are all valid as long as gameplay authority remains in runtime state.

## Approval Loop

- Asset work must start from canon grounding plus an explicit asset brief. Composite environment work must then pass through an approved recipe preview before modular production begins.
- Visual assets must pass through generalized SVG experimentation tooling or an asset viewer before promotion into canonical asset directories.
- Audio cues and ambience layers must pass through an audio playground before promotion into the default experience.
- Human review is required before assets or sounds are treated as approved slice content.
- When a visual direction is invalidated, stale assets, manifests, viewer references, and doc references should be removed rather than preserved as backward-compatible legacy examples.
