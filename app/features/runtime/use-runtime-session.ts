import { startTransition, useCallback, useEffect, useState } from "react";

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

  const loadSession = useCallback(async () => {
    setState({
      status: "loading",
    });

    try {
      const session = await resolveRuntimeSession(request);

      startTransition(() => {
        setState({
          status: "ready",
          session,
        });
      });
    } catch (error) {
      startTransition(() => {
        setState({
          status: "error",
          errorMessage: getErrorMessage(error),
        });
      });
    }
  }, [request.mode, request.slotId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return state;
}
