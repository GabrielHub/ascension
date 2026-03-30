/**
 * Asset browser panel — categorized, searchable list of HQ environment assets.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { EnvPartMeta } from "../environment-parts";
import {
  envPartSvgPath,
  getLoadedEnvParts,
  getLoadedEnvPartsIndex,
  getSceneReviewContract,
  searchEnvParts,
} from "../environment-parts";
import { glassPanelSubtleClass } from "../styles";
import type {
  AssetFilterCategory,
  AssetFilterStatus,
  BuilderAction,
  BuilderShell,
} from "./builder-types";
import { createPlacement } from "./builder-types";
import {
  buildScenePlacementOrigin,
  buildSvgPlacementMeta,
  defaultZIndexForAssetCategory,
  parseSvgViewBox,
  placementKindForAssetCategory,
} from "./builder-asset-meta";

// ── SVG thumbnail ───────────────────────────────────────────────────────

function AssetThumbnail({ url }: { url: string }) {
  const [didFail, setDidFail] = useState(false);

  if (didFail) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded border border-gold/10 bg-void/50">
        <div className="h-3 w-3 animate-pulse rounded-full bg-gold/20" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-gold/10 bg-void/50">
      <img
        src={url}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setDidFail(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

// ── Category filter tabs ────���───────────────────────────────────────────

const CATEGORIES: { value: AssetFilterCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "prop", label: "Props" },
  { value: "background", label: "BG" },
  { value: "scene", label: "Scenes" },
  { value: "structure", label: "Struct" },
  { value: "shell", label: "Shell" },
];

const STATUS_OPTIONS: { value: AssetFilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "exploration", label: "Explore" },
];

interface AssetBrowserProps {
  buildingId: string;
  shell: BuilderShell | null;
  dispatch: React.Dispatch<BuilderAction>;
}

const svgMetaCache = new Map<string, Promise<ReturnType<typeof buildSvgPlacementMeta> | null>>();

function loadSvgPlacementMeta(
  url: string,
): Promise<ReturnType<typeof buildSvgPlacementMeta> | null> {
  const cached = svgMetaCache.get(url);
  if (cached) {
    return cached;
  }

  const pending = fetch(url)
    .then((response) => (response.ok ? response.text() : Promise.reject()))
    .then((svgText) => {
      const viewBox = parseSvgViewBox(svgText);
      return viewBox ? buildSvgPlacementMeta(viewBox) : null;
    })
    .catch(() => null);

  svgMetaCache.set(url, pending);
  return pending;
}

function getDefaultPlacementCoords(
  kind: ReturnType<typeof placementKindForAssetCategory>,
  shell: BuilderShell | null,
) {
  if (!shell) {
    return { col: 5, row: 9 };
  }

  if (kind === "decoration") {
    return {
      col: shell.col + shell.cols + 1,
      row: shell.row + shell.rows + 1,
    };
  }

  return {
    col: shell.col + Math.floor(shell.cols / 2),
    row: shell.row + Math.floor(shell.rows / 2),
  };
}

export function AssetBrowser({ buildingId, shell, dispatch }: AssetBrowserProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetFilterCategory>("all");
  const [statusFilter, setStatusFilter] = useState<AssetFilterStatus>("approved");
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
  const buildingIdRef = useRef(buildingId);

  useEffect(() => {
    buildingIdRef.current = buildingId;
  }, [buildingId]);

  const partsIndex = useMemo(() => getLoadedEnvPartsIndex(buildingId), [buildingId]);
  const allParts = useMemo(() => getLoadedEnvParts(buildingId), [buildingId]);
  const sceneContract = useMemo(() => getSceneReviewContract(buildingId), [buildingId]);

  const filtered = useMemo(() => {
    let parts = searchEnvParts(allParts, {
      category: category === "all" ? undefined : (category as EnvPartMeta["category"]),
      status: statusFilter === "all" ? undefined : (statusFilter as EnvPartMeta["status"]),
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      parts = parts.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          (p.roomFamily && p.roomFamily.toLowerCase().includes(q)),
      );
    }

    return parts;
  }, [allParts, category, statusFilter, search]);

  const handlePlace = async (part: EnvPartMeta) => {
    if (pendingAssetId === part.id) {
      return;
    }

    const placementBuildingId = buildingId;
    const url = envPartSvgPath(part, partsIndex);
    const kind = placementKindForAssetCategory(part.category);
    const { col, row } = getDefaultPlacementCoords(kind, shell);

    setPendingAssetId(part.id);

    let placement = createPlacement(part.id, url, kind, col, row, {
      zIndex: defaultZIndexForAssetCategory(part.category),
    });

    if (part.category === "scene") {
      placement = createPlacement(part.id, url, kind, col, row, {
        anchorMode: "scene-origin",
        sceneOrigin: buildScenePlacementOrigin(sceneContract),
        width: sceneContract.canonicalViewBox.width,
        height: sceneContract.canonicalViewBox.height,
        zIndex: defaultZIndexForAssetCategory(part.category),
      });
    } else {
      const svgMeta = await loadSvgPlacementMeta(url);
      if (svgMeta) {
        placement = createPlacement(part.id, url, kind, col, row, {
          svgMeta,
          width: svgMeta.viewBox[2],
          height: svgMeta.viewBox[3],
          zIndex: defaultZIndexForAssetCategory(part.category),
        });
      }
    }

    if (buildingIdRef.current !== placementBuildingId) {
      setPendingAssetId((current) => (current === part.id ? null : current));
      return;
    }

    dispatch({ type: "ADD_PLACEMENT", placement });
    setPendingAssetId((current) => (current === part.id ? null : current));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gold/8 px-3 py-2">
        <h3 className="font-display text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Assets
        </h3>
      </div>

      {/* Search */}
      <div className="border-b border-gold/8 px-3 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          className="w-full rounded border border-gold/10 bg-void/60 px-2 py-1.5 text-xs text-silver placeholder:text-gold/25 focus:border-gold/30 focus:outline-none"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1 border-b border-gold/8 px-3 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              category === cat.value
                ? "bg-gold/15 text-gold"
                : "text-gold/40 hover:bg-gold/5 hover:text-gold/60"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1 border-b border-gold/8 px-3 py-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              statusFilter === opt.value
                ? "bg-frost/15 text-frost"
                : "text-gold/30 hover:text-gold/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto">
        {allParts.length === 0 ? (
          <div className="p-4 text-center text-xs text-gold/25">
            No environment asset pack is available for this building yet.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-gold/25">No assets match filters</div>
        ) : (
          <div className="space-y-px p-1">
            {filtered.map((part) => (
              <button
                key={part.id}
                onClick={() => handlePlace(part)}
                disabled={pendingAssetId === part.id}
                className={`${glassPanelSubtleClass} group flex w-full items-center gap-2 rounded-lg p-2 text-left transition-all hover:border-gold/15 hover:bg-gold/5`}
                title={`Click to place: ${part.id}`}
              >
                <AssetThumbnail url={envPartSvgPath(part, partsIndex)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-silver/90">
                    {part.id.split("/").pop()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded px-1 py-px text-xs leading-tight ${
                        part.status === "approved"
                          ? "bg-gold/10 text-gold/60"
                          : "bg-ember/10 text-ember/60"
                      }`}
                    >
                      {part.status}
                    </span>
                    <span className="truncate text-xs text-gold/30">{part.category}</span>
                  </div>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-xs text-gold/40">
                    {pendingAssetId === part.id ? "Placing..." : "+ Place"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gold/8 px-3 py-1.5">
        <span className="text-xs text-gold/30">{filtered.length} assets</span>
      </div>
    </div>
  );
}
