import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { resolveRuntimeSession, type RuntimeRouteRequest, type RuntimeSession } from "./session";

export interface RuntimeSessionState {
  status: "loading" | "ready" | "error";
  session?: RuntimeSession;
  errorMessage?: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to open the requested runtime session.";
}

export function useRuntimeSession(request: RuntimeRouteRequest): RuntimeSessionState {
  const [state, setState] = useState<RuntimeSessionState>({
    status: "loading",
  });

  const publishReadySession = useEffectEvent((session: RuntimeSession) => {
    startTransition(() => {
      setState({
        status: "ready",
        session,
      });
    });
  });

  const publishErrorState = useEffectEvent((error: unknown) => {
    startTransition(() => {
      setState({
        status: "error",
        errorMessage: getErrorMessage(error),
      });
    });
  });

  useEffect(() => {
    let disposed = false;
    let cleanupSession: (() => void) | undefined;

    setState({
      status: "loading",
    });

    void (async () => {
      try {
        const session = await resolveRuntimeSession(request);

        if (disposed) {
          session.dispose();
          return;
        }

        const unsubscribe = session.subscribe((nextSession) => {
          if (disposed) {
            return;
          }

          publishReadySession(nextSession);
        });

        session.lifecycle.startAutoTick();

        cleanupSession = () => {
          unsubscribe();
          session.dispose();
        };

        publishReadySession(session);
      } catch (error) {
        if (!disposed) {
          publishErrorState(error);
        }
      }
    })();

    return () => {
      disposed = true;
      cleanupSession?.();
    };
  }, [request.mode, request.slotId, request.guildName, request.playerName]);

  return state;
}
