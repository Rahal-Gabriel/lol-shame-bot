import { describe, it, expect, vi } from 'vitest';
import { sendMessage } from '../../src/discord/client';

const mockSend = vi.fn();
const mockFetch = vi.fn();
const mockClient = { channels: { fetch: mockFetch } } as never;

describe('sendMessage', () => {
  it('fetches the channel and sends the message', async () => {
    mockFetch.mockResolvedValueOnce({ send: mockSend });

    await sendMessage(mockClient, 'channel-123', 'você é uma vergonha');

    expect(mockFetch).toHaveBeenCalledWith('channel-123');
    expect(mockSend).toHaveBeenCalledWith({ content: 'você é uma vergonha' });
  });

  it('throws when channel is not found', async () => {
    mockFetch.mockResolvedValueOnce(null);

    await expect(sendMessage(mockClient, 'bad-channel', 'msg')).rejects.toThrow(
      'Channel bad-channel not found'
    );
  });
});
