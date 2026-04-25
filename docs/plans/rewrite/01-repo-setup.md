# 01. Repo Setup

Status: not started
Plan ID: rewrite/repo-setup
Implementation order: 01
Depends on: none

## Scope

Create the new Hazard-Pay repo and install the minimum runnable web shell.

Owns:

- New repo folder and package setup.
- Vite Plus, React Router, Tailwind v4, TypeScript, Vitest.
- ECS library reuse decision and install.
- Browser-only save storage scaffolding.
- Copying the reviewed `docs/` handoff into the new repo.
- Porting applicable `AGENTS.md` and `CLAUDE.md` rules from [New Repo Agent Guidance Draft](../../new-repo-agent-guidance.md).

Does not own:

- Gameplay feature implementation beyond a smoke-test shell.
- Tauri, desktop saves, or desktop packaging.
- Ascension save migration.

## Checklist

- [ ] Create the new repo folder outside this repo.
- [ ] Initialize the Vite Plus web app with React Router and TypeScript.
- [ ] Add Tailwind v4 and the minimum project CSS variables needed by later UI work.
- [ ] Install the ECS library unless a concrete blocker is documented.
- [ ] Add browser-only save scaffolding with empty-slot load/save smoke coverage.
- [ ] Copy the reviewed `docs/` folder into the new repo.
- [ ] Create new repo `AGENTS.md` and `CLAUDE.md` from `docs/new-repo-agent-guidance.md`.
- [ ] Add a minimal app route that proves React Router is shell-only.
- [ ] Add a basic `vp check`, `vp test`, and `vp build` path.

## Acceptance Criteria

- [ ] `vp install` succeeds in the new repo.
- [ ] `vp dev` runs a visible empty Hazard-Pay shell.
- [ ] `vp check`, `vp test`, and `vp build` pass.
- [ ] No Tauri, desktop save, file-backed save, or old Ascension migration code exists.
- [ ] Docs links in the copied handoff resolve inside the new repo.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer confirms the repo is greenfield and did not copy old app code as implementation authority.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
