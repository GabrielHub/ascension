// Centralised tooltip descriptions for game concepts.
// Keyed by internal identifiers so UI components can look up explanations
// without scattering prose across render code.

// ── Room function / staff / ops tags ────────────────────────────────────

const TAG_TIPS: Record<string, string> = {
  "room:recovery": "Supports rest and injury recovery",
  "room:social": "Builds bonds and improves morale",
  "room:operations": "Handles business intake and customer flow",
  "room:training": "Improves combat readiness through drills",
  "room:staffing": "Manages supplies and personnel logistics",
  "staff:reception": "Handles front-of-house and customer traffic",
  "staff:logistics": "Manages inventory and supply storage",
  "staff:medical": "Provides medical care and injury treatment",
  "staff:admin": "Handles paperwork and administrative tasks",
  "staff:maintenance": "Keeps facilities in working condition",
  "ops:recruitment": "Attracts potential operators to the team",
};

// ── Culture tones ───────────────────────────────────────────────────────

const TONE_TIPS: Record<string, string> = {
  quiet: "Calm, subdued atmosphere. Common in recovery spaces",
  lived_in: "Warm, worn-in feel. Common in social areas",
  brisk: "Busy, no-nonsense energy. Common in operations",
  focused: "Disciplined, intense. Common in training areas",
  neutral: "No dominant atmosphere has developed yet",
};

// ── Culture signals ─────────────────────────────────────────────────────

const SIGNAL_TIPS: Record<string, string> = {
  comfortable: "High comfort — staff feel at ease here",
  "worn thin": "Low comfort — room needs attention or upgrades",
  frayed: "High tension — conflicts may arise between staff",
  steady: "Low tension — staff work smoothly together",
  "tight-knit": "Strong camaraderie — staff look out for each other",
  distant: "Low camaraderie — staff are disconnected from each other",
};

// ── Raid location labels ─────────────────────────────────────────────────

const LOCATION_LABELS: Record<string, string> = {
  "district/lower-east-side": "Lower East Side",
  "district/queens-railyard": "Queens Railyard",
  "district/bronx-overpass": "Bronx Overpass",
  "district/red-hook-waterfront": "Red Hook Waterfront",
  "district/harlem-substation": "Harlem Substation",
};

/** Resolve a location ID like "district/harlem-substation" to a display name.
 *  Falls back to title-casing the slug after the last slash. */
export function getLocationLabel(locationId: string): string {
  const known = LOCATION_LABELS[locationId];
  if (known) return known;

  // Fallback: take the part after the last slash and title-case it
  const slug = locationId.includes("/") ? locationId.split("/").pop()! : locationId;
  return slug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Raid & operator stat tooltips ─────────────────────────────────────────

export const RAID_TIPS = {
  threat:
    "How dangerous the operation is — higher threat means tougher enemies and greater injury risk",
  threatRank:
    "Threat rating from E (easy) to A (deadly) — determines enemy strength and casualty risk",
  intel:
    "How much your team knows about the target — higher intel reveals enemy positions and reduces ambush chance",
  intelLow: "Minimal recon — expect surprises and hidden threats",
  intelModerate: "Partial recon — some enemy positions known, but gaps remain",
  intelHigh: "Thorough recon — enemy layout mapped, minimal unknowns",
  cohesion:
    "How well the team works together — high cohesion boosts coordination and reduces friendly fire",
  reward: "Cash payout on successful completion",
  risk: "Estimated danger to deployed operators — factors in threat level and team readiness",
  revealProgress:
    "How much of the operation site has been explored — reaching 100% completes the mission",
  duration: "Estimated time to complete the operation",
  interested: "Operators who have evaluated this opportunity and are willing to volunteer",
  committed: "Operators who have formally committed to this operation",
  recommended: "Suggested team size based on threat level",
} as const;

export const OPERATOR_TIPS = {
  morale:
    "Willingness to fight — low morale increases refusal risk and reduces combat effectiveness",
  loyalty: "Attachment to the guild — low loyalty makes operators more likely to desert or disobey",
  readiness: "Overall combat preparedness — combines training, equipment, and current condition",
  fatigue: "Physical exhaustion — high fatigue reduces performance and increases injury risk",
  stress: "Mental strain — high stress lowers morale recovery and can trigger breakdowns",
} as const;

// ── Role & specialty labels ──────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; tip: string }> = {
  "role:field_lead": {
    label: "Field Lead",
    tip: "Frontline commander — boosts team cohesion and directs tactics in combat",
  },
  "role:scout": {
    label: "Scout",
    tip: "Recon specialist — reveals map faster and detects ambushes before they trigger",
  },
  "role:medic": {
    label: "Medic",
    tip: "Combat medic — reduces injury severity and stabilizes wounded operators mid-raid",
  },
};

const SPECIALTY_LABELS: Record<string, { label: string; tip: string }> = {
  "focus:field_lead": {
    label: "Leadership",
    tip: "Specializes in command and coordination under pressure",
  },
  "focus:scout": {
    label: "Recon",
    tip: "Specializes in reconnaissance and threat detection",
  },
  "focus:medic": {
    label: "Field Medicine",
    tip: "Specializes in battlefield triage and emergency care",
  },
  "focus:extraction": {
    label: "Extraction",
    tip: "Specializes in recovering assets and pulling teams out of danger",
  },
};

/** Get display label and tooltip for an operator role tag. */
export function getRoleMeta(roleTag: string): { label: string; tip: string } {
  const known = ROLE_LABELS[roleTag];
  if (known) return known;
  // Fallback: strip prefix and title-case
  const label = roleTag
    .replace(/^[a-z]+:/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, tip: "" };
}

/** Get display label and tooltip for an operator specialty tag. */
export function getSpecialtyMeta(specialtyTag: string): { label: string; tip: string } {
  const known = SPECIALTY_LABELS[specialtyTag];
  if (known) return known;
  const label = specialtyTag
    .replace(/^[a-z]+:/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, tip: "" };
}

// ── Intel confidence labels ──────────────────────────────────────────────

const INTEL_LABELS: Record<string, { label: string; tip: string }> = {
  low: { label: "Low", tip: RAID_TIPS.intelLow },
  moderate: { label: "Moderate", tip: RAID_TIPS.intelModerate },
  high: { label: "High", tip: RAID_TIPS.intelHigh },
};

export function getIntelMeta(confidence: string): { label: string; tip: string } {
  return INTEL_LABELS[confidence] ?? { label: confidence, tip: "" };
}

// ── Raid narrative tags ──────────────────────────────────────────────────

export interface NarrativeTagMeta {
  label: string;
  tip: string;
}

const NARRATIVE_TAG_META: Record<string, NarrativeTagMeta> = {
  // Boss identities
  "boss:boss/sewer-warden": {
    label: "Sewer Warden",
    tip: "Dungeon boss — a tough guardian lurking beneath the streets",
  },
  "boss:boss/tunneler-brood-mother": {
    label: "Tunneler Brood-Mother",
    tip: "Dungeon boss — breeds waves of burrowing creatures",
  },
  "boss:boss/phantom-stalker": {
    label: "Phantom Stalker",
    tip: "Dungeon boss — an elusive predator that strikes from the dark",
  },
  // Boss ability modifiers
  "boss:resilience-pierce": {
    label: "Armor Pierce",
    tip: "Boss ignores part of your operators' resilience",
  },
  "boss:recovery-suppress": {
    label: "Recovery Block",
    tip: "Boss suppresses healing and recovery during the fight",
  },
  "boss:speed-drain": {
    label: "Speed Drain",
    tip: "Boss saps your operators' speed, slowing their actions",
  },
  "boss:summon-pressure": {
    label: "Summon Pressure",
    tip: "Boss calls reinforcements to overwhelm your squad",
  },
  "boss:intel-resist": {
    label: "Intel Resist",
    tip: "Boss resists scouting — intel confidence is less accurate",
  },
  "boss:area-damage": {
    label: "Area Damage",
    tip: "Boss hits multiple operators at once",
  },
  // Outcome tags
  "boss:defeated": {
    label: "Boss Defeated",
    tip: "The boss encounter was cleared",
  },
  "boss:weakness-exploited": {
    label: "Weakness Exploited",
    tip: "Your team found and exploited the boss's vulnerability",
  },
};

/** Look up display label and tooltip for a raid narrative tag.
 *  Falls back to title-cased slug with no tooltip for unknown tags. */
export function getNarrativeTagMeta(tag: string): NarrativeTagMeta {
  const meta = NARRATIVE_TAG_META[tag];
  if (meta) return meta;

  // Fallback: strip prefix + category slug, title-case the remainder
  const label = tag
    .replace(/^[^:]+:/, "")
    .replace(/^[^/]+\//, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, tip: "" };
}

// ── Lookup helpers ──────────────────────────────────────────────────────

export function getTagTip(tag: string): string {
  return TAG_TIPS[tag] ?? "";
}

export function getToneTip(tone: string): string {
  return TONE_TIPS[tone] ?? "";
}

export function getSignalTip(signal: string): string {
  return SIGNAL_TIPS[signal] ?? "";
}
