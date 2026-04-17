import type {
  CraftRecipeViewModel,
  GameCallbacks,
  PrepRecipeViewModel,
  RoomCultureViewModel,
  RoomViewModel,
  UpgradeViewModel,
} from "./view-models";
import { ItemCategoryIcon, ItemRankBadge, StatEffectChips } from "./item-surface";
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
  onClose?: () => void;
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
    <div className={`glass-card-inset space-y-3 p-4 ${upgrade.isApplied ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-silver-bright">{upgrade.name}</h4>
        {upgrade.isApplied && <span className="badge badge-gold shrink-0">Applied</span>}
      </div>
      <p className="text-sm leading-relaxed text-silver/65">{upgrade.description}</p>

      {upgrade.requirements.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">
            Requires
          </span>
          <div className="flex flex-wrap gap-1">
            {upgrade.requirements.map((req) => (
              <Tooltip
                key={req.type + req.label}
                content={
                  getRequirementTypeMeta(req.type).tip || getRequirementTypeMeta(req.type).label
                }
                side="top"
              >
                <span className="rounded bg-[rgba(6,6,8,0.5)] px-1.5 py-0.5 text-xs text-silver/70">
                  {req.label}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {upgrade.effects.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">
            Effects
          </span>
          <div className="flex flex-wrap gap-1">
            {upgrade.effects.map((eff) => (
              <Tooltip
                key={eff.type + eff.label}
                content={getEffectTypeMeta(eff.type).tip || getEffectTypeMeta(eff.type).label}
                side="top"
              >
                <span className="rounded bg-[rgba(200,168,76,0.08)] px-1.5 py-0.5 text-xs text-gold">
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
          className="btn-primary w-full text-xs"
          onClick={onPurchase}
        >
          {upgrade.isAffordable ? "Purchase" : "Not affordable"}
        </button>
      )}
    </div>
  );
}

export function RoomCultureBadges({
  culture,
  className = "flex flex-wrap gap-1.5",
}: {
  culture: Pick<RoomCultureViewModel, "tone" | "signals">;
  className?: string;
}) {
  const toneMeta = getToneMeta(culture.tone || "neutral");
  return (
    <div className={className}>
      <Tooltip content={toneMeta.tip}>
        <span className="badge badge-slate">{toneMeta.label}</span>
      </Tooltip>
      {culture.signals.map((signal) => {
        const meta = getSignalMeta(signal);
        return (
          <Tooltip key={signal} content={meta.tip}>
            <span className="badge badge-slate">{meta.label}</span>
          </Tooltip>
        );
      })}
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

  // ── Skyscraper rooms ─────────────────────────────────────────────────
  if (room.templateId === "room/lobby:tier_1") {
    return [
      "The lobby is the guild's public face. Walk-in traffic, prospects, and clients all pass the reception desk before anyone gets further into the tower.",
      `Scales ${guildName}'s recruitment funnel from bar-room pitches to institutional visibility — a real front door instead of a back counter.`,
    ];
  }

  if (room.templateId === "room/reception:tier_1") {
    return [
      "The front desk turns walk-in traffic into filed paperwork instead of lost prospects. Badges, calls, and intake routing live here.",
      `Gives ${guildName} a dedicated administrative screen between the street and the operations floor.`,
    ];
  }

  if (room.templateId === "room/bullpen:tier_1") {
    return [
      "The bullpen is where contract research, intel triage, and day-to-day operations coordination happen in one visible room instead of split across makeshift offices.",
      "Turns scattered admin into a real operations floor that can handle more contracts in parallel.",
    ];
  }

  if (room.templateId === "room/situation_room:tier_1") {
    return [
      "The situation room takes secured contracts and turns them into briefed plans with projectors, maps, and a full squad in chairs.",
      "Moves pre-deploy planning from an improvised conversation at the bar into a real operations surface.",
    ];
  }

  if (room.templateId === "room/clinic:tier_1") {
    return [
      "A proper clinic accelerates recovery and raises the ceiling on what serious injuries the guild can take without burning operators out of rotation.",
      `Replaces Porter's infirmary with something that actually looks like medical infrastructure, so ${guildName} stops trading health for throughput.`,
    ];
  }

  if (room.templateId === "room/dojo:tier_1") {
    return [
      "The dojo is a full training floor — mats, equipment, and coaching that actually deepens raid readiness between contracts.",
      "Training bonuses accrue faster here than the Porter's gym ever supported, so the roster improves even when contracts are quiet.",
    ];
  }

  if (room.templateId === "room/crew_lounge:tier_1") {
    return [
      "A dedicated crew lounge separates decompression from the public floor. Morale and loyalty stabilize when operators have somewhere to sit that is not also a work surface.",
      "Gives the recovery floor a social anchor that keeps the tower from feeling clinical.",
    ];
  }

  if (room.templateId === "room/supply_hall:tier_1") {
    return [
      "The supply hall is where loadouts get assembled and staged for deployment without tripping over the bar or the office.",
      "Keeps logistics and raid staging from bottlenecking the operations floor as contract volume grows.",
    ];
  }

  if (room.templateId === "room/fabrication_bay:tier_1") {
    return [
      "The fabrication bay is the tower's durable-gear workshop — a real machine shop sealed inside the logistics floor instead of tacked on behind a dock.",
      "Picks up where Porter's workshop left off, with higher-tier crafting support and no weather or salt to fight.",
    ];
  }

  if (room.templateId === "room/rooftop_helipad:tier_1") {
    return [
      "The helipad lets teams cross the city fast instead of fighting street traffic. Rooftop deployment turns the tower into a real forward base.",
      "Staging departures from the roof keeps the supply hall unclogged and puts teams on-site before the incident window closes.",
    ];
  }

  if (room.templateId === "room/sky_garden:tier_1") {
    return [
      "A rooftop decompression space with a skyline view. Downtime up here moves morale and loyalty harder than any indoor room in the tower.",
      "Gives the guild a prestige social surface that reads as institutional reach, not repurposed back-of-house.",
    ];
  }

  if (room.templateId === "room/executive_office:tier_1") {
    return [
      "When operational, scales positive faction standing deltas from contract outcomes by +40%. Faction reps that used to file complaints now take meetings in a suite with the guild mark on the door.",
      "Anchors sponsor-demand and press-exposure incidents so prestige-tier conversations land in a room built to handle them.",
    ];
  }

  if (room.templateId === "room/compliance_office:tier_1") {
    return [
      "When operational, bleeds regulator scrutiny every hour across all five factions on top of the baseline decay, and softens scandal-category incidents so audits, labor-safety reviews, and hearings fire less often (not never).",
      `Unlocks the plea-deal path in borough hearings and keeps ${guildName}'s paperwork in a state that can survive a regulator showing up unannounced.`,
    ];
  }

  if (room.templateId === "room/war_room:tier_1") {
    return [
      "When operational, stacks a x1.5 multiplier on top of the Briefing Room's opportunity and boss intel bonuses — compounds with Prep Room for the full endgame readout.",
      "Enables the counter-op choice in rival-guild poaching incidents so the tower can hit back instead of matching the offer.",
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
    <div className="glass-card-inset space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-silver-bright">{recipe.name}</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/65">{recipe.description}</p>
        </div>
        <Tooltip content={`+${recipe.outputBuffValue} ${recipe.outputBuffStat} for deployed team`}>
          <span className="badge badge-gold shrink-0">
            +{recipe.outputBuffValue} {recipe.outputBuffStat}
          </span>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">Inputs</span>
        <div className="flex flex-wrap gap-1.5">
          {recipe.inputs.map((input) => (
            <Tooltip
              key={input.itemId}
              content={`${input.quantityOwned} owned / ${input.quantityRequired} needed`}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  input.isSatisfied
                    ? "bg-[rgba(200,168,76,0.08)] text-gold"
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
        <p className="text-sm text-ember/80">Requires assigned logistics staff to produce.</p>
      )}

      <button
        type="button"
        disabled={!recipe.canProduce}
        className="btn-primary w-full text-xs"
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

function getCraftBlockerMessage(recipe: CraftRecipeViewModel): string {
  if (!recipe.isRoomStaffed) return "Needs staff";
  if (!recipe.isBuildingTierMet) return "Building tier too low";
  if (!recipe.isDistrictMet) return "District access needed";
  if (!recipe.isFactionMet) return "Faction standing too low";
  if (!recipe.isCashMet) return "Needs cash";
  return "Missing inputs";
}

function getCraftBlockerSummary(recipe: CraftRecipeViewModel): string | null {
  if (recipe.canProduce) {
    return null;
  }

  const blockers: string[] = [];

  if (!recipe.isRoomStaffed) {
    blockers.push("assigned logistics staff");
  }
  if (!recipe.isBuildingTierMet) {
    blockers.push("Porter's tier 5");
  }
  if (!recipe.isDistrictMet && recipe.missingDistrictTags.length > 0) {
    blockers.push(`district access (${recipe.missingDistrictTags.join(", ")})`);
  }
  if (!recipe.isFactionMet && recipe.factionBlockers.length > 0) {
    blockers.push(
      ...recipe.factionBlockers.map(
        (blocker) => `${blocker.factionName} ${blocker.current}/${blocker.required}`,
      ),
    );
  }
  if (!recipe.isCashMet) {
    blockers.push(`${recipe.cashCost} cash (${recipe.cashOnHand} on hand)`);
  }

  const missingInputs = recipe.inputs.filter((input) => !input.isSatisfied);
  if (missingInputs.length > 0) {
    blockers.push(
      missingInputs
        .map((input) => `${input.itemName} ${input.quantityOwned}/${input.quantityRequired}`)
        .join(", "),
    );
  }

  return blockers.length > 0 ? `Blocked by: ${blockers.join(" • ")}.` : null;
}

function CraftRecipeCard({
  recipe,
  onCraft,
}: {
  recipe: CraftRecipeViewModel;
  onCraft: () => void;
}) {
  const blockerSummary = getCraftBlockerSummary(recipe);

  return (
    <div className="glass-card-inset space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-silver-bright">{recipe.name}</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/65">{recipe.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ItemCategoryIcon category={recipe.outputCategory} />
          <ItemRankBadge rank={recipe.outputRank} />
        </div>
      </div>

      {recipe.outputStatEffects.length > 0 && (
        <StatEffectChips effects={recipe.outputStatEffects} />
      )}

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">Inputs</span>
        <div className="flex flex-wrap gap-1.5">
          {recipe.inputs.map((input) => (
            <Tooltip
              key={input.itemId}
              content={`${input.quantityOwned} owned / ${input.quantityRequired} needed`}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  input.isSatisfied
                    ? "bg-[rgba(200,168,76,0.08)] text-gold"
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

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">Cash</span>
        <Tooltip content={`${recipe.cashOnHand} treasury / ${recipe.cashCost} required`}>
          <span
            className={`rounded px-1.5 py-0.5 text-xs ${
              recipe.isCashMet
                ? "bg-[rgba(200,168,76,0.08)] text-gold"
                : "bg-[rgba(180,60,60,0.08)] text-ember"
            }`}
          >
            {recipe.cashCost} cash
            <span className="ml-1 opacity-60">({recipe.cashOnHand})</span>
          </span>
        </Tooltip>
      </div>

      {blockerSummary && (
        <p className="rounded border border-[rgba(180,60,60,0.2)] bg-[rgba(180,60,60,0.08)] px-2 py-1.5 text-xs leading-relaxed text-ember/90">
          {blockerSummary}
        </p>
      )}

      <button
        type="button"
        disabled={!recipe.canProduce}
        className="btn-primary w-full text-xs"
        onClick={onCraft}
      >
        {recipe.canProduce
          ? `Craft ${recipe.outputQuantity}x ${recipe.outputName}`
          : getCraftBlockerMessage(recipe)}
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
  onClose,
}: RoomDetailPanelProps) {
  if (!room) return null;

  const occupancyPct = getRoomStaffingPercent(room);
  const whyItMatters = getRoomWhyItMatters(room, guildName);
  const requiredStaffMeta = room.requiredStaffTag ? getTagMeta(room.requiredStaffTag) : null;
  const training = room.training;

  const stateBadge = room.isOperational
    ? { label: "Operational", cls: "badge badge-gold", tip: getRoomStatusTip(room) }
    : room.isActive
      ? {
          label: "Understaffed",
          cls: "badge badge-slate",
          tip: "Active, but not yet staffed enough to operate",
        }
      : {
          label: "Inactive",
          cls: "badge badge-slate",
          tip: "Shut down — activate to begin staffing",
        };

  const loadDisplay = room.requiredStaffTag
    ? `${Math.round(occupancyPct)}%`
    : room.isOperational
      ? "Online"
      : room.isActive
        ? "Opening"
        : "Offline";

  const dividerColor = "rgba(200,168,76,0.06)";

  return (
    <div className="animate-enter space-y-5">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-light tracking-wide text-silver-bright">
              {room.name}
            </h3>
            <Tooltip content={stateBadge.tip}>
              <span className={stateBadge.cls}>{stateBadge.label}</span>
            </Tooltip>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-silver/65">{room.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="badge badge-slate">{getRoomStateLabel(room.roomStateId)}</span>
            <span className="badge badge-slate">
              Floor {room.floorDisplayNumber ?? room.floorIndex + 1}
            </span>
            <span className="badge badge-slate">{formatSlotLabel(room.slotId)}</span>
            <Tooltip
              content={`Reserved ${formatFootprintLabel(room.reservedFootprint)}; active ${formatFootprintLabel(room.activeFootprint)}`}
            >
              <span className="badge badge-slate">
                {room.reservedFootprint.cols}×{room.reservedFootprint.rows} /{" "}
                {room.activeFootprint.cols}×{room.activeFootprint.rows}
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className={room.isActive ? "btn-ghost text-xs" : "btn-primary text-xs"}
            onClick={() => callbacks.setRoomActive(room.id, !room.isActive)}
          >
            {room.isActive ? "Deactivate room" : "Activate room"}
          </button>
          {onClose && (
            <button
              type="button"
              className="btn-ghost shrink-0 px-1.5 py-1 text-sm leading-none text-silver/40 hover:text-silver-bright"
              onClick={onClose}
              aria-label="Close room detail"
            >
              &times;
            </button>
          )}
        </div>
      </header>

      <section className="space-y-2">
        <div
          className="glass-card-inset grid grid-cols-3 overflow-hidden divide-x"
          style={{ borderColor: dividerColor }}
        >
          <Tooltip content="Room tier — higher tiers unlock better upgrades" side="top">
            <div className="flex w-full flex-col items-center justify-center px-3 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-gold/60">Tier</div>
              <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                {room.tier}
              </div>
            </div>
          </Tooltip>
          <Tooltip
            content={
              room.requiredStaffTag
                ? "Assigned staff / staffing needed for full output"
                : "This room runs without dedicated staff"
            }
            side="top"
          >
            <div
              className="flex w-full flex-col items-center justify-center border-l px-3 py-3"
              style={{ borderColor: dividerColor }}
            >
              <div className="text-xs uppercase tracking-[0.12em] text-gold/60">
                {room.requiredStaffTag ? "Staff" : "Type"}
              </div>
              <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                {room.requiredStaffTag ? `${room.assignedStaffCount}/${room.capacity}` : "Passive"}
              </div>
            </div>
          </Tooltip>
          <Tooltip
            content={
              room.requiredStaffTag
                ? "Staffing level — 100% means fully operational"
                : "Whether the room is active and providing its benefits"
            }
            side="top"
          >
            <div
              className="flex w-full flex-col items-center justify-center border-l px-3 py-3"
              style={{ borderColor: dividerColor }}
            >
              <div className="text-xs uppercase tracking-[0.12em] text-gold/60">
                {room.requiredStaffTag ? "Load" : "Status"}
              </div>
              <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                {loadDisplay}
              </div>
            </div>
          </Tooltip>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
          <div className={progressBarFillClass} style={{ width: `${occupancyPct}%` }} />
        </div>

        <p className="text-xs leading-relaxed text-gold/70">
          {room.requiredStaffTag && requiredStaffMeta ? (
            <>
              Requires{" "}
              <Tooltip
                content={requiredStaffMeta.tip || "Staff role needed to operate this room"}
                side="top"
              >
                <span className="text-gold/90">{requiredStaffMeta.label}</span>
              </Tooltip>{" "}
              staff to reach full output.
            </>
          ) : (
            "No dedicated staff required. Activate the room and its benefits become available."
          )}
        </p>
      </section>

      {whyItMatters.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
            Why This Room Matters
          </h4>
          <div className="space-y-2">
            {whyItMatters.map((reason) => (
              <p key={reason} className="text-sm leading-relaxed text-silver/70">
                {reason}
              </p>
            ))}
          </div>
        </section>
      )}

      {room.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {room.tags.map((tag) => {
            const meta = getTagMeta(tag);
            return (
              <Tooltip key={tag} content={meta.tip}>
                <span className="badge badge-slate">{meta.label}</span>
              </Tooltip>
            );
          })}
        </div>
      )}

      {roomCulture && (
        <section className="space-y-2.5">
          <Tooltip content="Atmosphere shaped by room type, staffing, and events" side="top">
            <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
              Room Culture
            </h4>
          </Tooltip>
          <div className="glass-card-inset space-y-2.5 p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-[0.12em] text-gold/60">Tone</span>
              <span className="text-sm text-silver-bright">
                {getCultureSummaryLabel(roomCulture.summary)}
              </span>
            </div>
            <RoomCultureBadges culture={roomCulture} />
          </div>
        </section>
      )}

      {training && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
            Training Program
          </h4>
          <div className="glass-card-inset space-y-3 p-4">
            <div
              className="grid grid-cols-3 overflow-hidden rounded-md border bg-[rgba(6,6,8,0.35)]"
              style={{ borderColor: dividerColor }}
            >
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <div className="text-xs uppercase tracking-[0.12em] text-gold/60">Trainees</div>
                <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                  {room.isOperational ? training.currentTraineeCount : 0}
                </div>
              </div>
              <div
                className="flex flex-col items-center justify-center border-l px-2 py-2.5"
                style={{ borderColor: dividerColor }}
              >
                <div className="text-xs uppercase tracking-[0.12em] text-gold/60">Roster Avg</div>
                <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                  {training.rosterAverageReadiness}
                </div>
              </div>
              <div
                className="flex flex-col items-center justify-center border-l px-2 py-2.5"
                style={{ borderColor: dividerColor }}
              >
                <div className="text-xs uppercase tracking-[0.12em] text-gold/60">Rate Mod</div>
                <div className="mt-1 text-base font-medium tabular-nums text-silver-bright">
                  {training.rateModifier >= 0 ? "+" : ""}
                  {training.rateModifier}%
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-silver/70">
              {room.isOperational
                ? "Training raises Strength, Speed, Endurance, and Resilience on a bounded track that later feeds raid readiness and combat power."
                : "The drills only accrue while this room is active. Bodega runs stay training-free because no operational training room exists there."}
            </p>
            <p className="text-sm leading-relaxed text-gold/75">
              {training.currentTraineeNames.length > 0
                ? `${training.currentTraineeNames.join(", ")} ${training.currentTraineeNames.length === 1 ? "is" : "are"} on the current training block.`
                : "Nobody is on the current training block right now."}
            </p>
          </div>
        </section>
      )}

      {buildingUpgrades.length > 0 && (
        <section className="space-y-2.5">
          <Tooltip content="Upgrades that improve the whole building" side="top">
            <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
              Building Upgrades
            </h4>
          </Tooltip>
          <div className="space-y-2.5">
            {buildingUpgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                onPurchase={() => callbacks.purchaseBuildingUpgrade(u.id)}
              />
            ))}
          </div>
        </section>
      )}

      {roomUpgrades.length > 0 && (
        <section className="space-y-2.5">
          <Tooltip content="Upgrades specific to this room" side="top">
            <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
              Room Upgrades
            </h4>
          </Tooltip>
          <div className="space-y-2.5">
            {roomUpgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                onPurchase={() => callbacks.purchaseRoomUpgrade(room.id, u.id)}
              />
            ))}
          </div>
        </section>
      )}

      {room.prepRecipes.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Consumable Prep
          </h4>
          <div className="space-y-2.5">
            {room.prepRecipes.map((recipe) => (
              <PrepRecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onProduce={() => callbacks.prepConsumable(recipe.recipeId)}
              />
            ))}
          </div>
        </section>
      )}

      {room.craftRecipes.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Durable Gear Crafting
          </h4>
          <div className="space-y-2.5">
            {room.craftRecipes.map((recipe) => (
              <CraftRecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onCraft={() => callbacks.craftDurable(recipe.recipeId)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
