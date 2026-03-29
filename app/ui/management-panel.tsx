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

function StaffingPressureCard({ rooms }: { rooms: HqViewModel["rooms"] }) {
  const bottlenecks = rooms.filter(
    (room) => room.isActive && room.requiredStaffTag && room.assignedStaffCount < room.capacity,
  );

  return (
    <section className="glass-card space-y-3 rounded-2xl p-4">
      <div>
        <h4 className="text-sm font-medium text-silver-bright">Staffing Pressure</h4>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
          Active rooms with staff tags only deliver full value when the matching workers are
          assigned.
        </p>
      </div>

      {bottlenecks.length === 0 ? (
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-[0.6875rem] leading-relaxed text-silver/65">
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
                    <p className="text-[0.75rem] text-silver-bright">{room.name}</p>
                    <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
                      Needs {getTagMeta(room.requiredStaffTag).label} staffing to stay fully
                      operational.
                    </p>
                  </div>
                  <span className="badge badge-ember">
                    {room.assignedStaffCount}/{room.capacity}
                  </span>
                </div>
                <p className="mt-2 text-[0.6875rem] text-ember">
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
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
              The bodega handoff is complete. {building.name} is now {guildName}'s headquarters.
            </p>
          </div>
          <span className="badge badge-gold">Completed</span>
        </div>
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-[0.6875rem] leading-relaxed text-silver/65">
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
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
            Porter's stays hidden until the bodega starts proving it can scale. Upgrade the site,
            build roster depth, clear contracts, and this section will turn into a concrete
            checklist.
          </p>
        </div>
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <p className="text-[0.6875rem] leading-relaxed text-silver/65">
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
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/55">
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
              <p className="text-[0.75rem] text-silver-bright">{prerequisite.label}</p>
              <p className="mt-0.5 text-[0.6875rem] text-silver/50">
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
          <p className="text-[0.625rem] uppercase tracking-[0.14em] text-ember/80">
            Current blockers
          </p>
          {relocationGate.blockers.map((blocker) => (
            <div
              key={blocker.key}
              className="rounded-lg border border-[rgba(212,84,30,0.18)] bg-[rgba(212,84,30,0.08)] px-3 py-2 text-[0.6875rem] leading-relaxed text-ember"
            >
              {blocker.reason}
            </div>
          ))}
        </div>
      )}

      <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
        <p className="text-[0.625rem] uppercase tracking-[0.14em] text-gold/55">Handoff rules</p>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-silver/65">
          Starting relocation opens a blocking review, confirmation, and landing sequence.
          Operators, staff, gear, cash, and reputation carry over. Room assignments reset, and you
          cannot relocate mid-contract, mid-raid, or while another blocking interruption is live.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.6875rem] leading-relaxed text-silver/50">
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
          <p className="mt-1 text-[0.6875rem] text-silver/55">
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
