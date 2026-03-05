import { Client } from 'discord.js';
import { getLastRankedMatchId, getMatchResult } from './riot';
import { isRankedDefeat, buildShameMessage } from './shame';
import { sendMessage } from './discord';

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

  return buildShameMessage(gameName, match);
}

export async function pollPlayer(
  client: Client,
  channelId: string,
  puuid: string,
  gameName: string,
  state: { lastMatchId: string | null }
): Promise<void> {
  const currentMatchId = await getLastRankedMatchId(puuid);

  if (!hasNewMatch(state.lastMatchId, currentMatchId)) return;

  state.lastMatchId = currentMatchId;

  const match = await getMatchResult(currentMatchId as string, puuid);
  if (!isRankedDefeat(match)) return;

  await sendMessage(client, channelId, buildShameMessage(gameName, match));
}
