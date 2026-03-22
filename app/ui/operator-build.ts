import type { BuildType } from "./_svg-shared";

const DEFAULT_OPERATOR_BUILD: BuildType = "medium";

const ROLE_TO_BUILD: Record<string, BuildType> = {
  field_lead: "broad",
  scout: "lean",
  medic: "medium",
  bruiser: "broad",
  infiltrator: "lean",
  strategist: "medium",
};

export function resolveOperatorBuild(roleTag: string): BuildType {
  const rawRole = roleTag.replace(/^(role|archetype):/, "").toLowerCase();
  return ROLE_TO_BUILD[rawRole] ?? DEFAULT_OPERATOR_BUILD;
}
