import { isTauri } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  }
}

export function isDesktopHostEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    (isTauri() || window.isTauri === true || window.__TAURI_INTERNALS__ !== undefined)
  );
}
