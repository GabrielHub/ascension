import { SvgPlaygroundPage } from "../ui/svg-playground-page";

export function meta() {
  return [
    { title: "Ascension | SVG Playground" },
    {
      name: "description",
      content: "Operator SVG style playground — comparison, iteration, and validation.",
    },
  ];
}

export default function SvgPlaygroundRoute() {
  return <SvgPlaygroundPage />;
}
