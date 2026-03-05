export interface MatchResult {
  matchId: string;
  won: boolean;
  queueId: number;
}

const RANKED_SOLO_DUO = 420;

export const SHAME_MESSAGES = [
  'KKKKKKKKKKKKKKKKKKKKKKKKK',
  'Muito ruim fí',
  'Desista, vc nunca vai subir',
  'Mais uma pra conta',
  'Só o básico pro telzinho',
  'Caiu mamando',
  'Sobra nada',
  'Ai seu otário kkkkkk',
  'Te falta ódio',
  'Jogou como nunca e perdeu como sempre',
  'Seu dia nunca vai chegar',
  'Desista...',
  'Tá feio já pode parar',
  'Vc é beta bro fica nesse elo ai',
  'Chances de vitória 0%',
  'Moggado',
  'Sucumba',
  'Podre de ruim',
  'Zé roela games ataca novamente',
];

export function isRankedDefeat(match: MatchResult): boolean {
  return match.queueId === RANKED_SOLO_DUO && !match.won;
}

export function buildShameMessage(gameName: string, match: MatchResult): string {
  const phrase = SHAME_MESSAGES[Math.floor(Math.random() * SHAME_MESSAGES.length)];
  return `🔴 ${gameName} perdeu uma ranked! (${match.matchId}) — ${phrase}`;
}

export function buildWinMessage(gameName: string, match: MatchResult): string {
  return `😢 ${gameName} ganhou uma ranked (${match.matchId})... deve ter sido sorte.`;
}
