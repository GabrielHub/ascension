export function visitorQualityToRank(quality: number): string {
  if (quality >= 85) return "A";
  if (quality >= 70) return "B";
  if (quality >= 55) return "C";
  if (quality >= 40) return "D";
  return "E";
}
