export function hasNewMatch(lastMatchId: string | null, currentMatchId: string | null): boolean {
  return currentMatchId !== null && currentMatchId !== lastMatchId;
}
