import { soa } from "bitecs";

export const GuildState = soa({
  guildName: [] as string[],
  playerName: [] as string[],
  reputation: [] as number[],
  treasury: [] as number[],
  intel: [] as number[],
});
