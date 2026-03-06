import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discordHandler } from '../../src/handlers/discordHandler';
import type { MatchFinishedEvent } from '../../src/infra/eventBus';
import { EmbedBuilder } from 'discord.js';

const makeMatch = () => ({
  matchId: 'BR1_999',
  won: false,
  queueId: 420,
  champion: 'Yasuo',
  kills: 2,
  deaths: 8,
  assists: 1,
  gameDurationSecs: 1800,
});

const makeEvent = (overrides: Partial<MatchFinishedEvent> = {}): MatchFinishedEvent => ({
  gameName: 'GatoMakonha',
  tagLine: 'T2F',
  match: makeMatch(),
  isDefeat: true,
  statsAfter: { wins: 0, losses: 1, streak: -1 },
  ...overrides,
});

const mockClient = {} as never;
const fakeEmbed = new EmbedBuilder().setColor(0xff0000).setTitle('test');

describe('discordHandler', () => {
  let sendMessage: ReturnType<typeof vi.fn>;
  let buildLossEmbed: ReturnType<typeof vi.fn>;
  let buildWinEmbed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn().mockResolvedValue(undefined);
    buildLossEmbed = vi.fn().mockReturnValue(fakeEmbed);
    buildWinEmbed = vi.fn().mockReturnValue(fakeEmbed);
  });

  it('calls buildLossEmbed and sendMessage on defeat', async () => {
    const event = makeEvent({ isDefeat: true });
    await discordHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage, buildLossEmbed, buildWinEmbed });

    expect(buildLossEmbed).toHaveBeenCalledWith('GatoMakonha', event.match);
    expect(sendMessage).toHaveBeenCalledWith(mockClient, 'ch-1', fakeEmbed);
    expect(buildWinEmbed).not.toHaveBeenCalled();
  });

  it('calls buildWinEmbed and sendMessage on victory', async () => {
    const event = makeEvent({ isDefeat: false, match: { ...makeMatch(), won: true } });
    await discordHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage, buildLossEmbed, buildWinEmbed });

    expect(buildWinEmbed).toHaveBeenCalledWith('GatoMakonha', event.match);
    expect(sendMessage).toHaveBeenCalledWith(mockClient, 'ch-1', fakeEmbed);
    expect(buildLossEmbed).not.toHaveBeenCalled();
  });

  it('passes channelId to sendMessage', async () => {
    const event = makeEvent({ isDefeat: true });
    await discordHandler(event, { client: mockClient, channelId: 'my-channel', sendMessage, buildLossEmbed, buildWinEmbed });

    expect(sendMessage).toHaveBeenCalledWith(mockClient, 'my-channel', fakeEmbed);
  });

  it('does not throw when sendMessage fails — logs error', async () => {
    sendMessage.mockRejectedValue(new Error('channel not found'));
    const event = makeEvent({ isDefeat: true });

    await expect(
      discordHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage, buildLossEmbed, buildWinEmbed })
    ).resolves.toBeUndefined();
  });

  it('sends embed exactly once per event', async () => {
    const event = makeEvent({ isDefeat: false });
    await discordHandler(event, { client: mockClient, channelId: 'ch-1', sendMessage, buildLossEmbed, buildWinEmbed });

    expect(sendMessage).toHaveBeenCalledOnce();
  });
});
