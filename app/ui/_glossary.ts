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
