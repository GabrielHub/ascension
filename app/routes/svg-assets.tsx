import { SvgAssetViewerPage } from "../ui/svg-asset-viewer-page";

export function meta() {
  return [
    { title: "Ascension | SVG Asset Viewer" },
    {
      name: "description",
      content:
        "Browse shipped SVG assets — operator parts, operator recipes, and HQ environment pieces.",
    },
  ];
}

export default function SvgAssetsRoute() {
  return <SvgAssetViewerPage />;
}
