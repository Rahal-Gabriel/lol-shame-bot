import axios from 'axios';
import { requireEnv } from '../config';
import { MatchResult, RANKED_SOLO_DUO, RANKED_FLEX } from '../watcher/shame';
import { RateLimiter } from './rateLimit';

const ACCOUNT_BASE = 'https://americas.api.riotgames.com';
const MATCH_BASE = 'https://americas.api.riotgames.com';
const TIMEOUT_MS = 10_000;

// Riot API: 20 req/s → mínimo 50ms entre requisições
const limiter = new RateLimiter(50);

function config() {
  return { headers: { 'X-Riot-Token': requireEnv('RIOT_API_KEY') }, timeout: TIMEOUT_MS };
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<{ puuid: string }> {
  const { data } = await limiter.throttle(() => axios.get(
    `${ACCOUNT_BASE}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
    config()
  ));
  return { puuid: data.puuid };
}

export async function getLastRankedMatchId(
  puuid: string,
  queue: number = RANKED_SOLO_DUO
): Promise<string | null> {
  const { data } = await limiter.throttle(() => axios.get(
    `${MATCH_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
    { ...config(), params: { queue, start: 0, count: 1 } }
  ));
  return data[0] ?? null;
}

export async function getLastNRankedMatchIds(
  puuid: string,
  count: number,
  queue: number = RANKED_SOLO_DUO
): Promise<string[]> {
  const { data } = await limiter.throttle(() => axios.get(
    `${MATCH_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
    { ...config(), params: { queue, start: 0, count } }
  ));
  return data;
}

export async function getLastRankedMatchIdBothQueues(puuid: string): Promise<string | null> {
  const [solo, flex] = await Promise.all([
    getLastRankedMatchId(puuid, RANKED_SOLO_DUO),
    getLastRankedMatchId(puuid, RANKED_FLEX),
  ]);
  if (!solo && !flex) return null;
  if (!solo) return flex;
  if (!flex) return solo;
  const soloNum = parseInt(solo.split('_')[1], 10);
  const flexNum = parseInt(flex.split('_')[1], 10);
  return soloNum >= flexNum ? solo : flex;
}

export async function getLastNRankedMatchIdsBothQueues(
  puuid: string,
  count: number
): Promise<string[]> {
  const [solo, flex] = await Promise.all([
    getLastNRankedMatchIds(puuid, count, RANKED_SOLO_DUO),
    getLastNRankedMatchIds(puuid, count, RANKED_FLEX),
  ]);
  return [...solo, ...flex]
    .sort((a, b) => parseInt(b.split('_')[1], 10) - parseInt(a.split('_')[1], 10))
    .slice(0, count);
}

export async function getMatchResult(matchId: string, puuid: string): Promise<MatchResult> {
  const { data } = await limiter.throttle(() => axios.get(
    `${MATCH_BASE}/lol/match/v5/matches/${matchId}`,
    config()
  ));

  const participant = data.info.participants.find(
    (p: { puuid: string }) => p.puuid === puuid
  );
  if (!participant) {
    throw new Error(`Participant ${puuid} not found in match ${matchId}`);
  }

  return {
    matchId,
    won: participant.win,
    queueId: data.info.queueId,
    champion: participant.championName,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    gameDurationSecs: data.info.gameDuration,
  };
}
