import fs from "node:fs";
import path from "node:path";

import {
  buildEarlyCampaignEconomyArtifacts,
  earlyCampaignEconomyLedgerSchema,
} from "../sim/tools/early-campaign-economy-ledger";

const outputDirectory = path.resolve("reports/economy");
const ledgerPath = path.join(outputDirectory, "early-campaign-ledger.v1.json");
const reportPath = path.join(outputDirectory, "early-campaign-report.md");

const artifacts = buildEarlyCampaignEconomyArtifacts();
earlyCampaignEconomyLedgerSchema.parse(artifacts.ledger);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(ledgerPath, artifacts.json, "utf8");
fs.writeFileSync(reportPath, `${artifacts.report}\n`, "utf8");

process.stdout.write(
  `Wrote ${path.relative(process.cwd(), ledgerPath)} and ${path.relative(process.cwd(), reportPath)}\n`,
);
