import { beforeEach, describe, expect, it, vi } from "vitest";

const toneState = vi.hoisted(() => ({
  contextState: "suspended" as "suspended" | "running",
  startCalls: 0,
}));

const cueState = vi.hoisted(() => ({
  playCalls: [] as string[],
}));

const musicState = vi.hoisted(() => ({
  started: false,
  disposed: false,
  currentState: "hq",
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
    ]),
  };
});

vi.mock("./music", () => ({
  createMusicScheduler: () => ({
    get playing() {
      return musicState.started;
    },
    get currentState() {
      return musicState.currentState;
    },
    start() {
      musicState.started = true;
    },
    stop() {
      musicState.started = false;
    },
    setState(nextState: string) {
      musicState.currentState = nextState;
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
  musicState.started = false;
  musicState.disposed = false;
  musicState.currentState = "hq";
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

  it("forwards music state changes to the scheduler", async () => {
    const engine = createAudioEngine();
    await engine.unlock();

    expect(engine.musicState).toBe("hq");

    engine.setMusicState("raid-exploration");

    expect(engine.musicState).toBe("raid-exploration");

    engine.dispose();
  });
});
