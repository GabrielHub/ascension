import {
  buildKitTemplateRegistry,
  PASSIVES,
  REGULAR_ATTACKS,
  resolveOperatorKit,
  SKILLS,
  ULTIMATES,
} from "content/templates/kits";

import { getIdentifierLabel } from "./_glossary";
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
      <div className="text-[0.5625rem] uppercase tracking-[0.14em] text-gold/50">{label}</div>
      <div className="mt-1 text-[0.6875rem] text-silver-bright">{name}</div>
      <p className="mt-1 text-[0.625rem] leading-relaxed text-silver/50">{summary}</p>
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
  const attunementLabel = combat.attunementTag
    ? getIdentifierLabel(combat.attunementTag)
    : "Unattuned";
  const resolvedKit = resolveOperatorKit(kitRegistry, {
    regularAttackId: combat.regularAttackId,
    skillId: combat.skillId,
    ultimateId: combat.ultimateId,
    passiveIds: combat.passiveIds,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] uppercase tracking-[0.12em] text-gold/50">{title}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[0.625rem]">
          <span className="badge badge-gold">Rank {combat.rank.toUpperCase()}</span>
          <span className="badge badge-slate">{attunementLabel}</span>
        </div>
      </div>

      {combat.traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[0.625rem]">
          {combat.traits.map((trait) => (
            <span key={trait} className="badge badge-slate">
              {getIdentifierLabel(trait)}
            </span>
          ))}
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
        <div className="text-[0.5625rem] uppercase tracking-[0.14em] text-gold/50">Passives</div>
        <div className="mt-1.5 grid gap-1">
          {resolvedKit.passives.map((passive) => (
            <div key={passive.id}>
              <div className="text-[0.6875rem] text-silver-bright">{passive.name}</div>
              <p className="text-[0.625rem] leading-relaxed text-silver/50">{passive.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[0.625rem]">
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
