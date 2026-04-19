import { describe, expect, it } from "vitest";

import { getSvgAssets, getSvgRuntimeBindings } from "lib/svg-asset-contract";

import { getLoadedEnvParts } from "./environment-parts";
import {
  buildSvgAssetViewerRecords,
  filterSvgAssetViewerRecords,
  getRoomSceneComparisonIds,
} from "./svg-asset-contract-panel";

describe("svg asset contract panel record model", () => {
  const records = buildSvgAssetViewerRecords(
    getSvgAssets(),
    getSvgRuntimeBindings(),
    getLoadedEnvParts(),
  );

  it("includes HQ room scene bindings with room metadata for filtering", () => {
    const registerScene = records.find(
      (record) =>
        record.binding?.kind === "hq-room-scene" &&
        record.binding.templateId === "room/register:tier_1" &&
        record.binding.roomStateId === "room-state/register:1",
    );

    expect(registerScene).toMatchObject({
      family: "hq",
      usage: "live",
      categoryLabel: "Room Scenes",
      roomFamily: "operations",
    });
  });

  it("filters live HQ room scenes by room search and room-scene category", () => {
    const filtered = filterSvgAssetViewerRecords(records, {
      usage: "live",
      family: "hq",
      category: "hq-room-scene",
      room: "operations",
      search: "register",
    });

    expect(filtered.length).toBeGreaterThan(1);
    expect(filtered.every((record) => record.binding?.kind === "hq-room-scene")).toBe(true);
    expect(filtered.every((record) => record.roomFamily === "operations")).toBe(true);
  });

  it("returns all room-state siblings for side-by-side comparison", () => {
    const registerScene = records.find(
      (record) =>
        record.binding?.kind === "hq-room-scene" &&
        record.binding.templateId === "room/register:tier_1" &&
        record.binding.roomStateId === "room-state/register:1",
    );

    const compareIds = getRoomSceneComparisonIds(records, registerScene ?? null);

    expect(compareIds.length).toBe(2);
    expect(compareIds).toContain(
      "hq-room:building/bodega:room/register:tier_1:room-state/register:1",
    );
    expect(compareIds).toContain(
      "hq-room:building/bodega:room/register:tier_1:room-state/register:2",
    );
  });
});
