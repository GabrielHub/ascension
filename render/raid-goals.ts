import type { RaidTeamGoal } from "lib/raid-team-goal";

export interface RaidGoalPresentation {
  label: string;
  badgeLabel: string;
  shortLabel: string;
  icon: string;
  color: string;
  glow: string;
  ring: string;
  chipBackground: string;
  chipBorder: string;
}

const RAID_GOAL_PRESENTATION: Record<RaidTeamGoal, RaidGoalPresentation> = {
  exploring: {
    label: "Exploring",
    badgeLabel: "EXPLORING",
    shortLabel: "EXP",
    icon: "\u25CE",
    color: "rgba(100,160,220,0.9)",
    glow: "rgba(100,160,220,0.3)",
    ring: "rgba(100,160,220,0.45)",
    chipBackground: "rgba(100,160,220,0.08)",
    chipBorder: "rgba(100,160,220,0.16)",
  },
  looting: {
    label: "Looting",
    badgeLabel: "LOOTING",
    shortLabel: "LOOT",
    icon: "\u25C7",
    color: "rgba(200,168,76,0.92)",
    glow: "rgba(200,168,76,0.3)",
    ring: "rgba(200,168,76,0.45)",
    chipBackground: "rgba(200,168,76,0.08)",
    chipBorder: "rgba(200,168,76,0.16)",
  },
  intel: {
    label: "Gathering Intel",
    badgeLabel: "INTEL",
    shortLabel: "INT",
    icon: "\u25CB",
    color: "rgba(100,180,160,0.9)",
    glow: "rgba(100,180,160,0.3)",
    ring: "rgba(100,180,160,0.45)",
    chipBackground: "rgba(100,180,160,0.08)",
    chipBorder: "rgba(100,180,160,0.16)",
  },
  hunting: {
    label: "Hunting",
    badgeLabel: "HUNTING",
    shortLabel: "HUNT",
    icon: "\u25C6",
    color: "rgba(212,84,30,0.82)",
    glow: "rgba(212,84,30,0.3)",
    ring: "rgba(212,84,30,0.45)",
    chipBackground: "rgba(212,84,30,0.08)",
    chipBorder: "rgba(212,84,30,0.16)",
  },
  boss: {
    label: "Boss Attempt",
    badgeLabel: "BOSS",
    shortLabel: "BOSS",
    icon: "\u2666",
    color: "rgba(180,44,26,0.9)",
    glow: "rgba(180,44,26,0.35)",
    ring: "rgba(180,44,26,0.55)",
    chipBackground: "rgba(166,42,42,0.1)",
    chipBorder: "rgba(166,42,42,0.18)",
  },
  retreating: {
    label: "Retreating",
    badgeLabel: "RETREAT",
    shortLabel: "RET",
    icon: "\u25C0",
    color: "rgba(224,221,214,0.72)",
    glow: "rgba(224,221,214,0.12)",
    ring: "rgba(224,221,214,0.2)",
    chipBackground: "rgba(224,221,214,0.05)",
    chipBorder: "rgba(224,221,214,0.1)",
  },
  regrouping: {
    label: "Regrouping",
    badgeLabel: "REGROUP",
    shortLabel: "RGRP",
    icon: "\u25AA",
    color: "rgba(200,168,76,0.62)",
    glow: "rgba(200,168,76,0.15)",
    ring: "rgba(200,168,76,0.25)",
    chipBackground: "rgba(200,168,76,0.05)",
    chipBorder: "rgba(200,168,76,0.1)",
  },
};

export function getRaidGoalPresentation(goal: RaidTeamGoal): RaidGoalPresentation {
  return RAID_GOAL_PRESENTATION[goal] ?? RAID_GOAL_PRESENTATION.exploring;
}
