export interface RolePalette {
  skin: string;
  skinShadow: string;
  hair: string;
  clothing: string;
  clothingLight: string;
  accent: string;
}

export function dims(build: "broad" | "lean" | "medium") {
  switch (build) {
    case "broad":
      return { bodyW: 76, shoulderW: 92, headR: 26, neckW: 22 };
    case "lean":
      return { bodyW: 52, shoulderW: 64, headR: 22, neckW: 16 };
    case "medium":
      return { bodyW: 64, shoulderW: 78, headR: 24, neckW: 18 };
  }
}

// ── Portrait-parts palette and context types ──────────────────────────────

export type BuildType = "broad" | "lean" | "medium";
export type BuildDims = ReturnType<typeof dims>;

export interface PortraitPalette extends RolePalette {
  blush?: string;
  lipTint?: string;
  hairHighlight?: string;
  hairShadow?: string;
}

export interface SkinTone {
  skin: string;
  skinShadow: string;
}

export const SKIN_TONES: Record<string, SkinTone> = {
  "fair-warm": { skin: "#f0d4b8", skinShadow: "#d4b89c" },
  "fair-cool": { skin: "#e8d0c0", skinShadow: "#ccb4a0" },
  "light-warm": { skin: "#e0c8a8", skinShadow: "#c4ae8e" },
  "light-cool": { skin: "#d8c0a8", skinShadow: "#bca48c" },
  "medium-warm": { skin: "#d4b896", skinShadow: "#b89a78" },
  "medium-cool": { skin: "#c4a882", skinShadow: "#a89068" },
  "tan-warm": { skin: "#b89070", skinShadow: "#9c7658" },
  "tan-cool": { skin: "#a88068", skinShadow: "#8c6650" },
  "deep-warm": { skin: "#8a6848", skinShadow: "#705438" },
  "deep-cool": { skin: "#6a5040", skinShadow: "#503c30" },
};

/**
 * Expanded palette set for portrait recipes. Visual archetypes only —
 * `archetype:` taxonomy, not gameplay roles.
 */
export const PORTRAIT_PALETTES: Record<string, PortraitPalette> = {
  // ── Existing natural-hair palettes (with cel-shading) ──────────────────
  "warm-earth": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#2a1f18",
    hairHighlight: "#5a4838",
    hairShadow: "#140e0a",
    clothing: "#3d2c20",
    clothingLight: "#5a4030",
    accent: "#c8a84c",
  },
  "cool-dark": {
    skin: "#c4a882",
    skinShadow: "#a89068",
    hair: "#1a1a20",
    hairHighlight: "#3a3848",
    hairShadow: "#0a0a10",
    clothing: "#1a2440",
    clothingLight: "#263358",
    accent: "#2a3555",
  },
  "balanced-warm": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#4a3628",
    hairHighlight: "#7a6450",
    hairShadow: "#2a1c14",
    clothing: "#2a3555",
    clothingLight: "#384872",
    accent: "#c8a84c",
  },
  "crimson-edge": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#1a1014",
    hairHighlight: "#3a2028",
    hairShadow: "#0a0408",
    clothing: "#4a1828",
    clothingLight: "#6a2838",
    accent: "#c84848",
  },
  "steel-gray": {
    skin: "#c4a882",
    skinShadow: "#a89068",
    hair: "#2a2830",
    hairHighlight: "#50505e",
    hairShadow: "#141418",
    clothing: "#30303c",
    clothingLight: "#484854",
    accent: "#8898a8",
  },
  "forest-teal": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#1a2820",
    hairHighlight: "#3a5840",
    hairShadow: "#0a1408",
    clothing: "#1a3830",
    clothingLight: "#2a5048",
    accent: "#48a888",
  },
  "navy-silver": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#181828",
    hairHighlight: "#383848",
    hairShadow: "#080810",
    clothing: "#1a1a38",
    clothingLight: "#2a2a50",
    accent: "#a8b0c8",
  },
  "amber-warm": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#3a2818",
    hairHighlight: "#685038",
    hairShadow: "#1a1008",
    clothing: "#4a3020",
    clothingLight: "#685038",
    accent: "#d4a040",
  },
  // ── Colorful anime-hair palettes (MapleStory-inspired) ─────────────────
  "sakura-pink": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#e87098",
    hairHighlight: "#ffa8c8",
    hairShadow: "#b84870",
    clothing: "#2a2040",
    clothingLight: "#3a3058",
    accent: "#e87098",
  },
  "ocean-blue": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#4888d8",
    hairHighlight: "#80b8f8",
    hairShadow: "#2860a8",
    clothing: "#141830",
    clothingLight: "#202848",
    accent: "#4888d8",
  },
  "violet-storm": {
    skin: "#c4a882",
    skinShadow: "#a89068",
    hair: "#8858c8",
    hairHighlight: "#b888f0",
    hairShadow: "#5830a0",
    clothing: "#1a1428",
    clothingLight: "#2a2040",
    accent: "#a878e0",
  },
  "frost-silver": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#c8d0e0",
    hairHighlight: "#f0f4ff",
    hairShadow: "#98a0b8",
    clothing: "#182838",
    clothingLight: "#283848",
    accent: "#88c8e8",
  },
  "ember-red": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#d84030",
    hairHighlight: "#f87860",
    hairShadow: "#a82818",
    clothing: "#281410",
    clothingLight: "#3a2018",
    accent: "#f86840",
  },
  "neon-lime": {
    skin: "#c4a882",
    skinShadow: "#a89068",
    hair: "#68c848",
    hairHighlight: "#a0f078",
    hairShadow: "#389828",
    clothing: "#141c14",
    clothingLight: "#1c2c1c",
    accent: "#68c848",
  },
  "golden-sun": {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#e8c040",
    hairHighlight: "#f8e080",
    hairShadow: "#b89020",
    clothing: "#2a2018",
    clothingLight: "#3a3028",
    accent: "#e8c040",
  },
  "midnight-rose": {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#c83878",
    hairHighlight: "#f068a0",
    hairShadow: "#982858",
    clothing: "#180c18",
    clothingLight: "#281828",
    accent: "#e848a0",
  },
};

export interface PortraitContext {
  cx: number;
  headY: number;
  hr: number;
  ow: number;
  outline: string;
  irisColor: string;
  p: PortraitPalette;
  d: BuildDims;
}

export interface HeadShapeSpec {
  headYOffset: number;
  hrOffset: number;
  ow: number;
  outline: string;
  irisWarm: string;
  irisCool: string;
}

export const HEAD_SHAPE_SPECS: Record<string, HeadShapeSpec> = {
  "angular-jaw": {
    headYOffset: 0,
    hrOffset: 0,
    ow: 2.0,
    outline: "#0a0a0c",
    irisWarm: "#9a8040",
    irisCool: "#4a6888",
  },
  "soft-oval": {
    headYOffset: 4,
    hrOffset: 3,
    ow: 1.3,
    outline: "#2a2228",
    irisWarm: "#b8944c",
    irisCool: "#5a78a8",
  },
  "moderate-jaw": {
    headYOffset: 2,
    hrOffset: 1,
    ow: 1.6,
    outline: "#151318",
    irisWarm: "#a89048",
    irisCool: "#5a7898",
  },
};

export function buildPortraitContext(
  headShape: string,
  palette: PortraitPalette,
  skinTone: SkinTone,
  build: BuildType,
): PortraitContext {
  const spec = HEAD_SHAPE_SPECS[headShape] ?? HEAD_SHAPE_SPECS["angular-jaw"];
  const d = dims(build);
  const p: PortraitPalette = {
    ...palette,
    skin: skinTone.skin,
    skinShadow: skinTone.skinShadow,
  };
  const isWarmAccent = palette.accent !== "#2a3555" && palette.accent !== "#8898a8";
  return {
    cx: 60,
    headY: 40 + spec.headYOffset,
    hr: d.headR + spec.hrOffset,
    ow: spec.ow,
    outline: spec.outline,
    irisColor: isWarmAccent ? spec.irisWarm : spec.irisCool,
    p,
    d,
  };
}
