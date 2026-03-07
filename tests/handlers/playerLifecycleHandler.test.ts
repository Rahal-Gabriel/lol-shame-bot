import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playerLifecycleHandler } from '../../src/handlers/playerLifecycleHandler';
import type { PlayerChangedEvent } from '../../src/infra/eventBus';

function makeEvent(overrides: Partial<PlayerChangedEvent> = {}): PlayerChangedEvent {
  return {
    gameName: 'GatoMakonha',
    tagLine: 'T2F',
    ...overrides,
  };
}

describe('playerLifecycleHandler', () => {
  let log: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    log = vi.fn();
  });

  it("calls log('info', 'player:added', { gameName, tagLine }) when eventName is player:added", async () => {
    const event = makeEvent();

    await playerLifecycleHandler('player:added', event, { log });

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('info', 'player:added', {
      gameName: 'GatoMakonha',
      tagLine: 'T2F',
    });
  });

  it("calls log('info', 'player:removed', { gameName, tagLine }) when eventName is player:removed", async () => {
    const event = makeEvent({ gameName: 'OutroJogador', tagLine: 'BR1' });

    await playerLifecycleHandler('player:removed', event, { log });

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('info', 'player:removed', {
      gameName: 'OutroJogador',
      tagLine: 'BR1',
    });
  });

  it('uses the event gameName and tagLine as meta fields', async () => {
    const event = makeEvent({ gameName: 'Faker', tagLine: 'KR1' });

    await playerLifecycleHandler('player:added', event, { log });

    const [, , meta] = log.mock.calls[0] as [string, string, { gameName: string; tagLine: string }];
    expect(meta.gameName).toBe('Faker');
    expect(meta.tagLine).toBe('KR1');
  });

  it('does not throw when log throws internally — error is caught', async () => {
    log.mockImplementation(() => {
      throw new Error('logger down');
    });
    const event = makeEvent();

    await expect(
      playerLifecycleHandler('player:added', event, { log })
    ).resolves.toBeUndefined();
  });

  it('does not throw when log throws on player:removed — error is caught', async () => {
    log.mockImplementation(() => {
      throw new Error('logger down');
    });
    const event = makeEvent();

    await expect(
      playerLifecycleHandler('player:removed', event, { log })
    ).resolves.toBeUndefined();
  });
});
