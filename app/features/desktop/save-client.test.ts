import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_CONTENT_COMPATIBILITY, CURRENT_SAVE_SCHEMA_VERSION, SAVE_SLOT_IDS } from "save";
import { createBootstrapWorldSnapshot } from "sim";
import { templateRegistry } from "content/templates";

import { desktopSave } from "./save-client";
import { desktopBridge } from "./bridge";

vi.mock("./bridge", () => ({
  desktopBridge: {
    isAvailable: vi.fn(() => true),
    getEnvironment: vi.fn(),
    readSlotFiles: vi.fn(),
    writeSlotFile: vi.fn(),
    deleteSlotFiles: vi.fn(),
    exportJson: vi.fn(),
    importJson: vi.fn(),
  },
}));

function createSave(slotId: (typeof SAVE_SLOT_IDS)[number]) {
  return {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: `Guild ${slotId}`,
      playerName: "Boss",
      createdAt: "2026-03-24T00:00:00.000Z",
      lastPlayedAt: "2026-03-24T00:00:00.000Z",
    },
    world: createBootstrapWorldSnapshot(templateRegistry),
  };
}

describe("desktop save client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(desktopBridge.isAvailable).mockReturnValue(true);
  });

  it("recovers a slot from backup when the primary file is invalid", async () => {
    const backupSave = createSave("slot/1");

    vi.mocked(desktopBridge.readSlotFiles).mockImplementation(async (slotId) => ({
      slotId,
      primaryJson: slotId === "slot/1" ? "{not-valid-json" : null,
      backupJson: slotId === "slot/1" ? JSON.stringify(backupSave) : null,
    }));

    const slots = await desktopSave.listSlots();
    const slot = slots[0];

    expect(slot).toMatchObject({
      slotId: "slot/1",
      state: "occupied",
      diagnostic: {
        level: "warning",
      },
    });
    expect(vi.mocked(desktopBridge.writeSlotFile)).toHaveBeenCalledTimes(1);
  });

  it("throws when both primary and backup are unreadable", async () => {
    vi.mocked(desktopBridge.readSlotFiles).mockResolvedValue({
      slotId: "slot/1",
      primaryJson: "{not-valid-json",
      backupJson: "{also-invalid",
    });

    await expect(desktopSave.readSlot("slot/1")).rejects.toThrow(/unreadable|invalid/i);
  });

  it("imports a save into the requested slot id", async () => {
    const imported = createSave("slot/2");

    vi.mocked(desktopBridge.importJson).mockResolvedValue({
      cancelled: false,
      sourcePath: "C:\\temp\\save.json",
      json: JSON.stringify(imported),
    });

    await desktopSave.importSlot(undefined, "slot/3");

    expect(vi.mocked(desktopBridge.writeSlotFile)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(desktopBridge.writeSlotFile).mock.calls[0]?.[0]).toBe("slot/3");
    expect(vi.mocked(desktopBridge.writeSlotFile).mock.calls[0]?.[1]).toContain(
      '"slotId": "slot/3"',
    );
  });

  it("exports normalized save JSON through the native bridge", async () => {
    const save = createSave("slot/1");

    vi.mocked(desktopBridge.readSlotFiles).mockResolvedValue({
      slotId: "slot/1",
      primaryJson: JSON.stringify(save),
      backupJson: null,
    });
    vi.mocked(desktopBridge.exportJson).mockResolvedValue({
      cancelled: false,
      destinationPath: "C:\\exports\\ascension.json",
    });

    await desktopSave.exportSlot("slot/1");

    expect(vi.mocked(desktopBridge.exportJson)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(desktopBridge.exportJson).mock.calls[0]?.[0]).toContain('"slotId": "slot/1"');
  });
});
