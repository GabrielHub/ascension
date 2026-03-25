function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function projectVisitorRecruitMorale(quality: number): number {
  return clamp(52 + quality * 0.2, 40, 80);
}

export function projectVisitorRecruitLoyalty(expectedLoyalty: number): number {
  return clamp(expectedLoyalty, 35, 85);
}
