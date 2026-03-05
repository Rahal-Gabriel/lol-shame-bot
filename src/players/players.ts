import Redis from 'ioredis';
import { log } from '../logger';

export interface Player {
  gameName: string;
  tagLine: string;
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const KEY = 'bot:players';

export async function loadPlayers(): Promise<Player[]> {
  try {
    const raw = await redis.get(KEY);
    if (raw === null) return [];
    return JSON.parse(raw) as Player[];
  } catch (err) {
    log('error', 'loadPlayers: falha ao ler do Redis', { error: String(err) });
    return [];
  }
}

export async function savePlayers(players: Player[]): Promise<void> {
  try {
    await redis.set(KEY, JSON.stringify(players));
  } catch (err) {
    log('error', 'savePlayers: falha ao escrever no Redis', { error: String(err) });
  }
}
