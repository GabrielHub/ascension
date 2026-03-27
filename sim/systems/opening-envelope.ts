import type { SimSystemContext } from "./types";

export interface RecruitmentGateState {
  unlocked: boolean;
  reason: string | null;
}

export function getRecruitmentGateState(context: SimSystemContext): RecruitmentGateState {
  void context;
  return { unlocked: true, reason: null };
}
