# Rival Guild Creation

This is the product-facing contract for adding a rival guild. Code, tests, templates, and shipped assets are still the source of truth for implemented behavior.

Before authoring rival content, read `docs/world/index.md` and `docs/world/guilds-and-dungeons.md`. Rival guilds are licensed New York dungeon-clearing businesses, not abstract enemy factions.

Also read the relevant tone and content references before proposing a rival:

- `docs/world/index.md`
- `docs/world/guilds-and-dungeons.md`
- `docs/world/premise-and-tone.md`
- `docs/world/operators-and-staff.md`
- `docs/product/content-taxonomy.md`

New rival work starts with discussion, not implementation. First propose the rival concept, pressure angle, leader read, tone, and likely move families. Be critical in that discussion: push back when the tone, character, business model, rivalry fantasy, or fit with the world does not make sense. Do not start editing templates or creating assets until the non-asset rival packet has survived that review.

## Current Feature Scope

The shipped rival feature is the first-pass skyscraper rival-pressure system:

- rival identity comes from `content/templates/rival-records/`
- mutable rival state lives in save/runtime rival pressure
- War Room unlocks the current-rival surface and strongest first-pass response
- authored rival decision events replace anonymous lane-generated rival pressure
- full leaderboard, rival HQs, direct rival battles, and rival history are future expansion scope

## What Makes A Complete Rival

A rival is only complete when all four parts ship together:

1. **Identity** — id, guild name, short display name, leader name, pressure lane, and current-rival one-liner.
2. **Assets** — shipped leader portrait and insignia under `public/data/rivals/<slug>/`.
3. **Narrative profile** — operating base, public pitch, pressure style, rivalry fantasy, and tone/voice. Drives briefing copy and player read.
4. **Move templates** — at least three authored rival decision events with choices, consequence summaries, and deterministic effects.

Identity plus assets alone is incomplete. A rival without a narrative profile or fewer than three moves fails content validation and cannot seed.

Lock the non-asset contract before asset production starts. The rival id, guild name, short display name, leader name, pressure lane, current-rival one-liner, narrative profile, and all move templates should be authored, reviewed, and passing validation first. Portrait and insignia work should only begin after that packet is stable, so visual production is based on final identity and rivalry intent rather than placeholder copy or changing mechanics.

When generating or revising guild leader assets, use the existing shipped rival leader images as the art and render-style reference. New portraits should read as part of the same leader-asset family unless a separate product/art-direction update explicitly changes the house style.

## Runtime Record Contract

Each rival record must contain only data used by the current game:

- `id`: stable id in the form `rival/<slug>`
- `guildName`: full guild name for detailed presentation
- `shortDisplayName`: compact UI label
- `leader.name`: leader display name
- `pressureLane`: one of `prestige`, `labor-market`, `sponsor-network`, or `hybrid`
- `copy.currentRivalOneLiner`: current-rival management summary
- `assetPaths.leaderPortrait`: shipped portrait path
- `assetPaths.insignia`: shipped insignia path
- `narrativeProfile`: operating base, public pitch, pressure style, rivalry fantasy, tone/voice
- `moves`: at least three `RivalMoveTemplate` entries

Do not add design notes, visual descriptions, asset briefs, status flags, placeholder fields, future leaderboard labels, district flavor, or move-authoring hints to runtime records outside of these fields. Visual identity lives in the shipped image assets.

## Move Templates

Each move is a rival decision event the game will raise as a blocking, persistent `rival_move` interruption. A move template has:

- `id`: stable id in the form `rival-move/<rival-slug>/<move-slug>`
- `family`: one of `contract_challenge`, `public_comparison`, `sponsor_interference`, `recruitment_market_loss`, `site_arrival`, `press_gravity`
- `weight`: positive selection weight
- `cooldownMinutes`: positive cooldown after the move last fired
- `briefingTemplate`: present-tense briefing copy shown in the rival move modal
- `basePublicPressureDelta` and `baseIntensityDelta`: applied on move enqueue
- `choices`: two or three `RivalMoveChoiceTemplate` entries

Each choice has a non-empty label, description, and consequence summary, plus at least one deterministic `RivalMoveEffect`. Effects reuse the same consequence kinds as authored incidents (`morale_delta`, `loyalty_delta`, `treasury_delta`, `reputation_delta`, `intel_delta`, `team_cohesion_delta`, `contract_pressure_delta`, `faction_relationship_delta`, `public_pressure_delta`) against `guild`, `team`, or `faction:<id>` targets.

Every rival should ship:

- one labor or recruitment move
- one contract, sponsor, or public-comparison move matching its pressure lane
- one signature move that cannot be reused by another rival with names swapped

## Add A Rival

1. Create `content/templates/rival-records/<slug>.ts`.
2. Export a `const <camelSlug>RivalRecord = { ... } satisfies RivalRecord`.
3. Author and lock every non-asset field:
   - identity fields
   - `copy.currentRivalOneLiner`
   - `narrativeProfile`
   - at least three validated `moves`
4. Run validation with the final non-asset packet before starting art.
5. Create assets from the locked packet and put them under `public/data/rivals/<slug>/`:
   - `leader-neutral.png`
   - `insignia.png`
6. Add the import and record to `content/templates/rival-records/index.ts`.
7. Run `vp check`, `vp test`, and `vp build`.

Adding a rival should not require edits to save hydration, rival systems, current-rival UI mapping, incident wiring, or War Room unlock logic. Those systems consume `readyToWireRivals` and `readyToWireRivalById` from `content/templates/rivals.ts`.

## Validation

`validateRivalRecords()` (invoked at module load from `content/templates/rivals.ts`, and covered by `content/templates/index.test.ts`) rejects any rival that:

- is missing `narrativeProfile`
- has fewer than three `moves`
- has a duplicate move id within the rival
- has a move with an unsupported family, non-positive weight, or non-positive cooldown
- has a move with empty briefing copy
- has a move with fewer than two or more than three choices
- has a choice with empty label, description, or consequence summary
- has a choice with no effects
- has an effect that uses an unsupported kind or malformed target ref

## Example Shape

```ts
import type { RivalRecord } from "./schema";

export const exampleRivalRecord = {
  id: "rival/example",
  guildName: "Example Guild",
  shortDisplayName: "Example",
  leader: {
    name: "Leader Name",
  },
  pressureLane: "hybrid",
  copy: {
    currentRivalOneLiner: "One concise sentence explaining why this rival matters right now.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/example/leader-neutral.png",
    insignia: "/data/rivals/example/insignia.png",
  },
  narrativeProfile: {
    operatingBase: "Where they work and what the space tells the player.",
    publicPitch: "What they say about themselves in one line.",
    pressureStyle:
      "Where they beat you, where they lose to you, and what the rivalry is actually about.",
    rivalryFantasy: "The player-facing emotional spine of the rivalry.",
    toneAndVoice: "How their copy reads, written in present tense with no fantasy jargon.",
  },
  moves: [
    // at least three authored RivalMoveTemplate entries
  ],
} satisfies RivalRecord;
```

A single example move template, for reference:

```ts
{
  id: "rival-move/example/sponsor-dinner-lock",
  family: "sponsor_interference",
  weight: 10,
  cooldownMinutes: 1440,
  briefingTemplate: "A sponsor who was reviewing your retainer had dinner with their team last night.",
  basePublicPressureDelta: 4,
  baseIntensityDelta: 3,
  choices: [
    {
      choiceId: "send-counter-gift",
      label: "Send a counter-gesture",
      description: "A discreet retainer sweetener.",
      consequenceSummary: "Treasury down. Sponsor holds position.",
      effects: [
        { kind: "treasury_delta", targetRef: "guild", value: -120 },
        { kind: "reputation_delta", targetRef: "guild", value: 1 },
      ],
    },
    {
      choiceId: "let-dinner-stand",
      label: "Let the dinner stand",
      description: "Do nothing.",
      consequenceSummary: "Sponsor drifts. Public pressure ticks.",
      effects: [
        { kind: "reputation_delta", targetRef: "guild", value: -1 },
        { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
      ],
    },
  ],
}
```

Real rivals need at least three of these, not one.

## Presentation Contracts

Rival move decisions use `app/ui/rival-move-modal.tsx`, not the generic incident modal. The modal preserves:

- two-word family headline
- breakout leader silhouette and insignia watermark
- flanking stat columns
- centered briefing area
- full-width footer with choice action buttons

The Public Pressure and Current Rival surfaces keep their current dial, vector, micro-bar, and glass-dossier compositions. Do not introduce new rival surfaces without updating this doc.

## Acceptance Checklist

- The rival reads as a specific licensed guild with a clear business/social pressure angle.
- The leader name and one-liner are final player-facing copy, not notes to future authors.
- The portrait and insignia paths point to real shipped files.
- The narrative profile fields are written as present-tense player-facing material, not author notes.
- The rival ships with at least three authored moves, including one signature move.
- The record passes `validateRivalRecords()`.
- The rival appears automatically in seeding coverage through `readyToWireRivals`.
