import fs from "node:fs";
import path from "node:path";

import {
  buildMidgameEconomyArtifacts,
  midgameEconomyLedgerSchema,
} from "../sim/tools/midgame-economy-ledger";

const outputDirectory = path.resolve("reports/economy");
const ledgerPath = path.join(outputDirectory, "midgame-ledger.v1.json");
const reportPath = path.join(outputDirectory, "midgame-report.md");

const artifacts = buildMidgameEconomyArtifacts();
midgameEconomyLedgerSchema.parse(artifacts.ledger);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(ledgerPath, artifacts.json, "utf8");
fs.writeFileSync(reportPath, `${artifacts.report}\n`, "utf8");

process.stdout.write(
  `Wrote ${path.relative(process.cwd(), ledgerPath)} and ${path.relative(process.cwd(), reportPath)}\n`,
);
