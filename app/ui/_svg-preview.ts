import { useEffect, useRef, useState } from "react";

const svgFetchCache = new Map<string, Promise<string>>();
const SVG_ASSETS_CHANGED_EVENT = "ascension:svg-assets-changed";

interface SvgAssetChangedPayload {
  path?: string;
}

function stripQuery(value: string): string {
  return value.split("?")[0];
}

function matchesChangedSvg(src: string, payload: SvgAssetChangedPayload | undefined): boolean {
  return !payload?.path || stripQuery(payload.path) === stripQuery(src);
}

function resolveSvgFetchUrl(src: string, revision: number): string {
  if (!import.meta.env.DEV || revision === 0) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}svgRev=${revision}`;
}

function fetchSvgCached(src: string, revision: number): Promise<string> {
  const cacheKey = `${src}::${revision}`;
  const cached = svgFetchCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetch(resolveSvgFetchUrl(src, revision))
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      return response.text();
    })
    .finally(() => {
      // Keep the cache scoped to in-flight requests so local SVG edits still refresh without a hard
      // reload while duplicate consumers share the same fetch.
      svgFetchCache.delete(cacheKey);
    });

  svgFetchCache.set(cacheKey, promise);
  return promise;
}

export function useSvgFetch(src: string | null, enabled = true) {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.hot || !src || !enabled) return;

    function onSvgAssetsChanged(payload: SvgAssetChangedPayload | undefined) {
      if (src && matchesChangedSvg(src, payload)) {
        setRevision((current) => current + 1);
      }
    }

    import.meta.hot.on(SVG_ASSETS_CHANGED_EVENT, onSvgAssetsChanged);
    return () => import.meta.hot?.off(SVG_ASSETS_CHANGED_EVENT, onSvgAssetsChanged);
  }, [enabled, src]);

  useEffect(() => {
    if (!src || !enabled) {
      setSvgText(null);
      setError(false);
      return;
    }

    setSvgText(null);
    setError(false);
    let cancelled = false;

    fetchSvgCached(src, revision)
      .then((text) => {
        if (!cancelled) setSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, revision, src]);

  return { svgText, error };
}

export function useLazyVisible<T extends Element = HTMLDivElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return { ref, visible };
}
