import { SvgAssetViewerPage } from "../ui/svg-asset-viewer-page";

export function meta() {
  return [
    { title: "Ascension | SVG Asset Viewer" },
    {
      name: "description",
      content: "Browse shipped operator SVG assets — references, presets, and modular parts.",
    },
  ];
}

export default function SvgAssetsRoute() {
  return <SvgAssetViewerPage />;
}
