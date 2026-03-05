import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getAccountByRiotId, getLastRankedMatchId, getMatchResult } from '../../src/riot/client';

vi.mock('axios');
const mockedGet = vi.mocked(axios.get);

beforeEach(() => {
  process.env.RIOT_API_KEY = 'test-key';
  vi.clearAllMocks();
});

describe('getAccountByRiotId', () => {
  it('returns puuid for a valid Riot ID', async () => {
    mockedGet.mockResolvedValueOnce({ data: { puuid: 'abc-123' } } as never);

    const result = await getAccountByRiotId('Gabriel', 'BR1');

    expect(result.puuid).toBe('abc-123');
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Gabriel/BR1',
      expect.objectContaining({ headers: { 'X-Riot-Token': 'test-key' } })
    );
  });
});

describe('getLastRankedMatchId', () => {
  it('returns the most recent ranked match id', async () => {
    mockedGet.mockResolvedValueOnce({ data: ['BR1_123456'] } as never);

    const result = await getLastRankedMatchId('abc-123');

    expect(result).toBe('BR1_123456');
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 420, start: 0, count: 1 } })
    );
  });

  it('returns null when player has no ranked matches', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as never);
    expect(await getLastRankedMatchId('abc-123')).toBeNull();
  });
});

describe('getMatchResult', () => {
  it('returns full match result for a lost ranked game', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        info: {
          queueId: 420,
          gameDuration: 1832,
          participants: [{ puuid: 'abc-123', win: false, championName: 'Yasuo', kills: 2, deaths: 8, assists: 1 }],
        },
      },
    } as never);

    const result = await getMatchResult('BR1_123456', 'abc-123');

    expect(result).toEqual({
      matchId: 'BR1_123456', won: false, queueId: 420,
      champion: 'Yasuo', kills: 2, deaths: 8, assists: 1, gameDurationSecs: 1832,
    });
  });

  it('throws when the player is not found in the match', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { info: { queueId: 420, participants: [] } },
    } as never);

    await expect(getMatchResult('BR1_123456', 'unknown')).rejects.toThrow(
      'Participant unknown not found in match BR1_123456'
    );
  });
});
