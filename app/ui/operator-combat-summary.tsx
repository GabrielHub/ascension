import {
  buildKitTemplateRegistry,
  PASSIVES,
  REGULAR_ATTACKS,
  resolveOperatorKit,
  SKILLS,
  ULTIMATES,
} from "content/templates/kits";

import { getAttunementMeta, getRankMeta, getTraitMeta } from "./_glossary";
import { Tooltip } from "./_tooltip";
import { STAT_LABELS as STAT_LABEL_MAP } from "./item-surface";
import type { OperatorCombatViewModel } from "./view-models";

const kitRegistry = buildKitTemplateRegistry(REGULAR_ATTACKS, SKILLS, ULTIMATES, PASSIVES);

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

function AbilityCard({ label, name, summary }: { label: string; name: string; summary: string }) {
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
  const resolvedKit = resolveOperatorKit(kitRegistry, {
    regularAttackId: combat.regularAttackId,
    skillId: combat.skillId,
    ultimateId: combat.ultimateId,
    passiveIds: combat.passiveIds,
  });

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

      <div className="grid gap-2 lg:grid-cols-3">
        <AbilityCard
          label="Regular"
          name={resolvedKit.regularAttack.name}
          summary={resolvedKit.regularAttack.summary}
        />
        <AbilityCard
          label="Skill"
          name={resolvedKit.skill.name}
          summary={resolvedKit.skill.summary}
        />
        <AbilityCard
          label="Ultimate"
          name={resolvedKit.ultimate.name}
          summary={resolvedKit.ultimate.summary}
        />
      </div>

      <div className="glass-card-inset rounded-lg px-2 py-2">
        <div className="text-xs uppercase tracking-[0.14em] text-gold/50">Passives</div>
        <div className="mt-1.5 grid gap-1">
          {resolvedKit.passives.map((passive) => (
            <div key={passive.id}>
              <div className="text-sm text-silver-bright">{passive.name}</div>
              <p className="text-xs leading-relaxed text-silver/50">{passive.summary}</p>
            </div>
          ))}
        </div>
      </div>

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
