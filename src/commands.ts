import { Player } from './players';

export function addPlayer(players: Player[], player: Player): Player[] {
  const exists = players.some(
    p => p.gameName === player.gameName && p.tagLine === player.tagLine
  );
  if (exists) return players;
  return [...players, player];
}

export function removePlayer(players: Player[], gameName: string, tagLine: string): Player[] {
  return players.filter(p => !(p.gameName === gameName && p.tagLine === tagLine));
}

export function formatPlayerList(players: Player[]): string {
  if (players.length === 0) return 'Nenhum jogador monitorado no momento.';
  return players.map(p => `• ${p.gameName}#${p.tagLine}`).join('\n');
}
