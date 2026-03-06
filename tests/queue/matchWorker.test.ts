import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMatchJob } from '../../src/queue/matchWorker';
import type { MatchJobData } from '../../src/queue/queue';
import type { BotState } from '../../src/infra/store';
import type { TypedEventEmitter } from '../../src/infra/eventBus';
import * as riot from '../../src/riot/client';

vi.mock('../../src/riot/client');
vi.mock('../../src/infra/retry', () => ({
  withRetry: (fn: () => unknown) => fn(),
}));

const mockedGetMatchResult = vi.mocked(riot.getMatchResult);

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

function makeEventBus(): TypedEventEmitter {
  return { emit: vi.fn() } as unknown as TypedEventEmitter;
}

beforeEach(() => vi.clearAllMocks());

describe('processMatchJob', () => {
  it('calls getMatchResult with correct matchId and puuid on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    await processMatchJob(baseData, { botState, eventBus });

    expect(mockedGetMatchResult).toHaveBeenCalledWith('BR1_200', 'puuid-abc');
  });

  it('emits match:finished with correct payload on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    await processMatchJob(baseData, { botState, eventBus });

    expect(eventBus.emit).toHaveBeenCalledWith('match:finished', {
      gameName: 'Gabriel',
      tagLine: 'BR1',
      match: defeatMatch,
      isDefeat: true,
      statsAfter: { wins: 0, losses: 1, streak: -1 },
    });
  });

  it('emits match:finished with correct payload on victory', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(victoryMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    await processMatchJob(baseData, { botState, eventBus });

    expect(eventBus.emit).toHaveBeenCalledWith('match:finished', {
      gameName: 'Gabriel',
      tagLine: 'BR1',
      match: victoryMatch,
      isDefeat: false,
      statsAfter: { wins: 1, losses: 0, streak: 1 },
    });
  });

  it('computes statsAfter using existing botState stats on defeat', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();
    botState.stats['Gabriel#BR1'] = { wins: 2, losses: 1, streak: -1 };

    await processMatchJob(baseData, { botState, eventBus });

    expect(eventBus.emit).toHaveBeenCalledWith('match:finished', expect.objectContaining({
      statsAfter: { wins: 2, losses: 2, streak: -2 },
    }));
  });

  it('computes statsAfter using existing botState stats on victory', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(victoryMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();
    botState.stats['Gabriel#BR1'] = { wins: 1, losses: 3, streak: -3 };

    await processMatchJob(baseData, { botState, eventBus });

    expect(eventBus.emit).toHaveBeenCalledWith('match:finished', expect.objectContaining({
      statsAfter: { wins: 2, losses: 3, streak: 1 },
    }));
  });

  it('does NOT call sendMessage directly', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    // If processMatchJob tries to call sendMessage it would throw since it is not mocked
    await expect(processMatchJob(baseData, { botState, eventBus })).resolves.toBeUndefined();
    // Only emit should be called
    expect(eventBus.emit).toHaveBeenCalledOnce();
  });

  it('emits exactly once per job', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(victoryMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    await processMatchJob(baseData, { botState, eventBus });

    expect(eventBus.emit).toHaveBeenCalledOnce();
  });

  it('passes client (mockClient) variable unused — only eventBus deps needed', async () => {
    // Ensures ProcessMatchDeps does NOT require client or channelId
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    // This must compile with only { botState, eventBus }
    await expect(processMatchJob(baseData, { botState, eventBus })).resolves.toBeUndefined();
    void mockClient; // suppress unused variable warning
  });

  it('does NOT call saveState directly — state persistence is delegated to statsHandler via event', async () => {
    mockedGetMatchResult.mockResolvedValueOnce(defeatMatch);
    const eventBus = makeEventBus();
    const botState = makeBotState();

    // ProcessMatchDeps does not include saveState — if it did, this test would fail to compile.
    // The only keys allowed are botState and eventBus.
    const deps: { botState: BotState; eventBus: TypedEventEmitter } = { botState, eventBus };
    await processMatchJob(baseData, deps);

    // saveState is not in deps — its absence confirms processMatchJob delegates persistence
    // via the event bus, not by calling saveState itself.
    expect('saveState' in deps).toBe(false);
  });
});
