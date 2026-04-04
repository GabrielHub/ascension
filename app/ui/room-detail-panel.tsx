import type {
  GameCallbacks,
  PrepRecipeViewModel,
  RoomCultureViewModel,
  RoomViewModel,
  UpgradeViewModel,
} from "./view-models";
import { Tooltip } from "./_tooltip";
import {
  getCultureSummaryLabel,
  getEffectTypeMeta,
  getRequirementTypeMeta,
  getSignalMeta,
  getTagMeta,
  getToneMeta,
} from "./_glossary";
import { formatSlotLabel, getRoomStateLabel } from "lib/hq-room-state";
import { getRoomProgressRatio, getRoomStatusTip } from "./bodega-floor";
import { progressBarFillClass } from "./styles";

interface RoomDetailPanelProps {
  guildName?: string;
  room: RoomViewModel | null;
  buildingUpgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  callbacks: GameCallbacks;
  roomCulture?: RoomCultureViewModel | null;
}

const ROOM_REASON_TAG = {
  recruitment: "ops:recruitment",
  intel: "ops:intel",
  staging: "ops:staging",
  recovery: "room:recovery",
  social: "room:social",
  training: "room:training",
  staffing: "room:staffing",
  operations: "room:operations",
} as const;

function hasRoomReasonTag(
  room: RoomViewModel,
  tag: (typeof ROOM_REASON_TAG)[keyof typeof ROOM_REASON_TAG],
): boolean {
  return room.tags.includes(tag);
}

function UpgradeCard({
  upgrade,
  onPurchase,
}: {
  upgrade: UpgradeViewModel;
  onPurchase: () => void;
}) {
  return (
    <div className={`glass-card-inset p-3 ${upgrade.isApplied ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-medium text-silver-bright">{upgrade.name}</h4>
        {upgrade.isApplied && <span className="badge badge-gold">Applied</span>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-silver/60">{upgrade.description}</p>

      {upgrade.requirements.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">
            Requires
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {upgrade.requirements.map((req) => (
              <Tooltip
                key={req.type + req.label}
                content={
                  getRequirementTypeMeta(req.type).tip || getRequirementTypeMeta(req.type).label
                }
                side="top"
              >
                <span className="rounded bg-[rgba(6,6,8,0.5)] px-1.5 py-0.5 text-xs text-silver/60">
                  {req.label}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {upgrade.effects.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">
            Effects
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {upgrade.effects.map((eff) => (
              <Tooltip
                key={eff.type + eff.label}
                content={getEffectTypeMeta(eff.type).tip || getEffectTypeMeta(eff.type).label}
                side="top"
              >
                <span className="rounded bg-[rgba(200,168,76,0.06)] px-1.5 py-0.5 text-xs text-gold">
                  {eff.label}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {!upgrade.isApplied && (
        <button
          type="button"
          disabled={!upgrade.isAffordable}
          className="btn-primary mt-3 w-full text-xs"
          onClick={onPurchase}
        >
          {upgrade.isAffordable ? "Purchase" : "Not affordable"}
        </button>
      )}
    </div>
  );
}

function formatFootprintLabel(footprint: {
  col: number;
  row: number;
  cols: number;
  rows: number;
}): string {
  return `${footprint.cols}x${footprint.rows} @ ${footprint.col},${footprint.row}`;
}

function getRoomStaffingPercent(room: RoomViewModel): number {
  return getRoomProgressRatio(room) * 100;
}

function getRoomWhyItMatters(room: RoomViewModel, guildName: string): readonly string[] {
  if (room.templateId === "room/office:tier_1") {
    return [
      "Turns Porter's contract board into filed dossiers with cleaner risk reads, clearer site traits, and earlier boss names.",
      `Keeps the business side of ${guildName} organized enough that better opportunities stay readable instead of speculative.`,
    ];
  }

  if (room.templateId === "room/briefing_room:tier_1") {
    return [
      "Adds a real secured-contract briefing layer so active jobs expose site context before teams deploy.",
      "Feeds boss prep and launch notes into raids so post-bid planning is visible instead of implied.",
    ];
  }

  if (room.templateId === "room/infirmary:tier_1") {
    return [
      "Cuts injury recovery time and softens the post-raid medical bill so hurt operators return to duty cleaner.",
      "Makes Porter's recovery feel clinical instead of improvised by turning treatment into real upstairs support.",
    ];
  }

  if (room.templateId === "room/break_room:tier_1") {
    return [
      "Adds private decompression away from customers, which steadies morale and loyalty after rough shifts.",
      "Gives stressed operators somewhere to reset that the public floor cannot replace.",
    ];
  }

  if (room.templateId === "room/dock:tier_1") {
    return [
      "Turns the waterfront into real launch throughput by shortening departures and tightening raid staging.",
      "Makes the Waterfront upgrade operational instead of decorative by changing how teams leave the building.",
    ];
  }

  if (room.templateId === "room/deck:tier_1") {
    return [
      "Turns downtime into a waterfront morale reset that hits differently from generic bar noise or public seating.",
      "Gives Porter's a real harbor-side decompression space, so returns feel better than just surviving the shift.",
    ];
  }

  if (room.templateId === "room/floor:tier_1") {
    return [
      "The public dining room keeps regulars coming through the door, which means steady income and a social buffer between operators and the street.",
      `Doubles as low-key recovery space — operators decompress over food without needing a medical room or a private conversation.`,
    ];
  }

  if (room.templateId === "room/bar:tier_1") {
    return [
      "The bar is Porter's recruitment engine. Prospects show up for the atmosphere and leave having met the guild.",
      `Keeps ${guildName}'s public face active so the recruit pipeline does not depend on cold outreach or word of mouth alone.`,
    ];
  }

  if (room.templateId === "room/gym:tier_1") {
    return [
      "The first real training room in the guild's history. Operators build physical readiness between contracts instead of showing up cold.",
      "Training gains feed directly into raid performance — stronger, faster, and more durable operators survive what the bodega crew could not.",
    ];
  }

  if (room.templateId === "room/stockroom:tier_1") {
    return [
      "Proper logistics space means loadouts get staged cleanly and inventory stops disappearing into unorganized piles.",
      `Keeps ${guildName}'s supply chain from bottlenecking growth as the roster and contract volume scale up.`,
    ];
  }

  if (room.templateId === "room/prep_room:tier_1") {
    return [
      "Turns salvaged monster drops into field consumables that give deployed teams a real edge — stat buffs before the fight starts.",
      "The prep room is where Porter's consumable pipeline lives. Without it, loot drops stay raw and teams go out unbuffed.",
    ];
  }

  // ── Bodega rooms ─────────────────────────────────────────────────────
  if (room.templateId === "room/register:tier_1") {
    return [
      "The checkout counter doubles as the intake desk. Contracts, recruits, and daily walk-ins all come through the same register.",
      `Keeps ${guildName}'s administrative pipeline running even when the space is shared with actual customers buying sandwiches.`,
    ];
  }

  if (room.templateId === "room/counter:tier_1") {
    return [
      "The deli counter is where foot traffic turns into recruit prospects. People come in for lunch and leave knowing the guild exists.",
      "Low-key recruitment that works because the bodega is already a neighborhood fixture, not because anyone is pitching.",
    ];
  }

  if (room.templateId === "room/dining_area:tier_1") {
    return [
      "The dining area is recovery, social space, and medical overflow all in one. Operators decompress over food because there is nowhere else.",
      "Every function shares the same folding chairs and fluorescent light. It works, but nothing here is dedicated.",
    ];
  }

  if (room.templateId === "room/supply_closet:tier_1") {
    return [
      "One closet for all the gear, consumables, and paperwork that does not fit behind the counter.",
      `Keeps ${guildName}'s logistics from spilling into the customer-facing floor, barely.`,
    ];
  }

  if (room.templateId === "room/back_office:tier_1") {
    return [
      "A real desk behind a door that closes. Contract details stay private and the filing gets slightly more organized.",
      `Gives ${guildName} an admin space that is not also a lunch counter or a storage shelf.`,
    ];
  }

  if (room.templateId === "room/backstock:tier_1") {
    return [
      "Extra storage that used to be part of the neighboring unit. Gear and supplies finally have room to breathe.",
      "Reduces the bottleneck where everything was crammed into the original supply closet.",
    ];
  }

  if (room.templateId === "room/alley_staging:tier_1") {
    return [
      "The back alley turned into a staging area. Teams assemble and check loadouts before heading out.",
      "Not glamorous, but it is the first space where raid prep is not competing with lunch service.",
    ];
  }

  const reasons: string[] = [];

  if (hasRoomReasonTag(room, ROOM_REASON_TAG.recruitment)) {
    reasons.push(
      "Keeps the recruit pipeline visible by turning walk-in traffic into operator prospects.",
    );
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.intel)) {
    reasons.push("Improves contract reading and administrative control around available work.");
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.staging)) {
    reasons.push("Supports raid prep so deployed teams leave ready instead of improvised.");
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.recovery)) {
    reasons.push(
      "Creates space for recovery pressure, morale resets, and post-raid decompression.",
    );
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.social)) {
    reasons.push("Supports morale and relationship stability between raids.");
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.training)) {
    reasons.push(
      "Builds bounded physical readiness for raids through drills, not attunement changes or rank ups.",
    );
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.staffing)) {
    reasons.push(
      "Protects inventory and staffing throughput so logistics does not bottleneck growth.",
    );
  }
  if (hasRoomReasonTag(room, ROOM_REASON_TAG.operations)) {
    reasons.push(`Handles the business side of ${guildName} so the rest of the loop stays open.`);
  }

  return reasons.slice(0, 2);
}

function PrepRecipeCard({
  recipe,
  onProduce,
}: {
  recipe: PrepRecipeViewModel;
  onProduce: () => void;
}) {
  return (
    <div className="glass-card-inset p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-medium text-silver-bright">{recipe.name}</h4>
          <p className="mt-0.5 text-sm leading-relaxed text-silver/60">{recipe.description}</p>
        </div>
        <Tooltip content={`+${recipe.outputBuffValue} ${recipe.outputBuffStat} for deployed team`}>
          <span className="badge badge-gold shrink-0">
            +{recipe.outputBuffValue} {recipe.outputBuffStat}
          </span>
        </Tooltip>
      </div>

      <div className="mt-2">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">Inputs</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {recipe.inputs.map((input) => (
            <Tooltip
              key={input.itemId}
              content={`${input.quantityOwned} owned / ${input.quantityRequired} needed`}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  input.isSatisfied
                    ? "bg-[rgba(200,168,76,0.06)] text-gold"
                    : "bg-[rgba(180,60,60,0.08)] text-ember"
                }`}
              >
                {input.quantityRequired}x {input.itemName}
                <span className="ml-1 opacity-60">({input.quantityOwned})</span>
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      {!recipe.isRoomStaffed && (
        <p className="mt-2 text-sm text-ember/80">Requires assigned logistics staff to produce.</p>
      )}

      <button
        type="button"
        disabled={!recipe.canProduce}
        className="btn-primary mt-2 w-full text-xs"
        onClick={onProduce}
      >
        {!recipe.isRoomStaffed
          ? "Needs staff"
          : recipe.canProduce
            ? `Produce ${recipe.outputQuantity}x ${recipe.outputName}`
            : "Missing inputs"}
      </button>
    </div>
  );
}

export function RoomDetailPanel({
  guildName = "the guild",
  room,
  buildingUpgrades,
  roomUpgrades,
  callbacks,
  roomCulture,
}: RoomDetailPanelProps) {
  if (!room) return null;

  const occupancyPct = getRoomStaffingPercent(room);
  const hasUpgrades = buildingUpgrades.length > 0 || roomUpgrades.length > 0;
  const whyItMatters = getRoomWhyItMatters(room, guildName);
  const requiredStaffMeta = room.requiredStaffTag ? getTagMeta(room.requiredStaffTag) : null;
  const training = room.training;

  return (
    <div className="animate-enter">
      {/* Header row: name + badge + description | activate button */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
              {room.name}
            </h3>
            {room.isOperational ? (
              <Tooltip content={getRoomStatusTip(room)}>
                <span className="badge badge-gold">Operational</span>
              </Tooltip>
            ) : room.isActive ? (
              <Tooltip content="Active, but not yet staffed enough to operate">
                <span className="badge badge-slate">Understaffed</span>
              </Tooltip>
            ) : (
              <Tooltip content="Shut down — activate to begin staffing">
                <span className="badge badge-slate">Inactive</span>
              </Tooltip>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver/60">{room.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-silver/60">
            <span className="badge badge-slate">{getRoomStateLabel(room.roomStateId)}</span>
            <span className="badge badge-slate">Floor {room.floorIndex + 1}</span>
            <span className="badge badge-slate">{formatSlotLabel(room.slotId)}</span>
            <Tooltip
              content={`Reserved ${formatFootprintLabel(room.reservedFootprint)}; active ${formatFootprintLabel(room.activeFootprint)}`}
            >
              <span className="badge badge-slate">
                {room.reservedFootprint.cols}x{room.reservedFootprint.rows} /{" "}
                {room.activeFootprint.cols}x{room.activeFootprint.rows}
              </span>
            </Tooltip>
          </div>
        </div>
        <button
          type="button"
          className={`shrink-0 ${room.isActive ? "btn-ghost text-xs" : "btn-primary text-xs"}`}
          onClick={() => callbacks.setRoomActive(room.id, !room.isActive)}
        >
          {room.isActive ? "Deactivate room" : "Activate room"}
        </button>
      </div>

      {/* Body: stats column + upgrades columns */}
      <div className="mt-4 flex gap-6">
        {/* Stats */}
        <div className={`space-y-3 ${hasUpgrades ? "w-56 shrink-0" : "w-full max-w-xs"}`}>
          <div className="grid grid-cols-3 gap-2">
            <Tooltip content="Room tier — higher tiers unlock better upgrades">
              <div className="glass-card-inset p-2 text-center">
                <div className="text-xs uppercase tracking-wider text-gold/70">Tier</div>
                <div className="mt-0.5 text-sm font-medium text-silver-bright">{room.tier}</div>
              </div>
            </Tooltip>
            <Tooltip
              content={
                room.requiredStaffTag
                  ? "Assigned staff / staffing needed for full output"
                  : "This room runs without dedicated staff"
              }
            >
              <div className="glass-card-inset p-2 text-center">
                <div className="text-xs uppercase tracking-wider text-gold/70">
                  {room.requiredStaffTag ? "Staff" : "Type"}
                </div>
                <div className="mt-0.5 text-sm font-medium tabular-nums text-silver-bright">
                  {room.requiredStaffTag
                    ? `${room.assignedStaffCount}/${room.capacity}`
                    : "Passive"}
                </div>
              </div>
            </Tooltip>
            <Tooltip
              content={
                room.requiredStaffTag
                  ? "Staffing level — 100% means fully operational"
                  : "Whether the room is active and able to provide its room benefits"
              }
            >
              <div className="glass-card-inset p-2 text-center">
                <div className="text-xs uppercase tracking-wider text-gold/70">
                  {room.requiredStaffTag ? "Load" : "Status"}
                </div>
                <div className="mt-0.5 text-sm font-medium text-silver-bright">
                  {room.requiredStaffTag
                    ? `${Math.round(occupancyPct)}%`
                    : room.isOperational
                      ? "Online"
                      : room.isActive
                        ? "Opening"
                        : "Offline"}
                </div>
              </div>
            </Tooltip>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
            <div className={progressBarFillClass} style={{ width: `${occupancyPct}%` }} />
          </div>

          <div className="text-xs text-gold/70">
            {room.requiredStaffTag && requiredStaffMeta ? (
              <>
                Requires{" "}
                <Tooltip
                  content={requiredStaffMeta.tip || "Staff role needed to operate this room"}
                  side="top"
                >
                  <span className="text-gold/80">{requiredStaffMeta.label}</span>
                </Tooltip>{" "}
                staff to reach full output.
              </>
            ) : (
              "No dedicated staff required. Activate the room and its benefits become available."
            )}
          </div>

          {whyItMatters.length > 0 && (
            <div className="space-y-1.5 border-t border-[rgba(200,168,76,0.06)] pt-3">
              <h4 className="text-sm font-medium uppercase tracking-[0.12em] text-gold/70">
                Why This Room Matters
              </h4>
              {whyItMatters.map((reason) => (
                <p key={reason} className="text-sm leading-relaxed text-silver/60">
                  {reason}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {room.tags.map((tag) => (
              <Tooltip key={tag} content={getTagMeta(tag).tip}>
                <span className="badge badge-slate">{getTagMeta(tag).label}</span>
              </Tooltip>
            ))}
          </div>

          {roomCulture && (
            <div className="space-y-1.5 border-t border-[rgba(200,168,76,0.06)] pt-3">
              <Tooltip content="Atmosphere shaped by room type, staffing, and events" side="top">
                <h4 className="text-sm font-medium uppercase tracking-[0.12em] text-gold/70">
                  Room Culture
                </h4>
              </Tooltip>
              <div className="glass-card-inset space-y-2 p-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gold/60">Tone</div>
                  <div className="mt-0.5 text-xs text-silver-bright">
                    {getCultureSummaryLabel(roomCulture.summary)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Tooltip content={getToneMeta(roomCulture.tone || "neutral").tip}>
                    <span className="badge badge-slate">
                      {getToneMeta(roomCulture.tone || "neutral").label}
                    </span>
                  </Tooltip>
                  {roomCulture.signals.map((signal) => (
                    <Tooltip key={signal} content={getSignalMeta(signal).tip}>
                      <span className="badge badge-slate">{getSignalMeta(signal).label}</span>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {training && (
            <div className="space-y-1.5 border-t border-[rgba(200,168,76,0.06)] pt-3">
              <h4 className="text-sm font-medium uppercase tracking-[0.12em] text-gold/70">
                Training Program
              </h4>
              <div className="glass-card-inset space-y-2 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gold/60">Trainees</div>
                    <div className="mt-0.5 text-sm font-medium text-silver-bright">
                      {room.isOperational ? training.currentTraineeCount : 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gold/60">Roster Avg</div>
                    <div className="mt-0.5 text-sm font-medium text-silver-bright">
                      {training.rosterAverageReadiness}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gold/60">Rate Mod</div>
                    <div className="mt-0.5 text-sm font-medium text-silver-bright">
                      {training.rateModifier >= 0 ? "+" : ""}
                      {training.rateModifier}%
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-silver/60">
                  {room.isOperational
                    ? "Training raises Strength, Speed, Endurance, and Resilience on a bounded track that later feeds raid readiness and combat power."
                    : "The drills only accrue while this room is active. Bodega runs stay training-free because no operational training room exists there."}
                </p>
                <p className="text-sm leading-relaxed text-gold/70">
                  {training.currentTraineeNames.length > 0
                    ? `${training.currentTraineeNames.join(", ")} ${training.currentTraineeNames.length === 1 ? "is" : "are"} on the current training block.`
                    : "Nobody is on the current training block right now."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upgrades — fill remaining width */}
        {hasUpgrades && (
          <div className="min-w-0 flex-1">
            <div className="grid auto-cols-fr grid-flow-col gap-4">
              {buildingUpgrades.length > 0 && (
                <div>
                  <Tooltip content="Upgrades that improve the whole building" side="top">
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                      Building Upgrades
                    </h4>
                  </Tooltip>
                  <div className="space-y-2">
                    {buildingUpgrades.map((u) => (
                      <UpgradeCard
                        key={u.id}
                        upgrade={u}
                        onPurchase={() => callbacks.purchaseBuildingUpgrade(u.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {roomUpgrades.length > 0 && (
                <div>
                  <Tooltip content="Upgrades specific to this room" side="top">
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                      Room Upgrades
                    </h4>
                  </Tooltip>
                  <div className="space-y-2">
                    {roomUpgrades.map((u) => (
                      <UpgradeCard
                        key={u.id}
                        upgrade={u}
                        onPurchase={() => callbacks.purchaseRoomUpgrade(room.id, u.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prep Recipes — shown for staging rooms */}
      {room.prepRecipes.length > 0 && (
        <div className="mt-4 border-t border-[rgba(200,168,76,0.06)] pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Consumable Prep
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {room.prepRecipes.map((recipe) => (
              <PrepRecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onProduce={() => callbacks.prepConsumable(recipe.recipeId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
