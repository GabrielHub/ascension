# Planning Conventions

This file captures default rules for writing and running execution plans in this repo so future phase plans do not depend on one-off chat instructions.

## Purpose

Use these conventions when creating new plan docs, new plan-manager prompts, or new multi-agent execution waves.

Plans are execution documents. They should encode the repo's working defaults for:

- manager ownership
- contract lock before broad parallel work
- design-agent boundaries
- review-agent usage
- plan-status bookkeeping
- how pivots and superseded work are recorded

## Required Plan Set

When a phase is large enough to need multiple agents, default to:

- one manager plan
- one contract-lock or equivalent serial-gate plan if contracts are still unstable
- one plan per major ownership slice

Do not split work into more plans than the ownership boundaries support.

## Default Ownership Rules

Runtime and content ownership:

- `sim/`
- `content/`
- non-visual runtime adapters

Save ownership:

- `save/`
- save-focused tests

Design ownership:

- `app/ui`
- presentation concerns in `app/routes`
- `app/app.css`
- `render/`
- user-facing writing, copy, labels, readable logs, summary phrasing, and other presentation text
- design-only presentational adapters

If player-facing writing lives in `content/`, runtime owns the ids and schema while design owns the prose pass after the contract is locked.

If a task mixes design and code and cannot be split cleanly, keep the whole task with the design-owned slice rather than creating bad shared ownership.

## `lib/` Rule

Use `lib/` for cross-slice, non-domain-owned helpers only.

Good fits for `lib/`:

- pure formatting helpers used by multiple ownership slices
- shared app-level constants that do not belong to a single feature
- tiny generic utility functions with no gameplay ownership
- shared type utilities that are not feature- or domain-specific

Do not move code into `lib/` when it still clearly belongs to a single slice:

- gameplay logic stays in `sim/` or `content/`
- save normalization and migration logic stays in `save/`
- design view models and presentation helpers stay in design-owned files unless they become truly cross-slice
- runtime session glue stays in `app/features/runtime/`

Default rule:

- if a helper is only used by one ownership slice, keep it in that slice
- promote it to `lib/` only after it is clearly shared and still generic enough not to blur ownership

## Contract Lock Rule

Do not start broad parallel implementation until the phase has a locked answer for any unstable shared contracts, including:

- component names
- template ids or id prefixes
- public command names
- save-field groups
- validation and test gates

If a later pivot changes one of those contracts, record it explicitly in the plan docs before relaunching broad parallel work.

## Execution Status Rule

Every active plan should carry an `Execution Status` section with:

- `File Locks`
- `In Progress`
- `Blocked`
- `Done`

Agents must keep that section current while they work.

Finished work must be moved to `Done` explicitly. Do not leave completed items sitting in `In Progress`.

## Manager Defaults

The manager owns:

- sequencing
- active ownership tracking
- merge order
- join-point review
- scope control
- contract-change handoffs

The manager should not do broad implementation work inside feature slices.

The manager should default to one owner per track first. Only allow narrower sub-splitting after the first owner reports exact file locks and stabilizes the relevant contracts.

## Review-Agent Defaults

Review agents are useful, but only under these constraints:

- the implementation owner for the reviewed files has finished or released those locks
- the review scope is a bounded ownership slice, not the whole repo
- the review either reports findings or lands narrow fixes, not both across unrelated surfaces

Review agents should focus on:

- regressions
- ownership leaks
- code smell
- validation gaps
- missed tests
- bounded optimizations

Do not create a second broad editing wave by launching review agents into active files.

## Pivot And Supersession Rule

When the game direction changes and already-completed work is no longer correct:

- do not silently rewrite history
- add an explicit pivot note to the affected plan docs
- mark the invalidated assumptions as superseded
- state what corrective follow-up is now required

This keeps plan history useful while preventing stale work from being mistaken for current targets.

## Design-Owned Writing Rule

User-facing writing is design-owned by default.

That includes:

- UI copy
- labels
- mission or event text shown to the player
- readable log phrasing
- summary phrasing
- tone and terminology consistency

Runtime should own the structured facts and tags those strings are derived from, not the final player-facing phrasing.

## Prompting Rule

Agent prompts should explicitly tell the agent to:

- declare file locks before editing
- update the assigned plan doc as they work
- mark completed work as done
- stop and hand off cross-ownership changes instead of improvising them
- run the required `vp` verification for the surface they changed

Do not assume those instructions will be remembered unless the prompt states them.

## Playwright Rule

When a plan or prompt uses Playwright:

- assume the required dev server is already running
- if it is not running, stop and ask the user to start it
- never start dev servers autonomously
- treat Playwright as a single-owner shared resource by default
- do not launch concurrent Playwright agents or overlapping browser sessions unless the manager explicitly coordinates that handoff
- prefer existing dev-menu or preview-mode entrypoints when they help testing reach the intended state faster
- still test the normal player flow directly when the user-facing flow itself is under review
- store Playwright artifacts under `playwright/`, never in the repo root
- use `playwright/screenshots/` for screenshots
- use `playwright/logs/` for logs and network captures
- use `playwright/artifacts/` for traces or other browser artifacts
- prompts should remind agents to pass explicit filenames into those folders whenever the tool supports it

## SVG Exploration Rule

Before agents begin real SVG asset production for a category, they should first run a bounded style-exploration pass.

Required approach:

- create a temporary route or sandbox for side-by-side comparison
- generate multiple controlled visual variations
- compare them until one consistent style language is clearly preferred
- record that style choice
- only then begin reusable asset, tagging, and composition work

Apply this separately to major categories such as:

- operators
- environments
- enemies
- rooms
- buildings

Do not treat placeholder SVGs, preview parts, or first-pass experiments as the production style language by default.

After a style is locked:

- keep the exploration route as the `SVG Playground`
- move approved examples into canonical asset locations outside the playground
- record how those examples were constructed
- keep a small reference set that future agents can extend and validate against

Recommended structure:

- `public/data/svg-parts/<category>/reference/`
- `public/data/svg-parts/<category>/recipes/`
- `public/data/svg-parts/<category>/parts/`
