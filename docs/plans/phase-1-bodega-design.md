# Phase 1 Design

This plan covers all design-owned work for Phase 1, including code work when the task is design-led.

## Ownership Rule

Design agents own:

- UI implementation
- SVG work
- user-facing writing, copy, labels, narrative phrasing, and other player-facing text
- world-surface visual readability work
- typography, layout, motion, and styling
- focused-detail presentation
- mixed visual-code tasks that cannot be cleanly separated

Design agents may write code. The distinction is ownership, not whether code is involved.

## Scope

Primary ownership:

- `app/ui`
- presentation concerns in `app/routes`
- `app/app.css`
- `render/`
- presentational adapters that exist only to support visual surfaces

The current style direction in `docs/style-guide.md` remains the baseline unless the manager approves a documented change.

## Hard Constraints

- do not put gameplay rules in React components
- do not turn render code into a hidden gameplay layer
- consume typed selectors and commands from runtime or app glue
- if a mixed task cannot be split cleanly, keep it with a design agent and request the needed contract first

## 2026-03-20 Autonomy Pivot

The first Wave A design pass assumed a manual dispatch flow. That is now superseded.

Correct Phase 1 target:

- the player watches operator intent, readiness, opportunity pressure, and live raids
- the player should be able to read operator compatibility, friction, cohesion, and likely grouping behavior
- the player does not manually assemble raid teams
- the player does not launch raids directly
- user-facing writing for these surfaces remains design-owned

## Workstreams

### Workstream A: Headquarters surfaces

Targets:

- bodega floor and room readability
- roster and recruitment surfaces
- staffing and operational status surfaces
- operator relationship, compatibility, and routine-readability surfaces
- upgrade and room-state presentation

### Workstream B: Raid-facing surfaces

Targets:

- autonomous operations surfaces showing raid opportunities, operator intent, readiness, and live raid state
- raid watch mode
- focused inspection views
- readable social and team-cohesion signals
- readable logs and summary surfaces driven by structured outcomes

### Workstream C: Operator visual and SVG pipeline

Targets:

- operator detail presentation
- SVG part tagging, search, and composition polish
- context-aware appearance presentation for HQ versus raid contexts
- any mixed render-plus-design code required for clarity

Precondition before real SVG asset production expands:

- run a dedicated style-exploration pass in a temporary route or sandbox
- generate many variations and compare them side by side
- lock a consistent style language before building the reusable SVG catalog in earnest

This rule should later be repeated for other SVG-heavy categories:

- operators
- environments
- enemies
- rooms
- buildings

Current state:

- **Operator SVG style is LOCKED** (Unified Anime, 2026-03-21)
- Style exploration complete: 3 rounds of exploration (v1: 5 directions, v2: 7 directions, v3: 9 variants across 3 families) narrowed to E2 Seinen (male) + E3 Shoujo (female) + neutral blend
- Canonical reference exemplars promoted to `public/data/svg-parts/operators/reference/`
- Style spec stored in `public/data/svg-parts/operators/recipes/operator-style-spec.json`
- SVG Playground preserved at `/svg-playground` for comparison, iteration, and validation
- Full style documentation in `docs/style-guide.md` § Operator SVG Style
- Ready for production operator SVG work: parts library, tagged search, composition pipeline

## Coordination Rules

- ask for stable selectors instead of reaching into runtime internals
- keep route modules as shell navigation and presentation only
- if player-facing prose lives in `content/`, design owns the phrasing once runtime locks the schema and ids
- any new data need should go back through the manager if it changes runtime or save ownership

## Review Pass Guidance

Use a design review agent when a design slice is locally complete or waiting on another track and the implementation owner has released the relevant file locks.

Review scope should stay inside design ownership:

- `app/ui`
- presentation concerns in `app/routes`
- `app/app.css`
- `render/`
- design-only presentational adapters

Review targets:

- gameplay rules leaking into React components, route modules, or render code
- render or SVG code becoming a hidden gameplay engine
- readability failures in headquarters, roster, recruitment, autonomous operations, watch, or focused inspection surfaces
- brittle coupling to unstable runtime internals instead of typed selectors and commands
- code smell in visual adapters, motion, layout, or SVG composition that will get harder to unwind after integration
- bounded polish or clarity fixes that do not expand design ownership into runtime or save

Review rules:

- do not launch a design reviewer on files with an active implementation owner
- assign exact file locks before review starts
- keep fixes inside the released design surface
- if a review discovers missing authoritative data or command problems, route that back through the manager instead of inventing local logic
- if the reviewer lands fixes, update this plan's execution status and mark the review task done explicitly

Current review readiness:

- the design slice is released and safe for a bounded design review agent

## Execution Status

### File Locks

- none; preset-id fix locks released after completion

### In Progress

- (none)

### Blocked

- (none)

### Manager Handoff

- (resolved) Operator/social surface follow-up: wired in targeted-fix pass below

### Selector/Command Requests for Manager

Resolved during correction wave:

- `WorldSnapshot.operators[]` with `identity`, `preferences`, `schedule`, `needs`, `morale`, `loyalty`, `injury`, `assignment`, `appearance`
- `WorldSnapshot.operatorRelationships[]`
- `WorldSnapshot.staff[]` with `assignment`, `status`
- `WorldSnapshot.visitors[]`
- `WorldSnapshot.raidOpportunities[]` with `missionId`, `location`, `threat`, `intel`, `status`, `interestedOperatorIds`, `claimedOperatorIds`
- `WorldSnapshot.activeEvents[]`
- `WorldSnapshot.rooms[].isActive`
- Commands: `sim/set-room-active`, `sim/purchase-building-upgrade`, `sim/purchase-room-upgrade`, `sim/accept-recruit`, `sim/reject-recruit`, `sim/hire-staff`, `sim/assign-staff`

### Done

- Read all required docs (AGENTS.md, plans, style guide, architecture rules)
- Surveyed full codebase state and available data contracts
- Declared file locks
- Created execution status section in design plan
- Added CSS utilities to `app/app.css`: glass-card, glass-card-navy, glass-card-inset, btn-primary, btn-ghost, tab-button, badges, animations, progress bar, empty state
- Created `app/ui/view-models.ts`: typed presentational adapters (HqViewModel, OperationsViewModel, builders)
- Created `app/ui/guild-status-bar.tsx`: resource counters, time display, building status
- Created `app/ui/bodega-floor.tsx`: room card grid with selection, occupancy bars, empty slot placeholders
- Created `app/ui/room-detail-panel.tsx`: selected room detail, stats grid, upgrade cards with requirements/effects
- Created `app/ui/roster-panel.tsx`: operator roster placeholder with SVG portrait preview, recruitment placeholder
- Created `app/ui/operator-card.tsx`: operator detail card with SVG portrait, morale/loyalty stat bars
- Created `app/ui/hq-panel.tsx`: HQ tab content composing floor view, room detail, roster with sub-tabs
- Created `app/ui/raid-watch.tsx`: active raid cards with reveal progress bars, corrected empty-state copy
- Created `app/ui/raid-log.tsx`: raid history with result badges and reward deltas
- Rewrote `app/ui/game-shell.tsx`: full game layout with sticky command bar, tab navigation, content area, status strip
- Upgraded `render/world-canvas.tsx`: style-guide-compliant canvas with gold grid, rounded room nodes, occupancy glow
- Enhanced `render/operator-detail-svg.tsx`: size variants, portrait gradient, configurable label
- Autonomy pivot correction: deleted `app/ui/dispatch-flow.tsx` (manual dispatch surface), created `app/ui/opportunity-board.tsx` (observational opportunity board), rewrote `app/ui/raid-panel.tsx` as `OperationsPanel`, replaced `MissionViewModel`/`RaidViewModel` with `RaidOpportunityViewModel`/`OperationsViewModel` in view-models, removed dispatch-raid references, corrected raid-watch empty state copy
- Verified all design-owned files pass `vp check`, `vp test`, `vp build`
- confirmed the full repo now passes `vp check`, `vp test`, and `vp build`
- **Polish and bug-fix pass**:
  - Fixed CSS `.btn-ghost:disabled` — added missing disabled state (opacity + pointer-events) matching `.btn-primary:disabled`
  - Fixed CSS `.badge-slate` contrast — changed text color from raw `var(--color-slate)` to `rgba(224,221,214,0.55)` for legibility on dark backgrounds
  - Fixed CSS `.empty-state` double opacity — removed container `opacity: 0.6` that stacked with child opacity values, making text unreadable
  - Fixed `app/ui/game-shell.tsx` mobile resources — lowered breakpoint from `md:flex` to `sm:flex` so resources appear on smaller screens
  - Fixed `app/ui/game-shell.tsx` mobile time — removed `hidden sm:flex` gate so time is always visible; shortened "Day" label to "D" for compact display
  - Fixed `app/ui/game-shell.tsx` footer dev-speak — replaced `slot ${id}` format with player-facing labels ("preview session", "new session", "saved session")
  - Fixed `app/ui/hq-panel.tsx` misleading room count — changed "X active rooms" to "active/total rooms active" showing actual active count vs total
  - Fixed `app/ui/bodega-floor.tsx` status dots — added `title` tooltips: "Operational — fully staffed", "Active — needs staff", "Inactive"
  - Fixed `app/ui/room-detail-panel.tsx` empty state — replaced diamond icon with square icon, added subtext guiding user to floor plan, improved text contrast
  - Fixed `app/ui/room-detail-panel.tsx` upgrade button — shortened "Insufficient resources" to "Not affordable" for narrow cards
  - Fixed `app/ui/roster-panel.tsx` operator needs — added middle-dot separator between Fatigue and Stress values
  - Fixed `app/ui/roster-panel.tsx` staff empty state — added descriptive subtext "Hire staff to keep rooms running"
  - Fixed `app/ui/roster-panel.tsx` visitor empty state — added descriptive subtext "Talent arrives as the guild grows"
  - Fixed `app/ui/opportunity-board.tsx` subtitle — moved autonomy explanation to its own line below the heading to prevent wrapping on mobile
  - Fixed `app/ui/raid-watch.tsx` empty state icon — replaced unreliable Unicode `&#9876;` (crossed swords) with `&mdash;` for cross-platform rendering
  - All fixes verified: `vp check`, `vp test`, `vp build` pass
- cleared the stale runtime-data blocker list after the approved runtime contracts landed
- **Design review pass (review agent)**:
  - Fixed CSS bug: `opacity: 1.5` → `opacity: 1` in `.glass-card:hover::before` (`app/app.css`)
  - Fixed brittle fill-color semantic check: added `isOccupied` to `WorldRenderNode` (`render/types.ts`), set it in `buildWorldRenderSnapshot` (`render/index.ts`), canvas now uses `node.isOccupied` instead of magic fill string comparison (`render/world-canvas.tsx`)
  - Wired `raidOpportunities` mapping in `buildOperationsViewModel` — removed stale "blocked on runtime" comment, opportunities now flow from `WorldSnapshot` through view model (`app/ui/view-models.ts`)
  - Added `isActive` to `RoomViewModel` from `RoomSnapshot.isActive` contract (`app/ui/view-models.ts`)
  - Cleaned player-facing copy: replaced dev/debug language with in-world phrasing across `roster-panel.tsx`, `game-shell.tsx`, `room-detail-panel.tsx`
  - Noted unused `guild-status-bar.tsx` and `operator-card.tsx` as known scaffold state (no removal needed)
  - Handed off operator/social data population to manager — design surfaces can't improve autonomous-operations readability until runtime populates operator data
  - All fixes verified: `vp check`, `vp test`, `vp build` pass
- **Targeted fix pass: operator/social/staff/visitor data wiring**:
  - Added `OperatorViewModel`, `StaffViewModel`, `VisitorViewModel`, `RelationshipViewModel` types to `app/ui/view-models.ts`
  - Added safe accessor helpers (`str`, `num`, `rec`) for extracting from loose `SaveStructuredRecord` fields
  - Built operator, staff, visitor, and relationship view model arrays inside `buildHqViewModel` using seeded `WorldSnapshot` data
  - Extended `HqViewModel` with `operators`, `staff`, `visitors`, `relationships` fields
  - Updated `app/ui/hq-panel.tsx` to pass all new data to `RosterPanel`
  - Rewrote `app/ui/roster-panel.tsx`: operators now display with name, role, specialty, morale/loyalty bars, assignment status, injury state, fatigue/stress/risk readout; visitors show name, desired role, quality, patience; staff show name, role, status, wage; social bonds show trust, friction, cohesion estimate, and history tags
  - Fixed `app/ui/game-shell.tsx` command bar: operator count now shows actual `operators.length/operatorSlots` instead of bare slot count; staff count appears when staff are present
  - Removed stale "0/X operators" and "No operators recruited" placeholder copy that contradicted seeded snapshot
  - All fixes verified: `vp check`, `vp test`, `vp build` pass
- **Integration wave: connect design shell to runtime commands**:
  - Added `GameCallbacks` interface to `app/ui/view-models.ts` mapping all Phase 1 commands: tick, setRoomActive, purchaseBuildingUpgrade, purchaseRoomUpgrade, acceptRecruit, rejectRecruit, hireStaff, assignStaff, placeRoom
  - Added `buildHqViewFromPhase1` and `buildOpsViewFromPhase1` builders consuming `Phase1RuntimeView` for strongly typed data (no `Record<string, unknown>` casting)
  - Extended view model types: `RoomViewModel` (+isOperational, requiredRoleTag, assignedStaffCount, availableUpgradeIds), `OperatorViewModel` (+intent, dominantNeed, availableForRaid, readinessScore), `VisitorViewModel` (+expectedLoyalty), `RelationshipViewModel` (+familiarity, recentSharedOutcome, cohesion), `UpgradeViewModel` (+isAffordable), `RaidOpportunityViewModel` (+reward, risk, recommendedOperatorCount), `ActiveRaidViewModel` (+operatorIds, location, threat, cohesion, durationHours), `RaidSummaryViewModel` (+location, narrativeTags), `GuildViewModel` (+pressure), `BuildingViewModel` (+unlockedRoomTemplateIds, availableBuildingUpgradeIds)
  - Added `ActiveEventViewModel`, `PlaceableRoomTemplate` types and `HqViewModel` fields: roomUpgrades, activeEvents, placeableRoomTemplates
  - Rewired `app/ui/game-shell.tsx`: added render-version state for dispatch-triggered re-renders, created `GameCallbacks` wrapping `session.simulation.dispatch()`, switched to `Phase1RuntimeView`-based builders, recomputes `worldRenderSnapshot` each render, added +1h time advance button, shows active events badge
  - Updated `app/ui/hq-panel.tsx`: accepts and passes `GameCallbacks` to all child panels, passes room upgrades filtered by selected room
  - Updated `app/ui/room-detail-panel.tsx`: room activation toggle (sim/set-room-active), live upgrade purchase buttons enabled when affordable (sim/purchase-building-upgrade, sim/purchase-room-upgrade), operational status badge, required role tag display
  - Updated `app/ui/roster-panel.tsx`: recruit/pass buttons on visitors (sim/accept-recruit, sim/reject-recruit), hire staff button (sim/hire-staff), staff assignment buttons per room (sim/assign-staff), operator intent and raid-readiness display, visitor expected loyalty display
  - Updated `app/ui/bodega-floor.tsx`: empty slot click opens room template picker (sim/place-room), room operational/active status indicator (gold dot = operational, dim dot = understaffed, slate dot = inactive)
  - Updated `app/ui/opportunity-board.tsx`: shows reward, risk, recommended operator count from Phase1RuntimeView
  - Updated `app/ui/raid-watch.tsx`: shows deployed operator count, location, threat, cohesion, duration
  - Updated `app/ui/raid-log.tsx`: shows location, narrative tags
  - All interactions verified: `vp check`, `vp test`, `vp build` pass
- **Join fix: consume session-owned command/state bridge in game-shell**:
  - Replaced all `session.simulation.dispatch(...)` calls with `session.commands.*` (tick, setRoomActive, purchaseBuildingUpgrade, purchaseRoomUpgrade, acceptRecruit, rejectRecruit, hireStaff, assignStaff, placeRoom)
  - Removed `renderVersion` state and `void renderVersion` hack — session subscribe mechanism in `useRuntimeSession` already triggers re-renders when commands update derived state
  - Switched from manual `session.simulation.getPhase1View()` / `buildWorldRenderSnapshot()` pulls to `session.state.phase1View` and `session.state.worldRenderSnapshot`
  - Removed unused `buildWorldRenderSnapshot` import from render
  - Zero `session.simulation` references remain in `app/ui/game-shell.tsx`
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator SVG style exploration pass (Workstream C precondition)**:
  - Created temporary route at `/svg-exploration` (`app/routes/svg-exploration.tsx`)
  - Created exploration page (`app/ui/svg-exploration-page.tsx`) with 5 visual directions, 3 operator variants each (Bruiser/broad, Infiltrator/lean, Strategist/medium), at detail (h-52) and roster (h-14) sizes
  - Registered route in `app/routes.ts`
  - v1 directions: Geometric Minimal, Ink & Edge, Faceted Tactical, Bold Icon, Atmospheric Glass
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator SVG style exploration v2 (broader variation)**:
  - Rewrote exploration page with 7 wildly different visual directions
  - Kept C (Faceted Tactical) and D (Bold Icon) from v1
  - Direction A — Manhwa Portrait: Korean webtoon style, sharp V-chin, dramatic almond eyes with heavy lids and colored iris, multi-layered hair with strand detail, 3/4 angle, face shadow, lapel collar
  - Direction B — Pixel Operator: retro pixel art in SVG, 4px grid rects only, no curves, limited color stepping, GBA-era sprite aesthetic
  - Direction C — Faceted Tactical: kept from v1
  - Direction D — Bold Icon: kept from v1
  - Direction E — Anime Cell: oversized eyes with colored iris and white highlights, spiky hair chunks, hard-edged flat cel-shadow polygons, consistent outline stroke
  - Direction F — Noir Silhouette: 80% deep black mass, diagonal light slash revealing partial face, glowing accent-colored eye, Sin City / spy dossier mood
  - Direction G — Woodblock / Linocut: 3.5px outlines, parallel flowing line hair, cross-hatch clothing shading, carved-and-printed graphic feel
  - No winner pre-selected — choice pending review of in-browser rendering
  - Style not yet locked
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator SVG style exploration v3 (narrowed to 3 families × 3 variants)**:
  - Discarded Pixel (B), Faceted Tactical (C), Noir (F), Woodblock (G)
  - Kept A (Manhwa), D (Bold Icon), E (Anime Cell) and created 2 new variants per family
  - Split into modules: `_svg-shared.ts` (types/palettes/dims), `_manhwa-variants.tsx`, `_bold-variants.tsx`, `_anime-variants.tsx`
  - A1 Manhwa Portrait (original), A2 Manhwa Soft (romance, rounder jaw, bigger softer eyes, gradient shadows, blush), A3 Manhwa Sharp (thriller, knife-V jaw, narrow slit eyes, 40% face shadow, aggressive hair)
  - D1 Bold Icon (original), D2 Bold Icon Chibi (35% bigger head, stubby body, massive sparkly eyes, ahoge spike, blush), D3 Bold Icon Angular (octagonal head, diamond eyes, trapezoid body, miter joins)
  - E1 Anime Cell (original shounen), E2 Anime Seinen (smaller intense eyes, angular jaw, heavy shadows, armor detail), E3 Anime Shoujo (3-ring iris, individual lashes, star sparkles, flowing hair, gem clasp)
  - Fixed gradient ID collisions in manhwa variants with role-scoped prefixes
  - No winner pre-selected — 9 directions pending in-browser comparison
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator SVG style exploration v4 (unified final direction)**:
  - Combined E2 Anime Seinen (male) + E3 Anime Shoujo (female) into unified style
  - Created `_unified-male.tsx` (MaleSwept, MaleSpiky, MaleUndercut), `_unified-female.tsx` (FemaleFlowing, FemaleBob, FemalePonytail), `_unified-neutral.tsx` (NeutralTousled, NeutralSideshave)
  - 8 variants showing hair and eye differentiation across 3 gender presentations
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator SVG style lock-in (Workstream C precondition complete)**:
  - Locked Unified Anime as the canonical operator SVG style
  - Renamed exploration route to SVG Playground at `/svg-playground`
  - Promoted 3 canonical reference SVGs to `public/data/svg-parts/operators/reference/` (male-bruiser-swept, female-infiltrator-flowing, neutral-strategist-tousled)
  - Created style spec at `public/data/svg-parts/operators/recipes/operator-style-spec.json`
  - Updated `docs/style-guide.md` with full operator SVG style specification
  - Updated `docs/technical-rendering-and-assets.md` with locked status and canonical reference locations
  - Removed unused exploration variant files (`_manhwa-variants.tsx`, `_bold-variants.tsx`, `_anime-variants.tsx`)
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator asset pipeline bootstrap (Workstream C production start)**:
  - Created `app/ui/operator-portrait.tsx`: OperatorPortrait component using locked unified style, deterministic preset assignment via name hash, 8 presets across male/female/neutral presentations
  - Created `public/data/svg-parts/operators/presets.json`: manifest of available operator visual presets
  - Wired OperatorPortrait into roster panel: each operator row now shows a unique locked-style portrait
  - Updated `operator-card.tsx` to use OperatorPortrait instead of recipe-based OperatorDetailSvg
  - Removed placeholder preview recipe prop chain: game-shell → hq-panel → roster-panel no longer passes `operatorDetailRecipe`
  - Deprecated `createPreviewSvgCatalog()` and `buildPreviewDetailRecipe()` in `render/index.ts` (kept for session.ts backwards compatibility)
  - Updated `docs/technical-rendering-and-assets.md` with operator asset pipeline current state and remaining work
  - Transitional: preset assignment is hash-based; future work adds explicit appearance fields and modular parts library
  - All verification passed: `vp check`, `vp test`, `vp build`
- **Operator portrait integration: consume authoritative appearance data** (superseded by preset-id fix below):
  - Changed `OperatorPortrait` to accept `appearanceSeed` prop from runtime-owned `appearance.seed` instead of hashing operator name
  - Changed `deriveAppearance()` to use `seed` parameter instead of `simpleHash(name)`
  - Removed `simpleHash()` function from `operator-portrait.tsx`
  - Added `appearanceSeed: number` to `OperatorViewModel` in `view-models.ts`
  - Populated `appearanceSeed` from `op.appearance.seed` in `buildHqViewFromPhase1` and from save data in legacy `buildHqViewModel`
  - Updated `roster-panel.tsx` to pass `appearanceSeed` from operator view model
  - Updated `operator-card.tsx` to accept and pass `appearanceSeed` prop
  - Updated `docs/technical-rendering-and-assets.md`: pipeline docs reflect seed-based flow, removed "name hash" transitional note
  - Updated `docs/style-guide.md`: portrait description now says "runtime-owned appearance.seed" instead of "name hash"
  - Preset manifest (`presets.json`) remains the canonical source of truth for available presets
  - SVG Playground unaffected (renders directly via unified renderers, not through OperatorPortrait)
- **Operator appearance preset-id integration fix** (replaces seed-based portrait selection):
  - Replaced `appearanceSeed: number` with `appearancePresetId: string` in `OperatorViewModel` (`view-models.ts`)
  - `buildHqViewFromPhase1` now reads `op.appearance.presetId` (the authoritative runtime field) instead of `op.appearance.seed`
  - Legacy `buildHqViewModel` now reads `presetId` from the appearance record with `"male-swept"` fallback
  - Removed `deriveAppearance()` function and `OperatorAppearance` type from `operator-portrait.tsx`
  - `OperatorPortrait` now accepts `presetId: string` and looks up the renderer directly — no seed hashing
  - Updated `roster-panel.tsx` to pass `presetId={op.appearancePresetId}`
  - Updated `operator-card.tsx` to accept `presetId?: string` (default `"male-swept"`)
  - Hash/seed-based portrait selection is fully removed from the design layer
  - All verification passed: `vp check`, `vp test`, `vp build`

## Exit Criteria

- Phase 1 has production-facing bodega, roster, recruitment, and raid surfaces
- SVG and canvas presentation remain design-owned
- UI renders authoritative autonomous-raid state without owning gameplay outcomes
