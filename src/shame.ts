export interface MatchResult {
  matchId: string;
  won: boolean;
  queueId: number;
}

const RANKED_SOLO_DUO = 420;

export function isRankedDefeat(match: MatchResult): boolean {
  return match.queueId === RANKED_SOLO_DUO && !match.won;
}
