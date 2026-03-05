export interface MatchResult {
  matchId: string;
  won: boolean;
  queueId: number;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  gameDurationSecs: number;
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

export function buildShameMessage(gameName: string): string {
  const phrase = SHAME_MESSAGES[Math.floor(Math.random() * SHAME_MESSAGES.length)];
  return `🔴 ${gameName} perdeu uma ranked! — ${phrase}`;
}

export const WIN_MESSAGES = [
  'ainda é um lixo, só ganhou pq o inimigo era pior',
  'parabéns, você venceu alguém que provavelmente estava jogando com o cotovelo',
  'vitória suspeita. vou chamar a CBLOL pra investigar',
  'nem comemora, amanhã você toma 7 de seguida e chora no banheiro',
  'mogou quem? o time inimigo estava de olho fechado e dormindo na cadeira',
  'uma vitória não salva uma vida desperdiçada no silver',
  'o inimigo deixou ganhar com pena. caridade ranked.',
  'sigma move: ganhar uma partida e achar que virou jogador. delulu.',
  'você ganhou. os inimigos vão dormir normalmente. você vai dormir achando que presta.',
  'vitória registrada. irrelevante. continue insignificante.',
  'nem o próprio time acreditou que você ia ganhar isso',
  'fluke eterno. screenshot isso pq não se repete.',
  'os deuses erraram de conta hoje. amanhã voltam a punir você.',
  'ganhou e ainda assim não inspira ninguém. notável.',
  'sua KDA continua uma vergonha, mas ok, vitória contada.',
];

export function buildWinMessage(gameName: string): string {
  const phrase = WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)];
  return `😒 ${gameName} ganhou uma ranked... ${phrase}`;
}
