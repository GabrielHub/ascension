export const HQ_TIME_OF_DAY_PHASES = ["sunrise", "day", "sunset", "night"] as const;

export type HqTimeOfDayPhase = (typeof HQ_TIME_OF_DAY_PHASES)[number];

/**
 * Darkest ground-tile fill per phase — used as the canvas/SVG background
 * so isometric diamond edges blend seamlessly into the void.
 */
export const BACKDROP_BASE_FILLS: Readonly<Record<HqTimeOfDayPhase, string>> = {
  sunrise: "#181410",
  day: "#24242e",
  sunset: "#161010",
  night: "#0a0a0e",
};

/**
 * Map minuteOfDay (0-1439) to canonical time-of-day phase.
 *
 * - sunrise: 05:00-07:59 (300-479)
 * - day:     08:00-17:59 (480-1079)
 * - sunset:  18:00-19:59 (1080-1199)
 * - night:   20:00-04:59 (1200-1439, 0-299)
 */
export function resolveTimeOfDayPhase(minuteOfDay: number): HqTimeOfDayPhase {
  if (minuteOfDay >= 300 && minuteOfDay <= 479) return "sunrise";
  if (minuteOfDay >= 480 && minuteOfDay <= 1079) return "day";
  if (minuteOfDay >= 1080 && minuteOfDay <= 1199) return "sunset";
  return "night";
}
