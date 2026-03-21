# Ascension Preproduction Plan

This document turns Phase 0 into an execution plan for AI agents. It assumes the core architecture is already locked by the docs in `[docs/](../index.md)`.

## Goal

Set up a stable, enforceable project foundation before feature implementation begins.

Preproduction is complete when:

- the repo can support normal iterative development
- quality gates run locally
- the app shell can boot
- content/template infrastructure exists in skeletal form
- save and validation infrastructure exists in skeletal form
- AI agents can work in parallel without inventing architecture

## Manual Prerequisites

These steps are intentionally manual or user-led before broader agent work begins.

### Step 0. Create and initialize the public repo

The user should:

- create or confirm the public GitHub repository
- clone or initialize it in the intended working directory
- confirm Git remotes are correct
- confirm the default branch strategy they want to use

An AI agent can walk the user through this, but it should not guess remote setup or publication intent.

### Step 1. Confirm local toolchain expectations

The user should confirm:

- Node version they want to standardize on
- package manager choice
- whether they want editor config files committed

Default recommendation if not yet decided:

- modern LTS Node
- `pnpm`
- commit editor and formatting config

## Required Baseline Before Feature Work

These are non-negotiable for parallel AI work.

### Step 2. Establish quality gates

Set up:

- formatter
- linter
- TypeScript typecheck
- one command or script entry point for each

Recommended expectation:

- formatting is auto-fixable
- linting is strict enough to stop obvious drift
- typecheck is part of normal validation

Reason:

- agents working in parallel without lint/format/typecheck will create avoidable churn immediately

### Step 3. Establish repo standards

Commit:

- `.editorconfig`
- formatter config
- lint config
- TypeScript config
- ignore files
- environment-file examples where appropriate

Define:

- command names for `lint`, `format`, `typecheck`, and `test`
- baseline branch and commit workflow expectations if desired

### Step 4. Establish folder skeleton

Create the intended top-level source layout in skeletal form:

- `src/app`
- `src/sim`
- `src/render`
- `src/content`
- `src/features`
- `src/lib`
- `src/save`
- `scripts`

The purpose here is architectural anchoring, not full implementation.

## Agent Workstreams

Once the manual prerequisites and quality gates are done, AI agents can work safely in parallel on these slices.

### Workstream A. App shell and start screen skeleton

Scope:

- boot the app
- mount the start screen
- define save-slot shell states
- define dev-menu entry point only, not full dev tools

Must not:

- implement gameplay rules
- bypass command boundaries

### Workstream B. Template and registry skeleton

Scope:

- create registry structure for resources, buildings, rooms, upgrades, missions, and events
- add deterministic validation
- add id conventions and registry bootstrap tests if practical

Must not:

- hardcode named-content rules into systems

### Workstream C. ECS skeleton

Scope:

- world creation
- singleton entities
- base component layout
- system scheduling structure

Must not:

- implement feature-specific gameplay shortcuts outside the documented contracts

### Workstream D. Save and data skeleton

Scope:

- IndexedDB layer
- save-slot metadata model
- schema version field
- round-trip serialization scaffolding

Must not:

- invent recovery logic for invalid runtime state

### Workstream E. Rendering and asset skeleton

Scope:

- Canvas mount for world view
- live SVG detail-view path placeholder
- modular SVG-part validation path
- cached search/composition interfaces

Must not:

- let rendering become a second gameplay state owner

## Suggested Execution Order

1. Manual repo/toolchain confirmation
2. lint/format/typecheck baseline
3. source-folder skeleton
4. start screen shell
5. registry and validation skeleton
6. ECS world and scheduler skeleton
7. save-slot and save-version scaffolding
8. render and asset-pipeline scaffolding

## Exit Checklist

Preproduction is ready to hand off to the next phase when:

- the repo has quality gates
- the app boots through the intended shell
- docs and folder structure agree
- registries exist and validate
- save/load skeleton exists with versioning
- ECS ownership boundaries are reflected in code layout
- the project is ready for bodega-slice implementation without reopening architectural questions

