import { describe, expect, it } from "vitest";

import { validateSvgText } from "./validate-svg-assets";

describe("validateSvgText", () => {
  it("flags XML comments with double-hyphen bodies", () => {
    const issues = validateSvgText(
      "broken.svg",
      `<svg xmlns="http://www.w3.org/2000/svg"><!-- ---------- bad ---------- --><rect /></svg>`,
    );

    expect(issues).toEqual([
      expect.objectContaining({
        filePath: "broken.svg",
        line: 1,
        message: "Invalid XML comment contains `--` in its body.",
      }),
    ]);
  });

  it("allows normal XML comments", () => {
    expect(
      validateSvgText(
        "ok.svg",
        `<svg xmlns="http://www.w3.org/2000/svg"><!-- Room scene comment --><rect /></svg>`,
      ),
    ).toEqual([]);
  });
});
