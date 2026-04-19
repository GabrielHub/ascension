# Operations UI Cascade Refactor

Scope: replace the current Operations bottom-panel composition with the same world-first cascading panel language now targeted for Headquarters. This plan covers Operations only. It does not redesign tutorials, guidance, or encounter authority.

## Goal

Replace the current Operations interaction model:

- bottom-panel category surfaces
- mixed inline detail sections inside large shared panels
- separate raid-world overlays that do not fully participate in one shell
- category roots that still feel like dashboard pages instead of stepwise flows

with a tighter cascade:

- Operations uses one right-anchored panel stack, like the new HQ target
- the raid / contract world remains primary wherever spatial focus matters
- each category opens a compact root panel
- deeper actions branch horizontally into adjacent panels instead of inflating the root
- all existing Operations features remain accessible with no loss of contract, raid, opportunity, or history functionality

Reference rule: this plan is not an excuse to remove operational visibility. Minimalism means fewer simultaneous containers and clearer flow ownership, not less information or fewer actions.

## Non-Regression Rule

No Operations feature may be removed from the current surface until the replacement panel root, branch path, and verification coverage are named in this plan and implemented.

This includes:

- contract review
- posted-contract browsing
- bid / secure flow
- active contract visibility
- active raid status
- team detail access
- opportunity browsing
- raid history and outcome review
- event-log navigation into Operations state

## Prerequisites

Do not start this plan from a false assumption that HQ is fully closed out.

Before beginning Operations conversion, either ship or explicitly re-scope the remaining HQ mismatches:

- empty-slot placement must use the cascade shell instead of the inline picker
- people-management flows must stop relying on inline staff / visitor action clusters where the HQ plan already called for branch panels
- the HQ floor switcher must either move into the floating world control or the HQ plan must be amended to match the shipped behavior

Operations should inherit the learned shell pattern, not develop while HQ still has unresolved shell-contract drift.

## Design Intent

Operations currently works, but the composition is still from the older “large dashboard plus extra overlay” period:

- category roots are broad, dense surfaces
- contract and raid state share space even when the player only needs one decision
- branch-worthy actions remain embedded inside a shared root
- the player is not consistently shown one next step at a time

The target flow should feel closer to:

- click `Operations` -> open an Operations root
- choose `Contracts` -> see only contract-root information
- choose a posting -> open adjacent contract detail / review
- secure a contract -> contract root updates and active operation becomes the next meaningful branch
- click active team / active site / raid state -> open adjacent operational detail
- close a panel -> everything to its right closes

The stack should read as one operational thread, not a page with unrelated modules.

## Core Principles

1. **One Operations shell.** Operations should use the same cascade language as HQ, not a special bottom-panel exception.
2. **World and focus first.** When the player is dealing with the active site, active team, or raid state, the world/focus target should lead and the panel should follow.
3. **One category, one root.** Contracts, Active, Opportunities, and History each get a compact root in the same shell.
4. **Branch, do not embed.** Contract review, team detail, opportunity detail, and history detail belong in child panels, not as enlarged inline sections.
5. **Preserve the single external focus contract.** The stack can be internal, but non-panel consumers still need one canonical active focus.
6. **Do not mix tutorial work into this refactor.** Operations should expose cleaner states and actions; it should not absorb future guidance responsibilities.
7. **Keep encounter authority separate.** The raid surface, interruption flow, and simulation authority stay where they belong. This is a presentation-shell refactor.

## Current State

- `app/ui/raid-panel.tsx` still owns the primary Operations panel composition.
- The player can switch between `contract`, `active`, `opportunities`, and `history` inside one large Operations surface.
- Contract review and board flows still live inside the same broad panel family.
- Active raid visibility and raid-watch detail are not yet expressed as part of one consistent cascade.
- Event-log and world focus assumptions still depend on a single meaningful active target.

## Operations Target End State

### Global Operations Shell

- Operations uses the same `PanelStack` primitive as HQ.
- The stack is anchored to the right edge.
- Panels branch left-to-right inside the stack while the stack stays right-anchored.
- `Esc` closes the rightmost panel.
- Closing a parent truncates everything to its right.
- The old bottom-panel composition is removed once all category replacements are live.

### Operations Navigation

- `Operations` remains a top-level shell destination.
- Category pills or tabs remain valid entry points, but each opens a root into the stack rather than swapping a giant bottom panel.
- Entering a different category replaces the root panel and clears category-specific children unless the new route intentionally preserves a shared world-backed target.

### Canonical Focus Model

Operations must preserve one externally visible focus target even if multiple stack entries are open.

Rules:

- reuse the HQ-era `effectiveFocus` pattern rather than inventing a second incompatible stack contract
- the canonical external focus is the rightmost world-backed operational entity in the stack
- directory-only roots such as `contracts-root` or `history-root` are panel entries only and do not widen render-layer focus kinds
- event-log navigation, test snapshots, and any world highlighting continue to read one effective focus only

## Feature Mapping

This map is binding. If a current feature is not mapped here, it is not safe to remove the old surface.

### Contracts Root

Root entry:

- open Operations and select `Contracts`
- event-log jump to contract review or new posting

Root panel should contain:

- current contract status summary
- whether the player has a secured active contract
- concise board summary when no contract is secured
- direct entry into `Review current`, `Browse postings`, or `Active operation` as applicable

Branch panels may include:

- resolved contract review
- posting board
- single posting detail
- bid / secure confirmation

Must preserve:

- post-raid review visibility
- comparison between available postings
- bid / secure flow
- clear transition from selected posting to live active operation

### Active Operation Root

Root entry:

- select `Active`
- secure a contract from the contracts branch
- event-log jump to active raid update

Root panel should contain:

- active site identity
- concise state summary
- team status summary
- immediate blockers, urgency, or notable raid state

Branch panels may include:

- team detail
- raid-watch detail
- site detail
- relevant active-log slice

Must preserve:

- current active contract visibility
- live team / raid status inspection
- quick navigation from active operation to affected team or event trail

### Opportunities Root

Root entry:

- select `Opportunities`
- event-log jump to opportunity unlock or expiry

Root panel should contain:

- concise list of current opportunities
- notable rewards / timing / gating at summary level

Branch panels may include:

- single opportunity detail
- confirm / pursue branch where relevant

Must preserve:

- access to all currently surfaced opportunities
- enough summary information to triage which opportunity matters now

### History Root

Root entry:

- select `History`
- event-log jump to past result detail

Root panel should contain:

- concise list of past raids / contract outcomes
- summary markers for success, failure, damage, or notable consequences

Branch panels may include:

- single raid outcome detail
- single contract-result detail

Must preserve:

- access to prior raid summaries
- outcome review with enough detail to understand roster, loot, and consequence changes

### Team Detail

Root entry:

- active operation branch
- event-log jump to a team status event

Root panel should contain:

- team identity
- roster summary
- current mission state
- health / readiness / damage summary

Branch panels may include:

- member detail
- result detail
- relevant incident / boss-commitment handoff summary

Do not turn this into a new encyclopedia or a new management dashboard. It is an operational branch, not a second roster app.

## Layout Rules

### Root Panels

Root panels should be compact and decision-oriented:

- what state is this category in
- what matters now
- what is the next branch

They should not duplicate full detail that already belongs in children.

### Detail Panels

Detail panels should carry the richer read:

- one contract
- one team
- one opportunity
- one historical result

Do not make the root panel a summary plus a fully expanded detail page at the same time.

### Raid World / Active Surface

The active operation surface should remain visually primary when a raid is underway.

Rules:

- the stack must complement the active surface, not cover or compete with it
- the panel shell should not hide the most important live raid reads
- if an encounter or blocking interruption takes priority, it remains authoritative and the stack yields

## Phased Rollout

### Phase 0 — Readiness Pass

- Re-read `docs/roadmap.md`, the final HQ cascade plan, and the shipped Operations implementation.
- Confirm the HQ shell primitive and focus-compatibility layer are real and stable enough to reuse.
- Write down any remaining HQ contract mismatch that must be fixed first instead of worked around here.

Exit criteria:

- the implementation agent knows which shell primitives are reusable
- no one is pretending the HQ shell contract is more finished than it is

### Phase 1 — Stack Contract For Operations

- Reuse the shared panel-stack primitive for Operations.
- Thread Operations category state through the same effective-focus compatibility rule used by HQ.
- Do not delete the old Operations panel yet.

Exit criteria:

- Operations can render stack-based roots without breaking existing external focus consumers

### Phase 2 — Contracts Conversion

- Convert `Contracts` into a compact root panel.
- Move resolved review, posting board, and posting detail into branch panels.
- Ensure bid / secure flow still lands cleanly in Active.

Exit criteria:

- contract browsing no longer depends on one giant shared panel
- securing a contract works end to end

### Phase 3 — Active Conversion

- Convert `Active` into a compact root panel.
- Move team detail, raid-watch detail, and relevant active sub-surfaces into branch panels.
- Ensure event-log jumps can still land on meaningful active targets.

Exit criteria:

- active operation is navigable through the stack
- team detail is no longer just an inline sub-surface

### Phase 4 — Opportunities And History Conversion

- Convert both remaining category roots into the same shell.
- Move single-opportunity and single-history entries into dedicated child panels.

Exit criteria:

- all four Operations categories live in the same cascade shell

### Phase 5 — Old Shell Removal

- Remove the old bottom Operations panel composition once parity is verified.
- Clean up stale shell-specific helpers, dead props, and dead branches that only existed for the old panel model.
- Update any docs that still describe Operations as bottom-panel-first.

Exit criteria:

- Operations has one shell only
- no dead dual-surface path remains

### Phase 6 — Verification And Stabilization

- Run `vp check`.
- Run `vp test`.
- Run `vp build`.
- Add or update browser coverage for:
  - Operations root open
  - Contracts root -> posting detail -> secure
  - Contracts root -> resolved review
  - Active root -> team detail
  - Opportunities root -> opportunity detail
  - History root -> result detail
  - event-log jump -> effective operational focus
  - `Esc` and close-button truncation behavior

## Risks

- **Feature loss through simplification.** Contract review and team state can look like “secondary detail” but are operationally required.
- **Focus drift.** If Operations introduces its own stack contract instead of reusing the single external focus rule, event-log and test behavior will diverge.
- **Active-surface crowding.** A bad panel width or placement rule can make the live raid surface less readable than it is now.
- **False parity claims.** If the old bottom panel is removed before all categories have branch parity, the refactor will regress even if it looks cleaner.

## Out Of Scope

- redesigning tutorial or onboarding behavior
- encounter-authority changes
- simulation-owned contract / raid rules
- broader shell/header redesign outside what the Operations cascade strictly requires

## Deliverables

- `docs/plans/operations-ui-cascade-refactor.md`
- Operations shell changes in `app/ui/game-shell.tsx` and related UI files
- refactored Operations panel roots and branches replacing the old monolithic surface
- updated browser coverage proving category and branch parity
- roadmap / product-doc remediation for any old description of the retired Operations shell

## Completion Notes

When this plan is complete:

- remove or archive any plan text that still describes Operations as bottom-panel-first
- fold the final shell description back into `docs/roadmap.md`
- confirm the tutorial / guidance follow-up still fits alongside the shipped HQ and Operations shells rather than competing with them
