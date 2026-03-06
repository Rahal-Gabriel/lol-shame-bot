import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streakHandler } from '../../src/handlers/streakHandler';
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

const mockClient = {} as never;

describe('streakHandler', () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn().mockResolvedValue(undefined);
  });

  it('posts tilt message when streak is exactly -3', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 0, losses: 3, streak: -3 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).toHaveBeenCalledOnce();
    const [calledClient, calledChannel, calledMsg] = sendMessage.mock.calls[0] as [unknown, string, string];
    expect(calledClient).toBe(mockClient);
    expect(calledChannel).toBe('ch-1');
    expect(typeof calledMsg).toBe('string');
    expect((calledMsg as string).length).toBeGreaterThan(0);
  });

  it('posts tilt message when streak is -4 (below threshold)', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 0, losses: 4, streak: -4 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it('posts tilt message when streak is -10 (deep tilt)', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 3, losses: 10, streak: -10 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it('does NOT post when streak is -2 (above threshold)', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 1, losses: 2, streak: -2 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT post when streak is -1', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 1, losses: 1, streak: -1 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT post when streak is 0', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 0, losses: 0, streak: 0 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT post on win even if streak is -5', async () => {
    const event = makeEvent({ isDefeat: false, statsAfter: { wins: 1, losses: 5, streak: 1 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT post when streak is positive (winning streak)', async () => {
    const event = makeEvent({ isDefeat: false, statsAfter: { wins: 5, losses: 0, streak: 5 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('posts a plain string (not an embed) with player name', async () => {
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 0, losses: 3, streak: -3 } });
    await streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage });

    const msg = sendMessage.mock.calls[0][2] as string;
    expect(typeof msg).toBe('string');
    expect(msg).toContain('GatoMakonha');
  });

  it('does not throw when sendMessage fails — logs error', async () => {
    sendMessage.mockRejectedValue(new Error('discord down'));
    const event = makeEvent({ isDefeat: true, statsAfter: { wins: 0, losses: 3, streak: -3 } });

    await expect(
      streakHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage })
    ).resolves.toBeUndefined();
  });
});
