import { getPolicyFactorMetadata } from "lib/policies";
import { resolveTimeOfDayPhase } from "lib/hq-time-phase";

import {
  RAID_TIPS,
  getContractHintMeta,
  getNarrativeTagMeta,
  getWeaknessTargetMeta,
} from "./_glossary";
import { OpportunityBoard } from "./opportunity-board";
import { RaidLog } from "./raid-log";
import { RaidWatch } from "./raid-watch";
import { Tooltip } from "./_tooltip";
import { emptyStateClass, emptyStateIconClass, progressBarFillClass } from "./styles";
import { getBossArtPath } from "./boss-art";
import type { FocusPayload } from "render";
import {
  rankBadgeClass,
  type ContractResultViewModel,
  type ContractSiteViewModel,
  type GameCallbacks,
  type OperationsViewModel,
  type OperatorViewModel,
  type PostedContractViewModel,
  type RosterPressureViewModel,
} from "./view-models";

function ContractPolicySummary({ factors }: { factors: readonly string[] }) {
  const policyFactors = factors
    .map((factor) => ({ factor, meta: getPolicyFactorMetadata(factor) }))
    .filter(
      (
        entry,
      ): entry is {
        factor: string;
        meta: NonNullable<ReturnType<typeof getPolicyFactorMetadata>>;
      } => entry.meta !== null,
    );

  if (policyFactors.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-4 rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-3 py-3">
      <p className="text-xs uppercase tracking-wider text-gold/60">Management Context</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {policyFactors.map(({ factor, meta }) => (
          <Tooltip key={factor} content={`${meta.explanation} Tradeoff: ${meta.tradeoff}`}>
            <span className="rounded bg-[rgba(200,168,76,0.08)] px-1.5 py-0.5 text-sm text-gold/85">
              {meta.policyLabel}: {meta.optionLabel}
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// ── Contract Result Summary ──────────────────────────────────────────────

function ContractResultCard({ result }: { result: ContractResultViewModel }) {
  const isVictory = result.outcome === "boss_defeated";

  return (
    <div
      className="glass-card animate-enter relative overflow-hidden p-5"
      style={{
        borderColor: isVictory ? "rgba(200, 168, 76, 0.2)" : "rgba(212, 84, 30, 0.2)",
      }}
    >
      {/* Atmospheric top gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{
          background: isVictory
            ? "linear-gradient(180deg, rgba(200, 168, 76, 0.08) 0%, transparent 100%)"
            : "linear-gradient(180deg, rgba(212, 84, 30, 0.06) 0%, transparent 100%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3
            className="text-xs font-medium uppercase tracking-[0.18em]"
            style={{ color: isVictory ? "var(--color-gold)" : "var(--color-ember)" }}
          >
            {isVictory ? "Contract Complete" : "Contract Lost"}
          </h3>
          <p className="mt-1.5 font-display text-base font-semibold text-silver-bright">
            {result.siteConceptName}
          </p>
          <p className="mt-0.5 text-xs text-silver/50">
            {result.missionName} — {result.location}
          </p>
        </div>
        <span className={`badge ${isVictory ? "badge-gold" : "badge-ember"}`}>
          Rank {result.rank.toUpperCase()}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-4 gap-3">
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Raids</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            {result.totalRaids}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Cash</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalCashEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Rep</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalReputationEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">KIA</p>
          <p
            className="mt-0.5 font-display text-sm font-semibold tabular-nums"
            style={{
              color:
                result.operatorDeaths > 0 ? "var(--color-magma)" : "var(--color-silver-bright)",
            }}
          >
            {result.operatorDeaths}
          </p>
        </div>
      </div>

      <ContractPolicySummary factors={result.contributingFactors} />
    </div>
  );
}

// ── Posted Contract Card ─────────────────────────────────────────────────

function PostedContractCard({
  posting,
  onBid,
  index,
}: {
  posting: PostedContractViewModel;
  onBid: (postingId: string) => void;
  index: number;
}) {
  const bossArtPath = posting.bossHint ? getBossArtPath(posting.bossHint) : null;
  const bossLabel = posting.bossHint ? getContractHintMeta(posting.bossHint).label : null;
  const delayClass =
    index === 0 ? "animate-enter" : index === 1 ? "animate-enter-delay-1" : "animate-enter-delay-2";

  return (
    <div
      className={`glass-card contract-card ${delayClass}`}
      data-testid="contract-card"
      data-posting-id={posting.postingId}
    >
      {/* Boss portrait panel */}
      <div className="contract-card__portrait">
        {bossArtPath ? (
          <img src={bossArtPath} alt={bossLabel ?? "Boss"} className="contract-card__boss-img" />
        ) : (
          <svg viewBox="0 0 64 64" className="relative z-[1] h-16 w-16 opacity-20">
            <circle
              cx="32"
              cy="32"
              r="24"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.5"
            />
            <circle
              cx="32"
              cy="32"
              r="14"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.3"
              opacity="0.5"
            />
            <text
              x="32"
              y="38"
              textAnchor="middle"
              fill="var(--color-gold)"
              fontSize="18"
              fontFamily="var(--font-display)"
              fontWeight="200"
            >
              ?
            </text>
          </svg>
        )}

        {bossLabel && (
          <div className="relative z-[1] text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <div className="h-px w-4 bg-gradient-to-r from-transparent to-ember/30" />
              <div className="h-1 w-1 rotate-45 bg-ember/40" />
              <div className="h-px w-4 bg-gradient-to-l from-transparent to-ember/30" />
            </div>
            <p className="text-sm uppercase tracking-[0.18em] text-ember/55">{bossLabel}</p>
          </div>
        )}

        <div className="contract-card__vignette" />
      </div>

      {/* Intel panel */}
      <div className="contract-card__intel">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg font-semibold leading-tight text-silver-bright">
              {posting.siteConceptName}
            </h4>
            <p className="mt-1 text-sm text-silver/45">
              {posting.neighborhoodLabel || posting.location}
              <span className="mx-1.5 text-gold/20">{"\u00B7"}</span>
              {posting.missionName}
            </p>
          </div>
          <span className={`badge ${rankBadgeClass(posting.rank)} shrink-0`}>
            Rank {posting.rank.toUpperCase()}
          </span>
        </div>

        <p className="mt-2.5 text-sm italic leading-relaxed text-silver/45">
          {posting.siteSummary}
        </p>

        {/* Stat blocks */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div
            className="glass-card-inset rounded-lg px-2 py-2 text-center"
            title={RAID_TIPS.threat}
          >
            <p className="font-display text-base font-semibold tabular-nums text-silver-bright">
              {posting.threat}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Threat</p>
          </div>
          <div
            className="glass-card-inset rounded-lg px-2 py-2 text-center"
            title={RAID_TIPS.intel}
          >
            <p className="font-display text-base font-semibold tabular-nums text-silver-bright">
              {posting.intel}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Intel</p>
          </div>
          <div
            className="glass-card-inset rounded-lg px-2 py-2 text-center"
            title={RAID_TIPS.reward}
          >
            <p className="font-display text-base font-semibold tabular-nums text-gold">
              {Math.round(posting.reward)}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Reward</p>
          </div>
          <div className="glass-card-inset rounded-lg px-2 py-2 text-center" title={RAID_TIPS.risk}>
            <p className="font-display text-base font-semibold tabular-nums text-ember">
              {Math.round(posting.risk)}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Risk</p>
          </div>
        </div>

        {/* Intel details */}
        {(posting.knownTraits.length > 0 ||
          posting.enemyHints.length > 0 ||
          posting.lootFamilyHints.length > 0) && (
          <div className="mt-3 space-y-2">
            {posting.knownTraits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {posting.knownTraits.map((trait) => {
                  const meta = getContractHintMeta(trait);
                  return (
                    <span
                      key={trait}
                      className="rounded-sm bg-steel/60 px-2 py-0.5 text-xs text-silver/70"
                      title={meta.tip || undefined}
                    >
                      {meta.label}
                    </span>
                  );
                })}
                {posting.hiddenTraitCount > 0 && (
                  <span className="rounded-sm bg-steel/30 px-2 py-0.5 text-xs text-silver/40">
                    +{posting.hiddenTraitCount} unknown
                  </span>
                )}
              </div>
            )}

            {(posting.enemyHints.length > 0 || posting.lootFamilyHints.length > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-silver/40">
                {posting.enemyHints.length > 0 && (
                  <span>
                    <span className="text-gold/45">Hostiles:</span>{" "}
                    {posting.enemyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
                  </span>
                )}
                {posting.lootFamilyHints.length > 0 && (
                  <span>
                    <span className="text-gold/45">Loot:</span>{" "}
                    {posting.lootFamilyHints
                      .map((hint) => getContractHintMeta(hint).label)
                      .join(", ")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-auto flex items-center justify-between border-t border-[rgba(200,168,76,0.06)] pt-3">
          <span className="text-xs tabular-nums text-silver/35">
            Filing cost: <span className="text-silver/55">{posting.bidCost}</span>
          </span>
          <button
            data-testid="contract-bid-button"
            data-posting-id={posting.postingId}
            className="btn-primary"
            disabled={!posting.canBid}
            onClick={() => onBid(posting.postingId)}
          >
            Secure Contract
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contract Board ───────────────────────────────────────────────────────

function ContractBoard({
  postings,
  onBid,
}: {
  postings: readonly PostedContractViewModel[];
  onBid: (postingId: string) => void;
}) {
  if (postings.length === 0) {
    return (
      <div className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}>
        <div className={emptyStateIconClass}>&#9876;</div>
        <p className="text-sm font-medium text-gold/70">No contracts available</p>
      </div>
    );
  }

  return (
    <div data-testid="contract-board">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
        Contract Board
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {postings.map((posting, index) => (
          <PostedContractCard
            key={posting.postingId}
            posting={posting}
            onBid={onBid}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

function ContractResolutionSurface({
  result,
  onAdvance,
}: {
  result: ContractResultViewModel | null;
  onAdvance: () => void;
}) {
  return (
    <div className="glass-card p-4" data-testid="contract-review">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Contract Review
          </h3>
          <p className="mt-1 text-sm text-silver/70">
            {result
              ? "Operations is holding on the finished contract. Review the outcome, then open the next board."
              : "Operations is waiting for the previous contract to close out before posting new work."}
          </p>
        </div>
        <button className="btn-primary" data-testid="contract-review-next" onClick={onAdvance}>
          Review Next Board
        </button>
      </div>
    </div>
  );
}

// ── Active Contract Status (enhanced) ────────────────────────────────────

function ContractSiteStatus({ contract }: { contract: ContractSiteViewModel }) {
  const isEnded = contract.bossDefeated || contract.contractLost;

  return (
    <div className="glass-card p-4" data-testid="contract-status">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Secured Contract
          </h3>
          <p className="mt-1 font-display text-sm font-medium text-silver-bright">
            {contract.siteConceptName}
          </p>
          <p className="mt-0.5 text-xs text-silver/50">
            {contract.missionName} — {contract.location}
          </p>
          {contract.neighborhoodLabel && (
            <p className="mt-0.5 text-sm text-gold/60">{contract.neighborhoodLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip content={RAID_TIPS.rank}>
            <span className={`badge ${rankBadgeClass(contract.rank)}`}>
              Rank {contract.rank.toUpperCase()}
            </span>
          </Tooltip>
          <Tooltip
            content={
              contract.bossDefeated
                ? RAID_TIPS.contractWon
                : contract.contractLost
                  ? RAID_TIPS.contractLost
                  : RAID_TIPS.contractActive
            }
          >
            <span
              className={`badge ${
                contract.bossDefeated
                  ? "badge-gold"
                  : contract.contractLost
                    ? "badge-ember"
                    : "badge-slate"
              }`}
            >
              {contract.bossDefeated
                ? "Boss Defeated"
                : contract.contractLost
                  ? "Contract Lost"
                  : "Active"}
            </span>
          </Tooltip>
        </div>
      </div>

      {!isEnded && (
        <>
          <div className="glass-card-inset mt-3 rounded-lg px-3 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Site read</p>
            <p className="mt-1 text-sm leading-relaxed text-silver/65">{contract.siteSummary}</p>
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.threat}>
                <span className="text-gold/70">Threat</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{contract.threat}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.intel}>
                <span className="text-gold/70">Intel</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{contract.intel}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.reward}>
                <span className="text-gold/70">Reward</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{Math.round(contract.reward)}</span>
            </div>
          </div>

          {/* Exploration progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <Tooltip content={RAID_TIPS.revealProgress}>
                <span className="text-gold/60">Exploration</span>
              </Tooltip>
              <span className="tabular-nums text-silver/60">
                {Math.round(contract.explorationProgress)}%
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-void/80">
              <div
                className={progressBarFillClass}
                style={{ width: `${Math.min(100, contract.explorationProgress)}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(contract.knownTraits.length > 0 ||
              contract.enemyHints.length > 0 ||
              contract.lootFamilyHints.length > 0) && (
              <div className="glass-card-inset rounded-lg px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Operational Read</p>
                {contract.knownTraits.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {contract.knownTraits.map((trait) => {
                      const meta = getContractHintMeta(trait);
                      return (
                        <Tooltip key={trait} content={meta.tip}>
                          <span className="badge badge-slate">{meta.label}</span>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
                {contract.enemyHints.length > 0 && (
                  <p className="mt-2 text-sm leading-relaxed text-silver/60">
                    Hostiles:{" "}
                    {contract.enemyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
                  </p>
                )}
                {contract.lootFamilyHints.length > 0 && (
                  <p className="mt-1 text-sm leading-relaxed text-silver/60">
                    Likely loot:{" "}
                    {contract.lootFamilyHints
                      .map((hint) => getContractHintMeta(hint).label)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="glass-card-inset rounded-lg px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Boss Stakes</p>
                <Tooltip
                  content={contract.bossAvailable ? RAID_TIPS.routeOpen : RAID_TIPS.routeLocked}
                >
                  <span
                    className={`badge ${contract.bossAvailable ? "badge-ember" : "badge-slate"}`}
                  >
                    {contract.bossAvailable ? "Route Open" : "Route Locked"}
                  </span>
                </Tooltip>
              </div>
              <p className="mt-2 text-sm text-silver-bright">
                {contract.bossName ?? "Boss identity unconfirmed"}
              </p>
              {contract.bossTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contract.bossTags.map((tag) => {
                    const meta = getNarrativeTagMeta(tag);
                    return (
                      <Tooltip key={tag} content={meta.tip}>
                        <span className="badge badge-slate">{meta.label}</span>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              {contract.bossWeaknesses.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-frost/75">Weaknesses</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {contract.bossWeaknesses.map((weakness) => {
                      const meta = getWeaknessTargetMeta(weakness.target);
                      return (
                        <Tooltip key={`${weakness.kind}-${weakness.target}`} content={meta.tip}>
                          <span className="badge border border-frost/20 bg-frost/10 text-frost">
                            {meta.label}
                          </span>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="mt-2 text-sm leading-relaxed text-silver/60">
                {contract.bossAvailable
                  ? "The boss route is open. Enter the site expecting a decisive fight."
                  : "Explore further before expecting the boss route to appear."}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Time-of-day ambient treatment ─────────────────────────────────────────

const TIME_STYLE_SUNRISE: Record<string, string> = {
  background: "linear-gradient(180deg, rgba(200, 168, 76, 0.06) 0%, transparent 40%)",
};
const TIME_STYLE_SUNSET: Record<string, string> = {
  background: "linear-gradient(180deg, rgba(212, 84, 30, 0.05) 0%, transparent 40%)",
};
const TIME_STYLE_NIGHT: Record<string, string> = {
  background: "linear-gradient(180deg, rgba(26, 36, 64, 0.08) 0%, transparent 40%)",
};
const TIME_STYLE_DAY: Record<string, string> = {};

function getTimeOfDayStyle(minuteOfDay: number): Record<string, string> {
  switch (resolveTimeOfDayPhase(minuteOfDay)) {
    case "sunrise":
      return TIME_STYLE_SUNRISE;
    case "sunset":
      return TIME_STYLE_SUNSET;
    case "night":
      return TIME_STYLE_NIGHT;
    default:
      return TIME_STYLE_DAY;
  }
}

// ── Main Panel ───────────────────────────────────────────────────────────

interface OperationsPanelProps {
  guildName?: string;
  operations: OperationsViewModel;
  operators: readonly OperatorViewModel[];
  rosterPressure: RosterPressureViewModel;
  focus: FocusPayload | null;
  activeCategory: "contract" | "active" | "opportunities" | "history";
  callbacks: Pick<GameCallbacks, "bidContract" | "advanceContract">;
}

export function OperationsPanel({
  guildName = "the guild",
  operations,
  operators,
  rosterPressure,
  focus,
  activeCategory,
  callbacks,
}: OperationsPanelProps) {
  const lifecycle = operations.contractLifecycle;
  const isResolvedPhase = lifecycle === "resolved";
  const isBiddingPhase = lifecycle === "bidding";
  const timeStyle = getTimeOfDayStyle(operations.minuteOfDay);

  return (
    <div
      className="animate-enter space-y-5"
      data-testid="operations-panel"
      data-category={activeCategory}
      style={timeStyle}
    >
      {activeCategory === "contract" ? (
        <>
          {operations.contractResult && (isResolvedPhase || isBiddingPhase) && (
            <ContractResultCard result={operations.contractResult} />
          )}

          {isResolvedPhase && (
            <ContractResolutionSurface
              result={operations.contractResult}
              onAdvance={callbacks.advanceContract}
            />
          )}

          {isBiddingPhase && (
            <ContractBoard postings={operations.postedContracts} onBid={callbacks.bidContract} />
          )}

          {lifecycle === "active" && operations.contractSite && (
            <ContractSiteStatus contract={operations.contractSite} />
          )}

          {lifecycle === "idle" && !operations.contractSite && (
            <div
              className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}
            >
              <div className={emptyStateIconClass}>&#9876;</div>
              <p className="text-sm font-medium text-gold/70">No secured contract</p>
              <p className="mt-1 text-xs text-silver/60">
                Waiting for the contract board to refresh
              </p>
            </div>
          )}
        </>
      ) : null}

      {activeCategory === "active" && (
        <RaidWatch
          activeRaids={operations.activeRaids}
          operators={operators}
          selectedRaidId={focus?.targetKind === "team" ? focus.targetId : null}
        />
      )}

      {activeCategory === "opportunities" && (
        <OpportunityBoard
          guildName={guildName}
          opportunities={operations.opportunities}
          rosterPressure={rosterPressure}
          operators={operators}
        />
      )}

      {activeCategory === "history" && <RaidLog history={operations.raidHistory} />}
    </div>
  );
}
