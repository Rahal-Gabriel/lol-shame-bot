import Redis from 'ioredis';
import { PlayerStats } from '../players/stats';
import { log } from '../logger';

export interface BotState {
  byPuuid: Record<string, string | null>;
  stats: Record<string, PlayerStats>; // chave: "gameName#tagLine"
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const KEY = 'bot:state';

export async function loadState(): Promise<BotState> {
  try {
    const raw = await redis.get(KEY);
    if (raw === null) return { byPuuid: {}, stats: {} };
    const parsed = JSON.parse(raw) as Partial<BotState>;
    return { byPuuid: parsed.byPuuid ?? {}, stats: parsed.stats ?? {} };
  } catch (err) {
    log('error', 'loadState: falha ao ler do Redis', { error: String(err) });
    return { byPuuid: {}, stats: {} };
  }
}

export async function saveState(state: BotState): Promise<void> {
  try {
    await redis.set(KEY, JSON.stringify(state));
  } catch (err) {
    log('error', 'saveState: falha ao escrever no Redis', { error: String(err) });
  }
}
