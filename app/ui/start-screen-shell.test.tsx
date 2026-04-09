import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { StartScreenShell } from "./start-screen-shell";

vi.mock("app/features/save-slots/use-save-slots", () => ({
  useSaveSlots: () => ({
    slots: [
      { slotId: "slot/1", slotNumber: 1, state: "empty" },
      { slotId: "slot/2", slotNumber: 2, state: "empty" },
      { slotId: "slot/3", slotNumber: 3, state: "empty" },
    ],
    status: "ready",
    errorMessage: undefined,
    busySlotId: undefined,
    reload: async () => {},
    deleteSlot: async () => {},
  }),
}));

vi.mock("app/features/settings", async () => {
  const actual =
    await vi.importActual<typeof import("app/features/settings")>("app/features/settings");
  return {
    ...actual,
    useGameSettings: () => ({
      settings: actual.DEFAULT_GAME_SETTINGS,
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    }),
  };
});

describe("start screen dev entrypoint", () => {
  it("renders the Sandbox link to preview mode", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StartScreenShell />
      </MemoryRouter>,
    );

    expect(html).toContain(">Sandbox<");
    expect(html).toContain('href="/game?mode=preview"');
  });

  it("renders the SVG Tools link to the asset viewer", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StartScreenShell />
      </MemoryRouter>,
    );

    expect(html).toContain(">SVG Tools<");
    expect(html).toContain('href="/svg-assets"');
  });

  it("renders the Scene Builder link", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StartScreenShell />
      </MemoryRouter>,
    );

    expect(html).toContain(">Scene Builder<");
    expect(html).toContain('href="/scene-builder"');
  });

  it("renders the AI Playground link", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StartScreenShell />
      </MemoryRouter>,
    );

    expect(html).toContain(">AI Playground<");
    expect(html).toContain('href="/ai-playground"');
  });

  it("renders the Settings button on the start screen footer", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StartScreenShell />
      </MemoryRouter>,
    );

    expect(html).toContain(">Settings<");
    expect(html).toContain("<button");
  });
});
