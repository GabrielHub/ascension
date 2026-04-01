import { describe, expect, it } from "vitest";

import { selectMusicState, type AudioStateInputs } from "./state";

const base: AudioStateInputs = {
  activeTab: "hq",
  hasActiveEncounter: false,
  hasBossApproach: false,
  hasActiveRaids: false,
  isReviewingResult: false,
};

describe("selectMusicState", () => {
  it("defaults to hq on the hq tab", () => {
    expect(selectMusicState(base)).toBe("hq");
  });

  it("returns operations on the operations tab", () => {
    expect(selectMusicState({ ...base, activeTab: "operations" })).toBe("operations");
  });

  it("returns raid-exploration when raids are active", () => {
    expect(selectMusicState({ ...base, hasActiveRaids: true })).toBe("raid-exploration");
  });

  it("returns boss-tension when boss approach is pending", () => {
    expect(selectMusicState({ ...base, hasBossApproach: true })).toBe("boss-tension");
  });

  it("returns boss-encounter when encounter is active", () => {
    expect(selectMusicState({ ...base, hasActiveEncounter: true })).toBe("boss-encounter");
  });

  it("returns decompression when reviewing results", () => {
    expect(selectMusicState({ ...base, isReviewingResult: true })).toBe("decompression");
  });

  it("boss-encounter takes priority over boss-tension", () => {
    expect(selectMusicState({ ...base, hasActiveEncounter: true, hasBossApproach: true })).toBe(
      "boss-encounter",
    );
  });

  it("boss-tension takes priority over raid-exploration", () => {
    expect(selectMusicState({ ...base, hasBossApproach: true, hasActiveRaids: true })).toBe(
      "boss-tension",
    );
  });

  it("raid-exploration takes priority over decompression", () => {
    expect(selectMusicState({ ...base, hasActiveRaids: true, isReviewingResult: true })).toBe(
      "raid-exploration",
    );
  });
});
