import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getAccountByRiotId,
  getLastRankedMatchId,
  getMatchResult,
  getLastNRankedMatchIds,
  getLastRankedMatchIdBothQueues,
  getLastNRankedMatchIdsBothQueues,
} from '../../src/riot/client';

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

  it('uses queue 440 when called with queue: 440', async () => {
    mockedGet.mockResolvedValueOnce({ data: ['BR1_999'] } as never);

    const result = await getLastRankedMatchId('abc-123', 440);

    expect(result).toBe('BR1_999');
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 440, start: 0, count: 1 } })
    );
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

describe('getLastNRankedMatchIds', () => {
  it('returns array of N ids when enough matches exist', async () => {
    const ids = ['BR1_1', 'BR1_2', 'BR1_3', 'BR1_4', 'BR1_5'];
    mockedGet.mockResolvedValueOnce({ data: ids } as never);

    const result = await getLastNRankedMatchIds('abc-123', 5);

    expect(result).toEqual(ids);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 420, start: 0, count: 5 } })
    );
  });

  it('returns smaller array when fewer matches exist than count requested', async () => {
    const ids = ['BR1_1', 'BR1_2'];
    mockedGet.mockResolvedValueOnce({ data: ids } as never);

    const result = await getLastNRankedMatchIds('abc-123', 5);

    expect(result).toEqual(['BR1_1', 'BR1_2']);
    expect(result).toHaveLength(2);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 420, start: 0, count: 5 } })
    );
  });

  it('returns empty array when player has no ranked matches', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as never);

    const result = await getLastNRankedMatchIds('abc-123', 5);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('getLastRankedMatchIdBothQueues', () => {
  it('returns the most recent match id between solo and flex queues', async () => {
    // Promise.all chama na ordem: primeiro queue 420, depois queue 440
    mockedGet.mockResolvedValueOnce({ data: ['BR1_100'] } as never); // solo queue 420
    mockedGet.mockResolvedValueOnce({ data: ['BR1_200'] } as never); // flex queue 440

    const result = await getLastRankedMatchIdBothQueues('abc-123');

    expect(result).toBe('BR1_200'); // BR1_200 > BR1_100 numericamente
  });

  it('returns the non-null id when only one queue has matches', async () => {
    mockedGet.mockResolvedValueOnce({ data: ['BR1_500'] } as never); // solo
    mockedGet.mockResolvedValueOnce({ data: [] } as never);          // flex vazia

    const result = await getLastRankedMatchIdBothQueues('abc-123');

    expect(result).toBe('BR1_500');
  });

  it('returns null when both queues have no matches', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as never); // solo vazia
    mockedGet.mockResolvedValueOnce({ data: [] } as never); // flex vazia

    const result = await getLastRankedMatchIdBothQueues('abc-123');

    expect(result).toBeNull();
  });

  it('calls the API with queue 420 and queue 440', async () => {
    mockedGet.mockResolvedValueOnce({ data: ['BR1_1'] } as never);
    mockedGet.mockResolvedValueOnce({ data: ['BR1_2'] } as never);

    await getLastRankedMatchIdBothQueues('abc-123');

    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 420, start: 0, count: 1 } })
    );
    expect(mockedGet).toHaveBeenCalledWith(
      'https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/abc-123/ids',
      expect.objectContaining({ params: { queue: 440, start: 0, count: 1 } })
    );
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});

describe('getLastNRankedMatchIdsBothQueues', () => {
  it('merges and sorts descending, slicing to count', async () => {
    // Solo: BR1_5, BR1_3 | Flex: BR1_4, BR1_2
    mockedGet.mockResolvedValueOnce({ data: ['BR1_5', 'BR1_3'] } as never); // solo
    mockedGet.mockResolvedValueOnce({ data: ['BR1_4', 'BR1_2'] } as never); // flex

    const result = await getLastNRankedMatchIdsBothQueues('abc-123', 3);

    // Merge → ['BR1_5','BR1_3','BR1_4','BR1_2'], sort desc → ['BR1_5','BR1_4','BR1_3','BR1_2'], slice(0,3)
    expect(result).toEqual(['BR1_5', 'BR1_4', 'BR1_3']);
    expect(result).toHaveLength(3);
  });

  it('returns only ids from the queue that has matches when the other is empty', async () => {
    mockedGet.mockResolvedValueOnce({ data: ['BR1_10', 'BR1_8'] } as never); // solo
    mockedGet.mockResolvedValueOnce({ data: [] } as never);                   // flex vazia

    const result = await getLastNRankedMatchIdsBothQueues('abc-123', 5);

    expect(result).toEqual(['BR1_10', 'BR1_8']);
  });

  it('returns empty array when both queues have no matches', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as never);
    mockedGet.mockResolvedValueOnce({ data: [] } as never);

    const result = await getLastNRankedMatchIdsBothQueues('abc-123', 5);

    expect(result).toEqual([]);
  });
});
