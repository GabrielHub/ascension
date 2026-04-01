import { describe, expect, it } from "vitest";

import { RUNTIME_CUE_IDS } from "lib/runtime-cues";
import { AUDIO_CUE_IDS, STARTER_CUES } from "./cues";

describe("audio cue ids", () => {
  it("includes every simulation-emitted runtime cue id", () => {
    const audioCueIds = new Set(AUDIO_CUE_IDS);

    for (const cueId of RUNTIME_CUE_IDS) {
      expect(audioCueIds.has(cueId)).toBe(true);
    }
  });

  it("does not include standalone ambience cue ids", () => {
    for (const cueId of AUDIO_CUE_IDS) {
      expect(cueId.startsWith("ambience.")).toBe(false);
    }
  });
});

describe("starter cues", () => {
  it("keeps the cue catalog limited to gameplay cues", () => {
    for (const cue of STARTER_CUES) {
      expect(cue.kind).toBe("sfx");
      expect(cue.id.startsWith("ambience.")).toBe(false);
    }
  });
});
