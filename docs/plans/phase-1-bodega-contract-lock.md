# Phase 1 Contract Lock

This is the required serial step before wider parallel work.

The goal is to lock the contracts that would otherwise create merge churn across runtime, save, and design tracks.

## Already Locked By The Current Repo

### Existing runtime owners

- singleton owners: guild, time, building
- current component names: `GuildState`, `WorldTimeState`, `BuildingAuthority`, `RoomInstance`, `Morale`, `Loyalty`, `Renderable`
- current command name: `sim/tick`

### Existing authored ids

- buildings: `building/bodega`, `building/union_hall`
- rooms: `room/front_desk:tier_1`, `room/recruitment_space:tier_1`, `room/infirmary:tier_1`
- upgrades: `upgrade/building/bodega:frontage`, `upgrade/building/bodega:annex`
- missions: `mission/clearance`, `mission/containment`, `mission/extraction`
- save slots: `slot/1`, `slot/2`, `slot/3`

### Existing save fields

- slot metadata: `guildName`, `createdAt`, `lastPlayedAt`
- world owners: `guild`, `time`, `building`, `rooms`, `activeRaidPackets`, `raidSummaries`, `appliedUpgradeIds`
- building fields: `activeBuildingId`, `activeBuildingTier`, `roomSlotCount`, `operatorSlotCount`

## Must Be Locked Before Parallel Phase 1 Work

### 1. New runtime component names

Manager must approve the first-pass names for new runtime owners before multiple agents start adding them.

Required areas:

- visitors
- operators
- staff
- needs
- schedule state
- assignment state
- raid participation
- injury state
- event state

### 2. Template id set for the first playable slice

Manager must approve the exact initial Phase 1 ids for:

- bodega room families and tiers beyond the current shell
- operator- and staffing-related authored definitions if they become templates
- event ids for the first hardcoded event pool
- any new upgrade ids needed for the first playable loop

### 3. Command names

Manager must lock the typed command surface before UI and runtime work proceed in parallel.

Required command areas:

- room placement or activation
- room upgrade purchase
- recruitment accept or reject
- staff hire or assignment
- raid dispatch
- time or tick stepping rules beyond the current shell tick

### 4. Save fields

Manager must lock durable field names for any new authoritative state, especially:

- roster and operator identity
- staff state
- visitor or recruitment-pool state
- active raid packet shape
- raid summary per-operator outcomes
- injury and recovery state
- appearance references that must survive reload

### 5. Validation expectations

These must be explicit before agents split work:

- registry validation rejects unknown ids and bad references
- save loads fail clearly on malformed or incompatible payloads
- migrations only transform stored data
- UI does not own gameplay rules
- render and SVG code do not become hidden rule engines

## Deliverable

Parallel work starts only after the manager publishes a short lock note covering:

- approved component names
- approved ids and id prefixes
- approved command names
- approved save fields
- required validation and test gates
