import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Player } from '../src/players';

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

async function getPlayers() {
  return import('../src/players');
}

describe('loadPlayers', () => {
  it('returns empty array when Redis returns null', async () => {
    mockGet.mockResolvedValue(null);
    const { loadPlayers } = await getPlayers();
    const players = await loadPlayers();
    expect(players).toEqual([]);
  });

  it('returns parsed list when Redis has data', async () => {
    const stored: Player[] = [{ gameName: 'GatoMakonha', tagLine: 'T2F' }];
    mockGet.mockResolvedValue(JSON.stringify(stored));
    const { loadPlayers } = await getPlayers();
    const players = await loadPlayers();
    expect(players).toEqual(stored);
  });

  it('returns empty array gracefully when Redis throws', async () => {
    mockGet.mockRejectedValue(new Error('connection refused'));
    const { loadPlayers } = await getPlayers();
    const players = await loadPlayers();
    expect(players).toEqual([]);
  });
});

describe('savePlayers', () => {
  it('calls redis.set with serialized players', async () => {
    mockSet.mockResolvedValue('OK');
    const { savePlayers } = await getPlayers();
    const players: Player[] = [{ gameName: 'GatoMakonha', tagLine: 'T2F' }];
    await savePlayers(players);
    expect(mockSet).toHaveBeenCalledWith('bot:players', JSON.stringify(players));
  });

  it('does not throw when Redis fails', async () => {
    mockSet.mockRejectedValue(new Error('write error'));
    const { savePlayers } = await getPlayers();
    await expect(savePlayers([])).resolves.toBeUndefined();
  });
});
