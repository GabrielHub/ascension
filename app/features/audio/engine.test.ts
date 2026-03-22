import { beforeEach, describe, expect, it, vi } from "vitest";

const toneState = vi.hoisted(() => ({
  contextState: "suspended" as "suspended" | "running",
  startCalls: 0,
}));

const cueState = vi.hoisted(() => ({
  playCalls: [] as string[],
  stopCalls: [] as string[],
}));

const musicState = vi.hoisted(() => ({
  started: false,
  disposed: false,
}));

vi.mock("tone", () => {
  class MockChannel {
    volume: { value: number };

    constructor(options: { volume?: number } = {}) {
      this.volume = { value: options.volume ?? 0 };
    }

    toDestination() {
      return this;
    }

    dispose() {
      return undefined;
    }
  }

  return {
    Channel: MockChannel,
    getContext: () => ({ state: toneState.contextState }),
    start: vi.fn(async () => {
      toneState.startCalls += 1;
      toneState.contextState = "running";
    }),
  };
});

vi.mock("./cues", () => {
  const createAmbienceCue = (id: string) => ({
    id,
    kind: "ambience" as const,
    play: ({
      registerActiveAmbienceStop,
    }: {
      registerActiveAmbienceStop: (stop: () => void) => void;
    }) => {
      cueState.playCalls.push(id);
      registerActiveAmbienceStop(() => {
        cueState.stopCalls.push(id);
      });
    },
  });

  return {
    STARTER_CUE_MAP: new Map([
      [
        "room.place",
        {
          id: "room.place",
          kind: "sfx" as const,
          play: () => {
            cueState.playCalls.push("room.place");
          },
        },
      ],
      ["ambience.hq.base", createAmbienceCue("ambience.hq.base")],
      ["ambience.raid.base", createAmbienceCue("ambience.raid.base")],
    ]),
  };
});

vi.mock("./music", () => ({
  createMusicScheduler: () => ({
    get playing() {
      return musicState.started;
    },
    start() {
      musicState.started = true;
    },
    stop() {
      musicState.started = false;
    },
    dispose() {
      musicState.disposed = true;
      musicState.started = false;
    },
  }),
}));

import { createAudioEngine } from "./engine";

beforeEach(() => {
  toneState.contextState = "suspended";
  toneState.startCalls = 0;
  cueState.playCalls = [];
  cueState.stopCalls = [];
  musicState.started = false;
  musicState.disposed = false;
});

describe("audio engine", () => {
  it("requires unlock before playing cues", async () => {
    const engine = createAudioEngine();

    engine.playCue("room.place");
    expect(cueState.playCalls).toEqual([]);

    await engine.unlock();
    engine.playCue("room.place");

    expect(toneState.startCalls).toBe(1);
    expect(cueState.playCalls).toEqual(["room.place"]);

    engine.dispose();
  });

  it("does not restart an ambience bed that is already active", async () => {
    const engine = createAudioEngine();
    await engine.unlock();

    engine.startAmbience("ambience.hq.base");
    engine.startAmbience("ambience.hq.base");

    expect(cueState.playCalls).toEqual(["ambience.hq.base"]);
    expect(cueState.stopCalls).toEqual([]);
    expect(engine.activeAmbienceId).toBe("ambience.hq.base");

    engine.dispose();
  });

  it("stops the previous ambience before switching beds", async () => {
    const engine = createAudioEngine();
    await engine.unlock();

    engine.startAmbience("ambience.hq.base");
    engine.startAmbience("ambience.raid.base");

    expect(cueState.playCalls).toEqual(["ambience.hq.base", "ambience.raid.base"]);
    expect(cueState.stopCalls).toEqual(["ambience.hq.base"]);

    engine.stopAmbience();

    expect(cueState.stopCalls).toEqual(["ambience.hq.base", "ambience.raid.base"]);
    expect(engine.activeAmbienceId).toBeNull();

    engine.dispose();
  });

  it("starts and stops music via the scheduler", async () => {
    const engine = createAudioEngine();
    await engine.unlock();

    expect(engine.isMusicPlaying).toBe(false);

    engine.startMusic();
    expect(engine.isMusicPlaying).toBe(true);

    engine.stopMusic();
    expect(engine.isMusicPlaying).toBe(false);

    engine.dispose();
    expect(musicState.disposed).toBe(true);
  });
});
