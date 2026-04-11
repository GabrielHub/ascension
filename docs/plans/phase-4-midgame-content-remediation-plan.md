# Phase 4 Midgame Content Remediation Plan

This plan is the missing content track for Porter's. The repo already has some D-rank footholds in `content/templates`, but that is not the same as a real midgame content program. This pass adds the authored breadth, recruitment depth, and locked tonal escalation the phase needs.

## Goal

Create a real Porter's-era content layer across:

- dungeon and site packets
- enemy families
- bosses
- operator definitions and recruitment breadth
- higher-tier item breadth outside crafted gear
- narrative event coverage
- explicit visual and tonal escalation by rank
- runtime-wired asset coverage so shipped content actually resolves to in-game visuals instead of falling back to generic placeholders

## Depends On

- `docs/plans/phase-4-midgame-contract-lock-plan.md`
- `docs/plans/phase-4-midgame-city-pressure-plan.md`

## Current Gap Snapshot

The repo already contains more authored content than the current runtime-facing asset surfaces express.

- Bosses are closest to complete: shipped boss templates already resolve to explicit encounter art and those paths are used by the raid and encounter UI.
- Ordinary enemy breadth is not visually represented one-to-one. The current raid environment index still exposes mostly generic enemy markers and a small boss portrait subset rather than per-enemy or per-family visuals.
- Equippable gear is covered by the operator parts pipeline. Gear content does not need a second item-icon system to appear on operators, but non-gear inventory still lacks a visual contract.
- The opening roster is only partially hand-mapped to distinct portrait recipes. The starter roster currently falls back to the default recipe for multiple operators.
- There is no broad `operatorTemplates` registry today. The game currently combines:
  - a fixed authored starter roster in `content/bootstrap.ts`
  - deterministic visitor generation in `sim/systems/visitors.ts` and `sim/systems/commands.ts`
  - recipe selection and optional visible-gear selection from `save/appearance.ts`
  - optional `operator-identity` generation layered on top of those recruit candidates
- The SVG playground is a recipe review surface, not proof that every recipe is already promoted into live roster or recruitment content.

This plan therefore has two jobs:

1. add missing content and asset breadth
2. wire that breadth into the actual runtime selection and rendering paths

## Locked Progression Contract

- F and E content stays rooted in warped real places: schools, warehouses, garages, basements, stations, storefronts.
- D and C content starts leaving strict realism behind: stranger geometry, more impossible architecture, more specialized operators, more visibly rift-touched gear.
- B and A content should feel institutionally famous and physically implausible.
- S-rank content is allowed to become spectacular and world-defining: city-in-the-clouds, derelict orbital hardware, impossible megastructures, singular celebrity operators, and named signature gear.
- The tonal shift must remain workplace-supernatural, not generic fantasy. "We had to file permits for a floating city" fits. "The ancient dragon awakens" does not.

## Planned File Targets

- `content/templates/site-concepts.ts`
- `content/templates/enemies.ts`
- `content/templates/bosses.ts`
- `content/templates/items.ts`
- `content/templates/events.ts`
- `content/bootstrap.ts`
- `sim/recruitment.ts`
- `sim/index.ts`
- `sim/systems/commands.ts`
- `sim/systems/visitors.ts`
- `sim/systems/raids.ts`
- `sim/systems/events.ts`
- `save/appearance.ts`
- `app/ui/_glossary.ts`
- `app/ui/boss-art.ts`
- `app/ui/encounter-surface.tsx`
- `app/ui/raid-panel.tsx`
- `app/ui/raid-world/raid-parts.ts`
- `app/ui/item-surface.tsx`
- `app/ui/market-panel.tsx`
- `app/ui/inventory-panel.tsx`
- `content/data/operator-recipes.json`
- `content/data/operator-parts-index.json`
- `content/data/raid-environment-index.json`
- `app/ui/svg-playground-page.tsx`

## Content Minimums

Ship all of the following:

- at least 6 new Porter's-era site packets across D and future-facing C tiers
- at least 6 new enemy families
- at least 6 new bosses
- at least 12 new midgame-ready operator definitions or recruitment packets
- at least 12 non-crafted gear items across D and C-facing content pools
- at least 10 new narrative event templates tied to Porter's-era pressure

Ship the following asset-and-runtime minimums in the same pass:

- explicit distinct recipe assignment for all 6 bootstrap operators; no starter operator should fall back to the default portrait recipe
- a promoted authored recruit pool large enough to satisfy the presentation target of roughly twenty intentionally designed starting-content operator identities across starter roster plus recruit pool
- a runtime-owned mapping rule for which recipes are considered promoted/live for recruitment, instead of treating every playground recipe as automatically live content
- boss-art coverage for every newly added boss on the actual runtime paths used by raid cards and the encounter surface
- enemy visual coverage beyond generic markers, at minimum at the enemy-family level, with runtime lookup from authored family/template ids to the raid asset index
- an explicit visual contract for non-gear inventory content, either:
  - per-item icon art for loot and consumables
  - or a deliberately narrower family/icon contract documented and wired into inventory and market UI

## Implementation Sequence

### 1. Lock Rank Escalation Metadata

- Add `rankTone` to authored site, boss, item, and operator-facing content where the contract needs to be explicit.
- Tag current grounded content correctly before adding new surreal content.
- Use:
  - `grounded` for F/E
  - `heightened` for D
  - `surreal` for C/B
  - `mythic` for A/S

Done when:

- every new content packet can be validated against a clear escalation rule instead of taste alone

### 2. Lock Runtime Asset-Parity Contracts

Before adding more content, lock what "complete" means for each content family in runtime terms.

- Define which content families require bespoke asset ids versus shared modular visual systems.
- Keep the distinction explicit:
  - bosses require explicit encounter art bindings
  - ordinary enemies require at least family-level visual bindings for raid surfaces
  - starter operators require explicit promoted recipe assignments
  - generated recruits require selection from a promoted recipe pool, not the entire playground by default
  - equippable gear remains covered by operator visible-gear parts
  - loot and consumables need a deliberate inventory/market visual contract
- Add validation where possible so future content additions fail loudly when required asset bindings are missing.

Done when:

- new content cannot silently ship into generic runtime fallbacks without an explicit waiver in the contract

### 3. Add Porter's-Era Site Packets

- Add new D-rank site packets that feel like real midgame, not late-bodega repeats.
- Each packet must include:
  - district pool
  - enemy family
  - boss
  - drop tables
  - rank tone
  - short concept summary
- Reserve clearly stranger concepts for later tiers instead of spending them all in D-rank.

Done when:

- Porter's no longer replays the same few grounded site fantasies at slightly larger numbers

### 4. Expand Operator Breadth

- Add midgame operator packets with more specialized kits, stronger visual identities, and clearer retention pressure.
- Do not treat recipes as operator templates. Recipes are appearance inputs only.
- Promote selected unused recipe breadth from `content/data/operator-recipes.json` into a live recruit pool with explicit ownership:
  - assign distinct recipes to all bootstrap operators in `sim/index.ts`
  - introduce an authored/promoted recruit identity pool that the visitor pipeline can draw from
  - keep deterministic fallback recipe selection only as a safety net, not as the main authored-content path
- Preserve the current runtime split:
  - `content/bootstrap.ts` owns the fixed starting roster
  - visitor generation owns walk-in recruit candidates
  - `save/appearance.ts` owns recipe and visible-gear selection rules
  - optional `operator-identity` generation can enrich a candidate but must stay inside the approved promoted recipe and gear envelope
- Keep names and social flavor grounded in New York and the world rules.

Done when:

- the opening roster reads as six distinct people in-game
- the recruit pool uses a deliberate promoted identity set instead of indistinct stable-hash fallback behavior
- midgame recruitment feels like it has new faces and silhouettes, not only stronger stat envelopes

### 5. Expand Enemy And Boss Visual Coverage

- For bosses:
  - keep the explicit boss-art map pattern and extend it for every new boss
  - require that newly added boss ids resolve through the runtime surfaces that already consume boss art
- For ordinary enemies:
  - add promoted raid asset coverage keyed to authored enemy families or specific enemy template ids
  - stop relying on generic `threat-generic` and `threat-elite` markers as the only expression of expanded enemy breadth
  - wire raid rendering and raid card/detail surfaces to resolve authored enemy visuals from real runtime ids
- Keep raid visuals lighter and more abstract than boss portraits, but no longer content-agnostic.

Done when:

- every shipped boss has runtime-resolved encounter art
- every shipped enemy family has a distinct runtime-resolved visual treatment on raid surfaces
- adding a new enemy family without a corresponding promoted raid visual is treated as incomplete content work

### 6. Expand Non-Crafted Item Breadth

- Add more district- and rank-aware drop gear outside the crafting pipeline.
- Keep D-rank gear visibly more rift-touched and specialized than F/E gear.
- Save the truly singular silhouette and celebrity-item treatment for A/S.
- Add a visual treatment for non-gear inventory content so loot and consumables are not permanently text-only if they are meant to be first-class content.
- Reuse family/icon logic where that is sufficient; do not require one bespoke illustration for every junk drop if a smaller approved family system is enough.

Done when:

- item escalation reads visually and tonally instead of only numerically
- inventory and market surfaces can render the intended item visual contract, not only rank badges and stat chips

### 7. Add Porter's Narrative Event Breadth

- Expand authored event templates for:
  - waterfront operations
  - public-facing bar recruitment
  - district pressure
  - licensing and labor oversight
  - higher-rank operator retention
- Keep event names in bureaucratic or workplace framing, not quest framing.

Done when:

- Porter's has its own narrative/event identity instead of borrowing the bodega's pressure mix

### 8. Verify Runtime Wiring End-To-End

Content and asset creation is not complete until the runtime uses it.

- Verify starter roster rendering in HQ, roster, management, and raid surfaces.
- Verify recruit candidate rendering for deterministic visitors and AI-enriched `operator-identity` candidates.
- Verify boss rendering on posted contracts, raid cards, and the dedicated encounter surface.
- Verify enemy-family visual resolution on raid-map and focused raid UI surfaces.
- Verify inventory and market rendering for whatever non-gear item visual contract ships.
- Add or extend tests around:
  - missing boss art bindings
  - missing promoted starter-operator recipe assignments
  - recruit-pool recipe selection boundaries
  - missing enemy-family visual bindings
  - item visual fallback behavior where the contract allows fallback

Done when:

- the game no longer depends on accidental playground breadth or generic fallback visuals to represent shipped content
- the verification suite catches future regressions in content-to-asset wiring

## Rules

- Do not describe current content as if no higher-tier footholds exist; remediate the gap honestly from the shipped baseline.
- Do not jump straight from grounded F-rank content to full S-rank spectacle without intermediate tonal steps.
- Do not make operators look like fantasy classes or anime rarity pulls.
- Do not spend the most spectacular concepts in D-rank just because they sound exciting now.
- Do not treat the SVG playground recipe count as the live operator content count.
- Do not add a second operator identity path that bypasses the existing appearance contract.
- Do not add assets without wiring them to the runtime ids the game actually renders.
- Do not satisfy this plan by adding data-only content that still resolves to generic markers, generic portraits, or default recipe fallbacks.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- Porter's has a real midgame content layer across sites, operators, bosses, gear, and events
- the rank ladder has a clear tonal and visual escalation contract
- unused operator recipe breadth starts showing up in live recruitment content deliberately
- the starter roster and promoted recruit pool resolve to deliberate in-game identities rather than mostly hashed fallbacks
- enemy, boss, and item visual coverage is wired through the runtime surfaces the player actually sees

## Execution Status

### File Locks

- None until earlier slices merge.

### In Progress

- Blocked pending contract lock and city pressure.

### Blocked

- `phase-4-midgame-contract-lock-plan`
- `phase-4-midgame-city-pressure-plan`

### Done

- None.
