import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  synths: [] as Array<{
    volume: { value: number };
    dispose: ReturnType<typeof vi.fn>;
    triggerAttackRelease: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("tone", () => {
  class MockPolySynth {
    volume = { value: 0 };
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();
    connect = vi.fn().mockReturnThis();

    constructor() {
      mockState.synths.push(this);
    }
  }

  return {
    PolySynth: MockPolySynth,
    Synth: class {},
    now: vi.fn(() => 0),
  };
});

import * as Tone from "tone";
import { createMusicScheduler } from "./music";

const bus = {} as Tone.Channel;

beforeEach(() => {
  vi.useFakeTimers();
  mockState.synths = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("music scheduler", () => {
  it("is not playing on creation", () => {
    const sched = createMusicScheduler({ Tone, bus });
    expect(sched.playing).toBe(false);
    sched.dispose();
  });

  it("plays a phrase after the initial delay", () => {
    const sched = createMusicScheduler({ Tone, bus });
    sched.start();
    expect(sched.playing).toBe(true);

    // No phrase yet (waiting for initial delay 3-8s)
    expect(mockState.synths).toHaveLength(0);

    // Advance past maximum initial delay
    vi.advanceTimersByTime(9_000);

    // A phrase should have played (PolySynth created)
    expect(mockState.synths.length).toBeGreaterThanOrEqual(1);
    expect(mockState.synths[0].triggerAttackRelease).toHaveBeenCalled();

    sched.dispose();
  });

  it("stops and disposes active synths", () => {
    const sched = createMusicScheduler({ Tone, bus });
    sched.start();
    vi.advanceTimersByTime(9_000);

    expect(mockState.synths.length).toBeGreaterThanOrEqual(1);

    sched.stop();
    expect(sched.playing).toBe(false);

    for (const s of mockState.synths) {
      expect(s.dispose).toHaveBeenCalled();
    }

    sched.dispose();
  });

  it("does not play if stopped before initial delay", () => {
    const sched = createMusicScheduler({ Tone, bus });
    sched.start();
    sched.stop();

    vi.advanceTimersByTime(9_000);
    expect(mockState.synths).toHaveLength(0);

    sched.dispose();
  });

  it("ignores duplicate start calls", () => {
    const sched = createMusicScheduler({ Tone, bus });
    sched.start();
    sched.start();

    vi.advanceTimersByTime(9_000);
    expect(mockState.synths).toHaveLength(1);

    sched.dispose();
  });
});
