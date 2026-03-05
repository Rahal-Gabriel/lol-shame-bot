import { Queue } from 'bullmq';
import { getLastRankedMatchId, getMatchResult } from '../riot/client';
import { isRankedDefeat, buildShameMessage } from './shame';
import { withRetry } from '../infra/retry';
import { MatchJobData } from '../queue/queue';

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
  queue: Queue<MatchJobData>,
  puuid: string,
  gameName: string,
  tagLine: string,
  state: { lastMatchId: string | null }
): Promise<boolean> {
  const currentMatchId = await withRetry(
    () => getLastRankedMatchId(puuid),
    RIOT_RETRIES,
    RIOT_RETRY_DELAY_MS
  );

  if (!hasNewMatch(state.lastMatchId, currentMatchId)) return false;

  state.lastMatchId = currentMatchId;

  await queue.add('process-match', {
    puuid,
    matchId: currentMatchId as string,
    gameName,
    tagLine,
  });

  return true;
}
