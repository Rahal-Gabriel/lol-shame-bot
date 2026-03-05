import axios from 'axios';
import { requireEnv } from './config';
import { MatchResult } from './shame';

const ACCOUNT_BASE = 'https://americas.api.riotgames.com';
const MATCH_BASE = 'https://americas.api.riotgames.com';
const RANKED_SOLO_DUO = 420;
const TIMEOUT_MS = 10_000;

function config() {
  return { headers: { 'X-Riot-Token': requireEnv('RIOT_API_KEY') }, timeout: TIMEOUT_MS };
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<{ puuid: string }> {
  const { data } = await axios.get(
    `${ACCOUNT_BASE}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
    config()
  );
  return { puuid: data.puuid };
}

export async function getLastRankedMatchId(puuid: string): Promise<string | null> {
  const { data } = await axios.get(
    `${MATCH_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
    { ...config(), params: { queue: RANKED_SOLO_DUO, start: 0, count: 1 } }
  );
  return data[0] ?? null;
}

export async function getMatchResult(matchId: string, puuid: string): Promise<MatchResult> {
  const { data } = await axios.get(
    `${MATCH_BASE}/lol/match/v5/matches/${matchId}`,
    config()
  );

  const participant = data.info.participants.find(
    (p: { puuid: string }) => p.puuid === puuid
  );
  if (!participant) {
    throw new Error(`Participant ${puuid} not found in match ${matchId}`);
  }

  return { matchId, won: participant.win, queueId: data.info.queueId };
}
