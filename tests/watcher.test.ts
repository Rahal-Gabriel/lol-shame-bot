import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasNewMatch, checkPlayer } from '../src/watcher';
import * as riot from '../src/riot';

vi.mock('../src/riot');
const mockedGetLastRankedMatchId = vi.mocked(riot.getLastRankedMatchId);
const mockedGetMatchResult = vi.mocked(riot.getMatchResult);

beforeEach(() => vi.clearAllMocks());

describe('hasNewMatch', () => {
  it('returns true when there is a match and no previous match was seen', () => {
    expect(hasNewMatch(null, 'BR1_100')).toBe(true);
  });

  it('returns true when the current match differs from the last seen', () => {
    expect(hasNewMatch('BR1_99', 'BR1_100')).toBe(true);
  });

  it('returns false when current match is the same as last seen', () => {
    expect(hasNewMatch('BR1_100', 'BR1_100')).toBe(false);
  });

  it('returns false when there is no current match', () => {
    expect(hasNewMatch(null, null)).toBe(false);
  });
});

describe('checkPlayer', () => {
  it('returns a shame message when player has a new ranked defeat', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_200');
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: 'BR1_200', won: false, queueId: 420 });

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).not.toBeNull();
    expect(result).toContain('Gabriel');
    expect(result).toContain('BR1_200');
  });

  it('returns null when there is no new match', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_199');

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).toBeNull();
    expect(mockedGetMatchResult).not.toHaveBeenCalled();
  });

  it('returns null when player won the new match', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_200');
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: 'BR1_200', won: true, queueId: 420 });

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).toBeNull();
  });

  it('returns null when player has no ranked matches', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce(null);

    const result = await checkPlayer('puuid-abc', 'Gabriel', null);

    expect(result).toBeNull();
  });
});
