import type {
  CraftRecipeViewModel,
  GameCallbacks,
  PrepRecipeViewModel,
  RoomCultureViewModel,
  RoomViewModel,
  StaffViewModel,
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
import { getRoomStateLabel } from "lib/hq-room-state";
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
  onOpenUpgrades?: () => void;
  onOpenStaffing?: () => void;
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

function getRoomStaffingPercent(room: RoomViewModel): number {
  return getRoomProgressRatio(room) * 100;
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
  room,
  buildingUpgrades,
  roomUpgrades,
  callbacks,
  roomCulture,
  onClose,
  onOpenUpgrades,
  onOpenStaffing,
}: RoomDetailPanelProps) {
  if (!room) return null;

  const occupancyPct = getRoomStaffingPercent(room);
  const requiredStaffMeta = room.requiredStaffTag ? getTagMeta(room.requiredStaffTag) : null;
  const training = room.training;
  const hasAnyUpgrades = buildingUpgrades.length > 0 || roomUpgrades.length > 0;

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
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-silver/55">
            <span>{getRoomStateLabel(room.roomStateId)}</span>
            <span className="opacity-40">·</span>
            <span>Floor {room.floorDisplayNumber ?? room.floorIndex + 1}</span>
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

      {(onOpenUpgrades || onOpenStaffing) && (
        <section className="flex flex-wrap gap-1.5">
          {onOpenStaffing && room.requiredStaffTag && (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              data-testid="room-open-staffing"
              onClick={onOpenStaffing}
            >
              Staffing →
            </button>
          )}
          {onOpenUpgrades && hasAnyUpgrades && (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              data-testid="room-open-upgrades"
              onClick={onOpenUpgrades}
            >
              Upgrades →
            </button>
          )}
        </section>
      )}

      {roomCulture && (
        <Tooltip content="Atmosphere shaped by room type, staffing, and events" side="top">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-silver/65">
            <span className="uppercase tracking-[0.12em] text-gold/60">Culture</span>
            <span className="text-silver-bright">
              {getCultureSummaryLabel(roomCulture.summary)}
            </span>
            {roomCulture.signals.slice(0, 2).map((signal) => (
              <Tooltip key={signal} content={getSignalMeta(signal).tip} side="top">
                <span className="text-silver/55">· {getSignalMeta(signal).label}</span>
              </Tooltip>
            ))}
          </div>
        </Tooltip>
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

export function RoomUpgradesBody({
  room,
  buildingUpgrades,
  roomUpgrades,
  callbacks,
}: {
  room: RoomViewModel;
  buildingUpgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  callbacks: GameCallbacks;
}) {
  if (buildingUpgrades.length === 0 && roomUpgrades.length === 0) {
    return <p className="text-sm text-silver/50">No upgrades available for this room right now.</p>;
  }

  return (
    <div className="animate-enter space-y-5">
      {buildingUpgrades.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Building Upgrades
          </h4>
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
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Room Upgrades
          </h4>
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
    </div>
  );
}

export function RoomStaffingBody({
  room,
  staff,
  callbacks,
}: {
  room: RoomViewModel;
  staff: readonly StaffViewModel[];
  callbacks: GameCallbacks;
}) {
  const requiredTag = room.requiredStaffTag;
  if (!requiredTag) {
    return (
      <p className="text-sm text-silver/55">
        This room runs without dedicated staff. Activate it and its benefits become available.
      </p>
    );
  }

  const requiredMeta = getTagMeta(requiredTag);
  const assignedStaff = staff.filter(
    (s) => s.assignmentKind === "room" && s.assignmentTargetId === room.id,
  );
  const availableStaff = staff.filter(
    (s) =>
      s.roleTag === requiredTag &&
      !(s.assignmentKind === "room" && s.assignmentTargetId === room.id),
  );

  return (
    <div className="animate-enter space-y-4">
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
          Required Role
        </h4>
        <div className="flex items-center gap-2 text-sm text-silver/80">
          <span className="badge badge-slate">{requiredMeta.label}</span>
          <span className="tabular-nums text-silver/60">
            {room.assignedStaffCount}/{room.capacity} assigned
          </span>
        </div>
        <p className="text-xs leading-relaxed text-silver/55">{requiredMeta.tip}</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
          Currently Assigned
        </h4>
        {assignedStaff.length > 0 ? (
          <ul className="space-y-1">
            {assignedStaff.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-[rgba(6,6,8,0.4)] px-3 py-1.5"
              >
                <span className="text-sm text-silver-bright">{s.name}</span>
                <button
                  type="button"
                  className="btn-ghost px-2 py-0.5 text-xs"
                  onClick={() => callbacks.assignStaff(s.id, undefined)}
                >
                  unassign
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-silver/50">No staff assigned to this room yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
            Available
          </h4>
          <button
            type="button"
            className="btn-primary px-2.5 py-1 text-xs"
            onClick={() => callbacks.hireStaff(requiredTag)}
          >
            Hire {requiredMeta.label}
          </button>
        </div>
        {availableStaff.length > 0 ? (
          <ul className="space-y-1">
            {availableStaff.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-[rgba(6,6,8,0.4)] px-3 py-1.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-silver-bright">{s.name}</div>
                  <div className="text-xs text-silver/55">{s.status}</div>
                </div>
                <button
                  type="button"
                  disabled={room.assignedStaffCount >= room.capacity}
                  className="btn-ghost px-2 py-0.5 text-xs disabled:opacity-50"
                  onClick={() => callbacks.assignStaff(s.id, room.id)}
                >
                  assign
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-silver/50">
            No {requiredMeta.label} staff hired yet. Hire one to staff this room.
          </p>
        )}
      </section>
    </div>
  );
}
