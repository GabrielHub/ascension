export interface OperatorVariant {
  name: string;
  role: string;
  build: "broad" | "lean" | "medium";
}

export interface RolePalette {
  skin: string;
  skinShadow: string;
  hair: string;
  clothing: string;
  clothingLight: string;
  accent: string;
}

export const VARIANTS: OperatorVariant[] = [
  { name: "Kael", role: "Bruiser", build: "broad" },
  { name: "Mira", role: "Infiltrator", build: "lean" },
  { name: "Soren", role: "Strategist", build: "medium" },
];

export const PALETTES: Record<string, RolePalette> = {
  Bruiser: {
    skin: "#d4b896",
    skinShadow: "#b89a78",
    hair: "#2a1f18",
    clothing: "#3d2c20",
    clothingLight: "#5a4030",
    accent: "#c8a84c",
  },
  Infiltrator: {
    skin: "#c4a882",
    skinShadow: "#a89068",
    hair: "#1a1a20",
    clothing: "#1a2440",
    clothingLight: "#263358",
    accent: "#2a3555",
  },
  Strategist: {
    skin: "#e0c8a8",
    skinShadow: "#c4ae8e",
    hair: "#4a3628",
    clothing: "#2a3555",
    clothingLight: "#384872",
    accent: "#c8a84c",
  },
};

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
