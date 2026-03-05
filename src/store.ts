import { readFile, writeFile } from 'fs/promises';

export interface BotState {
  byPuuid: Record<string, string | null>;
}

export async function loadState(filePath: string): Promise<BotState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as BotState;
  } catch {
    return { byPuuid: {} };
  }
}

export async function saveState(filePath: string, state: BotState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state), 'utf-8');
}
