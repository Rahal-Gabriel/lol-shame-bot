import { readFile, writeFile } from 'fs/promises';
import { PlayerStats } from './stats';

export interface BotState {
  byPuuid: Record<string, string | null>;
  stats: Record<string, PlayerStats>; // chave: "gameName#tagLine"
}

export async function loadState(filePath: string): Promise<BotState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BotState>;
    return { byPuuid: parsed.byPuuid ?? {}, stats: parsed.stats ?? {} };
  } catch {
    return { byPuuid: {}, stats: {} };
  }
}

export async function saveState(filePath: string, state: BotState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state), 'utf-8');
}
