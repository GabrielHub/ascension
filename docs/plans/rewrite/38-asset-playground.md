# 38. Asset Playground

Status: not started
Plan ID: rewrite/asset-playground
Implementation order: 38
Depends on: rewrite/asset-pipeline

## Scope

Build the general asset preview tool that replaces the SVG-only playground.

Owns:

- Previewing image assets, SVG bosses, weapon icons, portraits, chibi compositions, audio cues, and VFX.
- Registry-driven asset browsing.
- Side-by-side rank/tier comparisons.
- Optional AI prompt experimentation integration if low-cost.

Does not own:

- Asset generation approval.
- Scene placement metadata.
- Runtime gameplay UI.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Image Generation Prompting Guide](../../product/image-generation-prompting-guide.md), and [Visual Effects Pool](../../product/visual-effects-pool.md).
- [ ] Implement dev-only asset browser from registry data.
- [ ] Preview every asset family listed in the asset pipeline contract.
- [ ] Support chibi composition from approved parts.
- [ ] Support audio cue playback and VFX preview.
- [ ] Add comparison views for rank/tier escalation.
- [ ] Add validation display for missing files and manifest errors.

## Acceptance Criteria

- [ ] Playground is not SVG-only.
- [ ] Authors can verify transparency, framing, registry paths, and rank escalation.
- [ ] Runtime code does not depend on playground-only state.
- [ ] Tool is dev-only.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks asset family coverage and dev-only gating.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
