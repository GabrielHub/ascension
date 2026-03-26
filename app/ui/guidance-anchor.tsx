/**
 * Guidance anchor registry — React context + hooks for registering
 * and resolving UI anchors for the guidance system.
 *
 * UI components register anchors by ID. The guidance host queries
 * the registry to find targets for spotlight/coachmark rendering.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ── Types ────────────────────────────────────────────────────────────

export interface AnchorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorEntry {
  anchorId: string;
  element: HTMLElement;
  visible: boolean;
}

export interface AnchorRegistry {
  register(anchorId: string, element: HTMLElement): void;
  unregister(anchorId: string): void;
  resolve(anchorId: string): AnchorEntry | null;
  getBounds(anchorId: string): AnchorBounds | null;
}

// ── Context ──────────────────────────────────────────────────────────

const AnchorRegistryContext = createContext<AnchorRegistry | null>(null);

export function AnchorRegistryProvider({ children }: { children: React.ReactNode }) {
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const [version, setVersion] = useState(0);

  const registry: AnchorRegistry = useMemo(
    () => ({
      register(anchorId, element) {
        elementsRef.current.set(anchorId, element);
        setVersion((v) => v + 1);
      },
      unregister(anchorId) {
        elementsRef.current.delete(anchorId);
        setVersion((v) => v + 1);
      },
      resolve(anchorId) {
        const element = elementsRef.current.get(anchorId);
        if (!element) return null;
        const isVisible = element.offsetParent !== null || element.getClientRects().length > 0;
        return { anchorId, element, visible: isVisible };
      },
      getBounds(anchorId) {
        const element = elementsRef.current.get(anchorId);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        const isInViewport =
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        if (!isInViewport) return null;
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable: methods close over elementsRef
    [],
  );

  // version is read here to force consumers to re-evaluate after register/unregister
  void version;

  return (
    <AnchorRegistryContext.Provider value={registry}>{children}</AnchorRegistryContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────

export function useAnchorRegistry(): AnchorRegistry | null {
  return useContext(AnchorRegistryContext);
}

/**
 * Register a DOM element as a guidance anchor.
 * Returns a ref callback to attach to the target element.
 */
export function useGuidanceAnchor(anchorId: string): (element: HTMLElement | null) => void {
  const registry = useAnchorRegistry();
  const currentElementRef = useRef<HTMLElement | null>(null);

  const refCallback = useCallback(
    (element: HTMLElement | null) => {
      if (!registry) return;

      // Unregister previous element
      if (currentElementRef.current && currentElementRef.current !== element) {
        registry.unregister(anchorId);
      }

      if (element) {
        registry.register(anchorId, element);
        currentElementRef.current = element;
      } else {
        registry.unregister(anchorId);
        currentElementRef.current = null;
      }
    },
    [registry, anchorId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (registry && currentElementRef.current) {
        registry.unregister(anchorId);
      }
    };
  }, [registry, anchorId]);

  return refCallback;
}
