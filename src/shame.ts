export interface MatchResult {
  matchId: string;
  won: boolean;
  queueId: number;
}

const RANKED_SOLO_DUO = 420;

export function isRankedDefeat(match: MatchResult): boolean {
  return match.queueId === RANKED_SOLO_DUO && !match.won;
}

export function buildShameMessage(gameName: string, match: MatchResult): string {
  return `🔴 ${gameName} perdeu uma ranked! (${match.matchId}) — que vergonha!`;
}

export function buildWinMessage(gameName: string, match: MatchResult): string {
  return `😢 ${gameName} ganhou uma ranked (${match.matchId})... deve ter sido sorte.`;
}
