import { readFile } from 'fs/promises';

export interface Player {
  gameName: string;
  tagLine: string;
}

export async function loadPlayers(filePath: string): Promise<Player[]> {
  const raw = await readFile(filePath, 'utf-8');
  const list = JSON.parse(raw) as unknown[];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('players.json está vazio');
  }

  for (const entry of list) {
    const p = entry as Record<string, unknown>;
    if (!p.gameName) throw new Error('Jogador sem gameName em players.json');
    if (!p.tagLine) throw new Error('Jogador sem tagLine em players.json');
  }

  return list as Player[];
}
