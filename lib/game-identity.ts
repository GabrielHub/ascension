export interface GameIdentity {
  playerName: string;
  guildName: string;
}

export const DEFAULT_PLAYER_NAME = "Boss";
export const DEFAULT_GUILD_NAME = "Bodega Guild";
export const MAX_PLAYER_NAME_LENGTH = 32;
export const MAX_GUILD_NAME_LENGTH = 40;

interface NormalizeIdentityOptions {
  playerNameFallback?: string;
  guildNameFallback?: string;
}

function normalizeIdentityValue(
  value: string | undefined,
  fallback: string,
  maxLength: number,
): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeGameIdentity(
  input: Partial<GameIdentity> = {},
  options: NormalizeIdentityOptions = {},
): GameIdentity {
  return {
    playerName: normalizeIdentityValue(
      input.playerName,
      options.playerNameFallback ?? DEFAULT_PLAYER_NAME,
      MAX_PLAYER_NAME_LENGTH,
    ),
    guildName: normalizeIdentityValue(
      input.guildName,
      options.guildNameFallback ?? DEFAULT_GUILD_NAME,
      MAX_GUILD_NAME_LENGTH,
    ),
  };
}

export function formatIdentityText(text: string, identity: GameIdentity): string {
  return text
    .replaceAll("{playerName}", identity.playerName)
    .replaceAll("{guildName}", identity.guildName);
}
