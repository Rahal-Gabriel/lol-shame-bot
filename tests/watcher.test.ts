import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasNewMatch, checkPlayer, pollPlayer } from '../src/watcher';
import * as riot from '../src/riot';
import * as discord from '../src/discord';

vi.mock('../src/riot');
vi.mock('../src/discord');
const mockedGetLastRankedMatchId = vi.mocked(riot.getLastRankedMatchId);
const mockedGetMatchResult = vi.mocked(riot.getMatchResult);
const mockedSendMessage = vi.mocked(discord.sendMessage);

const mockClient = {} as never;

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

describe('pollPlayer', () => {
  it('sends shame message and updates lastMatchId on defeat', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_200');
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: 'BR1_200', won: false, queueId: 420 });
    mockedSendMessage.mockResolvedValueOnce(undefined);

    const state = { lastMatchId: 'BR1_199' as string | null };
    await pollPlayer(mockClient, 'ch-1', 'puuid-abc', 'Gabriel', state);

    expect(mockedSendMessage).toHaveBeenCalledOnce();
    expect(state.lastMatchId).toBe('BR1_200');
  });

  it('does not send message when there is no new match', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_199');

    const state = { lastMatchId: 'BR1_199' as string | null };
    await pollPlayer(mockClient, 'ch-1', 'puuid-abc', 'Gabriel', state);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(state.lastMatchId).toBe('BR1_199');
  });

  it('does not send message when player won', async () => {
    mockedGetLastRankedMatchId.mockResolvedValueOnce('BR1_200');
    mockedGetMatchResult.mockResolvedValueOnce({ matchId: 'BR1_200', won: true, queueId: 420 });

    const state = { lastMatchId: 'BR1_199' as string | null };
    await pollPlayer(mockClient, 'ch-1', 'puuid-abc', 'Gabriel', state);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(state.lastMatchId).toBe('BR1_200');
  });
});
