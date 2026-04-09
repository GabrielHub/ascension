import { describe, expect, it } from "vitest";
import { getBossArtPath } from "./boss-art";
import { siteConceptTemplates } from "../../content/templates/site-concepts";

describe("boss art resolver", () => {
  it("resolves authored SVG paths for all bodega-era bosses", () => {
    expect(getBossArtPath("boss/tunneler-brood-mother")).toBe(
      "/data/svg-environments/raids/bosses/tunneler-brood-mother.svg",
    );
    expect(getBossArtPath("boss/sewer-warden")).toBe(
      "/data/svg-environments/raids/bosses/sewer-warden.svg",
    );
    expect(getBossArtPath("boss/phantom-stalker")).toBe(
      "/data/svg-environments/raids/bosses/phantom-stalker.svg",
    );
  });

  it("resolves reference bosses", () => {
    expect(getBossArtPath("boss/the-dispatcher")).toBe(
      "/data/svg-environments/raids/bosses/the-dispatcher.svg",
    );
    expect(getBossArtPath("boss/the-super")).toBe(
      "/data/svg-environments/raids/bosses/the-superintendent.svg",
    );
    expect(getBossArtPath("boss/the-superintendent")).toBe(
      "/data/svg-environments/raids/bosses/the-superintendent.svg",
    );
  });

  it("returns null for unknown boss IDs", () => {
    expect(getBossArtPath("boss/nonexistent")).toBeNull();
    expect(getBossArtPath("")).toBeNull();
  });

  it("every site concept boss has authored art", () => {
    const uniqueBossIds = [...new Set(siteConceptTemplates.map((site) => site.bossId))];

    for (const bossId of uniqueBossIds) {
      const path = getBossArtPath(bossId);
      expect(path, `missing art for ${bossId}`).not.toBeNull();
    }
  });
});
