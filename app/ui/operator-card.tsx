import { StatBar } from "./_stat-bar";
import { getRoleMeta } from "./_glossary";
import { OperatorPortrait } from "./operator-portrait";

interface OperatorCardProps {
  name?: string;
  roleTag?: string;
  presetId?: string;
  morale?: number;
  loyalty?: number;
}

export function OperatorCard({
  name = "Unknown Operator",
  roleTag = "role:bruiser",
  presetId = "kael-001",
  morale = 50,
  loyalty = 50,
}: OperatorCardProps) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-4">
        <OperatorPortrait name={name} roleTag={roleTag} presetId={presetId} size="card" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-silver-bright">{name}</h4>
          <span className="badge badge-gold mt-1">{getRoleMeta(roleTag).label}</span>
          <div className="mt-3 space-y-2">
            <StatBar label="Morale" value={morale} max={100} />
            <StatBar label="Loyalty" value={loyalty} max={100} />
          </div>
        </div>
      </div>
    </div>
  );
}
