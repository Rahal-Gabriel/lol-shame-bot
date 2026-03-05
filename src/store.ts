import { readFile, writeFile } from 'fs/promises';

export interface BotState {
  lastMatchId: string | null;
}

export async function loadState(filePath: string): Promise<BotState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as BotState;
  } catch {
    return { lastMatchId: null };
  }
}

export async function saveState(filePath: string, state: BotState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state), 'utf-8');
}
