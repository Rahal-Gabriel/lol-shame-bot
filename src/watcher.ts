import { Client } from 'discord.js';
import { getLastRankedMatchId, getMatchResult } from './riot';
import { isRankedDefeat, buildShameMessage, buildWinMessage } from './shame';
import { sendMessage } from './discord';
import { withRetry } from './retry';

const RIOT_RETRIES = 3;
const RIOT_RETRY_DELAY_MS = 2_000;

export function hasNewMatch(lastMatchId: string | null, currentMatchId: string | null): boolean {
  return currentMatchId !== null && currentMatchId !== lastMatchId;
}

export async function checkPlayer(
  puuid: string,
  gameName: string,
  lastMatchId: string | null
): Promise<string | null> {
  const currentMatchId = await getLastRankedMatchId(puuid);

  if (!hasNewMatch(lastMatchId, currentMatchId)) return null;

  const match = await getMatchResult(currentMatchId as string, puuid);

  if (!isRankedDefeat(match)) return null;

  return buildShameMessage(gameName);
}

export async function pollPlayer(
  client: Client,
  channelId: string,
  puuid: string,
  gameName: string,
  state: { lastMatchId: string | null }
): Promise<void> {
  const currentMatchId = await withRetry(
    () => getLastRankedMatchId(puuid),
    RIOT_RETRIES,
    RIOT_RETRY_DELAY_MS
  );

  if (!hasNewMatch(state.lastMatchId, currentMatchId)) return;

  state.lastMatchId = currentMatchId;

  const match = await withRetry(
    () => getMatchResult(currentMatchId as string, puuid),
    RIOT_RETRIES,
    RIOT_RETRY_DELAY_MS
  );
  const message = isRankedDefeat(match)
    ? buildShameMessage(gameName)
    : buildWinMessage(gameName);

  await sendMessage(client, channelId, message);
}
