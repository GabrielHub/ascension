export interface DisplayMeta {
  label: string;
  tip: string;
  shortLabel?: string;
}

type DisplayRegistry = Readonly<Record<string, string | DisplayMeta>>;

function toDisplayMeta(value: string | DisplayMeta): DisplayMeta {
  return typeof value === "string" ? { label: value, tip: "" } : value;
}

function titleCase(raw: string): string {
  return raw
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeIdentifier(identifier: string): string {
  const afterPrefix = identifier.includes(":")
    ? identifier.slice(identifier.indexOf(":") + 1)
    : identifier;
  const slug = afterPrefix.includes("/")
    ? (afterPrefix.split("/").pop() ?? afterPrefix)
    : afterPrefix;
  return titleCase(slug);
}

function humanizeTemplateIdentifier(identifier: string): string {
  return titleCase(
    (identifier.split("/").pop() ?? identifier).replace(/:tier_\d+$/, "").replace(/[_-]/g, " "),
  );
}

function resolveDisplayMeta(
  identifier: string,
  registry: DisplayRegistry,
  fallback: (value: string) => string = humanizeIdentifier,
): DisplayMeta {
  const known = registry[identifier];
  if (known) return toDisplayMeta(known);
  return { label: fallback(identifier), tip: "" };
}

const TAG_META = {
  "room:recovery": { label: "Recovery", tip: "Supports rest and injury recovery" },
  "room:social": { label: "Social", tip: "Builds bonds and improves morale" },
  "room:operations": { label: "Operations", tip: "Handles business intake and customer flow" },
  "room:training": { label: "Training", tip: "Improves combat readiness through drills" },
  "room:staffing": { label: "Staffing", tip: "Manages supplies and personnel logistics" },
  "staff:reception": { label: "Reception", tip: "Handles front-of-house and customer traffic" },
  "staff:logistics": { label: "Logistics", tip: "Manages inventory and supply storage" },
  "staff:medical": { label: "Medical", tip: "Provides medical care and injury treatment" },
  "staff:admin": { label: "Admin", tip: "Handles paperwork and administrative tasks" },
  "staff:maintenance": { label: "Maintenance", tip: "Keeps facilities in working condition" },
  "ops:recruitment": { label: "Recruitment", tip: "Attracts potential operators to the team" },
  "ops:intel": { label: "Intel", tip: "Supports contract research and compliance work" },
  "ops:staging": {
    label: "Staging",
    tip: "Provides space for pre-raid team staging and departure",
  },
} satisfies DisplayRegistry;

const TONE_META = {
  quiet: { label: "Quiet", tip: "Calm, subdued atmosphere. Common in recovery spaces" },
  lived_in: { label: "Lived In", tip: "Warm, worn-in feel. Common in social areas" },
  brisk: { label: "Brisk", tip: "Busy, no-nonsense energy. Common in operations" },
  focused: { label: "Focused", tip: "Disciplined, intense. Common in training areas" },
  neutral: { label: "Neutral", tip: "No dominant atmosphere has developed yet" },
} satisfies DisplayRegistry;

const SIGNAL_META = {
  comfortable: { label: "Comfortable", tip: "High comfort. Staff feel at ease here" },
  "worn thin": { label: "Worn Thin", tip: "Low comfort. The room needs attention or upgrades" },
  frayed: { label: "Frayed", tip: "High tension. Conflicts may arise between staff" },
  steady: { label: "Steady", tip: "Low tension. Staff work smoothly together" },
  "tight-knit": { label: "Tight Knit", tip: "Strong camaraderie. Staff look out for each other" },
  distant: { label: "Distant", tip: "Low camaraderie. Staff are disconnected from each other" },
} satisfies DisplayRegistry;

const LOCATION_META = {
  "district/lower-east-side": "Lower East Side",
  "district/queens-railyard": "Queens Railyard",
  "district/bronx-overpass": "Bronx Overpass",
  "district/red-hook-waterfront": "Red Hook Waterfront",
  "district/harlem-substation": "Harlem Substation",
} satisfies DisplayRegistry;

const RESOURCE_META = {
  "resource/cash": { label: "Cash", tip: "Currency used for upgrades, hiring, and bids." },
  "resource/reputation": {
    label: "Reputation",
    tip: "Standing with the city and contract brokers.",
  },
  "resource/intel": {
    label: "Intel",
    tip: "Operational knowledge used to judge opportunities and sites.",
  },
} satisfies DisplayRegistry;

export const RAID_TIPS = {
  threat:
    "How dangerous the operation is. Higher threat means tougher enemies and greater injury risk.",
  threatRank:
    "Threat rating from E (easy) to A (deadly). It determines enemy strength and casualty risk.",
  intel:
    "How much your team knows about the target. Higher intel reveals enemy positions and reduces ambush chance.",
  intelLow: "Minimal recon. Expect surprises and hidden threats.",
  intelModerate: "Partial recon. Some enemy positions are known, but gaps remain.",
  intelHigh: "Thorough recon. Enemy layout is mapped with minimal unknowns.",
  cohesion:
    "How well the team works together. High cohesion boosts coordination and reduces friendly fire.",
  reward: "Cash payout on successful completion.",
  risk: "Estimated danger to deployed operators. Factors in threat level and team readiness.",
  revealProgress:
    "How much of the operation site has been explored. Reaching 100% completes the mission.",
  duration: "Estimated time to complete the operation.",
  interested: "Operators who have evaluated this opportunity and are willing to volunteer.",
  committed: "Operators who have formally committed to this operation.",
  recommended: "Suggested team size based on threat level.",
} as const;

export const OPERATOR_TIPS = {
  morale:
    "Willingness to fight. Low morale increases refusal risk and reduces combat effectiveness.",
  loyalty: "Attachment to the guild. Low loyalty makes operators more likely to desert or disobey.",
  readiness: "Overall combat preparedness. Combines training, equipment, and current condition.",
  fatigue: "Physical exhaustion. High fatigue reduces performance and increases injury risk.",
  stress: "Mental strain. High stress lowers morale recovery and can trigger breakdowns.",
} as const;

const ROLE_META = {
  "role:field_lead": {
    label: "Field Lead",
    shortLabel: "Lead",
    tip: "Frontline commander. Boosts team cohesion and directs tactics in combat.",
  },
  "role:scout": {
    label: "Scout",
    tip: "Recon specialist. Reveals the map faster and detects ambushes before they trigger.",
  },
  "role:medic": {
    label: "Medic",
    tip: "Combat medic. Reduces injury severity and stabilizes wounded operators mid-raid.",
  },
  "role:bruiser": { label: "Bruiser", tip: "" },
  "role:infiltrator": { label: "Infiltrator", tip: "" },
  "role:strategist": { label: "Strategist", tip: "" },
  "role:reception": { label: "Reception", tip: "" },
  "role:recruitment": { label: "Recruitment", tip: "" },
  "role:general": { label: "General", tip: "" },
  "role:unknown": { label: "Unknown", tip: "" },
} satisfies DisplayRegistry;

const SPECIALTY_META = {
  "focus:field_lead": {
    label: "Leadership",
    tip: "Specializes in command and coordination under pressure.",
  },
  "focus:scout": {
    label: "Recon",
    tip: "Specializes in reconnaissance and threat detection.",
  },
  "focus:medic": {
    label: "Field Medicine",
    tip: "Specializes in battlefield triage and emergency care.",
  },
  "focus:extraction": {
    label: "Extraction",
    tip: "Specializes in recovering assets and pulling teams out of danger.",
  },
  "focus:containment": {
    label: "Containment",
    tip: "Specializes in stabilizing volatile sites before they escalate.",
  },
  "focus:frontline": {
    label: "Frontline",
    tip: "Specializes in holding space and absorbing pressure for the squad.",
  },
} satisfies DisplayRegistry;

const INTEL_META = {
  low: { label: "Low", tip: RAID_TIPS.intelLow },
  moderate: { label: "Moderate", tip: RAID_TIPS.intelModerate },
  high: { label: "High", tip: RAID_TIPS.intelHigh },
} satisfies DisplayRegistry;

const NARRATIVE_TAG_META = {
  "boss:boss/sewer-warden": {
    label: "Sewer Warden",
    tip: "Dungeon boss. A tough guardian lurking beneath the streets.",
  },
  "boss:boss/tunneler-brood-mother": {
    label: "Tunneler Brood-Mother",
    tip: "Dungeon boss. Breeds waves of burrowing creatures.",
  },
  "boss:boss/phantom-stalker": {
    label: "Phantom Stalker",
    tip: "Dungeon boss. An elusive predator that strikes from the dark.",
  },
  "boss:resilience-pierce": {
    label: "Armor Pierce",
    tip: "Boss ignores part of your operators' resilience.",
  },
  "boss:recovery-suppress": {
    label: "Recovery Block",
    tip: "Boss suppresses healing and recovery during the fight.",
  },
  "boss:speed-drain": {
    label: "Speed Drain",
    tip: "Boss saps your operators' speed, slowing their actions.",
  },
  "boss:summon-pressure": {
    label: "Summon Pressure",
    tip: "Boss calls reinforcements to overwhelm your squad.",
  },
  "boss:intel-resist": {
    label: "Intel Resist",
    tip: "Boss resists scouting. Intel confidence is less accurate.",
  },
  "boss:area-damage": {
    label: "Area Damage",
    tip: "Boss hits multiple operators at once.",
  },
  "boss:defeated": {
    label: "Boss Defeated",
    tip: "The boss encounter was cleared.",
  },
  "boss:weakness-exploited": {
    label: "Weakness Exploited",
    tip: "Your team found and exploited the boss's vulnerability.",
  },
} satisfies DisplayRegistry;

const CONTRACT_HINT_META = {
  "threat:clustered": { label: "Clustered", tip: "Expect dense groups of hostiles." },
  "threat:hazard": { label: "Hazardous", tip: "Environmental danger is a major part of the site." },
  "threat:mobile": {
    label: "Mobile",
    tip: "Threats can reposition quickly and collapse on weak targets.",
  },
  "threat:ambush": { label: "Ambush", tip: "Expect concealed enemies and surprise pressure." },
  "threat:unstable": { label: "Unstable", tip: "Conditions can shift fast and punish slow teams." },
  "threat:hostile": { label: "Hostile", tip: "Direct aggression is expected throughout the site." },
  "hazard:flooding": { label: "Flooding", tip: "" },
  "hazard:low-visibility": { label: "Low Visibility", tip: "" },
  "hazard:fumes": { label: "Fumes", tip: "" },
  "hazard:poor-footing": { label: "Poor Footing", tip: "" },
  "hazard:spatial-distortion": { label: "Spatial Distortion", tip: "" },
  "hazard:noise": { label: "Noise", tip: "" },
  "hazard:entanglement": { label: "Entanglement", tip: "" },
  "hazard:pollen": { label: "Pollen", tip: "" },
  "hazard:pressure": { label: "Pressure", tip: "" },
  "hazard:entrapment": { label: "Entrapment", tip: "" },
  "hazard:falling-debris": { label: "Falling Debris", tip: "" },
  "hazard:structural-collapse": { label: "Structural Collapse", tip: "" },
  "hazard:electrical": { label: "Electrical", tip: "" },
  "hazard:magnetic-interference": { label: "Magnetic Interference", tip: "" },
  // Enemy family display names
  "enemy-family/tunnel-crawlers": { label: "Tunnel Crawlers", tip: "Burrowing pack predators." },
  "enemy-family/concrete-sentinels": {
    label: "Concrete Sentinels",
    tip: "Armored constructs that hold ground.",
  },
  "enemy-family/chalk-swarms": { label: "Chalk Swarms", tip: "Fragile but numerous flying pests." },
  "enemy-family/vine-constructs": {
    label: "Vine Constructs",
    tip: "Organic tanglers that slow and entrap.",
  },
  "enemy-family/aquatic-horrors": {
    label: "Aquatic Horrors",
    tip: "Waterborne threats lurking in flooded areas.",
  },
  "enemy-family/mannequin-stalkers": {
    label: "Mannequin Stalkers",
    tip: "Uncanny ambush predators that blend with surroundings.",
  },
  "enemy-family/rebar-constructs": {
    label: "Rebar Constructs",
    tip: "Heavy industrial scrap given violent purpose.",
  },
  "enemy-family/conduit-crawlers": {
    label: "Conduit Crawlers",
    tip: "Electrical parasites that channel current.",
  },
  // Boss family display names
  "boss-family/tunnel-brood": {
    label: "Tunnel Brood",
    tip: "Boss. A massive burrowing hive-mother.",
  },
  "boss-family/garage-warden": {
    label: "The Garage Warden",
    tip: "Boss. A territorial heavy guarding the lower levels.",
  },
  "boss-family/the-principal": {
    label: "The Principal",
    tip: "Boss. An authoritarian figure enforcing twisted order.",
  },
  "boss-family/the-curator": {
    label: "The Curator",
    tip: "Boss. An obsessive collector of lost things.",
  },
  "boss-family/the-exhibit": {
    label: "The Exhibit",
    tip: "Boss. A living display piece that refuses to be ignored.",
  },
  "boss-family/the-floor-manager": {
    label: "The Floor Manager",
    tip: "Boss. An overseer who demands ruthless efficiency.",
  },
  "boss-family/the-foreman": {
    label: "The Foreman",
    tip: "Boss. A relentless taskmaster of rebar and concrete.",
  },
  "boss-family/the-transformer": {
    label: "The Transformer",
    tip: "Boss. A volatile entity channeling raw electrical power.",
  },
} satisfies DisplayRegistry;

const ENCOUNTER_STATUS_META = {
  stabilized: {
    label: "Stabilized",
    tip: "This actor is being kept on their feet and is harder to drop immediately.",
  },
  guarded: {
    label: "Guarded",
    tip: "Incoming damage can be redirected or softened by a defensive ally.",
  },
  suppressed: {
    label: "Suppressed",
    tip: "Pressure from the enemy is limiting the actor's effectiveness.",
  },
  taunted: {
    label: "Taunted",
    tip: "This actor is being baited into focusing the wrong target.",
  },
  marked: {
    label: "Marked",
    tip: "The target is exposed and easier for the squad to exploit.",
  },
} satisfies DisplayRegistry;

const ENCOUNTER_CONDITION_META = {
  alive: { label: "Active", tip: "" },
  incapacitated: { label: "Down", tip: "This actor can no longer act." },
  retreated: { label: "Retreated", tip: "This actor has left the encounter." },
  stabilized: {
    label: "Stabilized",
    tip: "This actor is barely holding on but still recoverable.",
  },
} satisfies DisplayRegistry;

const ENCOUNTER_ACTOR_KIND_META = {
  operator: { label: "Operator", tip: "" },
  boss: { label: "Boss", tip: "" },
  add: { label: "Enemy", tip: "" },
  summon: { label: "Summon", tip: "" },
} satisfies DisplayRegistry;

const REQUIREMENT_TYPE_META = {
  resource_min: { label: "Resource Requirement", tip: "Requires a minimum amount of a resource." },
  building_tier_min: { label: "Building Tier", tip: "Requires the HQ to reach a specific tier." },
  room_count_min: { label: "Room Count", tip: "Requires a minimum number of built rooms." },
  room_tier_min: { label: "Room Tier", tip: "Requires a room to reach a specific tier." },
  staff_role_min: { label: "Staff Role", tip: "Requires staff assigned in a specific role." },
  operator_count_min: { label: "Operator Count", tip: "Requires a minimum number of operators." },
  template_tag_required: {
    label: "Room Tag",
    tip: "Requires a specific room or staffing capability tag to be unlocked.",
  },
} satisfies DisplayRegistry;

const EFFECT_TYPE_META = {
  add_room_slot: { label: "Room Slot", tip: "Adds another room slot to the building." },
  unlock_room_template: {
    label: "Room Unlock",
    tip: "Unlocks a new room type for construction.",
  },
  unlock_room_tier: {
    label: "Room Tier Unlock",
    tip: "Unlocks a higher room upgrade tier.",
  },
  grant_operator_slot: {
    label: "Operator Slot",
    tip: "Increases how many operators can be rostered.",
  },
  modify_room_capacity: {
    label: "Room Capacity",
    tip: "Raises how many people the room can support.",
  },
  modify_need_rate: {
    label: "Need Rate",
    tip: "Changes how quickly a tracked need rises or falls.",
  },
  modify_attraction_weight: {
    label: "Recruit Interest",
    tip: "Makes a role or focus more likely to appear in the recruit pool.",
  },
  modify_recovery_rate: {
    label: "Recovery Rate",
    tip: "Speeds up how quickly injuries recover.",
  },
  modify_training_rate: {
    label: "Training Rate",
    tip: "Improves how quickly training benefits accrue.",
  },
  modify_morale: { label: "Morale", tip: "Adjusts morale output or recovery." },
  modify_resource_income: {
    label: "Resource Income",
    tip: "Increases the amount of a resource gained over time.",
  },
  modify_resource_cost: {
    label: "Resource Cost",
    tip: "Reduces or increases the resource cost of related actions.",
  },
  modify_loyalty: { label: "Loyalty", tip: "Adjusts loyalty output or recovery." },
  modify_scalar: {
    label: "Scalar Modifier",
    tip: "Adjusts an internal gameplay scalar through a shared tuning path.",
  },
} satisfies DisplayRegistry;

const INCIDENT_CATEGORY_META = {
  personnel_conflict: { label: "Personnel Conflict", tip: "" },
  injury_setback: { label: "Injury Setback", tip: "" },
  rival_poaching: { label: "Rival Poaching", tip: "" },
  contract_deadline: { label: "Contract Deadline", tip: "" },
  morale_surge: { label: "Morale Surge", tip: "" },
  room_tension: { label: "Room Tension", tip: "" },
  regulatory_scrutiny: { label: "Regulatory Scrutiny", tip: "" },
} satisfies DisplayRegistry;

export type NarrativeTagMeta = DisplayMeta;

export function getIdentifierLabel(identifier: string): string {
  return humanizeIdentifier(identifier);
}

export function getLocationMeta(locationId: string): DisplayMeta {
  return resolveDisplayMeta(locationId, LOCATION_META);
}

export function getLocationLabel(locationId: string): string {
  return getLocationMeta(locationId).label;
}

export function getResourceMeta(resourceId: string): DisplayMeta {
  return resolveDisplayMeta(resourceId, RESOURCE_META);
}

export function getRoleMeta(roleTag: string): DisplayMeta {
  return resolveDisplayMeta(roleTag, ROLE_META);
}

export function getSpecialtyMeta(specialtyTag: string): DisplayMeta {
  return resolveDisplayMeta(specialtyTag, SPECIALTY_META);
}

export function getIntelMeta(confidence: string): DisplayMeta {
  return resolveDisplayMeta(confidence, INTEL_META, titleCase);
}

export function getNarrativeTagMeta(tag: string): NarrativeTagMeta {
  return resolveDisplayMeta(tag, NARRATIVE_TAG_META);
}

export function getTagMeta(tag: string): DisplayMeta {
  return resolveDisplayMeta(tag, TAG_META);
}

export function getTagTip(tag: string): string {
  return getTagMeta(tag).tip;
}

export function getToneMeta(tone: string): DisplayMeta {
  return resolveDisplayMeta(tone, TONE_META, titleCase);
}

export function getToneTip(tone: string): string {
  return getToneMeta(tone).tip;
}

export function getSignalMeta(signal: string): DisplayMeta {
  return resolveDisplayMeta(signal, SIGNAL_META, titleCase);
}

export function getSignalTip(signal: string): string {
  return getSignalMeta(signal).tip;
}

export function getCultureSummaryLabel(summary: string): string {
  return summary
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (TONE_META[part]) return getToneMeta(part).label;
      return getSignalMeta(part).label;
    })
    .join(", ");
}

export function getContractHintMeta(hintId: string): DisplayMeta {
  return resolveDisplayMeta(hintId, CONTRACT_HINT_META);
}

export function getAbilityMeta(abilityId: string): DisplayMeta {
  return resolveDisplayMeta(abilityId, {}, humanizeIdentifier);
}

export function getStatusMeta(statusId: string): DisplayMeta {
  return resolveDisplayMeta(statusId, ENCOUNTER_STATUS_META, titleCase);
}

export function getEncounterConditionMeta(condition: string): DisplayMeta {
  return resolveDisplayMeta(condition, ENCOUNTER_CONDITION_META, titleCase);
}

export function getEncounterActorKindMeta(kind: string): DisplayMeta {
  return resolveDisplayMeta(kind, ENCOUNTER_ACTOR_KIND_META, titleCase);
}

export function getWeaknessTargetMeta(target: string): DisplayMeta {
  if (target.startsWith("role:")) return getRoleMeta(target);
  return resolveDisplayMeta(target, {}, humanizeIdentifier);
}

export function getRequirementTypeMeta(type: string): DisplayMeta {
  return resolveDisplayMeta(type, REQUIREMENT_TYPE_META, titleCase);
}

export function getEffectTypeMeta(type: string): DisplayMeta {
  return resolveDisplayMeta(type, EFFECT_TYPE_META, titleCase);
}

export function getIncidentCategoryMeta(category: string): DisplayMeta {
  return resolveDisplayMeta(category, INCIDENT_CATEGORY_META, titleCase);
}

export function getRequirementLabel(req: { type: string; [key: string]: unknown }): string {
  switch (req.type) {
    case "resource_min":
      return `${req.minimum} ${getResourceMeta(String(req.resourceId)).label}`;
    case "building_tier_min":
      return `${getIdentifierLabel(String(req.buildingId))} tier ${req.minimum}`;
    case "room_count_min":
      return `${req.minimum} ${humanizeTemplateIdentifier(String(req.roomId))}`;
    case "room_tier_min":
      return `${humanizeTemplateIdentifier(String(req.roomId))} tier ${req.minimum}`;
    case "staff_role_min":
      return `${req.minimum} ${getTagMeta(String(req.roleTag)).label}`;
    case "operator_count_min":
      return `${req.minimum} operator${Number(req.minimum) === 1 ? "" : "s"}`;
    case "template_tag_required":
      return getTagMeta(String(req.tag)).label;
    default:
      return getRequirementTypeMeta(req.type).label;
  }
}

export function getEffectLabel(eff: { type: string; [key: string]: unknown }): string {
  switch (eff.type) {
    case "add_room_slot":
      return `+${eff.amount} room slot${Number(eff.amount) === 1 ? "" : "s"}`;
    case "unlock_room_template":
      return `Unlock ${humanizeTemplateIdentifier(String(eff.roomId))}`;
    case "unlock_room_tier":
      return `Unlock ${humanizeTemplateIdentifier(String(eff.roomId))} tier ${eff.tier}`;
    case "modify_room_capacity":
      return `+${eff.amount} room capacity`;
    case "modify_need_rate":
      return `${getIdentifierLabel(String(eff.needId))} rate x${eff.multiplier}`;
    case "modify_attraction_weight": {
      const tag = String(eff.tag);
      const tagLabel = tag.startsWith("role:")
        ? getRoleMeta(tag).label
        : tag.startsWith("focus:")
          ? getSpecialtyMeta(tag).label
          : getTagMeta(tag).label;
      const signedAmount = Number(eff.amount) > 0 ? `+${eff.amount}` : String(eff.amount);
      return `${signedAmount} ${tagLabel} interest`;
    }
    case "modify_recovery_rate":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} recovery`;
    case "modify_training_rate":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} training`;
    case "modify_morale":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} morale`;
    case "modify_resource_income":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} ${getResourceMeta(String(eff.resourceId)).label} income`;
    case "modify_resource_cost":
      return `${getResourceMeta(String(eff.resourceId)).label} cost x${Number(eff.multiplier).toFixed(2)}`;
    case "grant_operator_slot":
      return `+${eff.amount} operator slot${Number(eff.amount) === 1 ? "" : "s"}`;
    case "modify_loyalty":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} loyalty`;
    case "modify_scalar":
      return `${getIdentifierLabel(String(eff.path))} ${eff.mode === "multiply" ? "x" : "+"}${eff.value}`;
    default:
      return getEffectTypeMeta(eff.type).label;
  }
}
