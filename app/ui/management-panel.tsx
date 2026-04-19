import {
  SHIPPED_POLICY_IDS,
  getPolicyChangeAvailability,
  getPolicyMetadata,
  getPolicyOptionExplanation,
  getPolicyOptionLabel,
  getPolicyOptionTradeoff,
  getPolicyOptions,
  type PolicyId,
  type PolicyState,
} from "lib/policies";

import {
  SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID,
  SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
  SKYSCRAPER_WAR_ROOM_TEMPLATE_ID,
} from "sim/systems/city-pressure";

import {
  buildVisibleInstitutionView,
  type CityPressureView,
  type GameCallbacks,
  type HqViewModel,
  type VisibleInstitutionBand,
  type VisibleInstitutionView,
} from "./view-models";
import { getTagMeta } from "./_glossary";

interface ManagementPanelProps {
  guild: HqViewModel["guild"];
  policies: HqViewModel["policies"];
  contractLifecycle: HqViewModel["contractLifecycle"];
  building: HqViewModel["building"];
  rooms: HqViewModel["rooms"];
  upgrades: HqViewModel["upgrades"];
  operators: HqViewModel["operators"];
  relocationGate: HqViewModel["relocationGate"];
  callbacks: GameCallbacks;
  cityPressure?: CityPressureView | null;
}

function formatContractLifecycle(contractLifecycle: HqViewModel["contractLifecycle"]): string {
  switch (contractLifecycle) {
    case "active":
      return "Active contract";
    case "resolved":
      return "Contract resolved";
    case "idle":
      return "No contract";
    default:
      return "Bidding";
  }
}

function PolicyOptionButton<P extends PolicyId>({
  policyId,
  option,
  currentValue,
  disabled,
  onSelect,
}: {
  policyId: P;
  option: PolicyState[P];
  currentValue: PolicyState[P];
  disabled: boolean;
  onSelect: (policyId: P, value: PolicyState[P]) => void;
}) {
  const isCurrent = currentValue === option;

  return (
    <button
      type="button"
      data-testid={`management-policy-${policyId}-${option}`}
      data-current={isCurrent ? "true" : undefined}
      className={`glass-card-inset w-full rounded-xl p-3 text-left transition-colors duration-150 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:bg-[rgba(200,168,76,0.05)] hover:border-[rgba(200,168,76,0.16)]"
      } ${
        isCurrent
          ? "border-[rgba(200,168,76,0.24)] bg-[rgba(200,168,76,0.08)]"
          : "border-[rgba(200,168,76,0.08)]"
      }`}
      disabled={disabled}
      onClick={() => onSelect(policyId, option)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-silver-bright">
          {getPolicyOptionLabel(policyId, option)}
        </span>
        {isCurrent && <span className="badge badge-gold shrink-0 text-xs">Current</span>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-silver/62">
        {getPolicyOptionExplanation(policyId, option)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-gold/72">
        Tradeoff: {getPolicyOptionTradeoff(policyId, option)}
      </p>
    </button>
  );
}

const ROOM_STAFFING_FLAVOR: Record<string, string> = {
  "room/infirmary:tier_1":
    "The Infirmary needs medical specialists to deliver real recovery instead of improvised first aid.",
  "room/stockroom:tier_1":
    "The Stockroom needs logistics staff to keep inventory organized and loadouts staged cleanly.",
  "room/prep_room:tier_1":
    "The Prep Room needs logistics staff to turn salvaged drops into field consumables.",
  "room/office:tier_1":
    "The Office needs admin staff to keep contracts filed and risk reads current.",
  "room/briefing_room:tier_1":
    "The Briefing Room needs admin staff to turn active contracts into real pre-deploy briefings.",
};

function getStaffingFlavorText(room: HqViewModel["rooms"][number]): string {
  const flavor = ROOM_STAFFING_FLAVOR[room.templateId];
  if (flavor) return flavor;
  return `${room.name} needs ${getTagMeta(room.requiredStaffTag).label.toLowerCase()} staffing to stay fully operational.`;
}

function StaffingPressureCard({ rooms }: { rooms: HqViewModel["rooms"] }) {
  const bottlenecks = rooms.filter(
    (room) => room.isActive && room.requiredStaffTag && room.assignedStaffCount < room.capacity,
  );

  return (
    <section className="glass-card space-y-3 rounded-2xl p-4">
      <div>
        <h4 className="text-sm font-medium text-silver-bright">Staffing Pressure</h4>
        <p className="mt-1 text-sm leading-relaxed text-silver/55">
          Active rooms with staff requirements only deliver full value when the right workers are
          assigned.
        </p>
      </div>

      {bottlenecks.length === 0 ? (
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-sm leading-relaxed text-silver/65">
            No active room is currently short on required staff.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bottlenecks.map((room) => {
            const missing = Math.max(0, room.capacity - room.assignedStaffCount);
            return (
              <div key={room.id} className="glass-card-inset rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-silver-bright">{room.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-silver/55">
                      {getStaffingFlavorText(room)}
                    </p>
                  </div>
                  <span className="badge badge-ember">
                    {room.assignedStaffCount}/{room.capacity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ember">
                  Missing {missing} {missing === 1 ? "assignment" : "assignments"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const PORTERS_BUILDING_UPGRADE_ORDER = [
  "upgrade/building/porters:kitchen_overhaul",
  "upgrade/building/porters:upstairs_conversion",
  "upgrade/building/porters:remodel",
  "upgrade/building/porters:waterfront",
  "upgrade/building/porters:machine_shop",
] as const;

const PORTERS_UPGRADE_SHORT_NAMES: Record<string, string> = {
  "upgrade/building/porters:kitchen_overhaul": "Kitchen",
  "upgrade/building/porters:upstairs_conversion": "Upstairs",
  "upgrade/building/porters:remodel": "Remodel",
  "upgrade/building/porters:waterfront": "Waterfront",
  "upgrade/building/porters:machine_shop": "Workshop",
};

function PortersCampaignCard({
  rooms,
  upgrades,
  operators,
}: {
  rooms: HqViewModel["rooms"];
  upgrades: HqViewModel["upgrades"];
  operators: HqViewModel["operators"];
}) {
  const orderedUpgrades = PORTERS_BUILDING_UPGRADE_ORDER.map((upgradeId) =>
    upgrades.find((upgrade) => upgrade.id === upgradeId),
  ).filter((upgrade): upgrade is NonNullable<(typeof upgrades)[number]> => upgrade !== undefined);
  const nextUpgradeIndex = orderedUpgrades.findIndex((upgrade) => !upgrade.isApplied);
  const nextUpgrade = nextUpgradeIndex === -1 ? null : orderedUpgrades[nextUpgradeIndex];
  const placedRoomTemplateIds = new Set(rooms.map((room) => room.templateId));
  const recoveryPressure = operators.some(
    (operator) =>
      operator.lifecycle.status === "active" &&
      (operator.injurySeverity > 0 ||
        operator.needFatigue >= 35 ||
        operator.needStress >= 35 ||
        operator.moraleCurrent < operator.moraleBaseline - 5),
  );

  const whyNow =
    nextUpgrade?.id === "upgrade/building/porters:kitchen_overhaul"
      ? "Kitchen Overhaul is the first stabilizer. It turns the bigger building into steadier cash flow and cleaner morale before you open more space."
      : nextUpgrade?.id === "upgrade/building/porters:upstairs_conversion"
        ? "Porter's still lacks a dedicated Briefing Room and private break space. Upstairs Conversion unlocks both, which is the first real post-move contract-prep step."
        : nextUpgrade?.id === "upgrade/building/porters:remodel"
          ? recoveryPressure
            ? "Operators are already carrying visible wear. The Remodel is the quality pass that keeps Porter's from becoming a larger room with the same old attrition."
            : "The shell is open, but it still needs the quality pass that makes recovery and morale gains stick across a real Porter's run."
          : nextUpgrade?.id === "upgrade/building/porters:waterfront"
            ? "The harbor side is still idle. Waterfront turns Porter's final expansion into staging throughput and post-raid decompression while this HQ still matters."
            : nextUpgrade?.id === "upgrade/building/porters:machine_shop"
              ? "Field salvage still leaves too much value on the floor. Machine Shop is the last major Porter's step because it turns a stable headquarters into one that can fabricate its own durable gear."
              : "Every shipped Porter's upgrade is online.";

  const unlockPreview =
    nextUpgrade?.id === "upgrade/building/porters:upstairs_conversion"
      ? "Unlocks: The Break Room, The Briefing Room"
      : nextUpgrade?.id === "upgrade/building/porters:waterfront"
        ? "Unlocks: The Dock, The Deck"
        : nextUpgrade?.id === "upgrade/building/porters:machine_shop"
          ? "Unlocks: The Workshop"
          : nextUpgrade?.effects.length
            ? `Impact: ${nextUpgrade.effects.map((effect) => effect.label).join(" | ")}`
            : "Impact: already applied";

  return (
    <section
      className="glass-card space-y-3 rounded-2xl p-4"
      data-testid="management-porters-campaign"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">Porter's Upgrade Arc</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">
            Porter's has a fixed five-step campaign. The next meaningful spend should move the room
            mix forward, not just drain cash at random.
          </p>
        </div>
        <span className={`badge ${nextUpgrade ? "badge-gold" : "badge-slate"}`}>
          {nextUpgrade ? `Step ${nextUpgradeIndex + 1} of ${orderedUpgrades.length}` : "Complete"}
        </span>
      </div>

      {/* Step progression indicator */}
      <div className="flex items-center gap-0 px-2">
        {orderedUpgrades.map((upgrade, index) => {
          const isComplete = upgrade.isApplied;
          const isCurrent = index === nextUpgradeIndex;
          return (
            <div key={upgrade.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300 ${
                    isComplete
                      ? "bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]"
                      : isCurrent
                        ? "border border-gold bg-[rgba(200,168,76,0.15)]"
                        : "border border-[rgba(200,168,76,0.15)] bg-[rgba(6,6,8,0.5)]"
                  }`}
                />
                <span
                  className={`text-xs tracking-[0.06em] ${
                    isComplete
                      ? "text-gold/80"
                      : isCurrent
                        ? "text-silver-bright"
                        : "text-silver/35"
                  }`}
                >
                  {PORTERS_UPGRADE_SHORT_NAMES[upgrade.id] ?? upgrade.name}
                </span>
              </div>
              {index < orderedUpgrades.length - 1 && (
                <div
                  className={`mx-1 mt-[-1.125rem] h-px flex-1 ${
                    isComplete ? "bg-gold/40" : "bg-[rgba(200,168,76,0.08)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-gold/55">
          {nextUpgrade ? "Next recommended upgrade" : "Campaign status"}
        </p>
        <p className="mt-1 text-sm text-silver-bright">
          {nextUpgrade ? nextUpgrade.name : "All shipped Porter's upgrades are online."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-silver/65">
          {nextUpgrade
            ? nextUpgrade.description
            : "Briefing, recovery, waterfront staging, and workshop fabrication are all unlocked for this headquarters."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Why now</p>
        <p className="text-sm leading-relaxed text-silver/65">{whyNow}</p>
        <p className="text-sm leading-relaxed text-gold/70">{unlockPreview}</p>
      </div>

      {nextUpgrade && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-silver/50">
            {nextUpgrade.isAffordable
              ? "Affordable now. Purchase it from the Rooms panel on any selected room card."
              : "Not affordable yet. The management card updates as soon as the treasury and reputation clear the cost."}
          </p>
          <span className={`badge ${nextUpgrade.isAffordable ? "badge-gold" : "badge-slate"}`}>
            {nextUpgrade.isAffordable ? "Affordable" : "Saving"}
          </span>
        </div>
      )}

      {!placedRoomTemplateIds.has("room/briefing_room:tier_1") &&
        nextUpgrade?.id !== "upgrade/building/porters:upstairs_conversion" && (
          <p className="rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-3 py-2 text-sm leading-relaxed text-silver/60">
            The Briefing Room is still offline. Secured Porter's contracts will stay unbriefed until
            Upstairs Conversion is bought and the room is actually placed.
          </p>
        )}
    </section>
  );
}

type SkyscraperFloorUpgradeCopy = {
  readonly id: string;
  readonly shortName: string;
  readonly whyNow: string;
  readonly unlockPreview: string;
};

const SKYSCRAPER_FLOOR_UPGRADES: readonly SkyscraperFloorUpgradeCopy[] = [
  {
    id: "upgrade/building/skyscraper:nightlife_floor",
    shortName: "Nightlife",
    whyNow:
      "Better recruits arrive before the institution learns to handle them. Nightlife opens the room prospects come to because the guild is a name people recognize.",
    unlockPreview: "Unlocks: The Club, The Green Room",
  },
  {
    id: "upgrade/building/skyscraper:specialist_training_floor",
    shortName: "Training",
    whyNow:
      "Operators are starting to outgrow the general dojo. Specialist Training is where field leads, scouts, and medics push past the conditioning ceiling.",
    unlockPreview: "Unlocks: The Drill Floor, The Recon Course, The Trauma Bay",
  },
  {
    id: "upgrade/building/skyscraper:executive_floor",
    shortName: "Executive",
    whyNow:
      "The guild is visible enough that institutional pressure has started to land. Executive opens the rooms where that pressure gets handled instead of ignored.",
    unlockPreview: "Unlocks: The Executive Office, The Compliance Office, The War Room",
  },
  {
    id: "upgrade/building/skyscraper:penthouse",
    shortName: "Penthouse",
    whyNow:
      "A-rank prospects do not get pitched in a club. The Penthouse closes the recruitment ladder with the room that finishes the conversation.",
    unlockPreview: "Unlocks: The Sky Lounge, The Private Cellar",
  },
];

function SkyscraperFloorArcCard({ upgrades }: { upgrades: HqViewModel["upgrades"] }) {
  type ArcEntry = {
    readonly upgrade: HqViewModel["upgrades"][number];
    readonly copy: SkyscraperFloorUpgradeCopy;
  };
  const orderedEntries: readonly ArcEntry[] = SKYSCRAPER_FLOOR_UPGRADES.flatMap((copy) => {
    const upgrade = upgrades.find((u) => u.id === copy.id);
    return upgrade ? [{ upgrade, copy }] : [];
  });
  const nextUpgradeIndex = orderedEntries.findIndex((entry) => !entry.upgrade.isApplied);
  const nextEntry = nextUpgradeIndex === -1 ? null : orderedEntries[nextUpgradeIndex];
  const nextUpgrade = nextEntry?.upgrade ?? null;

  const whyNow = nextEntry?.copy.whyNow ?? "Every floor in the tower is online.";
  const unlockPreview = nextEntry?.copy.unlockPreview ?? "Impact: every expansion floor is online.";

  return (
    <section
      className="glass-card space-y-3 rounded-2xl p-4"
      data-testid="management-skyscraper-floor-arc"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">Skyscraper Floor Arc</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">
            The tower opens with five floors and grows by acquiring four more. Each upgrade leases
            and fits out the next floor, ready to use the moment the contractors leave.
          </p>
        </div>
        <span className={`badge ${nextUpgrade ? "badge-gold" : "badge-slate"}`}>
          {nextUpgrade ? `Step ${nextUpgradeIndex + 1} of ${orderedEntries.length}` : "Complete"}
        </span>
      </div>

      <div className="flex items-center gap-0 px-2">
        {orderedEntries.map(({ upgrade, copy }, index) => {
          const isComplete = upgrade.isApplied;
          const isCurrent = index === nextUpgradeIndex;
          return (
            <div key={upgrade.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300 ${
                    isComplete
                      ? "bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]"
                      : isCurrent
                        ? "border border-gold bg-[rgba(200,168,76,0.15)]"
                        : "border border-[rgba(200,168,76,0.15)] bg-[rgba(6,6,8,0.5)]"
                  }`}
                />
                <span
                  className={`text-xs tracking-[0.06em] ${
                    isComplete
                      ? "text-gold/80"
                      : isCurrent
                        ? "text-silver-bright"
                        : "text-silver/35"
                  }`}
                >
                  {copy.shortName}
                </span>
              </div>
              {index < orderedEntries.length - 1 && (
                <div
                  className={`mx-1 mt-[-1.125rem] h-px flex-1 ${
                    isComplete ? "bg-gold/40" : "bg-[rgba(200,168,76,0.08)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-gold/55">
          {nextUpgrade ? "Next floor to acquire" : "Tower status"}
        </p>
        <p className="mt-1 text-sm text-silver-bright">
          {nextUpgrade ? nextUpgrade.name : "Every expansion floor is online."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-silver/65">
          {nextUpgrade
            ? nextUpgrade.description
            : "Nightlife, Specialist Training, Executive, and Penthouse are all leased and outfitted."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Why now</p>
        <p className="text-sm leading-relaxed text-silver/65">{whyNow}</p>
        <p className="text-sm leading-relaxed text-gold/70">{unlockPreview}</p>
      </div>

      {nextUpgrade && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-silver/50">
            {nextUpgrade.isAffordable
              ? "Affordable now. Purchase it from the Rooms panel on any selected room card."
              : "Not affordable yet. The card updates as soon as the treasury and reputation clear the cost."}
          </p>
          <span className={`badge ${nextUpgrade.isAffordable ? "badge-gold" : "badge-slate"}`}>
            {nextUpgrade.isAffordable ? "Affordable" : "Saving"}
          </span>
        </div>
      )}
    </section>
  );
}

const RELOCATION_FLAVOR_BY_BUILDING: Record<
  string,
  {
    hiddenLead: string;
    readyLead: string;
    target: string;
  }
> = {
  "building/bodega": {
    hiddenLead:
      "Porter's stays hidden until the bodega starts proving it can scale. Upgrade the site, build roster depth, clear contracts, and this section will turn into a concrete checklist.",
    readyLead:
      "Promotion out of the bodega is a gated management handoff. Meet the checklist, clear any live blockers, then start the review flow.",
    target: "Porter's",
  },
  "building/porters": {
    hiddenLead:
      "Ascension Tower stays hidden until Porter's proves it has outgrown the waterfront. Finish the upgrade arc, build reputation, clear high-rank contracts, and this section opens into a real checklist.",
    readyLead:
      "Leaving Porter's is a gated management handoff. The tower move is the last relocation — meet the checklist, clear any live blockers, then start the review.",
    target: "Ascension Tower",
  },
};

function RelocationCard({
  building,
  guildName,
  relocationGate,
  callbacks,
}: {
  building: HqViewModel["building"];
  guildName: HqViewModel["guild"]["guildName"];
  relocationGate: HqViewModel["relocationGate"];
  callbacks: GameCallbacks;
}) {
  if (building.id === "building/skyscraper") {
    return (
      <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="management-relocation">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-silver-bright">Headquarters</h4>
            <p className="mt-1 text-sm leading-relaxed text-silver/55">
              The relocation ladder is finished. {building.name} is {guildName}'s permanent address.
            </p>
          </div>
          <span className="badge badge-gold">Permanent</span>
        </div>
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-sm leading-relaxed text-silver/65">
            Further growth happens by expanding inside the tower — acquiring more floors and
            outfitting them — not by relocating again.
          </p>
        </div>
      </section>
    );
  }

  const flavor = RELOCATION_FLAVOR_BY_BUILDING[building.id];

  if (!flavor) {
    return (
      <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="management-relocation">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-silver-bright">Relocation</h4>
            <p className="mt-1 text-sm leading-relaxed text-silver/55">
              {building.name} is {guildName}'s current headquarters.
            </p>
          </div>
          <span className="badge badge-slate">Stable</span>
        </div>
      </section>
    );
  }

  if (!relocationGate) {
    return (
      <section className="glass-card space-y-3 rounded-2xl p-4">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">Relocation</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">{flavor.hiddenLead}</p>
        </div>
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-sm leading-relaxed text-silver/65">
            When relocation opens, operators, staff, gear, cash, and reputation carry over. Room
            assignments reset for the new building.
          </p>
        </div>
      </section>
    );
  }

  const canInitiate = relocationGate.allPrerequisitesMet && relocationGate.blockers.length === 0;

  return (
    <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="management-relocation">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">Relocation to {flavor.target}</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">{flavor.readyLead}</p>
        </div>
        <span className={`badge ${canInitiate ? "badge-gold" : "badge-slate"}`}>
          {canInitiate ? "Ready" : relocationGate.allPrerequisitesMet ? "Blocked" : "In Progress"}
        </span>
      </div>

      <div className="grid gap-2">
        {relocationGate.prerequisites.map((prerequisite) => (
          <div
            key={prerequisite.key}
            className="glass-card-inset flex items-center justify-between gap-3 rounded-xl px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-silver-bright">{prerequisite.label}</p>
              <p className="mt-0.5 text-sm text-silver/50">
                {prerequisite.current}/{prerequisite.target}
              </p>
            </div>
            <span className={`badge ${prerequisite.met ? "badge-gold" : "badge-slate"}`}>
              {prerequisite.met ? "Met" : "Missing"}
            </span>
          </div>
        ))}
      </div>

      {relocationGate.blockers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-ember/80">Current blockers</p>
          {relocationGate.blockers.map((blocker) => (
            <div
              key={blocker.key}
              className="rounded-lg border border-[rgba(212,84,30,0.18)] bg-[rgba(212,84,30,0.08)] px-3 py-2 text-sm leading-relaxed text-ember"
            >
              {blocker.reason}
            </div>
          ))}
        </div>
      )}

      <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Handoff rules</p>
        <p className="mt-1 text-sm leading-relaxed text-silver/65">
          Starting relocation opens a blocking review, confirmation, and landing sequence.
          Operators, staff, gear, cash, and reputation carry over. Room assignments reset, and you
          cannot relocate mid-contract, mid-raid, or while another blocking interruption is live.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-relaxed text-silver/50">
          Deposit and move assistance are handled inside the review flow once the checklist is
          clear.
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={!canInitiate}
          onClick={() => callbacks.initiateRelocation()}
        >
          Start Relocation Review
        </button>
      </div>
    </section>
  );
}

const SKYSCRAPER_EXECUTIVE_ROOM_META: Record<string, { label: string; summary: string }> = {
  [SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID]: {
    label: "Executive Office",
    summary: "Scales positive standing gains from contract outcomes (+40%).",
  },
  [SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID]: {
    label: "Compliance Office",
    summary: "Bleeds faction scrutiny each hour and softens scandal incidents.",
  },
  [SKYSCRAPER_WAR_ROOM_TEMPLATE_ID]: {
    label: "War Room",
    summary: "Stacks x1.5 on briefing-room intel and unlocks counter-op framing.",
  },
};

const VISIBLE_INSTITUTION_BAND_COPY: Record<
  VisibleInstitutionBand,
  { label: string; summary: string; accent: string }
> = {
  emerging: {
    label: "Emerging",
    summary:
      "The tower is on the map, but regulators and rivals still treat the guild as a newcomer.",
    accent: "badge-slate",
  },
  recognized: {
    label: "Recognized",
    summary:
      "The guild reads as an institutional player. Factions answer calls and rivals start coordinating against the name.",
    accent: "badge-ember",
  },
  prestige: {
    label: "Prestige",
    summary:
      "The tower is the address a borough chair expects to hear from. Every move is visible, and every missed signal is remembered.",
    accent: "badge-gold",
  },
};

function VisibleInstitutionSection({ institution }: { institution: VisibleInstitutionView }) {
  const bandCopy = VISIBLE_INSTITUTION_BAND_COPY[institution.band];
  const offsettingRooms = institution.offsettingRoomTemplateIds
    .map((id) => SKYSCRAPER_EXECUTIVE_ROOM_META[id])
    .filter((meta): meta is { label: string; summary: string } => meta !== undefined);

  return (
    <section
      className="glass-card space-y-3 rounded-2xl p-4"
      data-testid="visible-institution-summary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Visible Institution
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">{bandCopy.summary}</p>
        </div>
        <span
          className={`badge ${bandCopy.accent} shrink-0`}
          data-testid="visible-institution-band"
          data-band={institution.band}
        >
          {bandCopy.label} · {institution.score}
        </span>
      </div>

      <div className="grid gap-2 text-xs text-silver/60 sm:grid-cols-3">
        <div className="glass-card-inset rounded-xl p-3">
          <p className="uppercase tracking-[0.12em] text-gold/55">Reputation</p>
          <p className="mt-1 text-sm text-silver-bright">{Math.round(institution.reputation)}</p>
        </div>
        <div className="glass-card-inset rounded-xl p-3">
          <p className="uppercase tracking-[0.12em] text-gold/55">Avg Standing</p>
          <p className="mt-1 text-sm text-silver-bright">{institution.averageStanding}</p>
        </div>
        <div className="glass-card-inset rounded-xl p-3">
          <p className="uppercase tracking-[0.12em] text-gold/55">Tower Tier</p>
          <p className="mt-1 text-sm text-silver-bright">T{institution.buildingTier}</p>
        </div>
      </div>

      {offsettingRooms.length > 0 && (
        <div
          className="glass-card-inset space-y-2 rounded-xl p-3"
          data-testid="visible-institution-rooms"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-gold/55">
            Executive Floor offsets
          </p>
          <ul className="space-y-1.5">
            {offsettingRooms.map((room) => (
              <li key={room.label} className="text-sm leading-relaxed text-silver/70">
                <span className="text-silver-bright">{room.label}.</span> {room.summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {institution.pressureThreats.length > 0 && (
        <div
          className="glass-card-inset space-y-1 rounded-xl p-3"
          data-testid="visible-institution-threats"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-gold/55">
            Families threatening to fire
          </p>
          <p className="text-sm leading-relaxed text-silver/70">
            {institution.pressureThreats.join(" · ")}
          </p>
        </div>
      )}
    </section>
  );
}

function CityPressureSummaryCard({
  cityPressure,
  institution,
}: {
  cityPressure: CityPressureView;
  institution: VisibleInstitutionView | null;
}) {
  const activeDistricts = cityPressure.districts.filter(
    (d) => d.recentContractCount > 0 || d.attention > 10 || d.containmentDebt > 10,
  );
  const pressuredFactions = cityPressure.factions.filter(
    (f) => f.scrutiny >= 20 || f.standing <= -10 || f.leverage >= 20,
  );
  const hasCityPressure = activeDistricts.length > 0 || pressuredFactions.length > 0;
  if (!institution && !hasCityPressure) return null;

  return (
    <div className="space-y-3">
      {institution && <VisibleInstitutionSection institution={institution} />}
      {hasCityPressure && (
        <section
          className="glass-card space-y-2 rounded-2xl p-4"
          data-testid="city-pressure-summary"
        >
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            City Pressure
          </h4>
          {activeDistricts.map((d) => (
            <div
              key={d.districtId}
              className="flex items-center justify-between gap-2 text-sm text-silver/70"
            >
              <span className="truncate">{d.name}</span>
              <span className="flex shrink-0 gap-3 text-xs">
                <span title="Trust">T {Math.round(d.trust)}</span>
                <span className={d.attention >= 40 ? "text-ember" : ""} title="Attention">
                  A {Math.round(d.attention)}
                </span>
                <span
                  className={d.containmentDebt >= 50 ? "text-magma" : ""}
                  title="Containment debt"
                >
                  C {Math.round(d.containmentDebt)}
                </span>
              </span>
            </div>
          ))}
          {pressuredFactions.map((f) => (
            <div
              key={f.factionId}
              className="flex items-center justify-between gap-2 text-sm text-silver/70"
            >
              <span className="truncate">{f.name}</span>
              <span className="flex shrink-0 gap-3 text-xs">
                <span title="Standing">S {Math.round(f.standing)}</span>
                <span className={f.scrutiny >= 40 ? "text-ember" : ""} title="Scrutiny">
                  Sc {Math.round(f.scrutiny)}
                </span>
                {f.leverage > 0 && (
                  <span className={f.leverage >= 30 ? "text-magma" : ""} title="Leverage">
                    L {Math.round(f.leverage)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function ManagementPanel({
  guild,
  policies,
  contractLifecycle,
  building,
  rooms,
  upgrades,
  operators,
  relocationGate,
  callbacks,
  cityPressure,
}: ManagementPanelProps) {
  const guildName = guild.guildName;
  const institution =
    building.id === "building/skyscraper" && cityPressure
      ? buildVisibleInstitutionView(
          guild.reputation,
          cityPressure,
          building.id,
          building.tier,
          rooms.filter((room) => room.isOperational).map((room) => room.templateId),
        )
      : null;

  return (
    <div className="animate-enter space-y-4" data-testid="management-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Management
          </h3>
          <p className="mt-1 text-sm text-silver/55">
            Standing policies shape how {guildName} behaves between incidents.
          </p>
        </div>
        <span className="badge badge-slate">{formatContractLifecycle(contractLifecycle)}</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <RelocationCard
          building={building}
          guildName={guildName}
          relocationGate={relocationGate}
          callbacks={callbacks}
        />
        <StaffingPressureCard rooms={rooms} />
      </div>

      {cityPressure && (
        <CityPressureSummaryCard cityPressure={cityPressure} institution={institution} />
      )}

      {building.id === "building/porters" && (
        <PortersCampaignCard rooms={rooms} upgrades={upgrades} operators={operators} />
      )}

      {building.id === "building/skyscraper" && <SkyscraperFloorArcCard upgrades={upgrades} />}

      <div className="grid gap-3 xl:grid-cols-2">
        {SHIPPED_POLICY_IDS.map((policyId) => {
          const metadata = getPolicyMetadata(policyId);
          const currentValue = policies[policyId];
          const availability = getPolicyChangeAvailability(policyId, contractLifecycle);

          return (
            <section
              key={policyId}
              data-testid={`management-policy-${policyId}`}
              className="glass-card space-y-3 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-silver-bright">{metadata.label}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-silver/55">{metadata.question}</p>
                </div>
                <div className="min-w-[8rem] shrink-0 text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Current policy</p>
                  <p className="mt-1 text-sm text-gold">
                    {getPolicyOptionLabel(policyId, currentValue)}
                  </p>
                </div>
              </div>

              <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Current tradeoff</p>
                <p className="mt-1 text-sm leading-relaxed text-silver/65">
                  {getPolicyOptionTradeoff(policyId, currentValue)}
                </p>
              </div>

              {availability.reason && (
                <p
                  data-testid={`management-policy-${policyId}-disabled-reason`}
                  className="rounded-lg border border-[rgba(212,84,30,0.18)] bg-[rgba(212,84,30,0.08)] px-3 py-2 text-sm leading-relaxed text-ember"
                >
                  {availability.reason}
                </p>
              )}

              <div className="grid gap-2">
                {getPolicyOptions(policyId).map((option) => (
                  <PolicyOptionButton
                    key={option}
                    policyId={policyId}
                    option={option}
                    currentValue={currentValue}
                    disabled={availability.disabled}
                    onSelect={(nextPolicyId, value) => callbacks.setPolicy(nextPolicyId, value)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
