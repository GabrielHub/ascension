import { resolveCombatPackage } from "content/templates/combat-packages";
import { DEFAULT_COMBAT_PACKAGE_REGISTRY } from "lib/operator-combat";

import { getAttunementMeta, getRankMeta, getTraitMeta } from "./_glossary";
import { Tooltip } from "./_tooltip";
import { STAT_LABELS as STAT_LABEL_MAP } from "./item-surface";
import type { OperatorCombatViewModel } from "./view-models";

const STAT_KEYS: readonly {
  key: keyof OperatorCombatViewModel["baseStats"];
  label: string;
}[] = [
  { key: "strength", label: STAT_LABEL_MAP["strength"] ?? "STR" },
  { key: "speed", label: STAT_LABEL_MAP["speed"] ?? "SPD" },
  { key: "endurance", label: STAT_LABEL_MAP["endurance"] ?? "END" },
  { key: "resilience", label: STAT_LABEL_MAP["resilience"] ?? "RES" },
  { key: "perception", label: STAT_LABEL_MAP["perception"] ?? "PER" },
  { key: "intelligence", label: STAT_LABEL_MAP["intelligence"] ?? "INT" },
];

function StageCard({ label, name, summary }: { label: string; name: string; summary: string }) {
  return (
    <div className="glass-card-inset rounded-lg px-2 py-2">
      <div className="text-xs uppercase tracking-[0.14em] text-gold/50">{label}</div>
      <div className="mt-1 text-sm text-silver-bright">{name}</div>
      <p className="mt-1 text-xs leading-relaxed text-silver/50">{summary}</p>
    </div>
  );
}

export function OperatorCombatSummary({
  combat,
  title = "Combat Profile",
}: {
  combat: OperatorCombatViewModel;
  title?: string;
}) {
  const rankMeta = getRankMeta(combat.rank);
  const attunementMeta = getAttunementMeta(combat.attunementTag);
  const pkg = resolveCombatPackage(DEFAULT_COMBAT_PACKAGE_REGISTRY, combat.combatPackageId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.12em] text-gold/50">{title}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
          <Tooltip content={rankMeta.tip} side="top">
            <span className="badge badge-gold">{rankMeta.label}</span>
          </Tooltip>
          <Tooltip content={attunementMeta.tip} side="top">
            <span className="badge badge-slate">{attunementMeta.label}</span>
          </Tooltip>
          <Tooltip
            content="Each basic action grants +1 block. At 3 blocks, the next action automatically spends all 3 as the operator's ultimate, then blocks reset to 0."
            side="top"
          >
            <span className="badge badge-slate">Blocks {combat.blocks}/3</span>
          </Tooltip>
        </div>
      </div>

      {combat.traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {combat.traits.map((trait) => {
            const traitMeta = getTraitMeta(trait);
            return (
              <Tooltip key={trait} content={traitMeta.tip} side="top">
                <span className="badge badge-slate">{traitMeta.label}</span>
              </Tooltip>
            );
          })}
        </div>
      )}

      {pkg && (
        <>
          <div className="glass-card-inset rounded-lg px-2 py-2">
            <div className="text-xs uppercase tracking-[0.14em] text-gold/50">Package</div>
            <div className="mt-1 text-sm text-silver-bright">{pkg.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-silver/50">{pkg.description}</p>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            <StageCard label="Stage 1" name={pkg.stage1.name} summary={pkg.stage1.summary} />
            <StageCard label="Stage 2" name={pkg.stage2.name} summary={pkg.stage2.summary} />
            <StageCard label="Stage 3" name={pkg.stage3.name} summary={pkg.stage3.summary} />
          </div>

          <div className="glass-card-inset rounded-lg px-2 py-2">
            <div className="text-xs uppercase tracking-[0.14em] text-gold/50">Ultimate</div>
            <div className="mt-1 text-sm text-silver-bright">{pkg.ultimate.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-silver/50">{pkg.ultimate.summary}</p>
          </div>

          {pkg.passive && (
            <div className="glass-card-inset rounded-lg px-2 py-2">
              <div className="text-xs uppercase tracking-[0.14em] text-gold/50">Passive</div>
              <div className="mt-1 text-sm text-silver-bright">{pkg.passive.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-silver/50">{pkg.passive.summary}</p>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        {STAT_KEYS.map(({ key, label }) => (
          <div key={key} className="glass-card-inset rounded-lg px-2 py-1.5 text-center">
            <div className="text-gold/50">{label}</div>
            <div className="mt-0.5 tabular-nums text-silver-bright">{combat.baseStats[key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
