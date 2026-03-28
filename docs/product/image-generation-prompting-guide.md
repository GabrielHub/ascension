# Image Generation Prompting Guide

Repo-specific guide for raster image generation workflows. Use this whenever generated images are part of the approved production path.

This guide is adapted from the OpenAI `gpt-image-1.5` prompting guide and extended with project-specific rules for Ascension's tone, consistency, and asset-family boundaries.

Source reference:

- [OpenAI Cookbook: GPT-image-1.5 Prompting Guide](https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/multimodal/image-gen-1.5-prompting_guide.ipynb)

## Purpose

Use this guide when generating raster images for:

- narrative presenter portraits
- future prestige-tier portraits or promo art
- future S-rank item hero renders
- future boss concept sheets or non-runtime raster concept work

Do **not** use this guide to replace:

- HQ room scene SVG workflows
- modular operator SVG portraits used by the shipped runtime
- vector/logo/icon work that belongs in code-native or SVG pipelines

## Core Prompting Rules

Use the same prompt logic every time:

1. scene or backdrop
2. subject
3. key visual details
4. framing and composition
5. lighting and mood
6. constraints and preserve list

Keep prompts concrete. Specify clothing, posture, face angle, materials, and the intended use. Iterate with one change at a time instead of overloading the first prompt.

## Ascension Visual Direction

Default raster style direction for character-facing assets:

- manhwa-inspired modern dungeon-fantasy portrait art
- clean facial readability
- strong silhouette separation
- cinematic but controlled lighting
- grounded NYC workwear and lived-in details
- supernatural edge without turning the image into generic neon fantasy

Use "Solo Leveling" only as informal directional shorthand in internal discussion. In prompts and checked-in docs, prefer descriptive language:

- Korean action-webtoon portrait energy
- modern dungeon-fantasy manhwa look
- high-contrast, polished webtoon rendering

That keeps the style target legible without tying the asset family too tightly to one outside IP.

## Asset-Family Defaults

### Narrative Presenter Portraits

Use for:

- assistant
- cook
- bartender
- future recurring narrative presenters

Defaults:

- single character only
- bust-up or waist-up framing
- 3/4 or front-facing portrait
- plain light neutral background
- no detailed scene background
- expression readable at modal size
- clothing and styling must communicate role immediately

### Prestige / Future Hero Assets

Use for:

- S-rank operator hero portraits
- S-rank gear hero renders
- prestige boss concept art

Defaults:

- still follow the same prompt structure
- allow more dramatic lighting and visual effects
- keep silhouette and readability stronger than surface detail
- review against the actual use case before promoting style rules into canon

## Consistency Workflow

For any recurring character or recurring prestige asset family:

1. write a short canon brief first
2. generate a neutral master image
3. approve the neutral master before variants
4. generate variants by preserving the approved master
5. record the winning prompt and preserve list
6. review in-context, not only on a blank page

Canon brief should include:

- role
- age band
- attitude
- clothing language
- social read
- what makes them recognizable at a glance

Preserve list should include:

- face shape
- hair shape and color
- clothing silhouette
- framing
- background treatment
- overall lighting logic

## Background Policy

Generated transparency is not assumed.

Default policy for the first raster portrait family:

- generate on a plain warm-white or light neutral background
- keep strong edge contrast around hair, shoulders, and clothing
- avoid white-on-white costume choices that kill separation
- present the image in UI as a faux cutout on a dark portrait panel by default

Important implementation note:

- CSS-only white-background knockout is acceptable for the first faux-cutout portrait slice inside a dark portrait panel
- it is **not** reliable enough to be the only production plan for true cutouts
- if the product needs real JRPG-style freeform cutouts, run an explicit extraction/edit pass after generation

In other words: white background is the generation default, not a guarantee that CSS can safely remove it later.

## Review Rules

Always review generated assets against the real use case:

- presenter portraits inside the interruption modal
- prestige items against the intended UI/background
- boss concept art against the relevant encounter or presentation framing

Do not approve from a blank canvas alone.

Check:

- identity consistency
- silhouette clarity
- expression readability
- edge cleanliness
- background contrast
- tone fit with Ascension

## Prompt Template

Use this structure as a default:

```text
Use case: <asset family>
Asset type: <where it will appear>
Primary request: <what to generate>
Subject: <who or what>
Style/medium: <manhwa-inspired raster illustration / other>
Composition/framing: <bust-up, 3/4, centered, etc.>
Lighting/mood: <lighting and emotional tone>
Background: <plain warm-white / other controlled background>
Key details: <hair, clothing, props, posture, facial read>
Constraints: <must keep / must avoid>
Avoid: <negative constraints>
```

## Presenter Prompt Example

```text
Use case: narrative presenter portrait
Asset type: interruption modal portrait
Primary request: create a recurring narrative portrait for the guild assistant
Subject: competent office assistant in a modern supernatural labor guild, late 20s to 30s, dry and composed, visibly used to chaos
Style/medium: polished manhwa-inspired dungeon-fantasy portrait illustration with grounded NYC workplace styling
Composition/framing: waist-up, 3/4 view, centered, readable at small modal size
Lighting/mood: controlled indoor light, calm but serious, slight cinematic contrast
Background: plain warm-white background, no scene detail, designed for faux-cutout presentation on a dark modal panel
Key details: practical officewear, clipboard or folder optional, clear facial silhouette, intelligent and slightly tired expression
Constraints: single character only, no text, no logos, no cluttered props, no dramatic action pose
Avoid: generic anime school-uniform styling, neon overload, exaggerated armor, messy background, extra people
```

## Iteration Policy

Iterate with one change at a time:

- make the expression more concerned
- keep the same face, reduce smile
- keep everything else, darken jacket
- keep the same framing, remove extra prop

Do not rewrite the whole prompt every round unless the base direction is wrong.

## Repository Use

When a plan or asset family depends on raster generation, reference this file explicitly.

Current planned users:

- `docs/plans/narrative-character-system-plan.md`

Future likely users:

- prestige portrait work
- S-rank hero assets
- future raster concept families that need consistent prompting discipline
