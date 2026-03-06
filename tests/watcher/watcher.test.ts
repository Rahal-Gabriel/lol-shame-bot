import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { hasNewMatch, checkPlayer, pollPlayer } from '../../src/watcher/watcher';
import * as riot from '../../src/riot/client';
import type { MatchJobData } from '../../src/queue/queue';

vi.mock('../../src/riot/client');
vi.mock('../../src/discord/client');
const mockedGetLastRankedMatchId = vi.mocked(riot.getLastRankedMatchId);
const mockedGetLastRankedMatchIdBothQueues = vi.mocked(riot.getLastRankedMatchIdBothQueues);
const mockedGetMatchResult = vi.mocked(riot.getMatchResult);

const mockQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) } as unknown as Queue<MatchJobData>;

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
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: "BR1_200", won: false, queueId: 420, champion: "Yasuo", kills: 2, deaths: 8, assists: 1, gameDurationSecs: 1800 });

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).not.toBeNull();
    expect(result).toContain('Gabriel');
  });

  it('returns null when there is no new match', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_199');

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).toBeNull();
    expect(mockedGetMatchResult).not.toHaveBeenCalled();
  });

  it('returns null when player won the new match', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_200');
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: "BR1_200", won: true, queueId: 420, champion: "Yasuo", kills: 10, deaths: 2, assists: 5, gameDurationSecs: 1800 });

    const result = await checkPlayer('puuid-abc', 'Gabriel', 'BR1_199');

    expect(result).toBeNull();
  });

  it('returns null when player has no ranked matches', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce(null);

    const result = await checkPlayer('puuid-abc', 'Gabriel', null);

    expect(result).toBeNull();
  });
});

describe('pollPlayer', () => {
  it('adds job to queue with correct payload when new match detected', async () => {
    mockedGetLastRankedMatchIdBothQueues.mockResolvedValueOnce('BR1_200');

    const state = { lastMatchId: 'BR1_199' as string | null };
    await pollPlayer(mockQueue, 'puuid-abc', 'Gabriel', 'BR1', state);

    expect(mockQueue.add).toHaveBeenCalledWith('process-match', {
      puuid: 'puuid-abc',
      matchId: 'BR1_200',
      gameName: 'Gabriel',
      tagLine: 'BR1',
    });
    expect(state.lastMatchId).toBe('BR1_200');
  });

  it('does not add job when match already seen', async () => {
    mockedGetLastRankedMatchIdBothQueues.mockResolvedValueOnce('BR1_199');

    const state = { lastMatchId: 'BR1_199' as string | null };
    await pollPlayer(mockQueue, 'puuid-abc', 'Gabriel', 'BR1', state);

    expect(mockQueue.add).not.toHaveBeenCalled();
    expect(state.lastMatchId).toBe('BR1_199');
  });

  it('does not add job when no match available (null)', async () => {
    mockedGetLastRankedMatchIdBothQueues.mockResolvedValueOnce(null);

    const state = { lastMatchId: null as string | null };
    await pollPlayer(mockQueue, 'puuid-abc', 'Gabriel', 'BR1', state);

    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('detects Flex match (queueId 440) and adds job to queue', async () => {
    mockedGetLastRankedMatchIdBothQueues.mockResolvedValueOnce('BR1_300');

    const state = { lastMatchId: 'BR1_299' as string | null };
    await pollPlayer(mockQueue, 'puuid-abc', 'Gabriel', 'BR1', state);

    expect(mockQueue.add).toHaveBeenCalledWith('process-match', {
      puuid: 'puuid-abc',
      matchId: 'BR1_300',
      gameName: 'Gabriel',
      tagLine: 'BR1',
    });
    expect(state.lastMatchId).toBe('BR1_300');
  });
});
