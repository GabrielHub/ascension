import { Link } from "react-router";

import { getSceneReviewContract } from "./environment-parts";
import { SvgFileCatalogPanel } from "./svg-file-catalog-panel";

// ── Re-exported for svg-playground-page ──────────────────────────────────

export function SceneContractSummary({
  contract,
}: {
  contract: ReturnType<typeof getSceneReviewContract>;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.32)] p-3 text-sm text-silver/70 sm:grid-cols-2">
      <div>
        <span className="text-gold/60">Building</span>
        <div className="text-silver-bright">{contract.building}</div>
      </div>
      <div>
        <span className="text-gold/60">Tile size</span>
        <div className="text-silver-bright">
          {contract.tileWidth} x {contract.tileHeight}
        </div>
      </div>
      <div>
        <span className="text-gold/60">Wall height</span>
        <div className="text-silver-bright">{contract.wallHeight}</div>
      </div>
      <div>
        <span className="text-gold/60">Origin</span>
        <div className="text-silver-bright">
          {contract.canonicalOrigin[0]}, {contract.canonicalOrigin[1]}
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="text-gold/60">View box</span>
        <div className="text-silver-bright">
          {contract.canonicalViewBox.minX}, {contract.canonicalViewBox.minY},{" "}
          {contract.canonicalViewBox.width} x {contract.canonicalViewBox.height}
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="text-gold/60">Room footprint</span>
        <div className="text-silver-bright">
          {contract.roomFootprint.cols} x {contract.roomFootprint.rows}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function SvgAssetViewerPage() {
  return (
    <div className="flex h-dvh flex-col bg-void">
      <header className="animate-enter shrink-0 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.7)] backdrop-blur-xl">
        <div className="flex items-center gap-4 px-5 py-3">
          <Link to="/" className="btn-ghost text-xs">
            &larr; back
          </Link>
          <div className="h-4 w-px bg-[rgba(200,168,76,0.08)]" />
          <h1 className="flex-1 font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
            SVG Asset Viewer
          </h1>
          <span className="hidden text-xs text-silver/30 sm:block">
            Catalog from <code className="text-gold/40">public/data/**/*.svg</code>
          </span>
          <Link to="/svg-playground" className="btn-ghost text-xs">
            playground &rarr;
          </Link>
        </div>
      </header>
      <SvgFileCatalogPanel />
    </div>
  );
}
