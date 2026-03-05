import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BotState } from '../src/store';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({ get: mockGet, set: mockSet }));
  return { default: MockRedis };
});

beforeEach(() => {
  vi.resetModules();
  mockGet.mockReset();
  mockSet.mockReset();
});

async function getStore() {
  const mod = await import('../src/store');
  return mod;
}

describe('loadState', () => {
  it('returns empty state when Redis returns null', async () => {
    mockGet.mockResolvedValue(null);
    const { loadState } = await getStore();
    const state = await loadState();
    expect(state).toEqual({ byPuuid: {}, stats: {} });
  });

  it('returns parsed state when Redis has data', async () => {
    const stored: BotState = { byPuuid: { 'puuid-1': 'BR1_999' }, stats: {} };
    mockGet.mockResolvedValue(JSON.stringify(stored));
    const { loadState } = await getStore();
    const state = await loadState();
    expect(state.byPuuid['puuid-1']).toBe('BR1_999');
  });

  it('returns empty state gracefully when Redis throws', async () => {
    mockGet.mockRejectedValue(new Error('connection refused'));
    const { loadState } = await getStore();
    const state = await loadState();
    expect(state).toEqual({ byPuuid: {}, stats: {} });
  });
});

describe('saveState', () => {
  it('calls redis.set with serialized state', async () => {
    mockSet.mockResolvedValue('OK');
    const { saveState } = await getStore();
    const state: BotState = { byPuuid: { 'puuid-1': 'BR1_123' }, stats: {} };
    await saveState(state);
    expect(mockSet).toHaveBeenCalledWith('bot:state', JSON.stringify(state));
  });

  it('does not throw when Redis fails', async () => {
    mockSet.mockRejectedValue(new Error('write error'));
    const { saveState } = await getStore();
    const state: BotState = { byPuuid: {}, stats: {} };
    await expect(saveState(state)).resolves.toBeUndefined();
  });
});
