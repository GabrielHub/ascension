# Image Generation Prompting Guide

Repo-specific guide for raster image generation workflows. Use this whenever generated images are part of the approved production path.

This guide is adapted from the OpenAI `gpt-image-1.5` prompting guide and extended with project-specific rules for Ascension's tone, consistency, and asset-family boundaries.

Source reference:

- [OpenAI Cookbook: GPT-image-1.5 Prompting Guide](https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/multimodal/image-gen-1.5-prompting_guide.ipynb)

## Purpose

Use this guide when generating raster images for:

- narrative presenter portraits
- future prestige-tier portraits or promo art
- future Unique (`U`) item hero renders
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

Ascension's raster character art uses a single locked visual language: **modern Korean action-webtoon portrait art** with grounded NYC supernatural-labor styling. This is the style contract for the shipped presenter roster and for any future recurring raster character family. Treat it as a hard spec, not a mood board.

In prompts and checked-in docs, describe the style descriptively. Do not name external IP — informal reference to specific titles (e.g. Solo Leveling) is acceptable in internal discussion only, so the asset family stays legally and creatively its own.

### Linework

- Crisp, confident, deliberate outlines. Never sketchy. Never painterly.
- Outline weight varies slightly to carry form, but stays clean and decisive.
- Edges around hair, shoulders, and fabric breaks are intentional — no soft airbrush halos.

### Shading

- Cel-adjacent: grouped shadow shapes with controlled gradient edges, not airbrushed wash.
- Highlights are specific and restrained, never glossy.
- Strong value range — darks read dark; midtones do most of the form work.
- Shadow direction is consistent across the figure; no conflicting light sources.

### Color

- Muted cinematic jewel tones: deep reds, navy, teal, charcoal, cream, warm neutrals.
- Avoid saturated anime primaries, pastel hospital/idol palettes, and neon fantasy washes.
- Skin tones are warm and specific to the character's ethnicity, not pasteurized.
- Hair color is stylized but grounded — no neon.

### Character structure

- Tall, elongated webtoon proportions. Slim, athletic, not chibi.
- Angular faces, sharp jawlines, defined brows.
- Eyes are the most-rendered feature: specific iris detail, confident brow, eyelash shape, inner-corner highlight.
- Hair rendered with individual strand suggestion and subtle motion texture — not solid color blocks.

### Clothing language

- Grounded modern workwear with personality. Fabric has some flow — coats drape, hair lifts slightly — but the subject is standing, not posing.
- Role-appropriate silhouettes. A presenter must read as their feature domain from silhouette alone.
- No fantasy armor, no sci-fi costume, no nightclub neon, no idol glam, no frilly gacha fantasy-dress unless explicitly native to the character.
- Supernatural accents are allowed only where they belong to the character's canon; default presenters are grounded.

### Composition and framing

- Full-body standing portrait in the shipped presenter-roster portrait canvas, approximately `2:3` (`1024x1536` / `1023x1537` family).
- Slight 3/4 angle, front-facing to the camera.
- Readable at interruption-modal scale.
- Subject centered; negative space on either side for UI integration.
- No dramatic action pose; the subject is present, not performing.

### Background

- Plain warm-white or off-white.
- No scene detail.
- Strong edge contrast between character silhouette and background.
- Avoid white-on-white costume choices that destroy separation.

### Style anti-patterns (automatic reject)

- Generic anime school-uniform aesthetic.
- Kawaii, chibi, or super-deformed proportions.
- Gacha idol-glam: excessive jewelry, heart motifs, idol stage costuming.
- Photorealistic rendering.
- Painterly or watercolor rendering.
- Neon or piled-on glow effects on the character.
- Costume or rendering that reads as a different game's character sheet.

### Presenter house-style lock

The presenter family must read as if one artist drew the entire figure with one rendering discipline.

- Keep line, shadow, prop, hair, and shoe detail at the same stylization level across the whole image.
- Use grouped shadow masses and selective highlights; do not let one item drift into glossy digital rendering.
- Overwork and fatigue should come from silhouette, styling choices, posture, and restrained facial cues, not wrinkle spam or texture noise.
- Grounded civilian styling can still be fashion-forward, but it must read as lived-in workwear rather than combat gear or editorial glam.
- Comfort-first contrast is valid when it supports the character brief, such as polished upper-body officewear paired with simpler worn shoes.
- Props should be graphic and readable at a glance. Favor clean badge shapes and clear notebook or folder silhouettes over tiny clutter.
- If shoes, hardware, folder edges, or hair shine start looking more rendered than the clothing and face, simplify them.

## Reference-Image Workflow for Recurring Characters

Recurring presenter and hero portraits use a reference workflow that preserves both style and cast consistency across expressions.

1. **Ref 1 — style anchor.** An approved external style board or approved project example of the locked style (linework, shading, color, character structure). Carries the visual language. Do not re-describe the style in prompt text when Ref 1 is present.
2. **Ref 2 — cast anchor.** Use an approved project portrait only after the family has a valid neutral master. On a fresh family reset, skip stale legacy portraits and let the first approved neutral become the cast anchor.
3. **Generate `neutral` first.** Prompt text does identity work (who, age, ethnicity, costume, composition, constraints). Ref 1 does style; Ref 2 does cast continuity when one exists.
4. **Approve the neutral** before generating other expressions.
5. **Generate `concerned` / `serious` / `amused`** using the approved neutral as the reference image. Keep everything on the preserve list identical across expressions. Only the expression and minor posture change.
6. **Record** the winning prompt and preserve list in the character's `PresenterTemplate`.

### Avoid over-prompting style when refs are present

When Ref 1 is carrying the style:

- Strip descriptive style adjectives from the prompt text (they fight the reference).
- Keep composition, framing, background, and negative constraints — those are framing rules, not style.
- Keep identity details (ethnicity, age, costume, expression) — those must live in the prompt.

## Asset-Family Defaults

### Narrative Presenter Portraits

Use for:

- assistant
- cook
- bartender
- quartermaster
- doctor
- compliance officer
- future recurring narrative presenters

Defaults:

- single character only
- full-body standing portrait in the shipped presenter-roster portrait canvas, approximately `2:3` (`1024x1536` / `1023x1537`)
- slight 3/4 angle, front-facing to camera
- plain warm-white or off-white background
- no detailed scene background
- expression readable at modal size
- clothing and styling must communicate role immediately
- the whole figure must hold one consistent artist-hand; reject any localized rendering drift

### Prestige / Future Hero Assets

Use for:

- Unique (`U`) operator hero portraits
- Unique (`U`) gear hero renders
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
Style/medium: <locked presenter house style / other>
Composition/framing: <full-body presenter-roster canvas (~2:3 / 1024x1536), slight 3/4, centered, etc.>
Lighting/mood: <lighting and emotional tone>
Background: <plain warm-white / other controlled background>
Key details: <hair, clothing, props, posture, facial read>
Constraints: <must keep / must avoid>
Avoid: <negative constraints>
```

## Presenter Prompt Example

Prompt template below assumes Ref 1 (style anchor) is attached. If the family already has an approved neutral, attach that as Ref 2. Style adjectives are deliberately stripped — style is carried by the reference image.

```text
Use case: narrative presenter portrait
Asset type: interruption modal portrait
Style/medium: carried by the style reference image; do not add further style adjectives
Primary request: recurring narrative portrait for the guild assistant
Subject: competent office assistant in a modern supernatural labor guild, late 20s to early 30s, Afro-Latina, dry and composed, visibly used to chaos
Composition/framing: full-body standing portrait, centered in the shipped presenter-roster portrait canvas (~2:3 / 1024x1536), slight 3/4 angle, readable at interruption-modal size
Lighting/mood: controlled indoor light, calm cinematic contrast, practical rather than glamorous
Background: plain warm-white background, no scene detail, designed for faux-cutout presentation on a dark portrait panel
Key details: textured dark curls pinned back, tailored charcoal blouse with rolled sleeves, fitted slacks, practical heels, worn lanyard badge, slim black folder, intelligent and slightly tired expression
Constraints: single character only, no readable text in image, no logos, no clutter, no dramatic action pose, no armor
Avoid: generic anime school styling, neon overload, fantasy armor, messy background, extra people
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
- Unique (`U`) hero assets
- future raster concept families that need consistent prompting discipline
