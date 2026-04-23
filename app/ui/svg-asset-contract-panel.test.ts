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
      categoryKey: "hq-room-scene",
      categoryLabel: "Room Scenes",
      roomFamily: "operations",
    });
  });

  it("uses one live room-scene category key across scene assets and room bindings", () => {
    const roomSceneCategoryKeys = new Set(
      records
        .filter((record) => record.family === "hq" && record.usage === "live")
        .filter((record) => record.categoryLabel === "Room Scenes")
        .map((record) => record.categoryKey),
    );

    expect(roomSceneCategoryKeys).toEqual(new Set(["hq-room-scene"]));
  });

  it("filters live HQ room scenes by building and room-scene category", () => {
    const filtered = filterSvgAssetViewerRecords(records, {
      usage: "live",
      family: "hq",
      category: "hq-room-scene",
      building: "building/bodega",
      search: "register",
    });

    expect(filtered.length).toBeGreaterThan(1);
    expect(filtered.every((record) => record.categoryKey === "hq-room-scene")).toBe(true);
    expect(filtered.every((record) => record.buildingId === "building/bodega")).toBe(true);
    expect(filtered.every((record) => record.kind === "binding")).toBe(true);
  });

  it("suppresses duplicate live asset rows when a runtime binding already owns the same SVG", () => {
    const filtered = filterSvgAssetViewerRecords(records, {
      usage: "live",
      family: "hq",
      category: "hq-room-scene",
      building: "",
      search: "counter",
    });

    const counterRows = filtered.filter(
      (record) =>
        record.sourcePath === "/data/svg-environments/hq/bodega/recipes/scene-the-counter.svg",
    );

    expect(counterRows).toHaveLength(1);
    expect(counterRows[0]?.kind).toBe("binding");
    expect(counterRows[0]?.label).toBe("Counter 1");
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

  it("keeps room-state comparison available even when filters only show one state", () => {
    const filtered = filterSvgAssetViewerRecords(records, {
      usage: "live",
      family: "hq",
      category: "hq-room-scene",
      building: "building/bodega",
      search: "dining area 1",
    });

    expect(filtered).toHaveLength(1);

    const compareIds = getRoomSceneComparisonIds(records, filtered[0] ?? null);

    expect(compareIds).toEqual([
      "hq-room:building/bodega:room/dining_area:tier_1:room-state/dining-area:1",
      "hq-room:building/bodega:room/dining_area:tier_1:room-state/dining-area:2",
      "hq-room:building/bodega:room/dining_area:tier_1:room-state/dining-area:3",
    ]);
  });
});
