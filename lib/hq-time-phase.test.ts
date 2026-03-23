import { describe, expect, it } from "vitest";

import { resolveTimeOfDayPhase } from "./hq-time-phase";

describe("resolveTimeOfDayPhase", () => {
  it("maps minute 0 to night", () => {
    expect(resolveTimeOfDayPhase(0)).toBe("night");
  });

  it("maps minute 299 to night (last minute before sunrise)", () => {
    expect(resolveTimeOfDayPhase(299)).toBe("night");
  });

  it("maps minute 300 to sunrise (05:00)", () => {
    expect(resolveTimeOfDayPhase(300)).toBe("sunrise");
  });

  it("maps minute 479 to sunrise (07:59)", () => {
    expect(resolveTimeOfDayPhase(479)).toBe("sunrise");
  });

  it("maps minute 480 to day (08:00)", () => {
    expect(resolveTimeOfDayPhase(480)).toBe("day");
  });

  it("maps minute 1079 to day (17:59)", () => {
    expect(resolveTimeOfDayPhase(1079)).toBe("day");
  });

  it("maps minute 1080 to sunset (18:00)", () => {
    expect(resolveTimeOfDayPhase(1080)).toBe("sunset");
  });

  it("maps minute 1199 to sunset (19:59)", () => {
    expect(resolveTimeOfDayPhase(1199)).toBe("sunset");
  });

  it("maps minute 1200 to night (20:00)", () => {
    expect(resolveTimeOfDayPhase(1200)).toBe("night");
  });

  it("maps minute 1439 to night (23:59)", () => {
    expect(resolveTimeOfDayPhase(1439)).toBe("night");
  });
});
