import { soa } from "bitecs";

export const GuildState = soa({
  reputation: [] as number[],
  treasury: [] as number[],
  intel: [] as number[],
});
