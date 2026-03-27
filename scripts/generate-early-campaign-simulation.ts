import fs from "node:fs";
import path from "node:path";

import {
  buildEarlyCampaignSimulationArtifacts,
  earlyCampaignSimulationSchema,
} from "../sim/tools/early-campaign-simulation";

const outputDirectory = path.resolve("reports/economy");
const jsonPath = path.join(outputDirectory, "early-campaign-simulation.v1.json");
const reportPath = path.join(outputDirectory, "early-campaign-simulation-report.md");

const artifacts = await buildEarlyCampaignSimulationArtifacts();
earlyCampaignSimulationSchema.parse(artifacts.suite);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(jsonPath, artifacts.json, "utf8");
fs.writeFileSync(reportPath, `${artifacts.report}\n`, "utf8");

process.stdout.write(
  `Wrote ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), reportPath)}\n`,
);
