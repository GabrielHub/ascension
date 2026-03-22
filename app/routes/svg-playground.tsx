import { SvgPlaygroundPage } from "../ui/svg-playground-page";

export function meta() {
  return [
    { title: "Ascension | SVG Playground" },
    {
      name: "description",
      content:
        "SVG experimentation playground — operators, HQ angled-isometric environments, and visual asset review.",
    },
  ];
}

export default function SvgPlaygroundRoute() {
  return <SvgPlaygroundPage />;
}
