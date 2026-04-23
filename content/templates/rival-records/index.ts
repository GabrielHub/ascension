import { aListMediaRivalRecord } from "./a-list-media";
import { asgardRivalRecord } from "./asgard";
import { ashfordCapitalPartnersRivalRecord } from "./ashford-capital-partners";
import { goldenPhoenixPalaceRivalRecord } from "./golden-phoenix-palace";
import { keystoneRivalRecord } from "./keystone";
import { kinRivalRecord } from "./kin";
import { nyuKresselRivalRecord } from "./nyu-kressel";
import { straitsMeridianGroupRivalRecord } from "./straits-meridian-group";
import { theYardRivalRecord } from "./the-yard";
import { ufcOmegaRivalRecord } from "./ufc-omega";
import { vGuildRivalRecord } from "./v-guild";

import type { RivalRecord } from "./schema";

export const rivalRecords = [
  goldenPhoenixPalaceRivalRecord,
  straitsMeridianGroupRivalRecord,
  aListMediaRivalRecord,
  ashfordCapitalPartnersRivalRecord,
  asgardRivalRecord,
  kinRivalRecord,
  vGuildRivalRecord,
  nyuKresselRivalRecord,
  theYardRivalRecord,
  ufcOmegaRivalRecord,
  keystoneRivalRecord,
] satisfies readonly RivalRecord[];
