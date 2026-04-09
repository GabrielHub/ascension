import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "./prompts";
import { PROMPT_CANON_SOURCE_PATHS, PROMPT_GUIDANCE_REFERENCES } from "./prompt-grounding";

describe("AI prompt grounding", () => {
  it("grounds incident framing in the world canon and explicit method steps", () => {
    const prompt = buildSystemPrompt("incident-framing");

    expect(prompt).toContain("workplace comedy under supernatural pressure");
    expect(prompt).toContain("Guilds are licensed private businesses");
    expect(prompt).toContain("Follow a fixed internal step order");
    expect(prompt).toContain("Return the final JSON object only");
  });

  it("grounds operator identity in approved assembly constraints", () => {
    const prompt = buildSystemPrompt("operator-identity");

    expect(prompt).toContain("Operator identity assembly may select from approved specialties");
    expect(prompt).toContain("The output must feel like an authored recruit packet");
    expect(prompt).toContain(
      "Appearance and gear choices must remain within the approved catalogs",
    );
  });

  it("tracks the repo docs and external guidance references used to shape prompts", () => {
    expect(PROMPT_CANON_SOURCE_PATHS).toContain("docs/world/premise-and-tone.md");
    expect(PROMPT_CANON_SOURCE_PATHS).toContain("docs/product/gameplay-systems.md");
    expect(PROMPT_GUIDANCE_REFERENCES).toContain(
      "https://developers.openai.com/api/docs/guides/prompt-guidance",
    );
  });
});
