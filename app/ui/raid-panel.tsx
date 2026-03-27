import { getPolicyFactorMetadata } from "lib/policies";

import { RAID_TIPS, getContractHintMeta } from "./_glossary";
import { OpportunityBoard } from "./opportunity-board";
import { RaidLog } from "./raid-log";
import { RaidWatch } from "./raid-watch";
import { Tooltip } from "./_tooltip";
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
      <p className="text-[0.625rem] uppercase tracking-wider text-gold/60">Management Context</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {policyFactors.map(({ factor, meta }) => (
          <Tooltip key={factor} content={`${meta.explanation} Tradeoff: ${meta.tradeoff}`}>
            <span className="rounded bg-[rgba(200,168,76,0.08)] px-1.5 py-0.5 text-[0.6875rem] text-gold/85">
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
          <p className="text-[0.625rem] uppercase tracking-wider text-gold/60">Raids</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            {result.totalRaids}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wider text-gold/60">Cash</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalCashEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wider text-gold/60">Rep</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalReputationEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wider text-gold/60">KIA</p>
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
  const delayClass =
    index === 0 ? "animate-enter" : index === 1 ? "animate-enter-delay-1" : "animate-enter-delay-2";

  return (
    <div
      className={`glass-card ${delayClass} p-4`}
      data-testid="contract-card"
      data-posting-id={posting.postingId}
    >
      {/* Header: site concept + rank */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-silver-bright">
            {posting.siteConceptName}
          </p>
          <p className="mt-0.5 text-xs text-silver/50">
            {posting.location} — {posting.missionName}
          </p>
        </div>
        <span className={`badge ${rankBadgeClass(posting.rank)} shrink-0`}>
          Rank {posting.rank.toUpperCase()}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-baseline gap-1" title={RAID_TIPS.threat}>
          <span className="text-gold/60">Threat</span>
          <span className="tabular-nums text-silver-bright">{posting.threat}</span>
        </div>
        <div className="flex items-baseline gap-1" title={RAID_TIPS.intel}>
          <span className="text-gold/60">Intel</span>
          <span className="tabular-nums text-silver-bright">{posting.intel}</span>
        </div>
        <div className="flex items-baseline gap-1" title={RAID_TIPS.reward}>
          <span className="text-gold/60">Reward</span>
          <span className="tabular-nums text-silver-bright">{Math.round(posting.reward)}</span>
        </div>
        <div className="flex items-baseline gap-1" title={RAID_TIPS.risk}>
          <span className="text-gold/60">Risk</span>
          <span className="tabular-nums text-silver-bright">{Math.round(posting.risk)}</span>
        </div>
      </div>

      {/* Intel-gated details */}
      <div className="mt-3 space-y-1.5">
        {posting.knownTraits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.knownTraits.map((trait) => {
              const meta = getContractHintMeta(trait);
              return (
                <span
                  key={trait}
                  className="rounded-sm bg-steel/60 px-1.5 py-0.5 text-[0.625rem] text-silver/70"
                  title={meta.tip || undefined}
                >
                  {meta.label}
                </span>
              );
            })}
            {posting.hiddenTraitCount > 0 && (
              <span className="rounded-sm bg-steel/30 px-1.5 py-0.5 text-[0.625rem] text-silver/40">
                +{posting.hiddenTraitCount} unknown
              </span>
            )}
          </div>
        )}

        {posting.enemyHints.length > 0 && (
          <p className="text-[0.625rem] text-silver/45">
            <span className="text-gold/50">Hostiles:</span>{" "}
            {posting.enemyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
          </p>
        )}

        {posting.lootFamilyHints.length > 0 && (
          <p className="text-[0.625rem] text-silver/45">
            <span className="text-gold/50">Loot:</span>{" "}
            {posting.lootFamilyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
          </p>
        )}

        {posting.bossHint && (
          <p className="text-[0.625rem] text-silver/45">
            <span className="text-gold/50">Boss:</span>{" "}
            {getContractHintMeta(posting.bossHint).label}
          </p>
        )}
      </div>

      {/* Bid action */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.625rem] text-silver/40">
          Filing cost: <span className="tabular-nums text-silver/60">{posting.bidCost}</span>
        </p>
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
      <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-8">
        <div className="empty-state-icon">&#9876;</div>
        <p className="text-[0.7rem] font-medium text-gold/70">No contracts available</p>
      </div>
    );
  }

  return (
    <div data-testid="contract-board">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
        Contract Board
      </h3>
      <div className="space-y-3">
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
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`badge ${rankBadgeClass(contract.rank)}`}>
            Rank {contract.rank.toUpperCase()}
          </span>
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
        </div>
      </div>

      {!isEnded && (
        <>
          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-baseline gap-1" title={RAID_TIPS.threat}>
              <span className="text-gold/70">Threat</span>
              <span className="tabular-nums text-silver-bright">{contract.threat}</span>
            </div>
            <div className="flex items-baseline gap-1" title={RAID_TIPS.intel}>
              <span className="text-gold/70">Intel</span>
              <span className="tabular-nums text-silver-bright">{contract.intel}</span>
            </div>
            <div className="flex items-baseline gap-1" title={RAID_TIPS.reward}>
              <span className="text-gold/70">Reward</span>
              <span className="tabular-nums text-silver-bright">{Math.round(contract.reward)}</span>
            </div>
          </div>

          {/* Exploration progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[0.625rem]">
              <span className="text-gold/60">Exploration</span>
              <span className="tabular-nums text-silver/60">
                {Math.round(contract.explorationProgress)}%
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-void/80">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, contract.explorationProgress)}%` }}
              />
            </div>
          </div>

          {/* Boss available indicator */}
          {contract.bossAvailable && (
            <div
              className="mt-2.5 flex items-center gap-1.5 rounded-md px-2 py-1"
              style={{
                background: "rgba(212, 84, 30, 0.08)",
                border: "1px solid rgba(212, 84, 30, 0.15)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--color-ember)",
                  boxShadow: "0 0 6px rgba(212, 84, 30, 0.5)",
                }}
              />
              <span className="text-[0.625rem] font-medium uppercase tracking-wider text-ember/90">
                Boss route unlocked
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Time-of-day ambient treatment ─────────────────────────────────────────

function getTimeOfDayStyle(minuteOfDay: number): Record<string, string> {
  const hour = Math.floor(minuteOfDay / 60);
  if (hour >= 5 && hour < 8) {
    // Dawn: warm amber tint
    return {
      background: "linear-gradient(180deg, rgba(200, 168, 76, 0.06) 0%, transparent 40%)",
    };
  }
  if (hour >= 18 && hour < 21) {
    // Dusk: deep orange
    return {
      background: "linear-gradient(180deg, rgba(212, 84, 30, 0.05) 0%, transparent 40%)",
    };
  }
  if (hour >= 21 || hour < 5) {
    // Night: dark navy/void
    return {
      background: "linear-gradient(180deg, rgba(26, 36, 64, 0.08) 0%, transparent 40%)",
    };
  }
  // Day (8-18): neutral/clear
  return {};
}

// ── Main Panel ───────────────────────────────────────────────────────────

interface OperationsPanelProps {
  operations: OperationsViewModel;
  operators: readonly OperatorViewModel[];
  rosterPressure: RosterPressureViewModel;
  focus: FocusPayload | null;
  activeCategory: "contract" | "active" | "opportunities" | "history";
  callbacks: Pick<GameCallbacks, "bidContract" | "advanceContract">;
}

export function OperationsPanel({
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
            <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-8">
              <div className="empty-state-icon">&#9876;</div>
              <p className="text-[0.7rem] font-medium text-gold/70">No secured contract</p>
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
          opportunities={operations.opportunities}
          rosterPressure={rosterPressure}
          operators={operators}
        />
      )}

      {activeCategory === "history" && <RaidLog history={operations.raidHistory} />}
    </div>
  );
}
