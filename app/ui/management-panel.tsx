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
  SKYSCRAPER_WAR_ROOM_TEMPLATE_ID,
} from "sim/systems/public-pressure";

import {
  type CurrentRivalView,
  type GameCallbacks,
  type HqViewModel,
  type PublicPressureBand,
  type PublicPressureView,
} from "./view-models";

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
  publicPressure?: PublicPressureView | null;
  currentRival?: CurrentRivalView | null;
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
            The Briefing Room is still unavailable. Secured Porter's contracts will stay unbriefed
            until Upstairs Conversion is bought and the room is actually placed.
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
            When relocation opens, operators, presenters, gear, cash, and reputation carry over.
            Room assignments reset for the new building.
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
          Operators, presenters, gear, cash, and reputation carry over. Room assignments reset, and
          you cannot relocate mid-contract, mid-raid, or while another blocking interruption is
          live.
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

const PUBLIC_PRESSURE_BAND_COPY: Record<
  PublicPressureBand,
  { label: string; summary: string; accent: string }
> = {
  quiet: {
    label: "Quiet",
    summary: "No one is writing about the guild this week.",
    accent: "badge-slate",
  },
  watched: {
    label: "Watched",
    summary: "Officials, sponsors, and press are watching for the next misstep.",
    accent: "badge-ember",
  },
  exposed: {
    label: "Exposed",
    summary: "Someone is looking to make an example of the guild.",
    accent: "badge-ember",
  },
  crackdown: {
    label: "Crackdown",
    summary: "The guild is on page one. Every move draws an audit.",
    accent: "badge-gold",
  },
};

const PRESSURE_SOURCE_LABELS: Record<NonNullable<PublicPressureView["dominantSource"]>, string> = {
  regulator: "Regulator",
  press: "Press",
  sponsor: "Sponsor",
  public: "Public",
};

const PRESSURE_SOURCE_ORDER: ReadonlyArray<NonNullable<PublicPressureView["dominantSource"]>> = [
  "regulator",
  "press",
  "sponsor",
  "public",
];

function PressureSourceIcon({
  source,
}: {
  source: NonNullable<PublicPressureView["dominantSource"]>;
}) {
  switch (source) {
    case "regulator":
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-7h6v7" />
        </svg>
      );
    case "press":
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
          <path d="M4 4h16v16H4z" />
          <path d="M4 9h16M9 4v16" />
        </svg>
      );
    case "sponsor":
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
          <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
        </svg>
      );
    case "public":
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
          <circle cx="12" cy="8" r="3" />
          <path d="M5 21c0-4 3-7 7-7s7 3 7 7" />
        </svg>
      );
  }
}

function PublicPressureSection({ pressure }: { pressure: PublicPressureView }) {
  const bandCopy = PUBLIC_PRESSURE_BAND_COPY[pressure.band];
  const activeDistricts = pressure.districts.filter(
    (d) => d.recentContractCount > 0 || d.heat > 10 || d.containment > 10,
  );
  const activeFactions = pressure.factionRelationships.filter(
    (f) => f.standing !== 0 || f.onCooldown,
  );
  const score = Math.max(0, Math.min(100, Math.round(pressure.score)));
  const dialCircumference = 188;
  const dashOffset = dialCircumference * (1 - score / 100);

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4" data-testid="public-pressure-summary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-gold">
            Public Pressure
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-light leading-tight text-silver-bright">
            {bandCopy.summary}
          </p>
        </div>
        <span
          className={`badge ${bandCopy.accent} shrink-0`}
          data-testid="public-pressure-band"
          data-band={pressure.band}
        >
          {bandCopy.label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative h-[6.875rem] w-[9.75rem] shrink-0">
          <svg
            viewBox="0 0 156 110"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id="rivalPressureDialGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#c8a84c" />
                <stop offset="0.55" stopColor="#d4541e" />
                <stop offset="1" stopColor="#a82a14" />
              </linearGradient>
            </defs>
            <path
              className="fill-none stroke-[rgba(200,168,76,0.08)] [stroke-width:6]"
              d="M 18 92 A 60 60 0 0 1 138 92"
              strokeLinecap="round"
            />
            <path
              className="fill-none transition-[stroke-dashoffset] duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.3,1)] [filter:drop-shadow(0_0_6px_rgba(212,84,30,0.45))] [stroke:url(#rivalPressureDialGradient)] [stroke-width:6]"
              d="M 18 92 A 60 60 0 0 1 138 92"
              strokeLinecap="round"
              strokeDasharray={dialCircumference}
              strokeDashoffset={dashOffset}
            />
            <line
              className={`[stroke-width:1] ${score >= 25 ? "stroke-gold" : "stroke-[rgba(200,168,76,0.2)]"}`}
              x1="33"
              y1="32"
              x2="38"
              y2="36"
            />
            <line
              className={`[stroke-width:1] ${score >= 50 ? "stroke-gold" : "stroke-[rgba(200,168,76,0.2)]"}`}
              x1="78"
              y1="22"
              x2="78"
              y2="28"
            />
            <line
              className={`[stroke-width:1] ${score >= 75 ? "stroke-gold" : "stroke-[rgba(200,168,76,0.2)]"}`}
              x1="123"
              y1="32"
              x2="118"
              y2="36"
            />
          </svg>
          <div
            className="absolute bottom-2 left-0 right-0 text-center font-[family-name:var(--font-display)] text-[2.4rem] font-extralight leading-none tracking-[0.02em] text-silver-bright tabular-nums"
            data-testid="public-pressure-score"
          >
            {score}
          </div>
          <div className="absolute -bottom-2 left-0 right-0 text-center font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-[rgba(149,144,127,0.7)]">
            Score
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-silver/60">
            Pressure Vector
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESSURE_SOURCE_ORDER.map((source) => {
              const isDominant = pressure.dominantSource === source;
              return (
                <div
                  key={source}
                  className={`relative flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors duration-200 ${
                    isDominant
                      ? "border-ember bg-[linear-gradient(180deg,rgba(212,84,30,0.1),rgba(212,84,30,0))] text-smolder shadow-[0_0_0_1px_rgba(212,84,30,0.2),0_6px_20px_-8px_rgba(212,84,30,0.5)]"
                      : "border-[rgba(200,168,76,0.12)] bg-[rgba(255,255,255,0.012)] text-silver/55"
                  }`}
                  data-source={source}
                  data-dominant={isDominant ? "true" : undefined}
                >
                  <span
                    className={`block h-[18px] w-[18px] ${isDominant ? "opacity-100" : "opacity-45"}`}
                  >
                    <PressureSourceIcon source={source} />
                  </span>
                  <span className="mt-1 font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.18em]">
                    {PRESSURE_SOURCE_LABELS[source]}
                  </span>
                  {isDominant && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-[3px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-sm bg-ember"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeDistricts.length > 0 && (
        <div className="border-t border-dashed border-[rgba(200,168,76,0.1)] pt-3">
          <p className="mb-2 flex items-baseline justify-between font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-silver/55">
            <span>Active Districts</span>
            <span className="text-gold">
              {String(activeDistricts.length).padStart(2, "0")} /{" "}
              {String(pressure.districts.length).padStart(2, "0")}
            </span>
          </p>
          <ul className="divide-y divide-[rgba(200,168,76,0.04)]">
            {activeDistricts.map((d) => {
              const heatTone = d.heat >= 70 ? "bg-magma" : d.heat >= 40 ? "bg-ember" : "bg-gold";
              const containmentTone =
                d.containment >= 70 ? "bg-magma" : d.containment >= 40 ? "bg-ember" : "bg-gold";
              const standingPercent = Math.max(0, Math.min(100, d.standing));
              const heatPercent = Math.max(0, Math.min(100, d.heat));
              const containmentPercent = Math.max(0, Math.min(100, d.containment));
              return (
                <li
                  key={d.districtId}
                  className="flex items-center justify-between gap-3 py-2"
                  data-district={d.districtId}
                >
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-display)] text-sm font-normal text-silver-bright">
                      {d.name}
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.06em] text-silver/45">
                      {d.recentContractCount > 0
                        ? `${d.recentContractCount} contract${d.recentContractCount === 1 ? "" : "s"}`
                        : d.containment >= 50
                          ? "Containment lingering"
                          : "Background hum"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PressureMicroBar
                      glyph={`S ${Math.round(d.standing)}`}
                      tone="bg-gold"
                      fillPercent={standingPercent}
                    />
                    <PressureMicroBar
                      glyph={`H ${Math.round(d.heat)}`}
                      tone={heatTone}
                      fillPercent={heatPercent}
                    />
                    <PressureMicroBar
                      glyph={`C ${Math.round(d.containment)}`}
                      tone={containmentTone}
                      fillPercent={containmentPercent}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeFactions.length > 0 && (
        <div className="border-t border-dashed border-[rgba(200,168,76,0.1)] pt-3">
          <p className="mb-2 flex items-baseline justify-between font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-silver/55">
            <span>Faction Signals</span>
            <span className="text-gold">
              {String(activeFactions.length).padStart(2, "0")} /{" "}
              {String(pressure.factionRelationships.length).padStart(2, "0")}
            </span>
          </p>
          <ul className="divide-y divide-[rgba(200,168,76,0.04)]">
            {activeFactions.map((faction) => {
              const standing = Math.round(faction.standing);
              const standingPercent = Math.max(0, Math.min(100, standing + 50));
              const tone = standing < -25 ? "bg-magma" : standing < 0 ? "bg-ember" : "bg-gold";
              return (
                <li
                  key={faction.factionId}
                  className="flex items-center justify-between gap-3 py-2"
                  data-faction={faction.factionId}
                >
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-display)] text-sm font-normal text-silver-bright">
                      {faction.name}
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.06em] text-silver/45">
                      {faction.onCooldown ? "Access cooling" : "Relationship signal"}
                    </p>
                  </div>
                  <PressureMicroBar
                    glyph={`R ${standing > 0 ? `+${standing}` : standing}`}
                    tone={tone}
                    fillPercent={standingPercent}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function PressureMicroBar({
  glyph,
  tone,
  fillPercent,
}: {
  glyph: string;
  tone: string;
  fillPercent: number;
}) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="relative block h-[3px] w-9 overflow-hidden rounded-sm bg-[rgba(200,168,76,0.07)]">
        <span
          className={`absolute inset-y-0 left-0 ${tone}`}
          style={{ width: `${fillPercent}%` }}
        />
      </span>
      <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.08em] text-silver/45 tabular-nums">
        {glyph}
      </span>
    </span>
  );
}

const RIVAL_LANE_LABELS: Record<string, string> = {
  prestige: "Prestige Track",
  "labor-market": "Labor Market",
  "sponsor-network": "Sponsor Network",
  hybrid: "Hybrid Pressure",
};

const RIVAL_STRENGTH_LABELS: Record<string, string> = {
  above: "above tier",
  peer: "peer tier",
  below: "below tier",
};

function CurrentRivalSection({ rival }: { rival: CurrentRivalView }) {
  const intensity = Math.max(0, Math.min(100, Math.round(rival.intensity)));
  const aggression = Math.max(0, Math.min(100, Math.round(rival.aggression)));
  const intensitySummary =
    intensity >= 75
      ? "Pressing hard"
      : intensity >= 45
        ? "Working the angles"
        : "Probing for cracks";
  const trendLabel = rival.trend.charAt(0).toUpperCase() + rival.trend.slice(1);
  const laneLabel = RIVAL_LANE_LABELS[rival.pressureLane] ?? rival.pressureLane;
  const strengthLabel = RIVAL_STRENGTH_LABELS[rival.strengthBand] ?? rival.strengthBand;
  return (
    <section
      className="glass-card group relative min-h-[28rem] overflow-visible rounded-2xl px-5 pb-5 pt-6"
      data-testid="current-rival-summary"
      data-rival-id={rival.rivalId}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 z-0 h-[33rem] w-[19rem] rounded-[50%] bg-[radial-gradient(ellipse_at_60%_30%,rgba(212,84,30,0.16)_0%,rgba(212,84,30,0.04)_35%,transparent_65%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 right-4 top-0 z-[1] h-px opacity-70 bg-[linear-gradient(90deg,transparent,var(--color-ember)_35%,var(--color-smolder)_50%,var(--color-ember)_65%,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-14 z-[3] h-[35rem] w-56 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.3,1)] group-hover:-translate-y-1.5 [filter:drop-shadow(-12px_14px_22px_rgba(0,0,0,0.6))_drop-shadow(0_0_32px_rgba(212,84,30,0.18))]"
      >
        <img
          src={rival.leaderPortrait}
          alt=""
          className="block h-full w-full object-contain object-top"
        />
      </div>

      <p className="relative z-[2] mb-4 font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.4em] text-gold">
        Current Rival
      </p>

      <div className="relative z-[2] flex max-w-[65%] items-start gap-4">
        <span className="inline-block h-16 w-16 shrink-0 overflow-hidden rounded-[0.875rem] bg-[#0a0810] shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_0_2px_rgba(200,168,76,0.18),0_12px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <img src={rival.insignia} alt="" className="block h-full w-full object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xs font-normal uppercase tracking-[0.32em] text-smolder">
            <span aria-hidden="true" className="inline-block h-px w-4 bg-ember" />
            {laneLabel} · {strengthLabel}
          </p>
          <h4 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extralight leading-none tracking-[0.01em] text-silver-bright">
            {rival.shortDisplayName}
          </h4>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.16em] text-silver/55">
            <span className="text-gold">Field lead</span> {rival.leaderName}
          </p>
        </div>
      </div>

      <p className="relative z-[2] mt-5 max-w-[60%] border-l border-transparent pl-3 text-sm leading-relaxed text-silver/85 [border-image:linear-gradient(180deg,rgba(200,168,76,0.6),transparent)_1]">
        {rival.oneLiner}
      </p>

      <div className="relative z-[2] mt-5 grid max-w-[60%] grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(200,168,76,0.12)] bg-[rgba(0,0,0,0.32)] px-3 py-3 backdrop-blur-sm">
          <p className="font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.28em] text-silver/55">
            Intensity
          </p>
          <p
            className="mt-2 font-[family-name:var(--font-display)] text-2xl font-light leading-none text-silver-bright tabular-nums"
            data-testid="current-rival-intensity"
          >
            {intensity}
          </p>
          <div className="relative mt-2 h-[3px] overflow-hidden rounded-sm bg-[rgba(200,168,76,0.06)]">
            <span
              className="absolute inset-0 origin-left bg-[linear-gradient(90deg,var(--color-gold)_0%,var(--color-ember)_60%,var(--color-magma)_100%)] shadow-[0_0_8px_rgba(212,84,30,0.6)]"
              style={{ transform: `scaleX(${intensity / 100})` }}
            />
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xs font-normal uppercase tracking-[0.18em] text-smolder">
            {intensitySummary}
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(200,168,76,0.12)] bg-[rgba(0,0,0,0.32)] px-3 py-3 backdrop-blur-sm">
          <p className="font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.28em] text-silver/55">
            Trend
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-light leading-none text-silver-bright">
            {trendLabel}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 font-[family-name:var(--font-display)] text-xs font-normal uppercase tracking-[0.18em] text-smolder">
            <span
              aria-hidden="true"
              className={
                rival.trend === "rising"
                  ? "inline-block animate-rival-trend-rise motion-reduce:animate-none"
                  : ""
              }
            >
              {rival.trend === "rising" ? "▲" : rival.trend === "slipping" ? "▼" : "—"}
            </span>
            Aggression {aggression}
          </p>
        </div>
      </div>

      <div className="relative z-[2] mt-5 flex max-w-[60%] items-center gap-3 rounded-lg border border-[rgba(200,168,76,0.18)] border-l-2 border-l-gold bg-[linear-gradient(90deg,rgba(200,168,76,0.06),rgba(200,168,76,0)_60%)] px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-xs font-normal uppercase tracking-[0.32em] text-gold">
            War Room
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-sm font-light text-silver-bright">
            Counter brief queued for the next move
          </p>
        </div>
      </div>
    </section>
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
  publicPressure,
  currentRival,
}: ManagementPanelProps) {
  const guildName = guild.guildName;
  const operationalRoomTemplateIds = rooms
    .filter((room) => room.isOperational)
    .map((room) => room.templateId);
  const complianceOfficeActive =
    building.id === "building/skyscraper" &&
    operationalRoomTemplateIds.includes(SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID);
  const warRoomActive =
    building.id === "building/skyscraper" &&
    operationalRoomTemplateIds.includes(SKYSCRAPER_WAR_ROOM_TEMPLATE_ID);

  return (
    <div className="animate-enter space-y-4" data-testid="management-panel">
      <div className="flex items-center justify-end">
        <span className="badge badge-slate">{formatContractLifecycle(contractLifecycle)}</span>
      </div>

      <div className="grid gap-3">
        <RelocationCard
          building={building}
          guildName={guildName}
          relocationGate={relocationGate}
          callbacks={callbacks}
        />
      </div>

      {publicPressure && complianceOfficeActive && (
        <PublicPressureSection pressure={publicPressure} />
      )}

      {currentRival && warRoomActive && <CurrentRivalSection rival={currentRival} />}

      {building.id === "building/porters" && (
        <PortersCampaignCard rooms={rooms} upgrades={upgrades} operators={operators} />
      )}

      {building.id === "building/skyscraper" && <SkyscraperFloorArcCard upgrades={upgrades} />}

      <div className="grid gap-3">
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
              <div>
                <h4 className="text-sm font-medium text-silver-bright">{metadata.label}</h4>
                <p className="mt-1 text-sm leading-relaxed text-silver/55">{metadata.question}</p>
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
