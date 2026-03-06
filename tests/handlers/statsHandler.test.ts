import { describe, it, expect, vi, beforeEach } from 'vitest';
import { statsHandler } from '../../src/handlers/statsHandler';
import type { MatchFinishedEvent } from '../../src/infra/eventBus';
import type { BotState } from '../../src/infra/store';

const makeEvent = (overrides: Partial<MatchFinishedEvent> = {}): MatchFinishedEvent => ({
  gameName: 'GatoMakonha',
  tagLine: 'T2F',
  match: {
    matchId: 'BR1_999',
    won: false,
    queueId: 420,
    champion: 'Yasuo',
    kills: 2,
    deaths: 8,
    assists: 1,
    gameDurationSecs: 1800,
  },
  isDefeat: true,
  statsAfter: { wins: 0, losses: 1, streak: -1 },
  ...overrides,
});

function makeBotState(): BotState {
  return { byPuuid: {}, stats: {} };
}

describe('statsHandler', () => {
  let saveState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    saveState = vi.fn().mockResolvedValue(undefined);
  });

  it('updates botState.stats[key] with statsAfter on defeat', async () => {
    const botState = makeBotState();
    const event = makeEvent({ statsAfter: { wins: 0, losses: 3, streak: -3 } });

    await statsHandler(event, { botState, saveState });

    expect(botState.stats['GatoMakonha#T2F']).toEqual({ wins: 0, losses: 3, streak: -3 });
  });

  it('updates botState.stats[key] with statsAfter on win', async () => {
    const botState = makeBotState();
    const event = makeEvent({ isDefeat: false, statsAfter: { wins: 5, losses: 2, streak: 3 } });

    await statsHandler(event, { botState, saveState });

    expect(botState.stats['GatoMakonha#T2F']).toEqual({ wins: 5, losses: 2, streak: 3 });
  });

  it('calls saveState with botState after updating stats', async () => {
    const botState = makeBotState();
    const event = makeEvent();

    await statsHandler(event, { botState, saveState });

    expect(saveState).toHaveBeenCalledOnce();
    expect(saveState).toHaveBeenCalledWith(botState);
  });

  it('key is gameName#tagLine', async () => {
    const botState = makeBotState();
    const event = makeEvent({
      gameName: 'Player',
      tagLine: 'BR1',
      statsAfter: { wins: 1, losses: 0, streak: 1 },
    });

    await statsHandler(event, { botState, saveState });

    expect(botState.stats['Player#BR1']).toEqual({ wins: 1, losses: 0, streak: 1 });
  });

  it('overwrites existing stats with statsAfter', async () => {
    const botState = makeBotState();
    botState.stats['GatoMakonha#T2F'] = { wins: 2, losses: 1, streak: -1 };
    const event = makeEvent({ statsAfter: { wins: 2, losses: 2, streak: -2 } });

    await statsHandler(event, { botState, saveState });

    expect(botState.stats['GatoMakonha#T2F']).toEqual({ wins: 2, losses: 2, streak: -2 });
  });

  it('does not throw when saveState fails — logs error', async () => {
    const botState = makeBotState();
    saveState.mockRejectedValue(new Error('redis down'));
    const event = makeEvent();

    await expect(statsHandler(event, { botState, saveState })).resolves.toBeUndefined();
  });
});
