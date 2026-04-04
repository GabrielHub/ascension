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

import type { GameCallbacks, HqViewModel } from "./view-models";
import { getTagMeta } from "./_glossary";

interface ManagementPanelProps {
  guildName: HqViewModel["guild"]["guildName"];
  policies: HqViewModel["policies"];
  contractLifecycle: HqViewModel["contractLifecycle"];
  building: HqViewModel["building"];
  rooms: HqViewModel["rooms"];
  upgrades: HqViewModel["upgrades"];
  operators: HqViewModel["operators"];
  relocationGate: HqViewModel["relocationGate"];
  callbacks: GameCallbacks;
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
] as const;

const PORTERS_UPGRADE_SHORT_NAMES: Record<string, string> = {
  "upgrade/building/porters:kitchen_overhaul": "Kitchen",
  "upgrade/building/porters:upstairs_conversion": "Upstairs",
  "upgrade/building/porters:remodel": "Remodel",
  "upgrade/building/porters:waterfront": "Waterfront",
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
            : "Every shipped Porter's upgrade is online.";

  const unlockPreview =
    nextUpgrade?.id === "upgrade/building/porters:upstairs_conversion"
      ? "Unlocks: The Break Room, The Briefing Room"
      : nextUpgrade?.id === "upgrade/building/porters:waterfront"
        ? "Unlocks: The Dock, The Deck"
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
            Porter's has a fixed four-step campaign. The next meaningful spend should move the room
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
            : "Briefing, recovery, and waterfront staging are all unlocked for this headquarters."}
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
  if (building.id !== "building/bodega") {
    return (
      <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="management-relocation">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-silver-bright">Relocation</h4>
            <p className="mt-1 text-sm leading-relaxed text-silver/55">
              The bodega handoff is complete. {building.name} is now {guildName}'s headquarters.
            </p>
          </div>
          <span className="badge badge-gold">Completed</span>
        </div>
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-sm leading-relaxed text-silver/65">
            Operators, staff, gear, cash, and reputation carried over. Room assignments were reset
            as part of the move.
          </p>
        </div>
      </section>
    );
  }

  if (!relocationGate) {
    return (
      <section className="glass-card space-y-3 rounded-2xl p-4">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">Relocation</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">
            Porter's stays hidden until the bodega starts proving it can scale. Upgrade the site,
            build roster depth, clear contracts, and this section will turn into a concrete
            checklist.
          </p>
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
          <h4 className="text-sm font-medium text-silver-bright">Relocation</h4>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">
            Promotion out of the bodega is a gated management handoff. Meet the checklist, clear any
            live blockers, then start the review flow.
          </p>
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

export function ManagementPanel({
  guildName,
  policies,
  contractLifecycle,
  building,
  rooms,
  upgrades,
  operators,
  relocationGate,
  callbacks,
}: ManagementPanelProps) {
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

      {building.id === "building/porters" && (
        <PortersCampaignCard rooms={rooms} upgrades={upgrades} operators={operators} />
      )}

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
