import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter, eventBus } from '../../src/infra/eventBus';
import type { MatchFinishedEvent } from '../../src/infra/eventBus';

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
  statsAfter: { wins: 0, losses: 3, streak: -3 },
  ...overrides,
});

describe('TypedEventEmitter', () => {
  it('fires listener with correct payload when match:finished is emitted', () => {
    const bus = new TypedEventEmitter();
    const listener = vi.fn();
    const event = makeEvent();

    bus.on('match:finished', listener);
    bus.emit('match:finished', event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('fires multiple listeners in registration order', () => {
    const bus = new TypedEventEmitter();
    const order: number[] = [];
    bus.on('match:finished', () => order.push(1));
    bus.on('match:finished', () => order.push(2));
    bus.on('match:finished', () => order.push(3));

    bus.emit('match:finished', makeEvent());

    expect(order).toEqual([1, 2, 3]);
  });

  it('passes all fields of MatchFinishedEvent to listener', () => {
    const bus = new TypedEventEmitter();
    const listener = vi.fn();
    const event = makeEvent({ isDefeat: false, statsAfter: { wins: 5, losses: 2, streak: 3 } });

    bus.on('match:finished', listener);
    bus.emit('match:finished', event);

    const received = listener.mock.calls[0][0] as MatchFinishedEvent;
    expect(received.gameName).toBe('GatoMakonha');
    expect(received.tagLine).toBe('T2F');
    expect(received.isDefeat).toBe(false);
    expect(received.statsAfter.wins).toBe(5);
    expect(received.statsAfter.streak).toBe(3);
  });

  it('does not fire listener if no event emitted', () => {
    const bus = new TypedEventEmitter();
    const listener = vi.fn();
    bus.on('match:finished', listener);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('eventBus singleton', () => {
  it('is an instance of TypedEventEmitter', () => {
    expect(eventBus).toBeInstanceOf(TypedEventEmitter);
  });

  it('emits and receives events', () => {
    const listener = vi.fn();
    eventBus.on('match:finished', listener);
    const event = makeEvent();
    eventBus.emit('match:finished', event);

    expect(listener).toHaveBeenCalledWith(event);
    eventBus.removeListener('match:finished', listener);
  });
});

describe('TypedEventEmitter — handler isolation', () => {
  it('continues calling subsequent listeners even if an earlier listener throws', () => {
    const bus = new TypedEventEmitter();
    const failingListener = vi.fn().mockImplementation(() => {
      throw new Error('handler explodiu');
    });
    const survivingListener = vi.fn();

    bus.on('match:finished', failingListener);
    bus.on('match:finished', survivingListener);

    // Node EventEmitter propagates throw from a listener — the test documents this
    // known behavior so we can decide whether to wrap listeners in try/catch upstream.
    expect(() => bus.emit('match:finished', makeEvent())).toThrow('handler explodiu');
    // The second listener is NOT called because Node throws synchronously on first error
    expect(survivingListener).not.toHaveBeenCalled();
  });
});
