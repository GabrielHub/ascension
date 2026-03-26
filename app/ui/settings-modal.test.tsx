import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_GAME_SETTINGS } from "app/features/settings";

import { SettingsModal } from "./settings-modal";

describe("settings modal", () => {
  it("renders audio and wake-lock controls", () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        settings={DEFAULT_GAME_SETTINGS}
        audioState="suspended"
        wakeLock={{ status: "idle" }}
        onClose={vi.fn()}
        onSfxVolumeChange={vi.fn()}
        onMusicVolumeChange={vi.fn()}
        onWakeLockToggle={vi.fn()}
        onTutorialEventsToggle={vi.fn()}
        onReplayOpeningGuidance={vi.fn()}
        onResetDefaults={vi.fn()}
      />,
    );

    expect(html).toContain("Settings");
    expect(html).toContain("Keep screen awake");
    expect(html).toContain("Audio");
    expect(html).toContain("Music");
    expect(html).toContain("Tutorial events");
    expect(html).toContain("reset opening");
  });
});
