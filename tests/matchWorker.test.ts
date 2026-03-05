import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMatchJob } from '../src/matchWorker';
import type { MatchJobData } from '../src/queue';
import type { BotState } from '../src/store';
import * as riot from '../src/riot';
import * as discord from '../src/discord';
import * as store from '../src/store';

vi.mock('../src/riot');
vi.mock('../src/discord');
vi.mock('../src/store');
vi.mock('../src/retry', () => ({
  withRetry: (fn: () => unknown) => fn(),
}));

const mockedGetMatchResult = vi.mocked(riot.getMatchResult);
const mockedSendMessage = vi.mocked(discord.sendMessage);
const mockedSaveState = vi.mocked(store.saveState);

const mockClient = {} as never;

const defeatMatch = {
  matchId: 'BR1_200',
  won: false,
  queueId: 420,
  champion: 'Yasuo',
  kills: 2,
  deaths: 8,
  assists: 1,
  gameDurationSecs: 1832,
};

const victoryMatch = {
  matchId: 'BR1_200',
  won: true,
  queueId: 420,
  champion: 'Lux',
  kills: 10,
  deaths: 2,
  assists: 5,
  gameDurationSecs: 1832,
};

const baseData: MatchJobData = {
  puuid: 'puuid-abc',
  matchId: 'BR1_200',
  gameName: 'Gabriel',
  tagLine: 'BR1',
};

function makeBotState(): BotState {
  return { byPuuid: {}, stats: {} };
}

beforeEach(() => vi.clearAllMocks());

describe('processMatchJob', () => {
  it('calls getMatchResult with correct matchId and puuid on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(mockedGetMatchResult).toHaveBeenCalledWith('BR1_200', 'puuid-abc');
  });

  it('sends loss embed via sendMessage on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(mockedSendMessage).toHaveBeenCalledOnce();
  });

  it('sends win embed via sendMessage on victory', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(victoryMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(mockedSendMessage).toHaveBeenCalledOnce();
  });

  it('updates botState.stats correctly on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(botState.stats['Gabriel#BR1']).toEqual({ wins: 0, losses: 1, streak: -1 });
  });

  it('updates botState.stats correctly on victory', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(victoryMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(botState.stats['Gabriel#BR1']).toEqual({ wins: 1, losses: 0, streak: 1 });
  });

  it('calls saveState with botState after processing', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    mockedSendMessage.mockResolvedValueOnce(undefined);
    mockedSaveState.mockResolvedValueOnce(undefined);

    const botState = makeBotState();
    await processMatchJob(baseData, { client: mockClient, channelId: 'ch-1', botState });

    expect(mockedSaveState).toHaveBeenCalledWith(botState);
  });
});
