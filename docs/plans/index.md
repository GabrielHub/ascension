# Phase Plans Index

These plans are execution documents for future work. They are written for parallel agent execution with one manager agent owning orchestration, prompts, file locks, and merge order.

## Active Plan Set

- [Playtest Regression Test Plan](./playtest-regression-test-plan.md)
- [Playtest Regression Findings](./playtest-regression-findings.md)
- This plan set stages the post-remediation validation pass and gives the testing agent one checked-in document for fixed issues, blockers, and critical playtest critique.

## Locked Contracts

- No separate locked-contract plan file is checked in right now.
- If Phase 2 work reveals a contract change that affects canon or shared data shape, update the relevant core document first or in the same pass.

## Foundational Canon

- Use [Product Plan](../product-plan.md), [Roadmap](../roadmap.md), and [World Foundation Reference](../world-foundation.md) for future-facing canon.
- Add a separate foundational execution plan only when there is active cross-cutting work that cannot be staged cleanly from the core canon docs alone.

## Plan Rules

- Code, tests, templates, and shipped assets remain the source of truth for implemented behavior.
- These plans exist to coordinate future implementation work, not to restate current code.
- The product plan, roadmap, and world foundation are the only canonical future-facing source documents. Phase plans must derive from them and must not invent canonical gameplay rules, taxonomy, or world facts on their own.
- If a phase plan reveals a needed future-facing contract change, update the relevant core document first or in the same pass.
- One manager agent owns orchestration and gives the user the subagent prompts.
- Asset production must pass through human review in the SVG playground or audio playground before being locked into canonical asset locations.
- Review agents are expected throughout the phase, but only on surfaces whose implementation owner has finished or released the lock.
- Review agents should default to landing bounded fixes directly in the released files they are assigned.
- Review agents should only hand back findings instead of fixes when the issue crosses ownership boundaries, needs product/contract decisions, or would require a risky refactor.
