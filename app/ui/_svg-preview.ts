import { useEffect, useRef, useState } from "react";

const svgFetchCache = new Map<string, Promise<string>>();

function fetchSvgCached(src: string): Promise<string> {
  const cached = svgFetchCache.get(src);
  if (cached) return cached;

  const promise = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      return response.text();
    })
    .finally(() => {
      // Keep the cache scoped to in-flight requests so local SVG edits still refresh without a hard
      // reload while duplicate consumers share the same fetch.
      svgFetchCache.delete(src);
    });

  svgFetchCache.set(src, promise);
  return promise;
}

export function useSvgFetch(src: string | null, enabled = true) {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || !enabled) {
      setSvgText(null);
      setError(false);
      return;
    }

    setSvgText(null);
    setError(false);
    let cancelled = false;

    fetchSvgCached(src)
      .then((text) => {
        if (!cancelled) setSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, src]);

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
