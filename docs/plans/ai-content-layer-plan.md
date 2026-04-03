# AI Content Layer Plan

This remains the last active implementation plan. It adds optional generative variety only after the deterministic game is accepted as complete enough to stand on its own.

## Run This Last

Do not start this plan until the base game is playable offline, enjoyable with AI disabled, and stable enough that structured payload contracts are unlikely to churn.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/content-taxonomy.md`
- `docs/world/index.md`

## Current Research Snapshot

This plan replaces the old Vercel AI Gateway assumption.

As of April 2, 2026:

- Google documents `gemma4` as the current Gemma line and publishes an official Ollama integration path for it.
- Ollama, LM Studio, and `llama.cpp` all expose practical local inference paths for a Windows desktop machine.
- `vLLM` remains a Linux-first serving stack and is not the right first target for this Windows Tauri host.

This repo should therefore plan around local desktop inference first, not remote gateway routing.

## Project Constraint

This AI layer is for a personal local workflow first.

Assume:

- the browser build is the main development and tooling surface
- local browser runs happen on the author machine
- desktop mode is still implemented and supported
- desktop shares to a few friends may ship without usable AI because their hardware is not expected to run the local models well
- AI features are primarily for the author's local machine, not a broad distribution target

## Execution Contract

This document must be actionable enough for an implementation agent to execute end to end, with explicit pauses only where the author must do machine-local setup.

Rules:

- Separate user-owned machine setup from agent-owned repo work.
- Mark every manual handoff explicitly.
- After each manual handoff, the agent should be able to continue from the repo state without re-planning the whole feature.
- Do not leave “choose later” architecture gaps in the plan.

## Locked Decisions

- Do not use Vercel AI Gateway as the primary integration surface.
- Do not make a hosted model provider or cloud key a required part of the first implementation.
- Make local inference the only planned AI runtime path.
- Keep AI optional at runtime and safe to disable before or during a campaign.
- Keep the deterministic game fully playable with no model access.
- Keep gameplay authority in ECS, templates, and systems.
- Simulation chooses triggers, subjects, choices, numeric effects, and hidden modifiers.
- AI may phrase, assemble, or vary content on top of structured deterministic payloads.
- Failed AI output must never break a run.
- The first supported local runtime is `Ollama` on Windows desktop.
- The first default model target for bring-up is `gemma4`, but model choice must stay configurable at the transport boundary.
- Keep the transport contract OpenAI-compatible so the runtime can be swapped later to LM Studio or `llama.cpp` without rewriting the gameplay-facing generation pipeline.
- Implement the browser-local adapter first for development, tooling, and Playwright.
- Implement the desktop-host adapter second against the same transport contract.
- Do not optimize the first pass around friend-facing AI support. AI remains an author-local feature unless later evidence justifies broader support.

## Local Runtime Options And Decision

### Primary Choice: Ollama

Why this is the default:

- It has an official local Gemma integration path from Google.
- It runs as a local service on Windows with a stable localhost API.
- It is the lowest-friction path from “install a model locally” to “the Tauri host can call it”.
- It is easier to operationalize for a single-machine desktop setup than a Python serving stack.

Use Ollama as the first supported local runtime for:

- desktop playtesting
- local development
- local model evaluation
- first shipped local-only AI support in the Tauri host

### Accepted Alternate Runtime: LM Studio

LM Studio is acceptable as a secondary runtime for developers who want:

- a GUI model manager
- easier manual model swapping
- interactive prompt iteration outside the game

Do not make LM Studio the primary contract. Support it by honoring the same OpenAI-compatible localhost transport shape used for Ollama.

### Advanced Fallback: `llama.cpp`

`llama.cpp` is a valid fallback for advanced local setups that want direct GGUF control and a lightweight OpenAI-compatible server.

Do not make it the first implementation target. It is lower-level and increases setup variance compared with Ollama.

### Not The First Target: `vLLM`

Do not target `vLLM` first for this repo.

Reasons:

- this project’s host split is web-first plus Windows Tauri desktop
- `vLLM` is a heavier Linux-oriented serving stack
- it is not the lowest-risk path for a single-user Windows desktop workflow

Revisit it only if a later phase genuinely needs higher-throughput batching or Linux-hosted local serving.

## Host And Transport Contract

This project still has no gameplay backend. The AI path should stay local-first and host-aware.

Primary transport:

- OpenAI-compatible localhost HTTP API

First default endpoint:

- `http://127.0.0.1:11434/v1`

First default model:

- `gemma4`

Rules:

- Do not wire gameplay-facing systems directly to Ollama-specific endpoints.
- Do not scatter raw localhost URLs throughout UI and runtime code.
- Introduce one project-owned AI transport contract that takes:
  - base URL
  - model id
  - generation surface
  - payload version
  - request body
- Keep model and endpoint selection outside gameplay logic.
- Keep schema validation and quality gates project-owned even if the local runtime supports structured outputs.
- Treat OpenAI-compatible `responses` or `chat completions` as transport details, not as gameplay contracts.

## Host Split For AI

### Browser

- Browser mode is the primary development and tooling surface for AI work.
- The first implementation should let the browser call the local runtime directly on localhost.
- Browser-local AI support is intended for the author's machine and local test loop.
- Playwright and browser tooling should exercise the same browser-side AI path used during ordinary local development.
- Browser mode must still work fully with AI disabled.

### Tauri Desktop

- Tauri desktop should support the same AI feature set through a second adapter using the same transport contract.
- Desktop support matters because the shipped host is still Tauri, even if AI use there is mostly for the author.
- Persist desktop AI configuration outside save data.
- Do not block browser-first delivery on desktop-specific integration details.

## Configuration And Persistence Contract

The old BYOK and cloud-secret plan is no longer the default path.

Configuration now needs to cover:

- AI enabled or disabled
- local runtime kind
- local endpoint URL
- selected model id
- optional generation tuning values if a later phase genuinely needs them

Rules:

- Do not store secrets in save files, exported saves, or ordinary debug snapshots.
- Do not store host configuration inside campaign save payloads.
- Save files may store generated AI results and generation metadata when those results are already accepted as part of a campaign state.
- Desktop AI configuration should live in host-local app configuration, not ECS and not save snapshots.
- Browser-local configuration may exist for the author machine, but it must stay outside campaign save payloads and remain clearly local/dev scoped.

## Local Setup Contract

The first implementation should assume the user manually installs the local runtime.

First supported setup path:

1. Install Ollama on the Windows desktop.
2. Pull the default model:
   - `ollama pull gemma4`
3. Verify local inference manually:
   - `ollama run gemma4`
4. Verify the local API is reachable:
   - `http://127.0.0.1:11434`
5. Point the Tauri host at:
   - base URL `http://127.0.0.1:11434/v1`
   - model id `gemma4`

Rules:

- Do not make the app silently install models or mutate the user’s local runtime without an explicit future product decision.
- Do not assume the selected model is already present.
- Add explicit availability checks for:
  - runtime not installed
  - runtime not running
  - model not pulled
  - request timeout
  - malformed response

## User-Owned Manual Steps

These steps are not for the implementation agent. They are for the author to do on the local machine.

### Manual Step A: Install The Runtime

Owner: user

Required actions:

1. Install Ollama on the local Windows machine.
2. Confirm the `ollama` CLI is available in a new terminal.
3. Start or verify the Ollama background service.

Success check:

- `ollama --version` works
- `http://127.0.0.1:11434` responds locally

### Manual Step B: Pull And Smoke-Test The Model

Owner: user

Required actions:

1. Pull the default model:
   - `ollama pull gemma4`
2. Run a manual smoke test:
   - `ollama run gemma4`
3. If model quality or speed is poor, evaluate a different local model manually before asking the agent to lock a different default.

Success check:

- the model answers in the terminal
- the model id intended for the project is known

### Manual Step C: Confirm Browser-Local Access

Owner: user

Required actions:

1. Keep Ollama running locally.
2. If the browser blocks localhost requests because of runtime policy or CORS behavior, report the exact browser error back to the agent.

Success check:

- localhost requests from the local browser dev session are allowed
- or the exact failure is known so the agent can adapt the browser path

## Agent-Owned Repo Work

These steps are for the implementation agent.

The agent owns:

- all TypeScript runtime contracts
- browser adapter implementation
- desktop adapter implementation
- settings and persistence wiring
- dev console integration
- validation and fallback logic
- tests, checks, and docs updates inside the repo

The agent does not own:

- installing Ollama
- downloading the model on the author's machine
- changing Windows firewall, antivirus, or browser policy settings
- choosing a different model based on subjective local preference unless the user asks for it

## Handoff Gates

The implementation should pause only at these gates if the required machine-local step is not already complete.

### Gate 1: Runtime Missing

Stop condition:

- `ollama` is not installed or not available on the user machine

Agent action:

- finish repo work that does not require a live runtime
- tell the user exactly to complete Manual Step A

### Gate 2: Model Missing

Stop condition:

- runtime is reachable but the configured model is not available

Agent action:

- finish repo work that does not require a live model response
- tell the user exactly to complete Manual Step B

### Gate 3: Browser Localhost Blocked

Stop condition:

- the browser dev path cannot reach the local runtime because of browser policy or local environment behavior

Agent action:

- preserve the shared transport contract
- continue with desktop adapter work if useful
- tell the user exactly to complete Manual Step C or provide the precise browser error

## Planned File Targets

These are the expected implementation targets unless the codebase changes before the work starts.

- `app/features/settings/storage.ts`
  Extend persisted settings to include AI runtime configuration for local development.
- `app/features/settings/use-game-settings.ts`
  Surface AI settings updates through the existing settings hook.
- `app/ui/settings-modal.tsx`
  Add user-facing AI configuration and status controls.
- `app/ui/dev-menu.tsx`
  Keep the existing console surface as the manual AI testing entry point.
- `app/ui/dev-console-commands.ts`
  Add explicit AI debug commands for probe, generate, regenerate, and status inspection.
- `app/features/runtime/session.ts`
  Add the app-owned async orchestration layer and typed runtime session commands for AI work.
- `app/features/runtime/session.test.ts`
  Add coverage for AI command behavior, fallback behavior, and host split behavior.
- `app/features/desktop/bridge.ts`
  Add typed desktop bridge commands for runtime probing and generation.
- `app/features/desktop/bridge.test.ts`
  Add desktop bridge tests if a dedicated test file is needed.
- `app/features/ai/*`
  Add project-owned AI transport, schemas, prompt builders, and adapter code here if new files are warranted.
- `src-tauri/src/lib.rs`
  Add Tauri commands for desktop-local AI probing and generation.
- `sim/runtime.ts`
  Add simulation-facing request state exposure only if the AI request registry genuinely belongs in simulation-owned runtime state.
- `sim/runtime.test.ts`
  Add tests only if simulation-visible AI request state is introduced there.
- `save/types.ts`
  Add save-safe AI result metadata only if needed for accepted generated outputs, not for host config.
- `app/features/settings/storage.test.ts`
  Extend settings persistence tests for AI configuration normalization.
- `app/ui/settings-modal.test.tsx`
  Extend modal tests for AI settings controls.

Prefer adding new files only where a project-owned AI transport module or schema module clearly improves clarity.

## Required Stable API Names

Use these names unless a repo-level conflict forces a rename. The point is to prevent one implementation pass from inventing unstable ad hoc naming.

### Settings Types

- `AiRuntimeKind`
- `AiSettings`
- `AiConnectionStatus`
- `GameSettings["ai"]`

Expected shape:

- `AiRuntimeKind`: `"ollama" | "lm-studio" | "llama-cpp"`
- `AiSettings.enabled`: boolean
- `AiSettings.runtimeKind`: `AiRuntimeKind`
- `AiSettings.baseUrl`: string
- `AiSettings.modelId`: string

### Transport Types

- `LocalAiTransportConfig`
- `AiGenerationSurface`
- `AiGenerationRequest`
- `AiGenerationResult`
- `AiRuntimeProbeResult`
- `AiTransportClient`

Expected behavior:

- `AiTransportClient.probe(config)`
- `AiTransportClient.generate(request)`

### Runtime Request Types

- `AiRequestStatus`
- `AiRequestRecord`
- `AiRequestRegistry`

Expected statuses:

- `"idle" | "pending" | "succeeded" | "failed"`

### Runtime Session Commands

Add typed commands on `RuntimeSessionCommands` with these names:

- `probeAiRuntime()`
- `generateAiSurface(input)`
- `regenerateAiSurface(input)`

Do not route all AI work through raw untyped `dispatch()` only. The runtime session already exposes typed helpers for other domains and the AI layer should match that pattern.

### Desktop Bridge Commands

Add Tauri command names using the existing `desktop_*` naming scheme:

- `desktop_ai_probe_runtime`
- `desktop_ai_generate`

If model enumeration is added, use:

- `desktop_ai_list_models`

### Dev Console Commands

Add these command names to `app/ui/dev-console-commands.ts`:

- `/ai status`
- `/ai probe`
- `/ai generate incident-framing`
- `/ai generate operator-identity`
- `/ai regenerate <request-key>`
- `/ai inspect <request-key>`

The parser already supports two-word command names. Follow the existing command family structure instead of building a second AI-only console surface.

## File-By-File Implementation Checklist

This section is the concrete build order another agent should follow.

### 1. Settings Storage

Files:

- `app/features/settings/storage.ts`
- `app/features/settings/use-game-settings.ts`
- `app/features/settings/storage.test.ts`

Required changes:

1. Extend `GameSettings` with an `ai` object.
2. Add defaults:
   - `enabled: false`
   - `runtimeKind: "ollama"`
   - `baseUrl: "http://127.0.0.1:11434/v1"`
   - `modelId: "gemma4"`
3. Extend `normalizeGameSettings()` to clamp invalid AI settings back to safe defaults.
4. Extend settings persistence tests to cover:
   - missing AI block
   - invalid runtime kind
   - invalid base URL type
   - invalid model id type

Acceptance:

- settings round-trip through local storage
- old settings payloads normalize cleanly
- AI stays disabled by default

### 2. Project-Owned AI Module

Files:

- `app/features/ai/types.ts`
- `app/features/ai/transport.ts`
- `app/features/ai/browser-client.ts`
- `app/features/ai/schemas.ts`
- `app/features/ai/prompts.ts`
- `app/features/ai/index.ts`

Required changes:

1. Create a small project-owned AI module under `app/features/ai`.
2. Keep it transport-first, not provider-first.
3. Implement an OpenAI-compatible browser client using `fetch`.
4. Implement `probe()` and `generate()` against the configured localhost base URL.
5. Keep prompt builders and schema validators in project code, not inline inside UI components.

Acceptance:

- the browser adapter can probe the runtime
- the browser adapter can submit a request for one test surface
- schema validation and semantic failure return structured errors

### 3. Runtime Session Orchestration

Files:

- `app/features/runtime/session.ts`
- `app/features/runtime/session.test.ts`

Required changes:

1. Add AI state owned by the runtime session orchestration layer.
2. Add typed commands:
   - `probeAiRuntime()`
   - `generateAiSurface(input)`
   - `regenerateAiSurface(input)`
3. Add an in-session request registry keyed by purpose and subject identity.
4. Reuse results when payload version is unchanged.
5. Surface pending, succeeded, and failed state in the session view.
6. Keep transport I/O asynchronous and outside pure sim dispatch.

Acceptance:

- duplicate dev-console triggers do not fire duplicate requests for the same key while pending
- successful results are reusable
- failed results can be regenerated explicitly

### 4. Dev Console Integration

Files:

- `app/ui/dev-console-commands.ts`
- `app/ui/dev-menu.tsx`

Required changes:

1. Add an `AI` command family.
2. Add the exact commands listed in `Required Stable API Names`.
3. Commands must call the typed runtime session AI helpers, not raw `fetch`.
4. `ai status` must show:
   - enabled/disabled
   - runtime kind
   - base URL
   - model id
   - probe result if known
5. `ai inspect <request-key>` must show the request record state and result summary.

Acceptance:

- AI can be probed and triggered from the existing dev console
- console output is enough for Playwright and manual debugging

### 5. Settings Modal Integration

Files:

- `app/ui/settings-modal.tsx`
- `app/ui/settings-modal.test.tsx`
- `app/ui/game-shell.tsx`

Required changes:

1. Add an AI section to the existing settings modal.
2. Add controls for:
   - enabled toggle
   - runtime kind
   - base URL
   - model id
   - probe action
3. Show connection state and failure summaries.
4. Wire settings updates through `useGameSettings()`.

Acceptance:

- the settings modal can configure the local runtime
- changing settings does not touch save data
- AI-disabled mode remains the default and works cleanly

### 6. Desktop Bridge And Tauri Commands

Files:

- `app/features/desktop/bridge.ts`
- `src-tauri/src/lib.rs`

Required changes:

1. Add desktop bridge methods:
   - `probeAiRuntime()`
   - `generateAi(request)`
2. Add matching Tauri commands:
   - `desktop_ai_probe_runtime`
   - `desktop_ai_generate`
3. The desktop path must use the same prompt/schema/request-key rules as the browser path.
4. Do not put secrets or host config in save files.

Acceptance:

- desktop can probe and generate through the same contract
- browser-first implementation does not have to be rewritten to add desktop

### 7. Save Boundary Review

Files:

- `save/types.ts`
- `save/codec.ts`
- `save/codec.test.ts`

Required changes:

1. Only persist accepted generated results if they are part of campaign state.
2. Do not persist host config, endpoint URLs, or runtime availability state in save payloads.
3. If AI request/result state is saved, it must be versioned and replaceable.

Acceptance:

- exported saves contain no host-only AI configuration
- save load remains valid with AI disabled or unavailable

### 8. Tests And Verification

Files:

- `app/features/settings/storage.test.ts`
- `app/ui/settings-modal.test.tsx`
- `app/features/runtime/session.test.ts`
- any new `app/features/ai/*.test.ts` files if needed

Required checks:

1. `vp check`
2. `vp test`
3. `vp build`

Required test cases:

- browser-local probe success
- runtime unavailable
- model missing
- generation failure falls back cleanly
- duplicate request suppression
- settings persistence normalization
- AI-disabled path remains clean

## First Implementation Slice

To keep the first pass bounded, the first fully implemented surface should be:

- incident framing

And not:

- operator identity assembly
- skill or item text generation

Reason:

- incident framing is easier to validate, easier to fall back from, and lower-risk than operator identity assembly

## Resume Protocol For Future Agents

If an implementation agent stops mid-plan, the next agent should resume in this order:

1. Read this plan.
2. Check whether Manual Step A, B, and C are complete.
3. Inspect `GameSettings` for the `ai` block.
4. Inspect `RuntimeSessionCommands` for the AI helpers listed above.
5. Inspect `app/ui/dev-console-commands.ts` for the required `/ai ...` commands.
6. Run targeted tests for the modified area.
7. Only then continue to the next unchecked file-by-file implementation item.

## Dev And Tooling Test Contract

The AI layer still needs a pre-E2E test path. Do not require the full player-facing auto-trigger path to be live before AI features can be exercised.

Rules:

- Add explicit dev-mode triggers for AI generation through the existing in-game dev menu.
- Dev-mode triggers must work even when the player-facing AI setting is off.
- Dev-mode triggers are for targeted testing; they must not silently enable normal automatic AI behavior for the campaign.
- Keep one shared generation pipeline. Dev triggers, automatic runtime triggers, and isolated tooling should call the same transport, validation, and fallback layer.
- Keep AI execution asynchronous. UI must show pending, success, and failure states without blocking the simulation loop.
- The ECS and runtime remain the authority for when gameplay-affecting content is consumed.
- Dev surfaces should show which runtime and model produced a result.

## ECS And Request-Lifecycle Contract

Avoid duplicate AI calls by making request state first-class.

Rules:

- Introduce a single runtime-owned AI request record keyed by a stable subject identity and generation purpose, for example `incident-framing:{incidentId}` or `operator-identity:{candidateId}`.
- Automatic triggers and dev-menu triggers must both consult the same request registry before starting a call.
- Request records must track at least:
  - request key
  - subject id
  - generation surface
  - trigger source: `auto`, `dev-menu`, or `tooling`
  - status: `idle`, `pending`, `succeeded`, `failed`
  - runtime kind
  - endpoint id or resolved base URL label
  - model id
  - payload version
  - started at / finished at
  - result reference or error reference
- If a valid result already exists for the current payload version, reuse it instead of re-requesting.
- If a request is already pending for the same key, additional triggers should subscribe to or reveal the existing request instead of launching another one.
- Only retry when the prior request failed, the payload version changed, or the user explicitly requested a regeneration action.
- Keep AI I/O outside pure ECS simulation steps. ECS can enqueue intent and consume validated results, but the network call itself should run in an async orchestration layer.

## Phase 1: Define Structured Payload And Transport Contracts

Owner: systems/design

Tasks:

1. Define the payload contracts for the first AI surfaces:
   - incident framing
   - operator identity assembly
2. Define exactly which fields AI may produce and which fields remain deterministic-only.
3. Include world-grounded tone inputs without giving AI authority over hidden gameplay state.
4. Define the exact output schemas and semantic checks so structured generation is strongly guided and validated.
5. Define one project-owned local transport contract using an OpenAI-compatible localhost endpoint.
6. Lock the first runtime profile:
   - runtime: `ollama`
   - endpoint: `http://127.0.0.1:11434/v1`
   - default model: `gemma4`
7. Define the request keys, request statuses, cache or reuse rules, and regeneration rules for dev-mode, auto-mode, and tooling callers.
8. Define the host-local configuration contract shared by Tauri commands, dev menu, and tooling surfaces.
9. Write down the manual handoff expectations for Ollama installation, model pull, and browser-local verification so a later implementation pass knows exactly when to stop and ask the user.

Done when:

- every AI surface has a strict input and output contract with a documented authority boundary
- the local runtime and transport boundary are explicit and not spread through app code

## Phase 2: Build Validation And Fallbacks

Owner: systems

Tasks:

1. Add schema validation, semantic validation, and quality gates.
2. Add fallback behavior for every failure path:
   - authored copy fallback
   - prefab assembly fallback
   - no-op or stock text fallback where appropriate
3. Ensure generated state is save-safe and replaceable.
4. Ensure request results are versioned so stale results can be invalidated without ambiguous reuse.
5. Ensure local-runtime-specific failures collapse into deterministic fallback behavior instead of leaking transport details into gameplay.

Done when:

- repeated AI failures still leave the campaign playable

## Phase 3: Build Browser-First Runtime Integration And Async Orchestration

Owner: runtime/browser integration

Tasks:

1. Add the browser-side localhost adapter for the shared AI transport contract.
2. Add explicit AI test actions to the existing dev menu for each shipped AI surface.
3. Allow those actions to trigger AI generation while the player-facing AI setting remains off.
4. Route dev-menu triggers through the shared request registry and generation pipeline.
5. Surface pending, success, failure, and regenerate states asynchronously in the dev UI.
6. Prevent duplicate calls when a dev-triggered request is already pending or has a reusable result.
7. Make the browser-local path reachable from Playwright and existing web tooling without introducing a separate special-case generation stack.
8. If the runtime or model is unavailable, stop with a precise handoff message instead of continuing into broken verification.

Done when:

- the browser dev surface can verify and use a local model runtime without a gameplay backend
- AI features can be exercised deliberately before the full automatic player-facing trigger path is ready

## Phase 4: Add Desktop Adapter And Host-Aware Persistence

Owner: UI/gameplay integration

Tasks:

1. Add the Tauri desktop adapter against the same AI transport contract used by the browser path.
2. Add host-aware AI feature settings to the start screen and in-game settings.
3. Add local-runtime settings UI for:
   - runtime enabled or disabled
   - runtime kind
   - endpoint URL
   - model id
   - connection status
4. Add explicit status surfaces:
   - AI disabled
   - runtime unavailable
   - runtime running but model missing
   - connected to local runtime
5. Define save behavior for AI-enabled and AI-disabled runs.
6. Define how dev-triggered results behave when the setting is off:
   - allow isolated testing
   - avoid unintentionally turning on automatic behavior
   - avoid duplicate future calls when the tested result is already reusable
7. Verify that toggling AI mid-campaign does not corrupt state or strand generated content in unusable formats.
8. Ensure AI settings never write secrets, host-only config, or local endpoint internals into save files, exported saves, logs, or ordinary debug snapshots.
9. Keep the browser and desktop adapters resumable so the implementation can continue cleanly after a user-owned setup handoff.

Done when:

- browser and desktop both support the same optional local AI layer through one shared contract
- AI behaves like an optional local variation layer, not a runtime dependency

## Phase 5: Add Isolated Playground And Viewer Surfaces

Owner: tooling/UI

Tasks:

1. Extend the SVG playground and asset viewer so operator generation can be tested in isolation from the campaign runtime.
2. Add a narrative-generation review surface in tooling so incident framing and recap generation can be tested without waiting for full in-game trigger conditions.
3. Reuse the same schemas, prompts, model routing, transport, validation, and fallback logic used by runtime integration.
4. Keep tooling results clearly marked as isolated test artifacts unless explicitly promoted into approved content pools.
5. Support async request inspection in tooling:
   - payload preview
   - pending state
   - final result
   - validation failure
   - regenerate action
6. Show which local runtime and model produced each tooling result.

Done when:

- operator generation and narrative generation can be reviewed in isolation before full campaign integration is complete

## Phase 6: Integrate One AI Surface At A Time

Owner: systems/content

Tasks:

1. Start with the lower-risk surface that is easiest to validate and fall back from.
2. Ship one surface to production quality before enabling the next one.
3. Keep reusable candidates behind human review before promoting them into approved authored pools.
4. After the first rollout is stable, add later allowed surfaces one at a time:
   - incident briefing and recap copy
   - operator identity packets
   - descriptive text for skills, items, and operators whose numeric payloads are already locked
5. Keep structured outputs narrow and versioned. Prefer small purpose-built schemas over one large polymorphic schema for every AI feature.
6. Keep the model binding configurable so a later better local model can replace `gemma4` without reopening gameplay contracts.

Done when:

- the first AI surface improves variety without obscuring debugging or balance

## Phase 7: Failure And Offline Verification

Owner: QA

Tasks:

1. Verify fully offline play with AI disabled.
2. Verify the browser-local path works on the author machine for local development and Playwright.
3. Verify the game behaves correctly when the local runtime is not installed.
4. Verify the game behaves correctly when the local runtime is installed but not running.
5. Verify the game behaves correctly when the selected model is missing.
6. Verify repeated model-call failure during a live run.
7. Verify deterministic incident outcomes when phrasing varies.
8. Verify operator-generation compatibility with the prefab asset pipeline and save codec.
9. Verify that dev-mode triggers do not create duplicate automatic runtime calls later for the same subject and payload version.
10. Verify that isolated tooling calls do not mutate live campaign state unless explicitly wired to a runtime test action.
11. Verify that browser mode remains fully supported with AI disabled.
12. Verify that desktop shares remain usable when AI is disabled or unavailable on weaker friend hardware.

Done when:

- AI can fail, be disabled, or be absent without damaging the campaign

## Parallel Rules

- Phase 1 and runtime evaluation research may run before final implementation work.
- Do not enable multiple AI gameplay-adjacent surfaces at once during the first rollout.
- Do not use AI to invent unsupported assets, rank budgets, or numeric payloads.
- Do not create one code path for dev-triggered AI and another separate code path for automatic runtime AI. Share the transport, request registry, validation, and result-writeback contracts.
- Do not let the browser-first dev path turn into a browser-only architecture. Desktop support still needs to land on the same contract.
- Do not hard-code `gemma4` deeply enough that a later local model swap becomes a refactor.
- Do not treat local-runtime availability as guaranteed. It is an optional dependency.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Implementation End State

Another agent should be able to treat this plan as a full execution spec.

That means the finished implementation pass should produce:

1. Browser-local AI generation working in local development against Ollama.
2. Dev-console commands that can probe the runtime and trigger generation on demand.
3. Shared request, validation, fallback, and result-reuse logic in the runtime layer.
4. Settings UI for local AI enablement and runtime status.
5. Desktop adapter parity through Tauri commands using the same transport contract.
6. Tests covering settings normalization, adapter behavior, and fallback behavior where practical.
7. A short operator note in the final implementation summary that tells the user whether they now need to do Manual Step A, B, or C before continuing.
