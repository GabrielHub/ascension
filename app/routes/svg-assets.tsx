import { SvgAssetViewerPage } from "../ui/svg-asset-viewer-page";

export function meta() {
  return [
    { title: "Ascension | SVG Asset Viewer" },
    {
      name: "description",
      content:
        "Browse the full shipped SVG catalog — operator parts, HQ scenes, raid art, reference assets, and supporting environment files.",
    },
  ];
}

export default function SvgAssetsRoute() {
  return <SvgAssetViewerPage />;
}
