# Playtest Regression Findings

Living document for the post-remediation regression pass.

Use this file during the run, not after the fact. Add one dated section per playtest session.

## Run Template

Copy this section for each new run.

### Run: YYYY-MM-DD HH:MM local

Environment:

- branch:
- build/test status before run:
- session type:
- dev menu used:
- playwright artifacts:

Areas covered:

- start screen and session entry:
- persistence:
- HQ rooms and progression:
- recruitment, visitors, and staffing:
- economy, inventory, and market:
- raid loop:
- social, morale, and fallout:
- event log and feedback:
- world presentation:
- critical UX review:

#### Fixed And Verified In Run

- issue:
  - fix summary:
  - verification:

#### Blocked Or Deferred

- issue:
  - severity:
  - reproduction:
  - blocker or reason not fixed:
  - likely owner/subsystem:
  - recommended next action:

#### Design And UX Critique

- observation:
  - player impact:
  - likely category:
  - recommended follow-up:

#### Untested Or Inconclusive

- area:
  - reason:
  - what is needed next:

#### Overall Assessment

- what feels materially better:
- what still feels weak or confusing:
- what most needs a new remediation pass:

---

### Run: 2026-03-22 18:00 local

Environment:

- branch: worktree-agent-af43a069
- build/test status before run: vp check pass, 285 tests pass, vp build pass
- session type: load (Slot 1), new (Slot 2), sandbox, SVG tools
- dev menu used: no (used +1h top-bar button only)
- playwright artifacts: playwright/screenshots/01-start-screen.png, 02-new-game-slot2.png, 03-hq-world-midgame.png

Areas covered:

- start screen and session entry: passed (new, load, delete with confirm, sandbox, SVG tools, return-to-home)
- persistence: passed after fix (auto-save was completely broken; fixed and verified)
- HQ rooms and progression: passed (room focus, activate/deactivate, building upgrade purchase, room detail panel)
- recruitment, visitors, and staffing: passed (visitor arrive, pass removes cleanly, multi-role hire menu, staff hire)
- economy, inventory, and market: passed (market buy, sell, inventory stacks update, unequip, loadout reason text)
- raid loop: passed (opportunity generation, autonomous launch, active raid presentation, return with rewards, mixed/success outcomes, history logging, raid state transitions HUNT/RET/LOOT)
- social, morale, and fallout: passed (injuries, recovering, critical morale "!" badge, recurring teams form, room culture surfaces, bond display)
- event log and feedback: passed with issues (timestamps readable, clickable events navigate correctly, daily ledger fires, but "Unknown" name bug and morale spam)
- world presentation: passed (operator tokens placed, labels readable, isometric view clean)
- critical UX review: completed (see below)

#### Fixed And Verified In Run

- issue: Auto-save silently fails on every tick — no game state is ever persisted during gameplay
  - fix summary: `save/codec.ts` `parseRecurringTeamSnapshot` called `expectString()` on `damageReason`, which rejects empty strings. When a recurring team has `damaged: false`, `damageReason` is legitimately `""`. Changed to accept empty string and undefined, defaulting to `""`. The error was silently caught in `schedulePersist`'s try/catch with no console output and no UI indication.
  - verification: After fix, IDB tick advanced from 147 to 168+ during gameplay. Full save/load round-trip verified: exited at D1 ~5:00 PM, reloaded at D1 ~5:09 PM with active raid state, operator injuries, visitor, and staff all correctly restored. vp check pass, 285 tests pass.

#### Blocked Or Deferred

- issue: "Unknown morale critically low — may leave" events show "Unknown" instead of operator name
  - severity: medium — confusing to players, masks which operator is at risk
  - reproduction: play until morale events fire (typically by D1 evening); 3 occurrences observed at day-1 21:56 with "Unknown" instead of real names
  - blocker or reason not fixed: likely a lookup failure in the event generation code where the operator entity ID is not resolving to a display name; needs investigation of the event emission path in the morale system
  - likely owner/subsystem: sim/systems/morale.ts or the event formatting layer
  - recommended next action: grep for the "Unknown" fallback string and trace which morale event path fails to resolve the operator name
- issue: Recruit button at full operator capacity (6/6) is clickable but silently does nothing
  - severity: low — no gameplay consequence, but confusing
  - reproduction: reach 6/6 operators, click Recruit on any visitor
  - blocker or reason not fixed: UX polish, not a blocking bug
  - likely owner/subsystem: app/ui (roster panel or the dispatch guard)
  - recommended next action: either disable the Recruit button when at capacity or show a brief feedback message

#### Design And UX Critique

- observation: Morale warning events are very spammy — 8+ low/critical morale warnings in a short window
  - player impact: the event log fills with repetitive warnings that dilute more important events like raid returns or economy changes; player learns to ignore the log
  - likely category: systems/pacing
  - recommended follow-up: consider throttling or batching morale warnings (e.g., one "multiple operators have low morale" summary per hour instead of individual events for each operator each time)
- observation: Persistence errors are completely invisible to the player
  - player impact: the game appeared to work normally but was never saving; a player who quit and returned would lose all progress with no warning
  - likely category: UI/systems
  - recommended follow-up: surface persistence error state in the footer or a toast; even a small red indicator would prevent silent data loss
- observation: The game feels like a management sim that rewards patient observation, but the current pacing makes the early game feel passive
  - player impact: the first day is mostly watching ticks pass, clicking +1h, and waiting for raids to auto-launch and return; the player's agency is limited to pass/recruit and buy/sell until the economy grows
  - likely category: pacing/design
  - recommended follow-up: consider whether the early game needs more player-initiated actions or clearer short-term goals
- observation: Staff "off_shift" status in the evening creates a small clarity gap
  - player impact: players may not understand why staff show "off_shift" or what it means for room operations
  - likely category: copy/UI
  - recommended follow-up: minor — consider a tooltip or help text explaining shift schedules

#### Untested Or Inconclusive

- area: room placement from empty slots
  - reason: building upgrades that add room slots were purchased but no empty room slot was available to test placement in this session (all 4 starting rooms were already placed)
  - what is needed next: advance further or start a fresh session with room-slot upgrades already applied, then test placing a new room
- area: boss-defeat and contract-loss end states
  - reason: these require extended play or specific save states to reach; the contract was at 33% explored by the end of this session
  - what is needed next: use dev menu to fast-forward or set up a save state near contract completion
- area: death/departure fallout and persistence
  - reason: Milo Hart was at critical morale (9) and quit risk but did not actually depart during this session
  - what is needed next: continue playing or use dev menu to push morale to trigger departure, then verify roster/team/save handling
- area: start-screen link click navigation
  - reason: Playwright click on "new Slot 2" link did not navigate (URL stayed at /); direct navigation worked fine; likely a Playwright/SPA interaction issue rather than a real bug
  - what is needed next: verify manually in a real browser that slot links navigate correctly

#### Overall Assessment

- what feels materially better: the full game loop is functional end-to-end — start, play, save, load, raids, economy, staffing, morale all connect and produce interesting state. The operator detail panel with morale/loyalty/fatigue/bonds is excellent and gives the player real information to act on. Room culture and recurring teams add depth. The isometric world view is atmospheric and readable.
- what still feels weak or confusing: the auto-save bug was a critical blocker that was entirely silent — no player would know their game wasn't saving. Morale event spam dilutes the event log. The early game pacing is passive. The "Unknown" name bug in morale events undermines trust in the feedback system.
- what most needs a new remediation pass: (1) the "Unknown" morale event name bug, (2) persistence error visibility so silent save failures never happen again, (3) morale event throttling to keep the event log useful.
