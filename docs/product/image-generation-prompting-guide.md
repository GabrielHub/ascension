# Image Generation Prompting Guide

Repo-specific guide for raster image generation workflows. Use this whenever generated images are part of the approved production path.

This guide is adapted from the OpenAI image generation prompting guide and extended with project-specific rules for *Hazard-Pay: Dungeon Management*'s tone, consistency, and asset-family boundaries.

Source reference:

- [OpenAI Cookbook: Image Generation Models Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)

## Purpose

Use this guide when generating raster images for:

- narrative presenter portraits
- rival leader portraits and insignia
- unique operator portraits (with glowing border treatment)
- unique weapon portraits (with their own glowing border treatment)
- HQ room raster backdrops
- raid backdrop images (per dungeon, revealed by exploration)
- regular operator portraits (AI-generated at content-authoring time)

Do **not** use this guide to replace:

- chibi token assembly (composed from operator parts, not whole-image generated)
- vector/logo/icon work that belongs in code-native or SVG pipelines

## Model and Quality Defaults

- Default model: `gpt-image-2`. Use it for all new portrait, hero, and concept work.
- Treat `gpt-image-1.5` and `gpt-image-1` as legacy. Only retain those calls during a documented migration; retune prompts after comparing output, latency, and retry rate against `gpt-image-2`.
- `gpt-image-2` does not support `input_fidelity`. The `input_fidelity` parameter only applies to the legacy `1.5` and `1` models.
- Quality settings:
  - `low` — high-volume exploration, thumbnails, throwaway iteration.
  - `medium` — balanced default for most working passes.
  - `high` — required for portrait approvals, identity-sensitive edits, dense in-image text, and any asset that will ship.
- Resolution rules for `gpt-image-2`:
  - both edges must be a multiple of 16
  - aspect ratio at most 3:1
  - total pixels between 655,360 and 8,294,400
  - max edge length below 3840px
  - treat anything above `2560x1440` (2K) as experimental
  - presenter portrait canvas stays in the `1024x1536` family
- For batch exploration use `n=4` to compare variants.

## Core Prompting Rules

Write prompts in a consistent order:

1. **Background / scene** — where the image lives
2. **Subject** — who or what
3. **Key details** — clothing, materials, props, posture, expression
4. **Composition and framing** — viewpoint, layout, scale
5. **Lighting and mood** — light quality, atmosphere, emotional tone
6. **Constraints** — what to keep, what to avoid, what must not appear

Pick the format that is easiest to maintain. Labeled fields, short paragraphs, JSON-like blocks, and tag-style prompts all work — readability beats clever syntax. Iterate with one change per round instead of overloading the first prompt.

## Specificity And Quality Cues

- Be concrete about materials, shapes, textures, and visual medium (photo, watercolor, 3D render, webtoon line art).
- For photorealism, include the word **photorealistic** directly. Phrases like "real photograph", "taken on a real camera", "professional photography", and "iPhone photo" also engage the photoreal mode.
- Camera and lens specs are interpreted loosely. Use them for general look and composition, not for engineering control.
- Add quality levers only when they help the brief — for example *film grain*, *textured brushstrokes*, *macro detail*, *worn material*, *visible skin texture*. Do not stack them.
- Avoid words that imply staging or studio polish when you want lived-in realism.

## Composition Guidance

- Specify framing and viewpoint (close-up, full-body, wide, top-down) and angle (eye-level, low-angle, slight 3/4).
- Specify lighting and mood (soft diffuse, golden hour, high-contrast, controlled indoor light).
- If layout matters, call out placement explicitly: "subject centered with negative space on either side", "logo top-right", "feet inside frame".
- For wide, cinematic, low-light, rain, or neon scenes, add extra detail about scale, atmosphere, and color so the model has something to ground against.

## People, Pose, And Action

When the subject is a person, describe scale, framing, gaze, and object interaction explicitly:

- "full body visible, feet included"
- "slight 3/4 angle, front-facing to camera"
- "looking at camera, calm and composed"
- "hands holding a slim folder at hip height"
- "weight on back foot, posture relaxed but attentive"

These cues drive proportion, pose geometry, and gaze alignment. Vague pose language is the most common cause of awkward portraits.

## Constraints And Preservation

State exclusions and invariants explicitly. Examples:

- "no watermark"
- "no readable text in image"
- "no logos or trademarks"
- "preserve identity, hair, costume, and framing"

For edits, use the pattern:

> "Change only X. Keep everything else the same."

Repeat the preserve list on every iteration. Drift compounds across rounds, and reasserting what must stay fixed is the cheapest way to keep a family coherent. For surgical edits, also state that saturation, contrast, layout, camera angle, and surrounding objects must not change.

## Text In Images

- Put literal text in **quotes** or **ALL CAPS**.
- Specify typography as a constraint: font style, size, color, placement.
- Spell tricky words letter-by-letter to improve character accuracy.
- Use `quality="high"` whenever the image contains small text, dense info panels, or multi-font layouts.

For Hazard-Pay portraits, the default is **no readable text in image** — badges and folders should read graphically, not literally.

## Multi-Image Inputs

When attaching reference images, address each one by index and role in the prompt text:

- "Image 1: style anchor — apply its line, shading, and color discipline."
- "Image 2: cast anchor — keep the subject's face, hair, and costume identical."

Describe the interaction explicitly: "apply Image 1's style to a new portrait of the subject from Image 2", "transplant the prop from Image 1 onto the figure in Image 2".

When refs are present, strip descriptive style adjectives from the prompt — they fight the reference. Keep identity, framing, and constraints in prose.

## Iteration Strategy

- Start from a clean base prompt and refine with single-change follow-ups.
- Examples: "make lighting warmer", "remove the extra prop", "tighten the jaw line", "restore the previous hair shape".
- Use phrases like "same style as before" or "the subject" to leverage context, but re-specify any critical detail that begins to drift.
- Do not rewrite the whole prompt every round unless the base direction is wrong.

## Visual Direction

The game's raster character art uses a single locked visual language: **modern Korean action-webtoon portrait art** with grounded NYC supernatural-labor styling. This is the style contract for the shipped presenter roster and for any future recurring raster character family. Treat it as a hard spec, not a mood board.

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

## Reference-Image Workflow For Recurring Characters

Recurring presenter and hero portraits use a reference workflow that preserves both style and cast consistency across expressions. Address each reference by index in the prompt.

1. **Image 1 — style anchor.** An approved external style board or approved project example of the locked style (linework, shading, color, character structure). Carries the visual language. Do not re-describe the style in prompt text when Image 1 is present.
2. **Image 2 — cast anchor.** Use an approved project portrait only after the family has a valid neutral master. On a fresh family reset, skip stale legacy portraits and let the first approved neutral become the cast anchor.
3. **Generate `neutral` first.** Prompt text does identity work (who, age, ethnicity, costume, composition, constraints). Image 1 carries style; Image 2 carries cast continuity when one exists.
4. **Approve the neutral** before generating other expressions.
5. **Generate `concerned` / `serious` / `amused`** using the approved neutral as the cast reference. Use the edit pattern: "Change only the expression and minor posture. Keep everything else the same." Repeat the preserve list every round.
6. **Record** the winning prompt and preserve list in the character's `PresenterTemplate`.
7. **Author the in-world chibi token.** Every presenter must ship with a hand-authored chibi SVG at `/data/presenters/{role}/chibi.svg`, wired through `PresenterTemplate.chibiUrl`. The chibi follows the operator marker style (32×40 viewBox, matching line weights and head proportions) and keys off one or two unmistakable silhouette cues from the approved neutral so the presenter reads as themselves at token size next to operator chibis. Full-body portraits are reserved for narrative modals; the world view always uses the chibi.

### Avoid over-prompting style when refs are present

When Image 1 is carrying the style:

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
- generate at `quality="high"` for approved deliveries

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
4. generate variants by preserving the approved master ("change only X, keep everything else the same")
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
- keep `background="opaque"` on the API call; run a downstream background-removal step if a true cutout is needed
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
- tone fit with the locked visual direction

## Prompt Template

Use this structure as a default, in this order:

```text
Use case: <asset family>
Asset type: <where it will appear>
Background / scene: <plain warm-white / other controlled background>
Subject: <who or what — identity, age, ethnicity, attitude>
Key details: <hair, clothing, props, posture, facial read>
Composition / framing: <viewpoint, scale, gaze, layout>
Lighting / mood: <light quality, emotional tone>
Style / medium: <locked presenter house style — or "carried by Image 1">
Constraints: <must keep / must avoid>
References: <Image 1: style anchor; Image 2: cast anchor (when present)>
```

## Presenter Prompt Example

The example below assumes Image 1 (style anchor) is attached. If the family already has an approved neutral, attach that as Image 2. Style adjectives are deliberately stripped — style is carried by the reference image.

```text
Use case: narrative presenter portrait
Asset type: interruption modal portrait
Background / scene: plain warm-white background, no scene detail, designed for faux-cutout presentation on a dark portrait panel
Subject: competent office assistant in a modern supernatural labor guild, late 20s to early 30s, Afro-Latina, dry and composed, visibly used to chaos
Key details: textured dark curls pinned back, tailored charcoal blouse with rolled sleeves, fitted slacks, practical heels, worn lanyard badge, slim black folder, intelligent and slightly tired expression
Composition / framing: full-body standing portrait, centered in the shipped presenter-roster portrait canvas (~2:3 / 1024x1536), slight 3/4 angle, feet visible, readable at interruption-modal size
Lighting / mood: controlled indoor light, calm cinematic contrast, practical rather than glamorous
Style / medium: carried by Image 1; do not add further style adjectives
Constraints: single character only, no readable text in image, no logos, no clutter, no dramatic action pose, no armor; preserve identity, hair, costume, and framing across expressions
References: Image 1 — style anchor (linework, shading, color discipline)
```

### Expression Variant Edit Example

Once a neutral is approved, generate variants with a surgical edit prompt. Reattach the approved neutral as the cast reference.

```text
Change only the expression and minor posture from the reference image.
Make the expression concerned: tighter brow, slight frown, eyes still on camera.
Keep everything else the same: face, hair, costume, framing, lighting, background, props.
No new elements. No text. No logo. No camera angle change.
References: Image 1 — style anchor; Image 2 — approved neutral master (cast anchor)
```

## Iteration Policy

Iterate with one change at a time:

- "make the expression more concerned, keep everything else the same"
- "keep the same face, reduce smile"
- "keep everything else, darken the jacket"
- "keep the same framing, remove the extra prop"

Do not rewrite the whole prompt every round unless the base direction is wrong. If drift creeps in, restate the preserve list verbatim before describing the next change.

## Repository Use

When a plan or asset family depends on raster generation, reference this file explicitly.

Current planned users:

- `docs/plans/narrative-character-system-plan.md`

Future likely users:

- prestige portrait work
- Unique (`U`) hero assets
- future raster concept families that need consistent prompting discipline
