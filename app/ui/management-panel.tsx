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

interface ManagementPanelProps {
  policies: HqViewModel["policies"];
  contractLifecycle: HqViewModel["contractLifecycle"];
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
        {isCurrent && <span className="badge badge-gold shrink-0 text-[0.5625rem]">Current</span>}
      </div>
      <p className="mt-2 text-[0.6875rem] leading-relaxed text-silver/62">
        {getPolicyOptionExplanation(policyId, option)}
      </p>
      <p className="mt-2 text-[0.625rem] leading-relaxed text-gold/72">
        Tradeoff: {getPolicyOptionTradeoff(policyId, option)}
      </p>
    </button>
  );
}

export function ManagementPanel({ policies, contractLifecycle, callbacks }: ManagementPanelProps) {
  return (
    <div className="animate-enter space-y-4" data-testid="management-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Management
          </h3>
          <p className="mt-1 text-[0.6875rem] text-silver/55">
            Standing policies shape how the guild behaves between incidents.
          </p>
        </div>
        <span className="badge badge-slate">{formatContractLifecycle(contractLifecycle)}</span>
      </div>

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
                  <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
                    {metadata.question}
                  </p>
                </div>
                <div className="min-w-[8rem] shrink-0 text-right">
                  <p className="text-[0.5625rem] uppercase tracking-[0.14em] text-gold/55">
                    Current policy
                  </p>
                  <p className="mt-1 text-[0.75rem] text-gold">
                    {getPolicyOptionLabel(policyId, currentValue)}
                  </p>
                </div>
              </div>

              <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
                <p className="text-[0.5625rem] uppercase tracking-[0.14em] text-gold/55">
                  Current tradeoff
                </p>
                <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/65">
                  {getPolicyOptionTradeoff(policyId, currentValue)}
                </p>
              </div>

              {availability.reason && (
                <p
                  data-testid={`management-policy-${policyId}-disabled-reason`}
                  className="rounded-lg border border-[rgba(212,84,30,0.18)] bg-[rgba(212,84,30,0.08)] px-3 py-2 text-[0.6875rem] leading-relaxed text-ember"
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
