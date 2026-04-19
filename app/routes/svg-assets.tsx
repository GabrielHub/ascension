import { SvgAssetViewerPage } from "../ui/svg-asset-viewer-page";

export function meta() {
  return [
    { title: "Ascension | SVG Asset Viewer" },
    {
      name: "description",
      content:
        "Preview live, library, and reference SVG assets through the shared runtime contract for HQ, raids, and operator rendering.",
    },
  ];
}

export default function SvgAssetsRoute() {
  return <SvgAssetViewerPage />;
}
