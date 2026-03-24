import { useEffect, useEffectEvent, useRef, useState } from "react";

export type ScreenWakeLockStatus = "unsupported" | "idle" | "requesting" | "active" | "error";

export interface ScreenWakeLockState {
  status: ScreenWakeLockStatus;
  errorMessage?: string;
}

interface WakeLockSentinelLike extends EventTarget {
  release(): Promise<void>;
}

interface WakeLockNavigator extends Navigator {
  wakeLock?: {
    request(type: "screen"): Promise<WakeLockSentinelLike>;
  };
}

function getWakeLockNavigator(): WakeLockNavigator | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator as WakeLockNavigator;
}

export function useScreenWakeLock(enabled: boolean): ScreenWakeLockState {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [state, setState] = useState<ScreenWakeLockState>(() => {
    const wakeLockNavigator = getWakeLockNavigator();
    if (!wakeLockNavigator?.wakeLock) {
      return { status: "unsupported" };
    }

    return { status: "idle" };
  });
  const setIdleState = useEffectEvent(() => {
    setState((currentState) =>
      currentState.status === "idle" && currentState.errorMessage === undefined
        ? currentState
        : { status: "idle" },
    );
  });

  const releaseWakeLock = useEffectEvent(async () => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      if (state.status !== "unsupported") {
        setIdleState();
      }
      return;
    }

    sentinelRef.current = null;
    try {
      await sentinel.release();
    } catch {
      // Best effort release only.
    }

    setIdleState();
  });

  const requestWakeLock = useEffectEvent(async () => {
    const wakeLockNavigator = getWakeLockNavigator();
    if (!wakeLockNavigator?.wakeLock) {
      setState({ status: "unsupported" });
      return;
    }

    if (!enabled) {
      await releaseWakeLock();
      return;
    }

    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      setIdleState();
      return;
    }

    if (sentinelRef.current) {
      setState({ status: "active" });
      return;
    }

    setState({ status: "requesting" });

    try {
      const sentinel = await wakeLockNavigator.wakeLock.request("screen");
      if (!enabled || (typeof document !== "undefined" && document.visibilityState !== "visible")) {
        await sentinel.release();
        setIdleState();
        return;
      }

      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
        setIdleState();
      });
      setState({ status: "active" });
    } catch (error) {
      setState({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Wake lock request failed.",
      });
    }
  });

  useEffect(() => {
    void requestWakeLock();

    return () => {
      void releaseWakeLock();
    };
    // Effect Events are intentionally omitted from dependencies.
  }, [enabled]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Effect Events are intentionally omitted from dependencies.
  }, []);

  return state;
}
